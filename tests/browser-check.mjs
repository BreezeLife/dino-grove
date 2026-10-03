import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// Run against a running dev server or a deployed static site. QA hooks are only
// injected into the dev response when QA_INSTRUMENT=1; production is unchanged.
const url = process.env.QA_URL || 'http://127.0.0.1:5173/';
const output = process.env.QA_OUTPUT || 'docs/qa/local';
const instrument = process.env.QA_INSTRUMENT === '1';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.QA_CHANNEL || 'chrome', headless: true });
const report = { url, date: new Date().toISOString(), browser: browser.version(), mobileIsEmulated: true, checks: [] };
const settle = page => page.waitForTimeout(1000);
async function layout(page) {
  return page.evaluate(() => {
    const elements = [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width);
    const out = elements.filter(b => { const r=b.getBoundingClientRect();return r.left < -1 || r.top < -1 || r.right > innerWidth+1 || r.bottom > innerHeight+1; }).map(b => b.getAttribute('aria-label') || b.textContent);
    const small = elements.filter(b => { const r=b.getBoundingClientRect();return r.width<43.5 || r.height<43.5; }).map(b => b.getAttribute('aria-label') || b.textContent);
    const host=document.querySelector('.canvas-host').getBoundingClientRect();
    return { viewport:[innerWidth,innerHeight], document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight], out, small, scene:{x:host.x,y:host.y,width:host.width,height:host.height} };
  });
}
async function screenshot(page, name) { await page.screenshot({ path:path.join(output, name+'.png') }); }
async function camera(page) { return page.evaluate(() => window.__dinoQA?.camera.matrixWorld.elements.slice() ?? null); }
const touchSessions=new WeakMap();
async function touch(page, points, type) {
  if(!touchSessions.has(page))touchSessions.set(page,await page.context().newCDPSession(page));
  await touchSessions.get(page).send('Input.dispatchTouchEvent', {type,touchPoints:points});
}
try {
  for (const [width,height,mobile] of [[1440,900,false],[390,844,true],[320,568,true],[844,390,true]].filter(v=>!process.env.QA_VIEWPORT||`${v[0]}x${v[1]}`===process.env.QA_VIEWPORT)) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
    const page=await context.newPage();const errors=[],failed=[],httpErrors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
    page.on('requestfailed',r=>failed.push({url:r.url(),reason:r.failure()?.errorText}));
    page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
    await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const context=original.apply(this,args);if(context&&String(args[0]).startsWith('webgl'))window.__qaGL=context;return context;};});
    if(instrument)await page.route('**/src/grove.ts*',async route=>{const response=await route.fetch();let body=await response.text();assert(body.includes('function animate(now) {'),'Dev scene instrumentation point exists');body=body.replace('function animate(now) {','globalThis.__dinoQA={scene,camera,renderer,animals,dinos};function animate(now) {');await route.fulfill({response,body});});
    await page.goto(url,{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'暂停漫游',exact:true}).waitFor({state:'visible'});
    await page.waitForFunction(()=>!document.querySelector('.loading')&&document.querySelector('canvas'));
    await settle(page);
    const name=`${width}x${height}`;
    const entry={viewport:name,mobile,initial:await layout(page),actions:[]};
    assert.deepEqual(entry.initial.out,[],`${name}: all initial controls fit`);
    assert.deepEqual(entry.initial.small,[],`${name}: minimum 44px targets`);
    assert.deepEqual(entry.initial.document,[width,height],`${name}: no document overflow`);
    entry.gpu=await page.evaluate(()=>{const gl=window.__qaGL,e=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),devicePixelRatio,canvas:[gl.canvas.width,gl.canvas.height]};});
    await screenshot(page,`${name}-initial`);
    await page.getByRole('button',{name:'暂停漫游',exact:true}).click();await settle(page);
    const frozen=await page.locator('canvas').screenshot();await page.waitForTimeout(450);
    assert(frozen.equals(await page.locator('canvas').screenshot()),`${name}: paused canvas is pixel stable`);
    entry.actions.push('pause freezes rendered canvas');
    // Actual model hit testing uses projected geometry only to choose coordinates;
    // selection still goes through real pointer events and the scene raycaster.
    if(instrument){
      const candidates=await page.evaluate(()=>{const q=window.__dinoQA,r=q.renderer.domElement.getBoundingClientRect(),d=q.dinos[0];return [d.head,...d.torso.children].filter(o=>o.isMesh||o===d.head).map(o=>{const p=o.getWorldPosition(d.root.position.clone()).project(q.camera);return {x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2};});});
      let picked=false;for(const p of candidates){await page.mouse.click(p.x,p.y);if(await page.locator('.dino-card').count()){picked=true;break;}}
      assert(picked,`${name}: actual 3D model is selectable`);
      await page.getByRole('button',{name:'关闭恐龙介绍'}).click();await settle(page);entry.actions.push('actual model picking');
    }
    await page.getByRole('button',{name:'继续漫游',exact:true}).click();
    for(const species of ['三角龙','剑龙','长颈龙']){
      await page.getByRole('button',{name:species,exact:true}).click();await settle(page);
      assert.equal(await page.getByRole('region',{name:`${species}介绍`}).count(),1);
      const selectedLayout=await layout(page);assert.deepEqual(selectedLayout.out,[],`${name} selected: controls fit`);assert.deepEqual(selectedLayout.small,[],`${name} selected: 44px targets`);
      assert(selectedLayout.scene.height>=180,`${name}: selection retains useful scene space`);
      await page.getByRole('button',{name:'靠近看',exact:true}).click();await settle(page);
      await page.getByRole('button',{name:'打招呼',exact:true}).click();await page.waitForTimeout(300);
      if(species==='三角龙')await screenshot(page,`${name}-interaction`);
      await page.getByRole('button',{name:'喂点心',exact:true}).click();await page.waitForTimeout(250);
      if(instrument)assert.equal(await page.evaluate(()=>window.__dinoQA.animals.find(a=>a.greeting>2.5&&a.behavior==='feed')?.behavior),'feed');
      await page.getByRole('button',{name:'关闭恐龙介绍'}).click();await settle(page);
      entry.actions.push(`${species}: select, focus, greet, feed, close`);
    }
    for(const preset of ['池畔','俯瞰','全景']){await page.getByRole('button',{name:preset,exact:true}).click();await settle(page);assert.equal(await page.getByRole('button',{name:preset,exact:true}).getAttribute('aria-pressed'),'true');}
    entry.actions.push('three camera presets');
    await page.getByRole('button',{name:'切换到落日',exact:true}).click();await settle(page);
    assert.equal(await page.locator('main').getAttribute('data-mood'),'sunset');await screenshot(page,`${name}-sunset`);
    await page.getByRole('button',{name:'切换到晨光',exact:true}).click();await settle(page);
    const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'保存场景照片',exact:true}).click();const download=await downloadPromise;await download.saveAs(path.join(output,`${name}-photo.png`));
    const png=await fs.readFile(path.join(output,`${name}-photo.png`));assert.equal(png.subarray(1,4).toString(),'PNG');assert(png.length>10000);entry.actions.push('day/sunset and PNG download');
    await page.getByRole('button',{name:'暂停漫游',exact:true}).click();await settle(page);
    const box=await page.locator('canvas').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
    const before=await camera(page);
    if(mobile){
      await touch(page,[{id:1,x,y}], 'touchStart');for(let i=1;i<=8;i++)await touch(page,[{id:1,x:x+6*i,y:y+2*i}],'touchMove');await touch(page,[],'touchEnd');
      await settle(page);if(instrument)assert.notDeepEqual(await camera(page),before,'single touch rotates camera');
      const beforePinch=await camera(page);await touch(page,[{id:1,x:x-25,y},{id:2,x:x+25,y}],'touchStart');for(let i=1;i<=6;i++)await touch(page,[{id:1,x:x-25-i*5,y},{id:2,x:x+25+i*5,y}],'touchMove');await touch(page,[],'touchEnd');await settle(page);if(instrument)assert.notDeepEqual(await camera(page),beforePinch,'two touch pinch changes camera');
      entry.actions.push('CDP single-touch rotate and two-touch pinch');
      const rotated={width:height,height:width};await page.setViewportSize(rotated);await settle(page);await screenshot(page,`${name}-rotated`);assert.deepEqual((await layout(page)).out,[],'rotation keeps controls in viewport');await page.setViewportSize({width,height});await settle(page);
    }else{
      await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+80,y+20,{steps:12});await page.mouse.up();await settle(page);if(instrument)assert.notDeepEqual(await camera(page),before,'mouse drag rotates camera');
      const beforeZoom=await camera(page);await page.mouse.wheel(0,-200);await settle(page);if(instrument)assert.notDeepEqual(await camera(page),beforeZoom,'wheel zoom changes camera');entry.actions.push('mouse drag and wheel zoom');
    }
    assert.equal(await page.locator('.dino-card').count(),0,'Dragging does not select a resident');
    await page.getByRole('button',{name:'回到初始视角',exact:true}).click();await settle(page);
    await page.getByRole('button',{name:'继续漫游',exact:true}).click();
    await page.getByRole('button',{name:'三角龙',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.locator('.dino-card').count(),0);entry.actions.push('reset and Escape');
    entry.performance=await page.evaluate(()=>new Promise(resolve=>{let start=performance.now(),last=start,frames=0,max=0;function tick(t){frames++;max=Math.max(max,t-last);last=t;if(t-start<5000)requestAnimationFrame(tick);else resolve({seconds:(t-start)/1000,fps:frames/((t-start)/1000),maxFrameMs:max});}requestAnimationFrame(tick);}));
    await page.getByRole('button',{name:'切换到英文',exact:true}).click();await settle(page);
    assert.equal(await page.locator('html').getAttribute('lang'),'en');
    await page.getByRole('button',{name:'Brachiosaurus',exact:true}).click();await settle(page);
    assert.equal(await page.locator('.dino-card h2').innerText(),'Brachiosaurus');
    await page.getByRole('button',{name:'Feed',exact:true}).click();
    assert.deepEqual((await layout(page)).out,[],`${name}: English controls fit`);
    assert.deepEqual((await layout(page)).small,[],`${name}: English 44px targets`);
    await screenshot(page,`${name}-english`);
    await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Switch to Chinese',exact:true}).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'),'en','Language persists after refresh');
    await page.getByRole('button',{name:'Switch to Chinese',exact:true}).click();
    assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');entry.actions.push('Chinese/English translation and persisted language');
    assert.deepEqual(errors,[],`${name}: no console/page errors`);assert.deepEqual(httpErrors,[],`${name}: all HTTP resources load`);assert.deepEqual(failed,[],`${name}: no failed requests`);
    entry.errors=errors;entry.failedRequests=failed;entry.httpErrors=httpErrors;entry.passed=true;report.checks.push(entry);console.log(`PASS ${name}: ${entry.performance.fps.toFixed(1)} FPS (${entry.gpu.renderer})`);
    await context.close();
  }
  const unavailable=await browser.newContext({viewport:{width:390,height:844}}),page=await unavailable.newPage();
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).startsWith('webgl')?null:original.call(this,type,...args);};});
  await page.goto(url);await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/WebGL/);assert(await page.getByRole('button',{name:'重新加载'}).isVisible());assert(await page.getByRole('button',{name:'三角龙',exact:true}).isDisabled());await screenshot(page,'webgl-unavailable');await unavailable.close();report.checks.push({name:'WebGL unavailable fallback',passed:true});
  report.passed=true;
}catch(error){report.passed=false;report.error=error.stack;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}finally{await fs.writeFile(path.join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
