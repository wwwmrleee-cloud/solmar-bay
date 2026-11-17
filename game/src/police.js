// Wanted level (0–5 stars) and police AI: patrol cars that chase and ram,
// officers on foot who shoot and can bust the player.
import { WORLD } from './config.js';
import { dist, hitBuilding, inWorld, addParticles, addToast, playerPos } from './world.js';
import { sfx, setSiren } from './audio.js';

export function addWanted(state, stars) {
  const pts = stars * 25;
  state.wantedPts = Math.min(125, state.wantedPts + pts);
  const w = Math.min(5, Math.floor(state.wantedPts / 25));
  if (w > state.wanted) {
    state.wanted = w;
    addToast(state, `Wanted level ${w} — the police are coming!`);
  }
}

export function updatePolice(state, dt, audio) {
  const p = playerPos(state);
  const want = state.wanted;
  setSiren(audio, want > 0);

  // Spawn police to match the wanted level.
  const wantCars = want >= 1 ? Math.min(want, 4) : 0;
  const wantOfficers = want >= 3 ? Math.min(want - 1, 4) : 0;
  while (state.policeCars.length < wantCars) spawnPoliceCar(state, p);
  while (state.officers.length < wantOfficers) spawnOfficer(state, p);
  // Despawn extras when the heat drops.
  if (state.policeCars.length > wantCars) state.policeCars.splice(wantCars);
  if (state.officers.length > wantOfficers) state.officers.splice(wantOfficers);

  // Police cars chase and ram.
  for (const car of state.policeCars) {
    const target = Math.atan2(p.y - car.y, p.x - car.x);
    let diff = target - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const d = dist(car.x, car.y, p.x, p.y);
    // Police cars ram the player's car, but stop short of a player on foot
    // (officers do the arresting) so a shootout on foot stays survivable.
    const playerOnFoot = state.player.inCar === null;
    const speed = playerOnFoot ? (d > 90 ? 340 : 0) : (d > 60 ? 380 : 140);
    car.speed += (speed - car.speed) * Math.min(1, dt * 2);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (inWorld(nx, ny) && !hitBuilding(state, nx, ny, 18)) { car.x = nx; car.y = ny; }
    else { car.angle += Math.PI * 0.5 * dt * 4; car.speed *= 0.7; }
    // Ram the player's car. A player on foot is left to the officers.
    if (d < 46 && state.player.inCar !== null) {
      const pc = state.cars[state.player.inCar];
      pc.hp -= 14 * dt;
      pc.speed *= 0.98;
      state.shake = Math.max(state.shake, 3);
      if (Math.random() < dt * 4) { addParticles(state, car.x, car.y, '#ffb347', 4, 150); sfx.crash(audio); }
      if (pc.hp <= 0) { pc.hp = 0; addToast(state, 'Your car is wrecked!'); }
    }
  }

  // Officers on foot: approach and shoot, or bust the player up close.
  for (const o of state.officers) {
    const d = dist(o.x, o.y, p.x, p.y);
    const a = Math.atan2(p.y - o.y, p.x - o.x);
    if (d < 42 && state.player.inCar === null) {
      // Busted!
      state.over = 'busted';
      state.screen = 'busted';
      sfx.busted(audio);
      return;
    }
    if (d > 220) {
      o.x += Math.cos(a) * 150 * dt;
      o.y += Math.sin(a) * 150 * dt;
    } else if (d > 90) {
      o.x += Math.cos(a) * 70 * dt;
      o.y += Math.sin(a) * 70 * dt;
    }
    o.shootCd -= dt;
    if (d < 420 && o.shootCd <= 0 && state.player.inCar === null) {
      o.shootCd = 1.4 + Math.random();
      const spread = (Math.random() - 0.5) * 0.35;
      state.bullets.push({
        x: o.x, y: o.y, angle: a + spread, speed: 620, from: 'enemy',
        life: 1.2, dmg: 6,
      });
      sfx.enemyShoot(audio);
    }
  }

  // Wasted check.
  if (state.player.hp <= 0 && !state.over) {
    state.player.hp = 0;
    state.over = 'wasted';
    state.screen = 'wasted';
    sfx.busted(audio);
  }
}

function spawnPoliceCar(state, p) {
  const a = Math.random() * Math.PI * 2;
  const d = 700 + Math.random() * 300;
  let x = Math.max(80, Math.min(WORLD.width - 80, p.x + Math.cos(a) * d));
  let y = Math.max(80, Math.min(WORLD.height - 80, p.y + Math.sin(a) * d));
  const car = {
    x, y, angle: Math.atan2(p.y - y, p.x - x), speed: 200,
    color: '#20242e', police: true, hp: 100, smoke: 0,
  };
  state.policeCars.push(car);
  return car;
}

function spawnOfficer(state, p) {
  const a = Math.random() * Math.PI * 2;
  const d = 380 + Math.random() * 200;
  const o = {
    x: Math.max(60, Math.min(WORLD.width - 60, p.x + Math.cos(a) * d)),
    y: Math.max(60, Math.min(WORLD.height - 60, p.y + Math.sin(a) * d)),
    shootCd: 1 + Math.random(), color: '#20242e',
  };
  state.officers.push(o);
  return o;
}
