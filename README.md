# Solmar Bay

A top-down 2D open-world crime game, built for the make.fun bounty
**gta6-01 "Make GTA 6"**.

Danny Vega has just arrived in Solmar Bay, a 3600 by 2800 bay city
with a road grid, a beach, a harbour and a park. He takes on seven
story missions — from picking up a package at the cafe to taking
down the harbour boss — while the police, rival crews and two bosses
try to stop him.

## What is in the game

- **7 story missions** paying $200 to $1,500, for $5,400 in total,
  ending with a victory screen and a rank from S to C.
- **2 bosses**: Rico at the Hideout and Captain Voss at the Harbour.
- **3 shops** with 8 upgrades in three tiers: the garage, the gun
  store and the clinic. Bought rows read as OWNED, and every
  purchase has its own chime.
- **3 repeatable side jobs** — taxi, delivery and bounty — plus 12
  hidden packages worth $50 each. While a taxi fare is waiting, E
  takes the nearest car first instead of opening a shop.
- **Wanted levels 1 to 5**, with police cars and officers who chase,
  ram and shoot.
- **36 pedestrians, 13 named places**, a living traffic grid, a
  minimap, a game clock and a save system with version migration.
  A save only ever restores upgrade ids the game knows.
- **Synthesised WebAudio sound** — gunfire, crashes, sirens, pickups
  and an engine hum — with a mute toggle (M).
- **Navigation**: the waypoint marker stays pinned to the edge of
  the screen when its target is off screen, so the next objective
  is always visible.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk or drive |
| Mouse | Aim, click to shoot |
| E | Interact — enter or exit a car, talk, open a shop, pick up |
| J | Take a side job |
| 1 / 2 / 3 | Buy the matching row in an open shop |
| Arrow keys | Move the shop selection |
| P / Esc | Pause |
| M | Mute |
| Enter | Start, continue, or respawn after Busted / Wasted |

## Play

Open `game/index.html` in a browser, or serve the `game/` folder
with `node serve.ts` and visit `http://127.0.0.1:8080/`.

Screenshots: `screenshots/` (start, drive, chase, mission).

## Tech

- Plain JavaScript modules, no build step, no network calls.
- Node 22 standard library only for the entry point (`main.ts`).
- The vendor library in `vendor/` is the make.fun kit's, unchanged.

## License

MIT — see `LICENSE`.
