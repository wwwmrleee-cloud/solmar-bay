// Solmar Bay — canvas drawing: the city, everything in it, and the
// full screens. Only the visible part of the world is drawn, so the
// frame rate holds up in a headless browser.

import { S, dist } from './world.js';
import {
  WORLD_W, WORLD_H, ROAD_V, ROAD_H, ROAD_WIDTH, SIDEWALK, PLACES,
  MINIMAP_W, MINIMAP_H,
} from './config.js';
import { missionRank } from './missions.js';

function visibleRect() {
  const w = S.viewW || 1280;
  const h = S.viewH || 800;
  return {
    x0: S.camera.x - w / 2 - 80,
    y0: S.camera.y - h / 2 - 80,
    x1: S.camera.x + w / 2 + 80,
    y1: S.camera.y + h / 2 + 80,
  };
}

function inView(r, x, y, pad) {
  return x >= r.x0 - pad && x <= r.x1 + pad && y >= r.y0 - pad && y <= r.y1 + pad;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGrass(ctx, r) {
  ctx.fillStyle = '#5da24a';
  ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
  ctx.fillStyle = '#559347';
  const step = 120;
  const x0 = Math.max(0, Math.floor(r.x0 / step) * step);
  const y0 = Math.max(0, Math.floor(r.y0 / step) * step);
  for (let x = x0; x < r.x1 && x < WORLD_W; x += step) {
    for (let y = y0; y < r.y1 && y < WORLD_H; y += step) {
      if (((x / step) + (y / step)) % 2 === 0) ctx.fillRect(x, y, step, step);
    }
  }
}

function drawBeach(ctx, r) {
  if (r.x1 < 3320) return;
  ctx.fillStyle = '#e8d8a0';
  ctx.fillRect(3320, Math.max(0, r.y0), 200, Math.min(WORLD_H, r.y1) - Math.max(0, r.y0));
  ctx.fillStyle = '#3f8fd0';
  ctx.fillRect(3520, Math.max(0, r.y0), WORLD_W - 3520, Math.min(WORLD_H, r.y1) - Math.max(0, r.y0));
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  const drift = (S.time * 12) % 26;
  for (let y = Math.max(0, Math.floor(r.y0 / 26) * 26); y < Math.min(WORLD_H, r.y1); y += 26) {
    ctx.beginPath();
    ctx.moveTo(3525, y + drift);
    ctx.quadraticCurveTo(3545, y + drift - 6, 3565, y + drift);
    ctx.stroke();
  }
}

function drawPark(ctx, r) {
  if (r.x1 < 1575 || r.x0 > 2025 || r.y1 < 675 || r.y0 > 1125) return;
  ctx.fillStyle = '#3f7d3a';
  ctx.fillRect(1575, 675, 450, 450);
  ctx.fillStyle = '#4a90c2';
  ctx.beginPath();
  ctx.arc(1800, 900, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7ec8e3';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawRoads(ctx, r) {
  ctx.fillStyle = '#3a3a3a';
  for (const rx of ROAD_V) {
    if (rx + ROAD_WIDTH / 2 < r.x0 || rx - ROAD_WIDTH / 2 > r.x1) continue;
    ctx.fillRect(rx - ROAD_WIDTH / 2, Math.max(0, r.y0), ROAD_WIDTH, Math.min(WORLD_H, r.y1) - Math.max(0, r.y0));
  }
  for (const ry of ROAD_H) {
    if (ry + ROAD_WIDTH / 2 < r.y0 || ry - ROAD_WIDTH / 2 > r.y1) continue;
    ctx.fillRect(Math.max(0, r.x0), ry - ROAD_WIDTH / 2, Math.min(WORLD_W, r.x1) - Math.max(0, r.x0), ROAD_WIDTH);
  }
  ctx.fillStyle = '#8a8a7a';
  for (const rx of ROAD_V) {
    if (rx + ROAD_WIDTH / 2 < r.x0 || rx - ROAD_WIDTH / 2 > r.x1) continue;
    ctx.fillRect(rx - ROAD_WIDTH / 2 - SIDEWALK, Math.max(0, r.y0), SIDEWALK, Math.min(WORLD_H, r.y1) - Math.max(0, r.y0));
    ctx.fillRect(rx + ROAD_WIDTH / 2, Math.max(0, r.y0), SIDEWALK, Math.min(WORLD_H, r.y1) - Math.max(0, r.y0));
  }
  for (const ry of ROAD_H) {
    if (ry + ROAD_WIDTH / 2 < r.y0 || ry - ROAD_WIDTH / 2 > r.y1) continue;
    ctx.fillRect(Math.max(0, r.x0), ry - ROAD_WIDTH / 2 - SIDEWALK, Math.min(WORLD_W, r.x1) - Math.max(0, r.x0), SIDEWALK);
    ctx.fillRect(Math.max(0, r.x0), ry + ROAD_WIDTH / 2, Math.min(WORLD_W, r.x1) - Math.max(0, r.x0), SIDEWALK);
  }
  // Dashed yellow centre lines.
  ctx.fillStyle = '#e8c832';
  for (const rx of ROAD_V) {
    if (rx < r.x0 || rx > r.x1) continue;
    for (let y = Math.max(0, Math.floor(r.y0 / 40) * 40); y < Math.min(WORLD_H, r.y1); y += 40) {
      ctx.fillRect(rx - 2, y, 4, 20);
    }
  }
  for (const ry of ROAD_H) {
    if (ry < r.y0 || ry > r.y1) continue;
    for (let x = Math.max(0, Math.floor(r.x0 / 40) * 40); x < Math.min(WORLD_W, r.x1); x += 40) {
      ctx.fillRect(x, ry - 2, 20, 4);
    }
  }
}

function drawPort(ctx, r) {
  if (r.x1 < 60 || r.x0 > 620 || r.y1 < 2475 || r.y0 > 2595) return;
  ctx.fillStyle = '#8a6b4a';
  ctx.fillRect(60, 2475, 560, 120);
  for (const c of S.containers) {
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(c.x, c.y, c.w, c.h);
  }
}

function drawBuildings(ctx, r) {
  for (const b of S.buildings) {
    if (b.x + b.w < r.x0 || b.x > r.x1 || b.y + b.h < r.y0 || b.y > r.y1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(b.x, b.y, b.w, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    const cols = Math.max(2, Math.floor(b.w / 28));
    const rows = Math.max(1, Math.min(b.storeys, Math.floor(b.h / 30)));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        ctx.fillRect(b.x + 10 + i * ((b.w - 20) / cols), b.y + 16 + j * ((b.h - 24) / rows), 12, 14);
      }
    }
  }
}

function drawLabels(ctx, r) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px sans-serif';
  for (const key of Object.keys(PLACES)) {
    const p = PLACES[key];
    if (!p.label || !inView(r, p.x, p.y, 60)) continue;
    const w = ctx.measureText(p.name).width + 18;
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    roundRect(ctx, p.x - w / 2, p.y - 52, w, 22, 8);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillText(p.name, p.x, p.y - 37);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 58, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTrees(ctx, r) {
  for (const t of S.trees) {
    if (!inView(r, t.x, t.y, 20)) continue;
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const t of S.palms) {
    if (!inView(r, t.x, t.y, 20)) continue;
    ctx.strokeStyle = '#8a6b4a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y + 10);
    ctx.lineTo(t.x, t.y - 8);
    ctx.stroke();
    ctx.fillStyle = '#2e9e4f';
    ctx.beginPath();
    ctx.arc(t.x, t.y - 12, 11, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMarkers(ctx, r) {
  const pulse = 1 + Math.sin(S.time * 4) * 0.15;
  for (const pack of S.packages) {
    if (pack.found || !inView(r, pack.x, pack.y, 20)) continue;
    ctx.fillStyle = '#22d3ee';
    ctx.save();
    ctx.translate(pack.x, pack.y);
    ctx.rotate(Math.PI / 4);
    const s = 9 * pulse;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
  for (const p of S.missionPackages) {
    if (p.collected || !inView(r, p.x, p.y, 20)) continue;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', p.x, p.y + 4);
  }
  // The waypoint beacon: a pulsing ring and a bobbing arrow. When
  // the waypoint is off screen, the same marker is pinned to the
  // edge of the view in the waypoint's direction, so Danny always
  // knows which way to drive.
  const w = S.waypoint;
  let wx = w.x;
  let wy = w.y;
  const offScreen = !inView(r, w.x, w.y, 40);
  if (offScreen) {
    wx = Math.max(r.x0 + 30, Math.min(r.x1 - 30, w.x));
    wy = Math.max(r.y0 + 30, Math.min(r.y1 - 30, w.y));
  }
  {
    const pr = 16 + Math.sin(S.time * 5) * 4;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(wx, wy, pr, 0, Math.PI * 2);
    ctx.stroke();
    const bob = Math.sin(S.time * 4) * 5;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(wx, wy - 34 + bob);
    ctx.lineTo(wx - 8, wy - 48 + bob);
    ctx.lineTo(wx + 8, wy - 48 + bob);
    ctx.closePath();
    ctx.fill();
    if (offScreen && w.label) {
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(w.label, wx, wy + 34);
    }
  }
}

function drawCar(ctx, car, r) {
  if (!inView(r, car.x, car.y, 40)) return;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = car.color;
  roundRect(ctx, -22, -11, 44, 22, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(-8, -9, 14, 18);
  ctx.fillStyle = '#222';
  ctx.fillRect(18, -11, 4, 22);
  if (car.kind === 'police') {
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(-6, -11, 12, 22);
    const flash = Math.floor(S.time * 4) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2222' : '#2244ff';
    ctx.fillRect(-2, -11, 8, 6);
    ctx.fillStyle = flash ? '#2244ff' : '#ff2222';
    ctx.fillRect(-2, 5, 8, 6);
  }
  ctx.restore();
  if (car.health < 40 && !car.wrecked) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(car.x, car.y - 8, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPerson(ctx, x, y, color, r) {
  if (!inView(r, x, y, 20)) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.arc(x, y - 3, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemies(ctx, r) {
  for (const e of S.enemies) {
    if (!inView(r, e.x, e.y, 40)) continue;
    const big = e.boss ? 16 : 11;
    ctx.fillStyle = e.boss ? '#8b0000' : '#c0392b';
    ctx.beginPath();
    ctx.arc(e.x, e.y, big, 0, Math.PI * 2);
    ctx.fill();
    if (e.boss) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, big + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.name, e.x, e.y - big - 14);
    }
    // Health bar.
    const w = e.boss ? 44 : 28;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(e.x - w / 2, e.y - big - 9, w, 5);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(e.x - w / 2, e.y - big - 9, w * Math.max(0, e.health / e.maxHealth), 5);
    if (e.bounty) {
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, big + 7 + Math.sin(S.time * 5) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BOUNTY', e.x, e.y + big + 20);
    }
  }
}

function drawPlayer(ctx, r) {
  const p = S.player;
  if (S.inCar) return;
  if (!inView(r, p.x, p.y, 30)) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  // A short aim line.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(34, 0);
  ctx.stroke();
  ctx.fillStyle = '#27ae60';
  roundRect(ctx, -12, -9, 24, 18, 7);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(8, -2, 14, 4);
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.arc(2, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (p.invuln > 0 && Math.floor(S.time * 12) % 2 === 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawShopkeepers(ctx, r) {
  const keepers = [
    { x: 1575, y: 675, name: 'Gus', color: '#e67e22' },
    { x: 2475, y: 1125, name: 'Lena', color: '#9b59b6' },
    { x: 1125, y: 2025, name: 'Dr. Ana', color: '#16a085' },
  ];
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px sans-serif';
  for (const k of keepers) {
    if (!inView(r, k.x, k.y, 30)) continue;
    ctx.fillStyle = k.color;
    ctx.beginPath();
    ctx.arc(k.x, k.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath();
    ctx.arc(k.x, k.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(k.name, k.x, k.y + 24);
  }
}

function drawBullets(ctx, r) {
  ctx.strokeStyle = '#ffe14d';
  ctx.lineWidth = 3;
  for (const b of S.bullets) {
    if (!inView(r, b.x, b.y, 20)) continue;
    const len = Math.hypot(b.vx, b.vy) * 0.02;
    const ux = b.vx / Math.hypot(b.vx, b.vy);
    const uy = b.vy / Math.hypot(b.vx, b.vy);
    ctx.beginPath();
    ctx.moveTo(b.x - ux * len, b.y - uy * len);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ff9d5c';
  for (const b of S.enemyBullets) {
    if (!inView(r, b.x, b.y, 20)) continue;
    const len = Math.hypot(b.vx, b.vy) * 0.02;
    const ux = b.vx / Math.hypot(b.vx, b.vy);
    const uy = b.vy / Math.hypot(b.vx, b.vy);
    ctx.beginPath();
    ctx.moveTo(b.x - ux * len, b.y - uy * len);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawParticles(ctx, r) {
  for (const pt of S.particles) {
    if (!inView(r, pt.x, pt.y, 10)) continue;
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawWorld(ctx) {
  const w = S.viewW || 1280;
  const h = S.viewH || 800;
  const r = visibleRect();
  const shakeX = S.camera.shake > 0 ? (S.rng() - 0.5) * S.camera.shake : 0;
  const shakeY = S.camera.shake > 0 ? (S.rng() - 0.5) * S.camera.shake : 0;
  ctx.save();
  ctx.translate(w / 2 - S.camera.x + shakeX, h / 2 - S.camera.y + shakeY);
  drawGrass(ctx, r);
  drawBeach(ctx, r);
  drawPark(ctx, r);
  drawRoads(ctx, r);
  drawPort(ctx, r);
  for (const s of S.skidmarks) {
    ctx.strokeStyle = 'rgba(20,20,20,0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  drawBuildings(ctx, r);
  drawLabels(ctx, r);
  drawTrees(ctx, r);
  drawMarkers(ctx, r);
  for (const car of S.cars) if (car) drawCar(ctx, car, r);
  for (const car of S.police) drawCar(ctx, car, r);
  for (const ped of S.pedestrians) drawPerson(ctx, ped.x, ped.y, ped.color, r);
  for (const off of S.officers) drawPerson(ctx, off.x, off.y, '#2244cc', r);
  drawEnemies(ctx, r);
  drawShopkeepers(ctx, r);
  drawPlayer(ctx, r);
  drawBullets(ctx, r);
  drawParticles(ctx, r);
  ctx.restore();
}

// ---------------------------------------------------------------- screens

function dim(ctx, alpha) {
  const w = S.viewW || 1280;
  const h = S.viewH || 800;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, w, h);
}

function statsLines() {
  return [
    `Money: $${S.money}`,
    `Missions: ${S.stats.missionsCompleted} of 7`,
    `Cars stolen: ${S.stats.carsStolen}`,
    `Bosses beaten: ${S.bossesBeaten} of 2`,
    `Side jobs: ${S.stats.jobsCompleted}`,
    `Upgrades: ${S.upgrades.length} of 8`,
  ];
}

function drawStats(ctx, y) {
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  for (const line of statsLines()) {
    ctx.fillText(line, (S.viewW || 1280) / 2, y);
    y += 28;
  }
  return y;
}

export function drawTitle(ctx) {
  const w = S.viewW || 1280;
  const h = S.viewH || 800;
  drawWorld(ctx);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(30,80,180,0.82)');
  grad.addColorStop(0.55, 'rgba(230,120,60,0.82)');
  grad.addColorStop(1, 'rgba(220,90,140,0.82)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // A pale sun in the upper right.
  ctx.fillStyle = 'rgba(255,240,200,0.9)';
  ctx.beginPath();
  ctx.arc(w - 180, 110, 52, 0, Math.PI * 2);
  ctx.fill();
  // Palm silhouettes in the corners.
  ctx.fillStyle = 'rgba(20,40,20,0.55)';
  for (const cx of [70, w - 70]) {
    ctx.beginPath();
    ctx.arc(cx, h - 60, 46, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 12;
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText('SOLMAR BAY', w / 2, 150);
  ctx.shadowBlur = 0;
  ctx.font = '20px sans-serif';
  ctx.fillText('An open-world crime game — drive, steal, and outrun the law', w / 2, 190);
  ctx.font = '17px sans-serif';
  ctx.fillText('Danny Vega is new in town. Mara Solis has work for him.', w / 2, 226);
  ctx.fillText('Seven missions, two bosses and three shops. Do not get caught.', w / 2, 252);
  // The button.
  const hasSave = S.hasSaveFlag;
  ctx.fillStyle = '#27ae60';
  roundRect(ctx, w / 2 - 130, 285, 260, 52, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(hasSave ? 'CONTINUE' : 'NEW GAME', w / 2, 320);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#ffe9b0';
  ctx.fillText('Press C to start fresh instead', w / 2, 362);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText('WASD or arrows to move and drive  •  Mouse to aim, click or Space to shoot', w / 2, 400);
  ctx.fillText('E to enter a car or talk  •  J for a side job  •  P to pause  •  M to mute', w / 2, 424);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = '14px sans-serif';
  ctx.fillText('Plays offline in the browser. Progress saves automatically.', w / 2, 462);
}

export function drawPause(ctx) {
  drawWorld(ctx);
  dim(ctx, 0.6);
  const w = S.viewW || 1280;
  const h = S.viewH || 800;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('PAUSED', w / 2, h / 2 - 20);
  ctx.font = '19px sans-serif';
  ctx.fillText('Take a breath.', w / 2, h / 2 + 22);
  ctx.fillText('Press P to resume', w / 2, h / 2 + 52);
}

export function drawBusted(ctx) {
  drawWorld(ctx);
  dim(ctx, 0.65);
  const w = S.viewW || 1280;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('BUSTED', w / 2, 200);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('The Solmar Bay police took Danny in.', w / 2, 244);
  let y = drawStats(ctx, 300);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#ffe9b0';
  ctx.fillText('Press Enter to play again', w / 2, y + 30);
}

export function drawWasted(ctx) {
  drawWorld(ctx);
  dim(ctx, 0.65);
  const w = S.viewW || 1280;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('WASTED', w / 2, 200);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('Danny went down in Solmar Bay.', w / 2, 244);
  let y = drawStats(ctx, 300);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#ffe9b0';
  ctx.fillText('Press Enter to play again', w / 2, y + 30);
}

export function drawWon(ctx) {
  drawWorld(ctx);
  dim(ctx, 0.55);
  const w = S.viewW || 1280;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('HEIST COMPLETE', w / 2, 170);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('Danny pulled off the harbour heist, and Mara Solis is impressed.', w / 2, 212);
  let y = drawStats(ctx, 268);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(`RANK ${missionRank()}`, w / 2, y + 46);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = '17px sans-serif';
  ctx.fillText('Press Enter to play again', w / 2, y + 92);
}

export { MINIMAP_W, MINIMAP_H };
