// Solmar Bay — cars and driving: the player's car, traffic, the
// parked cars and the getaway coupe. A car is a heading plus a
// signed speed; steering only bites while the car is moving.

import { S, clamp, dist, angleDiff, moveCar, circleHitsBuilding, onRoad, nearestIntersection } from './world.js';
import { CAR, WORLD_W, WORLD_H } from './config.js';
import { keyHeld } from './input.js';
import { playCrash, updateEngine } from './audio.js';
import { addWantedStars } from './police.js';
import { spawnSparks, spawnSmoke } from './world.js';

// The nearest drivable car to a point, within range, or null.
export function nearestCar(x, y, range) {
  let best = null;
  let bestD = range;
  for (let i = 0; i < S.cars.length; i++) {
    const c = S.cars[i];
    if (!c || c.wrecked) continue;
    const d = dist(x, y, c.x, c.y);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// Steal or enter a car. The getaway coupe is the mission car: taking
// it adds no wanted level, because it is part of the job.
export function enterCar(index) {
  const car = S.cars[index];
  if (!car || car.wrecked) return false;
  S.inCar = true;
  S.carIndex = index;
  car.driver = true;
  S.player.x = car.x;
  S.player.y = car.y;
  if (car.kind === 'getaway') {
    S.toast = { text: 'The getaway car — drive it to the Hideout', until: S.time + 4 };
  } else {
    S.stats.carsStolen++;
    addWantedStars(1);
    S.toast = { text: 'Car stolen — the police noticed', until: S.time + 4 };
  }
  return true;
}

export function exitCar() {
  const car = S.cars[S.carIndex];
  if (car) car.driver = false;
  S.inCar = false;
  S.carIndex = -1;
}

// Wreck the car Danny is driving: force him out and say so.
export function wreckDrivenCar(reason) {
  const car = S.cars[S.carIndex];
  if (!car) return;
  car.wrecked = true;
  car.health = 0;
  car.speed = 0;
  S.player.x = car.x;
  S.player.y = car.y;
  exitCar();
  S.toast = { text: reason || 'Car wrecked — find another', until: S.time + 4 };
}

function topSpeed() {
  return S.upgrades.includes('tuned') ? CAR.tunedTopSpeed : CAR.topSpeed;
}

function damageCar(car, amount, byPlayer) {
  // Armoured Body protects the car Danny is driving, whatever hits
  // it: enemy fire and a hard crash alike. It never shields a car
  // Danny is shooting at — that would make the upgrade hurt him.
  if (S.upgrades.includes('armoured') && car === S.cars[S.carIndex]) amount *= 0.6;
  car.health -= amount;
  if (car.health <= 0) {
    car.health = 0;
    if (car === S.cars[S.carIndex]) wreckDrivenCar('Car wrecked — find another');
    else { car.wrecked = true; car.speed = 0; }
  }
}

// Drive the player's car from the keys.
function drivePlayerCar(car, dt) {
  const up = keyHeld('KeyW') || keyHeld('ArrowUp');
  const down = keyHeld('KeyS') || keyHeld('ArrowDown');
  const left = keyHeld('KeyA') || keyHeld('ArrowLeft');
  const right = keyHeld('KeyD') || keyHeld('ArrowRight');
  const top = topSpeed();

  if (up) {
    car.speed += CAR.accel * dt;
    if (car.speed > top) car.speed = top;
  } else if (down) {
    if (car.speed > 0) {
      car.speed -= CAR.brake * dt;
      if (car.speed < 0) car.speed = 0;
    } else {
      car.speed -= CAR.accel * dt;
      if (car.speed < -CAR.reverseMax) car.speed = -CAR.reverseMax;
    }
  } else {
    if (car.speed > 0) car.speed = Math.max(0, car.speed - CAR.coastDrag * dt);
    else if (car.speed < 0) car.speed = Math.min(0, car.speed + CAR.coastDrag * dt);
  }

  const speedAbs = Math.abs(car.speed);
  if (speedAbs > CAR.minSteerSpeed) {
    const steer = (left ? -1 : 0) + (right ? 1 : 0);
    if (steer !== 0) {
      const rate = CAR.steerRate * clamp(speedAbs / 200, 0.25, 1);
      car.angle += steer * rate * dt * Math.sign(car.speed);
    }
    // Hard steering at speed leaves skid marks on the road.
    if (steer !== 0 && speedAbs > 200) {
      S.skidmarks.push({
        x: car.x - Math.cos(car.angle) * 22,
        y: car.y - Math.sin(car.angle) * 22,
        angle: car.angle,
        alpha: 0.5,
      });
    }
  }

  const ox = car.x;
  const oy = car.y;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const moved = moveCar(car.x, car.y, nx - car.x, ny - car.y, CAR.radius);
  // A crash is a head-on stop, not a slide along a wall: compare how
  // far the car got along its heading against how far it tried to go.
  const intendedAlong = (nx - ox) * Math.cos(car.angle) + (ny - oy) * Math.sin(car.angle);
  const actualAlong = (moved.x - ox) * Math.cos(car.angle) + (moved.y - oy) * Math.sin(car.angle);
  const blocked = intendedAlong > 1 && actualAlong < intendedAlong * 0.3;
  const edgeHit = nx < 20 + CAR.radius || nx > WORLD_W - 20 - CAR.radius || ny < 20 + CAR.radius || ny > WORLD_H - 20 - CAR.radius;
  car.x = moved.x;
  car.y = moved.y;
  if ((blocked || edgeHit) && speedAbs > CAR.crashSpeed) {
    const impact = speedAbs;
    damageCar(car, impact * 0.08, true);
    S.camera.shake = 8;
    S.camera.shakeTime = 0.3;
    playCrash();
    spawnSparks(car.x, car.y, 8);
    car.speed = -car.speed * 0.25;
  }
  if (car.health < CAR.smokeBelow && S.rng() < 0.3) {
    S.particles.push({ x: car.x, y: car.y, vx: 0, vy: -20, life: 0.6, max: 0.6, color: '#888888', size: 5 });
  }
}

// Drive the player's car from the keys.

// One traffic car's brain: hold its cruise speed, slow for the car
// ahead, turn at intersections, turn around at a dead end.
function updateTrafficCar(car, dt) {
  const aheadX = car.x + Math.cos(car.angle) * 120;
  const aheadY = car.y + Math.sin(car.angle) * 120;
  let target = car.cruise || 130;
  for (const other of S.cars) {
    if (other === car || other.wrecked) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const across = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (along > 0 && along < 120 && across < 30) {
      target = Math.min(target, Math.max(0, other.speed - 20));
    }
  }
  if (car.speed < target) car.speed = Math.min(target, car.speed + CAR.accel * 0.6 * dt);
  else if (car.speed > target) car.speed = Math.max(target, car.speed - CAR.brake * 0.5 * dt);

  // At an intersection, sometimes turn ninety degrees.
  const nearCross = nearestIntersection(car.x, car.y);
  if (nearCross && dist(car.x, car.y, nearCross.x, nearCross.y) < 46 && S.rng() < 0.012) {
    car.angle += (S.rng() < 0.5 ? 1 : -1) * Math.PI / 2;
  }
  // A wall or the edge ahead means turn around.
  const probeX = car.x + Math.cos(car.angle) * 60;
  const probeY = car.y + Math.sin(car.angle) * 60;
  if (circleHitsBuilding(probeX, probeY, CAR.radius) || probeX < 40 || probeX > WORLD_W - 40 || probeY < 40 || probeY > WORLD_H - 40) {
    car.angle += Math.PI;
    car.x = clamp(car.x, 60, WORLD_W - 60);
    car.y = clamp(car.y, 60, WORLD_H - 60);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const moved = moveCar(car.x, car.y, nx - car.x, ny - car.y, CAR.radius);
  car.x = moved.x;
  car.y = moved.y;
  if (car.health < CAR.smokeBelow && S.rng() < 0.1) {
    S.particles.push({ x: car.x, y: car.y, vx: 0, vy: -20, life: 0.5, max: 0.5, color: '#888888', size: 4 });
  }
}

// Push overlapping cars apart so they never sit inside each other.
function separateCars() {
  const cars = S.cars;
  for (let i = 0; i < cars.length; i++) {
    const a = cars[i];
    if (!a || a.wrecked) continue;
    for (let j = i + 1; j < cars.length; j++) {
      const b = cars[j];
      if (!b || b.wrecked) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01 && d < CAR.pushRange) {
        const push = (CAR.pushRange - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
  }
}

export function updateVehicles(dt) {
  const driven = S.inCar ? S.cars[S.carIndex] : null;
  if (driven) {
    drivePlayerCar(driven, dt);
    // Bumping another car: a moving traffic car gets shoved out of the
    // way (and speeds up to clear the lane), so a fast driver can plough
    // through traffic instead of being stuck behind it at its cruise
    // speed; the player only loses a little speed. A parked or parked-up
    // car is a solid obstacle and still costs half the speed.
    for (const other of S.cars) {
      if (other === driven || other.wrecked) continue;
      const d = dist(driven.x, driven.y, other.x, other.y);
      if (d < CAR.pushRange && Math.abs(driven.speed) > CAR.carHitSpeed) {
        if (other.kind === 'traffic') {
          const dx = (other.x - driven.x) / (d || 1);
          const dy = (other.y - driven.y) / (d || 1);
          // Shove the traffic car clear of the player's nose and let it
          // pull away at the player's speed.
          other.x += dx * (CAR.pushRange - d + 6);
          other.y += dy * (CAR.pushRange - d + 6);
          other.speed = Math.max(other.speed, Math.abs(driven.speed) * 0.9);
          driven.speed *= 0.9;
        } else {
          driven.speed *= 0.5;
        }
        S.camera.shake = 5;
        S.camera.shakeTime = 0.25;
        playCrash();
        spawnSparks(driven.x, driven.y, 5);
        break;
      }
    }
    updateEngine(Math.abs(driven.speed), true);
  } else {
    updateEngine(0, false);
  }
  for (const car of S.cars) {
    if (!car || car.wrecked || car === driven) continue;
    if (car.kind === 'traffic') updateTrafficCar(car, dt);
  }
  separateCars();
  // Keep every car inside the world.
  for (const car of S.cars) {
    if (!car) continue;
    car.x = clamp(car.x, 20, WORLD_W - 20);
    car.y = clamp(car.y, 20, WORLD_H - 20);
  }
}

// Damage the driven car from outside (police ramming, enemy fire).
export function damageDrivenCar(amount) {
  const car = S.inCar ? S.cars[S.carIndex] : null;
  if (!car) return;
  damageCar(car, amount, true);
}

export function drivenCar() {
  return S.inCar ? S.cars[S.carIndex] : null;
}
