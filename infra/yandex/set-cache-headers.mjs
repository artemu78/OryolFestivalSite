import { constants, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const iamUrl = 'https://iam.api.cloud.yandex.net/iam/v1/tokens';

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Cloud request failed: HTTP ${response.status}`);
  return response;
}

export async function iamToken() {
  const token = process.env.YC_TOKEN;
  if (token && !token.startsWith('y0_') && !token.startsWith('AQAAA')) return token;
  let payload;
  if (token) payload = { yandexPassportOauthToken: token };
  else {
    if (!process.env.YC_SERVICE_ACCOUNT_KEY_FILE) throw new Error('Set YC_TOKEN or YC_SERVICE_ACCOUNT_KEY_FILE');
    const key = JSON.parse(readFileSync(process.env.YC_SERVICE_ACCOUNT_KEY_FILE, 'utf8'));
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const data = `${encode({ alg: 'PS256', typ: 'JWT', kid: key.id })}.${encode({ iss: key.service_account_id, aud: iamUrl, iat: now, exp: now + 3600 })}`;
    const signature = sign('sha256', Buffer.from(data), {
      key: key.private_key, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32,
    }).toString('base64url');
    payload = { jwt: `${data}.${signature}` };
  }
  const response = await request(iamUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!result.iamToken) throw new Error('IAM response did not contain a token');
  return result.iamToken;
}

export async function setCacheHeaders(objects, token) {
  let updated = 0;
  for (const object of objects) {
    const source = `/${object.bucket}/${object.key}`.split('/').map(encodeURIComponent).join('/');
    const url = `https://storage.yandexcloud.net${source}`;
    const auth = { Authorization: `Bearer ${token}` };
    const current = await request(url, { method: 'HEAD', headers: auth });
    if (current.headers.get('cache-control') === object.cache_control) continue;
    const etag = current.headers.get('etag');
    if (!etag) throw new Error(`Missing ETag: ${object.key}`);
    const headers = {
      ...auth,
      'x-amz-copy-source': source,
      'x-amz-copy-source-if-match': etag,
      'x-amz-metadata-directive': 'REPLACE',
      'Cache-Control': object.cache_control,
    };
    // REPLACE must retain existing content metadata and custom metadata.
    for (const [name, value] of current.headers) {
      if (name.startsWith('x-amz-meta-') || ['content-type', 'content-encoding', 'content-disposition', 'content-language', 'expires', 'x-amz-storage-class'].includes(name)) {
        headers[name] = value;
      }
    }
    const copied = await request(url, { method: 'PUT', headers, body: '' });
    const body = await copied.text();
    // S3 can return an embedded error even with status 200.
    if (!body.includes('<CopyObjectResult') || body.includes('<Error')) throw new Error(`Copy failed: ${object.key}`);
    const verified = await request(url, { method: 'HEAD', headers: auth });
    if (verified.headers.get('cache-control') !== object.cache_control || verified.headers.get('etag') !== etag) {
      throw new Error(`Cache header or content verification failed: ${object.key}`);
    }
    updated++;
  }
  return updated;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const objects = JSON.parse(process.env.SITE_CACHE_OBJECTS);
    const updated = await setCacheHeaders(objects, await iamToken());
    console.log(`Verified cache headers for ${objects.length} objects; updated ${updated}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
