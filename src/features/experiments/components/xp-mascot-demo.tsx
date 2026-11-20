import { useCallback, useEffect, useRef, useState } from "react";
import { PROJECTS } from "@/features/work/projects";
import "./xp-mascot-demo.css";

const WORK_LIST = new Intl.ListFormat("en", { type: "conjunction" }).format(
  PROJECTS.map((project) => project.name),
);

// The official Claude mark. Rasterized onto a grid at runtime so it reads as lightly pixel-art
// while keeping its real silhouette (a sampling filter can't preserve the shape).
const CLAUDE_LOGO_PATH =
  "M50.2278481,170.321013 L100.585316,142.063797 L101.427848,139.601013 L100.585316,138.24 L98.1225316,138.24 L89.6972152,137.721519 L60.921519,136.943797 L35.9696203,135.906835 L11.795443,134.610633 L5.70329114,133.31443 L0,125.796456 L0.583291139,122.037468 L5.70329114,118.602532 L13.0268354,119.250633 L29.2293671,120.352405 L53.5331646,122.037468 L71.161519,123.07443 L97.28,125.796456 L101.427848,125.796456 L102.011139,124.111392 L100.585316,123.07443 L99.4835443,122.037468 L74.3372152,104.992405 L47.116962,86.9751899 L32.8587342,76.6055696 L25.1463291,71.3559494 L21.2577215,66.4303797 L19.5726582,55.6718987 L26.5721519,47.9594937 L35.9696203,48.6075949 L38.3675949,49.2556962 L47.8946835,56.5792405 L68.2450633,72.3281013 L94.8172152,91.9007595 L98.7058228,95.1412658 L100.261266,94.0394937 L100.455696,93.2617722 L98.7058228,90.3453165 L84.2531646,64.2268354 L68.8283544,37.6546835 L61.958481,26.636962 L60.1437975,20.0263291 C59.4956962,17.3043038 59.0420253,15.0359494 59.0420253,12.2491139 L67.0136709,1.42582278 L71.4207595,0 L82.0496203,1.42582278 L86.521519,5.31443038 L93.1321519,20.4151899 L103.825823,44.2005063 L120.417215,76.5407595 L125.277975,86.1326582 L127.87038,95.0116456 L128.842532,97.7336709 L130.527595,97.7336709 L130.527595,96.1782278 L131.888608,77.9665823 L134.416203,55.6070886 L136.878987,26.8313924 L137.721519,18.7301266 L141.739747,9.00860759 L149.711392,3.75898734 L155.933165,6.74025316 L161.053165,14.0637975 L160.340253,18.7949367 L157.294177,38.5620253 L151.331646,69.5412658 L147.443038,90.2805063 L149.711392,90.2805063 L152.303797,87.6881013 L162.803038,73.7539241 L180.431392,51.718481 L188.208608,42.9691139 L197.282025,33.3124051 L203.114937,28.7108861 L214.132658,28.7108861 L222.233924,40.7655696 L218.604557,53.2091139 L207.262785,67.596962 L197.865316,79.7812658 L184.38481,97.9281013 L175.959494,112.44557 L176.737215,113.612152 L178.746329,113.417722 L209.207089,106.936709 L225.668861,103.955443 L245.306329,100.585316 L254.185316,104.733165 L255.157468,108.945823 L251.657722,117.56557 L230.659241,122.75038 L206.031392,127.675949 L169.348861,136.360506 L168.89519,136.684557 L169.413671,137.332658 L185.940253,138.888101 L193.004557,139.276962 L210.308861,139.276962 L242.519494,141.674937 L250.94481,147.248608 L256,154.053671 L255.157468,159.238481 L242.195443,165.849114 L224.696709,161.701266 L183.866329,151.979747 L169.867342,148.48 L167.923038,148.48 L167.923038,149.646582 L179.588861,161.053165 L200.976203,180.366582 L227.742785,205.253671 L229.103797,211.410633 L225.668861,216.271392 L222.039494,215.752911 L198.513418,198.059747 L189.44,190.088101 L168.89519,172.783797 L167.534177,172.783797 L167.534177,174.598481 L172.265316,181.533165 L197.282025,219.123038 L198.578228,230.659241 L196.763544,234.418228 L190.282532,236.686582 L183.153418,235.39038 L168.506329,214.84557 L153.40557,191.708354 L141.221266,170.969114 L139.730633,171.811646 L132.536709,249.259747 L129.166582,253.213165 L121.389367,256.19443 L114.908354,251.268861 L111.473418,243.297215 L114.908354,227.548354 L119.056203,207.003544 L122.426329,190.671392 L125.472405,170.385823 L127.287089,163.64557 L127.157468,163.191899 L125.666835,163.386329 L110.371646,184.38481 L87.1048101,215.817722 L68.6987342,235.52 L64.2916456,237.269873 L56.6440506,233.316456 L57.356962,226.252152 L61.6344304,219.96557 L87.1048101,187.560506 L102.46481,167.469367 L112.380759,155.868354 L112.315949,154.183291 L111.732658,154.183291 L44.0708861,198.124557 L32.0162025,199.68 L26.8313924,194.819241 L27.4794937,186.847595 L29.9422785,184.25519 L50.2926582,170.256203 L50.2278481,170.321013 Z";

