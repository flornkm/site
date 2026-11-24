import { useEffect, useRef, useState } from "react";

/* A ball of glass on a line of words, one word at a time. Nothing in here is a distortion
   effect: every pixel inside the ball is a ray traced through a real sphere, bent at the
   front surface, bent again on the way out the back, and followed to the paper.

   The refractive index is picked so the caustic fold sits just inside the rim. Up to it
   the ball is a magnifier; past it the rays cross over, so the same word comes back
   squeezed, mirrored and stacked into thin strokes that hug the edge. That is why the
   outline on either side looks like a bundle of strokes, and why a word sliding out of
   the middle visibly turns into them, and the next one turns back out of them.

   The paper outside the ball is blank: the words only exist through the glass. The line
   drifts slowly while a word sits in the middle and hurries through the gaps between
   them. Drag anywhere to slide it. */

// Each about ten letters: long enough to spill past the fold on both sides, which is
// what keeps the rim strokes alive while a word sits in the middle.
const WORDS = [
  "Interfaces",
  "Prototypes",
  "Engineering",
  "Typography",
  "Interaction",
  "Experiments",
  "Motion Design",
  "Web Graphics",
];

const FONT = '400 italic 190px "Wagram", Georgia, serif';
const ROW_H = 320;
const BASELINE = 212;
// Width on the paper of a ten-letter word, and the gap between words, both as fractions
// of the ball radius. The glass only sees about a quarter radius of paper either side of
// centre, so a word slightly wider than that overflows into the fold, and a short gap
// keeps the next word close enough to follow straight in.
const REF_WORD = "Typography";
const WORD = 0.58;
const GAP = 0.22;

// Ball radius as a fraction of the shorter half-side; paper distance from the centre as a
// fraction of the radius. With the paper touching the back of the ball the paraxial
// magnification is 1 / (1 - R/f), f = nR / 2(n-1).
const BALL = 0.72;
const PAPER = 1.0;
const IOR = 1.4;
const MAGNIFY = 1 / (1 - (2 * (IOR - 1)) / IOR);

// Seconds from one word to the next, and how much of that the line spends lingering:
// at 1 it would stop dead on each word, at 0 it would move at an even pace.
const PERIOD = 2.0;
const LINGER = 0.93;

const VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos;
  gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;

uniform vec2 u_res;
uniform float u_aspect;
uniform float u_R;
uniform float u_ior;
uniform float u_S;
uniform float u_B;
uniform float u_k;
uniform float u_scroll;
uniform float u_L;
uniform vec2 u_tex;
uniform float u_rowH;
uniform float u_cssPx;
uniform vec3 u_ink;
uniform sampler2D u_strip;

// Screen point -> where its ray lands on the paper. z is 1 inside the ball.
vec3 trace(vec2 p) {
  float R2 = u_R * u_R;
  float r2 = dot(p, p);
  if (r2 >= R2) return vec3(p, 0.0);
  vec3 p1 = vec3(p, sqrt(R2 - r2));
  vec3 d1 = refract(vec3(0.0, 0.0, -1.0), p1 / u_R, 1.0 / u_ior);
  vec3 p2 = p1 - 2.0 * dot(p1, d1) * d1;
  vec3 d2 = refract(d1, -p2 / u_R, u_ior);
  // A grazing exit never reaches the paper within the band; park it far away.
  if (d2.z > -1e-4) return vec3(0.0, 1e4, 1.0);
  float t = (-u_S - p2.z) / d2.z;
  return vec3(p2.xy + t * d2.xy, 1.0);
}

// Paper point -> ink. The line is folded into rows of the texture; s is strip pixels.
float ink(vec2 q, vec2 gx, vec2 gy) {
  float v = (u_B - q.y) * u_k;
  if (v < 0.0 || v > u_rowH) return 0.0;
  float s = mod(q.x * u_k + u_scroll, u_L);
  float row = floor(s / u_tex.x);
  vec2 uv = vec2(s / u_tex.x - row, (row * u_rowH + v) / u_tex.y);
  return textureGrad(u_strip, uv, gx, gy).a;
}

vec2 clampLen(vec2 g, float m) {
  float l = length(g);
  return l > m ? g * (m / l) : g;
}

