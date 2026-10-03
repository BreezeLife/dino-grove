import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const url = process.env.QA_URL || 'http://127.0.0.1:5173/';
const output = process.env.QA_OUTPUT || 'docs/qa/night-adventure/safe-area';
const css = await fs.readFile(new URL('../src/globals.css', import.meta.url), 'utf8');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.QA_CHANNEL || 'chrome', headless: true });
const report = {
  url, date: new Date().toISOString(), browser: browser.version(),
  mode: 'Real Chrome with mobile touch emulation and CSS env() values substituted for safe-area geometry; not a physical iPhone or native standalone test',
  checks: [],
};
const button = (page, name) => page.getByRole('button', { name, exact: true });
const zero = { top: 0, right: 0, bottom: 0, left: 0 };
const cases = [
  { width: 1440, height: 900, row: 88, inset: { top: 59, right: 0, bottom: 34, left: 0 } },
  { width: 390, height: 844, row: 74, inset: { top: 59, right: 0, bottom: 34, left: 0 } },
  { width: 320, height: 568, row: 69, inset: { top: 47, right: 0, bottom: 34, left: 0 } },
  { width: 844, height: 390, row: 66, inset: { top: 0, right: 59, bottom: 21, left: 59 } },
];

async function measure(page, inset) {
  return page.evaluate(inset => {
    const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const header = document.querySelector('.topbar'), scene = document.querySelector('.scene-stage'), panel = document.querySelector('.control-panel');
    const top = rect(header), land = rect(scene), controls = rect(panel);
    const safe = r => r.left >= inset.left - .5 && r.right <= innerWidth - inset.right + .5 && r.top >= inset.top - .5 && r.bottom <= innerHeight - inset.bottom + .5;
    const headerContents = [...header.querySelectorAll('.brand, button')].map(el => ({ name: el.getAttribute('aria-label') || 'brand', ...rect(el) }));
    return {
      viewport: [innerWidth, innerHeight], document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      header: top, scene: land, panel: controls, headerContents,
      headerOutsideSafeArea: headerContents.filter(r => !safe(r)),
      headerOverlapsScene: headerContents.filter(r => r.bottom > land.top + .5),
      sceneOutsideSafeArea: !safe(land), panelOutsideSafeArea: !safe(controls),
      panelHorizontalOverflow: panel.scrollWidth > panel.clientWidth + 1,
    };
  }, inset);
}

async function tap(page, name, inset, actions) {
  const control = button(page, name);
  await control.scrollIntoViewIfNeeded();
  const point = await control.evaluate((el, inset) => {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { x, y, width: r.width, height: r.height, inside: r.left >= inset.left - .5 && r.right <= innerWidth - inset.right + .5 && r.top >= inset.top - .5 && r.bottom <= innerHeight - inset.bottom + .5, hit: !!hit && (hit === el || el.contains(hit)) };
  }, inset);
  assert(point.inside, `${name} is inside the safe-area rectangle`);
  assert(point.hit, `${name} is reachable without an overlapping element`);
  assert(point.width >= 43.5 && point.height >= 43.5, `${name} keeps a 44px touch target`);
  await page.touchscreen.tap(point.x, point.y);
  await page.waitForTimeout(100);
  actions.push(name);
}

try {
  for (const specimen of cases) {
    const { width, height, row, inset } = specimen;
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('canvas') && !document.querySelector('.loading'));
    const initial = await measure(page, zero);
    assert.equal(initial.header.height, row, 'Zero-inset header row remains unchanged');
    const replacement = css.replace(/env\(safe-area-inset-(top|right|bottom|left)\)/g, (_, side) => `${inset[side]}px`);
    await page.addStyleTag({ content: replacement });
    await page.waitForTimeout(200);
    const geometry = await measure(page, inset);
    assert.deepEqual(geometry.document, [width, height], 'Safe-area layout does not overflow the document');
    assert.deepEqual(geometry.headerOutsideSafeArea, [], 'Header content clears the notch and safe-area edges');
    assert.deepEqual(geometry.headerOverlapsScene, [], 'Header content does not overlap the scene');
    assert(!geometry.sceneOutsideSafeArea, 'Scene stays inside the safe-area rectangle');
    assert(!geometry.panelOutsideSafeArea, 'Scrollable panel stays inside the safe-area rectangle');
    assert(!geometry.panelHorizontalOverflow, 'Panel has no horizontal overflow');
    const name = `${width}x${height}`, entry = { viewport: name, inset, zeroInsetHeaderHeight: initial.header.height, geometry, actions: [] };
    report.checks.push(entry);
    await page.screenshot({ path: path.join(output, `${name}-initial.png`) });
    for (const action of ['暂停漫游', '继续漫游', '俯瞰', '全景', '霸王龙', '靠近看', '喂点心', '关闭恐龙介绍', '夜晚', '自动昼夜', '自动旋转', '自动旋转', '背景音乐', '背景音乐']) await tap(page, action, inset, entry.actions);
    await tap(page, '拍摄场景照片', inset, entry.actions);
    await page.getByRole('dialog').waitFor();
    await tap(page, '关闭照片预览', inset, entry.actions);
    await tap(page, '切换到英文', inset, entry.actions);
    await tap(page, 'Velociraptor', inset, entry.actions);
    await tap(page, 'Feed', inset, entry.actions);
    await tap(page, 'Close dinosaur details', inset, entry.actions);
    const english = await measure(page, inset);
    assert.deepEqual(english.headerOutsideSafeArea, [], 'English header clears the safe area');
    assert.deepEqual(english.headerOverlapsScene, [], 'English header does not overlap the scene');
    assert(!english.panelHorizontalOverflow, 'English panel has no horizontal overflow');
    await page.screenshot({ path: path.join(output, `${name}-english.png`) });
    assert.deepEqual(errors, [], 'No browser errors');
    entry.errors = errors; entry.passed = true;
    console.log(`PASS ${name}, safe-area ${JSON.stringify(inset)}`);
    await context.close();
  }
  report.passed = true;
} catch (error) {
  report.passed = false; report.error = error.stack;
  for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  throw error;
} finally {
  await fs.writeFile(path.join(output, 'safe-area-report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
