// Solmar Bay — the story: seven missions, Mara's dialogue, the two
// bosses and the victory screen. A mission's intro opens when Danny
// comes near the mission's first target; the dialogue freezes the
// world, and the action the intro promises runs when it ends.

import { S, dist } from './world.js';
import {
  MISSIONS, PLACES, MISSION_PACKAGES, MISSION_REWARD_AMMO, MISSION_REWARD_HEALTH,
  BOSSES, M4_SPAWNS, RIVAL_HEALTH, GETAWAY,
} from './config.js';
import { spawnEnemy, spawnBoss } from './combat.js';
import { clearWanted, addWantedStars } from './police.js';
import { playJingle, playPickup, playClick } from './audio.js';
import { writeSave } from './save.js';

// ---------------------------------------------------------------- dialogue

export function openDialogue(speaker, lines, onDone) {
  // Never clobber a dialogue that is already showing: a mission
  // intro and a shop greeting can both fire on the same frame, and
  // the second one would silently eat the first one's lines.
  if (S.dialogue) return false;
  S.dialogue = { speaker, lines, index: 0, onDone: onDone || null };
  playClick();
  return true;
}

export function advanceDialogue() {
  const d = S.dialogue;
  if (!d) return false;
  playClick();
  if (d.index < d.lines.length - 1) {
    d.index++;
    return true;
  }
  S.dialogue = null;
  if (d.onDone) d.onDone();
  return true;
}

export function dialogueOpen() {
  return S.dialogue !== null;
}

// ---------------------------------------------------------------- missions

// Where a mission's intro opens, and how close Danny must be.
function introTarget(index) {
  switch (index) {
    case 0: return { x: PLACES.cafe.x, y: PLACES.cafe.y, radius: 120 };
    case 1: return { x: GETAWAY.x, y: GETAWAY.y, radius: 150 };
    case 2: return { x: MISSION_PACKAGES[0].x, y: MISSION_PACKAGES[0].y, radius: 150 };
    case 3: return { x: PLACES.hideout.x, y: PLACES.hideout.y, radius: 130 };
    case 4: return { x: PLACES.harbourCash.x, y: PLACES.harbourCash.y, radius: 140 };
    case 5: return { x: PLACES.hideout.x, y: PLACES.hideout.y, radius: 130 };
    case 6: return { x: PLACES.harbourCash.x, y: PLACES.harbourCash.y, radius: 140 };
    default: return null;
  }
}

function waypointFor(index, phase) {
  switch (index) {
    case 0: return { x: PLACES.cafe.x, y: PLACES.cafe.y, label: 'Sunrise Cafe' };
    case 1:
      if (phase === 'drive') return { x: PLACES.hideout.x, y: PLACES.hideout.y, label: 'Hideout' };
      return { x: GETAWAY.x, y: GETAWAY.y, label: 'Getaway Car' };
    case 2: {
      const next = S.missionPackages.find((p) => !p.collected);
      if (!next) return { x: PLACES.hideout.x, y: PLACES.hideout.y, label: 'Hideout' };
      const n = S.missionPackages.indexOf(next) + 1;
      return { x: next.x, y: next.y, label: `Package ${n} of 3` };
    }
    case 3: return { x: PLACES.hideout.x, y: PLACES.hideout.y, label: 'Hideout' };
    case 4: return { x: PLACES.harbourCash.x, y: PLACES.harbourCash.y, label: 'Harbour Cash' };
    case 5: return { x: PLACES.hideout.x, y: PLACES.hideout.y, label: 'Hideout' };
    case 6: return { x: PLACES.harbourCash.x, y: PLACES.harbourCash.y, label: 'Harbour Cash' };
    default: return { x: PLACES.hideout.x, y: PLACES.hideout.y, label: 'Hideout' };
  }
}

function setWaypoint() {
  S.storyWaypoint = waypointFor(S.missionIndex, S.missionPhase);
  if (!S.job) S.waypoint = { ...S.storyWaypoint };
}

// What a mission's intro sets in motion when it ends.
function introDone(index) {
  if (index === 0) {
    completeMission();
    return;
  }
  if (index === 3) {
    // The fight starts: six rivals on the roads, a fair fight.
    for (const spot of M4_SPAWNS) {
      spawnEnemy(spot.x, spot.y, { health: RIVAL_HEALTH, name: 'Rival', kind: 'rival' });
    }
    clearWanted();
    S.missionPhase = 'fight';
    S.toast = { text: 'Six rivals — hold the line!', until: S.time + 4 };
    setWaypoint();
    return;
  }
  if (index === 4) {
    S.missionPhase = 'grab';
    S.toast = { text: 'Press E to grab the cash', until: S.time + 4 };
    setWaypoint();
    return;
  }
  if (index === 5) {
    spawnBoss(BOSSES.rico);
    clearWanted();
    S.missionPhase = 'fight';
    S.toast = { text: 'Rico is here!', until: S.time + 4 };
    setWaypoint();
    return;
  }
  if (index === 6) {
    spawnBoss(BOSSES.voss);
    addWantedStars(4);
    S.missionPhase = 'fight';
    S.toast = { text: 'Captain Voss is here!', until: S.time + 4 };
    setWaypoint();
    return;
  }
}

