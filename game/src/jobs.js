// Repeatable side jobs, taken with J once the story has started (mission 1+).
// Three kinds, each a small state machine on state.job:
//   taxi     — a passenger boards your car; drive them to a named place in time.
//   delivery — pick up a parcel, then drop it at a named place.
//   bounty   — a marked rival is out in the city; take him down.
// Pay scales with the trip / the target. Jobs are the reason to keep playing
// after the story: money feeds the upgrade shops, and jobsDone feeds the rank.
import { PLACES, dist, addToast, addWanted } from './world.js';
import { V_ROADS, H_ROADS } from './config.js';
import { sfx } from './audio.js';

export const JOB_TYPES = [
  { id: 'taxi', name: 'Taxi Fare', basePay: 150, desc: 'Drive a passenger across town' },
  { id: 'delivery', name: 'Package Run', basePay: 120, desc: 'Pick up, then drop off' },
  { id: 'bounty', name: 'Bounty', basePay: 250, desc: 'Take down a marked rival' },
];

const DESTS = ['cafe', 'park', 'port', 'beach', 'downtown', 'casino', 'marina', 'market'];

function pickDest(state, avoid) {
  const opts = DESTS.filter((k) => k !== avoid);
  return opts[Math.floor(Math.random() * opts.length)];
}

function nearestPlaceKey(x, y) {
  let best = 'downtown'; let bestD = Infinity;
  for (const [k, p] of Object.entries(PLACES)) {
    const d = dist(x, y, p.x, p.y);
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
}

export function takeJob(state, audio) {
  if (state.job) return 'You already have a job — finish it first.';
  if (state.missionIndex < 1) return 'Finish the first mission, then Mara will trust you with side jobs.';
  if (state.over) return null;
  const type = JOB_TYPES[state.stats.jobsTaken % JOB_TYPES.length];
  state.stats.jobsTaken = (state.stats.jobsTaken || 0) + 1;
  const p = state.player;
  if (type.id === 'taxi') {
    const dest = pickDest(state, nearestPlaceKey(p.x, p.y));
    // Passenger waits at the nearest road intersection — always reachable.
    const rx = V_ROADS.reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a));
    const ry = H_ROADS.reduce((a, b) => (Math.abs(b - p.y) < Math.abs(a - p.y) ? b : a));
    state.job = { type: 'taxi', phase: 'pickup', dest, pay: 150, timer: 90, passenger: null, pickupX: rx, pickupY: ry };
    state.waypoint = { x: rx, y: ry, label: 'Passenger — get in a car' };
    addToast(state, 'Taxi job: pick up the passenger (drive a car to them).');
  } else if (type.id === 'delivery') {
    const from = pickDest(state, nearestPlaceKey(p.x, p.y));
    const dest = pickDest(state, from);
    state.job = { type: 'delivery', phase: 'pickup', from, dest, pay: 120, timer: 120 };
    state.waypoint = { x: PLACES[from].x, y: PLACES[from].y, label: `Pickup — ${PLACES[from].label}` };
    addToast(state, `Delivery job: pick up at ${PLACES[from].label}, drop at ${PLACES[dest].label}.`);
  } else {
    const spot = pickDest(state, nearestPlaceKey(p.x, p.y));
    const x = PLACES[spot].x + 120; const y = PLACES[spot].y + 60;
    state.enemies.push({ x, y, hp: 120, shootCd: 2, color: '#8a2f8a', bounty: true });
    state.job = { type: 'bounty', phase: 'hunt', dest: spot, pay: 250, timer: 150, target: { x, y } };
    state.waypoint = { x, y, label: 'Bounty target' };
    addToast(state, `Bounty: a marked rival is near ${PLACES[spot].label}. Take him down.`);
  }
  sfx.click(audio);
  return null;
}

