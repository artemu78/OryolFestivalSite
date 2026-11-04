// File-only deployment for the existing Latin-domain bucket.
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join } from 'node:path';
import { deployRequest } from './deploy-request.mjs';
import { iamToken } from '../infra/yandex/set-cache-headers.mjs';

const root = new URL('../dist/', import.meta.url);
const bucket = 'mentalhealthfestival.ru';
process.env.YC_SERVICE_ACCOUNT_KEY_FILE ||= new URL('../infra/yandex/authorized_key.json', import.meta.url).pathname;
const token = await iamToken();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.ics': 'text/calendar; charset=utf-8' };
async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const name = join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(new URL(`${entry.name}/`, directory), name));
    else result.push(name);
  }
  return result;
}
const names = await files(root);
if (!names.includes('index.html')) throw new Error('Missing dist/index.html');
// Publish entry HTML last, after its dependencies have uploaded successfully.
names.sort((a, b) => Number(a === 'index.html') - Number(b === 'index.html'));
let uploaded = 0;
let skipped = 0;
for (const name of names) {
  const data = await readFile(new URL(name, root));
  const hash = createHash('md5').update(data).digest('hex');
  const url = `https://storage.yandexcloud.net/${bucket}/${name.split('/').map(encodeURIComponent).join('/')}`;
  const cache = /^assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(name)
    ? 'public, max-age=31536000, immutable'
    : /\.(png|jpe?g|webp|svg|ico|mp4|woff2?)$/i.test(name) ? 'public, max-age=2592000' : 'no-cache';
  const headers = { Authorization: `Bearer ${token}` };
  const current = await deployRequest(url, { method: 'HEAD', headers });
  if (current.ok && current.headers.get('etag')?.replaceAll('"', '') === hash && current.headers.get('cache-control') === cache) { skipped++; continue; }
  if (!current.ok && current.status !== 404) throw new Error(`HEAD ${name}: HTTP ${current.status}`);
  const response = await deployRequest(url, { method: 'PUT', headers: { ...headers, 'Content-Type': types[extname(name).toLowerCase()] || 'application/octet-stream', 'Cache-Control': cache, 'Content-MD5': Buffer.from(hash, 'hex').toString('base64') }, body: data });
  if (!response.ok) throw new Error(`PUT ${name}: HTTP ${response.status}`);
  console.log(`Uploaded ${name}`);
  uploaded++;
}
console.log(`Published https://${bucket}/ — ${uploaded} uploaded, ${skipped} unchanged. No files deleted.`);
