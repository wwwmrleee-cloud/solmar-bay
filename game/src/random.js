// Seeded RNG (mulberry32) so ?shot= scenes and replays are deterministic.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function range(rng, min, max) { return min + rng() * (max - min); }
export function rangeInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }
