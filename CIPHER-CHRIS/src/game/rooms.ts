import type { Flags, RoomDef, RoomId } from "./types";
import hallwayRugPortrait from "../assets/photos/hallway-rug-portrait.png";
import livingRugPortrait from "../assets/photos/living-rug-portrait.png";
import { drawSprite } from "./sprites";
import { getPhTime } from "./phTime";
import { getLiveWeather } from "./weather";
import { drawWeatherEffects, windDrift } from "./weatherVisuals";
import type { PhTimeInfo, TimePhase } from "./phTime";

/* ---------------- helpers ---------------- */

type G = CanvasRenderingContext2D;

// Draw the asynchronously loaded portrait in the live layer, not the cached background.
const hallwayRugImage = new Image();
hallwayRugImage.src = hallwayRugPortrait;
const livingRugImage = new Image();
livingRugImage.src = livingRugPortrait;

function R(g: G, x: number, y: number, w: number, h: number, c: string) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** deterministic pseudo-random from a seed */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** squared-off pixel glow (concentric translucent squares) */
function glow(g: G, cx: number, cy: number, r: number, color: string, a = 0.1) {
  g.save();
  for (let i = 3; i >= 1; i--) {
    g.globalAlpha = a * (4 - i) * 0.5;
    g.fillStyle = color;
    const s = (r * i) / 1.6;
    g.fillRect(Math.round(cx - s / 2), Math.round(cy - s / 2), Math.round(s), Math.round(s));
  }
  g.restore();
}

/* ---------------- 3x5 micro pixel font ---------------- */

const FONT: Record<string, string[]> = {
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  C: [".##", "#..", "#..", "#..", ".##"],
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"],
  F: ["###", "#..", "##.", "#..", "#.."],
  G: [".##", "#..", "#.#", "#.#", ".##"],
  H: ["#.#", "#.#", "###", "#.#", "#.#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  J: ["..#", "..#", "..#", "#.#", ".#."],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"],
  L: ["#..", "#..", "#..", "#..", "###"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  O: [".#.", "#.#", "#.#", "#.#", ".#."],
  P: ["##.", "#.#", "##.", "#..", "#.."],
  Q: [".#.", "#.#", "#.#", "##.", ".##"],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  V: ["#.#", "#.#", "#.#", "#.#", ".#."],
  W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
  X: ["#.#", "#.#", ".#.", "#.#", "#.#"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
  Z: ["###", "..#", ".#.", "#..", "###"],
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["##.", "..#", ".#.", "#..", "###"],
  "3": ["##.", "..#", ".#.", "..#", "##."],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "##.", "..#", "##."],
  "6": [".##", "#..", "##.", "#.#", ".#."],
  "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": [".#.", "#.#", ".#.", "#.#", ".#."],
  "9": [".#.", "#.#", ".##", "..#", "##."],
  ":": ["...", ".#.", "...", ".#.", "..."],
  ".": ["...", "...", "...", "...", ".#."],
  "!": [".#.", ".#.", ".#.", "...", ".#."],
  "?": ["##.", "..#", ".#.", "...", ".#."],
  "-": ["...", "...", "###", "...", "..."],
  "+": ["...", ".#.", "###", ".#.", "..."],
  "/": ["..#", "..#", ".#.", "#..", "#.."],
  "'": [".#.", ".#.", "...", "...", "..."],
  " ": ["..", "..", "..", "..", ".."],
};

export function textW(str: string, scale = 1) {
  let w = 0;
  for (const ch of str.toUpperCase()) {
    const gl = FONT[ch] ?? FONT[" "];
    w += (gl[0].length + 1) * scale;
  }
  return w - scale;
}

export function txt(g: G, str: string, x: number, y: number, c: string, scale = 1, center = false) {
  let cx = center ? x - Math.floor(textW(str, scale) / 2) : x;
  g.fillStyle = c;
  for (const ch of str.toUpperCase()) {
    const gl = FONT[ch] ?? FONT[" "];
    gl.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === "#") g.fillRect(cx + rx * scale, y + ry * scale, scale, scale);
      }
    });
    cx += (gl[0].length + 1) * scale;
  }
}

/* ---------------- common architectural painters ---------------- */

function base(g: G, wall: string, shade: string, floor: string, line: string) {
  R(g, 0, 0, 320, 180, wall);
  R(g, 0, 88, 320, 24, shade);
  R(g, 0, 88, 320, 2, "rgba(255,255,255,0.05)");
  R(g, 0, 112, 320, 6, "#0a0817");
  R(g, 0, 118, 320, 62, floor);
  g.fillStyle = line;
  [131, 145, 160, 175].forEach((y) => g.fillRect(0, y, 320, 1));
  const rnd = seeded(42);
  for (let i = 0; i < 24; i++) {
    const rows = [118, 132, 146, 161];
    const y = rows[Math.floor(rnd() * rows.length)];
    g.fillRect(Math.floor(rnd() * 310), y, 1, 13);
  }
}

function checker(g: G, y0: number, c1: string, c2: string, s = 12) {
  for (let y = y0; y < 180; y += s) {
    for (let x = 0; x < 320; x += s) {
      if (((x / s) | 0) % 2 === ((y / s) | 0) % 2) R(g, x, y, s, s, c1);
      else R(g, x, y, s, s, c2);
    }
  }
}

/** Wide 28px leaf / 34px framed doorway scaled for full-sized Cipher Chris */
function doorDraw(g: G, x: number, label: string, body = "#3d2b4f", frame = "#17122b") {
  R(g, x - 3, 44, 34, 74, frame);
  R(g, x - 3, 44, 34, 2, "rgba(255,255,255,0.08)");
  R(g, x, 47, 28, 71, body);
  R(g, x + 4, 53, 20, 25, "rgba(0,0,0,0.26)");
  R(g, x + 4, 84, 20, 28, "rgba(0,0,0,0.26)");
  R(g, x + 4, 53, 20, 2, "rgba(255,255,255,0.08)");
  R(g, x + 4, 84, 20, 2, "rgba(255,255,255,0.06)");
  R(g, x + 21, 80, 5, 2, "#fbbf24"); // sturdy brass lever handle at hand height
  R(g, x + 24, 79, 2, 4, "#d97706");
  txt(g, label, x + 14, 37, "#0a0817", 1, true);
  txt(g, label, x + 14, 36, "#c9c3f5", 1, true);
}

const SKY_PALETTES: Record<
  TimePhase,
  { top: string; mid: string; low: string; bldg: string; winA: string; winB: string; beam: string; beamAlpha: number; roomTint: string; roomAlpha: number }
> = {
  dawn: {
    top: "#1d1b4b",
    mid: "#6d3b6e",
    low: "#f59e0b",
    bldg: "#1e1b38",
    winA: "#fde68a",
    winB: "#38bdf8",
    beam: "#fed7aa",
    beamAlpha: 0.09,
    roomTint: "#fda4af",
    roomAlpha: 0.045,
  },
  day: {
    top: "#0284c7",
    mid: "#38bdf8",
    low: "#bae6fd",
    bldg: "#334155",
    winA: "#e0f2fe",
    winB: "#7dd3fc",
    beam: "#fef9c3",
    beamAlpha: 0.13,
    roomTint: "#e0f2fe",
    roomAlpha: 0.075,
  },
  dusk: {
    top: "#241445",
    mid: "#be185d",
    low: "#fb923c",
    bldg: "#1a102e",
    winA: "#fbbf24",
    winB: "#f472b6",
    beam: "#fb923c",
    beamAlpha: 0.12,
    roomTint: "#fb7185",
    roomAlpha: 0.06,
  },
  night: {
    top: "#070613",
    mid: "#100c2a",
    low: "#1a1440",
    bldg: "#08061a",
    winA: "#fbbf24",
    winB: "#7dd3fc",
    beam: "#a5c4ff",
    beamAlpha: 0.05,
    roomTint: "#0b0a18",
    roomAlpha: 0,
  },
};

function drawPixelCloud(g: G, x: number, y: number, col: string, shade: string) {
  R(g, x + 3, y, 7, 2, col);
  R(g, x + 1, y + 2, 12, 3, col);
  R(g, x, y + 4, 14, 2, shade);
}

// Cloud cover is live when available; otherwise retain a neutral time-of-day sky.
function cloudStyle(phase: TimePhase) {
  const weather = getLiveWeather();
  const coverage = weather?.cloudCover ?? (phase === "night" ? 0 : 40);
  const stormy = weather != null && ((weather.code >= 51 && weather.code <= 82) || weather.code >= 95);
  const dark = stormy || coverage >= 80;
  const color = dark ? (phase === "night" ? "#55586a" : "#858c99")
    : phase === "night" ? "#777c9a" : phase === "dawn" ? "#fed7aa" : phase === "dusk" ? "#fbcfe8" : "#ffffff";
  const shade = dark ? (phase === "night" ? "#393e52" : "#646c7b")
    : phase === "night" ? "#555a76" : phase === "dawn" ? "#f472b6" : phase === "dusk" ? "#9d174d" : "#dbeafe";
  return { coverage, color, shade };
}

function applyRoomDaylight(g: G, phase: TimePhase) {
  const pal = SKY_PALETTES[phase];
  if (pal.roomAlpha <= 0) return;
  g.save();
  g.globalAlpha = pal.roomAlpha;
  g.fillStyle = pal.roomTint;
  g.fillRect(0, 0, 320, 180);
  g.restore();
}

function windowDraw(g: G, x: number, y: number, w: number, h: number, seed = 7, t = 0, pht: PhTimeInfo = getPhTime()) {
  const pal = SKY_PALETTES[pht.phase];
  R(g, x - 3, y - 3, w + 6, h + 6, "#120e26");
  R(g, x - 5, y + h + 2, w + 10, 3, "#241d3d");

  // 3-band sky inside window
  const h3 = Math.ceil(h / 3);
  R(g, x, y, w, h3, pal.top);
  R(g, x, y + h3, w, h3, pal.mid);
  R(g, x, y + h3 * 2, w, h - h3 * 2, pal.low);

  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();

  if (pht.phase === "night") {
    const rnd = seeded(seed);
    g.fillStyle = "#c9c3f5";
    for (let i = 0; i < 18; i++) {
      const sx = x + 2 + rnd() * (w - 4);
      const sy = y + 2 + rnd() * (h * 0.58);
      if (Math.sin(t * 2 + i) > -0.6) g.fillRect(sx, sy, 1, 1);
    }
    // crescent moon
    R(g, x + w - 12, y + 6, 7, 7, "#f5f0d8");
    R(g, x + w - 9, y + 5, 6, 7, pal.top);
  } else if (pht.phase === "day") {
    // bright Philippine sun + drifting cumulus cloud
    const sunX = x + w - 12;
    const sunY = y + 6;
    R(g, sunX - 1, sunY - 1, 9, 9, "#fef08a");
    R(g, sunX, sunY, 7, 7, "#fbbf24");
  } else if (pht.phase === "dawn") {
    // rising sun near horizon + rosy cloud
    const sunX = x + w - 13;
    const sunY = y + h - 18;
    R(g, sunX - 1, sunY - 1, 9, 9, "#fde68a");
    R(g, sunX, sunY, 7, 7, "#f59e0b");
  } else {
    // Manila Bay sunset sun + violet-pink cloud
    const sunX = x + w - 13;
    const sunY = y + h - 17;
    R(g, sunX - 1, sunY - 1, 9, 9, "#fbbf24");
    R(g, sunX, sunY, 7, 7, "#ef4444");
  }

  // Use the same live cloud cover through the windows and on the rooftop.
  const clouds = cloudStyle(pht.phase);
  const cloudCount = clouds.coverage < 10 ? 0 : clouds.coverage < 50 ? 1 : clouds.coverage < 80 ? 2 : 4;
  for (let i = 0; i < cloudCount; i++) {
    const cx = x - 14 + (((t * windDrift(getLiveWeather()) + seed * 7 + i * (w + 20) / cloudCount) % (w + 28) + (w + 28)) % (w + 28));
    drawPixelCloud(g, cx, y + 5 + (i % 3) * 7, clouds.color, clouds.shade);
  }

  // city rooftops silhouette / sunlit roofs
  R(g, x, y + h - 10, w, 10, pal.bldg);
  R(g, x + 3, y + h - 15, 8, 6, pal.bldg);
  R(g, x + w - 13, y + h - 14, 9, 5, pal.bldg);
  if (pht.phase === "day") {
    R(g, x + 3, y + h - 15, 8, 1, "#94a3b8");
    R(g, x + w - 13, y + h - 14, 9, 1, "#94a3b8");
  }
  R(g, x + 5, y + h - 8, 2, 2, pal.winA);
  R(g, x + w - 9, y + h - 6, 2, 2, pal.winB);

  g.restore();

  // window mullion crossbars
  R(g, x + (w >> 1) - 1, y, 2, h, "#120e26");
  R(g, x, y + (h >> 1) - 1, w, 2, "#120e26");
}

function windowBeamDraw(g: G, x: number, y: number, w: number, h: number, pht: PhTimeInfo) {
  const pal = SKY_PALETTES[pht.phase];
  g.save();
  g.globalAlpha = pal.beamAlpha;
  g.fillStyle = pal.beam;
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x + w, y + h);
  g.lineTo(x + w + 28, 180);
  g.lineTo(x + 12, 180);
  g.fill();
  g.restore();
}

