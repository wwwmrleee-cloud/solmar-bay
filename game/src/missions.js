// Story missions: 5 missions with dialogue, waypoints, objectives and pay.
// The state machine lives in state.missionState { phase, collected, spawned }.
import { MISSIONS } from './config.js';
import { dist, addToast, addWanted, PLACES } from './world.js';
import { sfx } from './audio.js';

function startDialogue(state, lines, onDone) {
  state.dialogue = { lines, idx: 0, onDone: onDone || null };
}

export function advanceDialogue(state, audio) {
  if (!state.dialogue) return false;
  sfx.click(audio);
  state.dialogue.idx += 1;
  if (state.dialogue.idx >= state.dialogue.lines.length) {
    const cb = state.dialogue.onDone;
    state.dialogue = null;
    if (cb) cb();
  }
  return true;
}

function completeMission(state, audio) {
  const m = MISSIONS[state.missionIndex];
  state.player.money += m.pay;
  state.player.ammo = Math.min(120, state.player.ammo + 24);
  state.player.hp = Math.min(100, state.player.hp + 30); // patch up between missions
  state.stats.missionsDone += 1;
  sfx.jingle(audio);
  addToast(state, `Mission complete: ${m.name} — +$${m.pay}`);
  state.missionIndex += 1;
  state.missionState = { phase: 'go', collected: [], spawned: false };
  state.missionPackages = [];
  if (state.missionIndex >= MISSIONS.length) {
    state.won = true;
    state.over = 'won';
    state.screen = 'won';
    return;
  }
  beginMission(state, audio);
}

function beginMission(state, audio) {
  const idx = state.missionIndex;
  const m = MISSIONS[idx];
  if (!m) return;
  if (idx === 0) {
    state.waypoint = { x: PLACES.cafe.x, y: PLACES.cafe.y, label: PLACES.cafe.label };
    addToast(state, 'New in Solmar Bay — meet Mara Solis at the Sunrise Cafe.');
  } else if (idx === 1) {
    state.waypoint = { x: state.getawayCar.x, y: state.getawayCar.y, label: 'Getaway Car' };
    startDialogue(state, m.dialogue);
  } else if (idx === 2) {
    state.missionPackages = [
      { x: PLACES.park.x, y: PLACES.park.y, taken: false, label: 'Park' },
      { x: PLACES.port.x, y: PLACES.port.y, taken: false, label: 'Port' },
      { x: PLACES.beach.x, y: PLACES.beach.y, taken: false, label: 'Beach' },
    ];
    state.waypoint = { x: PLACES.park.x, y: PLACES.park.y, label: 'Package 1/3 — Park' };
    startDialogue(state, m.dialogue);
  } else if (idx === 3) {
    state.waypoint = { x: PLACES.hideout.x, y: PLACES.hideout.y, label: PLACES.hideout.label };
    startDialogue(state, m.dialogue, () => spawnEnemies(state));
  } else if (idx === 4) {
    state.waypoint = { x: PLACES.harbour.x, y: PLACES.harbour.y, label: PLACES.harbour.label };
    startDialogue(state, m.dialogue);
  }
}

function spawnEnemies(state) {
  if (state.missionState.spawned) return;
  state.missionState.spawned = true;
  // The crew fight is Mara's business, not the cops': the heat clears so
  // the shootout stays a fair fight instead of a police swarm.
  state.wanted = 0; state.wantedPts = 0; state.hiddenTimer = 0;
  state.policeCars.length = 0; state.officers.length = 0;
  addToast(state, 'The cops are looking the other way tonight — handle the crew yourself.');
  const hx = PLACES.hideout.x, hy = PLACES.hideout.y;
  // Spawn ON the roads around the hideout (x=675 vertical road, y=2025
  // horizontal road) — never inside a building, or the fight is unwinnable.
  const spots = [
    [675, 1900], [675, 2260], [500, 2025],
    [850, 2025], [450, 2025], [900, 2025],
  ];
  for (const [x, y] of spots) {
    state.enemies.push({ x, y, hp: 100, shootCd: 1 + Math.random(), color: '#7a1f1f' });
  }
  addToast(state, 'Rival crew incoming — 6 enemies!');
}

