// Solmar Bay — the staged screenshot scenes. Each scene is a real
// position the game can reach: the world is built fresh from seed 1,
// the scene is set up, and the rules are played forward with a
// simple autopilot for the scene's seconds. The frozen frame the
// screenshot takes is therefore a genuine frame of play.

import { S, dist, angleTo, angleDiff, circleHitsBuilding } from './world.js';
import { PLACES, M4_SPAWNS, BOSSES, RIVAL_HEALTH } from './config.js';
import { INPUT } from './input.js';
import { spawnEnemy, spawnBoss } from './combat.js';
import { resetWorld } from './world.js';

export const SHOT_SECONDS = {
  start: 2,
  drive: 5,
  chase: 4,
  mission: 1.5,
  boss: 1.5,
  shop: 1.5,
};

// The autopilot steers a car toward a point: at most 2.2 radians a
// second, accelerating up to 300 speed, slowing and turning when the
// next step would hit a building, staying inside the world.
export function updateAutopilot(dt) {
  void dt;
  const target = S.shotTarget;
  const car = S.inCar ? S.cars[S.carIndex] : null;
  if (!car || !target) return;
  const d = dist(car.x, car.y, target.x, target.y);
  const desired = angleTo(car.x, car.y, target.x, target.y);
  const diff = angleDiff(car.angle, desired);
  INPUT.keys['KeyW'] = car.speed < 300 && d > 120;
  INPUT.keys['KeyS'] = false;
  INPUT.keys['KeyA'] = false;
  INPUT.keys['KeyD'] = false;
  if (diff > 0.08) INPUT.keys['KeyD'] = true;
  else if (diff < -0.08) INPUT.keys['KeyA'] = true;
  // A building ahead: slow down and turn toward the clearer side.
  const aheadX = car.x + Math.cos(car.angle) * 90;
  const aheadY = car.y + Math.sin(car.angle) * 90;
  if (circleHitsBuilding(aheadX, aheadY, 24)) {
    INPUT.keys['KeyW'] = false;
    const leftX = car.x + Math.cos(car.angle - 0.7) * 90;
    const leftY = car.y + Math.sin(car.angle - 0.7) * 90;
    const rightX = car.x + Math.cos(car.angle + 0.7) * 90;
    const rightY = car.y + Math.sin(car.angle + 0.7) * 90;
    const leftClear = !circleHitsBuilding(leftX, leftY, 24);
    const rightClear = !circleHitsBuilding(rightX, rightY, 24);
    if (leftClear && !rightClear) INPUT.keys['KeyA'] = true;
    else if (rightClear && !leftClear) INPUT.keys['KeyD'] = true;
    else if (leftClear && rightClear) INPUT.keys['KeyA'] = true;
    // Both sides blocked: back up instead of turning into a wall.
    else INPUT.keys['KeyS'] = true;
  }
}

function putPlayerInCar(carIndex, x, y, angle) {
  const car = S.cars[carIndex];
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.speed = 0;
  S.inCar = true;
  S.carIndex = carIndex;
  car.driver = true;
  S.player.x = x;
  S.player.y = y;
  S.player.angle = angle;
}

function findCarIndex(kind) {
  for (let i = 0; i < S.cars.length; i++) {
    if (S.cars[i].kind === kind) return i;
  }
  return -1;
}

// Set a scene up from a fresh world. Returns its staging seconds.
export function setupShotScene(name) {
  resetWorld(1);
  S.shot = { name };
  S.shotTarget = null;
  const hideout = PLACES.hideout;
  const cash = PLACES.harbourCash;
  if (name === 'start') {
    S.player.x = 1125;
    S.player.y = 1125;
    S.player.angle = -Math.PI / 2;
    S.screen = 'title';
    S.camera.x = 1125;
    S.camera.y = 1125;
  } else if (name === 'drive') {
    S.missionIndex = 1;
    S.missionPhase = 'drive';
    S.missionIntroShown = true;
    const gi = findCarIndex('getaway');
    putPlayerInCar(gi, 1125, 1230, Math.PI / 2);
    S.waypoint = { x: hideout.x, y: hideout.y, label: 'Hideout' };
    S.storyWaypoint = { x: hideout.x, y: hideout.y, label: 'Hideout' };
    S.shotTarget = { x: 1125, y: 1900 };
    S.screen = 'play';
  } else if (name === 'chase') {
    S.missionIndex = 1;
    S.missionPhase = 'drive';
    S.missionIntroShown = true;
    const pi = findCarIndex('parked');
    putPlayerInCar(pi, 1575, 1575, 0);
    S.wantedPoints = 75;
    S.police.length = 0;
    for (let i = 0; i < 3; i++) {
      S.police.push({
        x: 1425 - i * 100, y: 1575, angle: 0, speed: 330, health: 100,
        maxHealth: 100, color: '#1a1a2e', kind: 'police', driver: false,
        wrecked: false, siren: i * 0.7,
      });
    }
    S.waypoint = { x: hideout.x, y: hideout.y, label: 'Hideout' };
    S.storyWaypoint = { x: hideout.x, y: hideout.y, label: 'Hideout' };
    S.shotTarget = { x: 2475, y: 1575 };
    S.screen = 'play';
  } else if (name === 'mission' || name === 'boss') {
    S.missionIndex = 5;
    S.missionPhase = 'fight';
    S.missionIntroShown = true;
    S.player.x = hideout.x - 40;
    S.player.y = hideout.y + 130;
    S.player.angle = -Math.PI / 2;
    S.camera.x = S.player.x;
    S.camera.y = S.player.y;
    spawnBoss(BOSSES.rico);
    if (name === 'mission') {
      for (const spot of M4_SPAWNS) {
        spawnEnemy(spot.x, spot.y, { health: RIVAL_HEALTH, name: 'Rival', kind: 'rival' });
      }
    } else {
      spawnEnemy(645, 2100, { health: RIVAL_HEALTH, name: 'Rival', kind: 'rival' });
      spawnEnemy(825, 2100, { health: RIVAL_HEALTH, name: 'Rival', kind: 'rival' });
    }
    // One player bullet already in flight, toward Rico.
    const a = angleTo(S.player.x, S.player.y, 735, 2040);
    S.bullets.push({
      x: S.player.x + Math.cos(a) * 22,
      y: S.player.y + Math.sin(a) * 22,
      vx: Math.cos(a) * 760,
      vy: Math.sin(a) * 760,
      life: 1.1,
      damage: 34,
    });
    S.waypoint = { x: hideout.x, y: hideout.y, label: 'Hideout' };
    S.storyWaypoint = { x: hideout.x, y: hideout.y, label: 'Hideout' };
    S.screen = 'play';
  } else if (name === 'shop') {
    S.player.x = PLACES.gunstore.x - 40;
    S.player.y = PLACES.gunstore.y + 60;
    S.player.angle = -Math.PI / 2;
    S.money = 1250;
    S.shopOpen = 'gunstore';
    S.shopSel = 0;
    S.camera.x = S.player.x;
    S.camera.y = S.player.y;
    S.screen = 'play';
  }
  return SHOT_SECONDS[name] || 1.5;
}
