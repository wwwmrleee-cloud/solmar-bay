// Canvas drawing: camera, city, cars, people, effects, and all screens.
import { WORLD, ROAD_W, V_ROADS, H_ROADS, COLORS, MISSIONS } from './config.js';
import { PLACES, dist } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_WON = 'won';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawWorld(ctx, state, viewW, viewH) {
  const cam = state.camera;
  const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
  const ox = viewW / 2 - cam.x + shakeX;
  const oy = viewH / 2 - cam.y + shakeY;
  ctx.save();
  ctx.translate(ox, oy);

  const vx0 = cam.x - viewW / 2 - 60, vx1 = cam.x + viewW / 2 + 60;
  const vy0 = cam.y - viewH / 2 - 60, vy1 = cam.y + viewH / 2 + 60;

  // Ground: grass everywhere.
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  // Subtle grass checker for texture.
  ctx.fillStyle = COLORS.grassDark;
  const gs = 120;
  for (let gx = Math.floor(vx0 / gs) * gs; gx < vx1; gx += gs) {
    for (let gy = Math.floor(vy0 / gs) * gs; gy < vy1; gy += gs) {
      if (((gx + gy) / gs) % 2 === 0) ctx.fillRect(gx, gy, gs, gs);
    }
  }
  // Beach (east) + water.
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(3320, vy0, WORLD.width - 3320, vy1 - vy0);
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(3520, vy0, WORLD.width - 3520, vy1 - vy0);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let y = Math.floor(vy0 / 90) * 90; y < vy1; y += 90) {
    ctx.fillRect(3510, y + ((state.time * 20) % 90), 12, 4);
  }
  // Park.
  ctx.fillStyle = '#5da24a';
  ctx.fillRect(1623, 723, 354, 354);
  ctx.fillStyle = '#8fd0ff';
  ctx.beginPath(); ctx.arc(1800, 900, 46, 0, Math.PI * 2); ctx.fill();

  // Roads.
  ctx.fillStyle = COLORS.road;
  for (const x of V_ROADS) ctx.fillRect(x - ROAD_W / 2, 0, ROAD_W, WORLD.height);
  for (const y of H_ROADS) ctx.fillRect(0, y - ROAD_W / 2, WORLD.width, ROAD_W);
  // Sidewalks.
  ctx.fillStyle = COLORS.sidewalk;
  for (const x of V_ROADS) {
    ctx.fillRect(x - ROAD_W / 2 - 14, 0, 14, WORLD.height);
    ctx.fillRect(x + ROAD_W / 2, 0, 14, WORLD.height);
  }
  for (const y of H_ROADS) {
    ctx.fillRect(0, y - ROAD_W / 2 - 14, WORLD.width, 14);
    ctx.fillRect(0, y + ROAD_W / 2, WORLD.width, 14);
  }
  // Centre dashes.
  ctx.fillStyle = COLORS.roadLine;
  for (const x of V_ROADS) {
    for (let y = 40; y < WORLD.height; y += 80) ctx.fillRect(x - 3, y, 6, 34);
  }
  for (const y of H_ROADS) {
    for (let x = 40; x < WORLD.width; x += 80) ctx.fillRect(x, y - 3, 34, 6);
  }
  // Port (south-west docks).
  ctx.fillStyle = '#7a6a55';
  ctx.fillRect(60, 2475, 560, 120);
  ctx.fillStyle = '#5b7a8c';
  for (let i = 0; i < 3; i += 1) ctx.fillRect(120 + i * 170, 2500, 120, 70);

  // Skid marks.
  ctx.strokeStyle = 'rgba(30,30,30,0.35)';
  ctx.lineWidth = 4;
  for (const s of state.skids) {
    ctx.beginPath();
    ctx.moveTo(s.x - Math.cos(s.angle) * 14, s.y - Math.sin(s.angle) * 14);
    ctx.lineTo(s.x + Math.cos(s.angle) * 14, s.y + Math.sin(s.angle) * 14);
    ctx.stroke();
  }

  // Buildings with drop shadows and roof detail.
  for (const b of state.buildings) {
    if (b.x > vx1 || b.x + b.w < vx0 || b.y > vy1 || b.y + b.h < vy0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(b.x, b.y, b.w, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    const cols = Math.max(1, Math.floor(b.w / 46));
    const rows = Math.max(1, Math.floor(b.h / 46));
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        ctx.fillRect(b.x + 12 + c * 46, b.y + 14 + r * 46, 22, 16);
      }
    }
  }
  // Cafe + hideout markers on their buildings.
  drawPlaceLabel(ctx, PLACES.cafe.x, PLACES.cafe.y, '☕ SUNRISE CAFE', '#fff3c4');
  drawPlaceLabel(ctx, PLACES.hideout.x, PLACES.hideout.y, '🏠 HIDEOUT', '#d6ffd6');

  // Trees and palms.
  for (const t of state.trees) {
    if (t.x < vx0 || t.x > vx1 || t.y < vy0 || t.y > vy1) continue;
    ctx.fillStyle = '#2f7a33';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5cb85c';
    ctx.beginPath(); ctx.arc(t.x - 4, t.y - 4, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  for (const palm of state.palms) {
    if (palm.x < vx0 || palm.x > vx1 || palm.y < vy0 || palm.y > vy1) continue;
    ctx.strokeStyle = '#8a6b45'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(palm.x, palm.y + 14); ctx.lineTo(palm.x, palm.y - 10); ctx.stroke();
    ctx.fillStyle = COLORS.palm;
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.ellipse(palm.x + Math.cos(a) * 12, palm.y - 12 + Math.sin(a) * 8, 13, 5, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Mission packages + hidden packages (sparkle).
  const pulse = 0.6 + Math.sin(state.time * 5) * 0.4;
  for (const pkg of state.missionPackages) {
    if (pkg.taken) continue;
    drawMarker(ctx, pkg.x, pkg.y, '#ffd94d', pulse);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▣', pkg.x, pkg.y + 5);
  }
  for (const hp of state.hiddenPackages) {
    if (hp.found) continue;
    drawMarker(ctx, hp.x, hp.y, '#7fe7ff', pulse * 0.8);
  }
  if (state.missionIndex === 4 && state.missionState.phase === 'grab') {
    drawMarker(ctx, PLACES.harbour.x, PLACES.harbour.y, '#ffd94d', pulse);
  }

  // Waypoint beacon.
  if (state.waypoint && state.screen === 'play') {
    const w = state.waypoint;
    const bob = Math.sin(state.time * 4) * 6;
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(w.x, w.y + bob, 26 + pulse * 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(w.x, w.y - 34 + bob); ctx.lineTo(w.x - 10, w.y - 58 + bob); ctx.lineTo(w.x + 10, w.y - 58 + bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#332200';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▼', w.x, w.y - 40 + bob);
  }

  // Cars.
  for (const car of state.cars) drawCar(ctx, car, false);
  for (const car of state.policeCars) drawCar(ctx, car, true);
  // Pedestrians.
  for (const ped of state.peds) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(ped.x + 2, ped.y + 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath(); ctx.arc(ped.x, ped.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath(); ctx.arc(ped.x, ped.y - 2, 5, 0, Math.PI * 2); ctx.fill();
  }
  // Officers.
  for (const o of state.officers) {
    ctx.fillStyle = '#20242e';
    ctx.beginPath(); ctx.arc(o.x, o.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3d7bd9';
    ctx.beginPath(); ctx.arc(o.x, o.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('P', o.x, o.y + 3);
  }
  // Enemies (rival crew).
  for (const e of state.enemies) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + 3, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(e.x, e.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(e.x - 14, e.y - 24, 28, 5);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(e.x - 14, e.y - 24, 28 * Math.max(0, e.hp / 100), 5);
  }
  // Player on foot.
  const p = state.player;
  if (p.inCar === null) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(p.x + 3, p.y + 4, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#1f8a4c';
    rr(ctx, -13, -10, 26, 20, 7); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(8, -3, 14, 6); // pistol
    ctx.restore();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    // Aim line (short, subtle).
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 34, p.y + Math.sin(p.angle) * 34); ctx.stroke();
  }
  // Bullets.
  for (const b of state.bullets) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - Math.cos(b.angle) * 10, b.y - Math.sin(b.angle) * 10);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Particles.
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawMarker(ctx, x, y, color, pulse) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 16 + pulse * 5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
}

function drawPlaceLabel(ctx, x, y, text, bg) {
  ctx.font = 'bold 12px sans-serif';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = bg;
  rr(ctx, x - w / 2, y - 44, w, 20, 6); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 30);
}

function drawCar(ctx, car, isPolice) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(ctx, -20, -10, 46, 24, 6); ctx.fill();
  ctx.translate(-3, -3);
  ctx.fillStyle = car.color;
  rr(ctx, -22, -11, 44, 22, 7); ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  rr(ctx, -6, -9, 12, 18, 3); ctx.fill(); // windshield / roof glass
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(16, -11, 4, 22); // front bumper line
  if (isPolice) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-14, -11, 10, 4);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(2, -11, 5, 4);
    ctx.fillStyle = '#3d7bd9';
    ctx.fillRect(7, -11, 5, 4);
    // Flashing light bar.
    const on = Math.floor(performance.now() / 250) % 2 === 0;
    ctx.fillStyle = on ? '#ff3b30' : '#2f7bff';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (car.smoke) {
    ctx.restore();
    ctx.save();
    ctx.fillStyle = 'rgba(120,120,120,0.6)';
    ctx.beginPath(); ctx.arc(car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20, 8 + Math.random() * 6, 0, Math.PI * 2); ctx.fill();
  }
  // Damage smoke for wrecked player cars.
  if (car.hp !== undefined && car.hp < 40 && car.hp > 0) {
    ctx.restore();
    ctx.save();
    ctx.fillStyle = 'rgba(90,90,90,0.55)';
    ctx.beginPath(); ctx.arc(car.x, car.y - 6, 9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// --- screens (drawn in screen space, after the world) ---
export function drawTitle(ctx, state, viewW, viewH, hasSave) {
  ctx.fillStyle = '#0e2a4a';
  ctx.fillRect(0, 0, viewW, viewH);
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, '#1b6fb5');
  g.addColorStop(0.55, '#f2a541');
  g.addColorStop(1, '#e86a8a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);
  // Sun + palm silhouettes.
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath(); ctx.arc(viewW - 180, 130, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(20,60,40,0.85)';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌴', 90, viewH - 60);
  ctx.fillText('🌴', viewW - 110, viewH - 90);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 84px sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 18;
  ctx.fillText('SOLMAR BAY', viewW / 2, 210);
  ctx.shadowBlur = 0;
  ctx.font = '28px sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('An open-world crime game — drive, steal, outrun the law', viewW / 2, 262);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('Danny Vega is new in town. Mara Solis has work for him.', viewW / 2, 300);
  ctx.fillText('Five missions. One harbour heist. Don\'t get caught.', viewW / 2, 330);

  const btnW = 320, btnH = 56;
  const bx = viewW / 2 - btnW / 2;
  ctx.fillStyle = '#1f8a4c';
  rr(ctx, bx, 400, btnW, btnH, 10); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(hasSave ? '▶  CONTINUE' : '▶  NEW GAME', viewW / 2, 436);
  if (hasSave) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '18px sans-serif';
    ctx.fillText('Press C for a fresh start instead', viewW / 2, 486);
  }
  ctx.font = '17px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  const lines = [
    'WASD move / drive  •  Mouse aim  •  Click / Space shoot',
    'E steal or enter a car / interact  •  P pause  •  M mute',
    'Steal cars, raise your wanted level, dodge the police,',
    'and run all 5 story missions for Mara Solis.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, viewW / 2, 560 + i * 28));
  ctx.font = '15px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Plays offline in your browser. Progress saves automatically.', viewW / 2, viewH - 28);
}

export function drawEndScreen(ctx, state, viewW, viewH, kind) {
  ctx.fillStyle = 'rgba(10,10,20,0.82)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  const titles = {
    busted: ['BUSTED', 'The Solmar Bay police took you in.'],
    wasted: ['WASTED', 'Danny Vega went down in Solmar Bay.'],
    won: ['HEIST COMPLETE!', 'Danny Vega pulled off the harbour heist. Mara Solis is impressed.'],
    pause: ['PAUSED', 'Take a breath, Danny.'],
  };
  const [title, sub] = titles[kind] || titles.pause;
  ctx.fillStyle = kind === 'won' ? '#ffd94d' : kind === 'pause' ? '#fff' : '#ff5a4d';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(title, viewW / 2, viewH / 2 - 70);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  ctx.fillText(sub, viewW / 2, viewH / 2 - 24);
  ctx.font = '20px sans-serif';
  ctx.fillText(`Money: $${state.player.money}   •   Missions done: ${state.stats.missionsDone}/5   •   Cars stolen: ${state.stats.carsStolen}`, viewW / 2, viewH / 2 + 20);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(kind === 'pause' ? 'Press P to resume' : 'Press Enter to play again', viewW / 2, viewH / 2 + 72);
}
