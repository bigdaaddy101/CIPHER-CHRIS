import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Crosshair, Focus, Minus, Plus, RotateCcw, Bus, CircleDot, Store, Home, MousePointer2 } from "lucide-react";
import { getPhTime, usePhTime } from "../game/phTime";
import type { PhTimeInfo, TimePhase } from "../game/phTime";
import { txt } from "../game/rooms";
import { sfx } from "../game/sound";

const WORLD_W = 640;
const WORLD_H = 360;
const VIEW_W = 640;
const VIEW_H = 360;

type PoiId = "jeep" | "court" | "store" | "house";
type Pan = { x: number; y: number };

const POI_COPY: Record<PoiId, { title: string; subtitle: string; body: string }> = {
  jeep: {
    title: "PUJ · CIPHER–BARANGAY LINE",
    subtitle: "PUBLIC UTILITY JEEPNEY · MOVING",
    body: "A chrome-and-neon jeepney shuttles up and down Cipher Street, route sign glowing, headlights on after sunset. It U-turns at the corner curb by the court — no shortcuts through the barangay basketball games. The driver taps the horn twice: the neighborhood's original notification sound.",
  },
  court: {
    title: "BRGY. UPPER HINAPLANON COVERED COURT",
    subtitle: "ILIGAN CITY · PICKUP GAMES · DAWN TO SUNSET",
    body: "The pride of Upper Hinaplanon: a covered court with a painted barangay seal at center, Brgy. Upper Hinaplanon lettered across the roof beam, and three players running half-court while the court is open. After dark, everyone goes home and the court closes.",
  },
  store: {
    title: "ALING NENA'S SARI-SARI STORE",
    subtitle: "OPEN LATE · ICE COLD SEGFAULT COLA",
    body: "The little corner store is still glowing. There are hanging snack packs, a freezer full of ice candy, and a handwritten sign that says 'NO LOAD, NO PROBLEM'. It is basically the neighborhood's offline API.",
  },
  house: {
    title: "THE NEIGHBORHOOD",
    subtitle: "CIPHER STREET · ROOFTOPS & WATER TANKS",
    body: "Concrete homes, corrugated roofs, tangled power lines, laundry catching the night breeze, and a water tank silhouetted against the Philippine sky. Home, from a slightly higher angle.",
  },
};

const SKY: Record<TimePhase, { top: string; mid: string; low: string; ground: string; window: string }> = {
  dawn: { top: "#25204d", mid: "#a34b78", low: "#fbbf24", ground: "#3c3150", window: "#fef3c7" },
  day: { top: "#0284c7", mid: "#38bdf8", low: "#bae6fd", ground: "#4b5563", window: "#e0f2fe" },
  dusk: { top: "#241445", mid: "#be185d", low: "#fb923c", ground: "#33233f", window: "#fde68a" },
  night: { top: "#070613", mid: "#100c2a", low: "#1a1440", ground: "#242039", window: "#fbbf24" },
};

