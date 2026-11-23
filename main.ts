// Solmar Bay — the entry point the platform runs. It copies the
// game and its screenshots into the output directory and writes the
// dossier the platform checks, using the kit's vendor library.

import { mkdir, cp, rm, readdir, stat, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// Fail fast with a clear message when the entry point or the
// screenshots are missing, instead of shipping a broken bundle.
await stat(join(here, 'game', 'index.html'));
const shots = (await readdir(join(here, 'screenshots'))).filter((f) => /\.(jpe?g|png)$/i.test(f));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`Expected 3-4 screenshots, found ${shots.length} in screenshots/`);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(join(here, 'game'), join(outDir, 'game'), { recursive: true });
await cp(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = await buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

await writeFile(join(outDir, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n', 'utf8');
console.log(`Solmar Bay dossier written to ${outDir}/dossier.json`);
