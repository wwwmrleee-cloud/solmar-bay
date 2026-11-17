// Shooting: player pistol (mouse aim, click/Space), enemy fire, bullets,
// muzzle flash, hit feedback, enemy health bars.
// The pistol only fires on foot — a driving player cannot shoot — and a
// bullet dies on the first building it hits, so there is no shooting
// through walls.
import { BULLET_SPEED } from './config.js';
import { hitBuilding, dist, addParticles, addWanted, playerPos, nearestPoliceDist } from './world.js';
import { isDown, wasPressed } from './input.js';
import { sfx } from './audio.js';
import { scarePeds } from './pedestrians.js';

export function updateCombat(state, dt, audio) {
  const p = state.player;

  // Player shooting (on foot only; driving players can't shoot).
  if (p.inCar === null && state.screen === 'play') {
    const wantShoot = (inputWantsShoot(state)) && p.shootCd <= 0 && p.ammo > 0;
    if (wantShoot) {
      p.shootCd = 0.22;
      p.ammo -= 1;
      state.stats.shots += 1;
      const a = p.angle + (Math.random() - 0.5) * 0.06;
      state.bullets.push({
        x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22,
        angle: a, speed: BULLET_SPEED, from: 'player', life: 1.1, dmg: 34,
      });
      addParticles(state, p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 26, '#ffd94d', 3, 160);
      sfx.shoot(audio);
      scarePeds(state, p.x, p.y, 420);
      // Gunfire only draws heat if the police are close enough to hear it,
      // and at most once every 5 s — a firefight is one incident, not one
      // wanted star per bullet.
      if (nearestPoliceDist(state) < 500 && state.time - (state.lastHeatAt || -99) > 5) {
        state.lastHeatAt = state.time;
        addWanted(state, 0.5);
      }    }
  }

  // Enemy shooting (rival crew): aim at the player, inaccurate.
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const pp = playerPos(state);
    const d = dist(e.x, e.y, pp.x, pp.y);
    e.shootCd -= dt;
    if (d < 520 && e.shootCd <= 0) {
      e.shootCd = 1.3 + Math.random() * 0.9;
      const a = Math.atan2(pp.y - e.y, pp.x - e.x) + (Math.random() - 0.5) * 0.35;
      state.bullets.push({ x: e.x, y: e.y, angle: a, speed: 560, from: 'enemy', life: 1.2, dmg: 6 });
      sfx.enemyShoot(audio);
    }
    // Enemies shuffle toward the player when far.
    if (d > 260) {
      const a = Math.atan2(pp.y - e.y, pp.x - e.x);
      const nx = e.x + Math.cos(a) * 55 * dt;
      const ny = e.y + Math.sin(a) * 55 * dt;
      if (!hitBuilding(state, nx, ny, 12)) { e.x = nx; e.y = ny; }
    }
  }

  // Bullets move and hit things.
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && hitBuilding(state, b.x, b.y, 2)) {
      addParticles(state, b.x, b.y, '#c9c9c9', 4, 120);
      dead = true;
    }
    if (!dead && b.from === 'player') {
      // Hit an enemy.
      for (const e of state.enemies) {
        if (e.hp > 0 && dist(b.x, b.y, e.x, e.y) < 18) {
          e.hp -= b.dmg;
          state.stats.hits += 1;
          addParticles(state, b.x, b.y, '#e74c3c', 6, 160);
          if (e.hp <= 0) {
            state.stats.kills += 1;
            addParticles(state, e.x, e.y, '#e74c3c', 16, 260);
          }
          dead = true;
          break;
        }
      }
      // Hit a pedestrian (a crime — the player chose this).
      if (!dead) {
        for (const ped of state.peds) {
          if (dist(b.x, b.y, ped.x, ped.y) < 14) {
            ped.flee = 4; ped.fx = b.x; ped.fy = b.y;
            state.stats.pedsHit += 1;
            addWanted(state, 1);
            addParticles(state, ped.x, ped.y, '#e74c3c', 8, 160);
            dead = true;
            break;
          }
        }
      }
      // Hit a police car / officer.
      if (!dead) {
        for (const c of state.policeCars) {
          if (dist(b.x, b.y, c.x, c.y) < 24) {
            c.hp -= b.dmg;
            addWanted(state, 1);
            addParticles(state, b.x, b.y, '#ffb347', 6, 160);
            if (c.hp <= 0) {
              c.hp = 0;
              addParticles(state, c.x, c.y, '#555', 20, 220);
              state.policeCars.splice(state.policeCars.indexOf(c), 1);
              addWanted(state, 1);
            }
            dead = true;
            break;
          }
        }
      }
    }
    if (!dead && b.from === 'enemy') {
      const pp = playerPos(state);
      const inCar = state.player.inCar !== null;
      if (dist(b.x, b.y, pp.x, pp.y) < (inCar ? 26 : 15)) {
        if (inCar) {
          const car = state.cars[state.player.inCar];
          car.hp -= b.dmg;
          if (car.hp <= 0) { car.hp = 0; }
        } else if (state.player.invuln <= 0) {
          state.player.hp -= b.dmg;
          state.player.invuln = 0.25;
        }
        addParticles(state, b.x, b.y, '#e74c3c', 4, 120);
        dead = true;
      }
    }
    if (dead) state.bullets.splice(i, 1);
  }

  // Remove dead enemies.
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    if (state.enemies[i].hp <= 0) state.enemies.splice(i, 1);
  }
}

// The shoot input lives on the shared input object (set by main.js).
let shootHeld = false;
export function setShootHeld(v) { shootHeld = v; }
function inputWantsShoot() { return shootHeld; }
