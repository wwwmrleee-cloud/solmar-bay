// Solmar Bay — the heads-up display: the status panel, the
// objective panel, the minimap, the boss bar, the shop panel, the
// dialogue box and the toast messages.

import { S } from './world.js';
import { MISSIONS, PLACES, ROAD_V, ROAD_H, MINIMAP_W, MINIMAP_H, WORLD_W, WORLD_H, UPGRADE_COUNT } from './config.js';
import { shopItems, owned } from './shops.js';
import { wantedLevel } from './police.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

function healthColor(hp) {
  if (hp > 50) return '#2ecc71';
  if (hp > 25) return '#e67e22';
  return '#e74c3c';
}

function drawStatusPanel(ctx) {
  const p = S.player;
  const level = wantedLevel();
  panel(ctx, 12, 12, 250, 132);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Danny Vega', 24, 34);
  // Health bar.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(24, 44, 150, 14);
  ctx.fillStyle = healthColor(p.health);
  ctx.fillRect(24, 44, 150 * Math.max(0, Math.min(1, p.health / p.maxHealth)), 14);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText(`${Math.ceil(p.health)} / ${p.maxHealth}`, 182, 56);
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`$${S.money}`, 24, 80);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText(`Upgrades ${S.upgrades.length} of ${UPGRADE_COUNT}  •  Jobs ${S.stats.jobsCompleted}  •  Bosses ${S.bossesBeaten} of 2`, 24, 100);
  // Wanted stars.
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < level ? '#ffd700' : 'rgba(255,255,255,0.25)';
    ctx.font = '18px sans-serif';
    ctx.fillText('★', 24 + i * 22, 124);
  }
  // The game clock.
  const hh = Math.floor(S.clock / 60) % 24;
  const mm = Math.floor(S.clock % 60);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, 200, 124);
}

function drawObjectivePanel(ctx) {
  const w = S.viewW || 1280;
  const h = S.viewH || 800;
  const idx = Math.min(S.missionIndex, 6);
  const m = MISSIONS[idx];
  panel(ctx, 12, h - 96, 420, 84);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 15px sans-serif';
  const num = S.missionIndex >= MISSIONS.length ? `${MISSIONS.length} of ${MISSIONS.length}` : `${S.missionIndex + 1} of ${MISSIONS.length}`;
  ctx.fillText(`Mission ${num} — ${m.name}`, 24, h - 68);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText(m.brief, 24, h - 46);
  if (S.job) {
    ctx.fillStyle = '#7ec8e3';
    const secs = Math.max(0, Math.ceil(S.job.timeLeft));
    const what = S.job.type === 'taxi'
      ? (S.job.phase === 'pickup' ? 'Pick up the passenger' : `Drop off at ${S.job.destination.name}`)
      : S.job.type === 'delivery'
        ? (S.job.phase === 'pickup' ? `Pick up at ${S.job.pickup.name}` : `Deliver to ${S.job.destination.name}`)
        : `Take down the bounty target`;
    ctx.fillText(`${S.job.name}: ${what} — ${secs}s`, 24, h - 24);
  }
}

function drawDrivePanel(ctx) {
  const w = S.viewW || 1280;
  const h = S.viewH || 800;
  panel(ctx, w - 212, h - 76, 200, 64);
  ctx.textAlign = 'right';
  if (S.inCar) {
    const car = S.cars[S.carIndex];
    const speed = car ? Math.round(Math.abs(car.speed) * 0.55) : 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`${speed} km/h`, w - 24, h - 46);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#bbb';
    ctx.fillText(`Car health ${car ? Math.ceil(car.health) : 0}`, w - 24, h - 26);
  } else {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`Ammo ${S.player.ammo}`, w - 24, h - 46);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#bbb';
    ctx.fillText('On foot', w - 24, h - 26);
  }
}

