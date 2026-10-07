import variants from '../public/optimized-images/manifest.json';
import { assetUrl } from './assetUrl';

// Keep original database paths, resolving a display-sized copy when available.
export function imageUrl(path, role) {
  if (/^https?:\/\//i.test(path)) return path;
  return assetUrl(variants[path]?.[role]?.path ?? path);
}
