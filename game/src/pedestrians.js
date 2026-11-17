// Pedestrians: walk sidewalks, cross streets, flee from gunshots and cars.
import { V_ROADS, H_ROADS } from './config.js';
import { hitBuilding, inWorld, dist } from './world.js';

export function updatePeds(state, dt) {
  for (const ped of state.peds) {
    if (ped.flee > 0) {
      ped.flee -= dt;
      const away = Math.atan2(ped.y - ped.fy, ped.x - ped.fx);
      const nx = ped.x + Math.cos(away) * 130 * dt;
      const ny = ped.y + Math.sin(away) * 130 * dt;
      if (inWorld(nx, ny) && !hitBuilding(state, nx, ny, 10)) { ped.x = nx; ped.y = ny; }
      ped.angle = away;
      continue;
    }
    if (ped.wait > 0) { ped.wait -= dt; continue; }
    // Pick a new target when close or none.
    if (!ped.tx || dist(ped.x, ped.y, ped.tx, ped.ty) < 20) {
      const vertical = Math.random() < 0.5;
      const road = vertical
        ? V_ROADS[Math.floor(Math.random() * V_ROADS.length)]
        : H_ROADS[Math.floor(Math.random() * H_ROADS.length)];
      const along = 300 + Math.random() * 2100;
      const off = Math.random() < 0.5 ? -62 : 62;
      ped.tx = vertical ? road + off : along;
      ped.ty = vertical ? along : road + off;
      ped.tx = Math.max(60, Math.min(3540, ped.tx));
      ped.ty = Math.max(60, Math.min(2740, ped.ty));
      if (Math.random() < 0.2) ped.wait = 1 + Math.random() * 3;
    }
    const a = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
    ped.angle = a;
    const nx = ped.x + Math.cos(a) * ped.speed * dt;
    const ny = ped.y + Math.sin(a) * ped.speed * dt;
    if (inWorld(nx, ny) && !hitBuilding(state, nx, ny, 10)) { ped.x = nx; ped.y = ny; }
  }
}

export function scarePeds(state, x, y, radius) {
  for (const ped of state.peds) {
    if (dist(ped.x, ped.y, x, y) < radius) {
      ped.flee = 2.5 + Math.random();
      ped.fx = x; ped.fy = y;
    }
  }
}