function photoFrame(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { frame?: string; bevel?: string; mat?: string; wire?: boolean } = {}
) {
  const { frame = "#5d422d", bevel = "#fbbf24", mat = "#e8e6f7", wire = true } = opts;
  if (wire) {
    const cx = Math.round(x + w / 2);
    g.strokeStyle = "#57517d";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x + 3, y);
    g.lineTo(cx, y - 4);
    g.lineTo(x + w - 4, y);
    g.stroke();
    R(g, cx - 1, y - 5, 2, 2, "#fbbf24");
  }
  R(g, x + 1, y + 2, w + 1, h, "rgba(0,0,0,0.48)");
  R(g, x, y, w, h, frame);
  R(g, x + 1, y + 1, w - 2, 1, bevel);
  R(g, x + 1, y + 1, 1, h - 2, bevel);
  R(g, x + 2, y + 2, w - 4, h - 4, mat);
  return { ix: x + 3, iy: y + 3, iw: w - 6, ih: h - 6 };
}

function photoGlare(g: G, ix: number, iy: number) {
  g.fillStyle = "rgba(255,255,255,0.34)";
  g.fillRect(ix + 1, iy + 1, 2, 1);
  g.fillRect(ix + 1, iy + 2, 1, 2);
  g.fillRect(ix + 3, iy + 3, 1, 1);
}

function polaroidDraw(g: G, x: number, y: number, w: number, h: number, clipCol = "#d9822b") {
  R(g, x + 1, y + 1, w, h, "rgba(0,0,0,0.45)");
  R(g, x, y, w, h, "#f3f1ff");
  R(g, x, y + h - 2, w, 2, "#d8d4f2");
  R(g, x + 2, y + h - 3, Math.max(3, w - 5), 1, "#6b6496");
  R(g, x + Math.floor(w / 2) - 1, y - 2, 2, 4, clipCol);
  return { ix: x + 1, iy: y + 1, iw: w - 2, ih: h - 5 };
}

/* ============================================================
   LIVING ROOM — Wide Deep Couch, Tall Lamp, XL TV Credenza
============================================================ */
function paintLiving(g: G) {
  base(g, "#1a1733", "#141126", "#2a2138", "#221a2e");

  // left wall: royal cat portrait + seascape frame stack
  const catF = photoFrame(g, 4, 16, 19, 23, { frame: "#925f1b", bevel: "#fde68a", mat: "#f5f0d8" });
  R(g, catF.ix, catF.iy, catF.iw, catF.ih, "#4c1d3d");
  R(g, catF.ix + 4, catF.iy + 2, 5, 2, "#fbbf24");
  R(g, catF.ix + 3, catF.iy + 5, 7, 7, "#efe3cc"); // cream lynx-point Siamese head
  R(g, catF.ix + 4, catF.iy + 7, 5, 4, "#7a5946"); // lighter brown tabby mask
  R(g, catF.ix + 6, catF.iy + 7, 1, 2, "#3b2418"); // forehead M stripe
  R(g, catF.ix + 3, catF.iy + 4, 2, 2, "#3b2418"); // dark ears
  R(g, catF.ix + 8, catF.iy + 4, 2, 2, "#3b2418");
  R(g, catF.ix + 4, catF.iy + 8, 1, 1, "#d9a441"); // amber eyes
  R(g, catF.ix + 8, catF.iy + 8, 1, 1, "#d9a441");
  R(g, catF.ix + 2, catF.iy + 12, 9, 5, "#00e5ff");
  photoGlare(g, catF.ix, catF.iy);

  const seaF = photoFrame(g, 5, 46, 17, 19, { frame: "#4a3550", bevel: "#9d97c9" });
  R(g, seaF.ix, seaF.iy, seaF.iw, seaF.ih, "#1e3a8a");
  R(g, seaF.ix + 6, seaF.iy + 2, 3, 3, "#fde68a");
  R(g, seaF.ix, seaF.iy + 7, seaF.iw, 6, "#0ea5e9");
  R(g, seaF.ix + 2, seaF.iy + 8, 5, 1, "#e0f2fe");
  photoGlare(g, seaF.ix, seaF.iy);

  // framed mountain photo above wide kitchen door
  const kDoorF = photoFrame(g, 34, 10, 18, 18, { frame: "#5d422d", bevel: "#d9822b", wire: false });
  R(g, kDoorF.ix, kDoorF.iy, kDoorF.iw, kDoorF.ih, "#274b8f");
  R(g, kDoorF.ix + 7, kDoorF.iy + 2, 3, 3, "#f5f0d8");
  R(g, kDoorF.ix + 1, kDoorF.iy + 7, 10, 5, "#1e1b4b");
  R(g, kDoorF.ix + 3, kDoorF.iy + 6, 5, 2, "#7dd3fc");
  photoGlare(g, kDoorF.ix, kDoorF.iy);

  // center gallery wall above couch: 3 framed memories
  const g1 = photoFrame(g, 107, 38, 21, 23, { frame: "#5d422d", bevel: "#fbbf24" });
  R(g, g1.ix, g1.iy, g1.iw, g1.ih, "#241942");
  R(g, g1.ix + 4, g1.iy + 3, 3, 2, "#0f0f14"); // black hair
  R(g, g1.ix + 4, g1.iy + 5, 3, 2, "#f0bd8f"); // face
  R(g, g1.ix + 2, g1.iy + 7, 7, 5, "#f0bd8f"); // shirtless belly
  R(g, g1.ix + 2, g1.iy + 12, 7, 5, "#14141b"); // black shorts
  R(g, g1.ix + 2, g1.iy + 12, 1, 5, "#f4f3ff"); // side stripe
  R(g, g1.ix + 10, g1.iy + 11, 4, 5, "#efe3cc"); // cream lynx-point Siamese body
  R(g, g1.ix + 10, g1.iy + 11, 4, 2, "#7a5946"); // tabby point face
  R(g, g1.ix + 11, g1.iy + 11, 1, 1, "#3b2418"); // forehead stripe
  R(g, g1.ix + 10, g1.iy + 3, 3, 4, "#fbbf24");
  photoGlare(g, g1.ix, g1.iy);

  const g2 = photoFrame(g, 132, 34, 27, 21, { frame: "#2a1f45", bevel: "#fbbf24" });
  R(g, g2.ix, g2.iy, g2.iw, g2.ih, "#0b132b");
  R(g, g2.ix + 2, g2.iy + 3, 8, 6, "#22d3ee");
  R(g, g2.ix + 11, g2.iy + 3, 8, 6, "#4ade80");
  R(g, g2.ix, g2.iy + 10, g2.iw, 5, "#4a3550");
  R(g, g2.ix + 17, g2.iy + 8, 3, 3, "#e8e6f7");
  photoGlare(g, g2.ix, g2.iy);

  const g3 = photoFrame(g, 163, 40, 19, 22, { frame: "#4c2a6e", bevel: "#f471b5" });
  R(g, g3.ix, g3.iy, g3.iw, g3.ih, "#141033");
  R(g, g3.ix + 8, g3.iy + 2, 3, 3, "#f5f0d8");
  R(g, g3.ix + 1, g3.iy + 7, 5, 9, "#09071a");
  R(g, g3.ix + 7, g3.iy + 9, 5, 7, "#09071a");
  R(g, g3.ix + 3, g3.iy + 9, 1, 1, "#fbbf24");
  R(g, g3.ix + 9, g3.iy + 11, 1, 1, "#22d3ee");
  photoGlare(g, g3.ix, g3.iy);

  windowDraw(g, 64, 18, 34, 52, 11);
  doorDraw(g, 29, "KITCHEN");
  doorDraw(g, 205, "HALL");
  doorDraw(g, 289, "BEDROOM");


  // XL 3-cushion deep plush couch (84px wide, reinforced wood legs, thick rolled arms)
  R(g, 108, 123, 5, 4, "#3a2a1e");
  R(g, 143, 123, 4, 4, "#3a2a1e");
  R(g, 177, 123, 5, 4, "#3a2a1e");
  R(g, 106, 82, 78, 41, "#43307a");
  R(g, 106, 82, 78, 13, "#4f3a8f"); // tall supportive headrest back
  R(g, 131, 83, 2, 19, "#362566"); // 3 back cushion seams
  R(g, 157, 83, 2, 19, "#362566");
  R(g, 101, 88, 12, 35, "#3a2970"); // thick left rolled armrest
  R(g, 101, 88, 12, 5, "#523d96");
  R(g, 177, 88, 12, 35, "#3a2970"); // thick right rolled armrest
  R(g, 177, 88, 12, 5, "#523d96");
  R(g, 113, 101, 21, 16, "#55409c"); // 3 deep plush seat cushions
  R(g, 135, 101, 21, 16, "#55409c");
  R(g, 157, 101, 20, 16, "#55409c");
  R(g, 113, 101, 64, 3, "#6852b5"); // cushion top highlight
  R(g, 106, 118, 78, 5, "#241748"); // solid hardwood base rail
  R(g, 116, 93, 12, 10, "#f471b5"); // big throw pillow

  // tall standing floor lamp (60px tall, rises above Cipher Chris's head)
  R(g, 194, 80, 3, 44, "#0f0c20");
  R(g, 189, 123, 13, 3, "#0f0c20");
  R(g, 189, 67, 13, 13, "#fbbf24");
  R(g, 191, 65, 9, 2, "#f59e0b");
  R(g, 188, 79, 15, 3, "#b45309");

  // heavy TV credenza + large CRT/widescreen TV + tall media tower
  R(g, 238, 96, 36, 28, "#241d3d");
  R(g, 238, 96, 36, 3, "#3b3063");
  R(g, 240, 101, 15, 19, "#1a1530");
  R(g, 257, 101, 15, 19, "#1a1530");
  R(g, 236, 54, 40, 38, "#0d0b1a");
  R(g, 250, 92, 12, 4, "#0d0b1a");

  R(g, 275, 76, 12, 48, "#241d3d");
  const rnd = seeded(9);
  const cols = ["#f471b5", "#22d3ee", "#4ade80", "#fbbf24", "#00e5ff"];
  for (let s = 0; s < 4; s++)
    for (let i = 0; i < 2; i++) R(g, 277 + i * 4, 80 + s * 11, 3, 8, cols[Math.floor(rnd() * 5)]);

  drawSprite(g, "plant", 3, 98);
}

function drawLivingCoffeeTable(g: G) {
  // sturdy solid-wood coffee table (54px wide, thick slab + chunky legs)
  R(g, 121, 134, 7, 10, "#57321f"); // dark outlines keep legs visible over the rug
  R(g, 162, 134, 7, 10, "#57321f");
  R(g, 123, 134, 4, 9, "#bc7946");
  R(g, 164, 134, 4, 9, "#bc7946");
  R(g, 117, 127, 56, 8, "#57321f");
  R(g, 118, 128, 54, 6, "#c68a52"); // warm oak contrasts with the dark portrait
  R(g, 118, 128, 54, 2, "#f0c48a");
  R(g, 120, 133, 50, 1, "#9b5f35");
  R(g, 127, 123, 6, 5, "#e8e6f7"); // XL mug
  R(g, 133, 124, 2, 3, "#e8e6f7");
  R(g, 150, 125, 11, 3, "#14122b"); // chunky TV remote
  R(g, 152, 124, 2, 2, "#f471b5");

}

function dynLiving(g: G, t: number, f: Flags) {
  const pht = getPhTime();
  // live Philippine sky + animated clouds/stars through living room window
  windowDraw(g, 64, 18, 34, 52, 11, t, pht);
  windowBeamDraw(g, 64, 18, 34, 52, pht);
  applyRoomDaylight(g, pht.phase);

  // A smooth circular portrait rug, drawn on the live layer once the image loads.
  g.save();
  g.beginPath();
  g.arc(146, 151, 27, 0, Math.PI * 2);
  g.fillStyle = "#3d2b56";
  g.fill();
  g.beginPath();
  g.arc(146, 151, 24, 0, Math.PI * 2);
  g.fillStyle = "#fbbf24";
  g.fill();
  g.clip();
  if (livingRugImage.complete && livingRugImage.naturalWidth > 0) {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(livingRugImage, 176, 0, 560, 560, 122, 127, 48, 48);
  }
  g.restore();

  // The couch leg and coffee table sit in front of the rug.
  R(g, 143, 123, 4, 4, "#3a2a1e");
  drawLivingCoffeeTable(g);

  // TV screen (shows live Philippine Standard Time on broadcast test card!)
  const sx = 240, sy = 58, sw = 32, sh = 30;
  if (t % 11 < 1.8) {
    const bars = ["#f5f0d8", "#fbbf24", "#22d3ee", "#4ade80", "#f471b5", "#f43f5e", "#3b82f6", "#00e5ff"];
    bars.forEach((c, i) => R(g, sx + i * 4, sy, 4, 17, c));
    R(g, sx, sy + 17, sw, 13, "#0d0b1a");
    txt(g, "CIPHER", sx + sw / 2, sy + 19, "#e8e6f7", 1, true);
    txt(g, pht.shortTime, sx + sw / 2, sy + 25, "#4ade80", 1, true);
  } else {
    R(g, sx, sy, sw, sh, "#11131f");
    const rnd = seeded(((t * 24) | 0) + 3);
    for (let i = 0; i < 140; i++) {
      const v = 40 + Math.floor(rnd() * 160);
      g.fillStyle = `rgb(${v},${v},${v + 20})`;
      g.fillRect(sx + rnd() * sw, sy + rnd() * sh, 2, 1);
    }
    R(g, sx, sy + ((t * 30) % sh), sw, 2, "rgba(255,255,255,0.13)");
  }
  glow(g, sx + sw / 2, sy + sh / 2, 30, "#7dd3fc", 0.06);
  // tall lamp glow (softer during bright Philippine daylight)
  if (!f.lampOff) glow(g, 195, 73, 28, "#fbbf24", pht.phase === "day" ? 0.05 : 0.13);
  else R(g, 189, 67, 13, 13, "#6b5a2a");
  // (Pororo is drawn by the engine — he roams every room from the start and
  //  carries the USB drive with him until he's fed.)
}

