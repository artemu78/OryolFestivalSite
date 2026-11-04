import { setTimeout as delay } from 'node:timers/promises';

const transient = new Set(['UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND']);
function retryable(error) {
  return error?.name === 'TimeoutError' || transient.has(error?.code) ||
    (error?.cause && retryable(error.cause)) || error?.errors?.some(retryable);
}
// Both HEAD and replacing the same object with the same bytes are safe to retry.
export async function deployRequest(url, options, { fetchFn = fetch, sleep = delay, warn = console.warn } = {}) {
  const label = `${options.method} ${new URL(url).pathname}`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    let reason;
    try {
      const response = await fetchFn(url, { ...options, signal: AbortSignal.timeout(120000) });
      await response.arrayBuffer();
      if (![408, 429, 500, 502, 503, 504].includes(response.status)) return response;
      reason = `HTTP ${response.status}`;
    } catch (error) {
      if (!retryable(error)) throw new Error(`${label}: request failed`, { cause: error });
      reason = error.cause?.code || error.code || error.name;
    }
    if (attempt === 5) throw new Error(`${label}: ${reason}; failed after 5 attempts. Rerun to resume.`);
    warn(`${label}: ${reason}; retry ${attempt}/4`);
    await sleep(1000 * 2 ** (attempt - 1));
  }
}
