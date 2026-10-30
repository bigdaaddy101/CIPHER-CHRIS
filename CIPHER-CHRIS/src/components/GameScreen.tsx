import { useEffect, useRef, useState } from "react";
import {
  Volume2, VolumeX, Pause, Play, RotateCcw, Home, Briefcase, Mail, Eye, Hand,
  MessageSquare, Backpack, Lightbulb, X, Zap, Smartphone, Check, MousePointer2, Camera,
  Sun, Moon, Sunrise, Sunset, Maximize, Minimize,
} from "lucide-react";
import { VW, VH } from "../game/types";
import type { DialogLine, Flags, Hotspot, PanelId, PoseKind, PoseRequest, RoomId, Verb } from "../game/types";
import { ROOMS, ROOM_ORDER, txt } from "../game/rooms";
import { drawSprite, spriteSize } from "../game/sprites";
import { ITEMS } from "../game/content";
import { WALL_PHOTOS } from "../game/wallPhotos";
import type { WallPhotoId } from "../game/wallPhotos";
import { usePhTime, cycleTimeMode, setTimeMode, getPhTime } from "../game/phTime";
import type { TimeMode } from "../game/phTime";
import { createCatState, updateCat, catSprite, catAlpha } from "../game/catAI";
import type { CatState } from "../game/catAI";
import { sfx } from "../game/sound";
import {
  getIntroLines, runInteraction, useItemAlone, combineItems, lookItem,
  currentObjective, serverHint, resetScript,
} from "../game/interactions";
import type { ScriptCtx } from "../game/interactions";
import { InfoPanel } from "./Panels";
import { PixelSprite } from "./PixelSprite";

const VERB_LABEL: Record<Verb, string> = { look: "Look at", use: "Use", talk: "Talk to" };

const FIRST_LINES: Partial<Record<RoomId, string>> = {
  kitchen: "The kitchen. Fuel depot of champions. Something in here smells like a solution. Possibly pizza-shaped.",
  bedroom: "Bedroom / office / cave. The trifecta. Somewhere in here, order battles chaos and chaos is winning on points.",
  hallway: "The hallway. Every door a different side quest. The clock insists it's 03:47. The clock is not wrong.",
  server: "The server room. 18 degrees, 60 decibels, 100% the heart of the operation. Mind the cables.",
  bathroom: "The bathroom. Home of the world's most qualified debugging consultant. He floats. He judges. He knows.",
  gameroom: "The game room. Morale department. Productivity's natural predator. That arcade cabinet owes me glory.",
  rooftop: "The rooftop. Best signal in a five-mile radius, worst weather in a five-minute radius. Worth it.",
};

