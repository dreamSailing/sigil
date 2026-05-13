// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('console', msg => { 
  console.log('CONSOLE:', msg.type(), msg.text().substring(0, 300));
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', err => { console.log('PAGE ERR:', err.message); errors.push(err.message); });
page.on('requestfailed', req => { console.log('REQ FAILED:', req.url()); });

await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));

console.log('\n=== FINAL BODY LENGTH:', (await page.evaluate(() => document.body.innerHTML)).length, '===');
await page.screenshot({ path: '/tmp/page-result2.png' });
await browser.close();
