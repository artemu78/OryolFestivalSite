import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithEsbuild } from 'vite';

test('active browser entry logs the site version once in development and production', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const entry = html.match(/<script type="module" src="\/([^"?]+)"/)[1];
  const source = await readFile(new URL(`../${entry}`, import.meta.url), 'utf8');
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  for (const dev of [true, false]) {
    const { code } = await transformWithEsbuild(source.replace(/^import .*;\n/gm, ''), entry, {
      jsx: 'transform',
      define: {
        'import.meta.env.DEV': JSON.stringify(dev),
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
      },
    });
    const messages = [];
    vm.runInNewContext(code, {
      console: { log: (...args) => messages.push(args), error: assert.fail },
      document: { getElementById: () => ({ textContent: '{}' }) },
      React: { createElement: () => ({}) },
      Root: () => {},
      createRoot: () => ({ render() {} }),
      hydrateRoot() {},
    });
    assert.deepEqual(messages, [[`Version: ${pkg.version}`]]);
  }
});