export function updateMissions(state, dt, audio) {
  if (state.over || state.dialogue) return;
  const idx = state.missionIndex;
  const p = state.player;
  const pp = p.inCar !== null && state.cars[p.inCar]
    ? { x: state.cars[p.inCar].x, y: state.cars[p.inCar].y }
    : { x: p.x, y: p.y };

  if (idx === 0) {
    if (dist(pp.x, pp.y, PLACES.cafe.x, PLACES.cafe.y) < 120) {
      startDialogue(state, MISSIONS[0].dialogue, () => completeMission(state, audio));
    }
  } else if (idx === 1) {
    if (state.missionState.phase === 'go') {
      if (p.inCar !== null && state.cars[p.inCar] && state.cars[p.inCar].getaway) {
        state.missionState.phase = 'drive';
        state.waypoint = { x: PLACES.hideout.x, y: PLACES.hideout.y, label: PLACES.hideout.label };
        addWanted(state, 2);
        addToast(state, 'Drive the getaway car to the Hideout — lose the cops!');
      } else {
        state.waypoint = { x: state.getawayCar.x, y: state.getawayCar.y, label: 'Getaway Car' };
      }
    } else if (state.missionState.phase === 'drive') {
      if (dist(pp.x, pp.y, PLACES.hideout.x, PLACES.hideout.y) < 110) {
        completeMission(state, audio);
      }
    }
  } else if (idx === 2) {
    const remaining = state.missionPackages.filter((k) => !k.taken);
    if (remaining.length === 0) {
      completeMission(state, audio);
    } else {
      const next = remaining[0];
      state.waypoint = { x: next.x, y: next.y, label: `Package ${3 - remaining.length + 1}/3 — ${next.label}` };
    }
  } else if (idx === 3) {
    if (!state.missionState.spawned) {
      // Player must reach the hideout first; dialogue callback spawns enemies.
      if (dist(pp.x, pp.y, PLACES.hideout.x, PLACES.hideout.y) < 130 && !state.dialogue) {
        startDialogue(state, MISSIONS[3].dialogue, () => spawnEnemies(state));
      }
    } else if (state.enemies.length === 0) {
      completeMission(state, audio);
    }
  } else if (idx === 4) {
    if (state.missionState.phase === 'go') {
      if (dist(pp.x, pp.y, PLACES.harbour.x, PLACES.harbour.y) < 140) {
        state.missionState.phase = 'grab';
        addToast(state, 'Press E to grab the cash!');
      }
    } else if (state.missionState.phase === 'grab') {
      // Waiting for the E interaction in player.js (tryInteract).
      state.waypoint = { x: PLACES.harbour.x, y: PLACES.harbour.y, label: 'Grab the cash (E)' };
    } else if (state.missionState.phase === 'escape') {
      state.waypoint = { x: PLACES.hideout.x, y: PLACES.hideout.y, label: PLACES.hideout.label };
      if (dist(pp.x, pp.y, PLACES.hideout.x, PLACES.hideout.y) < 110) {
        completeMission(state, audio);
      }
    }
  }
}

// Called when a new game starts (or Continue loads a save): open mission intro.
export function startStory(state, audio) {
  state.missionIndex = 0;
  state.missionState = { phase: 'go', collected: [], spawned: false };
  beginMission(state, audio);
}

// Resume a loaded save at its mission index without replaying dialogue.
export function resumeStory(state) {
  const idx = state.missionIndex;
  state.missionState = { phase: 'go', collected: [], spawned: false };
  if (idx === 0) state.waypoint = { x: PLACES.cafe.x, y: PLACES.cafe.y, label: PLACES.cafe.label };
  else if (idx === 1) state.waypoint = { x: state.getawayCar.x, y: state.getawayCar.y, label: 'Getaway Car' };
  else if (idx === 2) {
    state.missionPackages = [
      { x: PLACES.park.x, y: PLACES.park.y, taken: false, label: 'Park' },
      { x: PLACES.port.x, y: PLACES.port.y, taken: false, label: 'Port' },
      { x: PLACES.beach.x, y: PLACES.beach.y, taken: false, label: 'Beach' },
    ];
    state.waypoint = { x: PLACES.park.x, y: PLACES.park.y, label: 'Package 1/3 — Park' };
  } else if (idx === 3) state.waypoint = { x: PLACES.hideout.x, y: PLACES.hideout.y, label: PLACES.hideout.label };
  else if (idx === 4) state.waypoint = { x: PLACES.harbour.x, y: PLACES.harbour.y, label: PLACES.harbour.label };
}
