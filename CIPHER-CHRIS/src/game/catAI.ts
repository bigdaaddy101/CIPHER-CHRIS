/* Pororo the Siamese — free-roaming cat brain.
   He roams the WHOLE house from the very start: wanders, pauses, naps,
   hops up on his couch perch, and — importantly — physically WALKS to a
   door, passes through it, and comes out the other side. No teleporting.
   Before he's fed he carries the USB drive with him wherever he goes.
   After pizza he's just a happy roamer. */

import type { RoomId, Hotspot } from "./types";
import { ROOMS, ROOM_ORDER } from "./rooms";

export type CatMood =
  | "perch"     // loafing on the couch
  | "wander"    // walking to a random floor spot
  | "pause"     // standing/sitting still
  | "nap"       // asleep
  | "follow"    // trailing the player
  | "toPerch"   // walking to the couch to hop up
  | "toDoor"    // walking to a door hotspot
  | "inDoor"    // passing through the doorway (invisible for a beat)
  | "exitDoor"; // just arrived, stepping away from the destination door

export interface CatState {
  room: RoomId;
  x: number;
  y: number;
  tx: number;
  ty: number;
  face: 1 | -1;
  moving: boolean;
  phase: number;
  mood: CatMood;
  moodTimer: number;
  /** seconds until the cat decides to change rooms */
  roomTimer: number;
  /** last known room of the player, to notice door transitions */
  lastPlayerRoom: RoomId;
  meowCooldown: number;
  /** pending door transit: where we're heading and which room we're leaving */
  transit: { dest: RoomId; from: RoomId } | null;
  /** 0..1 fade while stepping through a doorway */
  doorFade: number;
}

/** Couch perch (foot anchor) in the living room — Pororo's favourite spot. */
export const CAT_COUCH = { x: 168, y: 83 };
/** Floor point directly in front of the couch, used to hop on/off. */
const COUCH_FLOOR = { x: 170, y: 130 };

const CAT_SPEED = 34;
const DOOR_PASS_TIME = 0.55; // seconds spent "inside" the doorway

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function createCatState(): CatState {
  const c: CatState = {
    room: "living",
    x: COUCH_FLOOR.x,
    y: COUCH_FLOOR.y + 10,
    tx: COUCH_FLOOR.x,
    ty: COUCH_FLOOR.y + 10,
    face: 1,
    moving: false,
    phase: 0,
    mood: "wander",
    moodTimer: 12,
    roomTimer: rand(14, 26),
    lastPlayerRoom: "living",
    meowCooldown: 0,
    transit: null,
    doorFade: 0,
  };
  const p = randomFloorPoint("living");
  c.tx = p.x;
  c.ty = p.y;
  return c;
}

function randomFloorPoint(room: RoomId) {
  const [y0, y1] = ROOMS[room].walkY;
  return { x: rand(26, 294), y: rand(y0 + 2, y1 - 2) };
}

function clampToFloor(room: RoomId, x: number, y: number) {
  const [y0, y1] = ROOMS[room].walkY;
  return { x: Math.max(16, Math.min(304, x)), y: Math.max(y0 + 1, Math.min(y1 - 1, y)) };
}

/** Door hotspots leading out of `room` (server room is keycard-locked; the cat respects that). */
function doorsOf(room: RoomId): Hotspot[] {
  return ROOMS[room].hotspots.filter((h) => h.door && h.door !== "server");
}

function doorTo(room: RoomId, dest: RoomId): Hotspot | undefined {
  return doorsOf(room).find((h) => h.door === dest);
}

/** Rooms directly connected by a (usable) door from `room`. */
function neighbors(room: RoomId): RoomId[] {
  const out: RoomId[] = [];
  for (const h of doorsOf(room)) if (h.door && !out.includes(h.door)) out.push(h.door);
  return out;
}

