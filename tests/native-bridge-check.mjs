import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const output='docs/qa/android-bridge';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.QA_CHANNEL||'chrome',headless:true});
const report={date:new Date().toISOString(),mode:'Real Chrome touch UI with stubbed Android save bridge; no actual MediaStore write',checks:[]};
try{
 for(const [width,height] of [[390,844],[800,1280],[1280,800]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__nativeCalls=[];window.__nativeSuccess=true;
   window.DinoGroveAndroid={savePhoto(data,filename,id){
    window.__nativeCalls.push({filename,id,signature:data.slice(0,11),bytes:atob(data).length});
    window.dispatchEvent(new CustomEvent('dino-grove-photo-result',{detail:{id:'unrelated',success:true}}));
    setTimeout(()=>window.dispatchEvent(new CustomEvent('dino-grove-photo-result',{detail:{id,success:window.__nativeSuccess}})),500);
   }};
  });
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'暂停漫游',exact:true}).waitFor();
  assert.equal(await page.locator('main').getAttribute('data-platform'),'android');
  const geometry=await page.evaluate(()=>({size:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],small:[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&(r.width<47.5||r.height<47.5)}).map(b=>b.textContent)}));
  assert.deepEqual(geometry.size,[width,height]);assert.deepEqual(geometry.small,[],'Android controls have 48px targets');
  await page.getByRole('button',{name:'拍摄场景照片',exact:true}).tap();
  const save=page.getByRole('button',{name:'存入相册',exact:true});await save.waitFor();
  const r=await save.boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
  assert(await page.getByRole('button',{name:'正在保存',exact:true}).isDisabled());
  await page.waitForFunction(()=>document.querySelector('.photo-feedback')?.textContent.includes('照片已存入相册'));
  const calls=await page.evaluate(()=>window.__nativeCalls);assert.equal(calls.length,1,'A pending save prevents duplicate taps');assert.equal(calls[0].signature,'iVBORw0KGgo');assert(calls[0].bytes>20000);assert(/^[A-Za-z0-9_-]+$/.test(calls[0].id));
  await page.screenshot({path:`${output}/${width}x${height}-saved.png`});
  await page.evaluate(()=>window.__nativeSuccess=false);await save.tap();
  await page.waitForFunction(()=>document.querySelector('.photo-feedback')?.textContent.includes('没有保存成功'));
  await page.getByRole('button',{name:'关闭照片预览',exact:true}).tap();
  await page.getByRole('button',{name:'切换到英文',exact:true}).tap();
  await page.getByRole('button',{name:'Take scene photo',exact:true}).tap();
  await page.evaluate(()=>window.__nativeSuccess=true);await page.getByRole('button',{name:'Save to Photos',exact:true}).tap();
  await page.waitForFunction(()=>document.querySelector('.photo-feedback')?.textContent.includes('Photo saved to'));
  await page.getByRole('button',{name:'Close photo preview',exact:true}).tap();
  assert.deepEqual(errors,[]);report.checks.push({viewport:`${width}x${height}`,geometry,photo:calls[0],checks:['48px targets','Actual framed PNG sent to bridge','Only matching save response accepted','Duplicate taps suppressed','Save failure reported','English save flow'],errors,passed:true});
  await context.close();
 }
 report.passed=true;console.log('PASS Android bridge UI: phone + portrait/landscape tablet');
}catch(error){report.passed=false;report.error=String(error.stack);throw error;}
finally{await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
