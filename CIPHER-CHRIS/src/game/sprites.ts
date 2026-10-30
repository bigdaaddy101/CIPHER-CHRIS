/* Pixel sprite library: every sprite is a string-map + palette, pre-rendered
   once to an offscreen canvas and blitted with drawImage. "." = transparent. */

export interface SpriteDef {
  pal: Record<string, string>;
  rows: string[];
}

const CHAR_PAL: Record<string, string> = {
  h: "#111116", // pure jet-black hair
  d: "#050508", // deep black hair shadow & eyebrows
  H: "#2a2a33", // natural glossy black hair highlight
  s: "#f0bd8f", // warm bare skin
  S: "#d49566", // skin contour, chest & under-belly shadow
  L: "#fbe0c4", // soft top highlight on shoulders & round belly
  r: "#e59a7d", // warm cheek blush
  n: "#b5744c", // nipples, belly button & grin shadow
  e: "#14101f", // pupils / mouth line
  w: "#f4f3ff", // eye whites, shorts side stripes & drawstrings
  p: "#16161d", // comfy black athletic lounge shorts
  P: "#2b2b36", // black elastic waistband highlight
  J: "#09090d", // deep black shorts fold & shadow
};

// 26w x 46h true LucasArts VGA human scale (matches 74px doors & 36px counters!)
const CHAR_HEAD = [
  ".........hh..Hhh..........", // 00 (26)
  ".......hhhhhhhhhhhh.......", // 01 (26)
  "......hhhhHhhhhhhhhh......", // 02 (26)
  ".....hhhhhhdhhhhhhhhh.....", // 03 (26)
  ".....hhhsssssssssshhh.....", // 04 (26)
  ".....hhssddssssddsshh.....", // 05 (26)
  ".....hssswesssswesssh.....", // 06 (26)
  "....ssssswesssswesssss....", // 07 (26)
  "....ssrrssssnnssssrrss....", // 08 (26)
  "....ssssssseeeesssssss....", // 09 (26)
  ".....sssssssnnsssssss.....", // 10 (26)
  ".....SSSSSSSSSSSSSSSS.....", // 11 double-chin & neck shadow (26)
  "......ssssssssssssss......", // 12 thick neck (26)
];

const CHAR_TORSO_IDLE = [
  "....ssLLLLLLssLLLLLLss....", // 13 broad bare shoulders
  "...ssssLLLLssssLLLLssss...", // 14
  "..ssssssLssssssssLssssss..", // 15
  ".sssss.ssssssssssss.sssss.", // 16 upper arms + chest
  ".ssss..sssnssssnsss..ssss.", // 17 nipples
  "ssss...sSSSSssSSSSs...ssss", // 18 soft pec shadow curve
  "ssss...ssLLLLLLLLss...ssss", // 19 upper round belly dome
  "ssss..ssLLLLLLLLLLss..ssss", // 20 wide belly highlight
  "ssss..ssLLLLssssssSs..ssss", // 21
  "sssS..ssssssssssssSS..Ssss", // 22 widest round belly!
  "ssss..ssssssssssssSS..ssss", // 23 hands + lower belly
  ".ssS..ssSssssnnsssSS..Sss.", // 24 belly button!
  "......ssSSSSSSSSSSss......", // 25 under-belly overhang
  ".......SSSSSSSSSSSS.......", // 26 shadow above waistband
  ".....PPPPPPwPPwPPPPPP.....", // 27 elastic waistband + tie
  "....wppppppwJJwppppppw....", // 28 drawstrings
];

