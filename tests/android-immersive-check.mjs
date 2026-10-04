import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from 'playwright';

// Explicit emulator selection protects unrelated connected physical devices.
const run=promisify(execFile);
const serial=process.env.ANDROID_SERIAL;
assert(/^emulator-\d+$/.test(serial||''),'ANDROID_SERIAL must name an emulator');
const adb=process.env.ADB||'/Users/weiqi/Library/Android/sdk/platform-tools/adb';
const app='com.breezelife.dinogrove';
const profile=process.env.QA_ANDROID_PROFILE||'phone';
const output=process.env.QA_OUTPUT||`docs/qa/immersive/android/${profile}-fullscreen`;
const port=Number(process.env.QA_CDP_PORT||9224);
const quote=value=>"'"+String(value).replace(/'/g,"'\\''")+"'";
const shell=async(...args)=>(await run(adb,['-s',serial,'shell',args.map(quote).join(' ')],{maxBuffer:8*1024*1024})).stdout.trim();
const adbRun=(...args)=>run(adb,['-s',serial,...args],{maxBuffer:8*1024*1024});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
await fs.mkdir(output,{recursive:true});
const report={date:new Date().toISOString(),serial,profile,emulator:true,physicalDevice:false,checks:[],errors:[]};
let browser,page,frame={x:0,y:0,key:''};
async function connect(){
 let lastError;
 // Android may recreate the process while a new display density is applied.
 for(let attempt=0;attempt<8;attempt++){
  try{
   const pid=await shell('pidof',app);assert(pid,'App must be running');
   await adbRun('forward',`tcp:${port}`,`localabstract:webview_devtools_remote_${pid}`);
   browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{noDefaults:true,timeout:3000});
   page=browser.contexts()[0].pages()[0];assert(page,'Debug WebView is available');
   return page;
  }catch(error){lastError=error;await browser?.close().catch(()=>{});await delay(750);}
 }
 throw lastError;
}

const button=name=>page.getByRole('button',{name,exact:true});
async function nativeFrame(){
 const key=await page.evaluate(()=>`${innerWidth}x${innerHeight}`);
 if(key!==frame.key){
  await shell('uiautomator','dump','/sdcard/dino-qa-window.xml');
  const xml=await shell('cat','/sdcard/dino-qa-window.xml');
  const webview=xml.match(/class="android.webkit.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  assert(webview,'Native WebView frame');frame={x:Number(webview[1]),y:Number(webview[2]),key};
 }
 return frame;
}
async function tap(name){
 const buttonNode=button(name);await buttonNode.scrollIntoViewIfNeeded();await delay(250);
 // Read the slow native frame first, then sample current CSS bounds and scale.
 // Rotation/insets may settle while UI Automator waits for an idle frame.
 let f,sample;
 for(let attempt=0;attempt<4;attempt++){
  f=await nativeFrame();
  sample=await buttonNode.evaluate(node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:devicePixelRatio,key:`${innerWidth}x${innerHeight}`};});
  if(sample.key===f.key)break;
  frame.key='';
 }
 assert(sample.width&&sample.height&&sample.key===f.key,'Stable native tap frame: '+name);
 await shell('input','tap',String(Math.round(f.x+(sample.x+sample.width/2)*sample.scale)),String(Math.round(f.y+(sample.y+sample.height/2)*sample.scale)));
 await delay(220);
}

