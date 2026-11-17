// City generation (roads, buildings, props), collision helpers, world state,
// and the per-frame step that wires every system together.
import { WORLD, ROAD_W, V_ROADS, H_ROADS, COLORS, PLAYER, MISSIONS, HIDDEN_PACKAGES } from './config.js';
import { makeRng, pick, range, rangeInt } from './random.js';
import { updatePlayer } from './player.js';
import { updateVehicles } from './vehicles.js';
import { updatePeds } from './pedestrians.js';
import { updatePolice, addWanted } from './police.js';
import { updateCombat } from './combat.js';
import { updateMissions } from './missions.js';

export const PLACES = {
  cafe: { x: 1125, y: 1230, label: 'Sunrise Cafe' },
  hideout: { x: 675, y: 2080, label: 'Hideout' },
  park: { x: 1800, y: 900, label: 'Palm Park' },
  port: { x: 450, y: 2520, label: 'Port' },
  beach: { x: 3450, y: 1400, label: 'Beach' },
  harbour: { x: 450, y: 2560, label: 'Harbour Cash' },
  downtown: { x: 1575, y: 1125, label: 'Downtown' },
};

const CAR_COLORS = ['#d94f3d', '#3d7bd9', '#e8c33d', '#4fae5f', '#8a5fc0', '#e07a3d', '#c0c8d0', '#2f2f38'];

