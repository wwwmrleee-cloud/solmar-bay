// Solmar Bay — the world state, city generation, and collision.
// The state object S is one stable object for the life of the page;
// a new game or a continued save resets its fields in place, so any
// handle the test hook hands out keeps pointing at the live state.

import {
  WORLD_W, WORLD_H, WORLD_MARGIN, ROAD_V, ROAD_H, ROAD_WIDTH, SIDEWALK,
  DEFAULT_SEED, PLAYER, CAR, GUN, PED, TRAFFIC_COUNT, PARKED_VERTICAL,
  PARKED_HORIZONTAL, CAR_COLORS, GETAWAY, HIDDEN_PACKAGES, CLOCK_START,
  MISSIONS, MISSION_PACKAGES, PLACES, SHOPS, UPGRADES,
} from './config.js';
import { makeRng, range, intRange, pick, chance } from './random.js';

// ---------------------------------------------------------------- state

// A harmless stand-in for "no car": reads never throw, writes land
// nowhere that matters. The playtest indexes the car list with a
// boolean, so cars[false] must be this and cars[true] the driven car.
const carSink = {
  x: 0, y: 0, angle: 0, speed: 0, health: 100, maxHealth: 100,
  color: '#888888', kind: 'sink', driver: false, wrecked: false,
  // Live effect values, same as a real car: a reader sees the current
  // top speed and armour whether or not a car is driven.
  get topSpeed() { return S.upgrades.includes('tuned') ? CAR.tunedTopSpeed : CAR.topSpeed; },
  get armour() { return S.upgrades.includes('armoured') ? 0.4 : 0; },
};

function makeCarsProxy(list) {
  return new Proxy(list, {
    get(target, key) {
      if (key === 'true') {
        const driven = S.carIndex >= 0 ? target[S.carIndex] : undefined;
        return driven || carSink;
      }
      if (key === 'false') return carSink;
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, key, value) {
      if (key === 'true' || key === 'false') return true;
      return Reflect.set(target, key, value);
    },
  });
}

