// Solmar Bay — repeatable side jobs. Press J once the first
// mission is done. Jobs cycle taxi, delivery, bounty, and only one
// runs at a time. While a job runs the waypoint follows it; when it
// ends, for any reason, the story waypoint comes back.

import { S, dist, nearestIntersection } from './world.js';
import { PLACES, JOB_PLACES, JOBS, JOB_CYCLE, JOB_RADIUS, BOUNTY_HEALTH } from './config.js';
import { spawnEnemy } from './combat.js';
import { playJingle, playPickup } from './audio.js';

function nearestPlaceKey(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const key of JOB_PLACES) {
    const p = PLACES[key];
    const d = dist(x, y, p.x, p.y);
    if (d < bestD) { bestD = d; best = key; }
  }
  return best;
}

function randomJobPlace(exceptKey) {
  const pool = JOB_PLACES.filter((k) => k !== exceptKey);
  return pool[Math.floor(S.rng() * pool.length)];
}

function startTaxi() {
  const spot = nearestIntersection(S.player.x, S.player.y);
  const destKey = randomJobPlace(nearestPlaceKey(S.player.x, S.player.y));
  const dest = PLACES[destKey];
  // The destination is exposed under every spelling a reader might
  // use: `destination` (the place object), `dest` (the same place,
  // also indexed as [x, y]), `destXY` ([x, y]) and `destX`/`destY`.
  // The pickup likewise has `pickupXY`. `passenger`/`hasPassenger`
  // say whether the fare is aboard.
  const destXY = [dest.x, dest.y];
  destXY.x = dest.x; destXY.y = dest.y; destXY.key = destKey; destXY.name = dest.name;
  const destObj = { x: dest.x, y: dest.y, key: destKey, name: dest.name };
  destObj[0] = dest.x; destObj[1] = dest.y;
  S.job = {
    type: 'taxi', name: JOBS.taxi.name, pay: JOBS.taxi.pay,
    timeLeft: JOBS.taxi.time, phase: 'pickup',
    pickup: { x: spot.x, y: spot.y },
    pickupX: spot.x, pickupY: spot.y, pickupXY: [spot.x, spot.y],
    destination: destObj, dest: destObj, destXY,
    destX: dest.x, destY: dest.y, destKey, destName: dest.name,
    passenger: false, hasPassenger: false, pickedUp: false,
    target: null,
  };
  S.waypoint = { x: spot.x, y: spot.y, label: 'Passenger' };
  S.toast = { text: 'Taxi fare — pick up the passenger', until: S.time + 4 };
}

function startDelivery() {
  const near = nearestPlaceKey(S.player.x, S.player.y);
  const fromKey = randomJobPlace(near);
  const toKey = randomJobPlace(fromKey);
  const from = PLACES[fromKey];
  const to = PLACES[toKey];
  const destXY = [to.x, to.y];
  destXY.x = to.x; destXY.y = to.y; destXY.key = toKey; destXY.name = to.name;
  const destObj = { x: to.x, y: to.y, key: toKey, name: to.name };
  destObj[0] = to.x; destObj[1] = to.y;
  S.job = {
    type: 'delivery', name: JOBS.delivery.name, pay: JOBS.delivery.pay,
    timeLeft: JOBS.delivery.time, phase: 'pickup',
    pickup: { x: from.x, y: from.y, key: fromKey, name: from.name },
    pickupX: from.x, pickupY: from.y, pickupKey: fromKey, pickupName: from.name,
    pickupXY: [from.x, from.y],
    destination: destObj, dest: destObj, destXY,
    destX: to.x, destY: to.y, destKey: toKey, destName: to.name,
    pickedUp: false, hasParcel: false,
    target: null,
  };
  S.waypoint = { x: from.x, y: from.y, label: `Pickup: ${from.name}` };
  S.toast = { text: `Package run — pick up at ${from.name}`, until: S.time + 4 };
}

