import type { RoomId } from "./types";

import livingGalleryImg from "../assets/photos/living-gallery.jpg";
import catPortraitImg from "../assets/photos/cat-portrait.jpg";
import kitchenFuelImg from "../assets/photos/kitchen-fuel.jpg";
import bedroomPolaroidsImg from "../assets/photos/bedroom-polaroids.jpg";
import hallwayPc98Img from "../assets/photos/hallway-pc98.jpg";
import bathroomDuckImg from "../assets/photos/bathroom-duck.jpg";
import gameroomLanImg from "../assets/photos/gameroom-lan.jpg";
import serverPiImg from "../assets/photos/server-pi.jpg";

export type WallPhotoId =
  | "living-gallery"
  | "cat-portrait"
  | "kitchen-fuel"
  | "bedroom-polaroids"
  | "hallway-pc98"
  | "bathroom-duck"
  | "gameroom-lan"
  | "server-pi";

export type FrameStyle = "gold" | "wood" | "polaroid" | "neon" | "steel";

export interface WallPhotoDef {
  id: WallPhotoId;
  room: RoomId;
  roomLabel: string;
  title: string;
  caption: string;
  date: string;
  src: string;
  frameStyle: FrameStyle;
  story: string;
  useLine: string;
  talkLine: string;
}