function R(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// Cipher Street road band: x 0..STREET_END. The court sits past the corner.
const STREET_END = 332;
const JEEP_W = 98;
const JEEP_MIN = -JEEP_W - 10; // fully off-screen left
const JEEP_MAX = STREET_END - JEEP_W - 8; // nose stops short of the corner curb
const JEEP_SPAN = JEEP_MAX - JEEP_MIN;

/** Returns { x, dir } — jeepney shuttles along Cipher Street and U-turns at the corner, never entering the court. */
function jeepState(t: number): { x: number; dir: 1 | -1 } {
  const period = 30;
  const u = (t % period) / period; // 0..1
  const pauseFrac = 0.08; // dwell at each end
  const moveFrac = 0.5 - pauseFrac;
  if (u < moveFrac) {
    return { x: JEEP_MIN + (u / moveFrac) * JEEP_SPAN, dir: 1 };
  }
  if (u < 0.5) return { x: JEEP_MAX, dir: 1 };
  if (u < 0.5 + moveFrac) {
    return { x: JEEP_MAX - ((u - 0.5) / moveFrac) * JEEP_SPAN, dir: -1 };
  }
  return { x: JEEP_MIN, dir: -1 };
}

function jeepX(t: number) {
  return jeepState(t).x;
}

function drawCloud(g: CanvasRenderingContext2D, x: number, y: number, color: string, shade: string) {
  R(g, x + 8, y, 28, 8, color);
  R(g, x + 2, y + 6, 48, 12, color);
  R(g, x, y + 15, 58, 7, shade);
  R(g, x + 18, y - 5, 16, 8, color);
}

function drawPalm(g: CanvasRenderingContext2D, x: number, y: number, scale: number, night: boolean) {
  const trunk = night ? "#211b2c" : "#57534e";
  const leaf = night ? "#10251e" : "#166534";
  R(g, x, y, 4 * scale, 62 * scale, trunk);
  R(g, x - 4 * scale, y + 58 * scale, 12 * scale, 4 * scale, trunk);
  const fronds: [number, number, number, number][] = [
    [-25, 3, 28, 4], [2, 3, 28, 4], [-17, -5, 18, 4], [4, -7, 20, 4], [-5, -14, 12, 4],
  ];
  fronds.forEach(([dx, dy, w, h]) => R(g, x + dx * scale, y + dy * scale, w * scale, h * scale, leaf));
  R(g, x - 3 * scale, y + 1 * scale, 8 * scale, 8 * scale, leaf);
}

function drawHouse(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  body: string,
  roof: string,
  pht: PhTimeInfo,
  variant: number
) {
  R(g, x + 4, y + 8, w, h, "rgba(0,0,0,0.28)");
  R(g, x, y + 10, w, h - 10, body);
  // corrugated roof with a stepped pixel ridge
  R(g, x - 5, y + 5, w + 10, 8, roof);
  R(g, x + 5, y, w - 10, 6, roof);
  for (let rx = x; rx < x + w; rx += 9) R(g, rx, y + 6, 3, 3, "rgba(255,255,255,0.12)");
  R(g, x + 8, y + h - 27, 14, 27, "#171322");
  R(g, x + w - 28, y + 25, 16, 14, pht.phase === "day" ? "#7dd3fc" : SKY[pht.phase].window);
  R(g, x + w - 20, y + 25, 2, 14, "#312744");
  R(g, x + w - 28, y + 31, 16, 2, "#312744");
  R(g, x + 31, y + 24, 18, 13, pht.phase === "day" ? "#bae6fd" : SKY[pht.phase].window);
  R(g, x + 39, y + 24, 2, 13, "#312744");
  if (variant % 2 === 0) {
    R(g, x + w - 12, y - 15, 12, 15, "#374151"); // water tank
    R(g, x + w - 14, y - 17, 16, 3, "#6b7280");
    R(g, x + w - 10, y - 20, 2, 3, "#6b7280");
  }
  // laundry fluttering from a line
  R(g, x + 52, y + 4, 1, 27, "#29223b");
  R(g, x + 53, y + 8, 9, 10, variant % 2 ? "#f471b5" : "#22d3ee");
  R(g, x + 64, y + 10, 7, 9, "#fbbf24");
}

function drawStore(g: CanvasRenderingContext2D, pht: PhTimeInfo, t: number) {
  const night = pht.phase === "night" || pht.phase === "dusk";
  R(g, 29, 121, 151, 72, "#72523f");
  R(g, 25, 113, 159, 12, "#31233b");
  R(g, 34, 103, 140, 12, "#155e75");
  txt(g, "SARI-SARI", 104, 106, "#fef3c7", 2, true);
  // striped awning
  for (let i = 0; i < 10; i++) R(g, 28 + i * 15, 124, 15, 8, i % 2 ? "#fbbf24" : "#dc2626");
  R(g, 40, 137, 75, 37, "#171322");
  R(g, 45, 141, 65, 29, night ? "#f59e0b" : "#7dd3fc");
  R(g, 46, 143, 63, 5, night ? "#fef3c7" : "#e0f2fe");
  R(g, 124, 138, 38, 55, "#302334");
  R(g, 130, 151, 26, 20, "#0f172a");
  txt(g, "LOAD", 143, 157, "#4ade80", 1, true);
  // snack strips and bottles
  const snacks = ["#f471b5", "#fbbf24", "#4ade80", "#22d3ee", "#f97316"];
  for (let i = 0; i < 8; i++) {
    R(g, 46 + i * 8, 132, 4, 9 + (i % 3) * 2, snacks[i % snacks.length]);
  }
  R(g, 177, 151, 5, 12, "#f43f5e");
  R(g, 177, 149, 5, 2, "#e8e6f7");
  if (night) {
    for (let i = 0; i < 5; i++) {
      const glow = Math.sin(t * 3 + i) > -0.8;
      R(g, 38 + i * 29, 133, 3, 3, glow ? "#fde68a" : "#78350f");
    }
  }
}

function drawCourt(g: CanvasRenderingContext2D, t: number, pht: PhTimeInfo) {
  const night = pht.phase === "night" || pht.phase === "dusk";
  const courtClosed = pht.phase === "night"; // no basketball after dark in PHT night phase
  const floor = night ? "#1e3a5f" : "#2a7a8f";

  // covered-court steel roof: trusses, corrugated panels and the barangay name beam
  const roofTop = 112;
  R(g, 352, roofTop, 277, 7, night ? "#334155" : "#64748b"); // roof ridge
  for (let i = 0; i < 19; i++) {
    const rx = 354 + i * 14.5;
    R(g, rx, roofTop + 7, 13, 11, i % 2 ? (night ? "#2b3a52" : "#94a3b8") : (night ? "#243247" : "#7f8ea3")); // corrugated panels
  }
  R(g, 352, roofTop + 18, 277, 3, "#0f172a"); // fascia shadow line
  // name beam (green/white barangay signage)
  R(g, 352, roofTop + 21, 277, 20, "#14532d");
  R(g, 352, roofTop + 21, 277, 2, "#4ade80");
  R(g, 352, roofTop + 39, 277, 2, "#4ade80");
  txt(g, "BRGY. UPPER HINAPLANON", 490, roofTop + 24, "#f8fafc", 2, true);
  txt(g, "COVERED COURT  ·  ILIGAN CITY", 490, roofTop + 34, "#fde68a", 1, true);
  // steel roof columns (front pair sit at the court edges; rear pair recede)
  [358, 619].forEach((cx) => {
    R(g, cx, roofTop + 41, 6, 165, night ? "#334155" : "#475569");
    R(g, cx + 1, roofTop + 41, 2, 165, night ? "#475569" : "#94a3b8");
  });
  // truss zig-zag detail under the roof
  g.strokeStyle = night ? "#475569" : "#cbd5e1";
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 360; x < 618; x += 24) {
    g.moveTo(x, roofTop + 41);
    g.lineTo(x + 12, roofTop + 46);
    g.lineTo(x + 24, roofTop + 41);
  }
  g.stroke();

  // perimeter fence inside the covered area
  for (let y = 162; y < 184; y += 8) R(g, 364, y, 254, 1, "rgba(203,213,225,0.26)");
  for (let x = 364; x <= 618; x += 20) R(g, x, 158, 1, 28, "rgba(203,213,225,0.26)");

  // concrete playing surface, lane markings
  R(g, 367, 183, 247, 119, floor);
  R(g, 367, 183, 247, 4, night ? "#3b82f6" : "#67e8f9");
  R(g, 370, 188, 241, 110, "rgba(15,23,42,0.12)");
  g.strokeStyle = "#e2e8f0";
  g.lineWidth = 2;
  g.strokeRect(378, 193, 220, 96);
  R(g, 487, 193, 2, 96, "#e2e8f0");
  g.strokeRect(531, 207, 54, 48);
  g.beginPath();
  g.arc(558, 231, 20, 0, Math.PI * 2);
  g.stroke();

  // painted center-court BARANGAY SEAL (green ring, gold star, "UH" monogram)
  g.beginPath();
  g.arc(488, 241, 20, 0, Math.PI * 2);
  g.fillStyle = "#14532d";
  g.fill();
  g.strokeStyle = "#fbbf24";
  g.lineWidth = 2;
  g.stroke();
  g.beginPath();
  g.arc(488, 241, 13, 0, Math.PI * 2);
  g.fillStyle = "#f8fafc";
  g.fill();
  // gold star (5-point)
  g.fillStyle = "#f59e0b";
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? 10 : 4.5;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = 488 + Math.cos(ang) * rad;
    const py = 241 + Math.sin(ang) * rad;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  txt(g, "UH", 488, 237, "#14532d", 1, true);
  // seal ring lettering (tiny, around top)
  txt(g, "UPPER", 488, 216, "#e2e8f0", 1, true);
  txt(g, "HINAPLANON", 488, 262, "#e2e8f0", 1, true);

  // hoop, backboard, rim and net
  R(g, 563, 157, 6, 48, "#475569");
  R(g, 548, 153, 39, 22, "#f1f5f9");
  R(g, 552, 157, 31, 14, "#94a3b8");
  R(g, 555, 171, 26, 3, "#f97316");
  R(g, 558, 174, 3, 11, "#e2e8f0");
  R(g, 566, 174, 2, 13, "#e2e8f0");
  R(g, 575, 174, 3, 11, "#e2e8f0");
  R(g, 558, 184, 20, 2, "#e2e8f0");

  // scoreboard: live only while the court is open; switched off after dark
  R(g, 379, 153, 66, 26, "#111827");
  if (courtClosed) {
    txt(g, "COURT CLOSED", 412, 157, "#f87171", 1, true);
    txt(g, "AFTER DARK", 412, 168, "#94a3b8", 1, true);
  } else {
    const home = 24 + Math.floor(t / 5) % 8;
    const guest = 22 + Math.floor(t / 7) % 6;
    txt(g, `HOME ${home}`, 384, 157, "#4ade80", 1);
    txt(g, `GUEST ${guest}`, 384, 168, "#fbbf24", 1);
  }

  if (!courtClosed) {
    // three neighborhood players, animated dribble / defensive shuffle (day, dawn & dusk only)
    const players = [
      { x: 429 + Math.sin(t * 2.2) * 5, y: 224, jersey: "#f43f5e", skin: "#b97850" },
      { x: 485 + Math.sin(t * 2.7 + 1) * 6, y: 255, jersey: "#22d3ee", skin: "#d59a6c" },
      { x: 527 + Math.sin(t * 2.1 + 2) * 4, y: 214, jersey: "#fbbf24", skin: "#9c6847" },
    ];
    players.forEach((p, i) => {
      const bounce = Math.abs(Math.sin(t * 4 + i)) * 2;
      R(g, p.x + 2, p.y - 15 - bounce, 6, 6, p.skin); // head
      R(g, p.x + 2, p.y - 17 - bounce, 6, 2, "#111116"); // black hair
      R(g, p.x, p.y - 9 - bounce, 10, 12, p.jersey);
      R(g, p.x - 2, p.y - 7 - bounce, 3, 9, p.skin);
      R(g, p.x + 9, p.y - 7 - bounce, 3, 9, p.skin);
      R(g, p.x + 1, p.y + 3, 3, 9, "#1e293b");
      R(g, p.x + 6, p.y + 3, 3, 9, "#1e293b");
    });

    // ball follows a repeating shot arc from the red player to the hoop
    const cycle = (t % 5) / 5;
    let bx: number;
    let by: number;
    if (cycle < 0.64) {
      const u = cycle / 0.64;
      bx = 435 + u * 130;
      by = 211 - u * 36 - Math.sin(u * Math.PI) * 64;
    } else {
      const u = (cycle - 0.64) / 0.36;
      bx = 566 + Math.sin(u * Math.PI * 2) * 5;
      by = 179 + u * 57;
    }
    R(g, bx, by, 5, 5, "#f97316");
    R(g, bx + 2, by, 1, 5, "#7c2d12");
    R(g, bx, by + 2, 5, 1, "#7c2d12");
  } else {
    // quiet after-hours court: closed sign hanging by the entrance, no players, no ball
    R(g, 461, 183, 56, 22, "#7f1d1d");
    R(g, 463, 185, 52, 18, "#fef2f2");
    txt(g, "CLOSED", 489, 189, "#991b1b", 2, true);
    txt(g, "NO PLAYING", 489, 199, "#991b1b", 1, true);
  }

  // Hanging lamps are used for the last sunset games only; OFF when court is closed at night.
  const lampsOn = pht.phase === "dusk";
  const lampXs = [400, 448, 496, 544, 592];
  lampXs.forEach((lx) => {
    R(g, lx, 158, 1, 7, "#1f2937"); // drop wire
    R(g, lx - 5, 165, 11, 4, lampsOn ? "#fef3c7" : "#4b5563"); // lamp shade
  });
  if (lampsOn) {
    g.save();
    g.globalAlpha = 0.1;
    g.fillStyle = "#fef3c7";
    g.fillRect(367, 170, 247, 132);
    g.restore();
  }
}

