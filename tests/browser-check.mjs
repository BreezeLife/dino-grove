import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const url=process.env.QA_URL||'http://127.0.0.1:5173/';
const output=process.env.QA_OUTPUT||'docs/qa/night-adventure/local';
const instrument=process.env.QA_INSTRUMENT==='1';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.QA_CHANNEL||'chrome',headless:true});
const report={url,date:new Date().toISOString(),browser:browser.version(),mobileIsEmulated:true,checks:[]};
const settle=page=>page.waitForTimeout(1100);
const button=(page,name)=>page.getByRole('button',{name,exact:true});
const shot=(page,name)=>page.screenshot({path:path.join(output,name+'.png')});
const camera=page=>page.evaluate(()=>window.__dinoQA?.camera.matrixWorld.elements.slice()??null);
const viewports=process.env.QA_VIEWPORTS
 ? process.env.QA_VIEWPORTS.split(',').map(value=>{assert(/^\d{3,4}x\d{3,4}$/.test(value),'Viewport must be WIDTHxHEIGHT');const [width,height]=value.split('x').map(Number);return[width,height,true];})
 : [[1440,900,false],[390,844,true],[320,568,true],[844,390,true]];
const selectedViewports=viewports.filter(v=>!process.env.QA_VIEWPORT||`${v[0]}x${v[1]}`===process.env.QA_VIEWPORT);
assert(selectedViewports.length>0,'Requested viewport must exist in the test matrix');
async function layout(page){return page.evaluate(()=>{
 const buttons=[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width&&!b.closest('dialog:not([open])'));
 const small=buttons.filter(b=>{const r=b.getBoundingClientRect();return r.width<43.5||r.height<43.5;}).map(b=>b.getAttribute('aria-label')||b.textContent);
 // Offscreen controls inside the deliberately scrollable panel remain reachable.
 const outside=buttons.filter(b=>!b.closest('.control-panel, dialog')).filter(b=>{const r=b.getBoundingClientRect();return r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5;}).map(b=>b.getAttribute('aria-label')||b.textContent);
 const host=document.querySelector('.canvas-host').getBoundingClientRect(),panel=document.querySelector('.control-panel');
 return {document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],small,outside,scene:{x:host.x,y:host.y,width:host.width,height:host.height},panelOverflow:panel.scrollWidth>panel.clientWidth+1,labelSizes:[...document.querySelectorAll('.species-name')].map(n=>parseFloat(getComputedStyle(n).fontSize))};
});}
const sessions=new WeakMap();
async function touch(page,points,type){if(!sessions.has(page))sessions.set(page,await page.context().newCDPSession(page));await sessions.get(page).send('Input.dispatchTouchEvent',{type,touchPoints:points});}
async function canvasDrag(page,mobile,returnToStart=false){
 const r=await page.locator('canvas').boundingBox(),x=r.x+r.width*.5,y=r.y+r.height*.48;
 if(mobile){await touch(page,[{id:1,x,y}],'touchStart');for(let i=1;i<=8;i++)await touch(page,[{id:1,x:x+5*i,y:y+2*i}],'touchMove');if(returnToStart)await touch(page,[{id:1,x,y}],'touchMove');await touch(page,[],'touchEnd');}
 else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+60,y+20,{steps:10});if(returnToStart)await page.mouse.move(x,y,{steps:10});await page.mouse.up();}
}
async function pausedFrame(page){
 if(!instrument)return {png:(await page.locator('canvas').screenshot()).toString('base64'),state:null};
 return page.evaluate(()=>{
  const q=window.__dinoQA;q.renderer.render(q.scene,q.camera);
  const objects=[];q.scene.traverse(o=>{const materials=[].concat(o.material||[]);objects.push({id:o.id,type:o.type,matrix:o.matrixWorld.elements.slice(),visible:o.visible,color:o.color?.toArray(),intensity:o.intensity,materials:materials.map(m=>({id:m.id,color:m.color?.toArray(),opacity:m.opacity}))});});
  return {png:q.renderer.domElement.toDataURL('image/png').split(',')[1],state:{scene:q.scene.uuid,clock:q.clockState,camera:{position:q.camera.position.toArray(),quaternion:q.camera.quaternion.toArray(),matrix:q.camera.matrixWorld.elements.slice(),projection:q.camera.projectionMatrix.elements.slice(),target:q.controls.target.toArray()},animals:JSON.parse(JSON.stringify(q.animals)),objects}};
 });
}
async function pauseFailure(page,name,before,after,events){
 // Keep exact equality as the acceptance condition; diagnostics explain any failure.
 const pixels=await page.evaluate(async({before,after})=>{
  const read=async png=>{const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d');context.drawImage(image,0,0);return {width:canvas.width,height:canvas.height,data:context.getImageData(0,0,canvas.width,canvas.height).data};};
  const a=await read(before),b=await read(after);if(a.width!==b.width||a.height!==b.height)return {before:[a.width,a.height],after:[b.width,b.height],dimensionsChanged:true};
  let changedPixels=0,changedChannels=0,maxChannelDifference=0,totalDifference=0;
  for(let i=0;i<a.data.length;i+=4){let changed=false;for(let c=0;c<4;c++){const difference=Math.abs(a.data[i+c]-b.data[i+c]);if(difference){changed=true;changedChannels++;maxChannelDifference=Math.max(maxChannelDifference,difference);totalDifference+=difference;}}if(changed)changedPixels++;}
  return {width:a.width,height:a.height,changedPixels,changedChannels,maxChannelDifference,totalDifference};
 },{before:before.png,after:after.png});
 const changedStateKeys=before.state&&after.state?Object.keys(before.state).filter(key=>JSON.stringify(before.state[key])!==JSON.stringify(after.state[key])):null;
 const details={pixels,changedStateKeys,events,before:before.state,after:after.state};
 await Promise.all([
  fs.writeFile(path.join(output,`${name}-pause-before.png`),Buffer.from(before.png,'base64')),
  fs.writeFile(path.join(output,`${name}-pause-after.png`),Buffer.from(after.png,'base64')),
  fs.writeFile(path.join(output,`${name}-pause-diagnostics.json`),JSON.stringify(details,null,2)+'\n'),
 ]);
 return {pixels,changedStateKeys,events};
}
try{
 for(const [width,height,mobile] of selectedViewports){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
  const page=await context.newPage();const errors=[],failed=[],httpErrors=[],developmentEvents=[];
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())developmentEvents.push({type:'navigation',url:frame.url(),at:new Date().toISOString()});});
  page.on('websocket',socket=>socket.on('framereceived',event=>{try{const payload=JSON.parse(String(event.payload));if(['update','full-reload','error'].includes(payload.type))developmentEvents.push({type:payload.type,path:payload.path,triggeredBy:payload.triggeredBy,updates:payload.updates?.map(update=>({type:update.type,path:update.path})),at:new Date().toISOString()});}catch{/* Non-Vite websocket messages are irrelevant. */}}));
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>failed.push({url:r.url(),reason:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const gl=get.apply(this,args);if(gl&&String(args[0]).startsWith('webgl'))window.__qaGL=gl;return gl;};});
  if(instrument)await page.route('**/src/grove.ts*',async route=>{const response=await route.fetch();let body=await response.text();assert(body.includes('function animate(now) {'));body=body.replace('function animate(now) {','globalThis.__dinoQA={scene,camera,renderer,animals,dinos,controls,get clockState(){return {paused,time,mood,cycleClock,lightingChanged,nightAmount,autoRotate,cameraTransition:!!cameraTransition};}};function animate(now) {');await route.fulfill({response,body});});
  await page.goto(url,{waitUntil:'networkidle'});await button(page,'暂停漫游').waitFor();await page.waitForFunction(()=>document.querySelector('canvas')&&!document.querySelector('.loading'));await settle(page);
  const name=`${width}x${height}`,entry={viewport:name,mobile,initial:await layout(page),actions:[],errors,failedRequests:failed,httpErrors,developmentEvents};report.checks.push(entry);
  assert.deepEqual(entry.initial.document,[width,height],'No document overflow');assert.deepEqual(entry.initial.outside,[],'Fixed controls remain on screen');assert.deepEqual(entry.initial.small,[],'Minimum 44px tap targets');assert(!entry.initial.panelOverflow,'No horizontal panel overflow');assert(entry.initial.scene.height>=180,'Useful scene height');assert(entry.initial.labelSizes.every(n=>n>=16),'Readable dinosaur names');
  entry.gpu=await page.evaluate(()=>{const gl=window.__qaGL,e=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),devicePixelRatio,canvas:[gl.canvas.width,gl.canvas.height]};});
  await shot(page,`${name}-initial`);
  const dayTheme=await page.evaluate(()=>({page:getComputedStyle(document.querySelector('main')).backgroundColor,panel:getComputedStyle(document.querySelector('.control-panel')).backgroundColor,chrome:document.querySelector('meta[name="theme-color"]').content}));
  const appIcon=await page.locator('.brand-mark img').evaluate(img=>({loaded:img.complete&&img.naturalWidth>0,src:img.src}));assert(appIcon.loaded,'3D app icon is actually loaded');
  if(width===1440){const manifestResponse=await page.request.get(new URL('app.webmanifest',url).href);assert(manifestResponse.ok());const manifest=await manifestResponse.json();assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');for(const icon of manifest.icons){const iconResponse=await page.request.get(new URL(icon.src,url).href);assert(iconResponse.ok());assert.equal((await iconResponse.body()).subarray(1,4).toString(),'PNG');}entry.actions.push('3D brand icon, relative manifest and home-screen PNG icons');}
  await button(page,'白天').click();await settle(page);await button(page,'暂停漫游').click();await settle(page);
  await page.locator('.toast').waitFor({state:'hidden',timeout:6500});
  const frozen=await pausedFrame(page);await page.waitForTimeout(350);const still=await pausedFrame(page);
  if(still.png!==frozen.png)entry.pauseFailure=await pauseFailure(page,name,frozen,still,developmentEvents);
  assert(still.png===frozen.png,'Pause freezes actual rendered pixels');entry.pauseVerification={exactPngMatch:true,exactSceneStateMatch:instrument?JSON.stringify(frozen.state)===JSON.stringify(still.state):null,developmentEvents:developmentEvents.slice()};entry.actions.push('Pause freezes rendered scene');
  if(instrument){
   const points=await page.evaluate(()=>{const q=window.__dinoQA,r=q.renderer.domElement.getBoundingClientRect(),d=q.dinos[0];return [d.head,...d.torso.children].map(o=>{const v=o.getWorldPosition(d.root.position.clone()).project(q.camera);return{x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2};}).filter(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS');});
   let picked=false;for(const p of points){if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);if(await page.getByRole('region',{name:'三角龙介绍'}).count()){picked=true;break;}}
   assert(picked,'Real 3D model picking');await button(page,'关闭恐龙介绍').click();entry.actions.push('Real model selection through pointer and raycaster');
  }
  await button(page,'继续漫游').click();
  for(const species of ['三角龙','剑龙','长颈龙','霸王龙','迅猛龙']){
   await button(page,species).click();await page.getByRole('region',{name:species+'介绍'}).waitFor();
   await button(page,'靠近看').click();await settle(page);await button(page,'打招呼').click();await page.waitForTimeout(200);
   if(['霸王龙','迅猛龙'].includes(species))await shot(page,`${name}-${species==='霸王龙'?'trex':'raptor'}-closeup`);
   await button(page,'喂点心').click();await page.waitForTimeout(150);
   if(instrument)assert(await page.evaluate(()=>window.__dinoQA.animals.some(a=>a.greeting>2&&a.behavior==='feed')));
   const l=await layout(page);assert.deepEqual(l.small,[]);assert(!l.panelOverflow);assert(l.scene.height>=180);
   await button(page,'关闭恐龙介绍').click();await settle(page);entry.actions.push(`${species}: choose, close-up, greet, feed, close`);
  }
  for(const view of ['池畔','俯瞰','全景']){await button(page,view).click();await settle(page);assert.equal(await button(page,view).getAttribute('aria-pressed'),'true');}
  entry.actions.push('Three camera presets');
  await button(page,'夜晚').click();await page.waitForTimeout(2500);assert.equal(await page.locator('main').getAttribute('data-mood'),'night');assert((await page.locator('.phase-badge').innerText()).includes('月亮'));
  await page.locator('.control-panel').evaluate(p=>p.scrollTop=0);await shot(page,`${name}-night`);
  const nightTheme=await page.evaluate(()=>({page:getComputedStyle(document.querySelector('main')).backgroundColor,panel:getComputedStyle(document.querySelector('.control-panel')).backgroundColor,chrome:document.querySelector('meta[name="theme-color"]').content}));assert.notEqual(dayTheme.page,nightTheme.page,'Whole page changes with the time of day');assert.notEqual(dayTheme.panel,nightTheme.panel,'Control panel changes with the time of day');assert.notEqual(dayTheme.chrome,nightTheme.chrome,'Browser theme colour changes');entry.themes={day:dayTheme,night:nightTheme};
  if(instrument){const lights=await page.evaluate(()=>{const s=window.__dinoQA.scene;return{key:s.children.find(o=>o.isDirectionalLight).intensity,ambient:s.children.find(o=>o.isHemisphereLight).intensity};});assert(lights.key>=1&&lights.ambient>=2);entry.nightLights=lights;}
  await button(page,'傍晚').click();await settle(page);assert.equal(await page.locator('main').getAttribute('data-mood'),'sunset');await button(page,'自动昼夜').click();assert.equal(await button(page,'自动昼夜').getAttribute('aria-pressed'),'true');await button(page,'白天').click();await settle(page);
  entry.actions.push('Day, sunset, readable night and automatic cycle control');
  await button(page,'背景音乐').click();await page.waitForTimeout(500);assert.equal(await button(page,'背景音乐').getAttribute('aria-pressed'),'true');await button(page,'背景音乐').click();assert.equal(await button(page,'背景音乐').getAttribute('aria-pressed'),'false');entry.actions.push('Music starts on explicit tap and stops');
  const beforeAuto=await camera(page);await button(page,'自动旋转').click();await page.waitForTimeout(1600);assert.equal(await button(page,'自动旋转').getAttribute('aria-pressed'),'true');if(instrument)assert.notDeepEqual(await camera(page),beforeAuto);
  await canvasDrag(page,mobile);await settle(page);assert.equal(await button(page,'自动旋转').getAttribute('aria-pressed'),'false');entry.actions.push('Auto orbit, interrupted by manual mouse/touch');
  await button(page,'回到初始视角').click();await settle(page);
  if(instrument){
   await button(page,'暂停漫游').click();await button(page,'迅猛龙').click();await settle(page);
   // Ground points are projected for targeting only; movement comes from the real click/tap.
   const target=await page.evaluate(async()=>{const {safePoint}=await import('/src/navigation.mjs');const q=window.__dinoQA,a=q.animals[4],r=q.renderer.domElement.getBoundingClientRect();
    for(const distance of [2.6,3.3,4.1])for(let n=0;n<24;n++){const angle=n*Math.PI/12,x=a.x+Math.sin(angle)*distance,z=a.z+Math.cos(angle)*distance;if(!safePoint(x,z,a.r,q.animals,4))continue;
     const p=a.id===4?q.dinos[4].root.position.clone():null;p.set(x,.13,z);p.project(q.camera);const screen={x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2};if(document.elementFromPoint(screen.x,screen.y)?.tagName!=='CANVAS')continue;return{...screen,worldX:x,worldZ:z};}return null;});
   assert(target,'An accessible dry ground destination exists');entry.movement={requested:target,samples:[]};
   await page.evaluate(()=>{window.__qaMoveSamples=[];window.__qaMoveStarted={wall:performance.now(),scene:window.__dinoQA.clockState.time};});
   if(mobile)await page.touchscreen.tap(target.x,target.y);else await page.mouse.click(target.x,target.y);
   await page.waitForFunction(()=>window.__dinoQA.animals[4].manualTarget!==null,{},{timeout:3000});
   assert.equal(await button(page,'暂停漫游').count(),1,'Move resumes paused world');await shot(page,`${name}-point-to-move`);
   try{await page.waitForFunction(()=>{const q=window.__dinoQA,wall=(performance.now()-window.__qaMoveStarted.wall)/1000,samples=window.__qaMoveSamples;
    if(!samples.length||wall-samples[samples.length-1].wall>=1)samples.push({wall,scene:q.clockState.time-window.__qaMoveStarted.scene,paused:q.clockState.paused,animals:q.animals.map(a=>({id:a.id,x:a.x,z:a.z,yaw:a.yaw,status:a.moveStatus,speed:a.speed,manualTarget:a.manualTarget?{...a.manualTarget}:null,path:a.path.map(point=>({...point})),behavior:a.behavior,blocked:a.blocked}))});
    return q.animals[4].moveStatus==='arrived';},{},{timeout:30000});}
   finally{entry.movement.samples=await page.evaluate(()=>window.__qaMoveSamples);}
   const end=await page.evaluate(()=>{const q=window.__dinoQA,a=q.animals[4];return{x:a.x,z:a.z,status:a.moveStatus,wallSeconds:(performance.now()-window.__qaMoveStarted.wall)/1000,sceneSeconds:q.clockState.time-window.__qaMoveStarted.scene};});entry.movement.result=end;assert(Math.hypot(end.x-target.worldX,end.z-target.worldZ)<.2,'Selected dinosaur really reaches tapped location');
   assert((await page.locator('.walk-hint').innerText()).includes('到达'));entry.actions.push(`${mobile?'Touch tap':'Mouse click'} ground -> movement -> actual arrival`);
   // Return a drag to its start position: max travel still prevents a false command.
   const before=await page.evaluate(()=>window.__dinoQA.animals[4].moveStatus);await canvasDrag(page,mobile,true);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__dinoQA.animals[4].manualTarget),null,'Drag out and back is not a command');entry.actions.push('Drag return does not issue movement');
   await button(page,'关闭恐龙介绍').click();
  }
  await button(page,'暂停漫游').click();await settle(page);const beforeGesture=await camera(page);await canvasDrag(page,mobile);await settle(page);if(instrument)assert.notDeepEqual(await camera(page),beforeGesture);
  const r=await page.locator('canvas').boundingBox(),x=r.x+r.width*.5,y=r.y+r.height*.48,beforeZoom=await camera(page);
  if(mobile){await touch(page,[{id:1,x:x-25,y},{id:2,x:x+25,y}],'touchStart');for(let i=1;i<=6;i++)await touch(page,[{id:1,x:x-25-i*4,y},{id:2,x:x+25+i*4,y}],'touchMove');await touch(page,[],'touchEnd');}
  else{await page.mouse.move(x,y);await page.mouse.wheel(0,-200);}
  await settle(page);if(instrument)assert.notDeepEqual(await camera(page),beforeZoom);assert.equal(await page.locator('.dino-card').count(),0,'Dragging does not select');
  if(mobile){await page.setViewportSize({width:height,height:width});await settle(page);assert.deepEqual((await layout(page)).outside,[]);await shot(page,`${name}-rotated`);await page.setViewportSize({width,height});await settle(page);}
  entry.actions.push('Rotate, zoom/pinch and orientation');await button(page,'继续漫游').click();await button(page,'回到初始视角').click();await settle(page);
  await button(page,'拍摄场景照片').click();await page.getByRole('dialog',{name:'小丛林纪念照'}).waitFor();
  const photo=await page.locator('.photo-preview').evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight,src:img.src}));assert(photo.width>=820&&photo.height>200&&photo.src.startsWith('blob:'));await shot(page,`${name}-photo-preview`);
  const downloadPromise=page.waitForEvent('download');await button(page,'下载照片').click();const download=await downloadPromise;await download.saveAs(path.join(output,`${name}-photo.png`));const png=await fs.readFile(path.join(output,`${name}-photo.png`));assert.equal(png.subarray(1,4).toString(),'PNG');assert(png.length>20000);
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'拍摄场景照片');entry.actions.push('Framed scene PNG preview/download, Escape and focus return');
  await button(page,'三角龙').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.dino-card').count(),0);
  entry.performance=await page.evaluate(()=>new Promise(resolve=>{const start=performance.now();let last=start,frames=0,max=0;function tick(t){frames++;max=Math.max(max,t-last);last=t;if(t-start<5000)requestAnimationFrame(tick);else resolve({seconds:(t-start)/1000,fps:frames/((t-start)/1000),maxFrameMs:max});}requestAnimationFrame(tick);}));
  await button(page,'切换到英文').click();assert.equal(await page.locator('html').getAttribute('lang'),'en');await button(page,'Tyrannosaurus').click();await button(page,'Feed').click();assert.equal(await page.locator('.dino-card h2').innerText(),'Tyrannosaurus');await button(page,'Night').click();await settle(page);await page.locator('.control-panel').evaluate(p=>p.scrollTop=0);
  const english=await layout(page);assert.deepEqual(english.small,[]);assert.deepEqual(english.outside,[]);assert(!english.panelOverflow);await shot(page,`${name}-english`);
  await page.reload({waitUntil:'networkidle'});await button(page,'Switch to Chinese').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'en');await button(page,'Switch to Chinese').click();entry.actions.push('Bilingual five residents, new features and persisted language');
  assert.deepEqual(errors,[],`${name}: browser errors`);assert.deepEqual(httpErrors,[],`${name}: resource errors`);assert.deepEqual(failed,[],`${name}: failed requests`);entry.passed=true;console.log(`PASS ${name}: ${entry.performance.fps.toFixed(1)} FPS`);await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).startsWith('webgl')?null:get.call(this,type,...args);};});await page.goto(url);await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/WebGL/);assert(await button(page,'重新加载').isVisible());assert(await button(page,'霸王龙').isDisabled());await shot(page,'webgl-unavailable');await context.close();report.checks.push({name:'WebGL unavailable fallback',passed:true});report.passed=true;
}catch(error){report.passed=false;report.error=error.stack;for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}
finally{await fs.writeFile(path.join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