function drawMinimap(ctx) {
  const w = S.viewW || 1280;
  const x0 = w - MINIMAP_W - 12;
  const y0 = 12;
  const sx = MINIMAP_W / WORLD_W;
  const sy = MINIMAP_H / WORLD_H;
  panel(ctx, x0 - 4, y0 - 4, MINIMAP_W + 8, MINIMAP_H + 8);
  ctx.fillStyle = '#5da24a';
  ctx.fillRect(x0, y0, MINIMAP_W, MINIMAP_H);
  ctx.fillStyle = '#e8d8a0';
  ctx.fillRect(x0 + 3320 * sx, y0, (3520 - 3320) * sx, MINIMAP_H);
  ctx.fillStyle = '#3f8fd0';
  ctx.fillRect(x0 + 3520 * sx, y0, (WORLD_W - 3520) * sx, MINIMAP_H);
  ctx.fillStyle = '#3f7d3a';
  ctx.fillRect(x0 + 1575 * sx, y0 + 675 * sy, 450 * sx, 450 * sy);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  for (const rx of ROAD_V) {
    ctx.beginPath();
    ctx.moveTo(x0 + rx * sx, y0);
    ctx.lineTo(x0 + rx * sx, y0 + MINIMAP_H);
    ctx.stroke();
  }
  for (const ry of ROAD_H) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + ry * sy);
    ctx.lineTo(x0 + MINIMAP_W, y0 + ry * sy);
    ctx.stroke();
  }
  // The waypoint, pulsing.
  const pulse = 3 + Math.sin(S.time * 5) * 1.5;
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(x0 + S.waypoint.x * sx, y0 + S.waypoint.y * sy, pulse + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x0 + S.waypoint.x * sx, y0 + S.waypoint.y * sy, pulse + 2, 0, Math.PI * 2);
  ctx.stroke();
  // Police as red and blue dots.
  ctx.fillStyle = '#ff2222';
  for (const car of S.police) {
    ctx.beginPath();
    ctx.arc(x0 + car.x * sx, y0 + car.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#2244ff';
  for (const off of S.officers) {
    ctx.beginPath();
    ctx.arc(x0 + off.x * sx, y0 + off.y * sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Danny as a green dot with a white ring.
  ctx.fillStyle = '#2ecc71';
  ctx.beginPath();
  ctx.arc(x0 + S.player.x * sx, y0 + S.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x0 + S.player.x * sx, y0 + S.player.y * sy, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLMAR BAY', x0 + MINIMAP_W / 2, y0 + MINIMAP_H + 14);
}

function drawBossBar(ctx) {
  const boss = S.boss;
  if (!boss) return;
  const w = S.viewW || 1280;
  const bw = 420;
  const bx = (w - bw) / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`${boss.name}  •  BOSS`, w / 2, 30);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bx, 38, bw, 14);
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(bx, 38, bw * Math.max(0, boss.health / boss.maxHealth), 14);
}

function drawShopPanel(ctx) {
  const shopId = S.shopOpen;
  if (!shopId) return;
  const w = S.viewW || 1280;
  const h = S.viewH || 800;
  const items = shopItems(shopId);
  const names = { garage: 'Rusty Anchor Garage', gunstore: 'Harbour Arms', clinic: 'Palm Clinic' };
  const keepers = { garage: 'Gus', gunstore: 'Lena', clinic: 'Dr. Ana' };
  const pw = 520;
  const ph = 90 + items.length * 44;
  const x0 = (w - pw) / 2;
  const y0 = (h - ph) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath();
  ctx.roundRect(x0, y0, pw, ph, 12);
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(names[shopId], x0 + 20, y0 + 34);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Keeper: ${keepers[shopId]}`, x0 + 20, y0 + 56);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`$${S.money}`, x0 + pw - 20, y0 + 34);
  items.forEach((item, i) => {
    const ry = y0 + 72 + i * 44;
    if (i === S.shopSel) {
      ctx.fillStyle = 'rgba(255,215,0,0.2)';
      ctx.fillRect(x0 + 10, ry - 22, pw - 20, 38);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    ctx.fillText(`${i + 1}. ${item.name}`, x0 + 20, ry);
    ctx.fillStyle = '#bbb';
    ctx.font = '13px sans-serif';
    ctx.fillText(item.effect, x0 + 20, ry + 16);
    ctx.textAlign = 'right';
    if (!item.repeatable && owned(item.id)) {
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('OWNED', x0 + pw - 20, ry);
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`$${item.price}`, x0 + pw - 20, ry);
    }
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#bbb';
  ctx.font = '13px sans-serif';
  ctx.fillText('Number keys buy  •  Arrows move  •  Enter buys  •  E leaves', w / 2, y0 + ph - 12);
}

function drawDialogue(ctx) {
  const d = S.dialogue;
  if (!d) return;
  const w = S.viewW || 1280;
  const h = S.viewH || 800;
  const bw = 720;
  const bh = 96;
  const x0 = (w - bw) / 2;
  const y0 = h - bh - 110;
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.beginPath();
  ctx.roundRect(x0, y0, bw, bh, 10);
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(d.speaker, x0 + 18, y0 + 26);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  wrapText(ctx, d.lines[d.index], x0 + 18, y0 + 52, bw - 120, 20);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#bbb';
  ctx.font = '13px sans-serif';
  ctx.fillText('E or click continues', x0 + bw - 14, y0 + bh - 12);
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

function drawToast(ctx) {
  const t = S.toast;
  if (!t || S.time > t.until) return;
  const w = S.viewW || 1280;
  ctx.textAlign = 'center';
  ctx.font = 'bold 17px sans-serif';
  const tw = ctx.measureText(t.text).width + 30;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.roundRect((w - tw) / 2, 64, tw, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(t.text, w / 2, 87);
}

function drawMute(ctx) {
  if (!S.muted) return;
  const w = S.viewW || 1280;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('MUTED (M)', w - 16, 196);
}

export function drawHUD(ctx) {
  if (S.screen !== 'play' && S.screen !== 'pause') return;
  drawStatusPanel(ctx);
  drawObjectivePanel(ctx);
  drawDrivePanel(ctx);
  drawMinimap(ctx);
  drawBossBar(ctx);
  drawShopPanel(ctx);
  drawDialogue(ctx);
  drawToast(ctx);
  drawMute(ctx);
}