function drawJeep(g: CanvasRenderingContext2D, x: number, y: number, pht: PhTimeInfo, t: number, dir: 1 | -1 = 1) {
  const night = pht.phase === "night" || pht.phase === "dusk";
  // When heading back (dir = -1) mirror the whole jeepney around its own center.
  if (dir === -1) {
    g.save();
    g.translate(x * 2 + JEEP_W, 0);
    g.scale(-1, 1);
    drawJeep(g, x, y, pht, t, 1);
    g.restore();
    return;
  }
  // exhaust puffs trail behind the moving jeepney
  if (x > 5) {
    for (let i = 0; i < 3; i++) {
      const puff = (t * 13 + i * 7) % 18;
      R(g, x - 5 - puff, y + 24 - i * 3, 5 + i, 3 + i, "rgba(148,163,184,0.35)");
    }
  }
  // tires and chrome undercarriage
  R(g, x + 7, y + 31, 82, 7, "#111827");
  R(g, x + 13, y + 29, 12, 13, "#09090d");
  R(g, x + 70, y + 29, 12, 13, "#09090d");
  R(g, x + 16, y + 32, 6, 6, "#94a3b8");
  R(g, x + 73, y + 32, 6, 6, "#94a3b8");
  // iconic elongated jeepney body, hood and roof
  R(g, x + 2, y + 8, 88, 26, "#c0c5d1");
  R(g, x + 7, y + 2, 76, 9, "#e5e7eb");
  R(g, x + 86, y + 17, 12, 17, "#9ca3af");
  R(g, x + 91, y + 14, 7, 5, "#e5e7eb");
  R(g, x + 1, y + 29, 96, 4, "#fbbf24");
  R(g, x + 2, y + 25, 88, 4, "#2563eb");
  R(g, x + 2, y + 22, 88, 3, "#dc2626");
  // windows and driver silhouette
  for (let i = 0; i < 5; i++) {
    R(g, x + 10 + i * 14, y + 10, 11, 11, night ? "#164e63" : "#0ea5e9");
    R(g, x + 11 + i * 14, y + 11, 9, 3, night ? "#7dd3fc" : "#bae6fd");
  }
  R(g, x + 78, y + 13, 5, 8, "#111116");
  R(g, x + 76, y + 20, 9, 3, "#f0bd8f");
  // roof route sign and chrome trim
  R(g, x + 29, y - 5, 38, 8, "#111827");
  txt(g, "CIPHER", x + 48, y - 3, "#fde68a", 1, true);
  R(g, x + 4, y + 7, 82, 2, "#ffffff");
  R(g, x + 91, y + 25, 5, 4, night ? "#fef08a" : "#f8fafc");
  if (night) {
    g.save();
    g.globalAlpha = 0.16;
    g.fillStyle = "#fef08a";
    g.beginPath();
    g.moveTo(x + 96, y + 25);
    g.lineTo(x + 137, y + 16);
    g.lineTo(x + 137, y + 39);
    g.fill();
    g.restore();
  }
  txt(g, "PUJ", x + 51, y + 35, "#111827", 1, true);
}

