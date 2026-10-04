import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const url = process.env.QA_URL || 'http://127.0.0.1:5177/';
const output = process.env.QA_OUTPUT || 'docs/qa/immersive/browser';
const instrument = process.env.QA_INSTRUMENT !== '0';
const browser = await chromium.launch({ channel: process.env.QA_CHANNEL || 'chrome', headless: true });
const report = { date: new Date().toISOString(), url, browser: browser.version(), mobileIsEmulated: true, inputMethod: "Hit-tested real mouse/touch coordinates", checks: [] };
await fs.mkdir(output, { recursive: true });
const names = ['三角龙', '剑龙', '长颈龙', '霸王龙', '迅猛龙'];
const button = (page, name) => page.getByRole('button', { name, exact: true });
const delay = (page, ms = 400) => page.waitForTimeout(ms);
const shot = (page, name) => page.screenshot({ path: path.join(output, `${name}.png`) });
// Validate the visible hit target and send real input. Chrome's automated
// scrollIntoViewIfNeeded occasionally stalls even for already-visible controls.
const press = async (page, name, mobile) => {
  const control = button(page, name); await control.waitFor({ state: 'visible' });
  await control.evaluate(node => node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(500); // Allow the native compositor to finish scroll positioning.
  await control.evaluate(node => { window.__qaTrustedClick = false; node.addEventListener('click', event => { window.__qaTrustedClick = event.isTrusted; }, { once: true, capture: true }); });
  const target = await control.evaluate(node => {
    const r = node.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { x, y, width: r.width, height: r.height, enabled: !node.disabled && !node.closest('[inert]'), hittable: hit === node || node.contains(hit) };
  });
  assert(target.enabled && target.hittable && target.width > 0 && target.height > 0, 'Visible, enabled real input target: ' + name);
  if (mobile) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
  await page.waitForFunction(() => window.__qaTrustedClick === true, {}, { timeout: 5000 });
};
const tap = async (page, name, mobile) => {
  const reveal = ['暂停漫游', '继续漫游'].includes(name) && await page.locator('main').getAttribute('data-immersive') === 'true' && await page.locator('main').getAttribute('data-menu-open') === 'false';
  if (reveal) await press(page, '打开菜单', mobile);
  await press(page, name, mobile);
  if (reveal) await press(page, '关闭菜单', mobile);
};
async function sceneState(page) {
  return page.evaluate(() => {
    const q = window.__immersiveQA;
    const halo = q.scene.getObjectByName('selection-halo');
    const destination = q.scene.getObjectByName('movement-destination');
    const route = q.scene.getObjectByName('movement-route');
    const id = halo.userData.resident;
    return {
      halo: { visible: halo.visible, position: halo.position.toArray(), resident: id, scale: halo.scale.x },
      animal: id == null ? null : { x: q.animals[id].x, z: q.animals[id].z },
      destination: { visible: destination.visible, status: destination.userData.status },
      route: { visible: route.visible, arrows: route.children.filter(a => a.visible).length },
      fog: { near: q.scene.fog.near, far: q.scene.fog.far, islandDepth: -q.scene.children.find(o=>o.isGroup).position.clone().applyMatrix4(q.camera.matrixWorldInverse).z + 16 },
    };
  });
}
async function assertFullscreenLayout(page) {
  const result = await page.evaluate(() => {
    const main = document.querySelector('main');
    const canvas = document.querySelector('canvas').getBoundingClientRect();
    const controls = [...document.querySelectorAll('button')].filter(b => {
      const r = b.getBoundingClientRect();
      return r.width && r.height && !b.closest('[inert],dialog:not([open])');
    });
    const invalid = controls.filter(b => {
      if (b.closest('.control-panel')) return false;
      const r = b.getBoundingClientRect();
      return r.width < 43.5 || r.height < 43.5 || r.x < -.5 || r.y < -.5 || r.right > innerWidth + .5 || r.bottom > innerHeight + .5;
    }).map(b => b.getAttribute('aria-label') || b.textContent);
    return { immersive: main.dataset.immersive, viewport: [innerWidth, innerHeight], canvas: [canvas.x, canvas.y, canvas.width, canvas.height], invalid, scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight] };
  });
  assert.equal(result.immersive, 'true');
  assert.deepEqual(result.invalid, [], 'Immersive controls stay large and on screen');
  assert.deepEqual(result.scroll, result.viewport, 'No fullscreen page overflow');
  assert(result.canvas[2] >= result.viewport[0] - 4 && result.canvas[3] >= result.viewport[1] - 4, 'Scene fills immersive viewport');
  return result;
}
async function groundTarget(page) {
  return page.evaluate(async () => {
    const { safePoint } = await import('/src/navigation.mjs');
    const q = window.__immersiveQA, a = q.animals[4], r = q.renderer.domElement.getBoundingClientRect();
    for (const distance of [3, 3.5, 4]) for (let n = 0; n < 24; n++) {
      const angle = n * Math.PI / 12, x = a.x + Math.sin(angle) * distance, z = a.z + Math.cos(angle) * distance;
      if (!safePoint(x, z, a.r, q.animals, 4)) continue;
      const p = q.dinos[4].root.position.clone().set(x, .13, z).project(q.camera);
      const screen = { x: r.x + (p.x + 1) * r.width / 2, y: r.y + (1 - p.y) * r.height / 2 };
      if (document.elementFromPoint(screen.x, screen.y)?.tagName === 'CANVAS') return { ...screen, worldX: x, worldZ: z };
    }
    return null;
  });
}
try {
  const matrix = [[1440, 900, false, 'native'], [390, 844, true, 'native'], [320, 568, true, 'unsupported'], [844, 390, true, 'denied'], [800, 1280, true, 'unsupported'], [1280, 800, true, 'native']];
  for (const [width, height, mobile, mode] of matrix) {
    if (process.env.QA_VIEWPORT && process.env.QA_VIEWPORT !== `${width}x${height}`) continue;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    const page = await context.newPage();
    const entry = { viewport: `${width}x${height}`, mode, errors: [], failedRequests: [] }; report.checks.push(entry);
    page.on('pageerror', e => entry.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') entry.errors.push(m.text()); });
    page.on('requestfailed', r => entry.failedRequests.push(r.url()));
    if (mode !== 'native') await page.addInitScript(mode => {
      if (mode === 'unsupported') Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
      else Element.prototype.requestFullscreen = () => Promise.reject(new DOMException('Blocked by browser', 'NotAllowedError'));
    }, mode);
    if (instrument) await page.route('**/src/grove.ts*', async route => {
      const response = await route.fetch(); let body = await response.text();
      assert(body.includes('function animate(now) {'));
      body = body.replace('function animate(now) {', 'globalThis.__immersiveQA={scene,camera,renderer,animals,dinos};function animate(now) {');
      await route.fulfill({ response, body });
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    await button(page, '暂停漫游').waitFor();
    await tap(page, '白天', mobile);
    await tap(page, '迅猛龙', mobile);
    await delay(page, 3000);
    if (instrument) {
      const state = await sceneState(page);
      assert(state.halo.visible && state.halo.resident === 4, 'Selection halo persists after greeting');
      assert(Math.hypot(state.halo.position[0] - state.animal.x, state.halo.position[2] - state.animal.z) < .01, 'Halo follows feet');
    }
    await tap(page, '全屏', mobile); await delay(page, 900);
    entry.layout = await assertFullscreenLayout(page);
    assert.equal(await page.locator('.control-panel').isVisible(), false, 'Menu automatically collapses on entry');
    entry.nativeFullscreen = await page.evaluate(() => !!document.fullscreenElement);
    assert.equal(entry.nativeFullscreen, mode === 'native', 'Native fullscreen versus accessible fallback');
    await shot(page, `${entry.viewport}-fullscreen`);
    for (const [id, name] of names.entries()) {
      await tap(page, '打开菜单', mobile);
      await tap(page, name, mobile); await delay(page);
      assert.equal(await page.locator('.control-panel').isVisible(), false, 'Selecting a resident closes immersive menu');
      if (instrument) { const s = await sceneState(page); assert(s.halo.visible && s.halo.resident === id); }
    }
    if (instrument) {
      await tap(page, '暂停漫游', mobile);
      const target = await groundTarget(page); assert(target, 'Visible safe ground target');
      if (mobile) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
      await page.waitForFunction(() => window.__immersiveQA.animals[4].manualTarget);
      await delay(page, 150);
      const s = await sceneState(page); assert(s.halo.visible && s.destination.visible && s.route.arrows > 0, 'Halo, destination and route are clearly present together');
      assert(s.fog.islandDepth < s.fog.near, 'Portrait framing keeps the island clear of fog');
      entry.guidance = s;
      await tap(page, '暂停漫游', mobile); await delay(page, 500);
      const frame = () => page.evaluate(() => { const q = window.__immersiveQA; q.renderer.render(q.scene, q.camera); return q.renderer.domElement.toDataURL(); });
      const before = await frame(); await delay(page, 400); assert.equal(await frame(), before, 'Guidance respects exact pause');
      await shot(page, `${entry.viewport}-movement-guidance`);
      await tap(page, '继续漫游', mobile);
      await page.waitForFunction(() => window.__immersiveQA.animals[4].moveStatus === 'arrived', {}, { timeout: 30000 });
      const arrived = await sceneState(page); assert.equal(arrived.destination.status, 'arrived'); assert(arrived.halo.visible);
      await shot(page, `${entry.viewport}-arrived`); await delay(page, 1800);
      assert.equal((await sceneState(page)).destination.visible, false, 'Arrival marker fades while selection remains');
    }
    await tap(page, '打开菜单', mobile); await tap(page, '夜晚', mobile); await delay(page, 1300);
    await shot(page, `${entry.viewport}-menu-night`);
    await tap(page, '关闭菜单', mobile);
    await tap(page, '拍摄场景照片', mobile);
    await page.getByRole('dialog').waitFor(); await shot(page, `${entry.viewport}-photo`);
    await tap(page, '关闭照片预览', mobile); assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.locator('main').getAttribute('data-immersive'), 'true', 'Closing photo retains fullscreen');
    await tap(page, '退出全屏', mobile); await delay(page, 700);
    assert.equal(await page.locator('main').getAttribute('data-immersive'), 'false');
    assert(await page.locator('.control-panel').isVisible());
    await tap(page, '切换到英文', mobile);
    await tap(page, 'Full screen', mobile); await delay(page, 500);
    await assertFullscreenLayout(page); await shot(page, `${entry.viewport}-english`);
    // Browser/system exit must synchronize the UI. Fallback uses Escape.
    if (await page.evaluate(() => !!document.fullscreenElement)) await page.evaluate(() => document.exitFullscreen());
    else await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('main').dataset.immersive === 'false');
    assert.deepEqual(entry.errors, []); assert.deepEqual(entry.failedRequests, []);
    entry.passed = true; console.log(`PASS immersive ${entry.viewport} ${mode}`); await context.close();
  }
  report.passed = true;
} catch (error) {
  report.passed = false; report.error = error.stack;
  for (const context of browser.contexts()) for (const page of context.pages()) await shot(page, 'failure').catch(() => {});
  throw error;
} finally {
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
