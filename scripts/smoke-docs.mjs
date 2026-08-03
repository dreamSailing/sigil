import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const cwd = '/workspace';
const port = 4173;
const baseUrl = `http://127.0.0.1:${port}`;
const pages = ['#home', '#guide', '#api', '#components', '#comparison'];

function startServer() {
  const server = spawn('cargo', ['run', '--', 'serve', '-d', 'docs-site', '--port', String(port)], {
    cwd,
    env: { ...process.env, CI: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const logs = [];
  const onChunk = (chunk) => logs.push(chunk.toString());
  server.stdout.on('data', onChunk);
  server.stderr.on('data', onChunk);

  return { server, logs };
}

async function waitForServer(logs, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const joined = logs.join('');
    if (joined.includes('Ready! Open http://localhost:') || joined.includes(`http://localhost:${port}`)) {
      return;
    }
    await delay(250);
  }
  throw new Error(`Docs server did not become ready in ${timeoutMs}ms.\n${logs.join('')}`);
}

const { server, logs } = startServer();
const browser = await chromium.launch({ headless: true });

try {
  await waitForServer(logs);

  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.method()} ${request.url()}`);
  });

  for (const hash of pages) {
    await page.goto(`${baseUrl}/${hash}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.waitForFunction(() => document.body.innerText.length > 50, { timeout: 15000 });
    } catch (error) {
      throw new Error(
        [
          `Smoke page ${hash} did not render visible content.`,
          consoleErrors.length ? `Console errors:\n${consoleErrors.join('\n')}` : '',
          pageErrors.length ? `Page errors:\n${pageErrors.join('\n')}` : '',
          failedRequests.length ? `Request failures:\n${failedRequests.join('\n')}` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      );
    }
    const bodyLength = await page.evaluate(() => document.body.innerText.length);
    if (bodyLength < 50) {
      throw new Error(`Smoke page ${hash} rendered suspiciously little content (${bodyLength} chars).`);
    }
  }

  if (consoleErrors.length || pageErrors.length || failedRequests.length) {
    throw new Error(
      [
        consoleErrors.length ? `Console errors:\n${consoleErrors.join('\n')}` : '',
        pageErrors.length ? `Page errors:\n${pageErrors.join('\n')}` : '',
        failedRequests.length ? `Request failures:\n${failedRequests.join('\n')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    );
  }

  console.log('Docs smoke test passed.');
} finally {
  await browser.close();
  server.kill('SIGTERM');
  await delay(250);
  if (!server.killed) {
    server.kill('SIGKILL');
  }
}
