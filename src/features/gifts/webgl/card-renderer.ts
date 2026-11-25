import { TILE } from "@/features/gifts/print/paper";
import { createTableShadow } from "@/features/gifts/webgl/table-shadow";
import * as THREE from "three";

// One card of board stock on a table, turned over by its edge. World units are CSS px on
// the table plane with the card centred at the origin; the camera looks almost straight
// down, like a photo of a card on a desk. The table itself is the page: only the shadow is
// drawn onto it.

const THICKNESS = 1.6; // ~0.45mm board on an A6 card at this scale
const SEGMENTS = 48; // across the width, where the sheet flexes while turning
// How far the middle sags while the card is held up by one edge, as a share of its width.
const SAG = 0.03;

const FOV = 22;
// Not quite straight down, like a photo taken by hand: the near cut edge shows as a hairline.
const CAMERA_TILT = 4;
// A room has far more bounce than direct sun: shade only takes the key away.
const AMBIENT = 0.72;
const KEY = 0.28;

const deg = (value: number) => (value * Math.PI) / 180;

function faceTexture(canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

export class CardRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 10, 40000);
  private light: THREE.Vector3;
  private shadow: ReturnType<typeof createTableShadow>;
  private normalMap: THREE.Texture;
  private materials = {
    edge: new THREE.MeshLambertMaterial(),
    front: new THREE.MeshLambertMaterial(),
    back: new THREE.MeshLambertMaterial(),
  };
  private card?: THREE.Mesh<THREE.BoxGeometry, THREE.Material[]>;
  private rest?: Float32Array;
  private width = 0;
  private height = 0;
  private turn = 0;
  private frame = 0;

  // `lightAngle`: where the window is, in degrees counter-clockwise from the right.
  constructor(canvas: HTMLCanvasElement, lightAngle: number) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;

    const azimuth = deg(lightAngle);
    this.light = new THREE.Vector3(Math.cos(azimuth) * 0.4, Math.sin(azimuth) * 0.4, 0.92);
    this.light.normalize();

    // Three's Lambert divides by π, so a light of π·k contributes k of the albedo: ambient
    // plus the key on a card lying flat add up to the stock's true colour.
    const key = new THREE.DirectionalLight(0xffffff, (KEY * Math.PI) / this.light.z);
    key.position.copy(this.light).multiplyScalar(1000);
    this.scene.add(new THREE.AmbientLight(0xffffff, AMBIENT * Math.PI), key, key.target);

    this.shadow = createTableShadow(this.light);
    this.scene.add(this.shadow.mesh);

    this.normalMap = new THREE.TextureLoader().load("/textures/gifts/paper-normal.webp", () =>
      this.requestRender(),
    );
    this.normalMap.wrapS = this.normalMap.wrapT = THREE.RepeatWrapping;
    for (const material of [this.materials.front, this.materials.back]) {
      material.normalMap = this.normalMap;
      material.normalScale.set(0.09, 0.09);
    }
  }

  setViewport(width: number, height: number, pixelRatio: number) {
    this.renderer.setPixelRatio(Math.min(pixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // At this distance one world unit on the table is one CSS px on screen.
    const distance = height / 2 / Math.tan(deg(FOV) / 2);
    const tilt = deg(CAMERA_TILT);
    this.camera.position.set(0, -Math.sin(tilt) * distance, Math.cos(tilt) * distance);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  setCard(width: number, height: number, paper: string) {
    this.width = width;
    this.height = height;
    if (this.card) {
      this.scene.remove(this.card);
      this.card.geometry.dispose();
    }
    this.materials.edge.color = new THREE.Color(paper);
    this.normalMap.repeat.set(width / TILE, height / TILE);

    const geometry = new THREE.BoxGeometry(width, height, THICKNESS, SEGMENTS, 1, 1);
    this.rest = Float32Array.from(geometry.attributes.position.array);
    // Box face order: +x, -x, +y, -y, +z (front), -z (back).
    const { edge, front, back } = this.materials;
    this.card = new THREE.Mesh(geometry, [edge, edge, edge, edge, front, back]);
    this.scene.add(this.card);
    this.shadow.setSize(4 * Math.max(width, height));
    this.update();
  }

  setFaces(front: HTMLCanvasElement, back: HTMLCanvasElement) {
    for (const [material, canvas] of [
      [this.materials.front, front],
      [this.materials.back, back],
    ] as const) {
      material.map?.dispose();
      material.map = faceTexture(canvas, this.renderer);
      material.needsUpdate = true;
    }
    this.requestRender();
  }

  // Half turns: 0 shows the front, 1 the back, 2 the front again. Positive lifts the right
  // edge first.
  setTurn(turn: number) {
    this.turn = turn;
    this.update();
  }

  private update() {
    const { card, rest, width } = this;
    if (!card || !rest) return;
    const angle = Math.PI * this.turn;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Gravity bows the sheet between the edge being held and the one on the table: most
    // at 45°, none lying flat or standing up.
    const sag = SAG * width * Math.abs(sin) * cos;

    const position = card.geometry.attributes.position;
    let lowest = Infinity;
    for (let i = 0; i < position.count; i++) {
      const x = rest[i * 3];
      const u = (2 * x) / width;
      const z = rest[i * 3 + 2] - sag * (1 - u * u);
      // About the card's long axis, so the right edge (+x) rises for positive turns.
      const worldZ = x * sin + z * cos;
      position.setXYZ(i, x * cos - z * sin, rest[i * 3 + 1], worldZ);
      lowest = Math.min(lowest, worldZ);
    }
    // The card always rests on the table at its lowest point.
    for (let i = 0; i < position.count; i++) position.setZ(i, position.getZ(i) - lowest);
    position.needsUpdate = true;
    card.geometry.computeVertexNormals();
    card.geometry.computeBoundingSphere();

    // The shadow takes the card's mid-plane, whose corners don't sag.
    const halfW = width / 2;
    const halfH = this.height / 2;
    this.shadow.setCorners(
      [
        [-halfW, -halfH],
        [halfW, -halfH],
        [halfW, halfH],
        [-halfW, halfH],
      ].map(([x, y]) => new THREE.Vector3(x * cos, y, x * sin - lowest)),
    );
    this.requestRender();
  }

  requestRender() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.renderer.render(this.scene, this.camera);
    });
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.card?.geometry.dispose();
    this.shadow.dispose();
    for (const material of Object.values(this.materials)) {
      material.map?.dispose();
      material.dispose();
    }
    this.normalMap.dispose();
    this.renderer.dispose();
  }
}
