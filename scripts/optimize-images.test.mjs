import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';
import { optimizeImages } from './optimize-images.mjs';

test('derived images preserve originals, alpha and aspect ratio; changed sources retire stale copies', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'festival-images-'));
  try {
    for (const folder of ['girls', 'logos', 'activity-backgrounds']) await mkdir(join(directory, folder));
    const original = await sharp({ create: { width: 1200, height: 1800, channels: 4, background: '#12563280' } }).png().toBuffer();
    const source = join(directory, 'girls/person.png');
    await writeFile(source, original);
    const first = await optimizeImages(directory);
    assert.deepEqual(await readFile(source), original);
    const thumbnail = first['girls/person.png'].thumbnail;
    const metadata = await sharp(join(directory, thumbnail.path)).metadata();
    assert(metadata.width <= 160 && metadata.height <= 160);
    assert(Math.abs(metadata.width / metadata.height - 2 / 3) < 0.01);
    assert.equal(metadata.hasAlpha, true);
    assert(thumbnail.bytes < original.length);
    const unchanged = await optimizeImages(directory);
    assert.deepEqual(unchanged, first);
    await sharp({ create: { width: 1200, height: 1800, channels: 4, background: '#ff220080' } }).png().toFile(source);
    const second = await optimizeImages(directory);
    assert.notEqual(second['girls/person.png'].thumbnail.path, thumbnail.path);
    await assert.rejects(access(join(directory, thumbnail.path)));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('image URLs preserve base paths, hashes, unknown files and remote images', async () => {
  const assetSource = (await readFile(new URL('../src/assetUrl.js', import.meta.url), 'utf8')).replace('export function', 'function');
  const imageSource = (await readFile(new URL('../src/imageUrl.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace('export function', 'function');
  for (const base of ['/', '/OryolFestivalSite/']) {
    const context = vm.createContext({ variants: { 'girls/a.jpg': { thumbnail: { path: 'optimized-images/a.webp' } } }, __PUBLIC_ASSET_VERSIONS__: { 'optimized-images/a.webp': 'newhash' } });
    vm.runInContext(assetSource.replace('import.meta.env.BASE_URL', JSON.stringify(base)) + imageSource, context);
    assert.equal(context.imageUrl('girls/a.jpg', 'thumbnail'), `${base}optimized-images/a.webp?v=newhash`);
    assert.equal(context.imageUrl('girls/new.jpg', 'thumbnail'), `${base}girls/new.jpg`);
    assert.equal(context.imageUrl('https://example.org/photo.jpg', 'thumbnail'), 'https://example.org/photo.jpg');
  }
});
