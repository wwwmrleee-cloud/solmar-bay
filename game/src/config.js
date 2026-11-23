// Solmar Bay — constants, places, missions, shops and jobs.
// Every number here comes from the prose spec; nothing is borrowed
// from any earlier build. All text is written fresh for this rebuild.

export const WORLD_W = 3600;
export const WORLD_H = 2800;
export const WORLD_MARGIN = 20;

export const ROAD_V = [225, 675, 1125, 1575, 2025, 2475, 2925, 3375];
export const ROAD_H = [225, 675, 1125, 1575, 2025, 2475];
export const ROAD_WIDTH = 96;
export const SIDEWALK = 14;

export const DEFAULT_SEED = 1;
export const SAVE_KEY = 'solmar-bay-save-v1';
export const SAVE_VERSION = 2;

export const STEP = 1 / 60;
export const MAX_FRAME_DT = 0.05;

// Named places on the map. The label flag marks the eight places that
// carry a floating label above them while playing.
export const PLACES = {
  cafe: { name: 'Sunrise Cafe', x: 1125, y: 1230, label: true },
  hideout: { name: 'Hideout', x: 675, y: 2080, label: true },
  park: { name: 'Palm Park', x: 1800, y: 900, label: false },
  port: { name: 'Port', x: 450, y: 2520, label: false },
  beach: { name: 'Beach', x: 3450, y: 1400, label: false },
  harbourCash: { name: 'Harbour Cash', x: 450, y: 2560, label: false },
  downtown: { name: 'Downtown', x: 1575, y: 1125, label: false },
  garage: { name: 'Rusty Anchor Garage', x: 1575, y: 675, label: true },
  gunstore: { name: 'Harbour Arms', x: 2475, y: 1125, label: true },
  clinic: { name: 'Palm Clinic', x: 1125, y: 2025, label: true },
  casino: { name: 'Golden Palm Casino', x: 2925, y: 675, label: true },
  marina: { name: 'Marina', x: 3375, y: 1575, label: true },
  market: { name: 'Night Market', x: 2025, y: 1575, label: true },
};

// The eight places a side job can send Danny to.
export const JOB_PLACES = ['cafe', 'park', 'port', 'beach', 'downtown', 'casino', 'marina', 'market'];

// The player on foot.
export const PLAYER = {
  startX: 675,
  startY: 1125,
  startAngle: -Math.PI / 2,
  walkSpeed: 185,
  radius: 14,
  maxHealth: 100,
  ammoCap: 120,
  startAmmo: 60,
  enterCarRange: 70,
  interactRange: 80,
  packageRange: 70,
  hiddenRange: 60,
};

// Cars and driving.
export const CAR = {
  accel: 420,
  brake: 620,
  topSpeed: 430,
  tunedTopSpeed: 520,
  reverseMax: 150,
  radius: 20,
  steerRate: 2.1,
  minSteerSpeed: 20,
  coastDrag: 180,
  crashSpeed: 120,
  carHitSpeed: 150,
  pushRange: 44,
  smokeBelow: 40,
};

// Pedestrians.
export const PED = {
  count: 36,
  walkMin: 35,
  walkMax: 60,
  fleeSpeed: 130,
  fleeMin: 2.5,
  fleeMax: 3.5,
  scareRange: 420,
  sidewalkOffset: 62,
};

// Wanted level and the police.
export const WANTED = {
  pointsPerStar: 25,
  maxPoints: 125,
  maxStars: 5,
  hiddenRange: 650,
  hiddenDelay: 6,
  decayPerSecond: 20,
  gunfireRange: 500,
  gunfireCooldown: 5,
  maxPoliceCars: 4,
  maxOfficers: 4,
};

export const POLICE_CAR = {
  spawnMin: 700,
  spawnMax: 1000,
  steerRate: 2.4,
  chaseFoot: 340,
  stopRange: 90,
  chaseFar: 380,
  chaseNear: 140,
  ramRange: 46,
  ramDamage: 14,
};

export const OFFICER = {
  spawnMin: 380,
  spawnMax: 580,
  approachFar: 150,
  approachNear: 70,
  farRange: 220,
  nearRange: 90,
  bustRange: 42,
  shootRange: 420,
  cooldownMin: 1.4,
  cooldownExtra: 1.0,
  bulletSpeed: 620,
  bulletDamage: 6,
};

