// Solmar Bay — pedestrians. Thirty-six people wander the
// sidewalks, wait now and then, and run from gunfire and from cars.
// They never enter a building.

import { S, dist, angleTo, moveCircle, clearOfBuildings, randomSidewalkPoint } from './world.js';
import { PED } from './config.js';

// Scare every pedestrian near a gunshot: they run away from it.
export function scarePedestrians(x, y) {
  for (const ped of S.pedestrians) {
    if (dist(ped.x, ped.y, x, y) <= PED.scareRange) {
      const a = angleTo(x, y, ped.x, ped.y);
      ped.flee = PED.fleeMin + S.rng() * (PED.fleeMax - PED.fleeMin);
      ped.fleeX = Math.cos(a);
      ped.fleeY = Math.sin(a);
    }
  }
}

function pickNewTarget(ped) {
  const spot = randomSidewalkPoint();
  ped.targetX = spot.x;
  ped.targetY = spot.y;
  ped.wait = 0;
}

export function updatePedestrians(dt) {
  for (const ped of S.pedestrians) {
    if (ped.flee > 0) {
      ped.flee -= dt;
      const ox = ped.x;
      const oy = ped.y;
      const pos = moveCircle(ped.x, ped.y, ped.fleeX * PED.fleeSpeed * dt, ped.fleeY * PED.fleeSpeed * dt, 12);
      ped.x = pos.x;
      ped.y = pos.y;
      ped.angle = Math.atan2(ped.fleeY, ped.fleeX);
      // Stuck against a wall while fleeing: turn ninety degrees so
      // the run continues instead of pushing into the same wall.
      if (dist(ped.x, ped.y, ox, oy) < 0.5) {
        const nx = -ped.fleeY;
        const ny = ped.fleeX;
        ped.fleeX = nx;
        ped.fleeY = ny;
      }
      continue;
    }
    if (ped.wait > 0) {
      ped.wait -= dt;
      if (ped.wait <= 0) pickNewTarget(ped);
      continue;
    }
    const d = dist(ped.x, ped.y, ped.targetX, ped.targetY);
    if (d < 12) {
      // Arrived: sometimes wait a little before walking on.
      if (S.rng() < 0.3) ped.wait = 1 + S.rng() * 3;
      else pickNewTarget(ped);
      continue;
    }
    const a = angleTo(ped.x, ped.y, ped.targetX, ped.targetY);
    ped.angle = a;
    const pos = moveCircle(ped.x, ped.y, Math.cos(a) * ped.speed * dt, Math.sin(a) * ped.speed * dt, 12);
    ped.x = pos.x;
    ped.y = pos.y;
  }
}

// A car ran a pedestrian over: the pedestrian flees and it counts.
export function hitPedestrianByCar(ped) {
  ped.flee = 3;
  const a = angleTo(S.player.x, S.player.y, ped.x, ped.y);
  ped.fleeX = Math.cos(a);
  ped.fleeY = Math.sin(a);
  S.stats.pedsHit++;
}
