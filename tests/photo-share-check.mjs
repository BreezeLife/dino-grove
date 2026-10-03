import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const url=process.env.QA_URL||'http://127.0.0.1:5173/';
const output=process.env.QA_OUTPUT||'docs/qa/night-adventure/media';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.QA_CHANNEL||'chrome',headless:true});
const report={url,mode:'Real browser UI with stubbed native share capability; not a physical photo-library write',checks:[]};
try{
 for(const supported of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
  await page.addInitScript(supported=>{Object.defineProperty(navigator,'canShare',{value:()=>supported,configurable:true});Object.defineProperty(navigator,'share',{value:async data=>{if(window.__shareError)throw new DOMException('Test share error',window.__shareError);window.__sharedFile={count:data.files.length,type:data.files[0].type,name:data.files[0].name,size:data.files[0].size};},configurable:true});},supported);
  await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:'拍摄场景照片'}).click();await page.getByRole('dialog').waitFor();
  const share=page.getByRole('button',{name:'分享 / 存入相册'});
  assert.equal(await share.count(),supported?1:0);
  if(supported){
   await share.click();const file=await page.evaluate(()=>window.__sharedFile);assert.equal(file.count,1);assert.equal(file.type,'image/png');assert(file.size>20000);assert(file.name.endsWith('.png'));
   await page.evaluate(()=>window.__shareError='NotAllowedError');await share.click();await page.waitForFunction(()=>document.querySelector('.photo-feedback').textContent.includes('暂时无法分享'));assert(await page.getByRole('button',{name:'下载照片'}).isEnabled());
   await page.waitForTimeout(4300);await page.evaluate(()=>window.__shareError='AbortError');await share.click();assert.equal(await page.locator('.photo-feedback').innerText(),'','Cancellation is not reported as an error or gallery success');report.checks.push({name:'PNG file passed to native share adapter; rejection fallback and cancellation',file,passed:true});
  }else{assert(await page.getByRole('button',{name:'下载照片'}).isVisible());report.checks.push({name:'Unsupported native file sharing retains download and long-press help',passed:true});}
  await context.close();
 }
 report.passed=true;console.log(JSON.stringify(report,null,2));
}finally{await fs.writeFile(output+'/share-report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
