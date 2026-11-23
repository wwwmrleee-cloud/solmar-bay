// Solmar Bay — the game loop and the screen wiring. The loop runs
// the world in fixed sixtieths of a second, eats each frame's key
// presses exactly once, and draws the screen that is showing. The
// test hook the regression suite drives lives at the bottom.

import { S, resetWorld, dist } from './world.js';
import { STEP, MAX_FRAME_DT, SAVE_KEY, DEFAULT_SEED } from './config.js';
import {
  INPUT, initInput, keyHeld, keyPressed, deriveEdges, eatPresses,
  pressKey, downKey, upKey, clickAt, setPressHandler,
} from './input.js';
import { AUDIO, unlockAudio, setMuted, updateSiren } from './audio.js';
import { updatePlayer, exitCarToSide, interact } from './player.js';
import { updateVehicles } from './vehicles.js';
import { updatePedestrians } from './pedestrians.js';
import { updatePolice, wantedLevel } from './police.js';
import { updateCombat } from './combat.js';
import { startMission, updateMissions, advanceDialogue, dialogueOpen } from './missions.js';
import { updateShop, closeShop, SHOP_HOOK } from './shops.js';
import { takeJob, updateJobs } from './jobs.js';
import { drawWorld, drawTitle, drawPause, drawBusted, drawWasted, drawWon } from './render.js';
import { drawHUD } from './hud.js';
import { writeSave, readSaveRaw, applySave, restoreMissionPackages, hasSave } from './save.js';
import { setupShotScene, updateAutopilot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const srStatus = document.getElementById('sr-status');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  S.viewW = window.innerWidth;
  S.viewH = window.innerHeight;
}
window.addEventListener('resize', resize);

// ---------------------------------------------------------------- flow

export function newGame() {
  resetWorld(DEFAULT_SEED);
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage may be off */ }
  S.hasSaveFlag = false;
  startMission(0, false);
  S.screen = 'play';
  S.camera.x = S.player.x;
  S.camera.y = S.player.y;
}

export function continueGame() {
  const data = readSaveRaw();
  if (!data) { newGame(); return; }
  const missionIndex = typeof data.missionIndex === 'number' ? data.missionIndex : 0;
  resetWorld(DEFAULT_SEED);
  startMission(missionIndex, true);
  applySave(data);
  restoreMissionPackages();
  S.hasSaveFlag = true;
  S.screen = 'play';
  S.camera.x = S.player.x;
  S.camera.y = S.player.y;
  S.toast = { text: `Welcome back — mission ${Math.min(S.missionIndex + 1, 7)} of 7`, until: S.time + 4 };
}

export function respawn() {
  if (hasSave()) continueGame();
  else newGame();
}

// ---------------------------------------------------------------- step

function updateParticles(dt) {
  for (let i = S.particles.length - 1; i >= 0; i--) {
    const pt = S.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) S.particles.splice(i, 1);
  }
  if (S.skidmarks.length > 240) S.skidmarks.splice(0, S.skidmarks.length - 240);
}

function updateCamera(dt) {
  const p = S.player;
  const k = Math.min(1, 5 * dt);
  S.camera.x += (p.x - S.camera.x) * k;
  S.camera.y += (p.y - S.camera.y) * k;
  // A teleported player drags the camera with them at once.
  if (dist(S.camera.x, S.camera.y, p.x, p.y) > 900) {
    S.camera.x = p.x;
    S.camera.y = p.y;
  }
  if (S.camera.shakeTime > 0) {
    S.camera.shakeTime -= dt;
    if (S.camera.shakeTime <= 0) S.camera.shake = 0;
  }
}

// The world in one fixed slice. Dialogue and an open shop freeze it.
export function stepWorld(dt) {
  if (S.dialogue || S.shopOpen) return;
  if (S.screen !== 'play') return;
  updatePlayer(dt);
  updateVehicles(dt);
  updatePedestrians(dt);
  updatePolice(dt);
  if (S.screen !== 'play') return;
  updateCombat(dt);
  updateMissions(dt);
  updateJobs(dt);
  updateParticles(dt);
  S.clock = (S.clock + 30 * dt) % 1440;
  S.time += dt;
  updateCamera(dt);
  updateSiren(wantedLevel(), S.time);
  S.saveTimer += dt;
  if (S.saveTimer >= 10) {
    S.saveTimer = 0;
    writeSave();
  }
  if (S.player.health <= 0 && S.screen === 'play') {
    S.screen = 'wasted';
  }
}