interface CharState { x: number; y: number; tx: number; ty: number; face: 1 | -1; moving: boolean; phase: number; stepAcc: number }
interface Pending { h: Hotspot; verb: Verb; item: string | null }
interface ActivePose extends PoseRequest { room: RoomId; face: 1 | -1 }
interface PoseState extends Omit<ActivePose, "kind"> { kind: PoseKind }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function GameScreen({ onInfoOnly, active = true }: { onInfoOnly: () => void; active?: boolean }) {
  /* ---- render state (mirrored into refs for the engine) ---- */
  const [room, setRoom] = useState<RoomId>("living");
  const [inv, setInv] = useState<string[]>([]);
  const [flags, setFlags] = useState<Flags>({});
  const [score, setScore] = useState(0);
  const [dialog, setDialog] = useState<{ lines: DialogLine[]; idx: number } | null>(null);
  const [shown, setShown] = useState(0);
  const [panel, setPanel] = useState<PanelId>(null);
  const [activePhoto, setActivePhoto] = useState<WallPhotoId>("living-gallery");
  const [seenPhotos, setSeenPhotos] = useState<WallPhotoId[]>([]);
  const seenPhotosRef = useRef<WallPhotoId[]>([]);
  const [stuffOpen, setStuffOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [activeVerb, setActiveVerb] = useState<Verb | null>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(sfx.isMuted);
  const [sentence, setSentence] = useState("Click to walk · verbs + click to interact");
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);
  const [roomCard, setRoomCard] = useState<{ name: string; sub: string; key: number } | null>(null);
  const [visited, setVisited] = useState<RoomId[]>(["living"]);
  const [turboLeft, setTurboLeft] = useState(0);
  const [showRotate, setShowRotate] = useState(false);
  const [rotateDismissed, setRotateDismissed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameRootRef = useRef<HTMLDivElement>(null);
  const pht = usePhTime();

  /* ---- engine refs ---- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roomRef = useRef<RoomId>("living");
  const invRef = useRef<string[]>([]);
  const flagsRef = useRef<Flags>({});
  const dialogRef = useRef<{ lines: DialogLine[]; idx: number } | null>(null);
  const dialogAfterRef = useRef<(() => void) | undefined>(undefined);
  const typeDoneRef = useRef(false);
  const panelRef = useRef<PanelId>(null);
  const stuffRef = useRef(false);
  const pausedRef = useRef(false);
  const selectedItemRef = useRef<string | null>(null);
  const activeVerbRef = useRef<Verb | null>(null);
  const visitedRef = useRef<RoomId[]>(["living"]);
  const scoredRef = useRef<Set<string>>(new Set());
  const charRef = useRef<CharState>({ x: 156, y: 156, tx: 156, ty: 156, face: 1, moving: false, phase: 0, stepAcc: 0 });
  const catRef = useRef<CatState>(createCatState());
  const poseRef = useRef<PoseState>({ kind: "stand", room: "living", x: 156, y: 156, face: 1, label: "", exitX: 156, exitY: 156 });
  const pendingRef = useRef<Pending | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, inside: false });
  const hoverRef = useRef<Hotspot | null>(null);
  const sentenceRef = useRef("");
  const fadeRef = useRef<{ phase: "in" | "out" | null; a: number; cb?: () => void }>({ phase: "in", a: 1 });
  const bgCacheRef = useRef<Map<RoomId, HTMLCanvasElement>>(new Map());
  const tRef = useRef(0);
  const turboUntilRef = useRef(0);
  const turboShownRef = useRef(0);
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

  /* ---- dual setters (state + ref) ---- */
  const setRoomBoth = (r: RoomId) => { roomRef.current = r; setRoom(r); };
  const setInvBoth = (a: string[]) => { invRef.current = a; setInv(a); };
  const setSelectedBoth = (i: string | null) => { selectedItemRef.current = i; setSelectedItem(i); };
  const setVerbBoth = (v: Verb | null) => { activeVerbRef.current = v; setActiveVerb(v); };
  const setPanelBoth = (p: PanelId) => { panelRef.current = p; setPanel(p); };
  const setStuffBoth = (b: boolean) => { stuffRef.current = b; setStuffOpen(b); };
  const setPausedBoth = (b: boolean) => { pausedRef.current = b; setPaused(b); };

  const stopChar = () => {
    const c = charRef.current;
    c.tx = c.x; c.ty = c.y; c.moving = false;
    pendingRef.current = null;
  };

  const showToast = (msg: string) => setToast({ msg, id: Date.now() });

  const clearPose = () => {
    poseRef.current = { ...poseRef.current, kind: "stand" };
  };

  const applyPose = (req: PoseRequest) => {
    const c = charRef.current;
    const face = req.face ?? 1;
    c.x = req.x;
    c.y = req.y;
    c.tx = req.x;
    c.ty = req.y;
    c.face = face;
    c.moving = false;
    pendingRef.current = null;
    poseRef.current = { ...req, face, room: roomRef.current };
    showToast(req.kind === "lay" ? "LYING DOWN — CLICK / SPACE TO GET UP" : "SITTING — CLICK / SPACE TO STAND UP");
  };

  function standUp() {
    if (poseRef.current.kind === "stand") return;
    const p = poseRef.current;
    const c = charRef.current;
    c.x = p.exitX;
    c.y = p.exitY;
    c.tx = p.exitX;
    c.ty = p.exitY;
    c.moving = false;
    clearPose();
    showToast("BACK ON YOUR FEET");
  }

  /* ---- script API ---- */
  const api = useRef<ScriptCtx>(null as unknown as ScriptCtx);
  api.current = {
    say: (lines, after) => {
      stopChar();
      dialogAfterRef.current = after;
      const d = { lines, idx: 0 };
      dialogRef.current = d;
      setDialog(d);
    },
    give: (item) => {
      if (!invRef.current.includes(item)) {
        setInvBoth([...invRef.current, item]);
        sfx.pickup();
        showToast(`GOT: ${ITEMS[item]?.name ?? item}`);
      }
    },
    take: (item) => setInvBoth(invRef.current.filter((i) => i !== item)),
    has: (item) => invRef.current.includes(item),
    flag: (k) => !!flagsRef.current[k],
    setFlag: (k, v = true) => {
      flagsRef.current = { ...flagsRef.current, [k]: v };
      setFlags(flagsRef.current);
    },
    openPanel: (p) => setPanelBoth(p),
    setPose: (req) => applyPose(req),
    openPhoto: (id) => {
      sfx.shutter();
      setActivePhoto(id);
      if (!seenPhotosRef.current.includes(id)) {
        const next = [...seenPhotosRef.current, id];
        seenPhotosRef.current = next;
        setSeenPhotos(next);
        showToast(
          next.length === WALL_PHOTOS.length
            ? "GALLERY COMPLETE: ALL 8 WALL PHOTOS INSPECTED!"
            : `WALL PHOTO INSPECTED (${next.length}/${WALL_PHOTOS.length})`
        );
      }
      setPanelBoth("photos");
    },
    gotoRoom: (dest) => {
      if (fadeRef.current.phase) return;
      clearPose();
      sfx.door();
      const from = roomRef.current;
      fadeRef.current = {
        phase: "out",
        a: 0,
        cb: () => {
          setRoomBoth(dest);
          const e = ROOMS[dest].entries[from] ?? ROOMS[dest].entries.default;
          charRef.current = { ...charRef.current, x: e.x, y: e.y, tx: e.x, ty: e.y, moving: false };
          pendingRef.current = null;
          setRoomCard({ name: ROOMS[dest].name, sub: ROOMS[dest].sub, key: Date.now() });
          if (!visitedRef.current.includes(dest)) {
            visitedRef.current = [...visitedRef.current, dest];
            setVisited(visitedRef.current);
            if (visitedRef.current.length === 8) {
              window.setTimeout(() => api.current.score(10, "allRooms"), 300);
              showToast("ACHIEVEMENT: VISITED EVERY ROOM");
            }
            const line = FIRST_LINES[dest];
            if (line) window.setTimeout(() => {
              if (!dialogRef.current) api.current.say([{ who: "CIPHER CHRIS", color: "#e8e6f7", text: line }]);
            }, 750);
          }
        },
      };
    },
    score: (n, key) => {
      if (scoredRef.current.has(key)) return;
      scoredRef.current.add(key);
      setScore((s) => s + n);
      window.setTimeout(() => showToast(`+${n} PTS`), 350);
    },
    toast: showToast,
    turbo: (seconds) => { turboUntilRef.current = performance.now() + seconds * 1000; },
  };
  const getCtx = () => api.current;

  /* ---- dialog engine ---- */
  useEffect(() => {
    if (!dialog) return;
    setShown(0);
    typeDoneRef.current = false;
    const len = dialog.lines[dialog.idx].text.length;
    let n = 0;
    const iv = window.setInterval(() => {
      if (typeDoneRef.current) { window.clearInterval(iv); return; }
      n += 2;
      if (n % 6 === 0) sfx.dialogBlip();
      if (n >= len) { setShown(len); typeDoneRef.current = true; window.clearInterval(iv); }
      else setShown(n);
    }, 22);
    return () => window.clearInterval(iv);
  }, [dialog]);

  const advanceDialog = () => {
    const d = dialogRef.current;
    if (!d) return;
    sfx.uiClick();
    const full = d.lines[d.idx].text.length;
    if (!typeDoneRef.current) { typeDoneRef.current = true; setShown(full); return; }
    if (d.idx + 1 < d.lines.length) {
      const nd = { lines: d.lines, idx: d.idx + 1 };
      dialogRef.current = nd;
      setDialog(nd);
    } else {
      dialogRef.current = null;
      setDialog(null);
      const a = dialogAfterRef.current;
      dialogAfterRef.current = undefined;
      a?.();
    }
  };

  /* ---- canvas engine ---- */
  const bgFor = (r: RoomId): HTMLCanvasElement => {
    const cache = bgCacheRef.current;
    let cv = cache.get(r);
    if (!cv) {
      cv = document.createElement("canvas");
      cv.width = VW; cv.height = VH;
      const g = cv.getContext("2d")!;
      g.imageSmoothingEnabled = false;
      ROOMS[r].paint(g);
      cache.set(r, cv);
    }
    return cv;
  };

  /** Live hotspot that follows Pixel around whichever room he's in. */
  const catHotspot = (): Hotspot | null => {
    const cat = catRef.current;
    if (cat.room !== roomRef.current) return null;
    if (cat.mood === "inDoor" || catAlpha(cat) < 0.5) return null;
    const { name } = catSprite(cat);
    const { w, h } = spriteSize(name);
    const [wy0, wy1] = ROOMS[cat.room].walkY;
    const standY = clamp(cat.y + 6, wy0, wy1);
    return {
      id: "cat",
      name: "PIXEL THE CAT",
      x: cat.x - w / 2 - 2,
      y: cat.y - h - 2,
      w: w + 4,
      h: h + 4,
      standX: clamp(cat.x + (cat.face > 0 ? -22 : 22), 15, VW - 15),
      standY,
      defVerb: "talk",
    };
  };

  const pickHotspot = (gx: number, gy: number): Hotspot | null => {
    let best: Hotspot | null = null;
    let bestArea = Infinity;
    const ch = catHotspot();
    const list = ch ? [ch, ...ROOMS[roomRef.current].hotspots] : ROOMS[roomRef.current].hotspots;
    for (const h of list) {
      if (h.when && !h.when(flagsRef.current)) continue;
      if (gx >= h.x && gx < h.x + h.w && gy >= h.y && gy < h.y + h.h) {
        const a = h.w * h.h;
        if (a < bestArea) { best = h; bestArea = a; }
      }
    }
    return best;
  };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!activeRef.current) { last = now; return; }
      const cv = canvasRef.current;
      if (!cv) return;
      const g = cv.getContext("2d");
      if (!g) return;
      g.imageSmoothingEnabled = false;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const frozen = pausedRef.current || panelRef.current !== null;
      if (!frozen) tRef.current += dt;
      const t = tRef.current;
      const roomDef = ROOMS[roomRef.current];
      const c = charRef.current;

