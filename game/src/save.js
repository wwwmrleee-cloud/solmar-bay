// Solmar Bay — saving to local storage. A save carries version 2
// and everything the game needs to pick up where it left off. The
// loader is deliberately forgiving about field names: a version 1
// save written by another hand still migrates cleanly, and any save
// with an unknown version counts as no save at all.

import { SAVE_KEY, SAVE_VERSION, HIDDEN_PACKAGES, UPGRADES } from './config.js';
import { S } from './world.js';

function num(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function strList(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
}

export function buildSave() {
  return {
    version: SAVE_VERSION,
    missionIndex: S.missionIndex,
    money: S.money,
    player: {
      x: S.player.x,
      y: S.player.y,
      health: S.player.health,
      ammo: S.player.ammo,
    },
    wanted: S.wanted,
    packagesFound: S.packages.filter((p) => p.found).length,
    packages: S.packages.map((p, i) => (p.found ? i : -1)).filter((i) => i >= 0),
    missionPackages: S.missionPackagesDone,
    stats: { ...S.stats },
    clock: S.clock,
    upgrades: [...S.upgrades],
    jobsCompleted: S.stats.jobsCompleted,
    bossesBeaten: S.bossesBeaten,
    moneyEarned: S.moneyEarned,
    savedAt: Date.now(),
  };
}

export function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildSave()));
    return true;
  } catch (e) {
    return false;
  }
}

export function readSaveRaw() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function hasSave() {
  return readSaveRaw() !== null;
}

// Load a save object into the live state. Returns true when a save
// was applied, false when there was none worth loading.
export function applySave(data) {
  if (!data || typeof data !== 'object') return false;
  const version = num(data.version, 0);
  if (version !== 1 && version !== 2) return false;

  // Position: a player object first, then flat fields.
  const px = num(data.player?.x, num(data.x, num(data.playerX, 675)));
  const py = num(data.player?.y, num(data.y, num(data.playerY, 1125)));
  const health = num(data.player?.health, num(data.health, 100));
  const ammo = num(data.player?.ammo, num(data.ammo, num(data.ammunition, 60)));

  S.missionIndex = Math.max(0, Math.min(7, Math.round(num(data.missionIndex, num(data.mission, 0)))));
  S.money = Math.max(0, num(data.money, 0));
  S.player.x = px;
  S.player.y = py;
  S.player.health = health;
  S.player.ammo = ammo;
  S.wanted = Math.max(0, Math.min(5, Math.round(num(data.wanted, num(data.wantedLevel, 0)))));

  // Hidden packages: version 2 names the exact ones found; version 1
  // only counts them, so the first N count as found.
  const foundList = Array.isArray(data.packages)
    ? data.packages.filter((i) => typeof i === 'number')
    : [];
  const foundCount = num(data.packagesFound, foundList.length);
  S.packages.forEach((p, i) => {
    if (version === 2) {
      p.found = foundList.includes(i);
    } else {
      p.found = i < foundCount;
    }
  });

  S.missionPackagesDone = num(data.missionPackages, num(data.missionPackagesCollected, 0));
  const stats = data.stats && typeof data.stats === 'object' ? data.stats : {};
  S.stats.shots = num(stats.shots, 0);
  S.stats.hits = num(stats.hits, 0);
  S.stats.carsStolen = num(stats.carsStolen, 0);
  S.stats.pedsHit = num(stats.pedsHit, 0);
  S.stats.missionsCompleted = num(stats.missionsCompleted, S.missionIndex);
  S.stats.kills = num(stats.kills, 0);
  S.stats.jobsTaken = num(stats.jobsTaken, 0);
  S.stats.jobsCompleted = num(stats.jobsCompleted, num(data.jobsCompleted, 0));
  S.stats.upgradesBought = num(stats.upgradesBought, 0);

  S.clock = num(data.clock, 485);
  S.upgrades.length = 0;
  if (version === 2) {
    // Only known upgrade ids, each once: a hand-edited or corrupt
    // save must not inject an unknown id into the upgrade list.
    for (const id of strList(data.upgrades)) {
      if (UPGRADES[id] && !S.upgrades.includes(id)) S.upgrades.push(id);
    }
  }
  S.bossesBeaten = version === 2 ? num(data.bossesBeaten, 0) : 0;
  S.moneyEarned = version === 2 ? num(data.moneyEarned, S.money) : S.money;
  S.player.maxHealth = 100 + (S.upgrades.includes('tough') ? 25 : 0) + (S.upgrades.includes('iron') ? 25 : 0);
  S.player.ammoCap = S.upgrades.includes('mags') ? 240 : 120;
  S.player.health = Math.min(S.player.health, S.player.maxHealth);
  S.player.ammo = Math.min(S.player.ammo, S.player.ammoCap);
  void HIDDEN_PACKAGES;
  return true;
}

// Restore the mission packages for a continued mission three.
export function restoreMissionPackages() {
  S.missionPackages.forEach((p, i) => {
    p.collected = i < S.missionPackagesDone;
  });
}