const CHAR_TORSO_WALK_A = [
  "....ssLLLLLLssLLLLLLss....", // 13
  "...ssssLLLLssssLLLLssss...", // 14
  "..ssssssLssssssssLssssss..", // 15
  "..ssss.ssssssssssss.ssss..", // 16
  ".ssss..sssnssssnsss..ssss.", // 17
  ".ssss..sSSSSssSSSSs...ssss", // 18 forward/back arm swing
  ".sssS..ssLLLLLLLLss...ssss", // 19
  "..ss..ssLLLLLLLLLLss..sssS", // 20
  "......ssLLLLssssssSs...ss.", // 21
  "......ssssssssssssSS......", // 22
  "......ssssssssssssSS......", // 23
  "......ssSssssnnsssSS......", // 24
  "......ssSSSSSSSSSSss......", // 25
  ".......SSSSSSSSSSSS.......", // 26
  ".....PPPPPPwPPwPPPPPP.....", // 27
  "....wppppppwJJwppppppw....", // 28
];

const CHAR_TORSO_WALK_B = [
  "....ssLLLLLLssLLLLLLss....", // 13
  "...ssssLLLLssssLLLLssss...", // 14
  "..ssssssLssssssssLssssss..", // 15
  "..ssss.ssssssssssss.ssss..", // 16
  ".ssss..sssnssssnsss..ssss.", // 17
  "ssss...sSSSSssSSSSs..ssss.", // 18 opposite arm swing
  "ssss...ssLLLLLLLLss..Ssss.", // 19
  "Ssss..ssLLLLLLLLLLss..ss..", // 20
  ".ss...ssLLLLssssssSs......", // 21
  "......ssssssssssssSS......", // 22
  "......ssssssssssssSS......", // 23
  "......ssSssssnnsssSS......", // 24
  "......ssSSSSSSSSSSss......", // 25
  ".......SSSSSSSSSSSS.......", // 26
  ".....PPPPPPwPPwPPPPPP.....", // 27
  "....wppppppwJJwppppppw....", // 28
];

const CHAR_LEGS_IDLE = [
  "....wpppppppJJpppppppw....", // 29 comfy wide gym shorts
  "....wppppppJ..Jppppppw....", // 30
  "....wppppppJ..Jppppppw....", // 31
  "....wppppppJ..Jppppppw....", // 32
  "....wwwwwwwJ..Jwwwwwww....", // 33 athletic hem trim
  ".....sssssS....Ssssss.....", // 34 knees
  ".....ssssss....ssssss.....", // 35 sturdy calves
  ".....ssssss....ssssss.....", // 36
  ".....sssssS....Ssssss.....", // 37
  "......ssssS....Sssss......", // 38 ankles
  ".....sssssS....Ssssss.....", // 39 bare feet
  "....ssssssS....Sssssss....", // 40
  "...ssssssss....ssssssss...", // 41 toes
  "...SSSSSSSS....SSSSSSSS...", // 42 sole shadow
];

const CHAR_LEGS_WALK_A = [
  "....wpppppppJJpppppppw....", // 29
  "...wpppppppJ..Jpppppppw...", // 30
  "...wppppppJ....Jppppppw...", // 31
  "..wppppppJ......Jppppppw..", // 32
  "..wwwwwwwJ......Jwwwwwww..", // 33
  "...sssssS........Ssssss...", // 34 stride left leg forward
  "..ssssss..........ssssss..", // 35
  "..ssssss..........ssssss..", // 36
  "..sssssS..........Ssssss..", // 37
  "..ssssS............Sssss..", // 38
  ".sssssS............Ssssss.", // 39
  "ssssssS............Sssssss", // 40
  "SSSSSSSS..........SSSSSSSS", // 41
  "..........................", // 42 slight mid-step lift
];

const CHAR_LEGS_WALK_B = [
  "....wpppppppJJpppppppw....", // 29
  "....wppppppJ..Jppppppw....", // 30
  "...wppppppJ....Jppppppw...", // 31
  "...wppppppJ....Jppppppw...", // 32
  "...wwwwwwwJ....Jwwwwwww...", // 33
  "....sssssS......Ssssss....", // 34 passing stride
  "....ssssss......ssssss....", // 35
  "....sssssS......Ssssss....", // 36
  "....ssssS........Sssss....", // 37
  "...sssssS........Ssssss...", // 38
  "..ssssssS........Sssssss..", // 39
  "..ssssssss......ssssssss..", // 40
  "..SSSSSSSS......SSSSSSSS..", // 41
  "..........................", // 42
];