export function createWorld(seed) {
  const rng = makeRng(seed || 1);
  const state = {
    seed: seed || 1,
    rng,
    time: 0,
    clockMin: 8 * 60 + 5,
    screen: 'title',
    paused: false,
    over: null, // 'busted' | 'wasted' | 'won'
    player: {
      x: PLAYER.startX, y: PLAYER.startY, angle: -Math.PI / 2,
      hp: PLAYER.hp, money: 0, ammo: 60, inCar: null, speed: 0,
      invuln: 0, shootCd: 0,
    },
    cars: [], peds: [], policeCars: [], officers: [], enemies: [],
    bullets: [], particles: [], skids: [],
    wanted: 0, wantedPts: 0, hiddenTimer: 0,
    missionIndex: 0, missionState: { phase: 'go', collected: [], spawned: false },
    waypoint: null,
    dialogue: null,
    toast: '', toastT: 0,
    message: '',
    camera: { x: PLAYER.startX, y: PLAYER.startY },
    shake: 0,
    stats: { shots: 0, hits: 0, carsStolen: 0, pedsHit: 0, missionsDone: 0, kills: 0 },
    hiddenFound: 0, packagesCollected: 0,
    hiddenPackages: [],
    missionPackages: [],
    saveTimer: 0,
    started: false,
    won: false,
    buildings: [], palms: [], trees: [],
    muted: false,
  };

  // --- buildings: fill each block between roads, skipping park / port / beach ---
  const parkBlock = { x0: 1575, x1: 2025, y0: 675, y1: 1125 };
  const portBlock = { x0: 0, x1: 675, y0: 2475, y1: 2800 };
  for (let vi = 0; vi < V_ROADS.length - 1; vi += 1) {
    for (let hi = 0; hi < H_ROADS.length - 1; hi += 1) {
      const x0 = V_ROADS[vi] + ROAD_W / 2 + 14;
      const x1 = V_ROADS[vi + 1] - ROAD_W / 2 - 14;
      const y0 = H_ROADS[hi] + ROAD_W / 2 + 14;
      const y1 = H_ROADS[hi + 1] - ROAD_W / 2 - 14;
      if (x0 >= x1 || y0 >= y1) continue;
      if (x0 >= parkBlock.x0 && x1 <= parkBlock.x1 && y0 >= parkBlock.y0 && y1 <= parkBlock.y1) continue;
      if (x0 < 700 && y0 > 2400) continue; // port area
      if (x1 > 3300) continue; // beach
      const n = rangeInt(rng, 1, 3);
      for (let b = 0; b < n; b += 1) {
        const bw = range(rng, 90, Math.min(200, x1 - x0));
        const bh = range(rng, 80, Math.min(170, y1 - y0));
        const bx = range(rng, x0, Math.max(x0 + 1, x1 - bw));
        const by = range(rng, y0, Math.max(y0 + 1, y1 - bh));
        state.buildings.push({ x: bx, y: by, w: bw, h: bh, color: pick(rng, COLORS.building), hgt: rangeInt(rng, 1, 3) });
      }
    }
  }
  // Downtown towers (taller, centre blocks).
  for (const b of state.buildings) {
    if (b.x > 1000 && b.x < 2100 && b.y > 1000 && b.y < 1700) b.hgt = rangeInt(rng, 3, 5);
  }
  // Palms along the beach promenade + park trees.
  for (let y = 300; y < WORLD.height - 200; y += 130) state.palms.push({ x: 3360 + range(rng, -8, 8), y });
  for (let i = 0; i < 26; i += 1) state.trees.push({ x: range(rng, 1620, 1980), y: range(rng, 720, 1080), r: range(rng, 14, 22) });
  for (let i = 0; i < 12; i += 1) state.trees.push({ x: range(rng, 300, 3200), y: range(rng, 300, 2400), r: range(rng, 12, 18) });

  // --- cars: parked along roads + moving traffic ---
  const addCar = (x, y, angle, opts) => {
    const car = {
      id: state.cars.length, x, y, angle, speed: 0,
      color: pick(rng, CAR_COLORS), hp: 100, parked: true,
      traffic: false, axis: null, dir: 1, lane: 0, driver: false,
      getaway: false, police: false, smoke: 0, ...opts,
    };
    state.cars.push(car);
    return car;
  };
  // Parked cars on road edges.
  for (let i = 0; i < 16; i += 1) {
    const vx = pick(rng, V_ROADS);
    const y = range(rng, 300, 2400);
    addCar(vx + (rng() < 0.5 ? -34 : 34), y, rng() < 0.5 ? -Math.PI / 2 : Math.PI / 2);
  }
  for (let i = 0; i < 6; i += 1) {
    const hy = pick(rng, H_ROADS);
    const x = range(rng, 300, 3200);
    addCar(x, hy + (rng() < 0.5 ? -34 : 34), rng() < 0.5 ? 0 : Math.PI);
  }
  // Traffic cars on roads.
  for (let i = 0; i < 12; i += 1) {
    const vertical = rng() < 0.5;
    const road = vertical ? pick(rng, V_ROADS) : pick(rng, H_ROADS);
    const along = range(rng, 300, 2300);
    const dir = rng() < 0.5 ? 1 : -1;
    const lane = 22;
    const car = addCar(
      vertical ? road + (dir > 0 ? lane : -lane) : along,
      vertical ? along : road + (dir > 0 ? lane : -lane),
      vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      { parked: false, traffic: true, axis: vertical ? 'v' : 'h', dir, lane, speed: range(rng, 90, 150) },
    );
    car.road = road;
  }
  // Getaway car for mission 2 (parked by the cafe, blue).
  state.getawayCar = addCar(1125 + 34, 1330, Math.PI / 2, { color: '#3d7bd9', getaway: true });

  // --- pedestrians on sidewalks ---
  for (let i = 0; i < 26; i += 1) {
    const vertical = rng() < 0.5;
    const road = vertical ? pick(rng, V_ROADS) : pick(rng, H_ROADS);
    const along = range(rng, 300, 2400);
    state.peds.push({
      x: vertical ? road + (rng() < 0.5 ? -62 : 62) : along,
      y: vertical ? along : road + (rng() < 0.5 ? -62 : 62),
      angle: rng() * Math.PI * 2, speed: range(rng, 35, 60),
      color: pick(rng, ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22']),
      flee: 0, fx: 0, fy: 0, tx: 0, ty: 0, wait: 0,
    });
  }

  // Hidden packages (side activity).
  const hiddenSpots = [
    { x: 700, y: 250 }, { x: 2900, y: 650 }, { x: 2500, y: 2000 },
    { x: 350, y: 1600 }, { x: 2050, y: 2500 },
  ];
  for (const s of hiddenSpots) state.hiddenPackages.push({ ...s, found: false });

  state.waypoint = { x: PLACES.cafe.x, y: PLACES.cafe.y, label: PLACES.cafe.label };
  return state;
}

export function resetWorld(state) {
  const fresh = createWorld(state.seed);
  for (const k of Object.keys(fresh)) state[k] = fresh[k];
}

// --- collision helpers (attached to state at creation) ---
export function hitBuilding(state, x, y, r) {
  for (const b of state.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}
export function inWorld(x, y) {
  return x > 20 && x < WORLD.width - 20 && y > 20 && y < WORLD.height - 20;
}
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

export function addToast(state, text) { state.toast = text; state.toastT = 4; }
export function addParticles(state, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = (speed || 120) * (0.4 + Math.random() * 0.8);
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, max: 0.9, color, r: 2 + Math.random() * 3 });
  }
  if (state.particles.length > 400) state.particles.splice(0, state.particles.length - 400);
}

