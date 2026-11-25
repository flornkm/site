import * as THREE from "three";

// The card's shadow on the table, computed exactly per pixel instead of from a shadow map:
// a shadow map can't resolve a board under 2px thick lying on the surface it shades, and
// banded along the edges. The card is a rectangle, so its shadow is the rectangle projected
// along the light, blurred by how high above the table the card is at that point (contact
// hardening, like a real soft light). Two ambient terms add the occlusion where paper meets
// table: a tight dark line and a wide faint one, both leaning away from the light.

const vertexShader = /* glsl */ `
  varying vec2 vGround;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vGround = world.xy;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uCorners[4];
  uniform vec3 uLight;
  uniform vec3 uColor;
  uniform float uKey;
  uniform float uLightSize;
  varying vec2 vGround;

  // Signed distance to a quad (negative inside), any winding.
  float sdQuad(vec2 p, vec2 v[4]) {
    float d = dot(p - v[0], p - v[0]);
    float s = 1.0;
    for (int i = 0, j = 3; i < 4; j = i, i++) {
      vec2 e = v[j] - v[i];
      vec2 w = p - v[i];
      vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
      d = min(d, dot(b, b));
      bvec3 c = bvec3(p.y >= v[i].y, p.y < v[j].y, e.x * w.y > e.y * w.x);
      if (all(c) || all(not(c))) s = -s;
    }
    return s * sqrt(d);
  }

  // How far above the table the card is, seen from this point along a direction.
  float heightAlong(vec3 dir, vec3 normal) {
    vec3 ground = vec3(vGround, 0.0);
    float facing = dot(normal, dir);
    float mean = 0.25 * (uCorners[0].z + uCorners[1].z + uCorners[2].z + uCorners[3].z);
    float top = max(max(uCorners[0].z, uCorners[1].z), max(uCorners[2].z, uCorners[3].z));
    if (abs(facing) < 1e-3) return mean;
    // Past the card's own edges the ray meets only the plane it lies in: hold the height
    // there, or the penumbra would keep widening into a haze.
    float t = dot(normal, uCorners[0] - ground) / facing;
    float h = clamp(t * dir.z, 0.0, top);
    return mix(mean, h, smoothstep(0.03, 0.12, abs(facing)));
  }

  float soft(float d, float width) {
    return 1.0 - smoothstep(-0.5 * width, 0.5 * width, d);
  }

  void main() {
    vec3 normal = normalize(cross(uCorners[1] - uCorners[0], uCorners[3] - uCorners[0]));

    vec2 projected[4];
    vec2 below[4];
    for (int i = 0; i < 4; i++) {
      projected[i] = uCorners[i].xy - uLight.xy * (uCorners[i].z / uLight.z);
      below[i] = uCorners[i].xy;
    }

    float keyHeight = heightAlong(uLight, normal);
    // Sharp where the card meets the table, blurring and fading the further the shadow
    // falls from that edge: the penumbra grows with the height of the paper casting it,
    // and more of the window sees past a card held high.
    float key = soft(sdQuad(vGround, projected), 0.6 + keyHeight * uLightSize) * uKey
      / (1.0 + keyHeight / 320.0);

    float h = heightAlong(vec3(0.0, 0.0, 1.0), normal);
    vec2 away = -normalize(uLight.xy + 1e-6);
    float tight = soft(sdQuad(vGround - away * 0.7, below), 1.8 + h * 0.9) * uKey / (1.0 + h / 5.0);
    float wide = soft(sdQuad(vGround - away * 4.0, below), 16.0 + h * 0.8) * 0.6 * uKey
      / (1.0 + h / 70.0);

    // Where the terms overlap they never add up past the shadow's own strength.
    float alpha = min(uKey, 1.0 - (1.0 - key) * (1.0 - tight) * (1.0 - wide));
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function createTableShadow(light: THREE.Vector3) {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uCorners: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) },
      uLight: { value: light.clone().normalize() },
      uColor: { value: new THREE.Color(0x000000) },
      // The shadow at its darkest: black at 10%.
      uKey: { value: 0.1 },
      // Penumbra growth per unit of height: a soft window light a few metres away.
      uLightSize: { value: 0.34 },
    },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.renderOrder = -1;
  return {
    mesh,
    // Corners of the card in world space, in order around the rectangle.
    setCorners(corners: THREE.Vector3[]) {
      corners.forEach((corner, index) => material.uniforms.uCorners.value[index].copy(corner));
    },
    setSize(size: number) {
      mesh.scale.set(size, size, 1);
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
