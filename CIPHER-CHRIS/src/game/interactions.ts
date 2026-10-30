import type { DialogLine, Flags, Hotspot, PanelId, PoseRequest, RoomId, Verb } from "./types";
import { ITEMS, DUCK_WISDOM } from "./content";
import { ROOMS } from "./rooms";
import { sfx } from "./sound";
import { getPhTime } from "./phTime";
import { WALL_PHOTO_MAP } from "./wallPhotos";
import type { WallPhotoId } from "./wallPhotos";

export interface ScriptCtx {
  say: (lines: DialogLine[], after?: () => void) => void;
  give: (item: string) => void;
  take: (item: string) => void;
  has: (item: string) => boolean;
  flag: (k: string) => boolean;
  setFlag: (k: string, v?: boolean) => void;
  openPanel: (p: Exclude<PanelId, null>) => void;
  openPhoto: (id: WallPhotoId) => void;
  setPose: (pose: PoseRequest) => void;
  gotoRoom: (r: RoomId) => void;
  score: (n: number, key: string) => void;
  toast: (msg: string) => void;
  turbo: (seconds: number) => void;
}

/* rotating-line counters (reset with the game) */
const counters: Record<string, number> = {};
export function resetScript() {
  for (const k of Object.keys(counters)) delete counters[k];
}
function rot(key: string, lines: string[]): string {
  const i = counters[key] ?? 0;
  counters[key] = i + 1;
  return lines[i % lines.length];
}

const me = (text: string): DialogLine => ({ who: "CIPHER CHRIS", color: "#e8e6f7", text });
const cat = (text: string): DialogLine => ({ who: "PORORO", color: "#4ade80", text });
const sys = (text: string): DialogLine => ({ who: "SYSTEM", color: "#22d3ee", text });
const duck = (text: string): DialogLine => ({ who: "THE DUCK", color: "#fbbf24", text });

function relax(c: ScriptCtx, text: string, pose: PoseRequest) {
  c.say([me(text)], () => c.setPose(pose));
}

export function getIntroLines(): DialogLine[] {
  const pht = getPhTime();
  const opener =
    pht.phase === "day"
      ? `${pht.formatted} in the Philippines. Blazing tropical sun outside, shirtless comfort inside, servers humming at 18°C.`
      : pht.phase === "dusk"
        ? `${pht.formatted} in the Philippines. Manila sunset blazing orange outside, zero shirt inside, and a deploy waiting.`
        : pht.phase === "dawn"
          ? `${pht.formatted} in the Philippines. Sunrise is creeping over the rooftops and I STILL haven't slept.`
          : `${pht.formatted} in the Philippines. The city sleeps. The servers hum. Shirtless and locked in, I do neither.`;

  return [
    me(opener),
    me("Welcome to my portfolio walkthrough! Explore the rooms, meet Pororo, and click on objects to learn more about my work."),
    sys("Click to walk, use the verbs to interact, or use the menu for a quick look at my portfolio."),
  ];
}

export function currentObjective(_f: Flags, _inv: string[]): string {
  return "Explore the house at your own pace. Visit the desk for projects, the bookshelf for services, and the telescope for contact details.";
}

export function serverHint(_f: Flags, _inv: string[]): string | null {
  return null;
}

/* ---------------- doors ---------------- */

function handleDoor(ctx: ScriptCtx, h: Hotspot, verb: Verb, _item: string | null): boolean {
  if (!h.door) return false;
  const dest = ROOMS[h.door].name;
  if (verb === "look") {
    ctx.say([me(`That leads to the ${dest}.`)]);
    return true;
  }
  if (verb === "talk") {
    ctx.say([me("Open sesame. ...Worth a shot. Doors used to respect that.")]);
    return true;
  }
  ctx.gotoRoom(h.door);
  return true;
}

/* ---------------- item-on-hotspot combos ---------------- */

