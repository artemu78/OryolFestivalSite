import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Only derived copies are written. Public/database source paths remain valid.
export async function optimizeImages(publicDirectory) {
  const outputDirectory = join(publicDirectory, 'optimized-images');
  await mkdir(outputDirectory, { recursive: true });
  const manifest = {};
  const outputs = new Set(['manifest.json']);
  let sourceBytes = 0;
  let generatedBytes = 0;
  for (const directory of ['girls', 'activity-backgrounds', 'logos']) {
    const entries = await readdir(join(publicDirectory, directory), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isFile() || !/\.(jpe?g|png|webp)$/i.test(entry.name)) continue;
      // Hero posters already have dedicated mobile/desktop files and preloads.
      if (directory === 'girls' && /^1001(?:-mobile)?\./.test(entry.name)) continue;
      const path = `${directory}/${entry.name}`;
      const input = await readFile(join(publicDirectory, path));
      const metadata = await sharp(input).metadata();
      if (metadata.pages > 1) continue; // Preserve animations unchanged.
      const variants = directory === 'girls'
        ? { thumbnail: [160, 160, 80], portrait: [640, 960, 84] }
        : directory === 'activity-backgrounds'
          ? { background: [1280, 1280, 78] }
          : { logo: [800, entry.name === 'braf.jpg' ? 1600 : 800, 86],
              ...(entry.name === 'main_logo.jpg' ? { brand: [320, 320, 88] } : {}) };
      manifest[path] = {};
      sourceBytes += input.length;
      for (const [role, [width, height, quality]] of Object.entries(variants)) {
        const { data, info } = await sharp(input).autoOrient()
          .resize({ width, height, fit: 'inside', withoutEnlargement: true })
          .webp({ quality, effort: 5 }).toBuffer({ resolveWithObject: true });
        // Do not replace an already smaller source with a larger encoded copy.
        if (data.length >= input.length) {
          manifest[path][role] = { path, bytes: input.length };
          generatedBytes += input.length;
          continue;
        }
        const hash = createHash('sha256').update(data).digest('hex').slice(0, 16);
        const name = `${directory}-${entry.name}-${role}-${hash}.webp`;
        await writeFile(join(outputDirectory, name), data);
        outputs.add(name);
        manifest[path][role] = { path: `optimized-images/${name}`, width: info.width, height: info.height, bytes: data.length };
        generatedBytes += data.length;
      }
    }
  }
  await writeFile(join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  // This directory is exclusively owned by the generator; retire stale copies.
  for (const name of await readdir(outputDirectory)) {
    if (!outputs.has(name)) await rm(join(outputDirectory, name));
  }
  console.log(`Images: ${(sourceBytes / 1024).toFixed(0)} KiB originals → ${(generatedBytes / 1024).toFixed(0)} KiB across all display variants`);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await optimizeImages(fileURLToPath(new URL('../public', import.meta.url)));
}