function drawWorld(g: CanvasRenderingContext2D, t: number, pht: PhTimeInfo, selected: PoiId | null) {
  const pal = SKY[pht.phase];
  const night = pht.phase === "night";
  g.imageSmoothingEnabled = false;
  R(g, 0, 0, WORLD_W, 125, pal.top);
  R(g, 0, 125, WORLD_W, 70, pal.mid);
  R(g, 0, 195, WORLD_W, 165, pal.low);

  // Philippine sky: stars/moon at night, tropical sun and clouds by day
  if (night) {
    for (let i = 0; i < 48; i++) {
      const x = (i * 83) % WORLD_W;
      const y = (i * 37) % 112;
      if (Math.sin(t * 1.5 + i) > -0.5) R(g, x, y, 2, 2, "#c9c3f5");
    }
    R(g, 550, 31, 25, 25, "#f5f0d8");
    R(g, 559, 27, 22, 25, pal.top);
  } else {
    const sunY = pht.phase === "day" ? 34 : pht.phase === "dawn" ? 82 : 92;
    const sunColor = pht.phase === "dusk" ? "#ef4444" : "#fde047";
    R(g, 548, sunY, 28, 28, sunColor);
    R(g, 543, sunY + 5, 38, 18, sunColor);
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 220 + t * (8 + i * 2)) % 760) - 70;
      drawCloud(g, cx, 25 + i * 27, pht.phase === "day" ? "#ffffff" : "#fbcfe8", pht.phase === "day" ? "#dbeafe" : "#9d174d");
    }
  }

  // distant skyline and neighborhood homes
  R(g, 0, 160, WORLD_W, 40, pal.ground);
  // low hedge / grass strip between the road corner and the court grounds
  R(g, STREET_END + 6, 176, 24, 10, night ? "#14532d" : "#166534");
  R(g, STREET_END + 8, 174, 20, 3, night ? "#166534" : "#22c55e");
  drawHouse(g, 185, 105, 121, 85, pht.phase === "day" ? "#a8a29e" : "#51445f", "#292236", pht, 0);
  drawHouse(g, 302, 122, 92, 68, pht.phase === "day" ? "#c7b9a4" : "#63505c", "#3f2b3c", pht, 1);
  drawStore(g, pht, t);
  drawPalm(g, 332, 100, 1, night);
  drawPalm(g, 615, 105, 1.1, night);

  // utility poles and delightfully tangled overhead wires
  R(g, 347, 77, 5, 206, "#292233");
  R(g, 337, 91, 27, 4, "#292233");
  R(g, 10, 82, 4, 196, "#292233");
  g.strokeStyle = "#171322";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 92);
  g.quadraticCurveTo(170, 142, 349, 95);
  g.moveTo(12, 100);
  g.quadraticCurveTo(170, 154, 349, 103);
  g.moveTo(349, 95);
  g.quadraticCurveTo(500, 130, 640, 91);
  g.stroke();

  // Cipher Street runs left → ends at the corner before the court (x = STREET_END).
  const asphalt = night ? "#151827" : "#374151";
  const walk = night ? "#4b3b4d" : "#a8a29e";
  const lot = night ? "#252033" : "#78716c";
  R(g, 0, 274, WORLD_W, 86, lot); // ground lot behind everything
  R(g, 0, 188, STREET_END, 74, asphalt); // road
  R(g, 0, 188, STREET_END, 4, "#64748b"); // far curb
  R(g, 0, 258, STREET_END, 17, walk); // near sidewalk
  for (let x = -20; x < STREET_END - 36; x += 64) R(g, x, 222, 34, 3, "#fbbf24"); // lane dashes
  // corner curb + drain where the street ends (jeepney U-turns here)
  R(g, STREET_END, 184, 6, 94, "#94a3b8");
  R(g, STREET_END + 1, 184, 2, 94, "#e2e8f0");
  R(g, STREET_END - 14, 258, 14, 17, walk);
  for (let i = 0; i < 5; i++) R(g, STREET_END - 20 + i * 4, 226 + i * 6, 3, 2, "#fbbf24"); // turn-around arrow dots
  txt(g, "CIPHER ST", 200, 245, "#cbd5e1", 1, true);
  txt(g, "NO ENTRY", STREET_END - 22, 196, "#f87171", 1, true);
  // paved apron / sidewalk in front of the court (separate from the road)
  R(g, STREET_END + 6, 258, WORLD_W - STREET_END - 6, 17, walk);
  R(g, STREET_END + 6, 254, WORLD_W - STREET_END - 6, 4, "#94a3b8");
  for (let x = STREET_END + 10; x < WORLD_W; x += 18) R(g, x, 263, 1, 9, "rgba(15,23,42,0.18)"); // paving joints

  // the court sits past the corner; the jeepney never crosses onto it
  drawCourt(g, t, pht);
  const js = jeepState(t);
  const jx = js.x;
  drawJeep(g, jx, 188, pht, t, js.dir);

  // foreground tricycle parked by the store and a street sign
  R(g, 192, 252, 28, 4, "#111827");
  R(g, 197, 241, 15, 12, "#dc2626");
  R(g, 197, 237, 15, 5, "#fbbf24");
  R(g, 197, 253, 7, 7, "#09090d");
  R(g, 214, 253, 7, 7, "#09090d");
  R(g, 225, 244, 3, 31, "#475569");
  R(g, 220, 238, 28, 12, "#155e75");
  txt(g, "SLOW", 234, 241, "#fef3c7", 1, true);

  // selected point-of-interest brackets in world space
  if (selected) {
    let box = { x: 0, y: 0, w: 0, h: 0 };
    if (selected === "jeep") box = { x: jx - 4, y: 180, w: JEEP_W + 8, h: 60 };
    if (selected === "court") box = { x: 349, y: 108, w: 283, h: 197 };
    if (selected === "store") box = { x: 24, y: 100, w: 161, h: 96 };
    if (selected === "house") box = { x: 179, y: 99, w: 132, h: 94 };
    g.strokeStyle = "#fef08a";
    g.lineWidth = 2;
    g.setLineDash([5, 4]);
    g.strokeRect(box.x, box.y, box.w, box.h);
    g.setLineDash([]);
  }
}