async function shot(name){
 await page?.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))).catch(()=>{});
 const {stdout}=await run(adb,['-s',serial,'exec-out','screencap','-p'],{encoding:'buffer',maxBuffer:20*1024*1024});
 await fs.writeFile(path.join(output,`${name}.png`),stdout);
}
async function layout(){return page.evaluate(()=>({
 viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,
 document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
 small:[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width&&!b.closest('dialog:not([open])')).filter(b=>{const r=b.getBoundingClientRect();return r.width<47.5||r.height<47.5;}).map(b=>b.getAttribute('aria-label')||b.textContent),
 canvas:(()=>{const c=document.querySelector('canvas'),g=c?.getContext('webgl2'),e=g?.getExtension('WEBGL_debug_renderer_info');return g?{size:[c.width,c.height],renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}:null;})(),
 platform:document.querySelector('main')?.dataset.platform,
 source:location.href,
 assets:[...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(n=>n.src||n.href),
 online:navigator.onLine,
}));}
try{
 report.android={version:await shell('getprop','ro.build.version.release'),api:await shell('getprop','ro.build.version.sdk')};
 report.apkSha256=(await shell('sha256sum',(await shell('pm','path',app)).replace(/^package:/,''))).split(/\s/)[0];
 await shell('settings','put','system','accelerometer_rotation','0');
 await shell('settings','put','system','user_rotation','0');
 await shell('wm','size',profile==='tablet'?'1600x2560':'1080x2340');
 await shell('wm','density',profile==='tablet'?'320':'440');
 await shell('am','force-stop',app);await shell('am','start','-n',app+'/.MainActivity');await delay(2000);await connect();
 await page.evaluate(()=>localStorage.setItem('dino-grove-locale','zh'));await page.reload();
 await button('全屏').waitFor();await delay(1200);report.normal=await layout();
 await page.evaluate(()=>{window.__nativeKeyEvents=[];addEventListener('keydown',event=>{setTimeout(()=>window.__nativeKeyEvents.push({key:event.key,prevented:event.defaultPrevented,time:performance.now(),state:{...document.querySelector('main').dataset}}),0)});});
 await tap('迅猛龙');await page.getByRole('region',{name:'迅猛龙介绍'}).waitFor({timeout:5000});await tap('全屏');await delay(1200);
 await shell('uiautomator','dump','/sdcard/dino-fullscreen-tip.xml');
 const systemUi=await shell('cat','/sdcard/dino-fullscreen-tip.xml');
 const tipNode=systemUi.match(/<node[^>]*text="Got it"[^>]*>/)?.[0];
 if(tipNode){const bounds=tipNode.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);assert(bounds);await shot('first-system-fullscreen-tip');await shell('input','tap',String((Number(bounds[1])+Number(bounds[3]))/2),String((Number(bounds[2])+Number(bounds[4]))/2));await delay(1500);frame.key='';report.systemFullscreenTipDismissed=true;}
 assert.equal(await page.locator('main').getAttribute('data-immersive'),'true');
 assert.equal(await page.locator('main').getAttribute('data-fullscreen-mode'),'system');
 assert.equal(await page.locator('.control-panel').isVisible(),false);
 report.immersive=await layout();assert(report.immersive.viewport[1]>report.normal.viewport[1]+20,'Native system bars hide and viewport grows');assert.deepEqual(report.immersive.small,[]);
 await shot('fullscreen');report.checks.push('Native full screen hides Android system bars and auto-collapses menu');
 await tap('打开菜单');assert.equal(await page.locator('main').getAttribute('data-menu-open'),'true');
 await shell('input','keyevent','4');await delay(400);
 assert.equal(await page.locator('main').getAttribute('data-menu-open'),'false');assert.equal(await page.locator('main').getAttribute('data-immersive'),'true');
 await tap('打开菜单');await page.waitForFunction(()=>document.querySelector('main').dataset.menuOpen==='true');assert.equal(await page.evaluate(()=>getSelection()?.toString()),'','Game buttons do not trigger text-selection overlays');await tap('霸王龙');assert.equal(await page.locator('main').getAttribute('data-menu-open'),'false');
 await shot('selected-halo');report.checks.push('Native Back closes menu first; choosing resident collapses menu');
 await tap('拍摄场景照片');await page.getByRole('dialog').waitFor();await tap('存入相册');
 await page.waitForFunction(()=>document.querySelector('.photo-feedback')?.textContent.includes('已存入相册'));
 await shot('fullscreen-photo-saved');
 await shell('input','keyevent','4');await delay(400);assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.locator('main').getAttribute('data-immersive'),'true');
 report.checks.push('Framed photo saves through MediaStore in immersive mode; Back closes photo before full screen');
 await shell('settings','put','system','user_rotation','1');await delay(1800);report.landscape=await layout();assert(report.landscape.viewport[0]>report.landscape.viewport[1]);assert.deepEqual(report.landscape.small,[]);assert.equal(await page.locator('main').getAttribute('data-immersive'),'true');
 await tap('打开菜单');await page.waitForFunction(()=>document.querySelector('main').dataset.menuOpen==='true');await delay(400);await shot('landscape-menu');await tap('关闭菜单');await page.waitForFunction(()=>document.querySelector('main').dataset.menuOpen==='false');await delay(400);await shot('landscape-fullscreen');
 await shell('settings','put','system','user_rotation','0');await page.waitForFunction(()=>innerHeight>innerWidth);await delay(1300);
 await nativeFrame();
 report.beforeExit=await page.evaluate(()=>({...document.querySelector('main').dataset}));
 await shell('input','keyevent','4');
 await page.waitForFunction(()=>document.querySelector('main').dataset.immersive==='false',{},{timeout:5000});await delay(600);
 assert.equal(await page.locator('main').getAttribute('data-immersive'),'false');report.restored=await layout();assert.deepEqual(report.restored.viewport,report.normal.viewport,'System bars and ordinary viewport restore');
 assert(await page.getByRole('region',{name:'霸王龙介绍'}).isVisible());
 await shell('input','keyevent','4');await delay(300);assert.equal(await page.locator('.dino-card').count(),0);
 report.checks.push('Rotation retains immersive mode; Back restores bars, then closes the resident card');
 await tap('切换到英文');await tap('Full screen');await delay(500);await shot('english-fullscreen');await tap('Exit full screen');await delay(500);assert.equal(await page.locator('main').getAttribute('data-immersive'),'false');
 report.checks.push('English native fullscreen controls work');report.keyEvents=await page.evaluate(()=>window.__nativeKeyEvents);report.passed=true;console.log(`PASS native immersive ${profile}`);
}catch(error){report.passed=false;report.error=error.stack;report.keyEvents=await page?.evaluate(()=>window.__nativeKeyEvents).catch(()=>null);report.failedState=await page?.evaluate(()=>({...document.querySelector('main').dataset})).catch(()=>null);await shot('failure').catch(()=>{});throw error;}
finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await adbRun('forward','--remove',`tcp:${port}`).catch(()=>{});}