      /* fade */
      const f = fadeRef.current;
      if (f.phase === "out") {
        f.a += dt * 3.4;
        if (f.a >= 1) { f.a = 1; f.phase = "in"; const cb = f.cb; f.cb = undefined; cb?.(); }
      } else if (f.phase === "in") {
        f.a -= dt * 3.4;
        if (f.a <= 0) { f.a = 0; f.phase = null; }
      }

      /* movement (disabled while sitting or lying down) */
      if (!frozen && !f.phase && poseRef.current.kind === "stand") {
        const dx = c.tx - c.x;
        const dy = c.ty - c.y;
        const dist = Math.hypot(dx, dy);
        const turbo = performance.now() < turboUntilRef.current;
        const speed = turbo ? 118 : 64;
        if (dist > 1.6) {
          const step = Math.min(dist, speed * dt);
          c.x += (dx / dist) * step;
          c.y += (dy / dist) * step;
          if (Math.abs(dx) > 2) c.face = dx > 0 ? 1 : -1;
          c.moving = true;
          c.phase += dt * (turbo ? 13 : 9);
          c.stepAcc += dt;
          if (c.stepAcc > 0.24) { c.stepAcc = 0; sfx.walkStep(); }
        } else {
          if (c.moving) { c.x = c.tx; c.y = c.ty; }
          c.moving = false;
          if (pendingRef.current) {
            const p = pendingRef.current;
            pendingRef.current = null;
            setVerbBoth(null);
            runInteraction(getCtx(), p.h, p.verb, p.item);
          }
        }
        const left = Math.max(0, Math.ceil((turboUntilRef.current - performance.now()) / 1000));
        if (left !== turboShownRef.current) { turboShownRef.current = left; setTurboLeft(left); }
      }

      /* ---- cat AI ---- */
      const cat = catRef.current;
      if (!frozen && !f.phase) {
        updateCat(cat, dt, roomRef.current, c.x, c.y, !!flagsRef.current.catFed, () => sfx.meow());
      }

      /* ---- render ---- */
      g.drawImage(bgFor(roomRef.current), 0, 0);
      roomDef.dynamics?.(g, t, flagsRef.current);

      const drawCat = () => {
        if (cat.room !== roomRef.current) return;
        const alpha = catAlpha(cat);
        if (alpha <= 0.02) return;
        g.save();
        g.globalAlpha = alpha;
        const { name, flip } = catSprite(cat);
        const { w: cw, h: chh } = spriteSize(name);
        const [cy0, cy1] = roomDef.walkY;
        const cdepth = cat.mood === "perch" ? 0.35 : clamp((cat.y - cy0) / Math.max(1, cy1 - cy0), 0, 1);
        const cscale = 0.9 + cdepth * 0.16;
        const cbob = cat.moving ? Math.abs(Math.sin(cat.phase * Math.PI)) * 0.8 : 0;
        if (cat.mood !== "perch") {
          g.fillStyle = "rgba(0,0,0,0.38)";
          g.fillRect(Math.round(cat.x - 7 * cscale), Math.round(cat.y - 1), Math.round(14 * cscale), 2);
        }
        // Until he's fed, Pixel is sitting on / carrying the USB drive wherever he roams.
        if (!flagsRef.current.usbTaken) {
          g.fillStyle = "#00e5ff";
          g.fillRect(Math.round(cat.x + (flip ? -8 : 4)), Math.round(cat.y - 2), 4, 2);
          g.fillStyle = "#c4b5fd";
          g.fillRect(Math.round(cat.x + (flip ? -8 : 4)), Math.round(cat.y - 2), 1, 1);
        }
        drawSprite(g, name, cat.x - (cw * cscale) / 2, cat.y - chh * cscale - cbob, flip, cscale);
        if (cat.mood === "nap") {
          const zy = cat.y - chh - 4 - ((t * 6) % 10);
          txt(g, "Z", cat.x + 8 + Math.sin(t * 2) * 1.5, zy, "#9d97c9");
        }
        g.restore();
      };

