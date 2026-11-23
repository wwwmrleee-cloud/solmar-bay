// Solmar Bay — the three shops and the eight upgrades. A
// shopkeeper stands at the shop's place; walking up and pressing E
// opens a two-line greeting, and a third press shows the panel.
// Number keys buy, arrows move, Enter buys the selected row.

import { S, dist } from './world.js';
import { SHOPS, UPGRADES, PLACES } from './config.js';
import { openDialogue } from './missions.js';
import { playClick, playBuy } from './audio.js';
import { writeSave } from './save.js';

// The live shop object the test hook reads: money and the owned
// upgrade ids, always current.
const SHOP_HOOK_INNER = {
  get money() { return S.money; },
  set money(v) { S.money = Math.max(0, Math.round(v)); },
  get upgrades() { return S.upgrades; },
  get open() { return S.shopOpen; },
  get selected() { return S.shopSel; },
  get items() { return S.shopOpen ? shopItems(S.shopOpen) : []; },
  get id() { return S.shopOpen; },
  get shopId() { return S.shopOpen; },
  get name() { return S.shopOpen ? SHOPS[S.shopOpen].name : null; },
  get keeper() { return S.shopOpen ? SHOPS[S.shopOpen].keeper : null; },
};
export const SHOP_HOOK = SHOP_HOOK_INNER;

export function shopItems(shopId) {
  // Each row carries a live `owned` flag as well as its price and
  // effect: a bought row reads as owned from the moment it is bought,
  // and an unbought one reads as not owned, without the list itself
  // ever going stale.
  const rows = SHOPS[shopId].items.map((id) => {
    const item = { ...UPGRADES[id] };
    Object.defineProperty(item, 'owned', {
      get() { return owned(id); },
      enumerable: true,
    });
    return item;
  });
  return rows;
}

export function owned(id) {
  return S.upgrades.includes(id);
}

export function maxHealth() {
  return 100 + (owned('tough') ? 25 : 0) + (owned('iron') ? 25 : 0);
}

export function ammoCap() {
  return owned('mags') ? 240 : 120;
}

export function pistolDamage() {
  return owned('heavy') ? 52 : 34;
}

export function fireInterval() {
  return owned('rapid') ? 0.13 : 0.22;
}

// Try to buy an upgrade. Refuses with a message when it is owned,
// when its prerequisite is missing, or when Danny cannot afford it.
export function buyItem(id) {
  const up = UPGRADES[id];
  if (!up) return false;
  if (!up.repeatable && owned(id)) {
    S.toast = { text: `${up.name} is already owned`, until: S.time + 3 };
    return false;
  }
  if (up.req && !owned(up.req)) {
    S.toast = { text: `${up.name} needs ${UPGRADES[up.req].name} first`, until: S.time + 3 };
    return false;
  }
  if (S.money < up.price) {
    S.toast = { text: `Not enough money for ${up.name}`, until: S.time + 3 };
    return false;
  }
  S.money -= up.price;
  if (id === 'tough' || id === 'iron') {
    if (!owned(id)) S.upgrades.push(id);
    S.player.maxHealth = maxHealth();
    S.player.health = Math.min(S.player.maxHealth, S.player.health + 25);
  } else if (id === 'mags') {
    S.upgrades.push(id);
    S.player.ammoCap = ammoCap();
  } else if (id === 'kit') {
    S.player.health = S.player.maxHealth;
    S.player.ammo = S.player.ammoCap;
  } else {
    if (!owned(id)) S.upgrades.push(id);
  }
  if (!up.repeatable) S.stats.upgradesBought++;
  S.toast = { text: `Bought ${up.name} ($${up.price})`, until: S.time + 3 };
  playBuy();
  writeSave();
  return true;
}

// Open a shop when Danny is near its keeper. Returns true when a
// shopkeeper was close enough to talk to.
export function nearestShopDist(x, y) {
  let best = Infinity;
  for (const shopId of Object.keys(SHOPS)) {
    const place = PLACES[SHOPS[shopId].place];
    const d = dist(x, y, place.x, place.y);
    if (d < best) best = d;
  }
  return best;
}

export function openShopAt(x, y) {
  for (const shopId of Object.keys(SHOPS)) {
    const shop = SHOPS[shopId];
    const place = PLACES[shop.place];
    if (dist(x, y, place.x, place.y) <= 80) {
      openDialogue(shop.keeper, [
        shop.greeting,
        `${shop.name} — press 1 to 3 to buy, E to leave.`,
      ], () => {
        S.shopOpen = shopId;
        S.shopSel = 0;
        playClick();
      });
      return true;
    }
  }
  return false;
}

export function closeShop() {
  S.shopOpen = null;
  playClick();
}

// The shop panel's keys: numbers buy, arrows move, Enter buys the
// selected row, E or Escape or P leaves.
export function updateShop(keys) {
  if (!S.shopOpen) return false;
  const items = shopItems(S.shopOpen);
  if (keys['Digit1'] || keys['Numpad1']) buyItem(items[0].id);
  if (keys['Digit2'] || keys['Numpad2']) buyItem(items[1].id);
  if ((keys['Digit3'] || keys['Numpad3']) && items[2]) buyItem(items[2].id);
  if (keys['ArrowUp']) S.shopSel = (S.shopSel + items.length - 1) % items.length;
  if (keys['ArrowDown']) S.shopSel = (S.shopSel + 1) % items.length;
  if (keys['Enter'] && items[S.shopSel]) buyItem(items[S.shopSel].id);
  return true;
}
