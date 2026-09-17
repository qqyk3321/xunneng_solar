import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import sharp from 'sharp';

// Run after next build. Only this page's entries and its dynamic imports, NOT
// every JS chunk on the website. No server bundles, credentials or API responses.
const root = process.cwd();
const output = join(root, 'public/solar-analysis');
await mkdir(output, { recursive: true });
for (const size of [192, 512]) {
  await sharp(join(root, 'app/icon.svg')).resize(Math.round(size * .72), Math.round(size * .72))
    .extend({ top: Math.floor(size * .14), bottom: size - Math.round(size * .72) - Math.floor(size * .14), left: Math.floor(size * .14), right: size - Math.round(size * .72) - Math.floor(size * .14), background: '#f4faf8' })
    .png().toFile(join(output, `icon-${size}.png`));
}
const readJson = async file => JSON.parse(await readFile(join(root, file), 'utf8'));
const app = await readJson('.next/app-build-manifest.json');
const lazy = await readJson('.next/react-loadable-manifest.json');
const files = new Set();
const build = await readJson('.next/build-manifest.json');
(build.polyfillFiles || []).forEach(file => files.add(file));
for (const route of ['/layout', '/solar-analysis/layout', '/solar-analysis/page']) {
  if (!app.pages[route]?.length) throw new Error(`Missing offline entry: ${route}`);
  app.pages[route].forEach(file => files.add(file));
}
for (const [key, entry] of Object.entries(lazy)) {
  if (key.startsWith('app/solar-analysis/')) entry.files.forEach(file => files.add(file));
}
const media = await readdir(join(root, '.next/static/media'));
const workers = media.filter(file => /^pdf\.worker\..*\.mjs$/.test(file));
if (workers.length !== 1) throw new Error('Expected one PDF preview worker');
workers.forEach(file => files.add(`static/media/${file}`));
const table = await readJson('lib/solar-analysis/model-table-manifest.json');
const publicPaths = [table.url, '/icon.svg', '/fonts/report-space-grotesk-v1.ttf', '/solar-analysis/icon-192.png', '/solar-analysis/icon-512.png', '/solar-analysis/manifest.webmanifest'];
const assets = [];
for (const [url, file] of [
  ...[...files].map(file => [`/_next/${file}`, `.next/${file}`]),
  ...publicPaths.map(url => [url, url === '/icon.svg' ? 'app/icon.svg' : `public${url}`]),
].sort(([a], [b]) => a.localeCompare(b))) {
  const bytes = await readFile(join(root, file));
  assets.push({ url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const version = createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0, 20);
const manifest = { schema: 1, version, generatedAt: new Date().toISOString(), bytes: assets.reduce((n, a) => n + a.bytes, 0), assets };
await writeFile(join(output, 'offline-assets.json'), JSON.stringify(manifest));
console.log(`Solar offline: ${assets.length} resources, ${(manifest.bytes / 1024 / 1024).toFixed(2)} MB, version ${version}`);