      // character: standing/walking, seated on furniture, or lying on the bed
      const [wy0, wy1] = roomDef.walkY;
      const depth = clamp((c.y - wy0) / Math.max(1, wy1 - wy0), 0, 1);
      const scale = 0.9 + depth * 0.16;
      const blink = t % 3.4 < 0.12;
      const walkFrames = ["charWalk", "charIdle", "charWalk2", "charIdle"] as const;
      const poseKind = poseRef.current.room === roomRef.current ? poseRef.current.kind : "stand";
      const standingSprite = c.moving ? walkFrames[Math.floor(c.phase) % 4] : blink ? "charBlink" : "charIdle";
      const sprName = poseKind === "lay" ? "charLay" : poseKind === "sit" ? "charSit" : standingSprite;
      const { w, h } = spriteSize(sprName);
      const bob = poseKind === "stand" && c.moving ? Math.abs(Math.sin(c.phase * Math.PI * 0.5)) * 1.3 : 0;

      const drawPlayer = () => {
        if (poseKind === "lay") {
          // Horizontal 54x20 sprite rests directly on top of the mattress.
          drawSprite(g, "charLay", c.x - (w * scale) / 2, c.y - h * scale, c.face < 0, scale);
          return;
        }
        g.fillStyle = "rgba(0,0,0,0.44)";
        g.fillRect(Math.round(c.x - 10 * scale), Math.round(c.y - 1), Math.round(20 * scale), 3);
        drawSprite(g, sprName, c.x - (w * scale) / 2, c.y - h * scale - bob, c.face < 0, scale);
      };

      // depth sort: whoever stands further back (smaller y) draws first
      const catBehind = cat.mood === "perch" || cat.y <= c.y;
      if (catBehind) drawCat();
      drawPlayer();
      if (!catBehind) drawCat();

      // hover brackets
      const m = mouseRef.current;
      const hov = m.inside && !dialogRef.current && !pausedRef.current && !panelRef.current ? pickHotspot(m.x, m.y) : null;
      hoverRef.current = hov;
      if (hov) {
        g.strokeStyle = "rgba(251,191,36,0.85)";
        g.lineWidth = 1;
        const L = 4;
        const { x, y, w: hw, h: hh } = hov;
        g.beginPath();
        g.moveTo(x, y + L); g.lineTo(x, y); g.lineTo(x + L, y);
        g.moveTo(x + hw - L, y); g.lineTo(x + hw, y); g.lineTo(x + hw, y + L);
        g.moveTo(x + hw, y + hh - L); g.lineTo(x + hw, y + hh); g.lineTo(x + hw - L, y + hh);
        g.moveTo(x + L, y + hh); g.lineTo(x, y + hh); g.lineTo(x, y + hh - L);
        g.stroke();
      }

      // crosshair cursor
      if (m.inside && !panelRef.current && !pausedRef.current) {
        const col = hov ? "#fbbf24" : "#22d3ee";
        g.fillStyle = col;
        const mx = Math.round(m.x), my = Math.round(m.y);
        g.fillRect(mx - 5, my, 4, 1); g.fillRect(mx + 2, my, 4, 1);
        g.fillRect(mx, my - 5, 1, 4); g.fillRect(mx, my + 2, 1, 4);
        g.fillRect(mx, my, 1, 1);
        const sel = selectedItemRef.current;
        if (sel && ITEMS[sel]) drawSprite(g, ITEMS[sel].icon, mx + 7, my + 7);
      }

      // fade overlay
      if (f.a > 0) {
        g.fillStyle = `rgba(4,3,12,${f.a})`;
        g.fillRect(0, 0, VW, VH);
      }