function handleItemOn(ctx: ScriptCtx, h: Hotspot, item: string): boolean {
  const key = `${item}->${h.id}`;

  if (key === "pizza->cat") {
    ctx.take("pizza");
    sfx.meow();
    ctx.say(
      [
        me("One slice of cold pizza, your highness. As tribute."),
        cat("...mlem. mlem. ACCEPTABLE, HUMAN."),
        me("And there it is — he drops my USB DRIVE at my feet like a dead mouse. A trophy. For warmth. Sure."),
        me("Pizza paid, patrol resumes. Off he trots to inspect the next room. Classic Siamese."),
      ],
      () => {
        ctx.setFlag("catFed");
        ctx.give("usb");
        ctx.setFlag("usbTaken");
        ctx.score(15, "feedCat");
      }
    );
    return true;
  }

  if (key === "usb->terminal") {
    if (ctx.flag("usbInTerminal")) {
      ctx.say([me("PROJECT: MIDNIGHT is already uploaded. The terminal is purring like Pororo after pizza.")]);
      return true;
    }
    sfx.fanfare();
    ctx.take("usb");
    ctx.setFlag("usbInTerminal");
    ctx.say(
      [
        sys("USB DRIVE DETECTED. MOUNTING... (THIRD TRY. CLASSIC.)"),
        sys("UPLOADING PROJECT: MIDNIGHT... 100%. DEPLOY COMPLETE."),
        me("IT'S LIVE. Shipped at 03:47 AM, as tradition demands. And what's this the terminal printed out...?"),
      ],
      () => {
        ctx.give("floppy");
        ctx.score(25, "upload");
        ctx.toast("QUEST COMPLETE: PROJECT MIDNIGHT SHIPPED!");
        ctx.openPanel("secret");
      }
    );
    return true;
  }

  if (key === "coin->arcade") {
    sfx.coin();
    ctx.take("coin");
    ctx.setFlag("arcadePlayed");
    ctx.say(
      [sys("CREDIT 01. TURBO.EXE LOADED. HIGH SCORE TABLE = CLIENT TESTIMONIALS, APPARENTLY.")],
      () => {
        ctx.score(10, "arcade");
        ctx.openPanel("scores");
      }
    );
    return true;
  }

  if (key === "keycard->doorServer") return handleDoor(ctx, h, "use", item);

  if (key === "pizza->microwave") {
    ctx.say([me("Heating cold pizza is a crime in at least four countries and this household. It stays cold.")]);
    return true;
  }
  if (key === "duck->bathPhoto") {
    sfx.quack();
    ctx.say(
      [duck("Squeak! (Translation: the artist really captured my good beak.)"), me("Honestly, an uncanny likeness.")],
      () => ctx.openPhoto("bathroom-duck")
    );
    return true;
  }
  if (key === "duck->terminal" || key === "duck->pc" || key === "duck->rig") {
    sfx.quack();
    ctx.say([duck(rot("duckTips", DUCK_WISDOM)), me("...He's right. He's always right. It's infuriating.")]);
    return true;
  }
  if (item === "duck") {
    sfx.quack();
    ctx.say([duck("Squeak. (Translation: that won't work, but nice try.)")]);
    return true;
  }
  if (key === "floppy->pc" || key === "floppy->terminal" || key === "floppy->rig") {
    ctx.say([me("There's no floppy drive. There hasn't been one since 2009. The GOLDEN FLOPPY remains ceremonial.")]);
    return true;
  }
  if (key === "brew->cat" || key === "drink->cat" || key === "coffee->cat") {
    sfx.meow();
    ctx.say([cat("HISS. (Translation: absolutely not, I have a brand to protect.)"), me("Fair. A caffeinated Pororo could end civilisation.")]);
    return true;
  }
  return false;
}

/* ---------------- per-hotspot handlers ---------------- */

type Handler = Partial<Record<Verb, (ctx: ScriptCtx) => void>>;

function photoHandler(id: WallPhotoId): Handler {
  const p = WALL_PHOTO_MAP[id];
  return {
    look: (c) => c.openPhoto(id),
    use: (c) => {
      sfx.uiClick();
      c.say([me(p.useLine)], () => c.openPhoto(id));
    },
    talk: (c) => c.say([me(p.talkLine)]),
  };
}

