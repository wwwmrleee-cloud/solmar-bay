// Solmar Bay — game loop, screens, wiring. Entry point for game/index.html.
// The loop advances the world in fixed STEP slices, so play speed does not
// depend on the display's refresh rate.
import { STEP, SAVE_KEY } from './config.js';
import { createWorld, stepWorld, resetWorld } from './world.js';
import { createInput, attachInput, endFrame, isDown, wasPressed } from './input.js';
import { drawWorld, drawTitle, drawEndScreen, SCREEN_TITLE, SCREEN_PLAY } from './render.js';
import { drawHud } from './hud.js';
import { stageShot } from './shots.js';
import { createAudio, unlockAudio, setMuted, setSiren, updateEngine, sfx } from './audio.js';
import { saveGame, loadSave, hasSave, clearSave } from './save.js';
import { startStory, resumeStory, advanceDialogue } from './missions.js';
import { setShootHeld } from './combat.js';
import { buyUpgrade, shopItems } from './upgrades.js';
import { takeJob } from './jobs.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const state = createWorld(seed);
const input = createInput();
const audio = createAudio();
attachInput(input, canvas);

let viewW = 1280, viewH = 800;
function resize() {
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = viewW;
  canvas.height = viewH;
}
window.addEventListener('resize', resize);
resize();

// Shot mode: stage once, then render the frozen frame every frame.
let shotScreen = null;
if (shotName) {
  shotScreen = stageShot(shotName, state).screen;
  state.screen = shotScreen;
  state.started = true;
}

function newGame() {
  resetWorld(state);
  state.started = true;
  state.screen = 'play';
  clearSave();
  startStory(state, audio);
  saveGame(state);
}

function continueGame() {
  const save = loadSave();
  if (!save) { newGame(); return; }
  resetWorld(state);
  state.started = true;
  state.screen = 'play';
  state.missionIndex = save.missionIndex;
  state.player.money = save.money;
  state.player.x = save.x; state.player.y = save.y;
  state.player.hp = save.hp; state.player.ammo = save.ammo;
  state.wanted = save.wanted; state.wantedPts = save.wanted * 25;
  state.hiddenFound = save.hiddenFound || 0;
  // Restore exactly which hidden packages were found, so the count and
  // the map can never disagree after a Continue.
  if (Array.isArray(save.hiddenFoundList)) {
    for (const i of save.hiddenFoundList) {
      if (state.hiddenPackages[i]) state.hiddenPackages[i].found = true;
    }
    state.hiddenFound = save.hiddenFoundList.length;
  }
  state.packagesCollected = save.packagesCollected || 0;
  if (save.stats) state.stats = save.stats;
  if (save.clockMin) state.clockMin = save.clockMin;
  state.camera.x = save.x; state.camera.y = save.y;
  // Round-3 progress: upgrades, bosses, money earned (v1 saves migrate empty).
  state.upgrades = save.upgrades || [];
  state.bossesDown = save.bossesDown || 0;
  state.moneyEarned = save.moneyEarned || 0;
  if (save.stats) state.stats = save.stats;
  resumeStory(state);
  addToastSafe(`Welcome back, Danny. Mission ${state.missionIndex + 1}/7.`);
}

function addToastSafe(text) { state.toast = text; state.toastT = 4; }