      /* sentence line */
      let s: string;
      const sel = selectedItemRef.current;
      const hovName = hov ? (hov.label ? hov.label() : hov.name) : "";
      if (dialogRef.current) s = "…";
      else if (poseKind === "lay") s = "Lying in bed — click anywhere / SPACE to get up";
      else if (poseKind === "sit") s = `Sitting on ${poseRef.current.label} — click anywhere / SPACE to stand up`;
      else if (sel) s = hov ? `Use ${ITEMS[sel].name} with ${hovName}` : `Use ${ITEMS[sel].name} with …`;
      else if (hov) {
        const v = activeVerbRef.current ?? hov.defVerb;
        s = hov.door && v === "use" ? `Go to ${ROOMS[hov.door].name}` : `${VERB_LABEL[v]} ${hovName}`;
      } else s = m.inside ? "Walk to …" : "Click to walk · verbs + click to interact";
      if (s !== sentenceRef.current) { sentenceRef.current = s; setSentence(s); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* intro + room card */
  useEffect(() => {
    const id = window.setTimeout(() => api.current.say(getIntroLines()), 500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!roomCard) return;
    const id = window.setTimeout(() => setRoomCard(null), 2300);
    return () => window.clearTimeout(id);
  }, [roomCard]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  /* landscape suggestion */
  useEffect(() => {
    const check = () => setShowRotate(window.innerHeight > window.innerWidth && window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  /* keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (e.code === "Space" || e.code === "Enter") {
        if (dialogRef.current) { e.preventDefault(); advanceDialog(); }
        else if (poseRef.current.kind !== "stand") { e.preventDefault(); standUp(); }
        return;
      }
      if (e.code === "Escape") {
        if (panelRef.current) setPanelBoth(null);
        else if (stuffRef.current) setStuffBoth(false);
        else if (selectedItemRef.current || activeVerbRef.current) { setSelectedBoth(null); setVerbBoth(null); }
        else if (poseRef.current.kind !== "stand") standUp();
        else setPausedBoth(!pausedRef.current);
        return;
      }
      if (dialogRef.current) return;
      const k = e.key.toLowerCase();
      if (k === "i") { sfx.uiClick(); setStuffBoth(!stuffRef.current); }
      else if (k === "p") setPausedBoth(!pausedRef.current);
      else if (k === "m") toggleMute();
      else if (k === "f") void toggleFullscreen();
      else if (k === "l") setVerbBoth(activeVerbRef.current === "look" ? null : "look");
      else if (k === "u") setVerbBoth(activeVerbRef.current === "use" ? null : "use");
      else if (k === "t") setVerbBoth(activeVerbRef.current === "talk" ? null : "talk");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- input handlers ---- */
  const toGame = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      gx: ((e.clientX - rect.left) / rect.width) * VW,
      gy: ((e.clientY - rect.top) / rect.height) * VH,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { gx, gy } = toGame(e);
    mouseRef.current = { x: gx, y: gy, inside: true };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    sfx.init();
    if (dialogRef.current) { advanceDialog(); return; }
    if (pausedRef.current || panelRef.current || stuffRef.current || fadeRef.current.phase) return;
    if (poseRef.current.kind !== "stand") { standUp(); return; }
    const { gx, gy } = toGame(e);
    const roomDef = ROOMS[roomRef.current];
    const h = pickHotspot(gx, gy);
    const c = charRef.current;
    if (h) {
      const item = selectedItemRef.current;
      const verb: Verb = item ? "use" : (activeVerbRef.current ?? h.defVerb);
      c.tx = clamp(h.standX, 15, VW - 15);
      c.ty = clamp(h.standY, roomDef.walkY[0], roomDef.walkY[1]);
      pendingRef.current = { h, verb, item };
      if (item) setSelectedBoth(null);
      sfx.uiClick();
    } else {
      pendingRef.current = null;
      if (selectedItemRef.current) setSelectedBoth(null);
      c.tx = clamp(gx, 15, VW - 15);
      c.ty = clamp(gy, roomDef.walkY[0], roomDef.walkY[1]);
    }
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedBoth(null);
    setVerbBoth(null);
    pendingRef.current = null;
    stopChar();
    standUp();
  };

  /* ---- toolbar actions ---- */
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (gameRootRef.current?.requestFullscreen) {
        await gameRootRef.current.requestFullscreen();
      } else {
        showToast("FULLSCREEN IS NOT SUPPORTED BY THIS BROWSER");
      }
    } catch {
      showToast("FULLSCREEN WAS BLOCKED — THE GAME STILL FILLS THE PAGE");
    }
  };

  const mutedRef = useRef(false);
  const toggleMute = () => {
    const m = !mutedRef.current;
    mutedRef.current = m;
    setMuted(m);
    sfx.setMuted(m);
    if (!m) sfx.uiClick();
  };

  const goHome = () => {
    if (dialogRef.current || fadeRef.current.phase) return;
    standUp(); // also returns to the saved safe floor position if seated/lying
    sfx.uiClick();
    setPanelBoth(null);
    setStuffBoth(false);
    setSelectedBoth(null);
    if (roomRef.current !== "living") {
      api.current.gotoRoom("living");
      showToast("HOME BASE");
    } else showToast("ALREADY HOME. THE CAT SAYS HI.");
  };

  const restart = () => {
    resetScript();
    clearPose();
    scoredRef.current.clear();
    setScore(0);
    flagsRef.current = {};
    setFlags({});
    setInvBoth([]);
    visitedRef.current = ["living"];
    setVisited(["living"]);
    seenPhotosRef.current = [];
    setSeenPhotos([]);
    setActivePhoto("living-gallery");
    setSelectedBoth(null);
    setVerbBoth(null);
    setPanelBoth(null);
    setStuffBoth(false);
    setPausedBoth(false);
    dialogRef.current = null;
    setDialog(null);
    dialogAfterRef.current = undefined;
    turboUntilRef.current = 0;
    setRoomBoth("living");
    charRef.current = { x: 156, y: 156, tx: 156, ty: 156, face: 1, moving: false, phase: 0, stepAcc: 0 };
    catRef.current = createCatState();
    pendingRef.current = null;
    fadeRef.current = { phase: "in", a: 1 };
    setRoomCard({ name: ROOMS.living.name, sub: ROOMS.living.sub, key: Date.now() });
    const cur = getPhTime();
    showToast(`GAME RESTARTED — ${cur.formatted} (${cur.phaseLabel})`);
    window.setTimeout(() => api.current.say(getIntroLines()), 600);
    sfx.powerup();
  };

  const handleCycleTime = () => {
    sfx.uiClick();
    const next = cycleTimeMode();
    const info = getPhTime();
    showToast(next === "live" ? `SYNCED LIVE TO PH: ${info.formatted}` : `SKY PREVIEW: ${info.phaseLabel} (${info.formatted})`);
  };

  const handlePickTime = (m: TimeMode) => {
    sfx.uiClick();
    setTimeMode(m);
    const info = getPhTime();
    showToast(m === "live" ? `SYNCED LIVE TO PH: ${info.formatted}` : `SKY PREVIEW: ${info.phaseLabel} (${info.formatted})`);
  };

  const giveHint = () => {
    if (dialogRef.current) return;
    sfx.uiClick();
    const lines: DialogLine[] = [{ who: "CIPHER CHRIS", color: "#e8e6f7", text: currentObjective(flagsRef.current, invRef.current) }];
    if (!flagsRef.current.catFed) {
      const catRoom = ROOMS[catRef.current.room].name;
      lines.push({
        who: "CIPHER CHRIS",
        color: "#e8e6f7",
        text: catRef.current.room === roomRef.current
          ? `Last I saw, Pixel was right here in the ${catRoom}. Keep an eye out — he doesn't sit still for long.`
          : `Last I heard him meow, Pixel was prowling around the ${catRoom}. He wanders, so move quick.`,
      });
    }
    const sh = serverHint(flagsRef.current, invRef.current);
    if (sh) lines.push({ who: "CIPHER CHRIS", color: "#e8e6f7", text: sh });
    api.current.say(lines);
  };

  /* ---- inventory handlers ---- */
  const onItemClick = (id: string) => {
    sfx.uiClick();
    const sel = selectedItemRef.current;
    if (sel && sel !== id) {
      setStuffBoth(false);
      setSelectedBoth(null);
      combineItems(getCtx(), sel, id);
      return;
    }
    setSelectedBoth(sel === id ? null : id);
  };

  const useSelected = () => {
    const sel = selectedItemRef.current;
    if (!sel) return;
    setStuffBoth(false);
    setSelectedBoth(null);
    useItemAlone(getCtx(), sel);
  };

  const lookSelected = () => {
    const sel = selectedItemRef.current;
    if (!sel) return;
    setStuffBoth(false);
    setSelectedBoth(null);
    lookItem(getCtx(), sel);
  };

  const curLine = dialog?.lines[dialog.idx];
  const lineDone = curLine ? shown >= curLine.text.length : false;

  /* =================== RENDER =================== */
  return (
    <div ref={gameRootRef} className="h-dvh w-full bg-void flex flex-col select-none overflow-hidden">
      {/* ---------- TOP BAR ---------- */}
      <header className="border-b-[3px] border-black bg-panel px-2 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 flex-wrap z-20 relative">
        <button onClick={goHome} className="font-pixel text-[10px] sm:text-xs text-pink-neon hover:text-white" title="cipher chris — home">
          cipher <span className="text-cyan-neon">chris</span>
        </button>
        <nav className="flex items-center gap-1.5 sm:gap-2 mx-auto">
          <button className="pix-btn px-2 sm:px-3 py-2 text-[8px] sm:text-[9px] flex items-center gap-1.5" onClick={goHome}>
            <Home size={12} /> HOME
          </button>
          <button className="pix-btn px-2 sm:px-3 py-2 text-[8px] sm:text-[9px] flex items-center gap-1.5" onClick={() => { if (!dialogRef.current) { sfx.uiClick(); setPanelBoth("services"); } }}>
            <Briefcase size={12} /> SERVICES
          </button>
          <button className="pix-btn px-2 sm:px-3 py-2 text-[8px] sm:text-[9px] flex items-center gap-1.5" onClick={() => { if (!dialogRef.current) { sfx.shutter(); setPanelBoth("photos"); } }} title="Inspect Wall Photos">
            <Camera size={12} /> <span className="hidden sm:inline">PHOTOS</span>
          </button>
          <button className="pix-btn pix-btn-pink px-2 sm:px-3 py-2 text-[8px] sm:text-[9px] flex items-center gap-1.5" onClick={() => { if (!dialogRef.current) { sfx.uiClick(); setPanelBoth("contact"); } }}>
            <Mail size={12} /> CONTACT
          </button>
        </nav>
        <button
          onClick={handleCycleTime}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 pix-inset hover:border-amber-neon font-term text-lg sm:text-xl text-amber-neon text-glow-amber cursor-pointer"
          title="Live Philippine Standard Time (Asia/Manila) — click to preview Dawn / Day / Sunset / Night!"
        >
          {pht.phase === "day" && <Sun size={14} className="text-amber-neon shrink-0" />}
          {pht.phase === "dawn" && <Sunrise size={14} className="text-pink-neon shrink-0" />}
          {pht.phase === "dusk" && <Sunset size={14} className="text-amber-neon shrink-0" />}
          {pht.phase === "night" && <Moon size={14} className="text-cyan-neon shrink-0" />}
          <span>
            {pht.hh12}<span className="pix-blink">:</span>{pht.mm} {pht.ampm}
          </span>
          <span className="text-sm text-cyan-neon font-pixel text-[7px] ml-0.5">
            {pht.isLive ? "PH LIVE" : pht.phaseLabel}
          </span>
        </button>
        <div className="hidden sm:block font-pixel text-[8px] sm:text-[9px] text-green-neon" title="Your adventure score">
          SCORE {String(score).padStart(3, "0")}/100
        </div>
        <div className="flex items-center gap-1.5">
          <button className="pix-btn w-8 h-8 grid place-items-center" onClick={() => void toggleFullscreen()} title="Toggle fullscreen (F)" aria-label="Toggle fullscreen">
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
          <button className="pix-btn w-8 h-8 grid place-items-center" onClick={toggleMute} title={muted ? "Unmute (M)" : "Mute (M)"} aria-label="Toggle sound">
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button className="pix-btn w-8 h-8 grid place-items-center" onClick={() => { sfx.uiClick(); setPausedBoth(!paused); }} title="Pause (P / ESC)" aria-label="Pause game">
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button className="pix-btn w-8 h-8 grid place-items-center" onClick={restart} title="Restart game" aria-label="Restart game">
            <RotateCcw size={14} />
          </button>
        </div>
        <button onClick={onInfoOnly} className="font-term text-lg text-dim hover:text-cyan-neon underline decoration-dotted underline-offset-4 whitespace-nowrap">
          in a hurry? info only →
        </button>
      </header>

      {/* ---------- STAGE ---------- */}
      <main className="flex-1 min-h-0 w-full overflow-hidden">
        <div className="crt relative [container-type:inline-size] w-full h-full bg-abyss overflow-hidden">
          <canvas
            ref={canvasRef}
            width={VW}
            height={VH}
            className="pixelated block w-full h-full cursor-none touch-none"
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerLeave={() => { mouseRef.current.inside = false; }}
            onContextMenu={onContextMenu}
          />

          {/* neon sign (living room) */}
          {room === "living" && (
            <div className="neon-sign absolute left-1/2 top-[3%] -translate-x-1/2 text-[3.6cqw] pointer-events-none z-10 whitespace-nowrap">
              cipher chris
            </div>
          )}

          {/* rotate suggestion */}
          {showRotate && !rotateDismissed && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pix-panel px-3 py-2 flex items-center gap-2 w-[92%]">
              <Smartphone size={16} className="text-cyan-neon rotate-90 shrink-0" />
              <p className="font-term text-lg leading-none flex-1">ROTATE TO LANDSCAPE for the full 1994 experience!</p>
              <button onClick={() => setRotateDismissed(true)} aria-label="Dismiss"><X size={16} /></button>
            </div>
          )}

          {/* room title card */}
          {roomCard && (
            <div key={roomCard.key} className="room-card absolute top-[5%] left-1/2 -translate-x-1/2 z-20 pix-panel px-4 py-2 text-center pointer-events-none">
              <div className="font-pixel text-[10px] sm:text-xs text-bone">{roomCard.name}</div>
              <div className="font-term text-cyan-neon text-lg leading-none mt-1">{roomCard.sub}</div>
            </div>
          )}

          {/* toast */}
          {toast && (
            <div key={toast.id} className="toast-in absolute top-[16%] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <span className="font-pixel text-[9px] sm:text-[10px] bg-abyss/85 text-amber-neon border-2 border-amber-neon/60 px-3 py-2 inline-block" style={{ boxShadow: "4px 4px 0 rgba(0,0,0,.6)" }}>
                {toast.msg}
              </span>
            </div>
          )}

          {/* turbo indicator */}
          {turboLeft > 0 && (
            <div className="absolute top-2 right-2 z-20 pointer-events-none">
              <span className="font-pixel text-[8px] bg-abyss/85 text-green-neon border-2 border-green-neon/60 px-2 py-1.5 inline-flex items-center gap-1">
                <Zap size={11} className="pix-blink-fast" /> TURBO {turboLeft}S
              </span>
            </div>
          )}

          {/* dialog box */}
          {dialog && curLine && (
            <button
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[94%] pix-panel p-3 text-left z-30"
              onClick={(e) => { e.stopPropagation(); advanceDialog(); }}
            >
              <span className="font-pixel text-[8px] sm:text-[9px]" style={{ color: curLine.color }}>{curLine.who}</span>
              <span className="block font-term text-xl sm:text-2xl leading-[0.95] text-bone min-h-[2.4em] mt-1">
                {curLine.text.slice(0, shown)}
                {!lineDone && <span className="text-violet-neon">▊</span>}
              </span>
              <span className="flex justify-between items-center text-dim font-term text-base leading-none">
                <span>{dialog.idx + 1}/{dialog.lines.length}</span>
                {lineDone && <span className="pix-blink text-amber-neon">▼ CLICK / SPACE</span>}
              </span>
            </button>
          )}

          {/* inventory: STUFF */}
          {stuffOpen && (
            <div className="absolute inset-x-0 bottom-0 z-40 p-2">
              <div className="pix-panel popup-in max-w-[620px] mx-auto">
                <div className="flex items-center gap-2 bg-panel2 px-3 py-2 border-b-2 border-line">
                  <Backpack size={14} className="text-amber-neon" />
                  <span className="font-pixel text-[10px] flex-1">STUFF <span className="text-dim">({inv.length})</span></span>
                  <button className="pix-btn w-6 h-6 grid place-items-center" onClick={() => { sfx.uiClick(); setStuffBoth(false); }} aria-label="Close inventory">
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
                {inv.length === 0 ? (
                  <p className="p-4 font-term text-xl text-dim text-center">Your pockets contain: lint, one (1) dead battery, and optimism. Explore to find STUFF.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-3">
                    {inv.map((id) => {
                      const def = ITEMS[id];
                      const sel = selectedItem === id;
                      return (
                        <button
                          key={id}
                          onClick={() => onItemClick(id)}
                          className={`pix-inset p-2 flex flex-col items-center gap-1 ${sel ? "!shadow-[inset_0_0_0_2px_#fbbf24,0_0_0_2px_#fbbf24] bg-amber-neon/10" : ""}`}
                          title={def.name}
                        >
                          <PixelSprite name={def.icon} scale={3} />
                          <span className="font-term text-base leading-none text-center">{def.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="px-3 pb-3 flex flex-wrap items-center gap-2">
                  <button className="pix-btn pix-btn-green px-3 py-2 text-[8px]" disabled={!selectedItem} onClick={useSelected}>USE</button>
                  <button className="pix-btn px-3 py-2 text-[8px]" disabled={!selectedItem} onClick={lookSelected}>LOOK</button>
                  <span className="font-term text-base text-dim leading-tight flex-1 min-w-[180px]">
                    {selectedItem
                      ? "click another item to COMBINE — or close this and click something in the room to use it there."
                      : "click an item to select it. some things combine. coffee + energy drink, anyone?"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* info panel */}
          {panel && (
            <InfoPanel
              panel={panel}
              onClose={() => setPanelBoth(null)}
              onNavigate={(p) => setPanelBoth(p)}
              photoId={activePhoto}
              seenPhotos={seenPhotos}
              onSelectPhoto={(id) => {
                setActivePhoto(id);
                if (!seenPhotosRef.current.includes(id)) {
                  const next = [...seenPhotosRef.current, id];
                  seenPhotosRef.current = next;
                  setSeenPhotos(next);
                }
              }}
            />
          )}

          {/* pause menu */}
          {paused && (
            <div className="absolute inset-0 z-50 bg-abyss/80 flex items-center justify-center p-3">
              <div className="pix-panel popup-in w-full max-w-[440px] p-5 max-h-full overflow-y-auto pix-scroll">
                <h2 className="font-pixel text-center text-sm text-bone">❚❚ PAUSED</h2>
                <p className="text-center font-term text-dim text-lg leading-tight mt-1">
                  Philippine Standard Time · <span className="text-amber-neon">{pht.formatted}</span> ({pht.phaseLabel})
                </p>
                <div className="pix-inset p-3 mt-3">
                  <p className="font-pixel text-[8px] text-cyan-neon">PHILIPPINE DAY &amp; NIGHT CYCLE (ASIA/MANILA)</p>
                  <div className="grid grid-cols-5 gap-1.5 mt-2">
                    {([
                      ["live", "PH LIVE"],
                      ["dawn", "DAWN"],
                      ["day", "DAY"],
                      ["dusk", "SUNSET"],
                      ["night", "NIGHT"],
                    ] as const).map(([m, label]) => (
                      <button
                        key={m}
                        onClick={() => handlePickTime(m)}
                        className={`pix-btn py-2 text-[7px] ${pht.mode === m ? "is-active" : ""}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pix-inset p-3 mt-3">
                  <p className="font-pixel text-[8px] text-cyan-neon">CURRENT OBJECTIVE</p>
                  <p className="font-term text-lg leading-tight mt-1">{currentObjective(flags, inv)}</p>
                  {serverHint(flags, inv) && <p className="font-term text-lg leading-tight text-dim mt-1">{serverHint(flags, inv)}</p>}
                </div>
                <div className="pix-inset p-3 mt-3">
                  <p className="font-pixel text-[8px] text-cyan-neon">HOUSE MAP — {visited.length}/8 ROOMS · PHOTOS {seenPhotos.length}/{WALL_PHOTOS.length} · SCORE {score}/100</p>
                  <div className="grid grid-cols-2 gap-x-3 mt-2">
                    {ROOM_ORDER.map((r) => (
                      <span key={r} className={`font-term text-lg leading-tight flex items-center gap-1.5 ${visited.includes(r) ? "text-bone" : "text-dim/60"}`}>
                        {visited.includes(r) ? <Check size={13} className="text-green-neon" /> : <span className="w-[13px] text-center">?</span>}
                        {visited.includes(r) ? ROOMS[r].name : "???"}
                        {room === r && <span className="text-amber-neon text-sm">← YOU</span>}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 mt-4">
                  <button className="pix-btn pix-btn-green py-3 text-[10px]" onClick={() => { sfx.uiClick(); setPausedBoth(false); }}>▶ RESUME</button>
                  <button className="pix-btn py-3 text-[10px]" onClick={toggleMute}>{muted ? "SOUND: OFF" : "SOUND: ON"}</button>
                  <button className="pix-btn py-3 text-[10px]" onClick={restart}>↺ RESTART GAME</button>
                  <button className="pix-btn pix-btn-pink py-3 text-[10px]" onClick={onInfoOnly}>IN A HURRY? INFO ONLY →</button>
                </div>
                <p className="font-term text-dim text-base leading-tight mt-4 text-center">
                  CONTROLS: click/tap to walk · verbs + click to interact · I = stuff · P = pause · M = mute · F = fullscreen · right-click cancels
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ---------- BOTTOM HUD (SCUMM BAR) ---------- */}
      <footer className="border-t-[3px] border-black bg-panel px-2 sm:px-4 py-2 z-20 relative">
        <div className="w-full flex items-center gap-2">
          <div className="flex gap-1.5 shrink-0">
            <button
              className={`pix-btn px-2 sm:px-3 py-2.5 text-[8px] sm:text-[9px] flex items-center gap-1.5 ${activeVerb === "look" ? "is-active" : ""}`}
              onClick={() => { sfx.uiClick(); setVerbBoth(activeVerb === "look" ? null : "look"); }}
              title="Look at (L)"
            >
              <Eye size={13} /> <span className="hidden sm:inline">LOOK AT</span>
            </button>
            <button
              className={`pix-btn px-2 sm:px-3 py-2.5 text-[8px] sm:text-[9px] flex items-center gap-1.5 ${activeVerb === "use" ? "is-active" : ""}`}
              onClick={() => { sfx.uiClick(); setVerbBoth(activeVerb === "use" ? null : "use"); }}
              title="Use (U)"
            >
              <Hand size={13} /> <span className="hidden sm:inline">USE</span>
            </button>
            <button
              className={`pix-btn px-2 sm:px-3 py-2.5 text-[8px] sm:text-[9px] flex items-center gap-1.5 ${activeVerb === "talk" ? "is-active" : ""}`}
              onClick={() => { sfx.uiClick(); setVerbBoth(activeVerb === "talk" ? null : "talk"); }}
              title="Talk to (T)"
            >
              <MessageSquare size={13} /> <span className="hidden sm:inline">TALK TO</span>
            </button>
          </div>

          <div className="pix-inset flex-1 px-3 py-2 min-w-0 flex items-center gap-2">
            <MousePointer2 size={13} className="text-cyan-neon shrink-0" />
            <span className="font-term text-xl text-amber-neon truncate leading-none pt-0.5">{sentence}</span>
            <span className="ml-auto font-term text-dim text-lg leading-none hidden md:block whitespace-nowrap">▸ {ROOMS[room].name}</span>
          </div>

          <button className="pix-btn w-10 h-10 grid place-items-center shrink-0" onClick={giveHint} title="What was I doing? (objective hint)" aria-label="Objective hint">
            <Lightbulb size={16} className="text-amber-neon" />
          </button>
          <button
            className={`pix-btn px-3 py-2.5 text-[9px] flex items-center gap-1.5 shrink-0 relative ${stuffOpen ? "is-active" : ""}`}
            onClick={() => { if (!dialogRef.current) { sfx.uiClick(); setStuffBoth(!stuffOpen); } }}
            title="Inventory (I)"
          >
            <Backpack size={14} /> STUFF
            {inv.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-pink-neon text-abyss font-pixel text-[8px] w-5 h-5 grid place-items-center border-2 border-black">{inv.length}</span>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