function finishJob(state, audio) {
  const job = state.job;
  if (!job) return;
  state.player.money += job.pay;
  state.moneyEarned = (state.moneyEarned || 0) + job.pay;
  state.stats.jobsDone = (state.stats.jobsDone || 0) + 1;
  sfx.jingle(audio);
  addToast(state, `Job done: ${JOB_TYPES.find((t) => t.id === job.type).name} — +$${job.pay}`);
  state.job = null;
  if (state.missionIndex < 7) {
    // Restore the story waypoint so the player is never stranded.
    const m = state.missionIndex;
    state.waypoint = m === 0 ? { x: PLACES.cafe.x, y: PLACES.cafe.y, label: PLACES.cafe.label }
      : m === 1 ? { x: state.getawayCar.x, y: state.getawayCar.y, label: 'Getaway Car' }
      : m === 2 ? { x: PLACES.park.x, y: PLACES.park.y, label: 'Package 1/3 — Park' }
      : m === 3 ? { x: PLACES.hideout.x, y: PLACES.hideout.y, label: PLACES.hideout.label }
      : m === 4 ? { x: PLACES.harbour.x, y: PLACES.harbour.y, label: PLACES.harbour.label }
      : m === 5 ? { x: PLACES.hideout.x, y: PLACES.hideout.y, label: PLACES.hideout.label }
      : { x: PLACES.harbour.x, y: PLACES.harbour.y, label: PLACES.harbour.label };
  }
}

function failJob(state, why) {
  if (!state.job) return;
  // A bounty target that was killed by someone else still counts as done;
  // a timed-out job just ends, with no penalty beyond the lost pay.
  if (state.job.type === 'bounty') {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      if (state.enemies[i].bounty) state.enemies.splice(i, 1);
    }
  }
  addToast(state, `Job failed: ${why}`);
  state.job = null;
}

export function updateJobs(state, dt, audio) {
  const job = state.job;
  if (!job || state.over || state.dialogue) return;
  const p = state.player;
  const pp = p.inCar !== null && state.cars[p.inCar]
    ? { x: state.cars[p.inCar].x, y: state.cars[p.inCar].y } : { x: p.x, y: p.y };
  job.timer -= dt;
  if (job.timer <= 0) { failJob(state, 'ran out of time'); return; }

  if (job.type === 'taxi') {
    if (job.phase === 'pickup') {
      // The passenger waits at the road intersection set when the job started.
      const px = job.pickupX; const py = job.pickupY;
      state.waypoint = { x: px, y: py, label: 'Passenger' };
      if (p.inCar !== null && dist(pp.x, pp.y, px, py) < 90) {
        job.phase = 'dropoff';
        job.passenger = true;
        state.waypoint = { x: PLACES[job.dest].x, y: PLACES[job.dest].y, label: `Drop off — ${PLACES[job.dest].label}` };
        addToast(state, `Passenger aboard — take them to ${PLACES[job.dest].label}.`);
      }
    } else if (dist(pp.x, pp.y, PLACES[job.dest].x, PLACES[job.dest].y) < 120) {
      finishJob(state, audio);
    }
  } else if (job.type === 'delivery') {
    if (job.phase === 'pickup') {
      state.waypoint = { x: PLACES[job.from].x, y: PLACES[job.from].y, label: `Pickup — ${PLACES[job.from].label}` };
      if (dist(pp.x, pp.y, PLACES[job.from].x, PLACES[job.from].y) < 100) {
        job.phase = 'dropoff';
        sfx.pickup(audio);
        state.waypoint = { x: PLACES[job.dest].x, y: PLACES[job.dest].y, label: `Drop off — ${PLACES[job.dest].label}` };
        addToast(state, `Parcel picked up — deliver it to ${PLACES[job.dest].label}.`);
      }
    } else if (dist(pp.x, pp.y, PLACES[job.dest].x, PLACES[job.dest].y) < 100) {
      finishJob(state, audio);
    }
  } else if (job.type === 'bounty') {
    const target = state.enemies.find((e) => e.bounty);
    if (!target) {
      // The marked rival is down.
      finishJob(state, audio);
    } else {
      state.waypoint = { x: target.x, y: target.y, label: 'Bounty target' };
    }
  }
}

// A job's waypoint overrides the story waypoint while the job runs; the
// story waypoint is restored when the job ends (see finishJob / failJob).
export function jobObjective(state) {
  const job = state.job;
  if (!job) return null;
  if (job.type === 'taxi') return job.phase === 'pickup' ? 'JOB: pick up the passenger (in a car)' : `JOB: drive passenger to ${PLACES[job.dest].label} — ${Math.ceil(job.timer)}s`;
  if (job.type === 'delivery') return job.phase === 'pickup' ? `JOB: pick up parcel at ${PLACES[job.from].label}` : `JOB: deliver to ${PLACES[job.dest].label} — ${Math.ceil(job.timer)}s`;
  return `JOB: take down the bounty target — ${Math.ceil(job.timer)}s`;
}
