import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deployRequest } from './deploy-request.mjs';
const url = 'https://storage.yandexcloud.net/example/file.jpg';
const quiet = { sleep: async () => {}, warn: () => {} };
test('retries connect timeouts and server errors with identical upload bytes', async () => {
  let calls = 0;
  const body = Buffer.from('photo');
  const response = await deployRequest(url, { method: 'PUT', body }, { ...quiet, fetchFn: async (_, options) => {
    assert.equal(options.body, body);
    calls++;
    if (calls === 1) throw new TypeError('fetch failed', { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } });
    return new Response('', { status: calls === 2 ? 503 : 200 });
  } });
  assert.equal(response.status, 200);
  assert.equal(calls, 3);
});
test('does not retry denied access', async () => {
  let calls = 0;
  const response = await deployRequest(url, { method: 'HEAD' }, { ...quiet, fetchFn: async () => { calls++; return new Response(null, { status: 403 }); } });
  assert.equal(response.status, 403);
  assert.equal(calls, 1);
});
test('stops after five transient failures and identifies the file', async () => {
  let calls = 0;
  await assert.rejects(deployRequest(url, { method: 'HEAD' }, { ...quiet, fetchFn: async () => { calls++; throw new TypeError('fetch failed', { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } }); } }), /file.jpg.*failed after 5 attempts/);
  assert.equal(calls, 5);
});