/* ============================================================
   KITCHEN — French-Door XL Fridge, 4-Burner Range, Wide Oak Chairs
============================================================ */
function paintKitchen(g: G) {
  R(g, 0, 0, 320, 180, "#16283f");
  R(g, 0, 88, 320, 24, "#122035");
  R(g, 0, 112, 320, 6, "#0a0817");
  checker(g, 118, "#241f42", "#1a1730", 12);

  // backsplash tiles
  for (let y = 52; y < 78; y += 6)
    for (let x = 46; x < 174; x += 8) {
      R(g, x, y, 7, 5, ((x / 8) | 0) % 2 ? "#1e3a4c" : "#24485e");
    }

  // deep upper cabinets
  R(g, 46, 14, 50, 32, "#2b3350");
  R(g, 46, 14, 50, 2, "#3e4970");
  R(g, 70, 14, 2, 32, "#1c2238");
  R(g, 66, 38, 2, 5, "#fbbf24");
  R(g, 74, 38, 2, 5, "#fbbf24");

  R(g, 136, 14, 38, 28, "#2b3350");
  R(g, 154, 14, 2, 28, "#1c2238");

  windowDraw(g, 100, 14, 32, 38, 23);

  // waist-high heavy kitchen counter run (y = 78..118, 40px tall!)
  R(g, 46, 82, 128, 36, "#2b3350");
  R(g, 44, 77, 132, 6, "#57628a");
  R(g, 44, 77, 132, 2, "#7582ad");
  [68, 92, 116, 136].forEach((x) => R(g, x, 84, 2, 30, "#1c2238"));
  [58, 82, 106, 126].forEach((x) => R(g, x, 89, 7, 2, "#8f8bb5"));

  // wide basin sink + tall gooseneck faucet
  R(g, 103, 78, 28, 4, "#8f8bb5");
  R(g, 115, 65, 3, 13, "#8f8bb5");
  R(g, 115, 65, 8, 3, "#a5a2c9");

  // wide 4-burner gas range & full-width oven (38px wide!)
  R(g, 136, 76, 38, 42, "#1c2238");
  R(g, 136, 74, 38, 4, "#14122b"); // heavy cast-iron grates
  [140, 149, 158, 166].forEach((bx) => R(g, bx, 72, 6, 2, "#0a0817"));
  [141, 148, 155, 162, 169].forEach((kx) => R(g, kx, 80, 2, 2, "#f43f5e")); // red gas knobs
  R(g, 140, 86, 30, 24, "#0a0817"); // wide oven window
  R(g, 143, 90, 24, 16, "#1f1629");
  R(g, 141, 87, 28, 2, "#8f8bb5"); // heavy bar handle
  R(g, 159, 88, 6, 12, "#f471b5"); // dish towel

  // big dual-head espresso / coffee station
  R(g, 49, 55, 22, 22, "#1c1a30");
  R(g, 48, 52, 24, 4, "#39406b");
  R(g, 53, 64, 10, 12, "#3d2b1a"); // full glass carafe
  R(g, 53, 68, 10, 8, "#24160c");
  R(g, 66, 58, 3, 3, "#f43f5e");

  // extra-large 18" family pizza box on counter
  R(g, 73, 69, 28, 8, "#b45309");
  R(g, 72, 68, 30, 3, "#d9822b");

  // eye-level wide microwave + live PHT digital display
  R(g, 136, 46, 38, 21, "#2b3350");
  R(g, 138, 49, 15, 15, "#0a0817");
  R(g, 140, 51, 11, 11, "#182232");
  R(g, 154, 52, 19, 9, "#0a0817");

  // XL 38px wide double-door French refrigerator + bottom freezer drawer
  R(g, 5, 30, 38, 88, "#3c4a6b");
  R(g, 5, 30, 38, 3, "#5d6f96");
  R(g, 5, 33, 18, 57, "#46557a"); // left French door
  R(g, 25, 33, 18, 57, "#46557a"); // right French door
  R(g, 23, 33, 2, 57, "#232c47"); // center split
  R(g, 5, 90, 38, 3, "#232c47"); // bottom freezer seam
  R(g, 5, 93, 38, 25, "#384666"); // wide freezer drawer
  R(g, 9, 56, 8, 13, "#1c2238"); // ice & water dispenser
  R(g, 11, 59, 4, 3, "#22d3ee");
  R(g, 20, 44, 2, 34, "#a5b4fc"); // tall stainless handles
  R(g, 26, 44, 2, 34, "#a5b4fc");
  R(g, 10, 97, 28, 3, "#a5b4fc"); // freezer bar handle
  // fridge Polaroids + magnets
  R(g, 29, 39, 10, 12, "#f3f1ff");
  R(g, 30, 40, 8, 7, "#3b2a6e");
  R(g, 32, 41, 4, 5, "#fbbf24");
  R(g, 30, 56, 10, 12, "#f3f1ff");
  R(g, 31, 57, 8, 7, "#1e3a4c");
  R(g, 33, 58, 4, 5, "#4ade80");
  const mc = ["#f471b5", "#22d3ee", "#4ade80", "#f43f5e", "#fbbf24"];
  const mr = seeded(5);
  for (let i = 0; i < 6; i++) R(g, 8 + mr() * 30, 36 + mr() * 48, 2, 2, mc[i % 5]);

  // framed late-night food photos on kitchen wall
  const kf1 = photoFrame(g, 180, 18, 26, 25, { frame: "#6e4728", bevel: "#fbbf24", mat: "#f5f0d8" });
  R(g, kf1.ix, kf1.iy, kf1.iw, kf1.ih, "#1c132b");
  R(g, kf1.ix + 2, kf1.iy + 8, 9, 9, "#fbbf24");
  R(g, kf1.ix + 2, kf1.iy + 7, 9, 2, "#d9822b");
  R(g, kf1.ix + 4, kf1.iy + 11, 2, 2, "#dc2626");
  R(g, kf1.ix + 7, kf1.iy + 13, 2, 2, "#dc2626");
  R(g, kf1.ix + 13, kf1.iy + 10, 5, 6, "#e8e6f7");
  R(g, kf1.ix + 14, kf1.iy + 11, 3, 2, "#6b4226");
  photoGlare(g, kf1.ix, kf1.iy);

  const kf2 = photoFrame(g, 212, 22, 21, 21, { frame: "#4a3550", bevel: "#22d3ee" });
  R(g, kf2.ix, kf2.iy, kf2.iw, kf2.ih, "#0f172a");
  R(g, kf2.ix + 3, kf2.iy + 7, 9, 6, "#f471b5");
  R(g, kf2.ix + 4, kf2.iy + 5, 7, 2, "#fde68a");
  R(g, kf2.ix + 9, kf2.iy + 2, 4, 4, "#fbbf24");
  photoGlare(g, kf2.ix, kf2.iy);


  // heavy cast-iron hanging pans
  R(g, 245, 22, 36, 3, "#57628a");
  [251, 263, 275].forEach((x, i) => {
    R(g, x, 25, 2, 7 + i * 2, "#57628a");
    g.fillStyle = "#39406b";
    g.beginPath();
    g.arc(x + 1, 38 + i * 2, 6, 0, Math.PI * 2);
    g.fill();
  });

  // tall stainless step-pedal trash bin
  R(g, 177, 94, 15, 24, "#39406b");
  R(g, 175, 91, 19, 4, "#57628a");
  R(g, 180, 88, 5, 3, "#e8e6f7");

  // sturdy wide oak dining chairs (20px wide cushioned seats!) + thick butcher-block table
  // left wide chair
  R(g, 196, 92, 4, 42, "#3a2a3e"); // thick tall backrest post
  R(g, 196, 94, 10, 12, "#4a3550"); // back slat
  R(g, 196, 113, 19, 4, "#00e5ff"); // thick seat cushion
  R(g, 195, 117, 21, 4, "#4a3550"); // solid seat frame
  R(g, 211, 121, 4, 13, "#3a2a3e"); // sturdy front leg
  // right wide chair
  R(g, 278, 92, 4, 42, "#3a2a3e");
  R(g, 272, 94, 10, 12, "#4a3550");
  R(g, 263, 113, 19, 4, "#00e5ff");
  R(g, 262, 117, 21, 4, "#4a3550");
  R(g, 263, 121, 4, 13, "#3a2a3e");
  // heavy butcher-block dining table
  R(g, 210, 105, 58, 6, "#66496b");
  R(g, 210, 105, 58, 2, "#805e87");
  R(g, 215, 111, 5, 25, "#3a2a3e");
  R(g, 258, 111, 5, 25, "#3a2a3e");
  R(g, 228, 98, 12, 7, "#f43f5e"); // big fruit bowl
  R(g, 231, 95, 3, 3, "#4ade80");
  R(g, 247, 100, 6, 5, "#e8e6f7"); // coffee mug

  doorDraw(g, 289, "LIVING");
}

function dynKitchen(g: G, t: number, f: Flags) {
  const pht = getPhTime();
  windowDraw(g, 100, 14, 32, 38, 23, t, pht);
  windowBeamDraw(g, 100, 14, 32, 38, pht);
  applyRoomDaylight(g, pht.phase);

  // live Philippine time on microwave display
  R(g, 154, 52, 19, 9, "#0a0817");
  txt(g, pht.shortTime, 164, 54, "#4ade80", 1, true);

  // coffee steam above big espresso machine
  for (let i = 0; i < 3; i++) {
    const yy = 49 - ((t * 9 + i * 5) % 12);
    const xx = 55 + i * 4 + Math.sin(t * 3 + i) * 1.5;
    g.fillStyle = "rgba(220,220,255,0.5)";
    g.fillRect(Math.round(xx), Math.round(yy), 1, 2);
  }
  if (!f.pizzaTaken) drawSprite(g, "itemPizza", 80, 56);
  if (((t * 2) | 0) % 2 === 0) R(g, 66, 58, 3, 3, "#4ade80");
}