function pickNewMood(c: CatState) {
  const r = Math.random();
  if (c.room === "living" && r < 0.18) {
    c.mood = "toPerch";
    c.tx = COUCH_FLOOR.x;
    c.ty = COUCH_FLOOR.y;
    c.moodTimer = 14;
  } else if (r < 0.6) {
    c.mood = "wander";
    const p = randomFloorPoint(c.room);
    c.tx = p.x;
    c.ty = p.y;
    c.moodTimer = 12;
  } else if (r < 0.82) {
    c.mood = "pause";
    c.moodTimer = rand(1.5, 4);
  } else {
    c.mood = "nap";
    c.moodTimer = rand(6, 14);
  }
}

/** Start walking toward the door that leads to `dest`. Returns false if no such door. */
function startDoorTransit(c: CatState, dest: RoomId): boolean {
  const d = doorTo(c.room, dest);
  if (!d) return false;
  const spot = clampToFloor(c.room, d.standX, d.standY);
  c.transit = { dest, from: c.room };
  c.mood = "toDoor";
  c.tx = spot.x;
  c.ty = spot.y;
  c.moodTimer = 20; // generous time budget to reach the door
  return true;
}

/** Having reached the door: step through (becomes briefly invisible). */
function enterDoorway(c: CatState) {
  c.mood = "inDoor";
  c.moving = false;
  c.doorFade = 0;
  c.moodTimer = DOOR_PASS_TIME;
}

/** Emerge on the far side: appear at the destination room's entry for the room we came from. */
function emergeFromDoor(c: CatState) {
  const t = c.transit;
  if (!t) { pickNewMood(c); return; }
  const roomDef = ROOMS[t.dest];
  const e = roomDef.entries[t.from] ?? roomDef.entries.default;
  const spot = clampToFloor(t.dest, e.x, e.y);
  c.room = t.dest;
  c.x = spot.x;
  c.y = spot.y;
  c.transit = null;
  c.doorFade = 1;
  // step a few paces into the room, away from the door, then resume normal roaming
  const dir = spot.x < 160 ? 1 : -1;
  const step = clampToFloor(t.dest, spot.x + dir * rand(22, 40), spot.y + rand(4, 12));
  c.mood = "exitDoor";
  c.tx = step.x;
  c.ty = step.y;
  c.face = dir as 1 | -1;
  c.moodTimer = 8;
  c.roomTimer = rand(20, 40);
}

/** Hop down from the couch onto the floor and start wandering. */
function hopOffPerch(c: CatState) {
  c.x = COUCH_FLOOR.x;
  c.y = COUCH_FLOOR.y;
  c.mood = "wander";
  const p = randomFloorPoint("living");
  c.tx = p.x;
  c.ty = p.y;
  c.moodTimer = 12;
}

/**
 * Advance the cat simulation.
 * @param playerRoom   room the player is currently in
 * @param playerX/Y    player's feet position (for follow mood)
 */