const H: Record<string, Handler> = {
  /* ------- WALL PHOTOS AROUND THE HOUSE ------- */
  livingPhotos: photoHandler("living-gallery"),
  catPortrait: photoHandler("cat-portrait"),
  kitchenPhotos: photoHandler("kitchen-fuel"),
  bedroomPhotos: photoHandler("bedroom-polaroids"),
  hallPhotos: photoHandler("hallway-pc98"),
  bathPhoto: photoHandler("bathroom-duck"),
  gamePhotos: photoHandler("gameroom-lan"),
  serverPhoto: photoHandler("server-pi"),

  /* ------- LIVING ROOM ------- */
  neon: {
    look: (c) => c.say([me("'cipher chris' in glowing pink. My landlord calls it 'a fire hazard'. I call it 'personal branding'.")]),
    use: (c) => { sfx.uiClick(); c.say([me("I flicker the sign for dramatic effect. The neighbours love it. The neighbours have moved out.")]); },
    talk: (c) => c.say([me("It just buzzes smugly. As is its right.")]),
  },
  tv: {
    look: (c) => c.say([me("Channel 3: static. Channel 4: static. Channel 5: a test card that knows what time it is. Always.")]),
    use: (c) => c.say([me("Let's see what's on... Ah. The 'About Me' channel. My favourite.")], () => c.openPanel("about")),
  },
  couch: {
    look: (c) => c.say([me(ctx2cat(c))]),
    use: (c) => {
      if (!c.flag("couchSearched")) {
        c.setFlag("couchSearched");
        c.say([me("Standard couch-cushion archaeology: crumbs, a missing remote... and an ARCADE COIN! Jackpot.")], () => {
          c.give("coin");
          c.score(5, "coin");
        });
      } else {
        relax(c, "I lower myself onto the deep couch cushion. Perfect lumbar support, dangerous levels of comfort. Click anywhere or press SPACE when I want back up.", {
          kind: "sit", x: 143, y: 132, face: 1, label: "COUCH", exitX: 142, exitY: 146,
        });
      }
    },
  },
  cat: {
    look: (c) => c.say([me(c.flag("catFed")
      ? rot("catLook", [
          "Pororo, my lynx-point Siamese. Ivory coat, grey tabby-striped mask, that little M on his forehead, ringed tail, blue eyes that judge everything.",
          "There he goes — striped lynx-point tail up, trotting from room to room doing his rounds. Siamese don't sit still. They supervise.",
          "Pororo the Siamese, mid-patrol. Those blue eyes have seen every bug I've ever shipped and forgiven none of them.",
        ])
      : rot("catLookGuard", [
          "Pororo. Lynx-point Siamese. Ivory body, grey tabby points, forehead M, striped legs and piercing blue eyes. And yes, that's my USB drive he's taking on patrol.",
          "There he goes with MY USB drive, doing laps of the house like it's a trophy. Siamese don't steal. They 'relocate'.",
        ]))]),
    talk: (c) => {
      sfx.meow();
      if (c.flag("catFed")) c.say([cat(rot("catTalk", [
        "Mrrrp. (Translation: the human may keep the small rectangle. Rent is paid in pizza now. I shall now inspect every room.)",
        "Mraow? (Translation: are you following ME, or am I following YOU? Unclear. Walk faster.)",
        "...prrt. (Translation: this room is acceptable. I will nap in it later. Carry on.)",
      ]))]);
      else c.say([
        me("Pororo. Buddy. That's my USB drive you're carrying. It's got my whole secret project on it."),
        cat("Mrrrow. (Translation: your offer of NOTHING intrigues me not. Bring snacks. Premium ones. Then we talk.)"),
      ]);
    },
    use: (c) => {
      sfx.meow();
      c.say([me(c.flag("catFed")
        ? rot("catPet", [
            "I scratch behind the tabby-striped ears. The lynx-point purr engine turns over. Approved — for exactly four seconds.",
            "Belly rub attempt. Blue eyes narrow. Attempt withdrawn. We both pretend it never happened.",
          ])
        : "I attempt to pet the CEO mid-patrol. Petition acknowledged, not approved. He tightens his grip on the USB and keeps walking.")]);
    },
  },
  lamp: {
    look: (c) => c.say([me("A lamp. It has two settings: 'cosy' and 'interrogation'. This is cosy.")]),
    use: (c) => {
      sfx.uiClick();
      const off = !c.flag("lampOff");
      c.setFlag("lampOff", off);
      c.say([me(off ? "Lights off. Ambience: maximum. Eyestrain: also maximum." : "Lights on. The darkness retreats to the corners, plotting.")]);
    },
  },
  plant: {
    look: (c) => c.say([me("Gerald the plant. Thrives on neglect and secondhand monitor light. We have an understanding.")]),
    use: (c) => c.say([me("I water Gerald. Gerald says nothing, but I can tell he's emotional.")]),
    talk: (c) => c.say([me("'Photosynthesis?' Gerald asks, at 03:47 AM, lit only by RGB. 'Never met her.'")]),
  },
  shelf: {
    look: (c) => c.say([me("Physical game boxes. Yes, in this decade. This is a collection, not a problem.")]),
    use: (c) => c.say([me("Alphabetised by vibe. Do not touch the system. The system works.")]),
  },
  window: {
    look: (c) => {
      const pht = getPhTime();
      if (pht.phase === "day") {
        c.say([me(`It's ${pht.formatted} — peak Philippine sunshine out there. Which is why I am staying shirtless indoors where the Wi-Fi and fans live.`)]);
      } else if (pht.phase === "dusk") {
        c.say([me(`${pht.formatted} — classic fiery Philippine sunset painting the whole living room floor gold.`)]);
      } else if (pht.phase === "dawn") {
        c.say([me(`${pht.formatted} — bukang-liwayway. I can smell the neighbors making garlic fried rice already.`)]);
      } else {
        c.say([me(`${pht.formatted} — the Philippine skyline glows below, and in at least three windows someone else is also pushing code tonight.`)]);
      }
    },
  },

  /* ------- KITCHEN ------- */
  fridge: {
    look: (c) => c.say([me("Double-door French fridge. Wide enough to slide an 18-inch pizza box flat on the shelf — the only metric that matters when appliance shopping.")]),
    use: (c) => {
      if (c.has("drink")) c.say([me("I swing both French doors open, bathe my bare belly in cool fridge light for three glorious seconds, and close them.")]);
      else c.say([me("Contents: midnight snacks, hot sauce collection, and one cold SEGFAULT COLA energy drink. Yoink.")], () => c.give("drink"));
    },
  },
  coffeeMachine: {
    look: (c) => c.say([me("The shrine. The altar. The reason any code in this house exists. I pay my respects daily.")]),
    use: (c) => {
      if (c.has("coffee")) c.say([me("I'm already holding a coffee. Even I have limits. Theoretical, untested limits.")]);
      else {
        sfx.splash();
        c.say([me("It gurgles the song of its people. One mug of liquid productivity, coming up.")], () => c.give("coffee"));
      }
    },
  },
  pizzaBox: {
    look: (c) => c.say([me(c.flag("pizzaTaken") ? "An empty pizza box. A monument to dinner. And breakfast. And second dinner." : "One slice remains. By ancient developer law, it belongs to whoever debugs best.")]),
    use: (c) => {
      if (c.flag("pizzaTaken")) c.say([me("It's empty. I check anyway. Hope is a powerful thing. It's still empty.")]);
      else {
        c.setFlag("pizzaTaken");
        c.say([me("I claim the final slice. Somewhere, a cat's ears rotate like tiny radar dishes.")], () => {
          c.give("pizza");
          c.score(5, "pizza");
        });
      }
    },
  },
  microwave: {
    look: (c) => {
      const pht = getPhTime();
      c.say([me(`Miracle of miracles — the microwave clock actually matches Philippine Standard Time: ${pht.formatted}.`)]);
    },
    use: (c) => { sfx.uiClick(); c.say([me("BEEP. BEEEP. It refuses to heat my motivation. I checked. There is no setting for that.")]); },
  },
  stove: {
    look: (c) => c.say([me("Last used to cook an actual meal in... let me check the git blame on my life choices.")]),
    use: (c) => c.say([me("Cooking at 03:47 AM requires ingredients, skills and faith. I am short on all three.")]),
  },
  sink: {
    look: (c) => c.say([me("A mug tower of impressive structural integrity. Civil engineers weep. I add it to the sprint board.")]),
    use: (c) => { sfx.splash(); c.say([me("I wash exactly one mug. Growth. Healing. A journey of a thousand dishes begins with a single mug.")]); },
  },
  kwWindow: {
    look: (c) => {
      const pht = getPhTime();
      c.say([me(pht.phase === "day"
        ? `Bright Philippine daylight streaming right onto the kitchen sink (${pht.formatted}). Even the mug tower sparkles.`
        : pht.phase === "dusk"
          ? `Golden Philippine sunset glowing over the kitchen sink (${pht.formatted}).`
          : `Quiet ${pht.formatted} sky over the kitchen sink. Even the dishes look cinematic.`)]);
    },
  },
  kitchenChairL: {
    look: (c) => c.say([me("The left oak dining chair: wide seat, solid back, no wobble. Certified for long breakfasts and longer debug sessions.")]),
    use: (c) => relax(c, "I sit on the left kitchen chair and pull up to the table. Finally, a civilised snack workstation. Click anywhere or press SPACE to stand.", {
      kind: "sit", x: 205, y: 138, face: 1, label: "KITCHEN CHAIR", exitX: 205, exitY: 140,
    }),
  },
  kitchenChairR: {
    look: (c) => c.say([me("The right oak dining chair. Equally sturdy, slightly closer to the fridge. Prime real estate.")]),
    use: (c) => relax(c, "I take the right-hand kitchen chair — the one with optimal fridge access. Click anywhere or press SPACE to stand.", {
      kind: "sit", x: 273, y: 138, face: -1, label: "KITCHEN CHAIR", exitX: 273, exitY: 140,
    }),
  },
  table: {
    look: (c) => c.say([me("A fruit bowl containing decorative fruit. I bit one in 2022. We don't talk about The Biting.")]),
  },
  trash: {
    look: (c) => c.say([me("Failed printouts, dead batteries and a README I wrote in anger. History will judge this bin kindly.")]),
    use: (c) => c.say([me("I am not dumpster-diving my own kitchen bin. This is a line. I have drawn it. Today.")]),
  },

  /* ------- BEDROOM ------- */
  bed: {
    look: (c) => c.say([me("My bed. It files a missing-person report about me roughly twice a week. USE to actually lie down on it.")]),
    use: (c) => relax(c, "I kick off nothing — already barefoot — and stretch out horizontally on the mattress. Head on pillow, belly at cruising altitude. Click anywhere or press SPACE to get back up.", {
      kind: "lay", x: 86, y: 101, face: 1, label: "BED", exitX: 84, exitY: 138,
    }),
  },
  nightstand: {
    look: (c) => c.say([me("On the nightstand: 'Clean Code', currently serving honourably as a coaster. Uncle Bob would understand. Probably not.")]),
  },
  pc: {
    look: (c) => c.say([me("My dev machine. 64GB of RAM and 400 browser tabs, each one load-bearing emotionally.")]),
    use: (c) => c.say([me("Let's look at the project archive. Warning: contains several things I'm annoyingly proud of.")], () => c.openPanel("projects")),
  },
  deskChair: {
    look: (c) => c.say([me("My wide ergonomic desk chair. Proper armrests, reinforced base, and enough seat for a senior developer's whole backend.")]),
    use: (c) => relax(c, "I pull out the desk chair and sit down properly. Bare feet flat, back supported, ready to pretend I'm about to work. Click anywhere or press SPACE to stand.", {
      kind: "sit", x: 176, y: 127, face: -1, label: "DESK CHAIR", exitX: 177, exitY: 140,
    }),
  },
  desk: {
    look: (c) => c.say([me("The desk: keyboard, mug archaeology, and a cable situation that can only be described as 'spaghetti, but make it USB'.")]),
  },
  drawer: {
    look: (c) => c.say([me("Desk drawers. Where dongles go to live out their retirement.")]),
    use: (c) => {
      if (!c.flag("drawerLooted")) {
        c.setFlag("drawerLooted");
        c.say([me("Cables... more cables... a cable I'm pretty sure is pre-war... AH HA. My SERVER KEYCARD. Past me DID have a system.")], () => {
          c.give("keycard");
          c.score(10, "keycard");
        });
      } else c.say([me("Just cables now. So many cables. If cables were currency I'd own this building.")]);
    },
  },
  bookshelf: {
    look: (c) => c.say([me("Titles include 'JavaScript: The Good Parts', 'JavaScript: The Other Parts (Trauma Edition)' and a cookbook used exclusively as a monitor stand.")]),
    use: (c) => c.say([me("The big binder labelled 'SERVICES & RATES'. Ah yes, my favourite bedtime story.")], () => c.openPanel("services")),
  },
  poster: {
    look: (c) => c.say([me("A poster for PROJECT: MIDNIGHT, my secret build. Motivational. Neon. Extremely subtle for a 'secret'.")]),
  },
  wardrobe: {
    look: (c) => c.say([me("Fourteen unworn shirts hanging in pristine condition, waiting for the once-a-quarter emergency when someone says 'cameras on please'.")]),
    use: (c) => c.say([me("Put on a shirt? In MY own house? At 03:47 AM? Absolutely not. The belly breathes free tonight.")]),
  },
  laundry: {
    look: (c) => c.say([me("Every t-shirt that made the mistake of touching me for more than three seconds after getting home. Peak comfort wins every time.")]),
  },
  bWindow: {
    look: (c) => {
      const pht = getPhTime();
      c.say([me(pht.phase === "day"
        ? `Sunny ${pht.formatted} outside — fluffy clouds drifting by while I code in the AC zone.`
        : pht.phase === "dusk"
          ? `Manila sunset colors right outside my bedroom window (${pht.formatted}). Elite coding vibe.`
          : `${pht.formatted} outside. Just me, the night sky, and zero plans to sleep yet.`)]);
    },
  },

  /* ------- HALLWAY ------- */
  clock: {
    look: (c) => {
      const pht = getPhTime();
      c.say([me(`Philippine Standard Time: ${pht.formatted} (${pht.phaseLabel}). Every clock in this house runs strictly on Manila time.`)]);
    },
  },
  hPoster: {
    look: (c) => c.say([me("A framed piece of abstract art brightens up the hallway.")]),
  },
  boxes: {
    look: (c) => c.say([me("Boxes labelled 'OLD GPUS', 'CABLES (FINAL)' and 'CABLES (FINAL) (2)'. A museum of e-waste and good intentions.")]),
    use: (c) => c.say([me("I open one. It's full of VGA cables. VGA. In this economy. I close it quietly, out of respect.")]),
  },

  /* ------- SERVER ROOM ------- */
  racks: {
    look: (c) => c.say([me(rot("racks", [
      "Three racks of beautiful blinkenlights. Every blink is a happy user somewhere. That's what I tell myself.",
      "Uptime: 214 days. I talk to them so they don't get lonely. They prefer it when I don't.",
      "Somewhere in these racks, cipher chris is live. Hello, website. You're doing great.",
    ]))]),
    use: (c) => { sfx.error(); c.say([me("I am NOT touching the production rack at 03:47 AM. I have made that movie before. It was a horror.")]); },
  },
  terminal: {
    look: (c) => c.say([me("The main terminal. Green text, black screen, infinite power. Somewhere a USB port waits for destiny.")]),
    use: (c) => {
      if (c.flag("usbInTerminal")) {
        c.say([sys("RUNNING: PROJECT MIDNIGHT v1.0. STATUS: BEAUTIFUL.")], () => c.openPanel("skills"));
      } else if (c.has("usb")) {
        c.say([me("The terminal blinks expectantly. My USB DRIVE blinks back. I should just plug it in. (Select USB DRIVE in STUFF, then click the terminal.)")]);
      } else {
        c.say([me("It wants an upload. It NEEDS an upload. I need my USB drive first. Let me check my stack readout instead.")], () => c.openPanel("skills"));
      }
    },
  },
  operatorChair: {
    look: (c) => c.say([me("The server-room operator chair: wide seat, steel post, five wheels, and just enough lumbar support for a 3 AM incident.")]),
    use: (c) => relax(c, "I sit at the server console like a very underdressed mission controller. Click anywhere or press SPACE to stand.", {
      kind: "sit", x: 182, y: 125, face: -1, label: "OPERATOR CHAIR", exitX: 182, exitY: 138,
    }),
  },
  whiteboard: {
    look: (c) => c.say([me("A whiteboard with a simple diagram of the server setup.")]),
  },
  ac: {
    look: (c) => c.say([me("The AC keeps this room at a crisp 18 degrees. Walking in here shirtless at 03:47 AM really wakes up the soul.")]),
    use: (c) => c.say([me("I stand bare-bellied directly under the 18-degree cold blast. Instant goosebumps, instant senior-engineer clarity. The bug was a typo.")]),
  },
  extinguisher: {
    look: (c) => c.say([me("Fire extinguisher. For literal fires. The metaphorical ones get coffee and a post-mortem doc.")]),
  },

  /* ------- BATHROOM ------- */
  tub: {
    look: (c) => c.say([me("Extra-wide, extra-deep soaking tub. Specifically chosen so a full-sized guy doesn't end up with cold knees OR a dry belly.")]),
    use: (c) => { sfx.splash(); c.say([me("Tempting — I'm already shirtless for it — but we have a deploy to ship first.")]); },
  },
  duckSpot: {
    look: (c) => c.say([me("A rubber duck, floating with the quiet confidence of a senior engineer who has seen every error code twice.")]),
    use: (c) => {
      sfx.quack();
      c.setFlag("duckTaken");
      c.say([me("I recruit the duck. His rates are reasonable: zero dollars, unlimited judgment.")], () => {
        c.give("duck");
        c.score(5, "duck");
      });
    },
    talk: (c) => { sfx.quack(); c.say([duck(rot("duckTips", DUCK_WISDOM))]); },
  },
  toilet: {
    look: (c) => c.say([me("Porcelain throne. Kingdom of the best ideas and the longest 'quick breaks' in recorded history.")]),
    use: (c) => { sfx.flush(); c.say([me("Business concluded. This is, historically, where I solve the hardest bugs. No further questions.")]); },
  },
  mirror: {
    look: (c) => c.say([me(rot("mirror", [
      "Peak 03:47 AM home-court physique: zero shirt, built on midnight pepperoni, radiating pure senior-engineer comfort.",
      "'My house, my thermostat, zero shirts allowed,' I tell the mirror. Honestly? Iconic silhouette.",
      "Hair: wild 3 AM bedhead. Belly: happy, round, undefeated. Aura: shipping to production anyway.",
    ]))]),
    talk: (c) => c.say([me("I give the belly an appreciative pat like a heavyweight champ before a title fight. Time to ship.")]),
  },
  sinkB: {
    use: (c) => { sfx.splash(); c.say([me("Cold water to the face. +10 alertness, -10 dignity. The drip has been going since March. It's load-bearing now.")]); },
    look: (c) => c.say([me("The bathroom sink and mirror, ready for a fresh start.")]),
  },
  towel: { look: (c) => c.say([me("One purple towel, one pink. A hoopy frood always knows where his towel is. Mine are right here. I'm basically unstoppable.")]) },
  washer: {
    look: (c) => {
      const pht = getPhTime();
      c.say([me(`Even the washing machine syncs to Philippine time over Wi-Fi: ${pht.formatted}. Over-engineered? Maybe. Cool? Definitely.`)]);
    },
    use: (c) => c.say([me("The laundry is tumbling. Somewhere in that drum is a single sock achieving enlightenment. The other sock is in a better place.")]),
  },

  /* ------- GAME ROOM ------- */
  arcade: {
    look: (c) => c.say([me("TURBO.EXE, 1987. One coin. One credit. Infinite glory. Current status: coinless, but hopeful.")]),
    use: (c) => {
      if (c.flag("arcadePlayed")) c.say([me("Free-play mode is unlocked. Let's look at those high scores again. They're glowing reviews, I promise.")], () => c.openPanel("scores"));
      else { sfx.error(); c.say([sys("INSERT COIN."), me("It wants a coin. Capitalism reaches even here. Where do coins hide...? Couch cushions. It's always couch cushions.")]); }
    },
  },
  arcade2: {
    look: (c) => c.say([me("'OUT OF ORDER'. It's been 'next weekend's project' for eleven weekends. The sign has seniority now.")]),
    use: (c) => { sfx.error(); c.say([me("I give it the traditional percussive maintenance. THUNK. Still broken. But now it's broken with confidence.")]); },
  },
  rig: {
    look: (c) => c.say([me("Triple monitors: game, chat, and a spreadsheet for the game. I contain multitudes and all of them have RGB.")]),
    use: (c) => c.say([me("One quick match before the deploy... no. No. Let's review the other kind of projects instead. The billable kind.")], () => c.openPanel("projects")),
  },
  gamingChair: {
    use: (c) => relax(c, "I drop into the heavy-duty wide-body throne and settle into the cushion. One majestic slow spin, then perfect gaming posture. Click anywhere or press SPACE to stand.", {
      kind: "sit", x: 164, y: 127, face: -1, label: "GAMING CHAIR", exitX: 164, exitY: 144,
    }),
    look: (c) => c.say([me("XL wide-bolster gaming chair with reinforced steel piston and 'GG' stitched on the back. Built for a king. USE to sit in it.")]),
  },
  trophies: {
    look: (c) => c.say([
      me("The shelf of glory: 'Best Hack, HackNight 2023', a speedrun trophy, and a participation ribbon I display with zero irony."),
      me("Each one a story. Most stories end with 'and then it worked at 4 AM'."),
    ]),
  },
  crt: {
    look: (c) => c.say([me("A CRT and an 8-bit console. The display weighs more than my car and has better colour than my first monitor.")]),
    use: (c) => c.say([me("I blow on the cartridge — the ancient ritual — and it boots first try. Some technologies simply respect tradition.")]),
  },
  gPosters: { look: (c) => c.say([me("A space invader and a colorful abstract poster brighten up the game room.")]) },
  beanbag: {
    use: (c) => relax(c, "I lower myself into the giant beanbag. It molds around me like a velvet cloud. Click anywhere or press SPACE to attempt the core-strength maneuver required to stand.", {
      kind: "sit", x: 285, y: 139, face: 1, label: "BEANBAG", exitX: 285, exitY: 144,
    }),
    look: (c) => c.say([me("Six-foot jumbo beanbag lounger, pre-moulded to the exact contour of my bare back. Dangerous technology.")]),
  },

  /* ------- ROOFTOP ------- */
  telescope: {
    look: (c) => c.say([me("A serious rooftop telescope. I can swing it from the moon all the way down to Cipher Street — jeepney route, sari-sari store, basketball court and all. USE to look through the lens.")]),
    use: (c) => {
      c.say([me("I swing the telescope down from the stars to the street. There's my barangay — a jeepney on the road and a pickup game on the court. I'll adjust the zoom and pull focus...")], () => c.openPanel("telescope"));
    },
  },
  dish: {
    look: (c) => c.say([me("The dish picks up 400 channels and one very persistent alien podcast I can't unsubscribe from.")]),
    use: (c) => {
      c.score(5, "contact");
      c.say([sys("SIGNAL ACQUIRED. UPLINK STABLE. INBOX OPEN."), me("If the aliens can reach me, clients can too.")], () => c.openPanel("contact"));
    },
  },
  antenna: {
    look: (c) => c.say([me("The antenna blinks red so planes don't land on my side projects. A real and previously-experienced concern.")]),
  },
  moon: {
    look: (c) => {
      const pht = getPhTime();
      if (pht.phase === "day") {
        c.say([me(`Philippine sun in full force (${pht.formatted}). Instant Vitamin D on the bare belly, zero shirt required — for about twelve seconds before I retreat to the AC.`)]);
      } else if (pht.phase === "dusk") {
        c.say([me(`Nothing hits quite like a golden-crimson Philippine sunset (${pht.formatted}). Worth climbing the stairs barefoot every single evening.`)]);
      } else if (pht.phase === "dawn") {
        c.say([me(`Sunrise over the Philippines (${pht.formatted}). Early risers think I woke up early. Only the servers know the truth.`)]);
      } else {
        c.say([me(`The moon over the Philippines (${pht.formatted}): senior night-shift worker, 4.5 billion years of experience, still no promotion. I feel seen.`)]);
      }
    },
    talk: (c) => {
      const pht = getPhTime();
      c.say([me(pht.phase === "night"
        ? "'One more deploy,' I tell the moon. The moon, who has heard this 900 times, says nothing. But supportively."
        : "'Take it easy on the heat today, boss,' I tell the Philippine sun. It turns up the brightness by 5% out of spite.")]);
    },
  },
  skyline: {
    look: (c) => {
      const pht = getPhTime();
      c.say([me(pht.phase === "day"
        ? `Metro skyline under clear Philippine skies at ${pht.formatted} — jeepneys honking ten floors down while I ship code in gym shorts.`
        : pht.phase === "dusk"
          ? `Tower lights flickering on one by one across the Manila horizon at ${pht.formatted}.`
          : `The skyline at ${pht.formatted}: quiet streets below, glowing windows above, and MIDNIGHT about to go live.`)]);
    },
  },
  lawnChair: {
    use: (c) => relax(c, "I sit back in the rooftop lounge chair. Sky above, deploy below, cooler within reach. Click anywhere or press SPACE to get up.", {
      kind: "sit", x: 232, y: 142, face: 1, label: "DECK CHAIR", exitX: 233, exitY: 150,
    }),
    look: (c) => c.say([me("A deck chair in optimistic pink. It has survived three storms and one (1) dropped router.")]),
  },
  cooler: {
    look: (c) => c.say([me("The rooftop cooler. Contents are classified under the 'don't ask, just chill' doctrine.")]),
    use: (c) => {
      if (!c.has("drink") && !c.flag("coolerLooted")) {
        c.setFlag("coolerLooted");
        c.say([me("Ice soup and one surviving SEGFAULT COLA. Nature provides.")], () => c.give("drink"));
      } else c.say([me("Just ice soup now. Deeply, spiritually cold. Like the server room, but wetter.")]);
    },
  },
  vent: { look: (c) => c.say([me("The vent hums in B-flat. The whole building is one big ambient synth and nobody appreciates it but me.")]) },
};

