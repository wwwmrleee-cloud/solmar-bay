// localStorage save / load: mission progress, money, position, wanted, stats.
// The save carries a version number, so a future format can migrate an old
// save instead of wiping the player's progress.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      v: 1,
      missionIndex: state.missionIndex,
      money: state.player.money,
      x: state.player.x, y: state.player.y,
      hp: state.player.hp,
      ammo: state.player.ammo,
      wanted: state.wanted,
      hiddenFound: state.hiddenFound,
      packagesCollected: state.packagesCollected || 0,
      stats: state.stats,
      clockMin: state.clockMin,
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
    if (!data || data.v !== 1) return null;
    return data;
  } catch { return null; }
}

export function hasSave() { return loadSave() !== null; }

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}
