// Cars: player driving physics (accel, steering, drift, collisions) and
// traffic AI (follow roads, turn at intersections, slow for cars ahead).
// Traffic cars drive the same road grid as the player, so a chase always
// has somewhere to go.
import { CAR, V_ROADS, H_ROADS, ROAD_W } from './config.js';
import { hitBuilding, inWorld, dist, addParticles, addToast } from './world.js';
import { isDown, wasPressed } from './input.js';
import { sfx, updateEngine } from './audio.js';
import { exitCar } from './player.js';

function carCollides(state, car, nx, ny) {
  if (!inWorld(nx, ny)) return true;
  if (hitBuilding(state, nx, ny, CAR.radius)) return true;
  return false;
}

function collideCars(state, car) {
  for (const other of state.cars) {
    if (other === car) continue;
    const d = dist(car.x, car.y, other.x, other.y);
    if (d < 44 && d > 0.01) {
      const push = (44 - d) / 2;
      const nx = (car.x - other.x) / d; const ny = (car.y - other.y) / d;
      if (!other.traffic || other === state.cars[state.player.inCar]) {
        car.x += nx * push; car.y += ny * push;
      }
      if (other.traffic) { other.x -= nx * push; other.y -= ny * push; other.speed *= 0.6; }
      return other;
    }
  }
  return null;
}

export function updateVehicles(state, dt, input, audio) {
  const p = state.player;
  // --- player driving ---
  if (p.inCar !== null) {
    const car = state.cars[p.inCar];
    const fwd = isDown(input, 'KeyW', 'ArrowUp');
    const back = isDown(input, 'KeyS', 'ArrowDown');
    const left = isDown(input, 'KeyA', 'ArrowLeft');
    const right = isDown(input, 'KeyD', 'ArrowRight');
    if (fwd) car.speed += CAR.accel * dt;
    else if (back) car.speed -= (car.speed > 0 ? CAR.brake : CAR.accel * 0.6) * dt;
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 180 * dt);
    car.speed = Math.max(-CAR.reverseMax, Math.min(CAR.maxSpeed, car.speed));
    const steer = (left ? -1 : 0) + (right ? 1 : 0);
    if (steer !== 0 && Math.abs(car.speed) > 20) {
      car.angle += steer * 2.1 * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 150);
      // Skid marks + dust when drifting at speed.
      if (Math.abs(car.speed) > 260 && Math.random() < 0.6) {
        state.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 6 });
        addParticles(state, car.x - Math.cos(car.angle) * 18, car.y - Math.sin(car.angle) * 18, '#cbb98f', 1, 40);
      }
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (carCollides(state, car, nx, ny)) {
      if (Math.abs(car.speed) > 120) {
        car.hp -= Math.abs(car.speed) * 0.08;
        state.shake = Math.min(10, Math.abs(car.speed) * 0.02);
        addParticles(state, nx, ny, '#ffb347', 10, 200);
        addParticles(state, nx, ny, '#888888', 6, 90);
        sfx.crash(audio);
        if (car.hp <= 0) {
          car.hp = 0;
          addToast(state, 'Your car is wrecked! Get out and find another.');
          exitCar(state, audio);
          return;
        }
      }
      car.speed *= -0.25;
    } else {
      car.x = nx; car.y = ny;
    }
    // Hit pedestrians while driving.
    for (const ped of state.peds) {
      if (dist(car.x, car.y, ped.x, ped.y) < 30 && Math.abs(car.speed) > 60) {
        ped.flee = 3; ped.fx = car.x; ped.fy = car.y;
        state.stats.pedsHit += 1;
        state.wanted = Math.max(state.wanted, 1);
        addParticles(state, ped.x, ped.y, '#e74c3c', 8, 150);
      }
    }
    const hit = collideCars(state, car);
    if (hit && Math.abs(car.speed) > 150) {
      car.speed *= 0.5;
      state.shake = Math.min(8, 4);
      addParticles(state, car.x, car.y, '#ffb347', 8, 180);
      sfx.crash(audio);
    }
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    if (car.hp < 40) car.smoke = 1;
    updateEngine(audio, car.speed, true);
    if (wasPressed(input, 'KeyE')) exitCar(state, audio);
  } else {
    updateEngine(audio, 0, false);
  }

  // --- traffic AI ---
  for (const car of state.cars) {
    if (!car.traffic) continue;
    const ahead = carAhead(state, car);
    const targetSpeed = ahead ? Math.max(0, ahead.speed - 20) : 130;
    car.speed += Math.sign(targetSpeed - car.speed) * Math.min(Math.abs(targetSpeed - car.speed), 200 * dt);
    // Turn at intersections sometimes.
    if (atIntersection(car) && Math.random() < dt * 0.5) turnTraffic(car);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (inWorld(nx, ny) && !hitBuilding(state, nx, ny, CAR.radius - 4)) {
      car.x = nx; car.y = ny;
    } else {
      // Hit the edge: turn around.
      car.angle += Math.PI;
      car.x += Math.cos(car.angle) * 30;
      car.y += Math.sin(car.angle) * 30;
    }
    collideCars(state, car);
  }
}

function atIntersection(car) {
  const near = (v, list) => list.some((r) => Math.abs(v - r) < 26);
  if (car.axis === 'v') return near(car.y, H_ROADS);
  return near(car.x, V_ROADS);
}

function turnTraffic(car) {
  // 90-degree turn onto the crossing road, staying in the right lane.
  const dir = Math.random() < 0.5 ? 1 : -1;
  car.angle += (Math.PI / 2) * dir;
  car.axis = car.axis === 'v' ? 'h' : 'v';
  const road = car.axis === 'v'
    ? V_ROADS.reduce((a, b) => (Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a))
    : H_ROADS.reduce((a, b) => (Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a));
  car.road = road;
  if (car.axis === 'v') car.x = road + (Math.cos(car.angle) > 0 ? 22 : -22);
  else car.y = road + (Math.sin(car.angle) > 0 ? 22 : -22);
}

function carAhead(state, car) {
  let best = null; let bestD = 120;
  for (const other of state.cars) {
    if (other === car) continue;
    const dx = other.x - car.x; const dy = other.y - car.y;
    const along = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (along > 0 && along < bestD && side < 40) { bestD = along; best = other; }
  }
  return best;
}

export function spawnTrafficCar(state) {
  // Keep the city alive: add a traffic car at a random road edge.
  const rng = state.rng;
  const vertical = rng() < 0.5;
  const road = vertical ? V_ROADS[Math.floor(rng() * V_ROADS.length)] : H_ROADS[Math.floor(rng() * H_ROADS.length)];
  const along = 300 + rng() * 2000;
  const dir = rng() < 0.5 ? 1 : -1;
  const car = {
    id: state.cars.length, x: vertical ? road + dir * 22 : along, y: vertical ? along : road + dir * 22,
    angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
    speed: 120, color: ['#d94f3d', '#3d7bd9', '#e8c33d', '#4fae5f', '#c0c8d0'][Math.floor(rng() * 5)],
    hp: 100, parked: false, traffic: true, axis: vertical ? 'v' : 'h', dir, lane: 22, driver: false, road,
  };
  state.cars.push(car);
  return car;
}