void main() {
  vec2 p = vec2((v_uv.x * 2.0 - 1.0) * u_aspect, v_uv.y * 2.0 - 1.0);
  float px = 2.0 / u_res.y;

  vec3 c = trace(p);
  // Texel footprint from the mapped coordinate. Across a crossover the mapping jumps,
  // so the footprint is capped instead of blurring that pixel to grey.
  vec2 gx = clampLen(dFdx(c.xy) * u_k, 48.0) / u_tex;
  vec2 gy = clampLen(dFdy(c.xy) * u_k, 48.0) / u_tex;

  float a = 0.0;
  if (c.z > 0.5) {
    // Past the fold the paper is squeezed hard in one direction; four rays per pixel
    // keep the squeezed letters as strokes rather than a smear.
    for (int i = 0; i < 4; i++) {
      vec2 off = (vec2(float(i & 1), float(i >> 1)) - 0.5) * 0.5 * px;
      a += ink(trace(p + off).xy, gx * 0.5, gy * 0.5);
    }
    a *= 0.25;
  }

  float r = length(p);
  float line = 1.0 - smoothstep(0.5 * u_cssPx - 0.5 * px, 0.5 * u_cssPx + 0.5 * px, abs(r - u_R));
  float alpha = max(a, line);
  o = vec4(u_ink * alpha, alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader alloc failed");
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader compile failed");
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext) {
  const program = gl.createProgram();
  if (!program) throw new Error("program alloc failed");
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "program link failed");
  }
  return program;
}

interface Strip {
  canvas: HTMLCanvasElement;
  length: number;
  width: number;
  height: number;
  // Strip pixels per ball radius on the paper.
  perRadius: number;
  centers: number[];
}

// The words laid end to end with wide gaps and folded into rows so the line fits under
// the texture size limit. A word that straddles a fold is drawn into both rows, clipped.
function paintStrip(maxSize: number): Strip {
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("2d context unavailable");
  measure.font = FONT;
  const perRadius = measure.measureText(REF_WORD).width / WORD;
  const gap = perRadius * GAP;
  const xs: number[] = [];
  const centers: number[] = [];
  let length = 0;
  for (const word of WORDS) {
    const w = measure.measureText(word).width;
    xs.push(length);
    centers.push(length + w / 2);
    length += w + gap;
  }
  length = Math.ceil(length);

  const width = Math.min(4096, maxSize);
  const rows = Math.ceil(length / width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = rows * ROW_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.font = FONT;
  ctx.fillStyle = "#fff";
  for (let row = 0; row < rows; row++) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, row * ROW_H, width, ROW_H);
    ctx.clip();
    WORDS.forEach((word, i) => {
      ctx.fillText(word, xs[i] - row * width, row * ROW_H + BASELINE);
    });
    ctx.restore();
  }
  return { canvas, length, width, height: canvas.height, perRadius, centers };
}

// Fraction of the way from one word to the next -> fraction of the distance covered.
// Slow at both ends, quick through the middle, and strictly increasing for LINGER < 1.
const ease = (f: number) => f - (LINGER * Math.sin(2 * Math.PI * f)) / (2 * Math.PI);