/* ============================================================
   BEDROOM — King/Queen Bed, XL Ergonomic Chair, Double Wardrobe
============================================================ */
function paintBedroom(g: G) {
  base(g, "#1d1a38", "#161330", "#2c2138", "#241a2e");
  windowDraw(g, 58, 14, 38, 38, 31);
  doorDraw(g, 10, "LIVING");

  // heavy king/queen bed with thick frame, plush mattress & twin plump pillows
  R(g, 44, 64, 9, 58, "#3a2a3e"); // solid tall headboard
  R(g, 44, 64, 9, 3, "#563e5c");
  R(g, 52, 86, 68, 28, "#8f8bb5"); // thick spring mattress
  R(g, 52, 93, 68, 21, "#5b54a6"); // quilted comforter
  R(g, 84, 93, 36, 21, "#4c468f"); // heavy blanket fold
  R(g, 54, 80, 22, 10, "#e8e6f7"); // plump king pillows
  R(g, 56, 82, 18, 6, "#d5d1f0");
  R(g, 116, 82, 7, 40, "#3a2a3e"); // solid footboard post
  R(g, 50, 112, 70, 6, "#2a2140"); // heavy bed frame rail

  // wide sturdy nightstand + big warm bedside lamp
  R(g, 124, 92, 20, 28, "#3a2a3e");
  R(g, 123, 90, 22, 3, "#563e5c");
  R(g, 126, 96, 16, 8, "#2a1f2e");
  R(g, 126, 107, 16, 8, "#2a1f2e");
  R(g, 132, 78, 4, 12, "#0f0c20");
  R(g, 127, 68, 14, 11, "#fbbf24");
  R(g, 125, 86, 7, 4, "#f471b5"); // Clean Code book coaster

  // wide heavy-duty developer desk + ultrawide monitor + beefy PC tower
  R(g, 147, 86, 67, 5, "#563e5c");
  R(g, 147, 86, 67, 2, "#6e5075");
  R(g, 149, 91, 13, 29, "#141126"); // full-tower workstation PC
  R(g, 192, 91, 21, 29, "#3a2a3e"); // wide 3-drawer chest
  [97, 105, 113].forEach((y) => {
    R(g, 194, y, 17, 1, "#241a2e");
    R(g, 200, y - 3, 5, 2, "#fbbf24");
  });
  R(g, 160, 52, 38, 30, "#0d0b1a"); // large 32" dev monitor at eye height
  R(g, 175, 82, 8, 5, "#0d0b1a");
  R(g, 165, 84, 26, 2, "#1c1a30");

  // XL heavy-duty wide ergonomic chair (28px wide, armrests + wide 5-star base)
  R(g, 165, 76, 24, 30, "#7c2d52"); // wide sculpted backrest
  R(g, 168, 74, 18, 12, "#943864"); // wide headrest cushion
  R(g, 161, 96, 4, 12, "#241d3d"); // thick left armrest
  R(g, 189, 96, 4, 12, "#241d3d"); // thick right armrest
  R(g, 163, 105, 28, 7, "#943864"); // extra-wide cushioned seat
  R(g, 174, 112, 6, 10, "#0f0c20"); // heavy steel gas cylinder
  R(g, 164, 122, 26, 3, "#0f0c20"); // wide 5-star wheel base
  [164, 176, 188].forEach((wx) => R(g, wx, 125, 3, 2, "#4a4390"));

  // tall heavy bookcase
  R(g, 217, 28, 30, 90, "#2a1f2e");
  const bc = ["#f471b5", "#22d3ee", "#4ade80", "#fbbf24", "#00e5ff", "#f43f5e", "#7dd3fc"];
  const br = seeded(17);
  for (let s = 0; s < 4; s++) {
    R(g, 219, 50 + s * 18, 26, 2, "#4a3550");
    let bx = 220;
    while (bx < 241) {
      const bw = 2 + Math.floor(br() * 3);
      R(g, bx, 38 + s * 18, bw, 12, bc[Math.floor(br() * bc.length)]);
      bx += bw + 1;
    }
  }

  // poster: retro sunset
  R(g, 250, 20, 30, 36, "#0a0817");
  R(g, 252, 22, 26, 32, "#1c1038");
  R(g, 259, 26, 12, 10, "#f59e0b");
  R(g, 259, 31, 12, 2, "#1c1038");
  R(g, 259, 35, 12, 1, "#1c1038");
  for (let i = 0; i < 5; i++) R(g, 252, 40 + i * 3, 26, 1, "#f471b5");
  txt(g, "MIDNIGHT", 265, 48, "#22d3ee", 1, true);

  // wide double-door wardrobe closet (35px wide, 84px tall)
  R(g, 283, 34, 35, 84, "#3a2a3e");
  R(g, 282, 32, 37, 4, "#563e5c");
  R(g, 300, 36, 2, 82, "#241a2e");
  R(g, 296, 74, 2, 8, "#fbbf24");
  R(g, 304, 74, 2, 8, "#fbbf24");
  R(g, 287, 40, 8, 8, "#fbbf24");
  txt(g, "!", 291, 42, "#b45309");

  // plush bedroom rug + discarded XL shirts pile
  R(g, 92, 140, 92, 24, "#27335c");
  R(g, 96, 144, 84, 16, "#2f3f6e");
  R(g, 124, 126, 26, 10, "#4c468f");
  R(g, 129, 122, 14, 6, "#f471b5");
  R(g, 136, 128, 11, 6, "#22d3ee");

  // hanging Polaroid fairy-light string + framed desk wall photos
  g.fillStyle = "#4a4390";
  for (let x = 106; x <= 156; x++) {
    const wy = 16 + Math.round(Math.sin(((x - 106) / 50) * Math.PI) * 3);
    g.fillRect(x, wy, 1, 1);
  }
  const p1 = polaroidDraw(g, 109, 18, 13, 16, "#fbbf24");
  R(g, p1.ix, p1.iy, p1.iw, p1.ih, "#241942");
  R(g, p1.ix + 3, p1.iy + 3, 5, 5, "#efe3cc"); // cream lynx-point Siamese selfie
  R(g, p1.ix + 3, p1.iy + 5, 5, 3, "#7a5946"); // tabby-striped mask
  R(g, p1.ix + 5, p1.iy + 5, 1, 1, "#3b2418"); // forehead M
  R(g, p1.ix + 4, p1.iy + 5, 1, 1, "#d9a441"); // amber eyes
  R(g, p1.ix + 6, p1.iy + 5, 1, 1, "#d9a441");

  const p2 = polaroidDraw(g, 125, 20, 13, 16, "#f471b5");
  R(g, p2.ix, p2.iy, p2.iw, p2.ih, "#0b1936");
  R(g, p2.ix + 2, p2.iy + 3, 7, 5, "#22d3ee");
  R(g, p2.ix + 3, p2.iy + 8, 5, 3, "#e8e6f7");

  const p3 = polaroidDraw(g, 141, 18, 13, 16, "#22d3ee");
  R(g, p3.ix, p3.iy, p3.iw, p3.ih, "#1e1238");
  R(g, p3.ix + 6, p3.iy + 2, 3, 3, "#fde68a");
  R(g, p3.ix + 1, p3.iy + 6, 9, 5, "#f471b5");

  const bf1 = photoFrame(g, 161, 14, 24, 19, { frame: "#5d422d", bevel: "#fbbf24" });
  R(g, bf1.ix, bf1.iy, bf1.iw, bf1.ih, "#0d1630");
  R(g, bf1.ix + 2, bf1.iy + 3, 6, 5, "#4ade80");
  R(g, bf1.ix + 10, bf1.iy + 3, 6, 5, "#22d3ee");
  R(g, bf1.ix, bf1.iy + 9, bf1.iw, 4, "#3a2a3e");
  photoGlare(g, bf1.ix, bf1.iy);

  const bf2 = photoFrame(g, 189, 17, 15, 19, { frame: "#4c2a6e", bevel: "#c4b5fd" });
  R(g, bf2.ix, bf2.iy, bf2.iw, bf2.ih, "#241942");
  R(g, bf2.ix + 3, bf2.iy + 1, 3, 2, "#0f0f14"); // black hair
  R(g, bf2.ix + 3, bf2.iy + 3, 3, 2, "#f0bd8f");
  R(g, bf2.ix + 1, bf2.iy + 5, 7, 5, "#f0bd8f"); // shirtless belly
  R(g, bf2.ix + 2, bf2.iy + 10, 5, 3, "#14141b"); // black shorts
  photoGlare(g, bf2.ix, bf2.iy);

  // LED dots along ceiling
  for (let x = 40; x < 316; x += 12) R(g, x, 6, 2, 2, "#00e5ff");
}

function dynBedroom(g: G, t: number) {
  const pht = getPhTime();
  windowDraw(g, 58, 14, 38, 38, 31, t, pht);
  windowBeamDraw(g, 58, 14, 38, 38, pht);
  applyRoomDaylight(g, pht.phase);

  for (let i = 0; i <= 5; i++) {
    const x = 107 + i * 10;
    const wy = 16 + Math.round(Math.sin((i / 5) * Math.PI) * 3);
    const warm = Math.sin(t * 2.6 + i * 1.4) > -0.2;
    R(g, x, wy + 1, 2, 2, warm ? "#fde68a" : "#b45309");
  }
  // ultrawide monitor code
  R(g, 163, 55, 32, 24, "#08130c");
  const cols = ["#4ade80", "#22d3ee", "#f471b5", "#fbbf24"];
  for (let i = 0; i < 5; i++) {
    const rnd = seeded(i * 31 + ((t * 1.4) | 0));
    const w = 6 + rnd() * 20;
    R(g, 165, 58 + i * 4, w, 2, cols[i % 4]);
  }
  const rgb = ["#f471b5", "#00e5ff", "#22d3ee", "#4ade80"][((t * 2) | 0) % 4];
  R(g, 151, 96, 2, 16, rgb);
  glow(g, 134, 74, 20, "#fbbf24", pht.phase === "day" ? 0.05 : 0.12);
  glow(g, 179, 67, 26, "#4ade80", 0.05);
}

/* ============================================================
   HALLWAY — Full-Width Doorways, Vault Door, Wide Roof Stairs
============================================================ */
function paintHallway(g: G) {
  base(g, "#171430", "#100e24", "#241c33", "#1c1528");
  R(g, 0, 82, 320, 3, "#2e2a55");


  doorDraw(g, 8, "LIVING");

  // wall clock 03:47
  R(g, 45, 20, 18, 18, "#0a0817");
  R(g, 47, 22, 14, 14, "#e8e6f7");
  R(g, 53, 23, 2, 2, "#14122b");
  R(g, 53, 33, 2, 2, "#14122b");
  R(g, 48, 28, 2, 2, "#14122b");
  R(g, 58, 28, 2, 2, "#14122b");
  R(g, 54, 28, 5, 1, "#14122b");
  R(g, 53, 24, 1, 5, "#f43f5e");
  R(g, 49, 26, 5, 1, "#f43f5e");

  // Abstract framed art, without lettering.
  R(g, 67, 18, 30, 38, "#7c2d52");
  R(g, 69, 20, 26, 34, "#943864");
  R(g, 74, 26, 16, 16, "#f471b5");
  R(g, 78, 30, 8, 8, "#fbbf24");
  R(g, 72, 46, 20, 2, "#d991b4");

  doorDraw(g, 105, "BATH");
  // small framed photos above bath door
  const hb1 = photoFrame(g, 107, 10, 12, 14, { frame: "#5d422d", bevel: "#fbbf24", wire: false });
  R(g, hb1.ix, hb1.iy, hb1.iw, hb1.ih, "#1e293b");
  R(g, hb1.ix + 1, hb1.iy + 2, 4, 4, "#94a3b8");
  const hb2 = photoFrame(g, 122, 12, 12, 14, { frame: "#5d422d", bevel: "#fbbf24", wire: false });
  R(g, hb2.ix, hb2.iy, hb2.iw, hb2.ih, "#31102f");
  R(g, hb2.ix + 1, hb2.iy + 2, 4, 4, "#f471b5");

  doorDraw(g, 143, "GAMES", "#4c2a6e");
  R(g, 140, 41, 34, 2, "#00e5ff");

  // corridor stepped photo gallery wall
  const hg1 = photoFrame(g, 179, 15, 16, 19, { frame: "#784c26", bevel: "#fde68a" });
  R(g, hg1.ix, hg1.iy, hg1.iw, hg1.ih, "#241934");
  R(g, hg1.ix + 2, hg1.iy + 2, 6, 5, "#d6d3d1");
  R(g, hg1.ix + 3, hg1.iy + 3, 4, 3, "#14532d");
  R(g, hg1.ix + 1, hg1.iy + 8, 8, 3, "#e7e5e4");
  R(g, hg1.ix, hg1.iy + 11, hg1.iw, 2, "#78350f");
  photoGlare(g, hg1.ix, hg1.iy);

  const hg2 = photoFrame(g, 197, 18, 15, 19, { frame: "#925f1b", bevel: "#fbbf24" });
  R(g, hg2.ix, hg2.iy, hg2.iw, hg2.ih, "#1e1b4b");
  R(g, hg2.ix + 2, hg2.iy + 3, 5, 5, "#efe3cc"); // cream lynx-point Siamese employee photo
  R(g, hg2.ix + 2, hg2.iy + 5, 5, 3, "#7a5946"); // tabby-striped mask
  R(g, hg2.ix + 4, hg2.iy + 5, 1, 1, "#3b2418"); // forehead M
  R(g, hg2.ix + 3, hg2.iy + 5, 1, 1, "#d9a441"); // amber eyes
  R(g, hg2.ix + 5, hg2.iy + 5, 1, 1, "#d9a441");
  R(g, hg2.ix + 4, hg2.iy + 9, 1, 3, "#f43f5e");
  photoGlare(g, hg2.ix, hg2.iy);

  const hg3 = photoFrame(g, 182, 41, 28, 20, { frame: "#5d422d", bevel: "#fbbf24" });
  R(g, hg3.ix, hg3.iy, hg3.iw, hg3.ih, "#171130");
  [2, 7, 12, 17].forEach((ox, idx) => {
    R(g, hg3.ix + ox + 1, hg3.iy + 4, 2, 2, "#f0bd8f");
    R(g, hg3.ix + ox, hg3.iy + 6, 4, 6, ["#00e5ff", "#22d3ee", "#f471b5", "#4ade80"][idx]);
  });
  photoGlare(g, hg3.ix, hg3.iy);

  // heavy hardware shipping cartons
  R(g, 180, 92, 32, 26, "#8a6432");
  R(g, 180, 92, 32, 4, "#a87c40");
  R(g, 195, 92, 2, 26, "#6e4f26");
  R(g, 185, 76, 22, 16, "#96702f");
  txt(g, "GPUS", 196, 102, "#5d4220", 1, true);

  // wide reinforced steel server door (34px frame / 28px steel vault leaf)
  R(g, 217, 44, 34, 74, "#0c0a1c");
  R(g, 220, 47, 28, 71, "#39406b");
  R(g, 224, 54, 20, 16, "#2a3050");
  for (let i = 0; i < 4; i++) R(g, 225, 76 + i * 5, 14, 2, "#232847");
  R(g, 220, 47, 28, 5, "#fbbf24");
  R(g, 241, 80, 5, 2, "#cbd5e1");
  txt(g, "SERVER", 234, 37, "#0a0817", 1, true);
  txt(g, "SERVER", 234, 36, "#fbbf24", 1, true);
  txt(g, "AUTH ONLY", 234, 111, "#f43f5e", 1, true);
  R(g, 253, 77, 6, 11, "#14122b");

  // wide stairs to roof
  for (let i = 0; i < 6; i++) {
    R(g, 262 + i * 9, 118 - i * 13, 60 - i * 9, 13, i % 2 ? "#262157" : "#2e2a55");
    R(g, 262 + i * 9, 118 - i * 13, 60 - i * 9, 2, "#4a4390");
  }
  R(g, 292, 12, 25, 28, "#070613");
  txt(g, "ROOF", 304, 43, "#0a0817", 1, true);
  txt(g, "ROOF", 304, 42, "#c9c3f5", 1, true);
  // ceiling light
  R(g, 148, 0, 24, 4, "#f5f0d8");
}

