# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/wwwmrleee-cloud/solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/wwwmrleee-cloud/solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay is an original open-world crime game that plays offline in a desktop browser from static files: explore a sun-soaked coastal city on foot and by car, steal cars, outrun the police as your wanted level rises, fight, and play through a story of missions — with traffic, pedestrians, a HUD with a minimap, a start screen and a save. Nothing in it comes from any commercial game.

You are Danny Vega, a driver new to Solmar Bay, working for Mara Solis and her crew. Five story missions take you from a first meeting at the Sunrise Cafe, through a police-chased getaway drive and package runs across town, to a shootout defending the Hideout and a final harbour heist escape. Wanted level runs 0–5 stars: steal cars, shoot, or hit pedestrians and the police come for you — lose them by staying out of sight. Five hidden packages are stashed around the city, each worth $50.

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
| E | Steal / enter / exit a car, interact, advance dialogue |
| P / Esc | Pause |
| M | Mute / unmute sound |
| Enter | Start, continue, restart after Busted / Wasted |

## What is in the game

- **City:** grid roads, downtown towers, a beach and promenade with palms, a port, a park, suburbs — all drawn on one canvas, day lighting.
- **Systems:** on-foot movement and shooting, car theft and driving with drift and collisions, traffic AI, pedestrians who flee gunfire, wanted 0–5 stars with police cars and officers, 5 story missions with dialogue and waypoints, rival-crew combat, HUD with health/money/stars/clock/objective/ammo/speed, a minimap, start/pause/Busted/Wasted/victory screens, localStorage autosave, synthesized WebAudio sound (engine, siren, gunshots, chimes) with mute, particles, screen shake, skid marks and damage smoke.
- **Files:** `game/index.html` plus `game/src/` — `config.js` (constants, city, missions), `random.js` (seeded RNG), `world.js` (city generation and the per-frame step), `input.js`, `player.js`, `vehicles.js` (driving + traffic AI), `pedestrians.js`, `police.js` (wanted + police AI), `missions.js` (story), `combat.js` (shooting + enemies), `render.js` (canvas + screens), `hud.js` (HUD + minimap), `audio.js` (synthesized sound), `save.js`, `shots.js` (staged `?shot=` scenes), `main.js` (loop + screens).

## Testing

Playtested end-to-end with Playwright: all 5 missions completed (win screen, $2,700), car theft and driving, police chases, the hideout shootout, Busted and Wasted screens, pause, save + Continue, crash damage, hidden packages, resize (16:10, 4:3, 1280×720), and 60 FPS during a 3-star chase — with zero console errors and zero failed requests. See `TESTLOG.md`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wp8y7q6s&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
