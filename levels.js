/* ============================================
   LEVELS.JS
   All level layouts live here as plain data.
   Coordinate system: x grows right, y grows down.
   World width can exceed canvas width (camera scrolls).
============================================ */

// Each level is self-contained data - no shared mutable state between levels.
// platforms: {x,y,w,h, type}  type affects color/behavior ('ground','float','ice','crumble')
// coins: {x,y}
// enemies: {x,y,w,h,type,range,speed}  type: 'walker' (patrols), 'flyer' (sine flight), 'boss'
// spikes: {x,y,w,h}  instant hazard
// lava: {x,y,w,h}    instant hazard (kills like spikes, different render)
// springs: {x,y,w,h} bounces player up hard
// movingPlatforms: {x,y,w,h,axis:'x'|'y',range,speed,origin}
// goal: {x,y,w,h} portal to next level
// bg: gradient stops used by renderer; theme key selects decoration set

const LEVELS = [
  // ============================================================
  // LEVEL 1 — GRASSLAND MEADOWS (intro, gentle slopes, easy enemies)
  // ============================================================
  {
    id: 1,
    name: "Grassland Meadows",
    theme: "grassland",
    width: 2600,
    height: 540,
    gravity: 0.62,
    spawn: { x: 60, y: 400 },
    bg: { top: "#1b3a6b", bottom: "#4fb3e0" },
    platforms: [
      { x: 0,    y: 480, w: 700,  h: 60, type: "ground" },
      { x: 760,  y: 480, w: 260, h: 60, type: "ground" },
      { x: 900,  y: 380, w: 140, h: 24, type: "float" },
      { x: 1100, y: 480, w: 360, h: 60, type: "ground" },
      { x: 1180, y: 360, w: 120, h: 24, type: "float" },
      { x: 1540, y: 480, w: 200, h: 60, type: "ground" },
      { x: 1820, y: 420, w: 120, h: 24, type: "float" },
      { x: 2010, y: 480, w: 590, h: 60, type: "ground" },
    ],
    coins: [
      {x:300,y:420},{x:340,y:420},{x:380,y:420},
      {x:820,y:430},{x:930,y:330},{x:960,y:330},
      {x:1150,y:430},{x:1210,y:310},{x:1240,y:310},
      {x:1600,y:430},{x:1640,y:430},
      {x:1850,y:370},{x:2100,y:430},{x:2300,y:430},{x:2350,y:430},
    ],
    enemies: [
      { x: 780,  y: 446, w: 36, h: 34, type: "walker", range: 180, speed: 1.4 },
      { x: 1550, y: 446, w: 36, h: 34, type: "walker", range: 140, speed: 1.6 },
      { x: 2200, y: 446, w: 36, h: 34, type: "walker", range: 220, speed: 1.8 },
    ],
    spikes: [
      { x: 700, y: 470, w: 60, h: 20 },
    ],
    lava: [],
    springs: [
      { x: 1380, y: 458, w: 50, h: 22 },
    ],
    movingPlatforms: [],
    goal: { x: 2520, y: 380, w: 60, h: 100 },
  },

  // ============================================================
  // LEVEL 2 — CRYSTAL CAVERNS (darker, narrow gaps, ice platforms, more enemies)
  // ============================================================
  {
    id: 2,
    name: "Crystal Caverns",
    theme: "cave",
    width: 3000,
    height: 540,
    gravity: 0.62,
    spawn: { x: 60, y: 400 },
    bg: { top: "#0c0a1f", bottom: "#3a1f5e" },
    platforms: [
      { x: 0,    y: 480, w: 420,  h: 60, type: "ground" },
      { x: 480,  y: 420, w: 140, h: 24, type: "ice" },
      { x: 700,  y: 360, w: 140, h: 24, type: "ice" },
      { x: 920,  y: 480, w: 220, h: 60, type: "ground" },
      { x: 1220, y: 420, w: 100, h: 24, type: "float" },
      { x: 1400, y: 360, w: 100, h: 24, type: "float" },
      { x: 1580, y: 300, w: 100, h: 24, type: "float" },
      { x: 1760, y: 480, w: 340, h: 60, type: "ground" },
      { x: 2200, y: 420, w: 120, h: 24, type: "ice" },
      { x: 2420, y: 360, w: 120, h: 24, type: "ice" },
      { x: 2640, y: 480, w: 360, h: 60, type: "ground" },
    ],
    coins: [
      {x:200,y:420},{x:240,y:420},
      {x:510,y:370},{x:730,y:310},
      {x:980,y:430},{x:1020,y:430},
      {x:1250,y:370},{x:1430,y:310},{x:1610,y:250},
      {x:1850,y:430},{x:1900,y:430},{x:1950,y:430},
      {x:2240,y:370},{x:2460,y:310},
      {x:2750,y:430},{x:2800,y:430},{x:2850,y:430},
    ],
    enemies: [
      { x: 950,  y: 446, w: 36, h: 34, type: "walker", range: 160, speed: 1.6 },
      { x: 1800, y: 446, w: 36, h: 34, type: "walker", range: 260, speed: 2.0 },
      { x: 2120, y: 200, w: 38, h: 30, type: "flyer", range: 90, speed: 1.6 },
      { x: 2680, y: 446, w: 36, h: 34, type: "walker", range: 260, speed: 2.0 },
    ],
    spikes: [
      { x: 420, y: 470, w: 60, h: 20 },
      { x: 1140, y: 470, w: 80, h: 20 },
      { x: 2100, y: 470, w: 100, h: 20 },
    ],
    lava: [],
    springs: [
      { x: 2000, y: 458, w: 50, h: 22 },
    ],
    movingPlatforms: [
      { x: 1300, y: 470, w: 100, h: 22, axis: "y", range: 90, speed: 1.2, origin: 470 },
    ],
    goal: { x: 2920, y: 380, w: 60, h: 100 },
  },

  // ============================================================
  // LEVEL 3 — SKYLINE ASCENT (lots of moving platforms, flyers)
  // ============================================================
  {
    id: 3,
    name: "Skyline Ascent",
    theme: "sky",
    width: 3200,
    height: 600,
    gravity: 0.58,
    spawn: { x: 60, y: 420 },
    bg: { top: "#0a2a4a", bottom: "#7fd4ff" },
    platforms: [
      { x: 0,    y: 480, w: 360, h: 60, type: "ground" },
      { x: 470,  y: 420, w: 110, h: 24, type: "float" },
      { x: 670,  y: 360, w: 110, h: 24, type: "float" },
      { x: 880,  y: 300, w: 110, h: 24, type: "float" },
      { x: 1090, y: 380, w: 130, h: 24, type: "float" },
      { x: 1320, y: 460, w: 200, h: 30, type: "ground" },
      { x: 1640, y: 420, w: 90,  h: 24, type: "float" },
      { x: 1860, y: 340, w: 90,  h: 24, type: "float" },
      { x: 2080, y: 260, w: 90,  h: 24, type: "float" },
      { x: 2300, y: 360, w: 90,  h: 24, type: "float" },
      { x: 2540, y: 460, w: 280, h: 30, type: "ground" },
      { x: 2920, y: 480, w: 280, h: 60, type: "ground" },
    ],
    coins: [
      {x:500,y:370},{x:700,y:310},{x:910,y:250},{x:1120,y:330},
      {x:1380,y:410},{x:1430,y:410},
      {x:1665,y:370},{x:1885,y:290},{x:2105,y:210},{x:2325,y:310},
      {x:2600,y:410},{x:2650,y:410},{x:2700,y:410},
      {x:2980,y:430},{x:3030,y:430},{x:3080,y:430},
    ],
    enemies: [
      { x: 700,  y: 200, w: 38, h: 30, type: "flyer", range: 100, speed: 1.8 },
      { x: 1350, y: 426, w: 36, h: 34, type: "walker", range: 150, speed: 2.0 },
      { x: 1900, y: 220, w: 38, h: 30, type: "flyer", range: 120, speed: 2.0 },
      { x: 2570, y: 426, w: 36, h: 34, type: "walker", range: 220, speed: 2.2 },
      { x: 2950, y: 446, w: 36, h: 34, type: "walker", range: 220, speed: 2.2 },
    ],
    spikes: [
      { x: 360, y: 470, w: 110, h: 20 },
      { x: 1230, y: 470, w: 90, h: 20 },
    ],
    lava: [],
    springs: [
      { x: 1540, y: 458, w: 50, h: 22 },
    ],
    movingPlatforms: [
      { x: 1480, y: 380, w: 110, h: 22, axis: "y", range: 140, speed: 1.6, origin: 380 },
      { x: 2440, y: 280, w: 110, h: 22, axis: "x", range: 160, speed: 1.8, origin: 2440 },
    ],
    goal: { x: 3140, y: 380, w: 60, h: 100 },
  },

  // ============================================================
  // LEVEL 4 — MOLTEN DEPTHS (lava everywhere, crumble jumps, fast enemies)
  // ============================================================
  {
    id: 4,
    name: "Molten Depths",
    theme: "lava",
    width: 3200,
    height: 540,
    gravity: 0.65,
    spawn: { x: 60, y: 400 },
    bg: { top: "#2a0a0a", bottom: "#8a1f0a" },
    platforms: [
      { x: 0,    y: 480, w: 300, h: 60, type: "ground" },
      { x: 380,  y: 480, w: 120, h: 60, type: "ground" },
      { x: 590,  y: 420, w: 90,  h: 24, type: "crumble" },
      { x: 760,  y: 360, w: 90,  h: 24, type: "crumble" },
      { x: 930,  y: 420, w: 90,  h: 24, type: "crumble" },
      { x: 1100, y: 480, w: 200, h: 60, type: "ground" },
      { x: 1400, y: 480, w: 110, h: 60, type: "ground" },
      { x: 1610, y: 420, w: 90,  h: 24, type: "float" },
      { x: 1800, y: 480, w: 110, h: 60, type: "ground" },
      { x: 2010, y: 420, w: 90,  h: 24, type: "crumble" },
      { x: 2190, y: 360, w: 90,  h: 24, type: "crumble" },
      { x: 2370, y: 420, w: 90,  h: 24, type: "crumble" },
      { x: 2550, y: 480, w: 200, h: 60, type: "ground" },
      { x: 2860, y: 480, w: 340, h: 60, type: "ground" },
    ],
    coins: [
      {x:610,y:370},{x:780,y:310},{x:950,y:370},
      {x:1150,y:430},{x:1200,y:430},
      {x:1630,y:370},
      {x:1830,y:430},
      {x:2030,y:370},{x:2210,y:310},{x:2390,y:370},
      {x:2600,y:430},{x:2650,y:430},
      {x:2920,y:430},{x:2970,y:430},{x:3020,y:430},{x:3070,y:430},
    ],
    enemies: [
      { x: 1120, y: 446, w: 36, h: 34, type: "walker", range: 140, speed: 2.4 },
      { x: 1420, y: 446, w: 36, h: 34, type: "walker", range: 70,  speed: 2.0 },
      { x: 1820, y: 446, w: 36, h: 34, type: "walker", range: 70,  speed: 2.2 },
      { x: 2580, y: 446, w: 36, h: 34, type: "walker", range: 150, speed: 2.6 },
      { x: 2900, y: 446, w: 36, h: 34, type: "walker", range: 260, speed: 2.8 },
      { x: 2300, y: 260, w: 38, h: 30, type: "flyer", range: 100, speed: 2.2 },
    ],
    spikes: [
      { x: 300, y: 470, w: 80, h: 20 },
    ],
    lava: [
      { x: 500,  y: 500, w: 90,  h: 40 },
      { x: 680,  y: 500, w: 80,  h: 40 },
      { x: 850,  y: 500, w: 80,  h: 40 },
      { x: 1020, y: 500, w: 80,  h: 40 },
      { x: 1310, y: 500, w: 90,  h: 40 },
      { x: 1510, y: 500, w: 100, h: 40 },
      { x: 1700, y: 500, w: 100, h: 40 },
      { x: 1910, y: 500, w: 100, h: 40 },
      { x: 2100, y: 500, w: 90,  h: 40 },
      { x: 2280, y: 500, w: 90,  h: 40 },
      { x: 2460, y: 500, w: 90,  h: 40 },
      { x: 2750, y: 500, w: 110, h: 40 },
    ],
    springs: [
      { x: 1330, y: 458, w: 50, h: 22 },
    ],
    movingPlatforms: [
      { x: 1240, y: 380, w: 100, h: 22, axis: "x", range: 130, speed: 2.0, origin: 1240 },
    ],
    goal: { x: 3120, y: 380, w: 60, h: 100 },
  },

  // ============================================================
  // LEVEL 5 — NEON CASTLE (gauntlet finale with a boss enemy)
  // ============================================================
  {
    id: 5,
    name: "Neon Castle",
    theme: "castle",
    width: 3400,
    height: 540,
    gravity: 0.62,
    spawn: { x: 60, y: 400 },
    bg: { top: "#170a2e", bottom: "#5a1a8a" },
    platforms: [
      { x: 0,    y: 480, w: 320, h: 60, type: "ground" },
      { x: 420,  y: 480, w: 160, h: 60, type: "ground" },
      { x: 660,  y: 400, w: 100, h: 24, type: "float" },
      { x: 840,  y: 320, w: 100, h: 24, type: "float" },
      { x: 1020, y: 400, w: 100, h: 24, type: "float" },
      { x: 1220, y: 480, w: 240, h: 60, type: "ground" },
      { x: 1560, y: 420, w: 90,  h: 24, type: "ice" },
      { x: 1740, y: 360, w: 90,  h: 24, type: "ice" },
      { x: 1920, y: 420, w: 90,  h: 24, type: "ice" },
      { x: 2100, y: 480, w: 220, h: 60, type: "ground" },
      { x: 2420, y: 420, w: 90,  h: 24, type: "crumble" },
      { x: 2600, y: 360, w: 90,  h: 24, type: "crumble" },
      { x: 2780, y: 420, w: 90,  h: 24, type: "crumble" },
      { x: 2960, y: 480, w: 440, h: 60, type: "ground" }, // boss arena floor
    ],
    coins: [
      {x:680,y:350},{x:860,y:270},{x:1040,y:350},
      {x:1280,y:430},{x:1330,y:430},{x:1380,y:430},
      {x:1585,y:370},{x:1765,y:310},{x:1945,y:370},
      {x:2150,y:430},{x:2200,y:430},
      {x:2440,y:370},{x:2620,y:310},{x:2800,y:370},
      {x:3050,y:430},{x:3100,y:430},{x:3150,y:430},
    ],
    enemies: [
      { x: 440,  y: 446, w: 36, h: 34, type: "walker", range: 120, speed: 2.0 },
      { x: 1240, y: 446, w: 36, h: 34, type: "walker", range: 200, speed: 2.2 },
      { x: 760,  y: 220, w: 38, h: 30, type: "flyer", range: 110, speed: 2.0 },
      { x: 2120, y: 446, w: 36, h: 34, type: "walker", range: 180, speed: 2.4 },
      { x: 1830, y: 260, w: 38, h: 30, type: "flyer", range: 130, speed: 2.4 },
      // BOSS — bigger, tougher walker, takes 3 stomps (handled via hp in game.js)
      { x: 3150, y: 426, w: 70, h: 54, type: "boss", range: 260, speed: 2.0, hp: 3 },
    ],
    spikes: [
      { x: 320, y: 470, w: 100, h: 20 },
      { x: 1460, y: 470, w: 100, h: 20 },
      { x: 2320, y: 470, w: 100, h: 20 },
    ],
    lava: [],
    springs: [
      { x: 1140, y: 458, w: 50, h: 22 },
      { x: 2900, y: 458, w: 50, h: 22 },
    ],
    movingPlatforms: [
      { x: 1140, y: 340, w: 90, h: 22, axis: "y", range: 100, speed: 1.6, origin: 340 },
    ],
    goal: { x: 3320, y: 380, w: 60, h: 100 },
  },
];