function dynHallway(g: G, t: number, f: Flags) {
  // Large circular portrait rug with a pink border.
  g.save();
  g.beginPath();
  g.arc(160, 151, 27, 0, Math.PI * 2);
  g.fillStyle = "#5c2144";
  g.fill();
  g.beginPath();
  g.arc(160, 151, 24, 0, Math.PI * 2);
  g.fillStyle = "#f471b5";
  g.fill();
  g.clip();
  if (hallwayRugImage.complete && hallwayRugImage.naturalWidth > 0) {
    // Render the portrait smoothly at the canvas's higher backing resolution.
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(hallwayRugImage, 196, 42, 520, 520, 136, 127, 48, 48);
  }
  g.restore();
  const pht = getPhTime();
  const pal = SKY_PALETTES[pht.phase];

  // live analog wall clock hands synced to Asia/Manila (center = 54, 29)
  R(g, 47, 22, 14, 14, "#e8e6f7");
  R(g, 53, 23, 2, 1, "#14122b");
  R(g, 53, 34, 2, 1, "#14122b");
  R(g, 48, 28, 1, 2, "#14122b");
  R(g, 59, 28, 1, 2, "#14122b");
  const hAngle = (((pht.hour24 % 12) + pht.minute / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const mAngle = (pht.minute / 60) * Math.PI * 2 - Math.PI / 2;
  for (let r = 1; r <= 3.6; r += 0.9) {
    R(g, 54 + Math.cos(hAngle) * r, 29 + Math.sin(hAngle) * r, 1, 1, "#14122b");
  }
  for (let r = 1; r <= 5.2; r += 0.9) {
    R(g, 54 + Math.cos(mAngle) * r, 29 + Math.sin(mAngle) * r, 1, 1, "#f43f5e");
  }
  R(g, 54, 29, 1, 1, "#14122b");

  // live Philippine sky at the open ROOF stairwell hatch + sunlight/moonlight shaft down the stairs
  R(g, 292, 12, 25, 9, pal.top);
  R(g, 292, 21, 25, 10, pal.mid);
  R(g, 292, 31, 25, 9, pal.low);
  if (pht.phase === "day") {
    R(g, 307, 16, 6, 6, "#fde047");
  } else if (pht.phase === "night") {
    R(g, 296, 16, 1, 1, "#fff");
    R(g, 309, 22, 1, 1, "#fff");
  }
  g.save();
  g.globalAlpha = pal.beamAlpha * 1.15;
  g.fillStyle = pal.beam;
  g.beginPath();
  g.moveTo(292, 40);
  g.lineTo(317, 40);
  g.lineTo(295, 118);
  g.lineTo(264, 118);
  g.fill();
  g.restore();

  glow(g, 160, 6, 32, "#f5f0d8", 0.07);
  glow(g, 157, 42, 14, "#00e5ff", 0.14);
  if (f.serverUnlocked) R(g, 255, 79, 2, 2, "#4ade80");
  else if (((t * 1.6) | 0) % 2 === 0) R(g, 255, 79, 2, 2, "#f43f5e");
  else R(g, 255, 79, 2, 2, "#5c1626");
}

/* ============================================================
   SERVER ROOM — 42U Racks, Widescreen Console & Heavy Swivel Chair
============================================================ */
const RACK_X = [44, 76, 108];
function paintServer(g: G) {
  R(g, 0, 0, 320, 180, "#0d1024");
  R(g, 0, 112, 320, 6, "#05060f");
  for (let x = 0; x < 320; x += 16) R(g, x, 118, 1, 62, "#161a33");
  [131, 146, 162].forEach((y) => R(g, 0, y, 320, 1, "#161a33"));
  R(g, 0, 121, 320, 1, "#164e63");

  doorDraw(g, 8, "HALL", "#39406b");

  // overhead cable tray
  R(g, 40, 16, 212, 3, "#232850");
  R(g, 40, 19, 212, 1, "#f471b5");
  R(g, 40, 21, 212, 1, "#22d3ee");

  // 42U full-height server racks
  RACK_X.forEach((x) => {
    R(g, x, 26, 29, 92, "#161a33");
    R(g, x, 26, 29, 4, "#232850");
    for (let u = 0; u < 8; u++) {
      R(g, x + 3, 35 + u * 10, 23, 8, "#1c2142");
      R(g, x + 5, 38 + u * 10, 9, 1, "#0a0c1e");
    }
  });

  // wide industrial server console desk + heavy-duty wide operator chair
  R(g, 150, 88, 64, 5, "#2b3363");
  R(g, 152, 93, 4, 25, "#141830");
  R(g, 208, 93, 4, 25, "#141830");
  R(g, 158, 48, 48, 36, "#05060f");
  R(g, 178, 84, 8, 4, "#05060f");
  R(g, 166, 86, 32, 2, "#141830");

  // reinforced wide swivel task chair (replaces tiny stick stool!)
  R(g, 170, 92, 24, 15, "#2b3363"); // wide lumbar backrest
  R(g, 167, 104, 30, 7, "#39406b"); // wide cushioned seat
  R(g, 179, 111, 6, 8, "#141830"); // heavy steel post
  R(g, 170, 119, 24, 3, "#141830"); // wide 5-wheel base
  [170, 181, 191].forEach((wx) => R(g, wx, 122, 3, 2, "#4a4390"));

  // floor cables
  g.fillStyle = "#f471b5";
  for (let x = 60; x < 170; x += 3) g.fillRect(x, 127 + Math.sin(x * 0.2) * 2, 2, 1);
  g.fillStyle = "#22d3ee";
  for (let x = 80; x < 180; x += 3) g.fillRect(x, 132 + Math.cos(x * 0.17) * 2, 2, 1);

  // whiteboard
  R(g, 218, 24, 52, 48, "#8f8bb5");
  R(g, 220, 26, 48, 44, "#c9cbe8");
  // A simple diagram rather than a written quote.
  R(g, 226, 35, 9, 7, "#77a9cc");
  R(g, 251, 35, 9, 7, "#77a9cc");
  R(g, 237, 37, 12, 2, "#77a9cc");
  R(g, 238, 48, 10, 7, "#a095c5");
  R(g, 242, 42, 2, 6, "#77a9cc");

  // wide industrial AC unit
  R(g, 274, 20, 38, 22, "#39406b");
  for (let i = 0; i < 3; i++) R(g, 277, 27 + i * 4, 32, 2, "#232847");
  R(g, 305, 38, 4, 2, "#22d3ee");

  // framed "PROD v0.1" duct-taped Raspberry Pi photo
  const sf = photoFrame(g, 277, 54, 32, 28, { frame: "#475569", bevel: "#cbd5e1", mat: "#dce4f2", wire: false });
  R(g, sf.ix, sf.iy, sf.iw, sf.ih, "#1e293b");
  R(g, sf.ix + 5, sf.iy + 5, 15, 12, "#15803d");
  R(g, sf.ix + 6, sf.iy + 6, 2, 2, "#f43f5e");
  R(g, sf.ix + 13, sf.iy + 13, 2, 2, "#4ade80");
  g.strokeStyle = "#94a3b8";
  g.beginPath();
  g.moveTo(sf.ix + 4, sf.iy + 3);
  g.lineTo(sf.ix + 20, sf.iy + 19);
  g.moveTo(sf.ix + 20, sf.iy + 3);
  g.lineTo(sf.ix + 4, sf.iy + 19);
  g.stroke();
  photoGlare(g, sf.ix, sf.iy);

  // full-size commercial fire extinguisher
  R(g, 139, 96, 8, 20, "#dc2626");
  R(g, 141, 91, 4, 5, "#8f8bb5");
  txt(g, "DO NOT UNPLUG", 244, 100, "#f43f5e", 1, true);
}

function dynServer(g: G, t: number) {
  const cols = ["#4ade80", "#22d3ee", "#fbbf24", "#4ade80", "#22d3ee"];
  RACK_X.forEach((x, ri) => {
    for (let i = 0; i < 16; i++) {
      const rnd = seeded(ri * 100 + i * 7 + ((t * (1 + (i % 3) * 0.7)) | 0) * 13);
      if (rnd() > 0.35) {
        R(g, x + 18 + (i % 3) * 3, 36 + ((i / 2) | 0) * 10 + (i % 2) * 3, 2, 2, cols[(rnd() * 5) | 0]);
      }
    }
  });
  R(g, 161, 51, 42, 30, "#04140a");
  for (let i = 0; i < 7; i++) {
    const rnd = seeded(i * 17 + ((t * 2.2) | 0));
    R(g, 163, 53 + i * 4, 8 + rnd() * 28, 2, i % 3 === 0 ? "#22d3ee" : "#4ade80");
  }
  if (((t * 2) | 0) % 2 === 0) R(g, 163, 77, 5, 2, "#4ade80");
  glow(g, 182, 66, 32, "#22d3ee", 0.06);
  g.fillStyle = "rgba(165,196,255,0.35)";
  for (let i = 0; i < 5; i++) {
    const yy = 44 + ((t * 14 + i * 6) % 20);
    g.fillRect(280 + i * 6, Math.round(yy), 3, 1);
  }
}

/* ============================================================
   BATHROOM — Deep Wide Soaking Tub, Real-Scale Wide Toilet,
              Lowered Eye-Level Mirror & Counter-Height Washer
============================================================ */
function paintBathroom(g: G) {
  R(g, 0, 0, 320, 180, "#274b57");
  g.fillStyle = "rgba(0,0,0,0.18)";
  for (let x = 0; x < 320; x += 12) g.fillRect(x, 0, 1, 118);
  for (let y = 0; y < 118; y += 12) g.fillRect(0, y, 320, 1);
  R(g, 0, 112, 320, 6, "#0a0817");
  checker(g, 118, "#2a4f5c", "#1d3a44", 10);

  // frosted window
  R(g, 16, 12, 36, 30, "#120e26");
  R(g, 19, 15, 30, 24, "#7dd3fc");
  R(g, 19, 15, 30, 10, "#a5dff9");
  R(g, 33, 15, 2, 24, "#120e26");

  // ornate gold-framed duck portrait on tile wall above bathtub
  const df = photoFrame(g, 62, 18, 26, 31, { frame: "#a16207", bevel: "#fef08a", mat: "#fef3c7" });
  R(g, df.ix, df.iy, df.iw, df.ih, "#0f2942");
  R(g, df.ix, df.iy + 17, df.iw, 8, "#0284c7");
  R(g, df.ix + 6, df.iy + 5, 6, 5, "#fbbf24");
  R(g, df.ix + 11, df.iy + 7, 3, 2, "#f97316");
  R(g, df.ix + 8, df.iy + 6, 2, 2, "#fde68a");
  R(g, df.ix + 5, df.iy + 10, 8, 2, "#ffffff");
  R(g, df.ix + 4, df.iy + 12, 10, 5, "#f59e0b");
  photoGlare(g, df.ix, df.iy);

  // companion seaside sailboat frame
  const sfB = photoFrame(g, 263, 22, 19, 22, { frame: "#5d422d", bevel: "#7dd3fc" });
  R(g, sfB.ix, sfB.iy, sfB.iw, sfB.ih, "#1e3a8a");
  R(g, sfB.ix + 5, sfB.iy + 3, 4, 6, "#f8fafc");
  R(g, sfB.ix + 3, sfB.iy + 9, 8, 2, "#b45309");
  R(g, sfB.ix, sfB.iy + 11, sfB.iw, 5, "#38bdf8");
  photoGlare(g, sfB.ix, sfB.iy);

  // extra-wide deep soaking bathtub (84px wide, deep tub body, overhead rainfall shower)
  R(g, 8, 90, 84, 31, "#aebfe8");
  R(g, 6, 88, 88, 6, "#dbe4fa"); // wide rolled comfort rim
  R(g, 13, 94, 74, 7, "#274b8f"); // deep warm water
  R(g, 15, 119, 6, 5, "#8f8bb5"); // heavy claw/block feet
  R(g, 79, 119, 6, 5, "#8f8bb5");
  R(g, 12, 42, 3, 46, "#8f8bb5"); // tall shower riser pipe
  R(g, 12, 42, 14, 3, "#8f8bb5");
  R(g, 20, 45, 10, 4, "#dbe4fa"); // wide rainfall head
  R(g, 84, 80, 3, 8, "#8f8bb5");
  R(g, 79, 80, 8, 3, "#8f8bb5");

  // real-scale comfort-height wide toilet (y = 85..121 = 36px tall, wide 24px bowl!)
  R(g, 99, 85, 22, 15, "#dbe4fa"); // low-profile wide tank (below chest height!)
  R(g, 98, 84, 24, 3, "#f1f5f9"); // tank lid
  R(g, 100, 88, 5, 2, "#8f8bb5"); // chrome flush lever
  R(g, 97, 100, 26, 5, "#f1f5f9"); // wide 26px comfort seat
  R(g, 99, 105, 22, 8, "#dbe4fa"); // wide contoured bowl
  R(g, 103, 113, 14, 8, "#aebfe8"); // sturdy porcelain base
  R(g, 125, 92, 6, 8, "#e8e6f7"); // wall toilet paper roll

  // wide bathroom vanity + lowered large eye-level mirror (y = 32..80)
  R(g, 134, 90, 44, 30, "#3a2a3e");
  R(g, 137, 94, 18, 22, "#2a1f2e");
  R(g, 157, 94, 18, 22, "#2a1f2e");
  R(g, 131, 85, 50, 6, "#dbe4fa"); // wide porcelain sink top
  R(g, 144, 86, 24, 4, "#aebfe8");
  R(g, 154, 77, 3, 8, "#8f8bb5");
  R(g, 136, 32, 40, 44, "#120e26"); // wide mirror right at Cipher Chris's head/chest height!
  R(g, 139, 35, 34, 38, "#35506e");
  R(g, 144, 38, 7, 28, "rgba(255,255,255,0.14)");

  // plush XL bath sheet + hand towel
  R(g, 181, 46, 35, 3, "#8f8bb5");
  R(g, 184, 49, 16, 36, "#00e5ff"); // wide XL bath sheet!
  R(g, 184, 79, 16, 3, "#0096c7");
  R(g, 203, 49, 10, 26, "#f471b5");

  // counter-height wide front-load washing machine (38px wide x 46px tall, y = 72..118)
  R(g, 220, 72, 38, 46, "#57628a");
  R(g, 219, 70, 40, 4, "#7582ad"); // top counter surface
  R(g, 220, 74, 38, 8, "#39406b");
  g.fillStyle = "#1c2238";
  g.beginPath();
  g.arc(239, 98, 13, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#274b8f";
  g.beginPath();
  g.arc(239, 98, 10, 0, Math.PI * 2);
  g.fill();
  R(g, 224, 76, 4, 4, "#4ade80");
  R(g, 245, 76, 8, 4, "#14122b");
  txt(g, "3:47", 249, 76, "#22d3ee", 1, true);

  // wide laundry hamper
  R(g, 261, 96, 23, 22, "#39406b");
  R(g, 263, 91, 10, 7, "#00e5ff");
  R(g, 272, 92, 9, 6, "#f471b5");

  // plush wide bath mat
  R(g, 26, 136, 54, 14, "#164e63");
  R(g, 30, 139, 46, 1, "#27728a");
  R(g, 30, 147, 46, 1, "#27728a");

  doorDraw(g, 289, "HALL");
}

function dynBathroom(g: G, t: number, f: Flags) {
  const pht = getPhTime();
  // frosted glass window reacts to Philippine time
  const frostCols: Record<TimePhase, [string, string]> = {
    dawn: ["#fda4af", "#fde68a"],
    day: ["#e0f2fe", "#fef9c3"],
    dusk: ["#f472b6", "#fdba74"],
    night: ["#38bdf8", "#0284c7"],
  };
  const [fcTop, fcBot] = frostCols[pht.phase];
  R(g, 19, 15, 30, 11, fcTop);
  R(g, 19, 26, 30, 13, fcBot);
  R(g, 33, 15, 2, 24, "#120e26");
  windowBeamDraw(g, 19, 15, 30, 24, pht);
  applyRoomDaylight(g, pht.phase);

  // live Philippine time on front-load washer LED screen
  R(g, 235, 75, 21, 6, "#14122b");
  txt(g, pht.shortTime, 246, 76, "#22d3ee", 1, true);

  g.fillStyle = "rgba(165,196,255,0.5)";
  for (let i = 0; i < 6; i++) {
    const x = 18 + ((i * 13 + t * 8) % 60);
    g.fillRect(Math.round(x), 97 + (i % 3), 5, 1);
  }
  if (!f.duckTaken) {
    const bob = Math.round(Math.sin(t * 2.2) * 1.2);
    drawSprite(g, "duck", 60, 88 + bob);
  }
  const drip = (t * 22) % 26;
  if (drip < 7) R(g, 155, 86 + drip * 1.3, 1, 2, "#7dd3fc");
  const a = t * 2.4;
  R(g, 239 + Math.cos(a) * 5 - 2, 98 + Math.sin(a) * 5 - 2, 5, 5, "#00e5ff");
  R(g, 239 + Math.cos(a + 2.4) * 5 - 2, 98 + Math.sin(a + 2.4) * 5 - 2, 4, 4, "#7dd3fc");
}

/* ============================================================
   GAME ROOM — Full-Width Arcade Cabinets, XL Gaming Throne & Giant Beanbag
============================================================ */
function paintGameroom(g: G) {
  base(g, "#1c1440", "#150f30", "#241a3d", "#1c142e");
  doorDraw(g, 8, "HALL");

  // hex wall light panels above arcade machines
  [[48, 12], [62, 12], [55, 22]].forEach(([x, y]) => R(g, x, y, 12, 8, "#3b2a6e"));

  // wide arcade cabinet 1 (working, 34px wide, control deck at hand level y = 82)
  R(g, 44, 42, 34, 76, "#4c2a6e");
  R(g, 43, 42, 36, 10, "#f471b5");
  txt(g, "TURBO", 61, 45, "#fff", 1, true);
  R(g, 49, 55, 24, 23, "#05060f"); // eye-level CRT screen
  R(g, 45, 81, 32, 7, "#2a1a45"); // wide control deck
  R(g, 52, 76, 2, 6, "#f43f5e");
  R(g, 51, 74, 4, 3, "#f43f5e");
  R(g, 62, 83, 3, 3, "#fbbf24");
  R(g, 67, 83, 3, 3, "#22d3ee");
  R(g, 57, 94, 8, 10, "#14122b");
  R(g, 60, 97, 2, 4, "#fbbf24"); // coin slot

  // wide arcade cabinet 2 (broken, 34px wide)
  R(g, 82, 42, 34, 76, "#2a2242");
  R(g, 81, 42, 36, 10, "#3b3670");
  txt(g, "STACK", 99, 45, "#9d97c9", 1, true);
  R(g, 87, 55, 24, 23, "#0a0a14");
  R(g, 91, 61, 16, 11, "#e8e6f7");
  txt(g, "OUT", 99, 63, "#b91c1c", 1, true);
  txt(g, "OF ORDER", 99, 68, "#b91c1c", 1, true);
  R(g, 83, 81, 32, 7, "#1c1836");

  // 3 neon-accented framed LAN & arcade photos above the triple monitors
  const gf1 = photoFrame(g, 124, 15, 22, 21, { frame: "#4c2a6e", bevel: "#f471b5" });
  R(g, gf1.ix, gf1.iy, gf1.iw, gf1.ih, "#120c2b");
  R(g, gf1.ix + 2, gf1.iy + 4, 5, 5, "#4ade80");
  R(g, gf1.ix + 9, gf1.iy + 4, 5, 5, "#22d3ee");
  R(g, gf1.ix, gf1.iy + 10, gf1.iw, 5, "#5d4361");
  photoGlare(g, gf1.ix, gf1.iy);

  const gf2 = photoFrame(g, 150, 12, 25, 23, { frame: "#925f1b", bevel: "#fde68a", mat: "#fef3c7" });
  R(g, gf2.ix, gf2.iy, gf2.iw, gf2.ih, "#090d24");
  R(g, gf2.ix + 3, gf2.iy + 2, 13, 13, "#4c2a6e");
  R(g, gf2.ix + 5, gf2.iy + 4, 9, 6, "#05060f");
  R(g, gf2.ix + 6, gf2.iy + 6, 7, 2, "#fbbf24");
  photoGlare(g, gf2.ix, gf2.iy);

  const gf3 = photoFrame(g, 179, 16, 21, 20, { frame: "#1e3a5f", bevel: "#22d3ee" });
  R(g, gf3.ix, gf3.iy, gf3.iw, gf3.ih, "#0f1029");
  R(g, gf3.ix + 2, gf3.iy + 3, 4, 9, "#f471b5");
  R(g, gf3.ix + 9, gf3.iy + 4, 4, 8, "#22d3ee");
  photoGlare(g, gf3.ix, gf3.iy);

  // wide triple-monitor gaming desk (82px wide!)
  R(g, 122, 88, 82, 5, "#2b1d4d");
  R(g, 125, 93, 4, 25, "#150f30");
  R(g, 197, 93, 4, 25, "#150f30");
  R(g, 124, 55, 23, 28, "#05060f");
  R(g, 149, 49, 30, 34, "#05060f");
  R(g, 181, 55, 22, 28, "#05060f");
  R(g, 126, 57, 19, 24, "#0b1e3a");
  R(g, 183, 57, 18, 24, "#14092b");
  R(g, 148, 84, 32, 3, "#14122b");

  // XL wide-body heavy-duty gaming throne (32px wide, thick armrests + 28px base!)
  R(g, 151, 74, 26, 36, "#7c2d52");
  R(g, 154, 68, 20, 12, "#943864");
  R(g, 147, 94, 4, 14, "#1f183b"); // sturdy left armrest
  R(g, 177, 94, 4, 14, "#1f183b"); // sturdy right armrest
  R(g, 149, 106, 30, 8, "#943864"); // deep wide cushion
  R(g, 161, 114, 6, 8, "#0f0c20"); // heavy steel piston
  R(g, 150, 122, 28, 3, "#0f0c20"); // wide 5-caster base
  [150, 163, 175].forEach((wx) => R(g, wx, 125, 3, 2, "#4a4390"));
  txt(g, "GG", 164, 88, "#fbbf24", 1, true);

  // trophy shelf
  R(g, 208, 54, 50, 3, "#4a3550");
  drawSprite(g, "trophy", 213, 44);
  drawSprite(g, "trophy", 231, 44);
  R(g, 246, 46, 8, 8, "#22d3ee");
  R(g, 248, 42, 4, 4, "#f471b5");

  // wide CRT TV + retro console credenza
  R(g, 208, 92, 48, 26, "#241840");
  R(g, 212, 65, 32, 27, "#3b3670");
  R(g, 215, 68, 26, 21, "#0f2b1d");
  R(g, 219, 73, 7, 7, "#4ade80");
  R(g, 246, 84, 14, 8, "#14122b");
  R(g, 251, 80, 4, 4, "#f43f5e");

  // posters: space invader and abstract art
  R(g, 265, 18, 20, 24, "#0a0817");
  const inv = ["#.......#", ".#.....#.", "#########", "##.###.##", "#########", "..##.##..", ".##...##.", "#.#...#.#"];
  g.fillStyle = "#4ade80";
  inv.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === "#") g.fillRect(267 + x * 2, 22 + y * 2, 2, 2);
  });
  R(g, 288, 18, 22, 24, "#7c2d52");
  R(g, 290, 20, 18, 20, "#943864");
  R(g, 295, 24, 8, 8, "#fbbf24");
  R(g, 293, 34, 12, 2, "#f471b5");

  // giant XL plush beanbag lounger (50px wide x 28px deep!)
  R(g, 270, 98, 28, 12, "#a84574"); // plush backrest bolster
  R(g, 264, 106, 44, 14, "#943864"); // wide squishy upper body
  R(g, 260, 114, 52, 13, "#7c2d52"); // massive wide base
}

