// Solmar Bay — the wanted level and the police. Wanted points run
// 0 to 125, twenty-five per star. The police come in numbers that
// match the level, and the heat only fades when Danny stays hidden.

import { S, clamp, dist, angleTo, angleDiff, moveCircle, clearOfBuildings, nearestIntersection, spawnSparks } from './world.js';
import { WORLD_W, WORLD_H, WANTED, POLICE_CAR, OFFICER } from './config.js';
import { playCrash } from './audio.js';

export function wantedLevel() {
  return Math.min(WANTED.maxStars, Math.floor(S.wantedPoints / WANTED.pointsPerStar));
}

export function addWantedPoints(points) {
  S.wantedPoints = clamp(S.wantedPoints + points, 0, WANTED.maxPoints);
}

export function addWantedStars(stars) {
  addWantedPoints(stars * WANTED.pointsPerStar);
}

export function clearWanted() {
  S.wantedPoints = 0;
  S.hiddenTimer = 0;
  S.police.length = 0;
  S.officers.length = 0;
}

function nearestPoliceDist() {
  let best = Infinity;
  const p = S.player;
  for (const car of S.police) best = Math.min(best, dist(p.x, p.y, car.x, car.y));
  for (const off of S.officers) best = Math.min(best, dist(p.x, p.y, off.x, off.y));
  return best;
}

// The heat decays only while no police is close enough to see Danny.
function updateDecay(dt) {
  const near = nearestPoliceDist();
  if (near > WANTED.hiddenRange && S.wantedPoints > 0) {
    S.hiddenTimer += dt;
    if (S.hiddenTimer >= WANTED.hiddenDelay) {
      const before = wantedLevel();
      S.wantedPoints = Math.max(0, S.wantedPoints - WANTED.decayPerSecond * dt);
      if (wantedLevel() < before) {
        S.toast = { text: 'You lost the heat', until: S.time + 4 };
      }
    }
  } else {
    S.hiddenTimer = 0;
  }
}

function randomSpawnPoint(minD, maxD) {
  const p = S.player;
  for (let tries = 0; tries < 12; tries++) {
    const a = S.rng() * Math.PI * 2;
    const d = minD + S.rng() * (maxD - minD);
    const x = clamp(p.x + Math.cos(a) * d, 60, WORLD_W - 60);
    const y = clamp(p.y + Math.sin(a) * d, 60, WORLD_H - 60);
    if (clearOfBuildings(x, y, 30)) return { x, y };
  }
  // No clear spot in twelve tries: fall back to the nearest road
  // intersection, which is always clear, instead of a point that
  // might sit inside a building.
  const cross = nearestIntersection(p.x, p.y);
  return cross ? { x: cross.x, y: cross.y } : { x: clamp(p.x + minD, 60, WORLD_W - 60), y: clamp(p.y, 60, WORLD_H - 60) };
}

function spawnPoliceCar() {
  const spot = randomSpawnPoint(POLICE_CAR.spawnMin, POLICE_CAR.spawnMax);
  S.police.push({
    x: spot.x, y: spot.y, angle: 0, speed: 0, health: 100, maxHealth: 100,
    color: '#1a1a2e', kind: 'police', driver: false, wrecked: false, siren: S.rng() * 2,
  });
}

function spawnOfficer() {
  const spot = randomSpawnPoint(OFFICER.spawnMin, OFFICER.spawnMax);
  S.officers.push({
    x: spot.x, y: spot.y, angle: 0, speed: 0, health: 100,
    kind: 'officer', cooldown: 1 + S.rng(),
  });
}

// Keep the police numbers matched to the wanted level.
function matchPoliceCounts() {
  const level = wantedLevel();
  const wantCars = Math.min(level, WANTED.maxPoliceCars);
  while (S.police.length < wantCars) spawnPoliceCar();
  while (S.police.length > wantCars) S.police.pop();
  const wantOfficers = level >= 3 ? Math.min(level - 1, WANTED.maxOfficers) : 0;
  while (S.officers.length < wantOfficers) spawnOfficer();
  while (S.officers.length > wantOfficers) S.officers.pop();
}

