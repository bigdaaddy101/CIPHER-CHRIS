/* All portfolio content lives here — edit this file to make it yours. */

export const DEV = {
  handle: "cipher chris",
  name: "CIPHER CHRIS",
  role: "FULL-STACK DEVELOPER & CREATIVE CODER",
  tagline: "I build fast, weird, award-hungry things for the web — synced live to Philippine time.",
  location: "Philippines (PHT · UTC+8)",
  email: "hello@cipherchris.dev",
  availability: "OPEN FOR FREELANCE — 2 SLOTS LEFT",
};

export const ABOUT = {
  title: "ABOUT.TXT",
  lines: [
    "Hi, I'm Cipher Chris — a full-stack developer with 8+ years of turning caffeine into production code.",
    "I specialise in interactive experiences: the kind of websites people screenshot, bookmark and send to their friends at 3 AM.",
    "By day I ship reliable platforms for startups and studios. By night I build games, generative art and questionable side projects.",
    "Yes, this entire portfolio is a playable point-and-click adventure. No, I will not be taking questions about my sleep schedule.",
  ],
  stats: [
    { k: "YEARS ONLINE", v: "08+" },
    { k: "PROJECTS SHIPPED", v: "63" },
    { k: "CUPS OF COFFEE", v: "∞" },
    { k: "BUGS AT 03:47 AM", v: "0*" },
  ],
};

export interface Project {
  id: string;
  title: string;
  year: string;
  icon: string;
  color: string;
  desc: string;
  tags: string[];
  metric: string;
}

export const PROJECTS: Project[] = [
  {
    id: "neon-drift",
    title: "NEON DRIFT",
    year: "2025",
    icon: "projPad",
    color: "#f471b5",
    desc: "A browser arcade racer running at 120fps in WebGL. Custom physics, procedural tracks, zero downloads.",
    tags: ["Three.js", "WebGL", "WASM"],
    metric: "1.2M plays in month one",
  },
  {
    id: "launchpad",
    title: "LAUNCHPAD OS",
    year: "2025",
    icon: "projRocket",
    color: "#22d3ee",
    desc: "SaaS dashboard suite for a space-logistics startup. Real-time telemetry visualised for 40k daily users.",
    tags: ["React", "TypeScript", "WebSockets"],
    metric: "Load time 4.1s → 0.6s",
  },
  {
    id: "cartel",
    title: "CART-EL",
    year: "2024",
    icon: "projCart",
    color: "#4ade80",
    desc: "Headless e-commerce engine with a checkout so smooth it should probably be illegal.",
    tags: ["Next.js", "Stripe", "Postgres"],
    metric: "+38% conversion rate",
  },
  {
    id: "dataforge",
    title: "DATAFORGE",
    year: "2024",
    icon: "projChart",
    color: "#fbbf24",
    desc: "Analytics platform crunching 2B events/day into charts humans actually understand.",
    tags: ["D3.js", "ClickHouse", "Node"],
    metric: "2B events / day",
  },
  {
    id: "sidekick",
    title: "SIDEKICK.AI",
    year: "2023",
    icon: "projBot",
    color: "#00e5ff",
    desc: "An AI support agent that resolves tickets while the team sleeps. Unlike me, it does sleep. Sometimes.",
    tags: ["LLMs", "Python", "FastAPI"],
    metric: "71% tickets auto-resolved",
  },
  {
    id: "stratus",
    title: "STRATUS",
    year: "2023",
    icon: "projCloud",
    color: "#7dd3fc",
    desc: "Edge-deployed CMS serving 300+ marketing sites from a single, stupidly fast core.",
    tags: ["Astro", "Edge", "Redis"],
    metric: "99.99% uptime, 38ms TTFB",
  },
];

export const SECRET_PROJECT = {
  title: "PROJECT: MIDNIGHT",
  desc: "You found the secret build. MIDNIGHT is an unreleased generative-music engine that turns your Git commit history into lo-fi beats. Every merge conflict is a drum fill. Every 3 AM hotfix is a sad piano.",
  note: "Want early access? Mention the GOLDEN FLOPPY in your email. Seriously. There's a filter for it.",
};

export interface Service {
  title: string;
  price: string;
  desc: string;
  points: string[];
}

export const SERVICES: Service[] = [
  {
    title: "WEB APPS & PLATFORMS",
    price: "from $4k",
    desc: "Full-stack product builds, from first commit to launch day (and the 3 AM hotfix after).",
    points: ["React / Next.js front-ends", "Node & Postgres back-ends", "Auth, billing & admin panels"],
  },
  {
    title: "INTERACTIVE / CREATIVE SITES",
    price: "from $3k",
    desc: "Award-chasing marketing sites and playable brand experiences. Like this one. But yours.",
    points: ["WebGL & canvas wizardry", "Scroll-stopping animation", "Gamified storytelling"],
  },
  {
    title: "E-COMMERCE",
    price: "from $3.5k",
    desc: "Stores engineered to convert, with checkouts measured in milliseconds, not minutes.",
    points: ["Headless Shopify / custom", "Stripe payments & subs", "CRO baked in, not bolted on"],
  },
  {
    title: "APIS & AUTOMATION",
    price: "from $2k",
    desc: "The invisible plumbing: integrations, pipelines and bots that quietly save you hundreds of hours.",
    points: ["REST / GraphQL APIs", "AI agents & chatbots", "CI/CD & cloud deployment"],
  },
];