function boot(canvas: HTMLCanvasElement, onLost: () => void) {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: true,
    premultipliedAlpha: true,
    failIfMajorPerformanceCaveat: true,
  });
  if (!gl) return undefined;

  const program = linkProgram(gl);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uRes = u("u_res");
  const uAspect = u("u_aspect");
  const uR = u("u_R");
  const uS = u("u_S");
  const uB = u("u_B");
  const uK = u("u_k");
  const uScroll = u("u_scroll");
  const uL = u("u_L");
  const uTex = u("u_tex");
  const uCssPx = u("u_cssPx");
  const uInk = u("u_ink");
  gl.uniform1f(u("u_ior"), IOR);
  gl.uniform1f(u("u_rowH"), ROW_H);
  gl.uniform1i(u("u_strip"), 0);

  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  let strip = paintStrip(maxSize);
  const uploadStrip = () => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, strip.canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  uploadStrip();

  const dark = window.matchMedia("(prefers-color-scheme: dark)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);

  // Word i of the endless line, in strip pixels. i runs past the list to loop it.
  const center = (i: number) => {
    const n = WORDS.length;
    const lap = Math.floor(i / n);
    return strip.centers[i - lap * n] + lap * strip.length;
  };
  const scrollAt = (t: number) => {
    const i = Math.floor(t);
    return center(i) + (center(i + 1) - center(i)) * ease(t - i);
  };
  // The phase that puts the line at a given scroll, so a drag hands back to the drift
  // from wherever it was let go.
  const phaseAt = (s: number) => {
    const n = WORDS.length;
    let i = Math.floor((s - strip.centers[0]) / strip.length) * n;
    while (center(i + 1) <= s) i++;
    while (center(i) > s) i--;
    const span = center(i + 1) - center(i);
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2;
      if (center(i) + span * ease(mid) < s) lo = mid;
      else hi = mid;
    }
    return i + (lo + hi) / 2;
  };

  let aspect = 1;
  let phase = 0;
  let scroll = scrollAt(phase);
  let held = false;
  let lastX = 0;
  let disposed = false;
  let raf = 0;
  let last = 0;

  const resize = () => {
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr()));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr()));
    aspect = w / h;
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  };

  const radius = () => BALL * Math.min(1, aspect);

  const draw = () => {
    resize();
    const R = radius();
    const k = strip.perRadius / R;
    gl.useProgram(program);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uAspect, aspect);
    gl.uniform1f(uR, R);
    gl.uniform1f(uS, PAPER * R);
    gl.uniform1f(uB, ROW_H / (2 * k));
    gl.uniform1f(uK, k);
    gl.uniform1f(uScroll, scroll);
    gl.uniform1f(uL, strip.length);
    gl.uniform2f(uTex, strip.width, strip.height);
    gl.uniform1f(uCssPx, 2 / Math.max(1, canvas.clientHeight));
    if (dark.matches) gl.uniform3f(uInk, 0.95, 0.95, 0.94);
    else gl.uniform3f(uInk, 0.07, 0.07, 0.08);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const frame = (now: number) => {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!held) {
      phase += dt / PERIOD;
      scroll = scrollAt(phase);
    }
    draw();
    wake();
  };

  // The drift only runs while the page is visible and motion is allowed; a drag
  // repaints on its own either way.
  const wake = () => {
    if (disposed || raf || reduced.matches || document.visibilityState !== "visible") return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const sync = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    draw();
    wake();
  };

  // Screen pixels -> strip pixels, scaled down by the magnification so the word under
  // the glass stays under the finger.
  const toStrip = (dx: number) =>
    ((dx / Math.max(1, canvas.clientHeight)) * 2 * (strip.perRadius / radius())) / MAGNIFY;

  const down = (e: PointerEvent) => {
    held = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  };

  const move = (e: PointerEvent) => {
    if (!held) return;
    scroll -= toStrip(e.clientX - lastX);
    lastX = e.clientX;
    if (!raf) draw();
  };

  const up = (e: PointerEvent) => {
    if (!held) return;
    held = false;
    phase = phaseAt(scroll);
    scroll = scrollAt(phase);
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = "grab";
    if (!raf) draw();
  };

  const lost = (e: Event) => {
    e.preventDefault();
    disposed = true;
    cancelAnimationFrame(raf);
    onLost();
  };

  const onScheme = () => {
    if (!raf) draw();
  };

  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("webglcontextlost", lost);
  document.addEventListener("visibilitychange", sync);
  reduced.addEventListener("change", sync);
  dark.addEventListener("change", onScheme);
  const observer = new ResizeObserver(() => {
    if (!raf) draw();
  });
  observer.observe(canvas);

  // The strip was first measured in the fallback face; once Wagram is in, re-lay it out
  // and keep the same phase so the line does not jump.
  document.fonts?.load(FONT).then(() => {
    if (disposed) return;
    strip = paintStrip(maxSize);
    uploadStrip();
    scroll = scrollAt(phase);
    if (!raf) draw();
  });

  draw();
  wake();

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("pointercancel", up);
    canvas.removeEventListener("webglcontextlost", lost);
    document.removeEventListener("visibilitychange", sync);
    reduced.removeEventListener("change", sync);
    dark.removeEventListener("change", onScheme);
    gl.deleteBuffer(quad);
    gl.deleteTexture(tex);
    gl.deleteProgram(program);
  };
}

// Without WebGL: the ball as an outline with the first word set inside it.
const Fallback = () => (
  <div className="absolute inset-0 grid place-items-center">
    <div className="grid aspect-square h-[72%] place-items-center rounded-full border border-primary">
      <span className="font-serif text-[clamp(2rem,7cqh,3.5rem)] italic text-primary">
        {WORDS[0]}
      </span>
    </div>
  </div>
);

export const GlassBall = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const teardown = canvasRef.current ? boot(canvasRef.current, () => setLive(false)) : undefined;
    if (teardown) setLive(true);
    return teardown;
  }, []);

  return (
    <div className="absolute inset-0 select-none" style={{ containerType: "size" }}>
      {!live && <Fallback />}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`A glass ball over a line of words, one at a time: ${WORDS.join(", ")}. Drag to slide the words under the glass.`}
        className="absolute inset-0 size-full cursor-grab touch-none transition-opacity duration-500"
        style={{ opacity: live ? 1 : 0 }}
      />
    </div>
  );
};