function updatePoliceCar(car, dt) {
  const p = S.player;
  const d = dist(car.x, car.y, p.x, p.y);
  const target = angleTo(car.x, car.y, p.x, p.y);
  const turn = clamp(angleDiff(car.angle, target), -POLICE_CAR.steerRate * dt, POLICE_CAR.steerRate * dt);
  car.angle += turn;
  let speed;
  if (S.inCar) {
    speed = d > 300 ? POLICE_CAR.chaseFar : POLICE_CAR.chaseNear;
    if (S.shot) speed = 330;
  } else {
    // On foot a police car closes in and stops short; it never deals
    // contact damage to a player on foot.
    if (d <= POLICE_CAR.stopRange) speed = 0;
    else speed = POLICE_CAR.chaseFoot;
    if (S.shot) speed = 330;
  }
  car.speed = speed;
  const nx = car.x + Math.cos(car.angle) * speed * dt;
  const ny = car.y + Math.sin(car.angle) * speed * dt;
  const moved = moveCircle(car.x, car.y, nx - car.x, ny - car.y, 20);
  car.x = moved.x;
  car.y = moved.y;
  car.siren += dt;
  // Ramming the player's car damages it.
  if (S.inCar && d < POLICE_CAR.ramRange) {
    const driven = S.cars[S.carIndex];
    if (driven && !driven.wrecked) {
      let dmg = POLICE_CAR.ramDamage * dt;
      if (Math.abs(driven.speed) > 60) dmg *= 0.5;
      if (S.upgrades.includes('armoured')) dmg *= 0.6;
      driven.health -= dmg;
      S.camera.shake = Math.max(S.camera.shake, 3);
      if (S.rng() < 0.1) spawnSparks(driven.x, driven.y, 3);
      if (S.rng() < 0.05) playCrash();
      if (driven.health <= 0) {
        driven.health = 0;
        driven.wrecked = true;
        driven.speed = 0;
        S.player.x = driven.x;
        S.player.y = driven.y;
        S.inCar = false;
        S.carIndex = -1;
        S.toast = { text: 'Car wrecked — find another', until: S.time + 4 };
      }
    }
  }
}

function updateOfficer(off, dt) {
  const p = S.player;
  const d = dist(off.x, off.y, p.x, p.y);
  let speed = 0;
  if (d > OFFICER.farRange) speed = OFFICER.approachFar;
  else if (d > OFFICER.nearRange) speed = OFFICER.approachNear;
  else speed = 0;
  if (speed > 0) {
    const a = angleTo(off.x, off.y, p.x, p.y);
    off.angle = a;
    const pos = moveCircle(off.x, off.y, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt, 12);
    off.x = pos.x;
    off.y = pos.y;
  }
  // Close enough on foot and Danny is busted.
  if (!S.inCar && d <= OFFICER.bustRange && S.screen === 'play') {
    S.screen = 'busted';
    return;
  }
  // Officers shoot only at a player on foot, within range.
  if (!S.inCar && d <= OFFICER.shootRange) {
    off.cooldown -= dt;
    if (off.cooldown <= 0) {
      off.cooldown = OFFICER.cooldownMin + S.rng() * OFFICER.cooldownExtra;
      const a = angleTo(off.x, off.y, p.x, p.y) + (S.rng() - 0.5) * 0.1;
      S.enemyBullets.push({
        x: off.x + Math.cos(a) * 20, y: off.y + Math.sin(a) * 20,
        vx: Math.cos(a) * OFFICER.bulletSpeed, vy: Math.sin(a) * OFFICER.bulletSpeed,
        life: 1.2, damage: OFFICER.bulletDamage, fromOfficer: true,
      });
    }
  }
}

export function updatePolice(dt) {
  updateDecay(dt);
  matchPoliceCounts();
  for (const car of S.police) updatePoliceCar(car, dt);
  for (const off of S.officers) {
    updateOfficer(off, dt);
    if (S.screen !== 'play') return;
  }
}