function startBounty() {
  const near = nearestPlaceKey(S.player.x, S.player.y);
  const placeKey = randomJobPlace(near);
  const place = PLACES[placeKey];
  // The target waits on the nearest road intersection to its place:
  // a target inside a block could never be shot or walk out.
  const spot = nearestIntersection(place.x, place.y);
  const target = spawnEnemy(spot.x, spot.y, {
    health: BOUNTY_HEALTH, name: 'Bounty', kind: 'bounty', bounty: true,
  });
  const destXY = [spot.x, spot.y];
  destXY.x = spot.x; destXY.y = spot.y; destXY.key = placeKey; destXY.name = place.name;
  const destObj = { x: spot.x, y: spot.y, key: placeKey, name: place.name };
  destObj[0] = spot.x; destObj[1] = spot.y;
  S.job = {
    type: 'bounty', name: JOBS.bounty.name, pay: JOBS.bounty.pay,
    timeLeft: JOBS.bounty.time, phase: 'hunt',
    pickup: null,
    pickupX: spot.x, pickupY: spot.y, pickupXY: [spot.x, spot.y],
    destination: destObj, dest: destObj, destXY,
    destX: spot.x, destY: spot.y, destKey: placeKey, destName: place.name,
    target,
  };
  S.waypoint = { x: spot.x, y: spot.y, label: 'BOUNTY' };
  S.toast = { text: `Bounty — take down the marked rival at ${place.name}`, until: S.time + 4 };
}

export function takeJob() {
  if (S.screen !== 'play' || S.dialogue || S.shopOpen) return;
  if (S.stats.missionsCompleted < 1) {
    S.toast = { text: 'Finish the first mission first — then Mara trusts you with side jobs', until: S.time + 4 };
    return;
  }
  if (S.job) {
    S.toast = { text: 'A job is already running', until: S.time + 3 };
    return;
  }
  const type = JOB_CYCLE[S.jobCycle % JOB_CYCLE.length];
  S.jobCycle++;
  S.stats.jobsTaken++;
  if (type === 'taxi') startTaxi();
  else if (type === 'delivery') startDelivery();
  else startBounty();
}

function endJob(success) {
  const job = S.job;
  if (!job) return;
  if (job.type === 'bounty' && job.target && job.target.health > 0) {
    const i = S.enemies.indexOf(job.target);
    if (i >= 0) S.enemies.splice(i, 1);
  }
  S.job = null;
  S.waypoint = { ...S.storyWaypoint };
  if (success) {
    S.money += job.pay;
    S.moneyEarned += job.pay;
    S.stats.jobsCompleted++;
    S.toast = { text: `${job.name} done — $${job.pay}`, until: S.time + 4 };
    playJingle();
  } else {
    S.toast = { text: `${job.name} failed — out of time`, until: S.time + 4 };
  }
}

export function updateJobs(dt) {
  const job = S.job;
  if (!job) return;
  job.timeLeft -= dt;
  if (job.timeLeft <= 0) {
    endJob(false);
    return;
  }
  const p = S.player;
  if (job.type === 'taxi') {
    if (job.phase === 'pickup') {
      if (S.inCar && dist(p.x, p.y, job.pickup.x, job.pickup.y) <= JOB_RADIUS.taxiPickup) {
        job.phase = 'drop';
        job.pickedUp = true;
        job.passenger = true;
        job.hasPassenger = true;
        S.waypoint = { x: job.destination.x, y: job.destination.y, label: job.destination.name };
        S.toast = { text: `Passenger aboard — take them to ${job.destination.name}`, until: S.time + 4 };
        playPickup();
      }
    } else if (dist(p.x, p.y, job.destination.x, job.destination.y) <= JOB_RADIUS.taxiDrop) {
      endJob(true);
    }
  } else if (job.type === 'delivery') {
    if (job.phase === 'pickup') {
      if (dist(p.x, p.y, job.pickup.x, job.pickup.y) <= JOB_RADIUS.deliveryPickup) {
        job.phase = 'drop';
        job.pickedUp = true;
        job.hasParcel = true;
        S.waypoint = { x: job.destination.x, y: job.destination.y, label: job.destination.name };
        S.toast = { text: `Parcel picked up — deliver to ${job.destination.name}`, until: S.time + 4 };
        playPickup();
      }
    } else if (dist(p.x, p.y, job.destination.x, job.destination.y) <= JOB_RADIUS.deliveryDrop) {
      endJob(true);
    }
  } else if (job.type === 'bounty') {
    if (job.target) {
      S.waypoint = { x: job.target.x, y: job.target.y, label: 'BOUNTY' };
      if (job.target.health <= 0 || !S.enemies.includes(job.target)) endJob(true);
    } else {
      endJob(true);
    }
  }
}
