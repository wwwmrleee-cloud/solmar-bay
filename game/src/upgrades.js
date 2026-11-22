// Shops and upgrades: the thing story money is for.
// Three shops (garage, gun store, clinic), each with a named shopkeeper.
// Eight purchasable entries in three tiers: two max-HP steps, pistol damage,
// pistol fire rate, ammo capacity, car top speed, car armour, and a repeatable
// field kit (full heal + full ammo). Every upgrade is a real stat change that
// the combat, driving and HUD code reads through the helpers below, and the
// list of owned upgrade ids is saved with the game.
export const UPGRADES = [
  { id: 'hp1', name: 'Tough Skin', tier: 1, price: 300, desc: 'Max HP +25' },
  { id: 'ammo', name: 'Extended Mags', tier: 1, price: 250, desc: 'Ammo capacity 120 -> 240' },
  { id: 'kit', name: 'Field Kit', tier: 1, price: 200, desc: 'Full heal + full ammo (buy again anytime)', repeatable: true },
  { id: 'dmg', name: 'Heavy Rounds', tier: 2, price: 400, desc: 'Pistol damage 34 -> 52' },
  { id: 'rate', name: 'Rapid Trigger', tier: 2, price: 450, desc: 'Fire rate 0.22s -> 0.13s' },
  { id: 'speed', name: 'Tuned Engine', tier: 2, price: 600, desc: 'Car top speed +90' },
  { id: 'hp2', name: 'Iron Will', tier: 3, price: 500, desc: 'Max HP +25 more', requires: 'hp1' },
  { id: 'armor', name: 'Armoured Body', tier: 3, price: 550, desc: 'Car takes 40% less damage', requires: 'speed' },
];

export const SHOPS = [
  { id: 'garage', name: 'RUSTY ANCHOR GARAGE', keeper: 'Gus', line: 'Gus: Your car is your life out here. I can make it faster — or tougher.', items: ['speed', 'armor'] },
  { id: 'gunstore', name: 'HARBOUR ARMS', keeper: 'Lena', line: 'Lena: You want to survive a shootout, you buy the good rounds. No refunds.', items: ['dmg', 'rate', 'ammo'] },
  { id: 'clinic', name: 'PALM CLINIC', keeper: 'Dr. Ana', line: 'Dr. Ana: I patch up drivers who pay cash. No questions, no paperwork.', items: ['hp1', 'hp2', 'kit'] },
];

export function owns(state, id) {
  return (state.upgrades || []).includes(id);
}

export function ownedCount(state) {
  return (state.upgrades || []).length;
}

export function maxHp(state) {
  let hp = 100;
  if (owns(state, 'hp1')) hp += 25;
  if (owns(state, 'hp2')) hp += 25;
  return hp;
}

export function pistolDamage(state) {
  return owns(state, 'dmg') ? 52 : 34;
}

export function fireInterval(state) {
  return owns(state, 'rate') ? 0.13 : 0.22;
}

export function ammoCap(state) {
  return owns(state, 'ammo') ? 240 : 120;
}

export function carTopSpeed(state) {
  return owns(state, 'speed') ? 520 : 430;
}

export function carDamageFactor(state) {
  return owns(state, 'armor') ? 0.6 : 1;
}

export function canBuy(state, item) {
  if (!item) return { ok: false, why: 'No such item.' };
  if (!item.repeatable && owns(state, item.id)) return { ok: false, why: 'Already owned.' };
  if (item.requires && !owns(state, item.requires)) return { ok: false, why: `Needs ${item.name === 'Iron Will' ? 'Tough Skin' : 'Tuned Engine'} first.` };
  if (state.player.money < item.price) return { ok: false, why: 'Not enough money.' };
  return { ok: true, why: '' };
}

// Buy an upgrade by id. Returns a message for the toast, or null.
export function buyUpgrade(state, id) {
  const item = UPGRADES.find((u) => u.id === id);
  const check = canBuy(state, item);
  if (!check.ok) return check.why;
  state.player.money -= item.price;
  if (!state.upgrades) state.upgrades = [];
  if (!item.repeatable) state.upgrades.push(id);
  if (id === 'kit') {
    state.player.hp = maxHp(state);
    state.player.ammo = ammoCap(state);
  } else if (id === 'hp1' || id === 'hp2') {
    state.player.hp = Math.min(maxHp(state), state.player.hp + 25);
  }
  state.stats.upgradesBought = (state.stats.upgradesBought || 0) + 1;
  return `Bought ${item.name} — ${item.desc}`;
}

export function shopFor(state, shopId) {
  return SHOPS.find((s) => s.id === shopId) || null;
}

export function shopItems(shopId) {
  const shop = SHOPS.find((s) => s.id === shopId);
  if (!shop) return [];
  return shop.items.map((id) => UPGRADES.find((u) => u.id === id)).filter(Boolean);
}