// Shooting and combat.
export const GUN = {
  fireInterval: 0.22,
  rapidInterval: 0.13,
  damage: 34,
  heavyDamage: 52,
  bulletSpeed: 760,
  bulletLife: 1.1,
  spread: 0.03,
  muzzleOffset: 22,
  hitRange: 18,
  pedHitRange: 14,
  policeHitRange: 24,
};

export const ENEMY = {
  bulletSpeed: 560,
  bulletLife: 1.2,
  bulletDamage: 6,
  bossBulletDamage: 9,
  shootRange: 520,
  cooldownMin: 1.3,
  cooldownMax: 2.2,
  spread: 0.175,
  walkSpeed: 55,
  stopRange: 260,
  bossSpread: 0.22,
  bossCooldownMin: 1.1,
  bossCooldownMax: 1.7,
  invulnTime: 0.25,
  playerHitRange: 15,
  carHitRange: 26,
};

// Story missions. The briefs and dialogue are paraphrases written for
// this rebuild; the meaning and the line counts follow the spec.
export const MISSIONS = [
  {
    name: 'Meet Mara',
    brief: 'Walk to the Sunrise Cafe and meet Mara Solis.',
    pay: 200,
    target: 'cafe',
    reach: 120,
    intro: [
      'Danny, right on time. I like that in a driver.',
      'I run the deliveries in this town. Drive for me and the money is steady.',
      'First job is simple. Just do not make a scene.',
    ],
  },
  {
    name: 'The Getaway',
    brief: 'Take the blue coupe by the cafe and drive it to the Hideout.',
    pay: 400,
    target: 'hideout',
    reach: 110,
    intro: [
      'That blue coupe by the cafe is ours now. Take it.',
      'The police are already looking, so drive it like you mean it.',
    ],
  },
  {
    name: 'Three Packages',
    brief: 'Collect the three drops at the Park, the Port and the Beach.',
    pay: 500,
    target: 'park',
    reach: 150,
    intro: [
      'Three drops waiting in three corners of town. Grab them all.',
      'Do not let the rival crew catch you carrying them.',
    ],
  },
  {
    name: 'Defend the Hideout',
    brief: 'Get back to the Hideout and hold the line against the crew.',
    pay: 600,
    target: 'hideout',
    reach: 130,
    intro: [
      'The rival crew found the hideout. Get back there and hold the line.',
      'There are six of them. Make every bullet count.',
    ],
  },
  {
    name: 'Harbour Heist',
    brief: 'Grab the harbour cash, then run for the Hideout.',
    pay: 1000,
    target: 'harbourCash',
    reach: 140,
    intro: [
      'One last job, the harbour cash, and then we are set.',
      'The whole police force will be on you. Drive like your life depends on it.',
    ],
  },
  {
    name: "Rico's Last Stand",
    brief: 'Take down Rico at the Hideout.',
    pay: 1200,
    target: 'hideout',
    reach: 130,
    intro: [
      'Rico is the one who sent that crew after us. He is at the hideout right now.',
      'He is big, armed and does not miss. Bring him down.',
    ],
  },
  {
    name: 'Captain Voss',
    brief: 'Take down Captain Voss at the Harbour.',
    pay: 1500,
    target: 'harbourCash',
    reach: 140,
    intro: [
      'Voss himself is coming to the harbour, with half the police force behind him.',
      'Take him down and then run for the hideout. This is the last job.',
    ],
  },
];

export const MISSION_REWARD_AMMO = 24;
export const MISSION_REWARD_HEALTH = 30;
export const TOTAL_MISSION_PAY = MISSIONS.reduce((n, m) => n + m.pay, 0);

// Bosses.
export const BOSSES = {
  rico: { name: 'Rico', health: 400, spawn: 'hideout', dx: 60, dy: -40 },
  voss: { name: 'Captain Voss', health: 350, spawn: 'harbourCash', dx: 60, dy: -40 },
};
export const MINION_HEALTH = 80;
export const MINION_OFFSET_X = 90;
export const MINION_OFFSET_Y = 60;

// Mission four rival spawn points, on roads around the Hideout.
export const M4_SPAWNS = [
  { x: 675, y: 1900 },
  { x: 675, y: 2260 },
  { x: 450, y: 2025 },
  { x: 500, y: 2025 },
  { x: 850, y: 2025 },
  { x: 900, y: 2025 },
];
export const RIVAL_HEALTH = 100;

