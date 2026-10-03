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
const output=process.env.QA_OUTPUT||`docs/qa/android/${profile}`;
const port=Number(process.env.QA_CDP_PORT||9224);
const quote=value=>"'"+String(value).replace(/'/g,"'\\''")+"'";
const shell=async(...args)=>(await run(adb,['-s',serial,'shell',args.map(quote).join(' ')],{maxBuffer:8*1024*1024})).stdout.trim();
const adbRun=(...args)=>run(adb,['-s',serial,...args],{maxBuffer:8*1024*1024});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
await fs.mkdir(output,{recursive:true});
const report={date:new Date().toISOString(),serial,profile,emulator:true,physicalDevice:false,checks:[],errors:[]};
let browser,page,frame={x:0,y:0,key:''};
async function connect(){
 const pid=await shell('pidof',app);assert(pid,'App must be running');
 await adbRun('forward',`tcp:${port}`,`localabstract:webview_devtools_remote_${pid}`);
 browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{noDefaults:true});
 page=browser.contexts()[0].pages()[0];assert(page,'Debug WebView is available');
 return page;
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
 const b=button(name);await b.scrollIntoViewIfNeeded();await delay(250);const r=await b.evaluate(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};});assert(r.width&&r.height,name);
 const scale=await page.evaluate(()=>devicePixelRatio);
 const f=await nativeFrame();
 // Native Android tap exercises actual WebView touch dispatch.
 await shell('input','tap',String(Math.round(f.x+(r.x+r.width/2)*scale)),String(Math.round(f.y+(r.y+r.height/2)*scale)));
 await delay(220);
}
async function shot(name){
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
 report.android={version:await shell('getprop','ro.build.version.release'),api:await shell('getprop','ro.build.version.sdk'),abi:await shell('getprop','ro.product.cpu.abi'),webview:await shell('dumpsys','webviewupdate')};
 report.apkSha256=(await shell('sha256sum',(await shell('pm','path',app)).replace(/^package:/,''))).split(/\s/)[0];
 await shell('cmd','connectivity','airplane-mode','enable');await shell('svc','wifi','disable');await shell('svc','data','disable');
 await shell('am','force-stop',app);await shell('am','start','-n',`${app}/.MainActivity`);
 await delay(4500);await connect();
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.reload();await page.locator('canvas').waitFor({timeout:30000});await delay(1500);
 // Attach meters before the user starts music; no production source is changed.
 await page.evaluate(()=>{
  globalThis.__androidQA={visibility:[],audio:[],blobs:new Map()};
  const create=URL.createObjectURL;URL.createObjectURL=blob=>{const url=create.call(URL,blob);window.__androidQA.blobs.set(url,blob);return url;};
  window.addEventListener('dino-grove-native-visibility',e=>window.__androidQA.visibility.push(e.detail));
  const Audio=window.AudioContext;window.AudioContext=class extends Audio {constructor(...a){super(...a);const meter=this.createAnalyser();meter.fftSize=256;const connect=AudioNode.prototype.connect;const ctx=this;AudioNode.prototype.connect=function(to,...args){const v=connect.call(this,to,...args);if(to===ctx.destination)connect.call(this,meter);return v;};window.__androidQA.audio.push({context:this,meter});}};
 });
 if(await button('Switch to Chinese').count()){await tap('Switch to Chinese');}
 report.initial=await layout();assert(report.initial.canvas,'Real WebGL2 context');assert.equal(report.initial.platform,'android');assert(report.initial.source.startsWith('https://appassets.androidplatform.net/assets/'));
 report.offline={wifi:await shell('cmd','wifi','status'),airplaneMode:await shell('settings','get','global','airplane_mode_on'),requestedPermissions:(await shell('dumpsys','package',app)).split('requested permissions:')[1]?.split('install permissions:')[0]?.trim()||'none'};
 assert(report.offline.wifi.includes('disabled'));assert.equal(report.offline.airplaneMode,'1');assert(!report.offline.requestedPermissions.includes('android.permission.INTERNET'));
 assert.deepEqual(report.initial.document,report.initial.viewport,'No page overflow');assert.deepEqual(report.initial.small,[],'Android targets at least48 CSS px');
 report.checks.push('APK starts offline from bundled HTTPS assets, real WebGL2 renders, Android 48px targets');await shot('initial');
 for(const d of ['三角龙','剑龙','长颈龙','霸王龙','迅猛龙']){await tap(d);await page.getByRole('region',{name:d+'介绍'}).waitFor();await tap('打招呼');await tap('喂点心');await tap('关闭恐龙介绍');}
 report.checks.push('All five residents selected/greeted/fed by Android input taps');
 await tap('俯瞰');await delay(1300);await tap('迅猛龙');
 let moving=false;
 for(const [fx,fy] of [[.48,.57],[.38,.55],[.58,.61],[.40,.68]]){
  const r=await page.locator('canvas').boundingBox(),dpr=await page.evaluate(()=>devicePixelRatio),f=await nativeFrame();
  await shell('input','tap',String(Math.round(f.x+(r.x+r.width*fx)*dpr)),String(Math.round(f.y+(r.y+r.height*fy)*dpr)));await delay(450);
  if((await page.locator('.walk-hint').innerText()).includes('正在')){moving=true;break;}await tap('迅猛龙');
 }
 assert(moving,'Native ground touch starts movement');await shot('touch-move');
 await page.waitForFunction(()=>document.querySelector('.walk-hint')?.textContent.includes('到达'),{},{timeout:50000});
 report.checks.push('Native touch ground starts chosen raptor movement and actual arrival callback is displayed');
 await tap('关闭恐龙介绍');await tap('回到初始视角');
 const colors={};for(const [name,mood] of [['白天','day'],['傍晚','sunset'],['夜晚','night']]){await tap(name);await delay(2300);assert.equal(await page.locator('main').getAttribute('data-mood'),mood);colors[mood]=await page.locator('main').evaluate(n=>getComputedStyle(n).backgroundColor);await shot(mood);}
 assert.equal(new Set(Object.values(colors)).size,3);report.colors=colors;report.checks.push('Day/sunset/night change whole page and keep scene visible');
 await tap('自动旋转');assert.equal(await button('自动旋转').getAttribute('aria-pressed'),'true');const r=await page.locator('canvas').boundingBox(),dpr=await page.evaluate(()=>devicePixelRatio);
 const f=await nativeFrame();await shell('input','swipe',String(Math.round(f.x+(r.x+r.width*.45)*dpr)),String(Math.round(f.y+(r.y+r.height*.5)*dpr)),String(Math.round(f.x+(r.x+r.width*.65)*dpr)),String(Math.round(f.y+(r.y+r.height*.55)*dpr)),'350');await delay(700);assert.equal(await button('自动旋转').getAttribute('aria-pressed'),'false');
 report.checks.push('Automatic orbit starts and native touch drag interrupts it');
 const rms=()=>page.evaluate(()=>{const a=window.__androidQA.audio.at(-1);if(!a)return 0;const samples=new Float32Array(a.meter.fftSize);a.meter.getFloatTimeDomainData(samples);return Math.sqrt(samples.reduce((s,v)=>s+v*v,0)/samples.length);});
 await tap('背景音乐');assert.equal(await button('背景音乐').getAttribute('aria-pressed'),'true');await delay(900);report.music={playing:await rms()};assert(report.music.playing>0,'Real Android WebAudio signal');
 await shell('input','keyevent','KEYCODE_HOME');await delay(1400);report.music.background=await rms();assert(report.music.background<.0001,'Background silence');
 await shell('am','start','-n',`${app}/.MainActivity`);await delay(1700);report.music.resumed=await rms();assert(report.music.resumed>0,'Foreground music resumes');report.nativeVisibility=await page.evaluate(()=>window.__androidQA.visibility);
 await tap('背景音乐');await delay(500);report.music.stopped=await rms();assert(report.music.stopped<.0001);report.checks.push('Real Android WebAudio signal on/off, Home silences, foreground resumes');
 await tap('白天');await tap('拍摄场景照片');await page.getByRole('dialog',{name:'小丛林纪念照'}).waitFor();await shot('photo-preview');
 const image=await page.locator('.photo-preview').evaluate(async img=>{const bytes=new Uint8Array(await window.__androidQA.blobs.get(img.src).arrayBuffer());let s='';for(const b of bytes)s+=String.fromCharCode(b);return {base64:btoa(s),width:img.naturalWidth,height:img.naturalHeight};});
 await fs.writeFile(path.join(output,'expected-photo.png'),Buffer.from(image.base64,'base64'));
 await tap('存入相册');await page.waitForFunction(()=>document.querySelector('.photo-feedback')?.textContent.includes('已存入'),{},{timeout:20000});await shot('photo-saved');
 const media=await shell('content','query','--uri','content://media/external/images/media','--projection','_id:_display_name:relative_path:mime_type:_size');report.mediaStore=media;
 const files=(await shell('ls','-1','/sdcard/Pictures/Dino Grove')).split('\n').filter(n=>n.endsWith('.png'));assert(files.length,'Actual MediaStore PNG exists');
 let matching=null;for(const name of files.reverse()){const candidate=path.join(output,'saved-photo.png');await adbRun('pull',`/sdcard/Pictures/Dino Grove/${name}`,candidate);if((await fs.readFile(candidate)).equals(Buffer.from(image.base64,'base64'))){matching=name;break;}}
 assert(matching,'Actual gallery PNG bytes equal framed WebGL photo');report.photo={filename:matching,width:image.width,height:image.height,byteIdentical:true};report.checks.push('Native MediaStore write succeeds; pulled gallery PNG exactly matches full framed preview');
 await shell('input','keyevent','KEYCODE_BACK');await delay(350);assert.equal(await page.getByRole('dialog').count(),0,'Native Back closes photo');
 await tap('霸王龙');await shell('input','keyevent','KEYCODE_BACK');await delay(350);assert.equal(await page.locator('.dino-card').count(),0,'Native Back closes resident card');
 report.checks.push('Android Back closes photo dialog and resident card before exiting');
 report.invalidPhoto=await page.evaluate(()=>new Promise(resolve=>{const handler=e=>{if(e.detail?.id==='qa_invalid'){removeEventListener('dino-grove-photo-result',handler);resolve(e.detail);}};addEventListener('dino-grove-photo-result',handler);window.DinoGroveAndroid.savePhoto(btoa('not a PNG'),'bad.png','qa_invalid');}));assert.equal(report.invalidPhoto.success,false);assert.equal(report.invalidPhoto.error,'INVALID_IMAGE');
 report.externalFetch=await page.evaluate(()=>fetch('https://example.com/').then(r=>({status:r.status()})).catch(e=>({blocked:e.name})));assert(report.externalFetch.blocked||report.externalFetch.status===403);report.checks.push('Invalid native photo is rejected and external network fetch is blocked');
 await tap('切换到英文');assert.equal(await page.locator('html').getAttribute('lang'),'en');await tap('Tyrannosaurus');await tap('Feed');await shot('english');
 await shell('settings','put','system','accelerometer_rotation','0');await shell('settings','put','system','user_rotation','1');await delay(2000);report.landscape=await layout();assert.deepEqual(report.landscape.document,report.landscape.viewport);assert.deepEqual(report.landscape.small,[]);await shot('landscape');
 await tap('Take scene photo');await page.getByRole('dialog',{name:'A grove keepsake'}).waitFor();await shot('landscape-photo');await tap('Close photo preview');
 await shell('settings','put','system','user_rotation','0');await delay(1500);
 report.checks.push('English UI, phone/tablet landscape relayout and photo dialog remain usable');
 await page.reload();await button('Switch to Chinese').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'en');await tap('Switch to Chinese');
 report.checks.push('Language persists after WebView reload');
 assert.deepEqual(report.errors,[]);report.passed=true;await fs.rm(path.join(output,'failure.png'),{force:true});await fs.rm(path.join(output,'expected-photo.png'),{force:true});console.log(`PASS Android ${profile}`);
}catch(error){report.passed=false;report.failure=error.stack;if(page)await shot('failure').catch(()=>{});throw error;}
finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();}