// Start a mission. skipIntro is for a continued save: no dialogue
// is replayed, but the fight still has to be set up.
export function startMission(index, skipIntro) {
  S.missionIndex = index;
  S.missionPhase = 'reach';
  S.missionIntroShown = !!skipIntro;
  if (!skipIntro) S.missionPackagesDone = 0;
  if (index === 2 && !skipIntro) {
    for (const p of S.missionPackages) p.collected = false;
  }
  // Missions three to seven begin with Mara's dialogue at once, so
  // the briefing is heard before Danny walks to the first target and
  // no dialogue is waiting at the target itself.
  if (index >= 2 && !skipIntro) {
    S.missionIntroShown = true;
    openDialogue('Mara Solis', MISSIONS[index].intro, () => introDone(index));
  }
  if (skipIntro) {
    if (index === 3) {
      for (const spot of M4_SPAWNS) {
        spawnEnemy(spot.x, spot.y, { health: RIVAL_HEALTH, name: 'Rival', kind: 'rival' });
      }
      clearWanted();
      S.missionPhase = 'fight';
    } else if (index === 5) {
      spawnBoss(BOSSES.rico);
      clearWanted();
      S.missionPhase = 'fight';
    } else if (index === 6) {
      spawnBoss(BOSSES.voss);
      S.missionPhase = 'fight';
    }
  }
  setWaypoint();
}

export function completeMission() {
  const m = MISSIONS[S.missionIndex];
  if (!m) return;
  S.money += m.pay;
  S.moneyEarned += m.pay;
  S.player.ammo = Math.min(S.player.ammoCap, S.player.ammo + MISSION_REWARD_AMMO);
  S.player.health = Math.min(S.player.maxHealth, S.player.health + MISSION_REWARD_HEALTH);
  S.stats.missionsCompleted++;
  S.toast = { text: `Mission complete — ${m.name} ($${m.pay})`, until: S.time + 4 };
  playJingle();
  S.missionIndex++;
  if (S.missionIndex >= MISSIONS.length) {
    winGame();
    return;
  }
  startMission(S.missionIndex, false);
}

export function winGame() {
  S.won = true;
  S.screen = 'won';
  writeSave();
}

export function missionRank() {
  if (S.bossesBeaten >= 2 && S.stats.jobsCompleted >= 3) return 'S';
  if (S.bossesBeaten >= 2) return 'A';
  if (S.stats.missionsCompleted >= 7) return 'B';
  return 'C';
}

// Collect a mission-three package by pressing E near it.
export function collectMissionPackage(x, y) {
  if (S.missionIndex !== 2) return false;
  for (const p of S.missionPackages) {
    if (p.collected) continue;
    if (dist(x, y, p.x, p.y) <= 70) {
      p.collected = true;
      S.missionPackagesDone++;
      const n = S.missionPackagesDone;
      S.toast = { text: `Package ${n} of 3 collected`, until: S.time + 3 };
      playPickup();
      setWaypoint();
      return true;
    }
  }
  return false;
}

// Grab the harbour cash during mission five's grab phase.
export function grabHarbourCash(x, y) {
  if (S.missionIndex !== 4 || S.missionPhase !== 'grab') return false;
  if (dist(x, y, PLACES.harbourCash.x, PLACES.harbourCash.y) > 80) return false;
  addWantedStars(4);
  S.missionPhase = 'escape';
  S.toast = { text: 'Cash grabbed — run for the Hideout!', until: S.time + 4 };
  playPickup();
  setWaypoint();
  return true;
}

// The per-frame mission logic: intros, phase changes, completions.
export function updateMissions(dt) {
  void dt;
  if (S.missionIndex >= MISSIONS.length) return;
  // A staged scene is set up by hand; its mission logic must not run.
  if (S.shot) return;
  if (S.dialogue) return;
  const index = S.missionIndex;
  const p = S.player;

  // The intro opens when Danny comes near the mission's first target.
  if (!S.missionIntroShown) {
    const target = introTarget(index);
    if (target && dist(p.x, p.y, target.x, target.y) <= target.radius) {
      S.missionIntroShown = true;
      openDialogue('Mara Solis', MISSIONS[index].intro, () => introDone(index));
      return;
    }
  }

  // A continued fifth mission reaches the grab phase without dialogue.
  if (index === 4 && S.missionIntroShown && S.missionPhase === 'reach') {
    if (dist(p.x, p.y, PLACES.harbourCash.x, PLACES.harbourCash.y) <= 140) {
      S.missionPhase = 'grab';
      S.toast = { text: 'Press E to grab the cash', until: S.time + 4 };
      setWaypoint();
    }
  }

  if (index === 1) {
    const driven = S.inCar ? S.cars[S.carIndex] : null;
    if (S.missionPhase === 'reach' && driven && driven.kind === 'getaway') {
      addWantedStars(2);
      S.missionPhase = 'drive';
      S.toast = { text: 'Two stars — lose them and get to the Hideout', until: S.time + 4 };
      setWaypoint();
    } else if (S.missionPhase === 'drive' && driven && driven.kind === 'getaway') {
      if (dist(p.x, p.y, PLACES.hideout.x, PLACES.hideout.y) <= 110) completeMission();
    }
  } else if (index === 2) {
    if (S.missionPackagesDone >= 3) completeMission();
  } else if (index === 3) {
    if (S.missionPhase === 'fight') {
      const rivals = S.enemies.filter((e) => e.kind === 'rival');
      if (rivals.length === 0) completeMission();
    }
  } else if (index === 4) {
    if (S.missionPhase === 'escape' && dist(p.x, p.y, PLACES.hideout.x, PLACES.hideout.y) <= 110) {
      completeMission();
    }
  } else if (index === 5) {
    if (S.missionPhase === 'fight' && S.boss === null) completeMission();
  } else if (index === 6) {
    if (S.missionPhase === 'fight' && S.boss === null) completeMission();
  }
  setWaypoint();
}