function dynGameroom(g: G, t: number) {
  const hues = ["#f471b5", "#00e5ff", "#22d3ee", "#4ade80", "#fbbf24"];
  for (let x = 0; x < 320; x += 8) {
    R(g, x, 4, 6, 2, hues[(((x / 8) | 0) + ((t * 2) | 0)) % hues.length]);
  }
  R(g, 51, 57, 20, 19, "#070a1a");
  const bx = 53 + Math.abs(Math.sin(t * 1.7)) * 11;
  R(g, bx, 60, 5, 4, "#4ade80");
  R(g, 58 + Math.sin(t * 3) * 4, 72, 5, 2, "#22d3ee");
  if (((t * 3) | 0) % 2) R(g, 60 + Math.sin(t * 3) * 4, 66, 1, 5, "#fbbf24");
  glow(g, 61, 66, 18, "#f471b5", 0.1);
  R(g, 152, 52, 24, 28, "#0a1430");
  const rnd = seeded((t * 3) | 0);
  for (let i = 0; i < 6; i++) R(g, 154, 54 + i * 4, 5 + rnd() * 16, 2, ["#22d3ee", "#f471b5", "#4ade80"][i % 3]);
  glow(g, 164, 66, 28, "#22d3ee", 0.05);
  for (let i = 0; i < 9; i++) R(g, 150 + i * 3, 85, 2, 1, hues[(i + ((t * 4) | 0)) % hues.length]);
}

/* ============================================================
   ROOFTOP — Live Philippine Sky (Dawn / Tropical Day / Manila Sunset / Night)
============================================================ */
const ROOF_BUILDINGS: [number, number, number][] = [
  [0, 26, 84], [28, 18, 70], [48, 30, 92], [80, 16, 64], [98, 24, 80],
  [124, 20, 58], [146, 28, 88], [176, 16, 68], [194, 26, 78], [222, 18, 60],
  [242, 30, 90], [274, 20, 72], [296, 24, 84],
];