// Mission three package spots, in order: Park, Port, Beach.
export const MISSION_PACKAGES = [
  { x: 1800, y: 900, label: 'Park' },
  { x: 450, y: 2520, label: 'Port' },
  { x: 3450, y: 1400, label: 'Beach' },
];

// Shops and upgrades.
export const SHOPS = {
  garage: {
    id: 'garage',
    name: 'Rusty Anchor Garage',
    keeper: 'Gus',
    place: 'garage',
    greeting: 'A car is a driver\'s life out here. I can make yours faster, or tougher.',
    items: ['tuned', 'armoured'],
  },
  gunstore: {
    id: 'gunstore',
    name: 'Harbour Arms',
    keeper: 'Lena',
    place: 'gunstore',
    greeting: 'If you want to survive a shootout, you buy the good rounds. No refunds.',
    items: ['heavy', 'rapid', 'mags'],
  },
  clinic: {
    id: 'clinic',
    name: 'Palm Clinic',
    keeper: 'Dr. Ana',
    place: 'clinic',
    greeting: 'I patch up drivers who pay cash. No questions, no paperwork.',
    items: ['tough', 'iron', 'kit'],
  },
};

export const UPGRADES = {
  tough: { id: 'tough', name: 'Tough Skin', price: 300, tier: 1, effect: 'Max health +25, heal 25', req: null },
  mags: { id: 'mags', name: 'Extended Mags', price: 250, tier: 1, effect: 'Ammo capacity 120 to 240', req: null },
  kit: { id: 'kit', name: 'Field Kit', price: 200, tier: 1, effect: 'Full heal and full ammo', req: null, repeatable: true },
  heavy: { id: 'heavy', name: 'Heavy Rounds', price: 400, tier: 2, effect: 'Pistol damage 34 to 52', req: null },
  rapid: { id: 'rapid', name: 'Rapid Trigger', price: 450, tier: 2, effect: 'Fire every 0.13s', req: null },
  tuned: { id: 'tuned', name: 'Tuned Engine', price: 600, tier: 2, effect: 'Car top speed 430 to 520', req: null },
  iron: { id: 'iron', name: 'Iron Will', price: 500, tier: 3, effect: 'Max health +25 more, heal 25', req: 'tough' },
  armoured: { id: 'armoured', name: 'Armoured Body', price: 550, tier: 3, effect: 'Car takes 40% less damage', req: 'tuned' },
};
export const UPGRADE_COUNT = 8;

// Side jobs.
export const JOBS = {
  taxi: { type: 'taxi', name: 'Taxi Fare', pay: 150, time: 90 },
  delivery: { type: 'delivery', name: 'Package Run', pay: 120, time: 120 },
  bounty: { type: 'bounty', name: 'Bounty', pay: 250, time: 150 },
};
export const JOB_CYCLE = ['taxi', 'delivery', 'bounty'];
export const BOUNTY_HEALTH = 120;
// How close Danny must be to pick up and drop off: a taxi fare is
// picked up from a car, so its radius is the generous one.
export const JOB_RADIUS = {
  taxiPickup: 90,
  taxiDrop: 120,
  deliveryPickup: 100,
  deliveryDrop: 100,
};

// Hidden packages.
export const HIDDEN_PACKAGES = [
  { x: 700, y: 250 },
  { x: 2900, y: 650 },
  { x: 2500, y: 2000 },
  { x: 350, y: 1600 },
  { x: 2050, y: 2500 },
  { x: 1125, y: 250 },
  { x: 2925, y: 2025 },
  { x: 675, y: 675 },
  { x: 2475, y: 250 },
  { x: 1575, y: 2475 },
  { x: 3375, y: 900 },
  { x: 450, y: 1125 },
];
export const PACKAGE_PAY = 50;

// The getaway car for mission two.
export const GETAWAY = { x: 1159, y: 1330, angle: Math.PI / 2, color: '#2f6fd0' };

// Traffic and parking.
export const TRAFFIC_COUNT = 12;
export const PARKED_VERTICAL = 16;
export const PARKED_HORIZONTAL = 6;
export const CAR_COLORS = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad', '#ecf0f1', '#2c3e50'];

// Clock: starts at 8:05, advances 30 game-minutes per real second.
export const CLOCK_START = 8 * 60 + 5;
export const CLOCK_RATE = 30;

// Shop panel.
export const SHOP_PANEL_WIDTH = 520;

// Minimap.
export const MINIMAP_W = 208;
export const MINIMAP_H = 162;