function ctx2cat(c: ScriptCtx): string {
  return c.flag("catFed")
    ? "My couch. Structurally 40% cushions, 60% crumbs. Currently hosting one (1) unconscious cat."
    : "My couch. Structurally 40% cushions, 60% crumbs. Its highest point is guarded by a cat sitting on something important.";
}

/* ---------------- defaults ---------------- */

const TALK_DEFAULTS = [
  "It doesn't respond. We've never been close.",
  "Talking to the furniture again. Peak 03:47 AM behaviour, honestly.",
  "Silence. But like, supportive silence. I choose to believe.",
];
const USE_DEFAULTS = [
  "That doesn't work. Points for enthusiasm though.",
  "Nope. Adventure-game logic has limits and I just found one.",
  "I try. The universe politely declines.",
];
const LOOK_DEFAULTS = [
  "Yep. It's exactly what it looks like. No notes.",
  "I've seen it a thousand times. It remains, stubbornly, itself.",
];

/* ---------------- main entry ---------------- */

export function runInteraction(ctx: ScriptCtx, h: Hotspot, verb: Verb, item: string | null) {
  // doors first (handles lock logic, incl. keycard item)
  if (h.door && (verb !== "look" || item === "keycard")) {
    if (handleDoor(ctx, h, item ? "use" : verb, item)) return;
  } else if (h.door && verb === "look" && !item) {
    handleDoor(ctx, h, "look", null);
    return;
  }

  if (item) {
    if (handleItemOn(ctx, h, item)) return;
    sfx.error();
    ctx.say([me(rot("badCombo", [
      `Using the ${ITEMS[item]?.name ?? "thing"} on that achieves nothing but lore.`,
      "A bold combination. Incorrect, but bold.",
      "Adventure games call this 'trying everything on everything'. It works 4% of the time. This is the 96%.",
    ]))]);
    return;
  }

  const handler = H[h.id]?.[verb];
  if (handler) {
    handler(ctx);
    return;
  }
  // soft fallbacks: use <-> look partial
  if (verb === "use" && H[h.id]?.look) { H[h.id]!.look!(ctx); return; }
  if (verb === "look") ctx.say([me(rot("lookDef", LOOK_DEFAULTS))]);
  else if (verb === "talk") ctx.say([me(rot("talkDef", TALK_DEFAULTS))]);
  else ctx.say([me(rot("useDef", USE_DEFAULTS))]);
}