const LOGO_GRID = 92;
let LOGO_RECTS: [number, number, number][] | null = null;

function computeLogoRects(): [number, number, number][] | null {
  if (LOGO_RECTS) return LOGO_RECTS;
  if (typeof document === "undefined") return null;
  const G = LOGO_GRID;
  const canvas = document.createElement("canvas");
  canvas.width = G;
  canvas.height = G;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(G / 256, G / 257);
  ctx.fillStyle = "#000";
  ctx.fill(new Path2D(CLAUDE_LOGO_PATH));
  const data = ctx.getImageData(0, 0, G, G).data;
  const rects: [number, number, number][] = [];
  for (let row = 0; row < G; row++) {
    let col = 0;
    while (col < G) {
      if (data[(row * G + col) * 4 + 3] > 110) {
        let w = 1;
        while (col + w < G && data[(row * G + col + w) * 4 + 3] > 110) w++;
        rects.push([col, row, w]);
        col += w;
      } else {
        col++;
      }
    }
  }
  LOGO_RECTS = rects;
  return rects;
}

// Hand-drawn pixel-art eye (7×7 cells): 1 = white, 2 = dark pupil, 3 = highlight, 0 = empty.
const EYE_PATTERN = ["0111110", "1111111", "1111111", "1132211", "1122211", "1111111", "0111110"];
const EYE_PX = 6;
const EYE_FILL: Record<string, string> = { "1": "#ffffff", "2": "#241e1a", "3": "#bcd4ff" };

function pixelEye(ox: number, oy: number) {
  const cells: React.ReactNode[] = [];
  EYE_PATTERN.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === "0") return;
      cells.push(
        <rect
          key={`${ox}-${r}-${c}`}
          x={ox + c * EYE_PX}
          y={oy + r * EYE_PX}
          width={EYE_PX}
          height={EYE_PX}
          fill={EYE_FILL[ch]}
        />,
      );
    });
  });
  return cells;
}

