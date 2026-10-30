import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, '..');
const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kaya-dashboard-'));

try {
    await build({
        configFile: path.join(frontendDir, 'vite.config.js'),
        root: frontendDir,
        build: {
            outDir,
            emptyOutDir: true,
        },
    });

    const indexPath = path.join(outDir, 'index.html');
    const indexHtml = await fs.readFile(indexPath, 'utf8');
    if (!indexHtml.includes('/js/app/assets/')) {
        throw new Error('Built index does not reference the expected /js/app/assets/ path');
    }
} finally {
    await fs.rm(outDir, { recursive: true, force: true });
}