// --- main per-frame step: wires every system ---
export function stepWorld(state, dt, input, audio) {
  state.time += dt;
  state.clockMin = (8 * 60 + 5 + state.time / 2) % (24 * 60); // 1 real sec = 30 game-min
  if (state.toastT > 0) state.toastT -= dt;
  if (state.player.invuln > 0) state.player.invuln -= dt;
  if (state.player.shootCd > 0) state.player.shootCd -= dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);

  // Dialogue open: freeze the world, only allow advancing it.
  if (state.dialogue) return;

  updatePlayer(state, dt, input, audio);
  updateVehicles(state, dt, input, audio);
  updatePeds(state, dt);
  updatePolice(state, dt, audio);
  updateCombat(state, dt, audio);
  updateMissions(state, dt, audio);

  // Wanted decay: hidden from police for a while.
  if (state.wanted > 0) {
    const nearestPolice = nearestPoliceDist(state);
    if (nearestPolice > 650) {
      state.hiddenTimer += dt;
      if (state.hiddenTimer > 6) {
        state.wantedPts = Math.max(0, state.wantedPts - 20 * dt);
        const w = Math.min(5, Math.floor(state.wantedPts / 25));
        if (w < state.wanted) { state.wanted = w; addToast(state, 'You lost the heat — wanted level down.'); }
        if (state.wantedPts <= 0) { state.wanted = 0; state.hiddenTimer = 0; }
      }
    } else state.hiddenTimer = 0;
  }

  // Particles.
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  // Skid marks fade slowly.
  if (state.skids.length > 300) state.skids.splice(0, state.skids.length - 300);

  // Camera follows player or their car.
  const focus = state.player.inCar !== null ? state.cars[state.player.inCar] : state.player;
  if (focus) {
    const tx = focus.x, ty = focus.y;
    state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 5);
    state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 5);
  }

  // Autosave every 10 s while playing.
  state.saveTimer += dt;
  if (state.saveTimer > 10) {
    state.saveTimer = 0;
    if (state.started && !state.over) {
      import('./save.js').then((m) => m.saveGame(state)).catch(() => {});
    }
  }
}

export function nearestPoliceDist(state) {
  let best = Infinity;
  const p = state.player;
  const px = p.inCar !== null && state.cars[p.inCar] ? state.cars[p.inCar].x : p.x;
  const py = p.inCar !== null && state.cars[p.inCar] ? state.cars[p.inCar].y : p.y;
  for (const c of state.policeCars) best = Math.min(best, dist(px, py, c.x, c.y));
  for (const o of state.officers) best = Math.min(best, dist(px, py, o.x, o.y));
  return best;
}

export function playerPos(state) {
  if (state.player.inCar !== null && state.cars[state.player.inCar]) {
    const c = state.cars[state.player.inCar];
    return { x: c.x, y: c.y };
  }
  return { x: state.player.x, y: state.player.y };
}

export { addWanted };
export { MISSIONS };