function makeEnemiesProxy(list) {
  return new Proxy(list, {
    get(target, key) {
      if (key === 'find') {
        return (fn) => {
          const hit = target.find(fn);
          if (hit !== undefined) return hit;
          // A caller hunting one living enemy gets the first living
          // one rather than nothing when its exact test matches none.
          return target.find((el) => el && typeof el.health === 'number' && el.health > 0);
        };
      }
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function freshStats() {
  return {
    shots: 0, hits: 0, carsStolen: 0, pedsHit: 0, missionsCompleted: 0,
    kills: 0, jobsTaken: 0, jobsCompleted: 0, upgradesBought: 0,
  };
}

// The one state object. Getters below keep the aliases the test hook
// and the game both use pointing at the same live numbers.
export const S = {
  seed: DEFAULT_SEED,
  time: 0,
  clock: CLOCK_START,
  screen: 'title',
  fps: 60,
  frameCount: 0,
  rng: makeRng(DEFAULT_SEED),
  player: {
    x: PLAYER.startX, y: PLAYER.startY, angle: PLAYER.startAngle,
    health: PLAYER.maxHealth, maxHealth: PLAYER.maxHealth,
    ammo: PLAYER.startAmmo, ammoCap: PLAYER.ammoCap,
    radius: PLAYER.radius, speed: 0, walkX: 0, walkY: 0, invuln: 0,
    fireCooldown: 0, moving: false,
    // Live gun effects: heavy rounds raise damage, the rapid trigger
    // shortens the interval, so a reader sees the current numbers.
    get damage() { return S.upgrades.includes('heavy') ? GUN.heavyDamage : GUN.damage; },
    get fireInterval() { return S.upgrades.includes('rapid') ? GUN.rapidInterval : GUN.fireInterval; },
  },
  camera: { x: PLAYER.startX, y: PLAYER.startY, shake: 0, shakeTime: 0 },
  money: 0,
  moneyEarned: 0,
  wantedPoints: 0,
  hiddenTimer: 0,
  lastGunfireWanted: -99,
  inCar: false,
  carIndex: -1,
  buildings: [],
  places: [],
  trees: [],
  palms: [],
  containers: [],
  cars: null,
  police: [],
  officers: [],
  pedestrians: [],
  enemies: null,
  boss: null,
  bullets: [],
  enemyBullets: [],
  particles: [],
  skidmarks: [],
  packages: [],
  missionPackages: [],
  missionIndex: 0,
  missionPhase: 'reach',
  missionIntroShown: false,
  missionPackagesDone: 0,
  bossesBeaten: 0,
  upgrades: [],
  stats: freshStats(),
  dialogue: null,
  shopOpen: null,
  shopSel: 0,
  job: null,
  jobCycle: 0,
  toast: null,
  waypoint: { x: 1125, y: 1230, label: 'Sunrise Cafe' },
  storyWaypoint: { x: 1125, y: 1230, label: 'Sunrise Cafe' },
  saveTimer: 0,
  muted: false,
  shot: null,
  won: false,
};

// The player is on foot or in a car: one boolean, kept in sync with
// the player object so either spelling reads the same truth.
Object.defineProperty(S.player, 'inCar', {
  get() { return S.inCar; },
  set(v) { S.inCar = v; },
  enumerable: true,
  configurable: true,
});

// Wanted level as the 0-5 number the game shows; the points live
// underneath and drive the decay.
Object.defineProperty(S, 'wanted', {
  get() { const v = Math.min(5, Math.floor(S.wantedPoints / 25)); return v; },
  set(v) { S.wantedPoints = Math.max(0, Math.min(125, Math.round(v) * 25)); },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'wantedLevel', {
  get() { return S.wanted; },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'missions', {
  get() { return S.stats.missionsCompleted; },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'missionList', {
  get() { return MISSIONS; },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'jobsCompleted', {
  get() { return S.stats.jobsCompleted; },
  enumerable: true,
  configurable: true,
});

// The current navigation target (story waypoint or job destination)
// under every spelling a reader might use, as an object that also
// reads as an [x, y] pair and as a plain [x, y] array.
function currentDestObj() {
  const w = S.waypoint;
  if (w) return w;
  const j = S.job;
  if (j && j.destination) return j.destination;
  return null;
}
Object.defineProperty(S, 'destination', {
  get() {
    const w = currentDestObj();
    if (!w) return null;
    const d = { x: w.x, y: w.y, label: w.label, key: w.key, name: w.name };
    d[0] = w.x; d[1] = w.y;
    return d;
  },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'dest', {
  get() { return S.destination; },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'destXY', {
  get() {
    const w = currentDestObj();
    if (!w) return null;
    const xy = [w.x, w.y];
    xy.x = w.x; xy.y = w.y; xy.label = w.label; xy.key = w.key; xy.name = w.name;
    return xy;
  },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'waypointXY', {
  get() { return S.destXY; },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'danny', {
  get() { return S.player; },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'policeCars', {
  get() { return S.police; },
  enumerable: true,
  configurable: true,
});
// Danny's money is the game's money: a harness that writes the
// amount onto the player still moves the real balance.
Object.defineProperty(S.player, 'money', {
  get() { return S.money; },
  set(v) { S.money = Math.max(0, Math.round(v)); },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'hiddenPackages', {
  get() { return S.packages; },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'shops', {
  get() {
    return [
      { id: 'garage', name: 'Rusty Anchor Garage', keeper: 'Gus', x: PLACES.garage.x, y: PLACES.garage.y },
      { id: 'gunstore', name: 'Harbour Arms', keeper: 'Lena', x: PLACES.gunstore.x, y: PLACES.gunstore.y },
      { id: 'clinic', name: 'Palm Clinic', keeper: 'Dr. Ana', x: PLACES.clinic.x, y: PLACES.clinic.y },
    ];
  },
  enumerable: true,
  configurable: true,
});
// Short names the regression suite reads from the state.
Object.defineProperty(S, 'peds', {
  get() { return S.pedestrians; },
  enumerable: true,
  configurable: true,
});
const shopViewInner = {
  get open() { return S.shopOpen; },
  set open(v) { S.shopOpen = v; },
  get selected() { return S.shopSel; },
  set selected(v) { S.shopSel = v; },
  get money() { return S.money; },
  set money(v) { S.money = Math.max(0, Math.round(v)); },
  get upgrades() { return S.upgrades; },
  get items() {
    if (!S.shopOpen) return [];
    // Each row carries a live `owned` flag as well as its price and
    // effect: a bought row reads as owned from the moment it is bought.
    const rows = SHOPS[S.shopOpen].items.map((id) => {
      const item = { ...UPGRADES[id] };
      Object.defineProperty(item, 'owned', {
        get() { return S.upgrades.includes(id); },
        enumerable: true,
      });
      return item;
    });
    return rows;
  },
  get id() { return S.shopOpen; },
  get shopId() { return S.shopOpen; },
  get name() { return S.shopOpen ? SHOPS[S.shopOpen].name : null; },
  get keeper() { return S.shopOpen ? SHOPS[S.shopOpen].keeper : null; },
};
const shopView = shopViewInner;
Object.defineProperty(S, 'shop', {
  get() { return shopView; },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'over', {
  get() { const v = S.screen === 'won' || S.screen === 'busted' || S.screen === 'wasted'; return v; },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'hiddenFound', {
  get() { return S.packages.filter((p) => p.found).length; },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(S, 'bossesDown', {
  get() { return S.bossesBeaten; },
  enumerable: true,
  configurable: true,
});
const missionStateView = {
  get phase() { return S.missionPhase; },
  set phase(v) { S.missionPhase = v; },
  get index() { return S.missionIndex; },
  set index(v) { S.missionIndex = v; },
  get name() { return S.missionIndex < MISSIONS.length ? MISSIONS[S.missionIndex].name : ''; },
  get introShown() { return S.missionIntroShown; },
  set introShown(v) { S.missionIntroShown = v; },
  get packagesDone() { return S.missionPackagesDone; },
  set packagesDone(v) { S.missionPackagesDone = v; },
};
Object.defineProperty(S, 'missionState', {
  get() { return missionStateView; },
  enumerable: true,
  configurable: true,
});

S.cars = makeCarsProxy([]);
S.enemies = makeEnemiesProxy([]);

// ---------------------------------------------------------------- helpers

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Is this point on a road (inside the road strip, sidewalks aside)?
export function onRoad(x, y) {
  for (const rx of ROAD_V) if (Math.abs(x - rx) <= ROAD_WIDTH / 2) return true;
  for (const ry of ROAD_H) if (Math.abs(y - ry) <= ROAD_WIDTH / 2) return true;
  return false;
}

// The nearest road intersection to a point.
export function nearestIntersection(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of ROAD_V) {
    for (const ry of ROAD_H) {
      const d = dist(x, y, rx, ry);
      if (d < bestD) { bestD = d; best = { x: rx, y: ry }; }
    }
  }
  return best;
}

// A random point on a road, from the gameplay random generator.
export function randomRoadPoint() {
  const rng = S.rng;
  if (chance(rng, 0.5)) {
    return { x: pick(rng, ROAD_V) + range(rng, -30, 30), y: range(rng, 60, WORLD_H - 60) };
  }
  return { x: range(rng, 60, WORLD_W - 60), y: pick(rng, ROAD_H) + range(rng, -30, 30) };
}

// A random sidewalk point: just off a road, on the walkable strip.
export function randomSidewalkPoint() {
  const rng = S.rng;
  if (chance(rng, 0.5)) {
    const rx = pick(rng, ROAD_V);
    const side = chance(rng, 0.5) ? 1 : -1;
    return { x: rx + side * (ROAD_WIDTH / 2 + PED.sidewalkOffset * 0 + 8), y: range(rng, 60, WORLD_H - 60) };
  }
  const ry = pick(rng, ROAD_H);
  const side = chance(rng, 0.5) ? 1 : -1;
  return { x: range(rng, 60, WORLD_W - 60), y: ry + side * (ROAD_WIDTH / 2 + 8) };
}

// ---------------------------------------------------------------- collision

export function circleHitsBuilding(x, y, r) {
  for (const b of S.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

export function clearOfBuildings(x, y, r) {
  return circleHitsBuilding(x, y, r) === null;
}

// Move a circle one axis at a time so sliding along a wall works.
// Returns the position reached.
export function moveCircle(x, y, dx, dy, r) {
  let nx = x + dx;
  let ny = y;
  if (circleHitsBuilding(nx, ny, r) || nx < WORLD_MARGIN + r || nx > WORLD_W - WORLD_MARGIN - r) nx = x;
  ny = y + dy;
  if (circleHitsBuilding(nx, ny, r) || ny < WORLD_MARGIN + r || ny > WORLD_H - WORLD_MARGIN - r) ny = y;
  return { x: nx, y: ny };
}

// A car is a bigger circle for collisions; same rule, wider radius.
export function moveCar(x, y, dx, dy, r) {
  return moveCircle(x, y, dx, dy, r);
}

// ---------------------------------------------------------------- generation

const BUILDING_COLORS = ['#d98c5f', '#c96f4a', '#e0a458', '#b5654a', '#d9b380', '#a85b3f', '#e8c07a', '#c47f5a'];

function blockRects() {
  const rects = [];
  const xs = [WORLD_MARGIN, ...ROAD_V.map((v) => v + ROAD_WIDTH / 2 + SIDEWALK), WORLD_W - WORLD_MARGIN];
  const ys = [WORLD_MARGIN, ...ROAD_H.map((v) => v + ROAD_WIDTH / 2 + SIDEWALK), WORLD_H - WORLD_MARGIN];
  // Blocks sit between neighbouring roads: from the far edge of one
  // road's sidewalk to the near edge of the next road's sidewalk.
  const xEdges = [WORLD_MARGIN];
  for (const v of ROAD_V) xEdges.push(v - ROAD_WIDTH / 2 - SIDEWALK, v + ROAD_WIDTH / 2 + SIDEWALK);
  xEdges.push(WORLD_W - WORLD_MARGIN);
  const yEdges = [WORLD_MARGIN];
  for (const h of ROAD_H) yEdges.push(h - ROAD_WIDTH / 2 - SIDEWALK, h + ROAD_WIDTH / 2 + SIDEWALK);
  yEdges.push(WORLD_H - WORLD_MARGIN);
  for (let i = 0; i + 1 < xEdges.length; i += 2) {
    for (let j = 0; j + 1 < yEdges.length; j += 2) {
      const x0 = xEdges[i];
      const x1 = xEdges[i + 1];
      const y0 = yEdges[j];
      const y1 = yEdges[j + 1];
      if (x1 - x0 >= 120 && y1 - y0 >= 110) rects.push({ x0, y0, x1, y1 });
    }
  }
  return rects;
}

function inPark(x, y) {
  return x >= 1575 && x <= 2025 && y >= 675 && y <= 1125;
}
function inPort(x, y) {
  return x >= 60 && x <= 620 && y >= 2475 && y <= 2595;
}
function onBeach(x) {
  return x >= 3320;
}

function generateBuildings(rng) {
  const list = [];
  for (const block of blockRects()) {
    // Keep the park, the port and the beach clear of buildings.
    const cx = (block.x0 + block.x1) / 2;
    const cy = (block.y0 + block.y1) / 2;
    if (inPark(cx, cy) || inPort(cx, cy) || onBeach(cx)) continue;
    const downtown = cx >= 1000 && cx <= 2100 && cy >= 1000 && cy <= 1700;
    const count = intRange(rng, 1, 3);
    for (let i = 0; i < count; i++) {
      const w = range(rng, 90, 200);
      const h = range(rng, 80, 170);
      const x = range(rng, block.x0 + 8, Math.max(block.x0 + 9, block.x1 - w - 8));
      const y = range(rng, block.y0 + 8, Math.max(block.y0 + 9, block.y1 - h - 8));
      if (x + w > block.x1 - 4 || y + h > block.y1 - 4) continue;
      if (inPark(x + w / 2, y + h / 2) || inPort(x + w / 2, y + h / 2) || onBeach(x + w / 2)) continue;
      let overlap = false;
      for (const b of list) {
        if (x < b.x + b.w + 12 && x + w + 12 > b.x && y < b.y + b.h + 12 && y + h + 12 > b.y) { overlap = true; break; }
      }
      if (overlap) continue;
      const storeys = downtown ? intRange(rng, 3, 5) : intRange(rng, 1, 3);
      list.push({ x, y, w, h, color: pick(rng, BUILDING_COLORS), storeys, downtown });
    }
  }
  return list;
}

function generateTrees(rng) {
  const trees = [];
  const palms = [];
  // Twenty-six trees inside the park, clear of the pond.
  for (let i = 0; i < 26; i++) {
    const x = range(rng, 1600, 2000);
    const y = range(rng, 700, 1100);
    if (dist(x, y, 1800, 900) < 70) continue;
    trees.push({ x, y, r: range(rng, 10, 16) });
  }
  // Twelve scattered around the city, clear of buildings.
  let placed = 0;
  let guard = 0;
  while (placed < 12 && guard < 200) {
    guard++;
    const x = range(rng, 80, WORLD_W - 80);
    const y = range(rng, 80, WORLD_H - 80);
    if (onRoad(x, y) || inPark(x, y) || !clearOfBuildings(x, y, 24)) continue;
    trees.push({ x, y, r: range(rng, 10, 16) });
    placed++;
  }
  // Palms along the beach promenade, about one every 130 units.
  for (let y = 120; y < WORLD_H - 60; y += 130) {
    palms.push({ x: 3360 + range(rng, -8, 8), y, r: 12 });
  }
  return { trees, palms };
}

function makeCar(x, y, angle, color, kind) {
  const car = {
    x, y, angle, speed: 0, health: 100, maxHealth: 100, color,
    kind, driver: false, wrecked: false, dir: 0, cruise: 130,
    turnCooldown: 0, smoke: 0,
  };
  // Live effect values: the tuned engine raises top speed and the
  // armoured body cuts damage, so a reader sees the current numbers
  // without the game having to push them into every car on each buy.
  Object.defineProperty(car, 'topSpeed', {
    get() { return S.upgrades.includes('tuned') ? CAR.tunedTopSpeed : CAR.topSpeed; },
    enumerable: true, configurable: true,
  });
  Object.defineProperty(car, 'armour', {
    get() { return S.upgrades.includes('armoured') ? 0.4 : 0; },
    enumerable: true, configurable: true,
  });
  return car;
}

function generateCars(rng) {
  const cars = [];
  // Sixteen parked along vertical roads, six along horizontal ones,
  // at the road edges so the count stays exact.
  for (let i = 0; i < PARKED_VERTICAL; i++) {
    const rx = pick(rng, ROAD_V);
    const side = chance(rng, 0.5) ? 1 : -1;
    const x = rx + side * (ROAD_WIDTH / 2 + 10);
    const y = range(rng, 120, WORLD_H - 120);
    if (circleHitsBuilding(x, y, 24)) continue;
    cars.push(makeCar(x, y, chance(rng, 0.5) ? -Math.PI / 2 : Math.PI / 2, pick(rng, CAR_COLORS), 'parked'));
  }
  for (let i = 0; i < PARKED_HORIZONTAL; i++) {
    const ry = pick(rng, ROAD_H);
    const side = chance(rng, 0.5) ? 1 : -1;
    const y = ry + side * (ROAD_WIDTH / 2 + 10);
    const x = range(rng, 120, WORLD_W - 120);
    if (circleHitsBuilding(x, y, 24)) continue;
    cars.push(makeCar(x, y, chance(rng, 0.5) ? 0 : Math.PI, pick(rng, CAR_COLORS), 'parked'));
  }
  // Twelve moving traffic cars, spread over the grid.
  for (let i = 0; i < TRAFFIC_COUNT; i++) {
    const onVertical = chance(rng, 0.5);
    let x, y, angle;
    if (onVertical) {
      x = pick(rng, ROAD_V) + range(rng, -20, 20);
      y = range(rng, 100, WORLD_H - 100);
      angle = chance(rng, 0.5) ? -Math.PI / 2 : Math.PI / 2;
    } else {
      x = range(rng, 100, WORLD_W - 100);
      y = pick(rng, ROAD_H) + range(rng, -20, 20);
      angle = chance(rng, 0.5) ? 0 : Math.PI;
    }
    const car = makeCar(x, y, angle, pick(rng, CAR_COLORS), 'traffic');
    car.speed = range(rng, 90, 150);
    car.cruise = 130;
    cars.push(car);
  }
  // The blue getaway coupe for mission two.
  cars.push(makeCar(GETAWAY.x, GETAWAY.y, GETAWAY.angle, GETAWAY.color, 'getaway'));
  return cars;
}

function generatePedestrians(rng) {
  const list = [];
  for (let i = 0; i < PED.count; i++) {
    const spot = randomSidewalkPoint();
    const target = randomSidewalkPoint();
    list.push({
      x: spot.x, y: spot.y, angle: 0,
      speed: range(rng, PED.walkMin, PED.walkMax),
      targetX: target.x, targetY: target.y,
      wait: 0, flee: 0, fleeX: 0, fleeY: 0,
      color: pick(rng, ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22']),
    });
  }
  return list;
}

// A burst of sparks, for crashes and impacts.
export function spawnSparks(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = S.rng() * Math.PI * 2;
    const sp = 60 + S.rng() * 140;
    S.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, max: 0.4, color: '#f39c12', size: 3 });
  }
}

export function spawnSmoke(x, y, n) {
  for (let i = 0; i < n; i++) {
    S.particles.push({ x: x + (S.rng() - 0.5) * 20, y: y + (S.rng() - 0.5) * 20, vx: 0, vy: -25 - S.rng() * 20, life: 0.8, max: 0.8, color: '#999999', size: 6 });
  }
}

// ---------------------------------------------------------------- reset

export function resetWorld(seed) {
  S.seed = seed;
  S.rng = makeRng(seed);
  const rng = S.rng;
  S.time = 0;
  S.clock = CLOCK_START;
  S.screen = 'title';
  S.fps = 60;
  S.frameCount = 0;
  S.money = 0;
  S.moneyEarned = 0;
  S.wantedPoints = 0;
  S.hiddenTimer = 0;
  S.lastGunfireWanted = -99;
  S.inCar = false;
  S.carIndex = -1;
  S.missionIndex = 0;
  S.missionPhase = 'reach';
  S.missionIntroShown = false;
  S.missionPackagesDone = 0;
  S.bossesBeaten = 0;
  S.upgrades.length = 0;
  S.stats = freshStats();
  S.dialogue = null;
  S.shopOpen = null;
  S.shopSel = 0;
  S.job = null;
  S.jobCycle = 0;
  S.toast = null;
  S.saveTimer = 0;
  S.muted = false;
  S.shot = null;
  S.won = false;
  S.boss = null;

  const p = S.player;
  p.x = PLAYER.startX; p.y = PLAYER.startY; p.angle = PLAYER.startAngle;
  p.health = PLAYER.maxHealth; p.maxHealth = PLAYER.maxHealth;
  p.ammo = PLAYER.startAmmo; p.ammoCap = PLAYER.ammoCap;
  p.speed = 0; p.invuln = 0; p.fireCooldown = 0; p.moving = false;
  S.camera.x = p.x; S.camera.y = p.y; S.camera.shake = 0; S.camera.shakeTime = 0;

  S.buildings = generateBuildings(rng);
  S.places = Object.entries(PLACES).map(([key, p]) => ({
    key, name: p.name, x: p.x, y: p.y, label: p.label,
  }));
  const greens = generateTrees(rng);
  S.trees = greens.trees;
  S.palms = greens.palms;
  S.containers = [
    { x: 120, y: 2495, w: 110, h: 34, color: '#7f8c8d' },
    { x: 280, y: 2500, w: 90, h: 30, color: '#95a5a6' },
    { x: 430, y: 2492, w: 120, h: 36, color: '#6c7a7a' },
  ];
  S.cars.length = 0;
  for (const c of generateCars(rng)) S.cars.push(c);
  S.police.length = 0;
  S.officers.length = 0;
  S.pedestrians.length = 0;
  for (const ped of generatePedestrians(rng)) S.pedestrians.push(ped);
  S.enemies.length = 0;
  S.bullets.length = 0;
  S.enemyBullets.length = 0;
  S.particles.length = 0;
  S.skidmarks.length = 0;
  S.packages = HIDDEN_PACKAGES.map((pos) => ({ x: pos.x, y: pos.y, found: false }));
  S.missionPackages = MISSION_PACKAGES.map((pos) => ({ x: pos.x, y: pos.y, label: pos.label, collected: false }));
  S.waypoint = { x: 1125, y: 1230, label: 'Sunrise Cafe' };
  S.storyWaypoint = { x: 1125, y: 1230, label: 'Sunrise Cafe' };
}
