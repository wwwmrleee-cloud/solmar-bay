// Solmar Bay — entry point for the make.fun gta6-01 "Make GTA 6" bounty.
// This is an original top-down open-world crime game: Danny Vega drives,
// steals cars, outruns the police and runs five story missions across a
// sun-soaked coastal city. The game itself is plain static files under
// game/ (game/index.html plus ES modules, no libraries, no network calls),
// so any desktop browser can open it offline. What this file does is hand
// that folder in: it copies game/ and screenshots/ next to this file into
// the output directory and writes output/dossier.json, the summary the
// judge reads, using the vendored make.fun library. The game code was
// written fresh for this entry; the only vendored file is the library.
//
// To play locally: `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps, mirrored from the gate rules: text_max_bytes is the
// only one that shapes the dossier bytes; the rest refuse an entry the
// scorer would refuse anyway — more than 4 screenshots, any screenshot
// over 256 KiB, more than 993 files or 48 MiB under game/, or a game path
// over 1000 bytes (game/ counts against /output's own 1000-entry cap,
// alongside screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
