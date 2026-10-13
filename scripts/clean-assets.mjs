import { rmSync } from 'node:fs';
rmSync('public/imgs', { recursive: true, force: true });
rmSync('out', { recursive: true, force: true });
rmSync('.next', { recursive: true, force: true });