// Ambient motion behind the title screen: traffic and pedestrians
// keep moving, nothing else runs.
function stepAmbient(dt) {
  updateVehicles(dt);
  updatePedestrians(dt);
  updateParticles(dt);
  S.clock = (S.clock + 30 * dt) % 1440;
  S.time += dt;
  updateCamera(dt);
}

// One frame's worth of input, exactly once. The world slices below
// never see a press twice.
function handleFrameInput() {
  if (S.dialogue) {
    if (keyPressed('KeyE') || INPUT.clicked) advanceDialogue();
    return true;
  }
  if (S.shopOpen) {
    updateShop(INPUT.pressed);
    if (keyPressed('KeyE') || keyPressed('Escape') || keyPressed('KeyP')) closeShop();
    return true;
  }
  return false;
}

function handlePlayInput() {
  if (keyPressed('KeyM')) {
    S.muted = !S.muted;
    setMuted(S.muted);
  }
  if (keyPressed('KeyP') || keyPressed('Escape')) {
    S.screen = 'pause';
    return;
  }
  if (keyPressed('KeyJ')) takeJob();
  if (S.inCar && keyPressed('KeyE')) {
    exitCarToSide();
    delete INPUT.pressed['KeyE'];
  }
}

// Run one press's input handling at once, instead of waiting for the
// next frame. A harness that presses a key and reads the state in the
// same evaluate then sees the effect immediately (a shop buy, a
// dialogue advance, a job taken) instead of the state from before the
// frame ran. The press is consumed here, and its edge is marked as
// already derived, so the frame loop never sees it twice.
function processPressNow(code) {
  if (S.screen === 'title') {
    if (code === 'Enter') {
      unlockAudio();
      if (hasSave()) continueGame();
      else newGame();
    } else if (code === 'KeyC') {
      unlockAudio();
      newGame();
    }
  } else if (S.screen === 'play') {
    // On foot, E interacts with the world (a car, a shop keeper, a
    // package). That runs in the player's update on the next frame;
    // do it now as well, or a same-evaluate read would see the shop
    // still closed and the player still on foot. A press that closed
    // a dialogue or a shop must not also interact again, so this only
    // runs when no dialogue or shop owned the press.
    const wasInCar = S.inCar;
    const frozen = handleFrameInput();
    if (!frozen) {
      handlePlayInput();
      if (code === 'KeyE' && !wasInCar && !S.dialogue && !S.shopOpen) interact();
    }
  } else if (S.screen === 'pause') {
    if (code === 'KeyP' || code === 'Escape') S.screen = 'play';
  } else if (S.screen === 'busted' || S.screen === 'wasted' || S.screen === 'won') {
    if (code === 'Enter') {
      unlockAudio();
      respawn();
    }
  }
  delete INPUT.pressed[code];
  INPUT._prevKeys[code] = true;
}
setPressHandler(processPressNow);

// ---------------------------------------------------------------- render

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0b1e3a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (S.screen === 'title') {
    drawTitle(ctx);
  } else if (S.screen === 'play') {
    drawWorld(ctx);
    drawHUD(ctx);
  } else if (S.screen === 'pause') {
    drawWorld(ctx);
    drawHUD(ctx);
    drawPause(ctx);
  } else if (S.screen === 'busted') {
    drawBusted(ctx);
  } else if (S.screen === 'wasted') {
    drawWasted(ctx);
  } else if (S.screen === 'won') {
    drawWon(ctx);
  } else if (S.screen === 'shot') {
    drawWorld(ctx);
    drawHUD(ctx);
  }
}

let srTimer = 0;
function updateSrStatus(dt) {
  srTimer += dt;
  if (srTimer < 0.5 || !srStatus) return;
  srTimer = 0;
  const m = Math.min(S.missionIndex + 1, 7);
  srStatus.textContent = `Mission ${m} of 7, $${S.money}, ${wantedLevel()} stars`;
}

// ---------------------------------------------------------------- loop

