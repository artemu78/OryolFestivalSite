import { readFileSync, existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const load = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const experts = load('src/experts.json');
const fields = ['id', 'name', 'photo', 'profile', 'role', 'text'].sort();
const ids = new Set();
for (const expert of experts) {
  if (JSON.stringify(Object.keys(expert).sort()) !== JSON.stringify(fields)) throw Error('Public expert fields differ from allowlist');
  if (Object.values(expert).some(value => typeof value !== 'string' || !value.trim())) throw Error('Invalid public expert field');
  if (ids.has(expert.id)) throw Error('Duplicate expert ID');
  ids.add(expert.id);
  if (/^Участник VK \d+$/.test(expert.name)) throw Error('Set a public expert name before export');
  if (expert.id.startsWith('legacy-vk-')) throw Error('Public expert ID must not encode VK identity');
  if (expert.name === 'Татьяна Хотеева') throw Error('Excluded expert');
  if (isAbsolute(expert.photo) || expert.photo.split(/[\\/]/).includes('..') || !existsSync(resolve(root, 'public', expert.photo))) throw Error('Invalid or missing expert portrait');
  if (!expert.profile.startsWith('https://')) throw Error('Expert profile must use HTTPS');
}
for (const session of load('src/program.json')) {
  for (const id of session.people ?? []) if (!ids.has(id)) throw Error(`Unknown programme expert: ${id}`);
}
console.log('Public expert fields, portraits and programme references validated');
