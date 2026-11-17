// Staged screenshot scenes for ?shot=start|drive|chase|mission.
// Each one plays the real rules forward from a fresh world with a simple
// autopilot, so the frame is what a short game really looks like and the
// same seed always gives the same frame.
import { STEP } from './config.js';
import { PLACES, resetWorld, addWanted } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

const SAMPLE = 1 / 60;

// Drive the player's car toward a target point, steering around buildings.
function driveAutopilot(state, tx, ty) {
  const car = state.player.inCar !== null ? state.cars[state.player.inCar] : null;
  if (!car) return;
  const dx = tx - car.x, dy = ty - car.y;
  const want = Math.atan2(dy, dx);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  // Steer: bias the angle directly (autopilot, not player input).
  car.angle += Math.max(-2.2 * SAMPLE, Math.min(2.2 * SAMPLE, diff));
  car.speed = Math.min(car.speed + 420 * SAMPLE, 300);
  const nx = car.x + Math.cos(car.angle) * car.speed * SAMPLE;
  const ny = car.y + Math.sin(car.angle) * car.speed * SAMPLE;
  if (nx > 40 && nx < 3560 && ny > 40 && ny < 2760) {
    const hit = state.buildings.some((b) => nx + 18 > b.x && nx - 18 < b.x + b.w && ny + 18 > b.y && ny - 18 < b.y + b.h);
    if (!hit) { car.x = nx; car.y = ny; }
    else { car.speed *= 0.4; car.angle += 0.6; }
  }
  state.player.x = car.x; state.player.y = car.y;
  state.camera.x = car.x; state.camera.y = car.y;
}

// Simulate the world forward for `seconds`, optionally driving the player car.
function simulate(state, seconds, driveTarget) {
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    state.time += SAMPLE;
    if (driveTarget) driveAutopilot(state, driveTarget.x, driveTarget.y);
    // Keep traffic and peds moving for a living frame.
    for (const c of state.cars) {
      if (!c.traffic) continue;
      c.x += Math.cos(c.angle) * c.speed * SAMPLE;
      c.y += Math.sin(c.angle) * c.speed * SAMPLE;
      if (c.x < 60 || c.x > 3540 || c.y < 60 || c.y > 2740) c.angle += Math.PI;
    }
    for (const p of state.peds) {
      const a = p.angle;
      p.x += Math.cos(a) * p.speed * SAMPLE;
      p.y += Math.sin(a) * p.speed * SAMPLE;
      if (p.x < 60 || p.x > 3540 || p.y < 60 || p.y > 2740) p.angle += Math.PI;
    }
    for (const pc of state.policeCars) {
      const pp = state.player;
      const a = Math.atan2(pp.y - pc.y, pp.x - pc.x);
      let diff = a - pc.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      pc.angle += Math.max(-2.4 * SAMPLE, Math.min(2.4 * SAMPLE, diff));
      pc.speed = 330;
      pc.x += Math.cos(pc.angle) * pc.speed * SAMPLE;
      pc.y += Math.sin(pc.angle) * pc.speed * SAMPLE;
    }
  }
}

function putPlayerInCar(state, x, y, angle) {
  const car = state.cars.find((c) => !c.traffic && !c.police) || state.cars[0];
  car.x = x; car.y = y; car.angle = angle; car.parked = false; car.traffic = false;
  car.speed = 0;
  state.player.inCar = car.id;
  state.player.x = x; state.player.y = y;
  state.camera.x = x; state.camera.y = y;
  return car;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 */
export function stageShot(name, world) {
  resetWorld(world);
  world.started = true;
  if (name === 'start') {
    // Title screen over a living downtown street.
    world.player.x = 1125; world.player.y = 1125;
    world.camera.x = 1125; world.camera.y = 1125;
    simulate(world, 2, null);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'drive') {
    world.missionIndex = 1;
    world.missionState = { phase: 'drive', collected: [], spawned: false };
    world.waypoint = { x: PLACES.hideout.x, y: PLACES.hideout.y, label: PLACES.hideout.label };
    putPlayerInCar(world, 1125, 1230, Math.PI / 2);
    simulate(world, 5, { x: 1125, y: 1900 });
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'chase') {
    world.missionIndex = 1;
    world.missionState = { phase: 'drive', collected: [], spawned: false };
    world.waypoint = { x: PLACES.hideout.x, y: PLACES.hideout.y, label: PLACES.hideout.label };
    putPlayerInCar(world, 1575, 1575, 0);
    addWanted(world, 3);
    // Police cars close behind.
    for (let i = 0; i < 3; i += 1) {
      world.policeCars.push({
        x: 1575 - 180 - i * 90, y: 1575 + (i % 2 === 0 ? 26 : -26),
        angle: 0, speed: 330, color: '#20242e', police: true, hp: 100, smoke: 0,
      });
    }
    simulate(world, 4, { x: 2475, y: 1575 });
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // mission: hideout shootout, mission 4, enemies + objective visible.
  world.missionIndex = 3;
  world.missionState = { phase: 'go', collected: [], spawned: true };
  world.waypoint = { x: PLACES.hideout.x, y: PLACES.hideout.y, label: PLACES.hideout.label };
  world.player.x = PLACES.hideout.x - 40;
  world.player.y = PLACES.hideout.y + 130;
  world.player.angle = -Math.PI / 2;
  world.camera.x = world.player.x;
  world.camera.y = world.player.y;
  // Enemies on the roads around the hideout — never inside a building.
  const spots = [
    [675, 1900], [675, 2260], [500, 2025],
    [850, 2025], [450, 2025], [900, 2025],
  ];
  for (const [x, y] of spots) {
    world.enemies.push({ x, y, hp: 100, shootCd: 1, color: '#7a1f1f' });
  }
  world.bullets.push({ x: world.player.x + 10, y: world.player.y - 40, angle: -Math.PI / 2, speed: 760, from: 'player', life: 0.6, dmg: 34 });
  simulate(world, 1.5, null);
  return { screen: SCREEN_PLAY, best: 0 };
}
