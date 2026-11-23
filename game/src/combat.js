// Solmar Bay — shooting and combat. Danny shoots on foot only.
// Enemies and officers shoot back. Bullets die on walls, and a
// player bullet spends itself on the first thing it hits.

import { S, dist, angleTo, circleHitsBuilding, moveCircle, spawnSparks, spawnSmoke } from './world.js';
import { GUN, ENEMY, WANTED, MINION_HEALTH, MINION_OFFSET_X, MINION_OFFSET_Y } from './config.js';
import { INPUT, keyHeld } from './input.js';
import { addWantedStars, addWantedPoints } from './police.js';
import { scarePedestrians } from './pedestrians.js';
import { playGunshot, playEnemyShot, playPickup } from './audio.js';
import { wreckDrivenCar } from './vehicles.js';

// Make one enemy. Every field a caller might read is present:
// kind, type, name, boss, minion, bounty and visible alike.
export function makeEnemy(x, y, opts) {
  const o = opts || {};
  return {
    x, y,
    angle: o.angle || 0,
    health: o.health || 100,
    maxHealth: o.health || 100,
    name: o.name || 'Rival',
    kind: o.kind || 'rival',
    type: o.kind || 'rival',
    boss: !!o.boss,
    isBoss: !!o.boss,
    minion: !!o.minion,
    bounty: !!o.bounty,
    visible: true,
    speed: ENEMY.walkSpeed,
    cooldown: 1 + S.rng(),
    calledMinions: false,
    damage: o.boss ? ENEMY.bossBulletDamage : ENEMY.bulletDamage,
  };
}

export function spawnEnemy(x, y, opts) {
  const e = makeEnemy(x, y, opts);
  S.enemies.push(e);
  return e;
}

export function spawnBoss(def) {
  const place = def.spawn;
  const base = { hideout: { x: 675, y: 2080 }, harbourCash: { x: 450, y: 2560 } }[place];
  const e = makeEnemy(base.x + def.dx, base.y + def.dy, {
    health: def.health, name: def.name, kind: 'boss', boss: true,
  });
  S.enemies.push(e);
  S.boss = e;
  return e;
}

// The boss calls two minions the first time it drops below half.
function maybeCallMinions(boss) {
  if (!boss.boss || boss.calledMinions) return;
  if (boss.health * 2 >= boss.maxHealth) return;
  boss.calledMinions = true;
  for (const side of [-1, 1]) {
    spawnEnemy(boss.x + side * MINION_OFFSET_X, boss.y + MINION_OFFSET_Y, {
      health: MINION_HEALTH, name: 'Minion', kind: 'minion', minion: true,
    });
  }
  S.toast = { text: `${boss.name} called in backup!`, until: S.time + 4 };
}

function killEnemy(enemy) {
  enemy.health = 0;
  S.stats.kills++;
  spawnSparks(enemy.x, enemy.y, 10);
  spawnSmoke(enemy.x, enemy.y, 4);
  const i = S.enemies.indexOf(enemy);
  if (i >= 0) S.enemies.splice(i, 1);
  if (enemy === S.boss) {
    S.boss = null;
    S.bossesBeaten++;
    S.toast = { text: `${enemy.name} is down!`, until: S.time + 4 };
    playPickup();
  }
}

// Danny fires the pistol: on foot, with ammunition, on the clock.
function playerShoot(dt) {
  const p = S.player;
  if (S.inCar || S.screen !== 'play') return;
  const wantFire = INPUT.mouseDown || keyHeld('Space');
  if (!wantFire || p.fireCooldown > 0) return;
  if (p.ammo <= 0) return;
  const interval = p.fireInterval;
  const damage = p.damage;
  p.fireCooldown = interval;
  p.ammo--;
  S.stats.shots++;
  const a = p.angle + (S.rng() - 0.5) * 2 * GUN.spread;
  S.bullets.push({
    x: p.x + Math.cos(a) * GUN.muzzleOffset,
    y: p.y + Math.sin(a) * GUN.muzzleOffset,
    vx: Math.cos(a) * GUN.bulletSpeed,
    vy: Math.sin(a) * GUN.bulletSpeed,
    life: GUN.bulletLife,
    damage,
  });
  playGunshot();
  scarePedestrians(p.x, p.y);
  // Gunfire counts as one incident when the police are near.
  let near = Infinity;
  for (const car of S.police) near = Math.min(near, dist(p.x, p.y, car.x, car.y));
  for (const off of S.officers) near = Math.min(near, dist(p.x, p.y, off.x, off.y));
  if (near <= WANTED.gunfireRange && S.time - S.lastGunfireWanted >= WANTED.gunfireCooldown) {
    S.lastGunfireWanted = S.time;
    addWantedPoints(WANTED.pointsPerStar / 2);
  }
}