const charHeadBlink = [...CHAR_HEAD];
charHeadBlink[6] = ".....hssssssssssssssh.....";
charHeadBlink[7] = "....ssssssddssssddssss....";

// Seated on a real chair: upright torso, hips on the cushion, knees apart,
// lower legs and bare feet planted on the floor. Same 26x43 anchor as standing.
const CHAR_LEGS_SIT = [
  "....wpppppppJJpppppppw....", // 29 hips on seat
  "....wpppppppJJpppppppw....", // 30
  "....wppppppppppppppppw....", // 31
  "..pppppppppppppppppppppp..", // 32 thighs project forward
  "..wwwwwwwwwwwwwwwwwwwwww..", // 33 athletic hems
  "..ssssss..........ssssss..", // 34 knees
  "..ssssss..........ssssss..", // 35
  "..sssssS..........Ssssss..", // 36 lower legs
  "..sssssS..........Ssssss..", // 37
  "..sssssS..........Ssssss..", // 38
  ".ssssssS..........Sssssss.", // 39 ankles/feet
  ".sssssss..........sssssss.", // 40 bare feet
  ".SSSSSSS..........SSSSSSS.", // 41 sole shadow
  "..........................", // 42 grounded baseline
];

// Horizontal lying pose: head on the left pillow, round bare belly in the
// middle, black shorts and bare legs extending right. 54x20, bottom anchored.
const CHAR_LAY_ROWS = [
  "......................................................",
  "...hhhh...............................................",
  "..hhhhhh..............................................",
  "..hsssssh....ssssssssssssssssssss.....................",
  "..hseessh..ssLLLLLLLLLLLLLLLLLLss.....................",
  "..hssnnsh.ssLLLLLLLLLLLLLLLLLLLLLss...................",
  "...sssss..sLLLLLLLLLLLLLLLLLLLLLLLss..................",
  "....sss...ssLLLLssssssssssssssssSSss..................",
  "...........ssssssssnnssssssssssSSSss..................",
  "...........sSSSSSSSSSSSSSSSSSSSSSSSs..................",
  "............SSSSSSSSSSSSSSSSSSSSSSS...................",
  "................ssssssssssssssss......................",
  "...............ssssssssssssss.........................",
  "....................pppppppppppppppppppppppp..........",
  "....................wppppppppppppppppppppppppw........",
  "....................wppppppppppppppppppppppppw........",
  "....................wwwwwwwwwwwwwwwwwwwwwwwwww........",
  "....................................ssssssssssssssssss",
  "....................................ssssssssssssssssss",
  "....................................SSSSSSSSSSSSSSSSSS",
];

/* Lynx-point Siamese: cream body, lighter brown points with dark tabby
   stripes, forehead M, striped legs, ringed tail and blue eyes. */
const CAT_PAL: Record<string, string> = {
  c: "#3b2418", // dark tabby stripes / ear edges
  k: "#7a5946", // warm lynx-point base on mask, legs and tail
  C: "#efe3cc", // cream body
  B: "#d9c7a8", // cream shadow
  e: "#38bdf8", // blue Siamese eyes
  E: "#0f172a", // pupil
  n: "#e07a9a", // pink nose
  w: "#8f8bb5", // whiskers
};