export function updateCat(
  c: CatState,
  dt: number,
  playerRoom: RoomId,
  playerX: number,
  playerY: number,
  _fed: boolean,
  onMeow?: () => void
) {
  c.meowCooldown = Math.max(0, c.meowCooldown - dt);
  const inTransit = c.mood === "toDoor" || c.mood === "inDoor" || c.mood === "exitDoor";

  // Notice when the player walks into a new room: sometimes trot after them — via the door.
  if (playerRoom !== c.lastPlayerRoom) {
    const playerWasHere = c.lastPlayerRoom === c.room;
    c.lastPlayerRoom = playerRoom;
    if (playerWasHere && !inTransit && c.mood !== "nap" && Math.random() < 0.45) {
      if (c.mood === "perch") hopOffPerch(c);
      if (startDoorTransit(c, playerRoom)) {
        if (c.meowCooldown <= 0 && onMeow) { onMeow(); c.meowCooldown = 6; }
      }
    }
  }

  c.moodTimer -= dt;
  if (!inTransit) c.roomTimer -= dt;

  // ---- doorway pass-through ----
  if (c.mood === "inDoor") {
    c.moving = false;
    c.doorFade = Math.min(1, c.doorFade + dt / DOOR_PASS_TIME);
    if (c.moodTimer <= 0) emergeFromDoor(c);
    return;
  }

  // Sitting on his perch: loaf for a while, then hop down.
  if (c.mood === "perch") {
    c.moving = false;
    if (c.moodTimer <= 0) hopOffPerch(c);
    return;
  }

  // Time to change rooms? Walk to a door (never while napping/following/already in transit).
  if (c.roomTimer <= 0 && !inTransit && c.mood !== "nap" && c.mood !== "follow") {
    const opts = neighbors(c.room);
    if (opts.length && startDoorTransit(c, opts[Math.floor(Math.random() * opts.length)])) {
      // heading to the door now
    } else {
      c.roomTimer = rand(15, 30);
    }
  }

  if (c.mood === "follow" && c.room === playerRoom) {
    const side = c.x < playerX ? -1 : 1;
    c.tx = playerX + side * 24;
    const [y0, y1] = ROOMS[c.room].walkY;
    c.ty = Math.max(y0 + 2, Math.min(y1 - 2, playerY + 4));
    if (c.moodTimer <= 0) pickNewMood(c);
  } else if (c.moodTimer <= 0) {
    if (c.mood === "toDoor") {
      // took too long to reach the door — give up and wander instead
      c.transit = null;
    }
    pickNewMood(c);
  }

  if (c.mood === "nap" || c.mood === "pause") {
    c.moving = false;
    return;
  }

  // fade back in after emerging from a door
  if (c.doorFade > 0) c.doorFade = Math.max(0, c.doorFade - dt * 3);

  // ---- move toward target ----
  const dx = c.tx - c.x;
  const dy = c.ty - c.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 1.5) {
    const step = Math.min(dist, CAT_SPEED * dt);
    c.x += (dx / dist) * step;
    c.y += (dy / dist) * step;
    if (Math.abs(dx) > 1) c.face = dx > 0 ? 1 : -1;
    c.moving = true;
    c.phase += dt * 10;
  } else {
    c.moving = false;
    if (c.mood === "toDoor") {
      enterDoorway(c);
    } else if (c.mood === "exitDoor") {
      // in the room proper now — carry on with normal behaviour
      c.mood = "follow";
      if (c.room !== playerRoom) pickNewMood(c);
      else c.moodTimer = rand(4, 8);
    } else if (c.mood === "toPerch") {
      c.mood = "perch";
      c.x = CAT_COUCH.x;
      c.y = CAT_COUCH.y;
      c.tx = c.x;
      c.ty = c.y;
      c.face = 1;
      c.moodTimer = rand(8, 18);
    } else if (c.mood === "wander") {
      c.mood = "pause";
      c.moodTimer = rand(1, 3.5);
    }
  }
}

/** Sprite name + flip for the current cat state. */
export function catSprite(c: CatState): { name: string; flip: boolean } {
  if (c.mood === "perch") return { name: "catSit", flip: false };
  if (c.mood === "nap") return { name: "catSleep", flip: c.face < 0 };
  if (c.moving) {
    const f = Math.floor(c.phase) % 2 === 0 ? "catWalk1" : "catWalk2";
    return { name: f, flip: c.face < 0 };
  }
  return { name: Math.floor(c.phase) % 2 === 0 ? "catSit" : "catStand", flip: c.face < 0 };
}

/** Opacity to draw the cat with (fades out while stepping through a door, fades in after). */
export function catAlpha(c: CatState): number {
  if (c.mood === "inDoor") return Math.max(0, 1 - c.doorFade);
  if (c.doorFade > 0) return 1 - c.doorFade; // fading back in after exit
  return 1;
}

export const ALL_ROOMS = ROOM_ORDER;