export const SKILLS: { name: string; lvl: number; tag: string }[] = [
  { name: "TypeScript", lvl: 9, tag: "daily driver" },
  { name: "React / Next.js", lvl: 10, tag: "weapon of choice" },
  { name: "Node.js", lvl: 9, tag: "server whisperer" },
  { name: "PostgreSQL", lvl: 8, tag: "joins for days" },
  { name: "Three.js / WebGL", lvl: 8, tag: "make it spin" },
  { name: "Python", lvl: 7, tag: "bot fuel" },
  { name: "DevOps / Docker", lvl: 7, tag: "it works on my cloud" },
  { name: "CSS Wizardry", lvl: 9, tag: "yes, even centering divs" },
];

export const TESTIMONIALS: { name: string; role: string; score: string; quote: string }[] = [
  {
    name: "AAA",
    role: "CEO, LAUNCHPAD",
    score: "999900",
    quote: "Shipped our platform 3 weeks early. Then voluntarily optimised it at 3 AM. Who does that?",
  },
  {
    name: "M4X",
    role: "HEAD OF PRODUCT, CART-EL",
    score: "875400",
    quote: "Our conversion rate jumped 38%. Our CFO framed the graph. Not joking.",
  },
  {
    name: "ZED",
    role: "FOUNDER, NEON DRIFT",
    score: "842100",
    quote: "The only dev I've met who prototypes in pixel art and still hits every deadline.",
  },
  {
    name: "K1M",
    role: "CTO, DATAFORGE",
    score: "798650",
    quote: "Took our spaghetti codebase and turned it into a five-course meal. 10/10, would refactor again.",
  },
];

export const CONTACT = {
  lines: [
    "SIGNAL ACQUIRED. The telescope works — and so does my inbox.",
    "Got a project, a wild idea, or a production server that only breaks at night? Transmit coordinates below.",
  ],
  email: "hello@cipherchris.dev",
  responseTime: "< 24h (usually < 2h, I don't sleep)",
  socials: [
    { label: "GITHUB", handle: "@cipherchris", url: "https://github.com" },
    { label: "TWITTER / X", handle: "@cipher_chris", url: "https://x.com" },
    { label: "LINKEDIN", handle: "in/cipherchris", url: "https://linkedin.com" },
    { label: "AWWWARDS", handle: "cipherchris", url: "https://www.awwwards.com" },
  ],
};

/* ---------------- inventory items ---------------- */

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export const ITEMS: Record<string, ItemDef> = {
  pizza: {
    id: "pizza",
    name: "PIZZA SLICE",
    icon: "itemPizza",
    desc: "Cold pizza. Breakfast of champions, lunch of developers, dinner of legends.",
  },
  drink: {
    id: "drink",
    name: "ENERGY DRINK",
    icon: "itemDrink",
    desc: "'SEGFAULT COLA — now with 300% more taurine'. The can is warm. Suspicious.",
  },
  coffee: {
    id: "coffee",
    name: "COFFEE",
    icon: "itemCoffee",
    desc: "Black as a kernel panic. Strong enough to make the servers nervous.",
  },
  usb: {
    id: "usb",
    name: "USB DRIVE",
    icon: "itemUsb",
    desc: "Contains the only copy of PROJECT: MIDNIGHT. Took three tries to plug in, obviously.",
  },
  coin: {
    id: "coin",
    name: "ARCADE COIN",
    icon: "itemCoin",
    desc: "One credit. 'INSERT COIN TO CONTINUE' — the original microtransaction.",
  },
  keycard: {
    id: "keycard",
    name: "SERVER KEYCARD",
    icon: "itemKeycard",
    desc: "Level-5 clearance. Photo on the back: me, also at 03:47 AM, also not sleeping.",
  },
  duck: {
    id: "duck",
    name: "RUBBER DUCK",
    icon: "duck",
    desc: "Senior debugging consultant. Charges nothing, judges silently, solves everything.",
  },
  brew: {
    id: "brew",
    name: "TURBO BREW",
    icon: "itemBrew",
    desc: "Coffee + energy drink. Glows faintly. Possibly illegal in three countries. Drink for SPEED.",
  },
  floppy: {
    id: "floppy",
    name: "GOLDEN FLOPPY",
    icon: "itemFloppy",
    desc: "1.44 MB of pure achievement. They don't make storage — or portfolios — like this anymore.",
  },
};

export const DUCK_WISDOM = [
  "Have you tried explaining the bug out loud? ...You're welcome.",
  "The bug is in the code you swore was 'definitely fine'. It always is.",
  "console.log is a valid debugging strategy. I said what I said.",
  "It worked on your machine? Ship your machine.",
  "The cache. It's always the cache. Clear it and deny everything.",
  "Read the error message. The WHOLE error message. Even the boring part.",
  "Somewhere out there is a missing semicolon laughing at you.",
];