// The Claude mark given a blinking face — a pixel-art Office-Assistant-style helper.
function MascotFace() {
  const [rects, setRects] = useState<[number, number, number][] | null>(null);
  useEffect(() => setRects(computeLogoRects()), []);

  return (
    <svg
      width={92}
      height={92}
      viewBox={rects ? `0 0 ${LOGO_GRID + 1} ${LOGO_GRID + 1}` : "0 0 256 257"}
      shapeRendering="crispEdges"
      className="xp-mascot-face"
      aria-hidden
    >
      {/* The pixelated logo, scaled to the face viewBox. Face features are drawn in the 256-space
          and scaled into it so they sit correctly whether or not the raster has hydrated. */}
      <g transform={rects ? `scale(${(LOGO_GRID + 1) / 256})` : undefined}>
        {rects ? (
          <g transform={`scale(${256 / LOGO_GRID})`}>
            {rects.map(([cx, cy, w]) => (
              <rect key={`${cx}-${cy}`} x={cx} y={cy} width={w} height={1} fill="#d97757" />
            ))}
          </g>
        ) : (
          <path d={CLAUDE_LOGO_PATH} fill="#d97757" />
        )}
        <g className="xp-mascot-eyes">
          {pixelEye(86, 96)}
          {pixelEye(132, 96)}
        </g>
        {[
          [110, 148],
          [116, 154],
          [122, 156],
          [128, 156],
          [134, 154],
          [140, 148],
        ].map(([x, y]) => (
          <rect key={`sm${x}`} x={x} y={y} width={EYE_PX} height={EYE_PX} fill="#8a3f24" />
        ))}
      </g>
    </svg>
  );
}

const GREETING =
  "Hi! I'm Claude. It looks like you're trying to write some code — want a hand? Ask me anything.";

// Canned, Clippy-style answers — no network, just a scripted helper (the endpoint is gone).
const SCRIPT: { match: RegExp; reply: string }[] = [
  {
    match: /reach|contact|email|touch|hire|get in|message/i,
    reply: "Email Florian at hello@floriankiem.com, or find him as @flornkm on X and GitHub.",
  },
  {
    match: /stack|tech|tool|framework|language|build.*with/i,
    reply: "React, TypeScript, Vite, TanStack, Tailwind, Three.js / R3F, and Firebase.",
  },
  {
    match: /work|compan|client|employ|job|team/i,
    reply: `Design and code for ${WORK_LIST}.`,
  },
  {
    match: /xp|windows|clippy|assistant|you|who are/i,
    reply: "I'm a nostalgia experiment: the Claude mark as a Windows XP Office Assistant.",
  },
  {
    match: /do|role|about|design engineer|background/i,
    reply: "Florian is a design engineer — he turns design into production-grade code.",
  },
];

const FALLBACK =
  "I'm a tiny scripted helper, so I only know a few things. Try asking about Florian's work or stack!";

function replyFor(text: string): string {
  return SCRIPT.find((entry) => entry.match.test(text))?.reply ?? FALLBACK;
}

export const XpMascot = () => {
  const [input, setInput] = useState("");
  const [you, setYou] = useState("");
  const [target, setTarget] = useState(GREETING);
  const [typed, setTyped] = useState(GREETING);
  const [streaming, setStreaming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Type the current target out one character at a time, so replies feel like the mascot is
  // "speaking" the way the old installer did.
  useEffect(() => {
    if (typed === target) {
      setStreaming(false);
      return;
    }
    setStreaming(true);
    timer.current = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), 18);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [typed, target]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || streaming) return;
      setYou(text);
      setTyped("");
      setTarget(replyFor(text));
      setInput("");
    },
    [input, streaming],
  );

  return (
    <div className="xp-mascot">
      <div className="xp-mascot-inner">
        <div className="xp-mascot-bubble">
          {you && <div className="xp-mascot-you">you: {you}</div>}
          <div className="xp-mascot-text">
            {typed}
            {streaming && <span className="xp-mascot-caret" />}
          </div>
          <form className="xp-mascot-form" onSubmit={onSubmit}>
            <input
              className="xp-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Claude…"
              spellCheck={false}
              disabled={streaming}
            />
            <button
              type="submit"
              className="xp-btn"
              data-default
              disabled={streaming || !input.trim()}
            >
              Ask
            </button>
          </form>
        </div>
        <div className="xp-mascot-char">
          <MascotFace />
        </div>
      </div>
    </div>
  );
};
