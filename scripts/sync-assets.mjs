import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Copy only project-owned images committed to imgs/, never download remotely. */
const from = join(process.cwd(), 'imgs');
const into = join(process.cwd(), 'public', 'imgs');
const expected = [
  'hero-main-bg', 'festival-dussehra', 'highlight-tithi', 'highlight-nakshatra',
  'highlight-abhijit', 'highlight-rahu', 'card-wedding', 'card-griha-pravesh',
  'card-vehicle-purchase', 'card-start-business', 'logo',
];
if (!existsSync(from)) {
  console.error('Missing ./imgs/ — commit the 10 original generated WebP assets to the repository first.');
  process.exit(1);
}
const present = new Set(readdirSync(from));
for (const name of expected) {
  if (!present.has(`${name}.webp`)) {
    console.error(`Missing original asset: imgs/${name}.webp`);
    process.exit(1);
  }
}
if (!present.has('favicon_gold_frame.ico')) { console.error('Missing original asset: imgs/favicon_gold_frame.ico'); process.exit(1); }
mkdirSync(into, { recursive: true });
const mediaAssets = [...present].filter(name => /\.(webp|ico)$/i.test(name));
for (const filename of mediaAssets) {
  cpSync(join(from, filename), join(into, filename));
}
console.log(`PANCHAVANI: staged ${mediaAssets.length} local assets for Next.js /imgs/...`);
