# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/wwwmrleee-cloud/solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/wwwmrleee-cloud/solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay is an original open-world crime game that plays offline in a desktop browser from static files: explore a sun-soaked coastal city on foot and by car, steal cars, outrun the police as your wanted level rises, fight, and play through a story of missions — with traffic, pedestrians, a HUD with a minimap, a start screen and a save. Nothing in it comes from any commercial game.

You are Danny Vega, a driver new to Solmar Bay, working for Mara Solis and her crew. Seven story missions take you from a first meeting at the Sunrise Cafe, through a police-chased getaway drive and package runs across town, to a shootout defending the Hideout, a harbour heist escape, and two boss fights — Rico, the rival crew leader, and Captain Voss, who runs the whole police force. Wanted level runs 0–5 stars: steal cars, shoot, or hit pedestrians and the police come for you — lose them by staying out of sight. Twelve hidden packages are stashed around the city, each worth $50. Story money is worth spending: three shops (a garage, a gun store and a clinic, each with a named shopkeeper) sell eight upgrades — tougher skin, heavier rounds, a faster trigger, bigger mags, a tuned engine, armoured bodywork and field kits — and three kinds of repeatable side jobs (taxi fares, package runs and bounties, taken with J) keep paying after the story ends. Beat both bosses and the win screen ranks your run S/A/B/C.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. WASD to move / drive, mouse to aim, E to enter or steal a car, Space / click to shoot, M to mute, P to pause, F5 is not needed — progress saves automatically.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive (steer, accelerate, brake) |
| Mouse | Aim |
| Click / Space | Shoot (pistol) |
| E | Steal / enter / exit a car, interact, advance dialogue, leave a shop |
| J | Take a side job (taxi, delivery, bounty) |
| 1–3 | Buy in an open shop |
| P / Esc | Pause (Esc also leaves a shop) |
| M | Mute / unmute sound |
| Enter | Start, continue, restart after Busted / Wasted |

## What is in the game

- **City:** grid roads, downtown towers, a beach and promenade with palms, a port, a park, suburbs, plus a casino, a marina and a night market — all drawn on one canvas, day lighting.
- **Systems:** on-foot movement and shooting, car theft and driving with drift and collisions, traffic AI, pedestrians who flee gunfire, wanted 0–5 stars with police cars and officers, 7 story missions with dialogue and waypoints, 2 boss fights with HP bars and spread shots, rival-crew combat, 3 shops with 8 upgrades (max HP, pistol damage/fire rate, ammo capacity, car speed/armour, field kits), 3 repeatable side jobs (taxi, delivery, bounty) with timers and scaling pay, 12 hidden packages, HUD with health/money/stars/clock/objective/ammo/speed/upgrades/jobs/bosses, a minimap, start/pause/Busted/Wasted/victory screens with an S/A/B/C rank, localStorage autosave (v2, migrates v1 saves), synthesized WebAudio sound (engine, siren, gunshots, chimes) with mute, particles, screen shake, skid marks and damage smoke.
- **Files:** `game/index.html` plus `game/src/` — `config.js` (constants, city, missions), `random.js` (seeded RNG), `world.js` (city generation and the per-frame step), `input.js`, `player.js`, `vehicles.js` (driving + traffic AI), `pedestrians.js`, `police.js` (wanted + police AI), `missions.js` (story + bosses), `combat.js` (shooting + enemies), `upgrades.js` (shops + upgrades), `jobs.js` (side jobs), `render.js` (canvas + screens), `hud.js` (HUD + minimap + shop panel + boss bar), `audio.js` (synthesized sound), `save.js`, `shots.js` (staged `?shot=` scenes), `main.js` (loop + screens).

## Testing

Playtested end-to-end with Playwright: all 7 missions completed (win screen with rank, $5,400 story pay), both bosses beaten (Rico 400 HP, Voss 350 HP), all 8 upgrades bought and verified (top speed 430 → 520, max HP 100 → 150, pistol damage 34 → 52), all 3 side jobs completed, 12/12 hidden packages, car theft and driving, police chases, the hideout shootout, Busted and Wasted screens, pause, save + Continue (v2, plus a v1 save that migrates cleanly), crash damage, resize (16:10, 4:3, 1280×720), and a 3-star chase — with zero console errors and zero failed requests. See `TESTLOG.md`. A fix pass on 2026-11-17 re-authored the entrypoint and every game file under a fresh recording, re-staged the four screenshots, and re-ran the regression suite — still zero console errors and zero failed requests.

Round 3 (2026-11-22) added the shops/upgrades, bosses, side jobs and world density on top of round 2, under a fresh recording: 3 shops (Garage, Harbour Arms, Palm Clinic) with named shopkeepers, 8 upgrades, 2 bosses + 2 story missions (7 total), 3 repeatable side jobs, 12 hidden packages (was 5), 36 pedestrians (was 26), 3 new districts (Casino, Marina, Night Market), an S/A/B/C rank on the win screen, and a v2 save that also saves on winning. Full Playwright regression (solmar-r3.mjs) passes 50/50 with zero console errors and zero failed requests; headless Chromium renders this game at ~12–23 FPS in software rendering (the round-2 build measures the same in this environment — no regression; 60 FPS needs a headed browser with a GPU).

---

<sub>Entered on [make.fun](https://make.fun/?ref=wp8y7q6s&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
