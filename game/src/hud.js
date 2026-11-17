// HUD: health, money, wanted stars, clock, mission objective, ammo, speed,
// minimap (roads, player, police, mission marker), dialogue box, toasts.
import { WORLD, MISSIONS } from './config.js';
import { PLACES } from './world.js';

function fmtClock(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function drawHud(ctx, state, viewW, viewH, muted) {
  const p = state.player;
  // Top-left panel: health, money, stars.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 12, 12, 250, 96, 10); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DANNY VEGA', 24, 34);
  // Health bar.
  ctx.fillStyle = '#333';
  roundRect(ctx, 24, 44, 150, 14, 5); ctx.fill();
  ctx.fillStyle = p.hp > 50 ? '#4caf50' : p.hp > 25 ? '#ff9800' : '#f44336';
  roundRect(ctx, 24, 44, 150 * Math.max(0, p.hp / 100), 14, 5); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.hp)}`, 180, 56);
  ctx.fillStyle = '#8be28b';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`$${p.money}`, 24, 82);
  // Wanted stars.
  ctx.font = '22px sans-serif';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < state.wanted ? '#ffd94d' : 'rgba(255,255,255,0.3)';
    ctx.fillText('★', 24 + i * 26, 104);
  }
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText(fmtClock(state.clockMin), 200, 104);

  // Mission objective (bottom-left).
  const m = MISSIONS[state.missionIndex];
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const objText = m ? `MISSION ${m.id}/5 — ${m.name}` : 'All missions complete!';
  const brief = m ? m.brief : 'Free roam Solmar Bay.';
  ctx.font = 'bold 15px sans-serif';
  const w1 = ctx.measureText(objText).width;
  ctx.font = '14px sans-serif';
  const w2 = ctx.measureText(brief).width;
  const bw = Math.max(w1, w2) + 28;
  roundRect(ctx, 12, viewH - 76, bw, 64, 10); ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(objText, 24, viewH - 52);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText(brief, 24, viewH - 30);

  // Ammo + speed (bottom-right).
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, viewW - 190, viewH - 76, 178, 64, 10); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'right';
  if (p.inCar !== null) {
    const car = state.cars[p.inCar];
    const kmh = car ? Math.round(Math.abs(car.speed) * 0.55) : 0;
    ctx.fillText(`${kmh} km/h`, viewW - 24, viewH - 52);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#ffb3a0';
    ctx.fillText(`Car HP ${Math.max(0, Math.round(car ? car.hp : 0))}`, viewW - 24, viewH - 30);
  } else {
    ctx.fillText(`Ammo ${p.ammo}`, viewW - 24, viewH - 52);
    ctx.font = '13px sans-serif';
    ctx.fillText('Click / Space to shoot', viewW - 24, viewH - 30);
  }
  ctx.textAlign = 'left';

  // Mute indicator.
  if (muted) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, viewW - 44, 12, 32, 32, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('🔇', viewW - 38, 34);
  }

  drawMinimap(ctx, state, viewW, viewH);

  // Toast message.
  if (state.toastT > 0 && state.toast) {
    ctx.font = 'bold 17px sans-serif';
    const tw = ctx.measureText(state.toast).width + 28;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, viewW / 2 - tw / 2, 16, tw, 36, 10); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast, viewW / 2, 40);
    ctx.textAlign = 'left';
  }

  // Dialogue box.
  if (state.dialogue) {
    const line = state.dialogue.lines[state.dialogue.idx];
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    roundRect(ctx, viewW / 2 - 360, viewH - 190, 720, 96, 12); ctx.fill();
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 2;
    roundRect(ctx, viewW / 2 - 360, viewH - 190, 720, 96, 12); ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(line.split(':')[0] + ':', viewW / 2 - 340, viewH - 158);
    ctx.fillStyle = '#fff';
    ctx.font = '17px sans-serif';
    wrapText(ctx, line.split(':').slice(1).join(':').trim(), viewW / 2 - 340, viewH - 132, 680, 22);
    ctx.fillStyle = '#bbb';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('E / click to continue ▸', viewW / 2 + 340, viewH - 104);
    ctx.textAlign = 'left';
  }
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}

export function drawMinimap(ctx, state, viewW, viewH) {
  const mw = 208, mh = 162;
  const mx = viewW - mw - 12, my = 12;
  const sx = mw / WORLD.width, sy = mh / WORLD.height;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, mx - 6, my - 6, mw + 12, mh + 12, 10); ctx.fill();
  // Base: grass + water + roads.
  ctx.fillStyle = '#5da24a';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#2f9fd8';
  ctx.fillRect(mx + 3520 * sx, my, (WORLD.width - 3520) * sx, mh);
  ctx.fillStyle = '#ecd9a0';
  ctx.fillRect(mx + 3320 * sx, my, 200 * sx, mh);
  ctx.fillStyle = '#3a3f4a';
  for (const x of [225, 675, 1125, 1575, 2025, 2475, 2925, 3375]) ctx.fillRect(mx + x * sx - 2, my, 4, mh);
  for (const y of [225, 675, 1125, 1575, 2025, 2475]) ctx.fillRect(mx, my + y * sy - 2, mw, 4);
  // Park + port.
  ctx.fillStyle = '#3f7a33';
  ctx.fillRect(mx + 1623 * sx, my + 723 * sy, 354 * sx, 354 * sy);
  const dot = (x, y, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(mx + x * sx, my + y * sy, r, 0, Math.PI * 2); ctx.fill();
  };
  // Mission marker (yellow, pulsing).
  if (state.waypoint) {
    const pulse = 3 + Math.sin(state.time * 5) * 1.5;
    dot(state.waypoint.x, state.waypoint.y, '#ffd94d', pulse);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mx + state.waypoint.x * sx, my + state.waypoint.y * sy, pulse + 2, 0, Math.PI * 2); ctx.stroke();
  }
  // Police (red/blue), player (white ring + green dot).
  for (const c of state.policeCars) dot(c.x, c.y, '#ff3b30', 3.5);
  for (const o of state.officers) dot(o.x, o.y, '#2f7bff', 3);
  const pp = state.player.inCar !== null && state.cars[state.player.inCar]
    ? state.cars[state.player.inCar] : state.player;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(mx + pp.x * sx, my + pp.y * sy, 6, 0, Math.PI * 2); ctx.stroke();
  dot(pp.x, pp.y, '#4caf50', 4);
  // Label.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('SOLMAR BAY', mx + 4, my + mh - 6);
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