function respawn() {
  // After Busted / Wasted: reload the last autosave if there is one.
  if (hasSave()) continueGame();
  else newGame();
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

// Test hooks: Playwright drives the game through these.
window.__game = {
  state, input, audio,
  newGame, continueGame, respawn,
  get screen() { return state.screen; },
  get fps() { return window.__fps || 0; },
};

let last = performance.now();
let fpsFrames = 0, fpsTime = 0;
window.__fps = 0;

function frame(now) {
  const dtMs = now - last;
  last = now;
  let dt = Math.min(dtMs / 1000, 1 / 20);
  if (dt <= 0) dt = STEP;

  // FPS meter.
  fpsFrames += 1; fpsTime += dtMs;
  if (fpsTime >= 1000) { window.__fps = Math.round((fpsFrames * 1000) / fpsTime); fpsFrames = 0; fpsTime = 0; }

  // Aim: mouse position in world space.
  input.aimX = state.camera.x + (input.mouseX - viewW / 2);
  input.aimY = state.camera.y + (input.mouseY - viewH / 2);
  setShootHeld(input.mouseDown || isDown(input, 'Space'));

  if (wasPressed(input, 'KeyM')) {
    setMuted(audio, !audio.muted);
    addToastSafe(audio.muted ? 'Sound muted (M to unmute)' : 'Sound on');
  }

  if (!shotName) {
    if (state.screen === 'title') {
      const clickStart = input.mousePressed;
      if (wasPressed(input, 'Enter') || clickStart) {
        unlockAudio(audio);
        if (wasPressed(input, 'KeyC')) newGame();
        else if (hasSave()) continueGame();
        else newGame();
      } else if (wasPressed(input, 'KeyC')) {
        unlockAudio(audio);
        newGame();
      }
    } else if (state.screen === 'play') {
      if (state.shop && !state.dialogue) {
        // Shop panel open: number keys buy, arrows move, E/Esc leaves.
        const items = shopItems(state.shop.shopId);
        let bought = null;
        for (let i = 0; i < items.length; i += 1) {
          if (wasPressed(input, `Digit${i + 1}`)) { bought = items[i].id; break; }
        }
        if (wasPressed(input, 'ArrowUp')) state.shop.sel = (state.shop.sel + items.length - 1) % items.length;
        if (wasPressed(input, 'ArrowDown')) state.shop.sel = (state.shop.sel + 1) % items.length;
        if (wasPressed(input, 'Enter') && items[state.shop.sel]) bought = items[state.shop.sel].id;
        if (bought) {
          const msg = buyUpgrade(state, bought);
          addToastSafe(msg);
          sfx.click(audio);
          saveGame(state);
        }
        if (wasPressed(input, 'KeyE') || wasPressed(input, 'Escape') || wasPressed(input, 'KeyP')) {
          state.shop = null;
          sfx.click(audio);
        }
      } else if (wasPressed(input, 'KeyP') || wasPressed(input, 'Escape')) {
        state.screen = 'pause';
        sfx.click(audio);
      } else if (state.dialogue && (wasPressed(input, 'KeyE') || input.mousePressed)) {
        advanceDialogue(state, audio);
      } else if (wasPressed(input, 'KeyJ')) {
        const msg = takeJob(state, audio);
        if (msg) addToastSafe(msg);
      } else {
        stepWorld(state, dt, input, audio);
      }
    } else if (state.screen === 'pause') {
      if (wasPressed(input, 'KeyP') || wasPressed(input, 'Escape') || wasPressed(input, 'Enter')) {
        state.screen = 'play';
        sfx.click(audio);
      }
    } else if (state.screen === 'busted' || state.screen === 'wasted' || state.screen === 'won') {
      if (wasPressed(input, 'Enter')) {
        unlockAudio(audio);
        respawn();
      }
    }
    // Keep the siren/engine in sync when screens change.
    if (state.screen !== 'play') { setSiren(audio, false); updateEngine(audio, 0, false); }
  }

  // --- render ---
  ctx.clearRect(0, 0, viewW, viewH);
  if (state.screen === 'title' || shotScreen === SCREEN_TITLE) {
    drawWorld(ctx, state, viewW, viewH);
    drawTitle(ctx, state, viewW, viewH, hasSave());
  } else {
    drawWorld(ctx, state, viewW, viewH);
    if (state.screen === 'play' || shotScreen === SCREEN_PLAY) {
      drawHud(ctx, state, viewW, viewH, audio.muted);
    } else if (state.screen === 'pause') {
      drawHud(ctx, state, viewW, viewH, audio.muted);
      drawEndScreen(ctx, state, viewW, viewH, 'pause');
    } else if (state.screen === 'busted') {
      drawEndScreen(ctx, state, viewW, viewH, 'busted');
    } else if (state.screen === 'wasted') {
      drawEndScreen(ctx, state, viewW, viewH, 'wasted');
    } else if (state.screen === 'won') {
      drawEndScreen(ctx, state, viewW, viewH, 'won');
    }
  }

  // Screen-reader status line.
  if (state.screen === 'play' && state.missionIndex < 7) {
    setStatus(`Mission ${state.missionIndex + 1} of 7. Money $${state.player.money}. Wanted ${state.wanted} stars.`);
  }

  endFrame(input);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