export const SPRITES: Record<string, SpriteDef> = {
  charIdle: { pal: CHAR_PAL, rows: [...CHAR_HEAD, ...CHAR_TORSO_IDLE, ...CHAR_LEGS_IDLE] },
  charWalk: { pal: CHAR_PAL, rows: [...CHAR_HEAD, ...CHAR_TORSO_WALK_A, ...CHAR_LEGS_WALK_A] },
  charWalk2: { pal: CHAR_PAL, rows: [...CHAR_HEAD, ...CHAR_TORSO_WALK_B, ...CHAR_LEGS_WALK_B] },
  charBlink: { pal: CHAR_PAL, rows: [...charHeadBlink, ...CHAR_TORSO_IDLE, ...CHAR_LEGS_IDLE] },
  charSit: { pal: CHAR_PAL, rows: [...CHAR_HEAD, ...CHAR_TORSO_IDLE, ...CHAR_LEGS_SIT] },
  charLay: { pal: CHAR_PAL, rows: CHAR_LAY_ROWS },

  // Lynx-point Siamese sitting: tabby forehead M, striped mask/legs and ringed tail
  catSit: {
    pal: CAT_PAL,
    rows: [
      "..c..........c..",
      ".ccc........ccc.",
      ".cckkkkkkkkkkcc.",
      ".ckkckkkkkkckkc.",
      ".CCCkkCCCCkkCCC.",
      ".CCceEkcckEecCC.",
      "w.CkccnnncckC.w.",
      "..CCkkkkkkkkCC..",
      ".CCCCCCCCCCCCCC.",
      ".CCCCCCCCCCCCCkk",
      ".CBBBBBBBBBBBBkc",
      "..kkc..kc..kkc..",
      "..ckk..kc..ckk..",
    ],
  },
  // Lynx-point Siamese sleeping: cream loaf, tabby mask and striped tail wrap
  catSleep: {
    pal: CAT_PAL,
    rows: [
      ".....ccc........",
      "...cckkkkcc.....",
      "..ckkkkkkkkc....",
      ".CCCCCCCCCCCC.kc",
      ".CCCCCCCCCCCCkcc",
      ".CBBBBBBBBBBBBkc",
      "..kckckckckckck.",
    ],
  },
  // Lynx-point Siamese walking frame A (right): striped points + ringed tail
  catWalk1: {
    pal: CAT_PAL,
    rows: [
      ".............c..c.",
      ".............cccc.",
      "..........cckCeCc.",
      "k.........ckCcnCc.",
      "kc....CCCCCCCCCCc.",
      ".ck.CCCCCCCCCCCC..",
      "..kcCCCCCCCCCCC...",
      "....BBBBBBBBBB....",
      "....kc..kc..kc....",
      "...ck...kc...ck...",
    ],
  },
  // Lynx-point Siamese walking frame B (right): alternate leg stripes
  catWalk2: {
    pal: CAT_PAL,
    rows: [
      ".............c..c.",
      ".............cccc.",
      "..........cckCeCc.",
      ".k........ckCcnCc.",
      ".kc...CCCCCCCCCCc.",
      "..ck.CCCCCCCCCCC..",
      "..kcCCCCCCCCCCC...",
      "....BBBBBBBBBB....",
      ".....kc..kc.kc....",
      ".....ck..kc..ck...",
    ],
  },
  // Lynx-point Siamese standing side view (idle)
  catStand: {
    pal: CAT_PAL,
    rows: [
      ".............c..c.",
      ".............cccc.",
      "..........cckCeCc.",
      "k.........ckCcnCc.",
      "kc....CCCCCCCCCCc.",
      ".ck.CCCCCCCCCCCC..",
      "..kcCCCCCCCCCCC...",
      "....BBBBBBBBBB....",
      "....kc.kc..kc.kc..",
      "....ck.kc..ck.kc..",
    ],
  },

  plant: {
    pal: { g: "#2f8f57", G: "#4ade80", d: "#1c5e38", t: "#8c5230", T: "#633820" },
    rows: [
      "........gg..gg......",
      "....gg...GGGG...gg..",
      "..ggGGg..GGGG..gGGgg",
      ".gGGGGGg.gGGg.gGGGGg",
      "..ggggGGggGGggGGggg.",
      "....ddgGGGGGGGGgdd..",
      "..ggGGGGGGGGGGGGgg..",
      ".gGGGGgddgGGgddgGGGg",
      "..gggg...gGGg...ggg.",
      "....gg..gGGGGg..gg..",
      "...gGGggGGGGGGggGGg.",
      "....ggggdGGGGdgggg..",
      "........ddGGdd......",
      ".........dGGd.......",
      ".........dddd.......",
      ".....tttttttttttt...",
      "....tttttttttttttt..",
      "....TTTTTTTTTTTTTT..",
      ".....TTTTTTTTTTTT...",
      ".....TTTTTTTTTTTT...",
      "......TTTTTTTTTT....",
      "......TTTTTTTTTT....",
      ".......TTTTTTTT.....",
    ],
  },

  telescope: {
    pal: { m: "#a7a3cc", M: "#625d8c", d: "#262157", l: "#22d3ee", g: "#fbbf24" },
    rows: [
      "....................llll..",
      ".................gmmmmmmg.",
      "...............mmmmmmmmmd.",
      ".............mmmmmmmmmmm..",
      "...........mmmmmmmmmmmm...",
      ".........mmmmmmmmmmmm.....",
      ".......mmmmmmmmmmmm.......",
      ".....gmmmmmmmmmmm.........",
      "...mmmmmmmmmmmm...........",
      "..gmmmmmmmmm..............",
      "..ddddMMMMdd..............",
      "......MMMM................",
      ".....gMMMMg...............",
      "......MMMM................",
      ".....MM..MM...............",
      "....MM...MM...............",
      "....MM....MM..............",
      "...MM..M..MM..............",
      "...MM..M...MM.............",
      "..MM...M...MM.............",
      "..MM...M....MM............",
      ".MM....M....MM............",
      ".MM....M.....MM...........",
      "MM.....M.....MM...........",
      "gg.....g.....gg...........",
    ],
  },

  dish: {
    pal: { m: "#b4b0d9", M: "#6b6699", d: "#262157", r: "#f471b5", c: "#22d3ee" },
    rows: [
      ".......mmmmmmmm.......",
      ".....mmmmmmmmmmmm.....",
      "...mmmmmmmmmmmmmmmm...",
      "..mmmmmmmmmmmmmmmmmm..",
      ".mmmMMMmmmmmmmmMMMmmm.",
      ".mmMMMmmmmmmmmmmMMMmm.",
      "..mmmmmmmmmmmmmmmmmm..",
      "...mmmmmmmmmmmm..rr...",
      "....mmmmmmmmmm..Mcc...",
      ".....mmmmmmmm.MM......",
      "......ddddddMM........",
      "........dddd..........",
      "........dddd..........",
      "........dddd..........",
      ".......dddddd.........",
      ".....dddddddddd.......",
    ],
  },

  duck: {
    pal: { y: "#fbbf24", Y: "#f59e0b", o: "#f97316", e: "#14101f" },
    rows: [
      "...yyy....",
      "..yeyyy...",
      "..yyyyoo..",
      "...yyyy...",
      ".yyyyyyy..",
      "yyYYYYyyy.",
      ".yyyyyyyy.",
      "..YYYYYY..",
    ],
  },

  trophy: {
    pal: { g: "#fbbf24", G: "#b45309" },
    rows: [
      "g.gggggg.g",
      "gg.gggg.gg",
      ".gggggggg.",
      ".gggggggg.",
      "..gggggg..",
      "...gggg...",
      "....gg....",
      "...gggg...",
      "..gggggg..",
      ".GGGGGGGG.",
    ],
  },

  /* ---------- inventory item icons (14x14-ish) ---------- */
  itemPizza: {
    pal: { c: "#d9822b", y: "#fbbf24", r: "#dc2626", Y: "#f59e0b" },
    rows: [
      ".cccccccccccc.",
      ".yyyyyyyyyyyy.",
      "..yyryyyyryy..",
      "..yyyyyyyyyy..",
      "...yryyyyry...",
      "...yyyyyyyy...",
      "....yyryyy....",
      "....yyyyyy....",
      ".....yyyy.....",
      ".....yryy.....",
      "......yy......",
      "......yy......",
      "......Y.......",
    ],
  },
  itemDrink: {
    pal: { g: "#4ade80", G: "#16a34a", s: "#c9c6e8", d: "#14532d" },
    rows: [
      "....ssssss....",
      "....ssssss....",
      "....gggggg....",
      "....gggggg....",
      "....ggGGgg....",
      "....gGGGGg....",
      "....gGddGg....",
      "....gGddGg....",
      "....gGGGGg....",
      "....ggGGgg....",
      "....gggggg....",
      "....gggggg....",
      "....ssssss....",
    ],
  },
  itemCoffee: {
    pal: { w: "#e8e6f7", c: "#6b4226", p: "#00e5ff", s: "#9d97c9" },
    rows: [
      ".....s..s.....",
      "....s..s......",
      ".....s..s.....",
      "..wwwwwwww....",
      "..wccccccw.w..",
      "..wwwwwwww..w.",
      "..wwppwwww.w..",
      "..wwppwwww....",
      "..wwwwwwww....",
      "...wwwwww.....",
      ".wwwwwwwwww...",
      ".wwwwwwwwww...",
    ],
  },
  itemUsb: {
    pal: { s: "#c9c6e8", d: "#14122b", p: "#00e5ff", P: "#0096c7" },
    rows: [
      ".....ssss.....",
      ".....sdds.....",
      ".....sdds.....",
      ".....ssss.....",
      "....pppppp....",
      "....pPPPPp....",
      "....pPssPp....",
      "....pPssPp....",
      "....pPPPPp....",
      "....pppppp....",
      "....pppppp....",
      ".....pppp.....",
    ],
  },
  itemCoin: {
    pal: { g: "#fbbf24", G: "#b45309", y: "#fde68a" },
    rows: [
      "....gggggg....",
      "..ggyyyyyygg..",
      ".gyyGGGGGGyyg.",
      ".gyGggggggGyg.",
      ".yGgggyygggGy.",
      ".yGggyyyyggGy.",
      ".yGgggyygggGy.",
      ".gyGggggggGyg.",
      ".gyyGGGGGGyyg.",
      "..ggyyyyyygg..",
      "....gggggg....",
    ],
  },
  itemKeycard: {
    pal: { c: "#22d3ee", C: "#0e7490", d: "#14122b", w: "#e8e6f7" },
    rows: [
      "..............",
      ".cccccccccccc.",
      ".cCCCCCCCCCCc.",
      ".cCddddddddCc.",
      ".cCCCCCCCCCCc.",
      ".cCwwCCCCCwCc.",
      ".cCwwCCCCCwCc.",
      ".cCCCCCCCCCCc.",
      ".cCwwwwwwCCCc.",
      ".cccccccccccc.",
      "..............",
    ],
  },
  itemFloppy: {
    pal: { g: "#fbbf24", G: "#b45309", s: "#fef3c7", d: "#14122b" },
    rows: [
      ".gggggggggggG.",
      ".gsssssssssgG.",
      ".gsddddddssgG.",
      ".gsdssssdsdgG.",
      ".gsddddddsdgG.",
      ".gsssssssssgG.",
      ".gggggggggggG.",
      ".ggssssssgggG.",
      ".ggsddddsgggG.",
      ".ggsddddsgggG.",
      ".ggssssssgggG.",
      ".gggggggggggG.",
      "..GGGGGGGGGG..",
    ],
  },
  itemBrew: {
    pal: { g: "#a3e635", G: "#65a30d", s: "#c9c6e8", d: "#1a2e05", y: "#fde68a" },
    rows: [
      "......ss......",
      ".....ssss.....",
      "......ss......",
      ".....ssss.....",
      "....sgggs.....",
      "....ggggg.....",
      "...gggyggg....",
      "...ggggggg....",
      "...gGGGGg.....",
      "...gyGGGg.....",
      "....gggg......",
      "....GGGG......",
    ],
  },

  /* ---------- project icons (16x16-ish) ---------- */
  projRocket: {
    pal: { w: "#e8e6f7", r: "#f471b5", b: "#22d3ee", o: "#f97316", y: "#fbbf24" },
    rows: [
      ".......ww.......",
      "......wwww......",
      ".....wwwwww.....",
      ".....wwbbww.....",
      ".....wwbbww.....",
      ".....wwwwww.....",
      "....wwwwwwww....",
      "...rwwwwwwwwr...",
      "...rrwwwwwwrr...",
      "...rr.wwww.rr...",
      "..rr...ww...rr..",
      "........ww......",
      ".......oyyo.....",
      "........yy......",
      "........o.......",
    ],
  },
  projCart: {
    pal: { m: "#22d3ee", M: "#0e7490", w: "#e8e6f7", d: "#14122b" },
    rows: [
      "................",
      ".m..............",
      ".mm.............",
      "..mmmmmmmmmmmm..",
      "...mMmMmMmMmM...",
      "....mMmMmMmM....",
      "....mmmmmmmm....",
      ".....mmmmmm.....",
      "................",
      "....dd....dd....",
      "...dwwd..dwwd...",
      "....dd....dd....",
    ],
  },
  projChart: {
    pal: { g: "#4ade80", c: "#22d3ee", p: "#00e5ff", w: "#e8e6f7" },
    rows: [
      "................",
      "..w.............",
      "..w......cc.....",
      "..w......cc..g..",
      "..w..pp..cc..g..",
      "..w..pp..cc..g..",
      "..w..pp..cc..g..",
      "..w..pp..cc..g..",
      "..w..pp..cc..g..",
      "..wwwwwwwwwwww..",
      "................",
    ],
  },
  projBot: {
    pal: { m: "#a7a3cc", M: "#6b6699", c: "#22d3ee", d: "#14122b", r: "#f471b5" },
    rows: [
      ".......r........",
      ".......m........",
      "....mmmmmmmm....",
      "...mmmmmmmmmm...",
      "...mccmmmmccm...",
      "...mccmmmmccm...",
      "...mmmmmmmmmm...",
      "...mmddddddmm...",
      "....mmmmmmmm....",
      "..m..mmmmmm..m..",
      "..m..mMMMMm..m..",
      ".....mmmmmm.....",
      ".....m....m.....",
      "....mm....mm....",
    ],
  },
  projPad: {
    pal: { p: "#00e5ff", P: "#0096c7", w: "#e8e6f7", r: "#f471b5", y: "#fbbf24", d: "#14122b" },
    rows: [
      "................",
      "..pppppppppppp..",
      ".pppppppppppppp.",
      ".ppwwpppppprypp.",
      "ppwwwwpppppyrppp",
      "ppwwpppppppppppp",
      "pppppppppppppppp",
      ".pppppppppppppp.",
      ".ppPppppppppPpp.",
      "..PP........PP..",
    ],
  },
  projCloud: {
    pal: { c: "#7dd3fc", C: "#38bdf8", w: "#e0f2fe" },
    rows: [
      "................",
      ".....wwww.......",
      "...wwwwwwww..w..",
      "..wwwwwwwwwwww..",
      ".wwwwwwwwwwwwww.",
      ".wCCCCCCCCCCCCw.",
      "..CCCCCCCCCCCC..",
      "................",
      "....c....c......",
      "....c....c......",
    ],
  },
};

/* ---------------- renderer / cache ---------------- */

const cache = new Map<string, HTMLCanvasElement>();

export function getSprite(name: string): HTMLCanvasElement {
  const hit = cache.get(name);
  if (hit) return hit;
  const def = SPRITES[name];
  const w = Math.max(...def.rows.map((r) => r.length));
  const h = def.rows.length;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d")!;
  def.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = def.pal[row[x]];
      if (col) {
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
  });
  cache.set(name, cv);
  return cv;
}

export function drawSprite(
  g: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  flip = false,
  scale = 1
) {
  const cv = getSprite(name);
  const w = cv.width * scale;
  const h = cv.height * scale;
  if (flip) {
    g.save();
    g.translate(Math.round(x + w), Math.round(y));
    g.scale(-1, 1);
    g.drawImage(cv, 0, 0, w, h);
    g.restore();
  } else {
    g.drawImage(cv, Math.round(x), Math.round(y), w, h);
  }
}

export function spriteSize(name: string): { w: number; h: number } {
  const cv = getSprite(name);
  return { w: cv.width, h: cv.height };
}