function updatePlayerBullets(dt) {
  const p = S.player;
  for (let i = S.bullets.length - 1; i >= 0; i--) {
    const b = S.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && circleHitsBuilding(b.x, b.y, 2)) dead = true;
    if (!dead) {
      // Enemies first.
      for (const e of [...S.enemies]) {
        if (dist(b.x, b.y, e.x, e.y) <= GUN.hitRange) {
          e.health -= b.damage;
          S.stats.hits++;
          spawnSparks(b.x, b.y, 3);
          if (e.health <= 0) killEnemy(e);
          else maybeCallMinions(e);
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const ped of S.pedestrians) {
        if (dist(b.x, b.y, ped.x, ped.y) <= GUN.pedHitRange) {
          ped.flee = 3;
          const a = angleTo(p.x, p.y, ped.x, ped.y);
          ped.fleeX = Math.cos(a);
          ped.fleeY = Math.sin(a);
          S.stats.pedsHit++;
          addWantedStars(1);
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (let j = S.police.length - 1; j >= 0; j--) {
        const car = S.police[j];
        if (dist(b.x, b.y, car.x, car.y) <= GUN.policeHitRange) {
          car.health -= b.damage;
          S.stats.hits++;
          addWantedStars(1);
          spawnSparks(b.x, b.y, 3);
          if (car.health <= 0) {
            S.police.splice(j, 1);
            addWantedStars(1);
            S.toast = { text: 'Police car destroyed', until: S.time + 3 };
          }
          dead = true;
          break;
        }
      }
    }
    if (dead) S.bullets.splice(i, 1);
  }
}

function damagePlayer(amount) {
  const p = S.player;
  if (p.invuln > 0 || S.screen !== 'play') return;
  p.health -= amount;
  p.invuln = ENEMY.invulnTime;
  if (p.health < 0) p.health = 0;
}

function updateEnemyBullets(dt) {
  const p = S.player;
  for (let i = S.enemyBullets.length - 1; i >= 0; i--) {
    const b = S.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && circleHitsBuilding(b.x, b.y, 2)) dead = true;
    if (!dead && !S.inCar) {
      if (dist(b.x, b.y, p.x, p.y) <= ENEMY.playerHitRange) {
        damagePlayer(b.damage);
        dead = true;
      }
    }
    if (!dead && S.inCar) {
      const car = S.cars[S.carIndex];
      if (car && dist(b.x, b.y, car.x, car.y) <= ENEMY.carHitRange) {
        let dmg = b.damage;
        if (S.upgrades.includes('armoured')) dmg *= 0.6;
        car.health -= dmg;
        if (car.health <= 0) {
          car.health = 0;
          wreckDrivenCar('Car wrecked — find another');
        }
        dead = true;
      }
    }
    if (dead) S.enemyBullets.splice(i, 1);
  }
}

// One enemy's turn: walk in when far, shoot when Danny is close.
function updateEnemy(e, dt) {
  const p = S.player;
  const d = dist(e.x, e.y, p.x, p.y);
  if (d > ENEMY.stopRange) {
    const a = angleTo(e.x, e.y, p.x, p.y);
    e.angle = a;
    const pos = moveCircle(e.x, e.y, Math.cos(a) * ENEMY.walkSpeed * dt, Math.sin(a) * ENEMY.walkSpeed * dt, 12);
    e.x = pos.x;
    e.y = pos.y;
  }
  if (d > ENEMY.shootRange) return;
  e.cooldown -= dt;
  if (e.cooldown > 0) return;
  if (e.boss) {
    e.cooldown = ENEMY.bossCooldownMin + S.rng() * (ENEMY.bossCooldownMax - ENEMY.bossCooldownMin);
    const base = angleTo(e.x, e.y, p.x, p.y);
    for (const off of [-ENEMY.bossSpread, 0, ENEMY.bossSpread]) {
      const a = base + off;
      S.enemyBullets.push({
        x: e.x + Math.cos(a) * 22, y: e.y + Math.sin(a) * 22,
        vx: Math.cos(a) * ENEMY.bulletSpeed, vy: Math.sin(a) * ENEMY.bulletSpeed,
        life: ENEMY.bulletLife, damage: ENEMY.bossBulletDamage, fromBoss: true,
      });
    }
    playEnemyShot();
  } else {
    e.cooldown = ENEMY.cooldownMin + S.rng() * (ENEMY.cooldownMax - ENEMY.cooldownMin);
    const a = angleTo(e.x, e.y, p.x, p.y) + (S.rng() - 0.5) * 2 * ENEMY.spread;
    S.enemyBullets.push({
      x: e.x + Math.cos(a) * 22, y: e.y + Math.sin(a) * 22,
      vx: Math.cos(a) * ENEMY.bulletSpeed, vy: Math.sin(a) * ENEMY.bulletSpeed,
      life: ENEMY.bulletLife, damage: ENEMY.bulletDamage, fromRival: true,
    });
    playEnemyShot();
  }
}

export function updateCombat(dt) {
  playerShoot(dt);
  updatePlayerBullets(dt);
  updateEnemyBullets(dt);
  for (const e of [...S.enemies]) updateEnemy(e, dt);
}