export const WALL_PHOTOS: WallPhotoDef[] = [
  {
    id: "living-gallery",
    room: "living",
    roomLabel: "LIVING ROOM · ABOVE COUCH",
    title: "HOME COURT CHAMPION",
    caption: "03:47 AM — zero shirt, full belly, 1st place 🏆",
    date: "NOV 2023 · 03:47 AM",
    src: livingGalleryImg,
    frameStyle: "wood",
    story: "Me in my natural habitat: barefoot on the living-room rug with messy black hair and black gym shorts, zero shirt in sight, holding up the HackNight Grand Prix cup while Pixel supervises from the desk. Framed right over the couch where it belongs.",
    useLine: "I nudge the frame two millimetres straight. Look at that grin. That is a man completely at peace in his own house.",
    talkLine: "'Still undefeated, big guy,' I tell the photo. Pixel doesn't even blink in the background.",
  },
  {
    id: "cat-portrait",
    room: "living",
    roomLabel: "LIVING ROOM · LEFT WALL",
    title: "HIS MAJESTY PIXEL",
    caption: "Pixel the lynx-point Siamese, Regional Manager of Keyboard Sitting",
    date: "COMMISSIONED · 03:47 AM",
    src: catPortraitImg,
    frameStyle: "gold",
    story: "An oil-style portrait of Pixel — my lynx-point Siamese: cream coat, tabby-striped brown points, forehead M, ringed tail and ice-blue eyes — looking down on everyone like a 17th-century duke whose pull request you dared to comment on. He insisted on the gold frame AND the crown.",
    useLine: "I wipe a speck of dust off the gilded frame with my thumb. Checking behind it for a secret safe... nope, just drywall and cat smugness.",
    talkLine: "'Your Majesty,' I whisper respectfully. From across the couch, the real Pixel flicks one ear in approval.",
  },
  {
    id: "kitchen-fuel",
    room: "kitchen",
    roomLabel: "KITCHEN · DINING WALL",
    title: "STILL LIFE IN CAFFEINE",
    caption: "The four food groups: crust, cheese, crema, deadline",
    date: "OCT 2024 · 03:47 AM",
    src: kitchenFuelImg,
    frameStyle: "wood",
    story: "Other people hang Tuscan vineyards in their kitchen. I hung the exact pepperoni slice and double espresso that carried LAUNCHPAD OS across the finish line.",
    useLine: "I tap the glass wistfully. Sadly, you cannot download calories from a framed photograph. Yet.",
    talkLine: "'Thank you for your service,' I tell the immortalised slice. A moment of silence in the kitchen.",
  },
  {
    id: "bedroom-polaroids",
    room: "bedroom",
    roomLabel: "BEDROOM · ABOVE DESK",
    title: "RAINY 03:47 AM POLAROIDS",
    caption: "Rain on glass, green builds on screen ✨",
    date: "FEB 2025 · INSTANT FILM",
    src: bedroomPolaroidsImg,
    frameStyle: "polaroid",
    story: "Pinned Polaroids and framed snapshots from quiet rainy nights when the whole city goes dark, every test finally turns green, and for ten minutes you feel like a wizard.",
    useLine: "I clip one sagging clothespin tighter on the fairy-light wire. Safety third, aesthetics first.",
    talkLine: "'Look how clean the desk was that night,' I say to the Polaroid. It lasted approximately eleven minutes.",
  },
  {
    id: "hallway-pc98",
    room: "hallway",
    roomLabel: "HALLWAY · CORRIDOR GALLERY",
    title: "PATIENT ZERO (1998)",
    caption: "64 MB RAM, 56k screech, infinite possibilities",
    date: "AUG 1998 · ARCHIVE",
    src: hallwayPc98Img,
    frameStyle: "wood",
    story: "The machine that started the whole problem: a beige tower loud enough to taxi down a runway, a stack of 1.44 MB floppies, and my first HTML marquee tag. No regrets.",
    useLine: "I straighten the mahogany frame along the corridor wall. Every proper hacker house needs an ancestor shrine.",
    talkLine: "'You walked at 133 MHz so my dev machine could run 400 tabs,' I salute the beige box.",
  },
  {
    id: "bathroom-duck",
    room: "bathroom",
    roomLabel: "BATHROOM · ABOVE TUB",
    title: "ADMIRAL QUACKS-A-LOT",
    caption: "Undefeated vs. race conditions since 2019",
    date: "MARITIME EDITION",
    src: bathroomDuckImg,
    frameStyle: "gold",
    story: "Every serious engineering org hangs portraits of its founding architects. This gentleman solved three production deadlocks without speaking a single syllable.",
    useLine: "Steam-proof glass, solid brass hook. This portrait will outlast every JavaScript framework currently alive.",
    talkLine: "The painted monocle glints with silent wisdom: 'Check the async cleanup function.' ...Wait, how does he DO that?",
  },
  {
    id: "gameroom-lan",
    room: "gameroom",
    roomLabel: "GAME ROOM · ABOVE RIG",
    title: "999,900 — PHOTOGRAPHIC PROOF",
    caption: "Witnessed by 3 friends & 14 empty Segfault Colas",
    date: "DEC 2024 · LAN NIGHT",
    src: gameroomLanImg,
    frameStyle: "neon",
    story: "Photographic evidence of the legendary 999,900 run on TURBO.EXE during winter LAN night. Framed directly above the triple monitors to intimidate incoming bugs.",
    useLine: "I polish a smudge off the high-score frame. History must remain crystal clear.",
    talkLine: "'Unbeatable,' I tell the scoreboard. Somewhere inside the arcade cabinet, a Z80 chip hums back: 'Wanna bet?'",
  },
  {
    id: "server-pi",
    room: "server",
    roomLabel: "SERVER ROOM · EAST WALL",
    title: "PROD v0.1 (THE DUCT-TAPE ERA)",
    caption: "Uptime: 412 days. Mounting hardware: $1.99 tape.",
    date: "APR 2016 · HISTORIC RELIC",
    src: serverPiImg,
    frameStyle: "steel",
    story: "Before the three racks and 18°C climate control, cipher chris ran off this single green board duct-taped directly to drywall in a closet. Keeps the new servers humble.",
    useLine: "Bolted flush to the steel wall with four hex screws. Ironically over-engineered frame for a duct-taped computer.",
    talkLine: "'Look at all the racks you grew into, little buddy,' I say. One of the server LEDs blinks twice, almost on cue.",
  },
];

export const WALL_PHOTO_MAP: Record<WallPhotoId, WallPhotoDef> = Object.fromEntries(
  WALL_PHOTOS.map((p) => [p.id, p])
) as Record<WallPhotoId, WallPhotoDef>;
