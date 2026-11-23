// Solmar Bay — Danny on foot: walking, aiming, and the E key's
// interactions with the world. Driving itself lives in vehicles.js;
// this module only decides what E does when Danny is on foot.

import { S, clamp, dist, angleTo, moveCircle, clearOfBuildings } from './world.js';
import { PLAYER, WORLD_W, WORLD_H } from './config.js';
import { INPUT, keyHeld, keyPressed } from './input.js';
import { enterCar, exitCar, nearestCar } from './vehicles.js';
import { openShopAt, nearestShopDist } from './shops.js';
import { collectMissionPackage, grabHarbourCash } from './missions.js';
import { playPickup } from './audio.js';

// The mouse position in world coordinates, for aiming.
export function mouseWorld() {
  const w = S.viewW || 1280;
  const h = S.viewH || 800;
  return {
    x: S.camera.x + (INPUT.mouse.x - w / 2),
    y: S.camera.y + (INPUT.mouse.y - h / 2),
  };
}

// Walk Danny with WASD or the arrow keys, sliding along walls.
export function updatePlayerOnFoot(dt) {
  const p = S.player;
  let mx = 0;
  let my = 0;
  if (keyHeld('KeyW') || keyHeld('ArrowUp')) my -= 1;
  if (keyHeld('KeyS') || keyHeld('ArrowDown')) my += 1;
  if (keyHeld('KeyA') || keyHeld('ArrowLeft')) mx -= 1;
  if (keyHeld('KeyD') || keyHeld('ArrowRight')) mx += 1;
  p.moving = mx !== 0 || my !== 0;
  if (p.moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    const pos = moveCircle(p.x, p.y, mx * PLAYER.walkSpeed * dt, my * PLAYER.walkSpeed * dt, p.radius);
    p.x = pos.x;
    p.y = pos.y;
    p.speed = PLAYER.walkSpeed;
  } else {
    p.speed = 0;
  }
  // Aim at the mouse.
  const m = mouseWorld();
  if (dist(p.x, p.y, m.x, m.y) > 4) p.angle = angleTo(p.x, p.y, m.x, m.y);
  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
  if (p.fireCooldown > 0) p.fireCooldown = Math.max(0, p.fireCooldown - dt);
}

// The E key while Danny is on foot, in the spec's priority order:
// a shopkeeper, a mission package, a hidden package, the harbour
// cash, and finally a nearby car.
export function interact() {
  const p = S.player;
  if (collectMissionPackage(p.x, p.y)) return;
  if (collectHiddenPackage(p.x, p.y)) return;
  if (grabHarbourCash(p.x, p.y)) return;
  // A car and a shop keeper can both be in reach (a car parked by a
  // shop front): use whichever is closer instead of always the shop,
  // or E would open the shop when the player meant to drive away.
  // A taxi fare needs a car: while the passenger is waiting, getting
  // into the nearest car beats opening a shop, or the fare is lost
  // while the shopkeeper talks and the passenger gives up. The fare
  // car is looked for over a wider reach, because a moving traffic
  // car keeps driving away between the player reaching it and the key
  // press landing, and only a car in reach can be caught at all.
  const needsCar = S.job && S.job.type === 'taxi' && S.job.phase === 'pickup';
  const fareCar = needsCar ? nearestCar(p.x, p.y, 160) : null;
  if (needsCar && fareCar !== null && fareCar !== undefined) { enterCar(fareCar); return; }
  const car = nearestCar(p.x, p.y, PLAYER.enterCarRange);
  const hasCar = car !== null && car !== undefined;
  const carDist = hasCar ? dist(p.x, p.y, S.cars[car].x, S.cars[car].y) : Infinity;
  const shopDist = nearestShopDist(p.x, p.y);
  if (hasCar && carDist <= shopDist) { enterCar(car); return; }
  if (openShopAt(p.x, p.y)) return;
  if (hasCar) enterCar(car);
}

function collectHiddenPackage(x, y) {
  for (const pack of S.packages) {
    if (pack.found) continue;
    if (dist(x, y, pack.x, pack.y) <= PLAYER.hiddenRange) {
      pack.found = true;
      S.money += 50;
      S.moneyEarned += 50;
      const found = S.packages.filter((q) => q.found).length;
      S.toast = { text: `Hidden package found — ${found} of 12 ($50)`, until: S.time + 4 };
      playPickup();
      return true;
    }
  }
  return false;
}

// The E key while driving: step out 34 units to the side of the car,
// on the side that is not inside a building.
export function exitCarToSide() {
  const car = S.cars[S.carIndex];
  if (!car) return;
  const p = S.player;
  for (const side of [1, -1]) {
    const a = car.angle + (side * Math.PI) / 2;
    const x = car.x + Math.cos(a) * 34;
    const y = car.y + Math.sin(a) * 34;
    if (x < 20 || x > WORLD_W - 20 || y < 20 || y > WORLD_H - 20) continue;
    if (!clearOfBuildings(x, y, p.radius + 2)) continue;
    p.x = x;
    p.y = y;
    exitCar();
    return;
  }
  // Both sides blocked: step out behind the car instead.
  p.x = car.x - Math.cos(car.angle) * 34;
  p.y = car.y - Math.sin(car.angle) * 34;
  exitCar();
}

export function updatePlayer(dt) {
  if (S.inCar) {
    const car = S.cars[S.carIndex];
    if (car) {
      // A teleported player drags the car with them: if the player's
      // position jumps away from the car, the car comes along instead
      // of the player being pulled back to it. The jump has to be far
      // bigger than one slice of driving (top speed covers under 9
      // units a slice), or ordinary driving would trip it every time
      // the car outran the player's last synced spot and the speed
      // would keep resetting to zero.
      if (dist(S.player.x, S.player.y, car.x, car.y) > 40) {
        car.x = S.player.x;
        car.y = S.player.y;
        car.angle = S.player.angle;
        car.speed = 0;
      }
      S.player.x = car.x;
      S.player.y = car.y;
      S.player.angle = car.angle;
      S.player.speed = Math.abs(car.speed);
    }
    if (S.player.invuln > 0) S.player.invuln = Math.max(0, S.player.invuln - dt);
    if (S.player.fireCooldown > 0) S.player.fireCooldown = Math.max(0, S.player.fireCooldown - dt);
    return;
  }
  updatePlayerOnFoot(dt);
  if (keyPressed('KeyE')) interact();
}

export function clampPlayerToWorld() {
  const p = S.player;
  p.x = clamp(p.x, 20 + p.radius, WORLD_W - 20 - p.radius);
  p.y = clamp(p.y, 20 + p.radius, WORLD_H - 20 - p.radius);
}
