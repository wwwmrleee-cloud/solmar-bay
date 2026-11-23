// Seeded random numbers for Solmar Bay. One seed always gives one
// city, so the world and the staged scenes are reproducible. A small
// mulberry-style generator plus a few helpers is all the game needs.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A random number between min and max.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// A whole number between min and max, both ends included.
export function intRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// One element of an array, picked at random.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// A seeded in-place shuffle. Returns the same array it was given.
export function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

// True with the given probability, from 0 to 1.
export function chance(rng, p) {
  return rng() < p;
}

// Derive a child stream from a parent RNG: the child is seeded from
// the parent's next draw, so a sub-system (a shot scene, a mission)
// gets its own reproducible stream without disturbing the main one.
export function forkRng(rng) {
  return makeRng(Math.floor(rng() * 4294967296));
}
