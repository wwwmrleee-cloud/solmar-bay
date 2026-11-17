// On-foot player: WASD movement, mouse aim, E to interact / enter cars,
// Space or click to shoot (handled in combat.js), building collision.
import { PLAYER } from './config.js';
import { hitBuilding, inWorld, dist, addToast, addWanted, PLACES } from './world.js';
import { isDown, wasPressed } from './input.js';
import { sfx } from './audio.js';

function tryMove(state, dx, dy) {
  const p = state.player;
  const nx = p.x + dx;
  const ny = p.y + dy;
  if (inWorld(nx, p.y) && !hitBuilding(state, nx, p.y, PLAYER.radius)) p.x = nx;
  if (inWorld(p.x, ny) && !hitBuilding(state, p.x, ny, PLAYER.radius)) p.y = ny;
}

function nearestCar(state, maxD) {
  let best = null; let bestD = maxD;
  for (const c of state.cars) {
    if (c.police) continue;
    const d = dist(state.player.x, state.player.y, c.x, c.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

export function updatePlayer(state, dt, input, audio) {
  const p = state.player;
  if (p.inCar !== null) return; // driving is handled in vehicles.js

  // Aim at the mouse.
  p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);

  let mx = 0; let my = 0;
  if (isDown(input, 'KeyW', 'ArrowUp')) my -= 1;
  if (isDown(input, 'KeyS', 'ArrowDown')) my += 1;
  if (isDown(input, 'KeyA', 'ArrowLeft')) mx -= 1;
  if (isDown(input, 'KeyD', 'ArrowRight')) mx += 1;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    const sp = PLAYER.speed * dt;
    tryMove(state, (mx / len) * sp, (my / len) * sp);
    p.speed = PLAYER.speed;
  } else p.speed = 0;

  // E: interact — mission waypoint / package / hidden package / car.
  if (wasPressed(input, 'KeyE')) {
    if (tryInteract(state, audio)) return;
    const car = nearestCar(state, 70);
    if (car) {
      enterCar(state, car, audio);
      // Consume the press: without this, vehicles.js would see the same
      // E this frame and exit the car again immediately.
      input.pressed.delete('KeyE');
    }
  }
}

export function tryInteract(state, audio) {
  const p = state.player;
  // Mission waypoint arrival is handled by missions.js; here we handle pickups.
  for (const pkg of state.missionPackages) {
    if (!pkg.taken && dist(p.x, p.y, pkg.x, pkg.y) < 70) {
      pkg.taken = true;
      state.packagesCollected += 1;
      state.player.money += 0; // pay comes at mission completion
      sfx.pickup(audio);
      addToast(state, `Package ${state.packagesCollected}/3 collected!`);
      return true;
    }
  }
  for (const hp of state.hiddenPackages) {
    if (!hp.found && dist(p.x, p.y, hp.x, hp.y) < 60) {
      hp.found = true;
      state.hiddenFound += 1;
      state.player.money += 50;
      sfx.pickup(audio);
      addToast(state, `Hidden package found! +$50 (${state.hiddenFound}/5)`);
      return true;
    }
  }
  // Harbour cash (mission 5).
  if (state.missionIndex === 4 && state.missionState.phase === 'grab'
    && dist(p.x, p.y, PLACES.harbour.x, PLACES.harbour.y) < 80) {
    state.missionState.phase = 'escape';
    state.waypoint = { x: PLACES.hideout.x, y: PLACES.hideout.y, label: PLACES.hideout.label };
    addWanted(state, 4);
    sfx.pickup(audio);
    addToast(state, 'Cash grabbed! Get to the Hideout — the whole force is coming!');
    return true;
  }
  return false;
}

export function enterCar(state, car, audio) {
  const p = state.player;
  p.inCar = car.id;
  car.parked = false;
  car.traffic = false;
  car.driver = true;
  if (car.getaway) {
    // stealing the getaway car is the job, not a crime
  } else if (!car.stolen) {
    car.stolen = true;
    state.stats.carsStolen += 1;
    addWanted(state, 1);
    addToast(state, 'Car stolen! The cops noticed.');
  }
  p.x = car.x; p.y = car.y;
  sfx.click(audio);
}

export function exitCar(state, audio) {
  const p = state.player;
  if (p.inCar === null) return;
  const car = state.cars[p.inCar];
  p.inCar = null;
  // Step out to the side of the car.
  const sx = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  const sy = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  if (!hitBuilding(state, sx, sy, PLAYER.radius)) { p.x = sx; p.y = sy; }
  else { p.x = car.x - Math.cos(car.angle + Math.PI / 2) * 34; p.y = car.y - Math.sin(car.angle + Math.PI / 2) * 34; }
  car.speed = 0;
  sfx.click(audio);
}
