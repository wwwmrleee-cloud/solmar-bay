// localStorage save / load: mission progress, money, position, wanted, stats,
// plus round-3 progress: owned upgrades, jobs done, bosses down, money earned.
// The save carries a version number: v1 saves load fine and migrate with
// empty upgrades, so nobody loses story progress to the new format.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      v: 2,
      missionIndex: state.missionIndex,
      money: state.player.money,
      x: state.player.x, y: state.player.y,
      hp: state.player.hp,
      ammo: state.player.ammo,
      wanted: state.wanted,
      hiddenFound: state.hiddenFound,
      hiddenFoundList: state.hiddenPackages.map((hp, i) => (hp.found ? i : -1)).filter((i) => i >= 0),
      packagesCollected: state.packagesCollected || 0,
      stats: state.stats,
      clockMin: state.clockMin,
      upgrades: state.upgrades || [],
      jobsDone: state.stats.jobsDone || 0,
      bossesDown: state.bossesDown || 0,
      moneyEarned: state.moneyEarned || 0,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data) return null;
    if (data.v === 1) {
      // Migrate a v1 save: story progress and money carry over, the new
      // progression fields start empty. The first N hidden packages count
      // as found, so the count and the map stay in sync.
      data.upgrades = [];
      data.jobsDone = 0;
      data.bossesDown = 0;
      data.moneyEarned = data.money || 0;
      data.hiddenFoundList = Array.from({ length: data.hiddenFound || 0 }, (_, i) => i);
      data.v = 2;
      return data;
    }
    if (data.v !== 2) return null;
    return data;
  } catch { return null; }
}

export function hasSave() { return loadSave() !== null; }

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}
