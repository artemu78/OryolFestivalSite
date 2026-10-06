import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { publicAssetVersions } from './public-asset-versions.js';
import { setCacheHeaders } from '../infra/yandex/set-cache-headers.mjs';

test('changed media gets a new URL under both hosting base paths', () => {
  const directory = mkdtempSync(join(tmpdir(), 'festival-cache-'));
  try {
    writeFileSync(join(directory, 'portrait.jpg'), 'first');
    const first = publicAssetVersions(directory);
    assert.deepEqual(publicAssetVersions(directory), first);
    writeFileSync(join(directory, 'portrait.jpg'), 'second');
    const second = publicAssetVersions(directory);
    assert.notEqual(first['portrait.jpg'], second['portrait.jpg']);
    const source = readFileSync(new URL('../src/assetUrl.js', import.meta.url), 'utf8');
    for (const base of ['/', '/OryolFestivalSite/']) {
      const context = vm.createContext({ __PUBLIC_ASSET_VERSIONS__: second });
      vm.runInContext(source.replace('export function', 'function').replace('import.meta.env.BASE_URL', JSON.stringify(base)), context);
      assert.equal(context.assetUrl('portrait.jpg'), `${base}portrait.jpg?v=${second['portrait.jpg']}`);
      assert.equal(context.assetUrl('unknown.jpg'), `${base}unknown.jpg`);
    }
  } finally { rmSync(directory, { recursive: true }); }
});

const object = { bucket: 'example.test', key: 'girls/a b.jpg', cache_control: 'public, max-age=2592000' };
test('metadata update preserves content headers, checks ETag, and skips already configured files', async t => {
  const calls = [];
  const headers = { etag: '"original"', 'content-type': 'image/jpeg', 'x-amz-meta-description': 'portrait' };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    if (options.method === 'PUT') {
      Object.assign(headers, { 'cache-control': options.headers['Cache-Control'] });
      return new Response('<CopyObjectResult><ETag>"original"</ETag></CopyObjectResult>');
    }
    return new Response(null, { headers });
  });
  assert.equal(await setCacheHeaders([object], 'test-token'), 1);
  const copy = calls.find(c => c.options.method === 'PUT');
  assert.equal(copy.url, 'https://storage.yandexcloud.net/example.test/girls/a%20b.jpg');
  assert.equal(copy.options.headers['x-amz-copy-source-if-match'], '"original"');
  assert.equal(copy.options.headers['content-type'], 'image/jpeg');
  assert.equal(copy.options.headers['x-amz-meta-description'], 'portrait');
  assert.equal(await setCacheHeaders([object], 'test-token'), 0);
  assert.equal(calls.filter(c => c.options.method === 'PUT').length, 1);
});

test('S3 embedded errors with HTTP 200 fail the Terraform step', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => options.method === 'PUT'
    ? new Response('<Error><Code>InternalError</Code></Error>')
    : new Response(null, { headers: { etag: '"original"' } }));
  await assert.rejects(setCacheHeaders([object], 'test-token'), /Copy failed/);
});

test('failed read-back verification fails the Terraform step', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => options.method === 'PUT'
    ? new Response('<CopyObjectResult/>')
    : new Response(null, { headers: { etag: '"original"' } }));
  await assert.rejects(setCacheHeaders([object], 'test-token'), /verification failed/);
});