/* ---------------- inventory actions ---------------- */

export function useItemAlone(ctx: ScriptCtx, item: string) {
  switch (item) {
    case "duck":
      sfx.quack();
      ctx.say([me("Okay, consultant. Walk me through it one more time..."), duck(rot("duckTips", DUCK_WISDOM))]);
      break;
    case "coffee":
      ctx.take("coffee");
      ctx.turbo(10);
      sfx.powerup();
      ctx.say([me("Down the hatch. I can feel my typing speed achieve escape velocity. (WALK SPEED UP — briefly.)")]);
      break;
    case "drink":
      ctx.take("drink");
      ctx.turbo(10);
      sfx.powerup();
      ctx.say([me("SEGFAULT COLA: tastes like battery acid and ambition. My heart is now overclocked. (WALK SPEED UP — briefly.)")]);
      break;
    case "brew":
      ctx.take("brew");
      ctx.turbo(45);
      sfx.fanfare();
      ctx.say([
        me("Drinking the TURBO BREW. I can see through time. I can see the deploy. I can see my own skeleton, briefly."),
        sys("TURBO MODE ENGAGED FOR 45 SECONDS. WALK SPEED +80%. JUDGMENT SPEED UNCHANGED."),
      ]);
      break;
    case "pizza":
      ctx.say([me("I could eat this. OR... it could serve a higher purpose. A furry, judgmental, couch-shaped purpose.")]);
      break;
    case "usb":
      ctx.say([me("One USB drive containing PROJECT: MIDNIGHT. It needs a terminal. Specifically the SERVER ROOM one, via the HALLWAY.")]);
      break;
    case "keycard":
      ctx.say([me("The keycard hums with Level-5 clearance. It opens exactly one door in this house and it knows it.")]);
      break;
    case "coin":
      sfx.coin();
      ctx.say([me("I flip the coin. Heads. It always lands heads. It's weighted with destiny. And arcade debt.")]);
      break;
    case "floppy":
      ctx.say([me("The GOLDEN FLOPPY. 1.44 MB of glory. I hold it up to the light like a tiny square halo. QUEST COMPLETE, BABY.")]);
      break;
    default:
      ctx.say([me("I use it. Nothing happens, but with great ceremony.")]);
  }
}

export function combineItems(ctx: ScriptCtx, a: string, b: string): boolean {
  const pair = [a, b].sort().join("+");
  if (pair === "coffee+drink") {
    ctx.take("coffee");
    ctx.take("drink");
    sfx.powerup();
    ctx.say([
      me("Coffee PLUS energy drink. Science said no. The Hague said no. I said: 'but what about the DEPLOY?'"),
      sys("ITEM CRAFTED: TURBO BREW. IT GLOWS. THAT SEEMS FINE."),
    ], () => {
      ctx.give("brew");
      ctx.score(10, "brew");
    });
    return true;
  }
  if (a === "duck" || b === "duck") {
    sfx.quack();
    ctx.say([duck("Squeak. (Translation: I don't combine. I consult. There's a difference and it's called professionalism.)")]);
    return true;
  }
  sfx.error();
  ctx.say([me(`The ${ITEMS[a]?.name} and the ${ITEMS[b]?.name} refuse to become a greater whole. Chemistry is disappointed in me specifically.`)]);
  return false;
}

export function lookItem(ctx: ScriptCtx, item: string) {
  const def = ITEMS[item];
  if (def) ctx.say([me(def.desc)]);
}
