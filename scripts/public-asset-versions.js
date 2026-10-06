import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Public files keep their names (including paths stored in YDB).
export function publicAssetVersions(directory, prefix = '') {
  const versions = {};
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(directory, entry.name);
    const key = `${prefix}${entry.name}`;
    if (entry.isDirectory()) Object.assign(versions, publicAssetVersions(path, `${key}/`));
    else if (entry.isFile()) versions[key] = createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
  }
  return versions;
}