function sourceRect(zoom: number, pan: Pan) {
  const w = WORLD_W / zoom;
  const h = WORLD_H / zoom;
  return {
    x: clamp(pan.x, 0, WORLD_W - w),
    y: clamp(pan.y, 0, WORLD_H - h),
    w,
    h,
  };
}

export function TelescopeView() {
  const pht = usePhTime();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<HTMLCanvasElement | null>(null);
  const tRef = useRef(0);
  const zoomRef = useRef(1);
  const focusRef = useRef(94);
  const panRef = useRef<Pan>({ x: 0, y: 0 });
  const selectedRef = useRef<PoiId | null>(null);
  const dragRef = useRef<{ x: number; y: number; pan: Pan; moved: boolean } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState(94);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [selected, setSelected] = useState<PoiId | null>(null);

  const updatePan = (next: Pan) => {
    const bounded = sourceRect(zoomRef.current, next);
    const value = { x: bounded.x, y: bounded.y };
    panRef.current = value;
    setPan(value);
  };

  const choosePoi = (id: PoiId | null) => {
    selectedRef.current = id;
    setSelected(id);
  };

  const centerOn = (id: PoiId) => {
    sfx.uiClick();
    choosePoi(id);
    const nextZoom = id === "store" || id === "house" ? 1.6 : 2;
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    const srcW = WORLD_W / nextZoom;
    const srcH = WORLD_H / nextZoom;
    let cx = 490;
    let cy = 220;
    if (id === "jeep") {
      cx = jeepX(tRef.current) + JEEP_W / 2;
      cy = 214;
    } else if (id === "store") {
      cx = 104;
      cy = 148;
    } else if (id === "house") {
      cx = 245;
      cy = 147;
    }
    updatePan({ x: cx - srcW / 2, y: cy - srcH / 2 });
  };

  const changeZoom = (next: number) => {
    sfx.uiClick();
    const old = sourceRect(zoomRef.current, panRef.current);
    const cx = old.x + old.w / 2;
    const cy = old.y + old.h / 2;
    const z = clamp(next, 1, 3);
    zoomRef.current = z;
    setZoom(z);
    updatePan({ x: cx - WORLD_W / z / 2, y: cy - WORLD_H / z / 2 });
  };

  const resetView = () => {
    sfx.uiClick();
    zoomRef.current = 1;
    setZoom(1);
    focusRef.current = 94;
    setFocus(94);
    updatePan({ x: 0, y: 0 });
    choosePoi(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const view = canvas.getContext("2d");
    if (!view) return;
    const world = document.createElement("canvas");
    world.width = WORLD_W;
    world.height = WORLD_H;
    worldRef.current = world;
    const wg = world.getContext("2d");
    if (!wg) return;
    view.imageSmoothingEnabled = false;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tRef.current += dt;
      const time = getPhTime();
      drawWorld(wg, tRef.current, time, selectedRef.current);
      const src = sourceRect(zoomRef.current, panRef.current);
      view.clearRect(0, 0, VIEW_W, VIEW_H);
      view.imageSmoothingEnabled = false;
      // Focus is an actual lens control: defocus softens the projected image.
      view.filter = `blur(${((100 - focusRef.current) / 100) * 2.4}px)`;
      view.drawImage(world, src.x, src.y, src.w, src.h, 0, 0, VIEW_W, VIEW_H);
      view.filter = "none";

      // Telescope optics: reticle, range ticks, vignette and faint scanlines.
      view.save();
      view.strokeStyle = "rgba(165,243,252,0.58)";
      view.lineWidth = 1;
      view.beginPath();
      view.arc(VIEW_W / 2, VIEW_H / 2, 92, 0, Math.PI * 2);
      view.stroke();
      view.beginPath();
      view.moveTo(VIEW_W / 2 - 122, VIEW_H / 2);
      view.lineTo(VIEW_W / 2 - 72, VIEW_H / 2);
      view.moveTo(VIEW_W / 2 + 72, VIEW_H / 2);
      view.lineTo(VIEW_W / 2 + 122, VIEW_H / 2);
      view.moveTo(VIEW_W / 2, VIEW_H / 2 - 122);
      view.lineTo(VIEW_W / 2, VIEW_H / 2 - 72);
      view.moveTo(VIEW_W / 2, VIEW_H / 2 + 72);
      view.lineTo(VIEW_W / 2, VIEW_H / 2 + 122);
      view.stroke();
      for (let x = 30; x < VIEW_W; x += 42) {
        view.fillStyle = "rgba(165,243,252,0.5)";
        view.fillRect(x, 16, 1, x % 84 === 30 ? 9 : 5);
        view.fillRect(x, VIEW_H - 21, 1, x % 84 === 30 ? 9 : 5);
      }
      const vignette = view.createRadialGradient(320, 180, 105, 320, 180, 370);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(2,1,12,0.78)");
      view.fillStyle = vignette;
      view.fillRect(0, 0, VIEW_W, VIEW_H);
      view.fillStyle = "rgba(0,0,0,0.07)";
      for (let y = 0; y < VIEW_H; y += 4) view.fillRect(0, y, VIEW_W, 1);
      view.restore();
      txt(view, "ROOFTOP OPTICS", 15, 15, "#a5f3fc", 2);
      txt(view, `${time.phaseLabel} ${time.shortTime}`, VIEW_W - 142, 15, "#fef08a", 2);
      txt(view, `ZOOM ${zoomRef.current.toFixed(1)}X`, 15, VIEW_H - 27, "#a5f3fc", 1);
      txt(view, "DRAG TO PAN", VIEW_W - 58, VIEW_H - 27, "#a5f3fc", 1, true);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pointerToWorld = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const src = sourceRect(zoomRef.current, panRef.current);
    return {
      x: src.x + ((e.clientX - rect.left) / rect.width) * src.w,
      y: src.y + ((e.clientY - rect.top) / rect.height) * src.h,
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, pan: { ...panRef.current }, moved: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const src = sourceRect(zoomRef.current, panRef.current);
    const dx = ((e.clientX - drag.x) / rect.width) * src.w;
    const dy = ((e.clientY - drag.y) / rect.height) * src.h;
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true;
    updatePan({ x: drag.pan.x - dx, y: drag.pan.y - dy });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved) return;
    const point = pointerToWorld(e);
    const jx = jeepX(tRef.current);
    let hit: PoiId | null = null;
    if (point.x >= jx - 5 && point.x <= jx + JEEP_W + 5 && point.y >= 180 && point.y <= 238) hit = "jeep";
    else if (point.x >= 349 && point.x <= 632 && point.y >= 108 && point.y <= 305) hit = "court";
    else if (point.x >= 24 && point.x <= 185 && point.y >= 100 && point.y <= 196) hit = "store";
    else if (point.x >= 179 && point.x <= 311 && point.y >= 99 && point.y <= 193) hit = "house";
    if (hit) {
      sfx.uiClick();
      choosePoi(hit);
    } else choosePoi(null);
  };

  const baseSelectedCopy = selected ? POI_COPY[selected] : null;
  const selectedCopy = baseSelectedCopy && selected === "court" && pht.phase === "night"
    ? {
        ...baseSelectedCopy,
        subtitle: "ILIGAN CITY · CLOSED AFTER DARK · NO GAMES",
        body: `It's ${pht.formatted}. The Brgy. Upper Hinaplanon court is closed for the night: no players, no moving ball, scoreboard off, and court lights out. Games resume at dawn.`,
      }
    : baseSelectedCopy;
  const zoomLabel = `${zoom.toFixed(1)}×`;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 text-base sm:text-lg">
        <span className="inline-flex items-center gap-1.5 text-cyan-neon">
          <Crosshair size={14} className="text-pink-neon" /> LIVE NEIGHBORHOOD VIEW
        </span>
        <span className="text-amber-neon whitespace-nowrap">{pht.formatted}</span>
      </div>

      <div className="relative border-[3px] border-black bg-abyss shadow-[0_0_0_2px_#2e2a55] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          className="pixelated block w-full aspect-[16/9] cursor-crosshair touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { dragRef.current = null; }}
          aria-label="Interactive telescope view of the Philippine neighborhood with a jeepney and basketball court"
        />
        <span className="absolute left-2 bottom-1.5 pointer-events-none font-term text-sm sm:text-base text-cyan-neon/80 bg-abyss/55 px-1">
          CLICK JEEPNEY / COURT / STORE FOR DETAILS
        </span>
      </div>

      <div className="grid grid-cols-[auto_auto_auto_1fr_auto] items-center gap-1.5">
        <button className="pix-btn px-2.5 py-2 text-[9px]" onClick={() => changeZoom(zoomRef.current - 0.5)} disabled={zoom <= 1} aria-label="Zoom out">
          <Minus size={13} />
        </button>
        <span className="pix-inset px-2.5 py-2 min-w-[52px] text-center font-pixel text-[9px] text-amber-neon">{zoomLabel}</span>
        <button className="pix-btn px-2.5 py-2 text-[9px]" onClick={() => changeZoom(zoomRef.current + 0.5)} disabled={zoom >= 3} aria-label="Zoom in">
          <Plus size={13} />
        </button>
        <span className="font-term text-base text-dim text-center hidden sm:block">pan {Math.round(pan.x)},{Math.round(pan.y)}</span>
        <button className="pix-btn px-2.5 py-2 text-[8px] flex items-center gap-1" onClick={resetView}>
          <RotateCcw size={12} /> RESET
        </button>
      </div>

      <label className="pix-inset px-3 py-2 flex items-center gap-3">
        <Focus size={15} className="text-cyan-neon shrink-0" />
        <span className="font-pixel text-[8px] text-bone shrink-0">FOCUS</span>
        <input
          type="range"
          min="0"
          max="100"
          value={focus}
          onChange={(e) => {
            const value = Number(e.target.value);
            focusRef.current = value;
            setFocus(value);
          }}
          className="flex-1 accent-violet-neon cursor-pointer min-w-0"
          aria-label="Telescope focus"
        />
        <span className="font-term text-lg text-amber-neon w-10 text-right">{focus}%</span>
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <button className={`pix-btn px-2 py-2.5 text-[8px] flex items-center justify-center gap-1.5 ${selected === "jeep" ? "is-active" : ""}`} onClick={() => centerOn("jeep")}>
          <Bus size={13} /> JEEPNEY
        </button>
        <button className={`pix-btn px-2 py-2.5 text-[8px] flex items-center justify-center gap-1.5 ${selected === "court" ? "is-active" : ""}`} onClick={() => centerOn("court")}>
          <CircleDot size={13} /> COURT
        </button>
        <button className={`pix-btn px-2 py-2.5 text-[8px] flex items-center justify-center gap-1.5 ${selected === "store" ? "is-active" : ""}`} onClick={() => centerOn("store")}>
          <Store size={13} /> SARI-SARI
        </button>
        <button className={`pix-btn px-2 py-2.5 text-[8px] flex items-center justify-center gap-1.5 ${selected === "house" ? "is-active" : ""}`} onClick={() => centerOn("house")}>
          <Home size={13} /> HOMES
        </button>
      </div>

      {selectedCopy ? (
        <div className="pix-inset p-3 border-l-4 border-l-amber-neon">
          <p className="font-pixel text-[9px] text-amber-neon leading-relaxed">{selectedCopy.title}</p>
          <p className="text-cyan-neon text-base mt-0.5">{selectedCopy.subtitle}</p>
          <p className="text-xl leading-tight mt-1.5">{selectedCopy.body}</p>
        </div>
      ) : (
        <div className="pix-inset p-3 flex gap-2 items-start">
          <MousePointer2 size={15} className="text-cyan-neon shrink-0 mt-1" />
          <p className="text-xl leading-tight text-dim">
            There it is: the neighborhood. A jeepney is making its route down Cipher Street, and the Brgy. Upper Hinaplanon court is {pht.phase === "night" ? "closed and empty after dark" : "hosting a pickup game"}. Drag to look around, zoom in, or pull focus.
          </p>
        </div>
      )}
    </div>
  );
}