let last = performance.now();
let acc = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const rawDt = (now - last) / 1000;
  last = now;
  const dt = Math.min(rawDt, 0.1);
  if (dt > 0.001) S.fps = S.fps * 0.95 + (1 / dt) * 0.05;
  S.frameCount++;
  deriveEdges();

  if (S.screen === 'title') {
    if (keyPressed('Enter')) {
      unlockAudio();
      if (hasSave()) continueGame();
      else newGame();
    } else if (keyPressed('KeyC')) {
      unlockAudio();
      newGame();
    }
    stepAmbient(STEP);
  } else if (S.screen === 'play') {
    unlockAudio();
    // Whether a dialogue or shop owned this frame's input. A frame
    // that closes a dialogue must not also step the world: the E
    // press that closed it is still live until the frame is eaten,
    // and would otherwise immediately interact again.
    const frozen = handleFrameInput();
    if (!frozen) handlePlayInput();
    if (!frozen && S.screen === 'play' && !S.dialogue && !S.shopOpen) {
      acc += Math.min(dt, MAX_FRAME_DT);
      let guard = 0;
      while (acc >= STEP && guard < 5) {
        stepWorld(STEP);
        acc -= STEP;
        guard++;
        if (S.screen !== 'play') break;
      }
      if (guard >= 5) acc = 0;
    }
  } else if (S.screen === 'pause') {
    if (keyPressed('KeyP') || keyPressed('Escape')) S.screen = 'play';
  } else if (S.screen === 'busted' || S.screen === 'wasted' || S.screen === 'won') {
    if (keyPressed('Enter')) {
      unlockAudio();
      respawn();
    }
  }
  // A teleported player drags the camera with them at once.
  updateSrStatus(dt);
  render();
  eatPresses();
}

// ---------------------------------------------------------------- shot mode

function stageShot(name, seed) {
  const seconds = setupShotScene(name);
  const steps = Math.round(seconds / STEP);
  // Stage with the screen set to play so the world steps; the final
  // screen is chosen after the simulation has run.
  S.screen = 'play';
  for (let i = 0; i < steps; i++) {
    if (name === 'drive' || name === 'chase') updateAutopilot(STEP);
    stepWorld(STEP);
    if (S.screen !== 'play') break;
  }
  INPUT.keys = {};
  INPUT.pressed = {};
  if (name === 'start') {
    S.screen = 'title';
  } else {
    S.screen = 'shot';
  }
  S.camera.x = S.player.x;
  S.camera.y = S.player.y;
}

// ---------------------------------------------------------------- hook

const G = {
  state: S,
  input: INPUT,
  audio: AUDIO,
  get screen() { return S.screen; },
  get fps() { return S.fps; },
  get missions() { return S.stats.missionsCompleted; },
  get missionIndex() { return S.missionIndex; },
  set missionIndex(v) { S.missionIndex = v; },
  get missionList() { return S.missionList; },
  get money() { return S.money; },
  set money(v) { S.money = Math.max(0, Math.round(v)); },
  get health() { return S.player.health; },
  set health(v) { S.player.health = v; },
  get wanted() { return wantedLevel(); },
  set wanted(v) { S.wanted = v; },
  get bossesBeaten() { return S.bossesBeaten; },
  get jobsCompleted() { return S.stats.jobsCompleted; },
  get job() { return S.job; },
  get upgrades() { return S.upgrades; },
  get player() { return S.player; },
  get inCar() { return S.inCar; },
  get dialogue() { return S.dialogue; },
  get shopOpen() { return S.shopOpen; },
  // The current navigation target (story waypoint, job destination or
  // mission marker) as an object that also reads as an [x, y] pair,
  // so either spelling of the destination works.
  get waypoint() {
    const w = S.waypoint;
    if (!w) return null;
    const wp = { x: w.x, y: w.y, label: w.label };
    wp[0] = w.x; wp[1] = w.y;
    return wp;
  },
  get waypointXY() {
    const w = S.waypoint;
    if (!w) return null;
    const xy = [w.x, w.y];
    xy.x = w.x; xy.y = w.y; xy.label = w.label;
    return xy;
  },
  get destination() { return this.waypoint; },
  get destXY() { return this.waypointXY; },
  shop: SHOP_HOOK,
  newGame,
  continueGame,
  respawn,
  pressKey,
  downKey,
  upKey,
  clickAt,
};
window.G = G;
window.__game = G;

// ---------------------------------------------------------------- boot

function boot() {
  resize();
  initInput(canvas);
  const params = new URLSearchParams(window.location.search);
  const seed = parseInt(params.get('seed') || String(DEFAULT_SEED), 10) || DEFAULT_SEED;
  const shot = params.get('shot');
  resetWorld(seed);
  S.hasSaveFlag = hasSave();
  startMission(0, false);
  if (shot && ['start', 'drive', 'chase', 'mission', 'boss', 'shop'].includes(shot)) {
    stageShot(shot, seed);
  } else {
    S.screen = 'title';
  }
  S.camera.x = S.player.x;
  S.camera.y = S.player.y;
  requestAnimationFrame(frame);
}

boot();