function drawRooftopWorld(g: G, t: number, pht: PhTimeInfo) {
  const pal = SKY_PALETTES[pht.phase];
  const isDay = pht.phase === "day";
  const isNight = pht.phase === "night";

  // 1) Philippine sky bands
  R(g, 0, 0, 320, 38, pal.top);
  R(g, 0, 38, 320, 34, pal.mid);
  R(g, 0, 72, 320, 34, pal.low);

  // 2) Celestial bodies, stars, clouds & birds by Philippine time phase
  if (isNight) {
    const sr = seeded(99);
    g.fillStyle = "#c9c3f5";
    for (let i = 0; i < 65; i++) g.fillRect(sr() * 320, sr() * 78, 1, 1);
    const tw = seeded(1234);
    for (let i = 0; i < 14; i++) {
      const sx = tw() * 320, sy = tw() * 70;
      if (Math.sin(t * 2 + i * 1.7) > 0.4) R(g, sx, sy, 1, 1, "#fff");
    }
    // shooting star
    const cyc = t % 13;
    if (cyc < 0.7) {
      const sx = 40 + cyc * 160, sy = 10 + cyc * 36;
      g.fillStyle = "#fff";
      for (let i = 0; i < 6; i++) g.fillRect(Math.round(sx - i * 3), Math.round(sy - i * 1.4), 2, 1);
    }
    // full cratered moon
    glow(g, 272, 30, 42, "#f5f0d8", 0.08);
    g.fillStyle = "#f5f0d8";
    g.beginPath();
    g.arc(272, 30, 15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ddd5b8";
    g.beginPath();
    g.arc(266, 25, 3, 0, Math.PI * 2);
    g.arc(278, 36, 2, 0, Math.PI * 2);
    g.fill();
  } else if (isDay) {
    // radiant Philippine tropical sun + animated rays
    const sunX = 270, sunY = 27;
    glow(g, sunX, sunY, 54, "#fef08a", 0.16);
    g.fillStyle = "#fef08a";
    g.beginPath();
    g.arc(sunX, sunY, 15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#facc15";
    g.beginPath();
    g.arc(sunX, sunY, 12, 0, Math.PI * 2);
    g.fill();
    for (let r = 0; r < 8; r++) {
      const ang = (r / 8) * Math.PI * 2 + ((t * 0.6) % (Math.PI * 2));
      R(g, sunX + Math.cos(ang) * 18 - 1, sunY + Math.sin(ang) * 18 - 1, 2, 2, "#fef9c3");
    }
    // tiny flapping tropical birds gliding across the skyline
    for (let b = 0; b < 3; b++) {
      const bx = ((b * 96 + t * 14) % 340) - 10;
      const by = 34 + b * 8 + Math.sin(t * 4 + b) * 2;
      const wingUp = ((t * 6 + b) | 0) % 2 === 0;
      R(g, bx, by, 2, 1, "#1e293b");
      R(g, bx - 2, wingUp ? by - 1 : by + 1, 2, 1, "#1e293b");
      R(g, bx + 2, wingUp ? by - 1 : by + 1, 2, 1, "#1e293b");
    }
  } else if (pht.phase === "dawn") {
    // rising morning sun + soft rose clouds + fading stars
    const sunX = 270, sunY = 44;
    glow(g, sunX, sunY, 52, "#fde68a", 0.16);
    g.fillStyle = "#fde68a";
    g.beginPath();
    g.arc(sunX, sunY, 14, 0, Math.PI * 2);
    g.fill();
  } else {
    // famous Manila Bay fiery golden-crimson sunset!
    const sunX = 270, sunY = 46;
    glow(g, sunX, sunY, 58, "#fb923c", 0.2);
    g.fillStyle = "#fbbf24";
    g.beginPath();
    g.arc(sunX, sunY, 15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ef4444";
    g.beginPath();
    g.arc(sunX, sunY + 3, 12, 0, Math.PI * 2);
    g.fill();
  }

  // Drifting cloud layers reflect the current cloud-cover percentage.
  const clouds = cloudStyle(pht.phase);
  const cloudCount = clouds.coverage < 10 ? 0 : clouds.coverage < 35 ? 3 : clouds.coverage < 65 ? 8 : clouds.coverage < 85 ? 15 : 24;
  for (let c = 0; c < cloudCount; c++) {
    const cx = (((c * 47 + t * windDrift(getLiveWeather()) * (0.7 + (c % 3) * 0.15)) % 350 + 350) % 350) - 15;
    const cy = 7 + (c % 4) * 13;
    drawPixelCloud(g, cx, cy, clouds.color, clouds.shade);
    drawPixelCloud(g, cx + 9, cy + 2, clouds.color, clouds.shade);
  }

  // 3) Metro Manila skyline buildings (sunlit slate/glass by day, lit windows at dusk/night)
  const wr = seeded(7);
  ROOF_BUILDINGS.forEach(([x, w, top], bi) => {
    const bodyCol = isDay ? (bi % 2 === 0 ? "#334155" : "#475569") : pal.bldg;
    R(g, x, top, w, 112 - top, bodyCol);
    if (isDay) R(g, x, top, w, 2, "#94a3b8"); // sunlit roof edge
    for (let wy = top + 5; wy < 104; wy += 6) {
      for (let wx = x + 3; wx < x + w - 3; wx += 5) {
        const roll = wr();
        if (isDay) {
          R(g, wx, wy, 2, 3, roll > 0.5 ? "#bae6fd" : "#64748b");
        } else if (roll > (pht.phase === "dawn" ? 0.72 : 0.55)) {
          R(g, wx, wy, 2, 2, roll > 0.3 ? pal.winA : pal.winB);
        }
      }
    }
  });
  if (!isDay && Math.sin(t * 9) > 0.6) R(g, 155, 96, 2, 2, "#fbbf24");

  // 4) Sturdy brick parapet wall & rooftop deck floor
  R(g, 0, 104, 320, 4, isDay ? "#645382" : "#3a2c55");
  R(g, 0, 108, 320, 18, isDay ? "#4a3b63" : "#2c2140");
  g.fillStyle = "rgba(0,0,0,0.24)";
  [114, 120].forEach((y) => g.fillRect(0, y, 320, 1));
  for (let x = 8; x < 320; x += 16) g.fillRect(x, 108, 1, 6);
  for (let x = 0; x < 320; x += 16) g.fillRect(x, 115, 1, 5);
  for (let x = 8; x < 320; x += 16) g.fillRect(x, 121, 1, 5);

  R(g, 0, 126, 320, 54, isDay ? "#332e4f" : pht.phase === "dusk" ? "#291e3d" : "#1f1b33");
  [138, 152, 166].forEach((y) => R(g, 0, y, 320, 1, isDay ? "#262140" : "#171430"));
  for (let x = 40; x < 320; x += 56) R(g, x, 126, 1, 54, isDay ? "#262140" : "#171430");

  // sky-reflecting rooftop puddle
  R(g, 198, 152, 34, 6, isDay ? "#38bdf8" : pht.phase === "dusk" ? "#c026d3" : "#2a3260");
  R(g, 206, 154, 18, 2, isDay ? "#e0f2fe" : pht.phase === "dusk" ? "#fde047" : "#4a5aa8");

  // wide stair bulkhead + 28px doorway
  R(g, 3, 44, 54, 82, isDay ? "#352c57" : "#241d3d");
  R(g, 1, 40, 58, 6, "#171230");
  R(g, 9, 57, 34, 69, "#171230");
  R(g, 12, 60, 28, 66, "#3d2b4f");
  R(g, 33, 91, 5, 2, "#fbbf24");
  R(g, 45, 52, 9, 10, isDay ? "#94a3b8" : "#fbbf24");
  R(g, 49, 52, 2, 10, "#171230");
  txt(g, "DOWN", 26, 50, "#0a0817", 1, true);
  txt(g, "DOWN", 26, 49, "#c9c3f5", 1, true);

  // antenna mast + guy wires + aviation beacon
  R(g, 69, 16, 3, 92, "#4a4390");
  [26, 40, 54].forEach((y, i) => R(g, 62 - i * 2, y, 16 + i * 4, 2, "#4a4390"));
  g.strokeStyle = "#2e2a55";
  g.beginPath();
  g.moveTo(70, 30);
  g.lineTo(54, 106);
  g.moveTo(70, 30);
  g.lineTo(94, 106);
  g.stroke();
  if (!isDay && ((t * 1.2) | 0) % 2 === 0) {
    R(g, 68, 13, 5, 3, "#f43f5e");
    glow(g, 70, 14, 10, "#f43f5e", 0.25);
  } else {
    R(g, 68, 13, 5, 3, "#7f1d1d");
  }

  // overhead string lights wire + bulbs (glowing at dusk/night, unlit glass bulbs by day)
  g.fillStyle = "#2e2a55";
  for (let i = 0; i <= 40; i++) {
    const x = 71 + i * 5.6;
    const y = 20 + Math.sin((i / 40) * Math.PI) * 14 + i * 0.35;
    g.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  const cols = ["#fbbf24", "#f471b5", "#22d3ee", "#fbbf24"];
  for (let i = 0; i <= 10; i++) {
    const x = 71 + i * 22.4;
    const y = 21 + Math.sin((i / 10) * Math.PI) * 14 + i * 1.4;
    const c = isDay ? "#cbd5e1" : cols[(i + ((t * 1.5) | 0)) % cols.length];
    R(g, Math.round(x), Math.round(y) + 1, 2, 2, c);
  }
  R(g, 298, 30, 3, 76, "#4a4390");

  // heavy rooftop HVAC vent unit
  R(g, 82, 96, 30, 30, "#39406b");
  g.strokeStyle = "#232847";
  g.beginPath();
  g.arc(97, 111, 9, 0, Math.PI * 2);
  g.stroke();

  // full-height brass stargazing telescope + large rooftop satellite dish
  drawSprite(g, "telescope", 116, 111);
  R(g, 184, 96, 4, 14, "#4a4390");
  drawSprite(g, "dish", 174, 82);

  // Front-facing lounge chair: the cushion and arms frame the seated sprite.
  R(g, 216, 104, 32, 25, "#8f8bb5"); // chair frame and back
  R(g, 218, 106, 28, 22, "#b93478");
  R(g, 220, 108, 24, 19, "#d6458b"); // upholstered back
  R(g, 215, 125, 34, 6, "#f471b5"); // seat cushion at hip height
  R(g, 215, 130, 34, 2, "#a63270");
  R(g, 213, 117, 5, 13, "#8f8bb5"); // armrests
  R(g, 246, 117, 5, 13, "#8f8bb5");
  R(g, 213, 117, 5, 2, "#c8c3df");
  R(g, 246, 117, 5, 2, "#c8c3df");
  R(g, 217, 131, 3, 9, "#8f8bb5");
  R(g, 244, 131, 3, 9, "#8f8bb5");

  // Big 50-quart party cooler

  R(g, 257, 118, 25, 19, "#dc2626");
  R(g, 256, 116, 27, 5, "#e8e6f7");
  R(g, 267, 121, 5, 3, "#e8e6f7");

  // lush rooftop planters
  drawSprite(g, "plant", 283, 108);
  drawSprite(g, "plant", 300, 114);
}

function paintRooftop(g: G) {
  drawRooftopWorld(g, 0, getPhTime());
}

function dynRooftop(g: G, t: number) {
  drawRooftopWorld(g, t, getPhTime());
  drawWeatherEffects(g, getLiveWeather(), t, 320, 180);
}

/* ============================================================
   ROOM REGISTRY
============================================================ */

export const ROOMS: Record<RoomId, RoomDef> = {
  living: {
    id: "living",
    name: "LIVING ROOM",
    sub: "home base. population: 1 dev, 1 cat",
    walkY: [128, 172],
    entries: {
      default: { x: 156, y: 156 },
      kitchen: { x: 43, y: 136 },
      hallway: { x: 219, y: 136 },
      bedroom: { x: 298, y: 136 },
    },
    paint: paintLiving,
    dynamics: dynLiving,
    hotspots: [
      { id: "doorKitchen", name: "KITCHEN DOOR", x: 26, y: 44, w: 34, h: 74, standX: 43, standY: 134, defVerb: "use", door: "kitchen" },
      { id: "doorHall", name: "HALLWAY DOOR", x: 202, y: 44, w: 34, h: 74, standX: 219, standY: 134, defVerb: "use", door: "hallway" },
      { id: "doorBedroom", name: "BEDROOM DOOR", x: 286, y: 44, w: 34, h: 74, standX: 298, standY: 134, defVerb: "use", door: "bedroom" },
      { id: "neon", name: "NEON SIGN", x: 96, y: 4, w: 128, h: 26, standX: 156, standY: 138, defVerb: "look" },
      { id: "livingPhotos", name: "FRAMED WALL PHOTOS", x: 105, y: 31, w: 79, h: 33, standX: 145, standY: 142, defVerb: "look" },
      { id: "catPortrait", name: "CAT PORTRAIT", x: 3, y: 12, w: 22, h: 55, standX: 22, standY: 138, defVerb: "look" },
      { id: "window", name: "WINDOW", x: 61, y: 15, w: 40, h: 58, standX: 81, standY: 134, defVerb: "look" },
      { id: "tv", name: "TV", x: 235, y: 52, w: 42, h: 44, standX: 255, standY: 138, defVerb: "use" },
      { id: "couch", name: "COUCH", x: 100, y: 82, w: 90, h: 45, standX: 142, standY: 146, defVerb: "use" },
      { id: "lamp", name: "FLOOR LAMP", x: 187, y: 64, w: 17, h: 62, standX: 195, standY: 136, defVerb: "use" },
      { id: "plant", name: "PLANT", x: 1, y: 96, w: 24, h: 28, standX: 22, standY: 138, defVerb: "look" },
      { id: "shelf", name: "GAME SHELF", x: 274, y: 74, w: 14, h: 50, standX: 278, standY: 138, defVerb: "look" },
    ],
  },
  kitchen: {
    id: "kitchen",
    name: "KITCHEN",
    sub: "fuel station. do not lick the counter",
    walkY: [128, 172],
    entries: { default: { x: 298, y: 138 }, living: { x: 298, y: 138 } },
    paint: paintKitchen,
    dynamics: dynKitchen,
    hotspots: [
      { id: "doorLiving", name: "LIVING ROOM DOOR", x: 286, y: 44, w: 34, h: 74, standX: 298, standY: 136, defVerb: "use", door: "living" },
      { id: "fridge", name: "FRIDGE", x: 4, y: 28, w: 40, h: 90, standX: 28, standY: 134, defVerb: "use" },
      { id: "coffeeMachine", name: "COFFEE MACHINE", x: 47, y: 50, w: 26, h: 28, standX: 60, standY: 132, defVerb: "use" },
      { id: "pizzaBox", name: "PIZZA BOX", x: 71, y: 56, w: 31, h: 22, standX: 86, standY: 132, defVerb: "use" },
      { id: "sink", name: "SINK", x: 102, y: 64, w: 32, h: 20, standX: 117, standY: 132, defVerb: "use" },
      { id: "microwave", name: "MICROWAVE", x: 135, y: 44, w: 40, h: 24, standX: 155, standY: 132, defVerb: "use" },
      { id: "stove", name: "STOVE", x: 135, y: 72, w: 40, h: 46, standX: 155, standY: 134, defVerb: "look" },
      { id: "kwWindow", name: "WINDOW", x: 97, y: 12, w: 38, h: 44, standX: 116, standY: 132, defVerb: "look" },
      { id: "kitchenPhotos", name: "FRAMED KITCHEN PHOTOS", x: 178, y: 14, w: 58, h: 32, standX: 208, standY: 138, defVerb: "look" },
      { id: "kitchenChairL", name: "LEFT KITCHEN CHAIR", x: 194, y: 91, w: 24, h: 44, standX: 205, standY: 140, defVerb: "use" },
      { id: "kitchenChairR", name: "RIGHT KITCHEN CHAIR", x: 260, y: 91, w: 24, h: 44, standX: 273, standY: 140, defVerb: "use" },
      { id: "table", name: "KITCHEN TABLE", x: 194, y: 92, w: 90, h: 44, standX: 238, standY: 148, defVerb: "look" },
      { id: "trash", name: "TRASH BIN", x: 174, y: 88, w: 20, h: 30, standX: 184, standY: 134, defVerb: "look" },
    ],
  },
  bedroom: {
    id: "bedroom",
    name: "BEDROOM",
    sub: "sleep.exe was last run: unknown",
    walkY: [128, 172],
    entries: { default: { x: 24, y: 138 }, living: { x: 24, y: 138 } },
    paint: paintBedroom,
    dynamics: dynBedroom,
    hotspots: [
      { id: "doorLiving", name: "LIVING ROOM DOOR", x: 7, y: 44, w: 34, h: 74, standX: 24, standY: 136, defVerb: "use", door: "living" },
      { id: "bWindow", name: "WINDOW", x: 55, y: 11, w: 44, h: 44, standX: 78, standY: 134, defVerb: "look" },
      { id: "bedroomPhotos", name: "WALL POLAROIDS & PHOTOS", x: 106, y: 10, w: 100, h: 30, standX: 156, standY: 136, defVerb: "look" },
      { id: "bed", name: "BED", x: 43, y: 64, w: 80, h: 58, standX: 84, standY: 138, defVerb: "use" },
      { id: "nightstand", name: "NIGHTSTAND", x: 123, y: 68, w: 22, h: 52, standX: 134, standY: 134, defVerb: "look" },
      { id: "pc", name: "DEV MACHINE", x: 158, y: 50, w: 42, h: 36, standX: 177, standY: 138, defVerb: "use" },
      { id: "drawer", name: "DESK DRAWER", x: 191, y: 90, w: 23, h: 30, standX: 202, standY: 136, defVerb: "use" },
      { id: "deskChair", name: "DESK CHAIR", x: 162, y: 74, w: 32, h: 52, standX: 177, standY: 140, defVerb: "use" },
      { id: "desk", name: "DESK", x: 147, y: 86, w: 46, h: 40, standX: 175, standY: 140, defVerb: "look" },
      { id: "bookshelf", name: "BOOKSHELF", x: 216, y: 26, w: 32, h: 92, standX: 232, standY: 134, defVerb: "use" },
      { id: "poster", name: "POSTER", x: 249, y: 18, w: 32, h: 40, standX: 265, standY: 134, defVerb: "look" },
      { id: "wardrobe", name: "WARDROBE", x: 282, y: 32, w: 37, h: 86, standX: 298, standY: 134, defVerb: "use" },
      { id: "laundry", name: "LAUNDRY PILE", x: 123, y: 121, w: 28, h: 17, standX: 138, standY: 148, defVerb: "look" },
    ],
  },
  hallway: {
    id: "hallway",
    name: "HALLWAY",
    sub: "a corridor of questionable decisions",
    walkY: [128, 172],
    entries: {
      default: { x: 22, y: 138 },
      living: { x: 22, y: 138 },
      bathroom: { x: 119, y: 138 },
      gameroom: { x: 157, y: 138 },
      server: { x: 234, y: 138 },
      rooftop: { x: 274, y: 140 },
    },
    paint: paintHallway,
    dynamics: dynHallway,
    hotspots: [
      { id: "doorLiving", name: "LIVING ROOM DOOR", x: 5, y: 44, w: 34, h: 74, standX: 22, standY: 136, defVerb: "use", door: "living" },
      { id: "clock", name: "WALL CLOCK", x: 43, y: 18, w: 22, h: 22, standX: 54, standY: 132, defVerb: "look" },
      { id: "hPoster", name: "POSTER", x: 66, y: 16, w: 32, h: 42, standX: 82, standY: 132, defVerb: "look" },
      { id: "doorBath", name: "BATHROOM DOOR", x: 102, y: 44, w: 34, h: 74, standX: 119, standY: 136, defVerb: "use", door: "bathroom" },
      { id: "doorGame", name: "GAME ROOM DOOR", x: 140, y: 44, w: 34, h: 74, standX: 157, standY: 136, defVerb: "use", door: "gameroom" },
      { id: "hallPhotos", name: "HALLWAY PHOTO GALLERY", x: 177, y: 11, w: 37, h: 52, standX: 196, standY: 136, defVerb: "look" },
      { id: "boxes", name: "STACK OF BOXES", x: 179, y: 75, w: 34, h: 43, standX: 196, standY: 138, defVerb: "look" },
      { id: "doorServer", name: "SERVER ROOM DOOR", x: 217, y: 44, w: 42, h: 74, standX: 234, standY: 136, defVerb: "use", door: "server" },
      { id: "stairs", name: "STAIRS TO ROOF", x: 261, y: 26, w: 59, h: 94, standX: 274, standY: 138, defVerb: "use", door: "rooftop" },
    ],
  },
  server: {
    id: "server",
    name: "SERVER ROOM",
    sub: "18°C. 99.99% uptime. 0% mercy",
    walkY: [128, 172],
    entries: { default: { x: 22, y: 138 }, hallway: { x: 22, y: 138 } },
    paint: paintServer,
    dynamics: dynServer,
    hotspots: [
      { id: "doorHall", name: "HALLWAY DOOR", x: 5, y: 44, w: 34, h: 74, standX: 22, standY: 136, defVerb: "use", door: "hallway" },
      { id: "racks", name: "SERVER RACKS", x: 42, y: 24, w: 96, h: 94, standX: 90, standY: 136, defVerb: "look" },
      { id: "terminal", name: "MAIN TERMINAL", x: 154, y: 46, w: 56, h: 46, standX: 182, standY: 138, defVerb: "use" },
      { id: "operatorChair", name: "OPERATOR CHAIR", x: 166, y: 92, w: 32, h: 33, standX: 182, standY: 138, defVerb: "use" },
      { id: "whiteboard", name: "WHITEBOARD", x: 216, y: 22, w: 56, h: 52, standX: 244, standY: 134, defVerb: "look" },
      { id: "ac", name: "AC UNIT", x: 272, y: 18, w: 42, h: 28, standX: 292, standY: 134, defVerb: "look" },
      { id: "serverPhoto", name: "FRAMED SERVER PHOTO", x: 275, y: 52, w: 36, h: 32, standX: 290, standY: 136, defVerb: "look" },
      { id: "extinguisher", name: "FIRE EXTINGUISHER", x: 137, y: 90, w: 12, h: 28, standX: 144, standY: 134, defVerb: "look" },
    ],
  },
  bathroom: {
    id: "bathroom",
    name: "BATHROOM",
    sub: "where the best ideas happen. allegedly",
    walkY: [128, 172],
    entries: { default: { x: 298, y: 138 }, hallway: { x: 298, y: 138 } },
    paint: paintBathroom,
    dynamics: dynBathroom,
    hotspots: [
      { id: "doorHall", name: "HALLWAY DOOR", x: 286, y: 44, w: 34, h: 74, standX: 298, standY: 136, defVerb: "use", door: "hallway" },
      { id: "bathPhoto", name: "FRAMED DUCK PORTRAIT", x: 60, y: 14, w: 30, h: 37, standX: 74, standY: 136, defVerb: "look" },
      { id: "tub", name: "BATHTUB", x: 6, y: 84, w: 88, h: 40, standX: 52, standY: 138, defVerb: "use" },
      { id: "duckSpot", name: "RUBBER DUCK", x: 56, y: 82, w: 20, h: 18, standX: 64, standY: 136, defVerb: "use", when: (f) => !f.duckTaken },
      { id: "toilet", name: "TOILET", x: 96, y: 83, w: 36, h: 39, standX: 112, standY: 136, defVerb: "use" },
      { id: "mirror", name: "MIRROR", x: 134, y: 30, w: 44, h: 48, standX: 156, standY: 134, defVerb: "look" },
      { id: "sinkB", name: "SINK", x: 130, y: 78, w: 50, h: 42, standX: 156, standY: 136, defVerb: "use" },
      { id: "towel", name: "TOWELS", x: 180, y: 44, w: 36, h: 42, standX: 196, standY: 134, defVerb: "look" },
      { id: "washer", name: "WASHING MACHINE", x: 218, y: 69, w: 42, h: 50, standX: 239, standY: 136, defVerb: "use" },
    ],
  },
  gameroom: {
    id: "gameroom",
    name: "GAME ROOM",
    sub: "insert coin to view testimonials",
    walkY: [128, 172],
    entries: { default: { x: 22, y: 138 }, hallway: { x: 22, y: 138 } },
    paint: paintGameroom,
    dynamics: dynGameroom,
    hotspots: [
      { id: "doorHall", name: "HALLWAY DOOR", x: 5, y: 44, w: 34, h: 74, standX: 22, standY: 136, defVerb: "use", door: "hallway" },
      { id: "arcade", name: "TURBO ARCADE CABINET", x: 43, y: 40, w: 36, h: 78, standX: 61, standY: 138, defVerb: "use" },
      { id: "arcade2", name: "BROKEN CABINET", x: 81, y: 40, w: 36, h: 78, standX: 99, standY: 138, defVerb: "look" },
      { id: "gamePhotos", name: "FRAMED LAN PHOTOS", x: 122, y: 9, w: 80, h: 30, standX: 164, standY: 138, defVerb: "look" },
      { id: "rig", name: "GAMING RIG", x: 122, y: 48, w: 82, h: 42, standX: 164, standY: 138, defVerb: "use" },
      { id: "gamingChair", name: "GAMING CHAIR", x: 147, y: 68, w: 35, h: 59, standX: 164, standY: 144, defVerb: "use" },
      { id: "trophies", name: "TROPHY SHELF", x: 206, y: 38, w: 54, h: 20, standX: 232, standY: 134, defVerb: "look" },
      { id: "crt", name: "RETRO CONSOLE", x: 208, y: 64, w: 52, h: 54, standX: 232, standY: 138, defVerb: "use" },
      { id: "gPosters", name: "POSTERS", x: 263, y: 16, w: 49, h: 28, standX: 286, standY: 136, defVerb: "look" },
      { id: "beanbag", name: "BEANBAG", x: 259, y: 97, w: 54, h: 31, standX: 285, standY: 144, defVerb: "use" },
    ],
  },
  rooftop: {
    id: "rooftop",
    name: "ROOFTOP",
    sub: "best signal in the building. worst weather",
    walkY: [132, 174],
    entries: { default: { x: 28, y: 144 }, hallway: { x: 28, y: 144 } },
    paint: paintRooftop,
    dynamics: dynRooftop,
    hotspots: [
      { id: "doorDown", name: "STAIRS DOWN", x: 8, y: 56, w: 36, h: 70, standX: 28, standY: 142, defVerb: "use", door: "hallway" },
      { id: "vent", name: "VENT UNIT", x: 80, y: 94, w: 34, h: 34, standX: 97, standY: 142, defVerb: "look" },
      { id: "telescope", name: "TELESCOPE", x: 114, y: 108, w: 34, h: 30, standX: 131, standY: 148, defVerb: "use" },
      { id: "dish", name: "SATELLITE DISH", x: 172, y: 80, w: 32, h: 30, standX: 188, standY: 140, defVerb: "use" },
      { id: "antenna", name: "ANTENNA", x: 58, y: 10, w: 24, h: 98, standX: 72, standY: 140, defVerb: "look" },
      { id: "lawnChair", name: "DECK CHAIR", x: 212, y: 106, w: 42, h: 36, standX: 233, standY: 150, defVerb: "use" },
      { id: "cooler", name: "COOLER", x: 255, y: 115, w: 29, h: 24, standX: 269, standY: 148, defVerb: "use" },
      {
        id: "moon",
        name: "THE MOON",
        label: () => {
          const ph = getPhTime().phase;
          if (ph === "day") return "PHILIPPINE SUN";
          if (ph === "dawn") return "MANILA SUNRISE";
          if (ph === "dusk") return "MANILA SUNSET";
          return "THE MOON";
        },
        x: 248,
        y: 10,
        w: 44,
        h: 52,
        standX: 240,
        standY: 142,
        defVerb: "look",
      },
      { id: "skyline", name: "CITY SKYLINE", x: 56, y: 58, w: 250, h: 34, standX: 180, standY: 140, defVerb: "look" },
    ],
  },
};

export const ROOM_ORDER: RoomId[] = [
  "living", "kitchen", "bedroom", "hallway", "bathroom", "gameroom", "server", "rooftop",
];
