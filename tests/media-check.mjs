import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const origin=process.env.QA_URL || 'http://127.0.0.1:5173/';
const output=process.env.QA_OUTPUT || 'docs/qa/night-adventure/media';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.QA_CHANNEL || 'chrome',headless:true});
const report={date:new Date().toISOString(),url:origin,checks:[]};
try {
 const page=await browser.newPage({viewport:{width:1200,height:800}});
 await page.route('**/qa-media',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Media verification</title><body></body></html>'}));
 await page.goto(new URL('qa-media',origin).href);
 const photo=await page.evaluate(async()=>{
  const {createFramedPhoto,formatCaptureTime}=await import('/src/photo.ts');
  const source=document.createElement('canvas');source.width=1000;source.height=650;
  const ctx=source.getContext('2d');ctx.fillStyle='#347b69';ctx.fillRect(0,0,1000,650);ctx.fillStyle='#ffd978';ctx.fillRect(100,100,100,100);
  const date=new Date(2026,9,3,16,5,9),result=await createFramedPhoto(source.toDataURL('image/png'),'zh',date);
  const image=new Image();image.src=result.url;await image.decode();
  const decoded=document.createElement('canvas');decoded.width=image.width;decoded.height=image.height;
  const dc=decoded.getContext('2d');dc.drawImage(image,0,0);
  const centre=[...dc.getImageData(Math.floor(image.width/2),Math.floor(image.height/2),1,1).data];
  const background=[...dc.getImageData(2,2,1,1).data];
  window.__mediaPhoto=result;
  document.body.innerHTML='';document.body.style='margin:0;background:#122332;display:flex;justify-content:center';
  image.style='max-width:100%;max-height:100vh;object-fit:contain';document.body.append(image);
  return {width:image.naturalWidth,height:image.naturalHeight,mime:result.blob.type,bytes:result.blob.size,takenAt:result.takenAt,filename:result.filename,centre,background,expected:formatCaptureTime(date)};
 });
 assert.equal(photo.mime,'image/png');assert.equal(photo.takenAt,photo.expected);assert(photo.takenAt.startsWith('2026.10.03  16:05:09'));assert(photo.width>=1000 && photo.height>650);assert.deepEqual(photo.centre,[52,123,105,255]);assert.deepEqual(photo.background,[18,35,50,255]);
 await page.screenshot({path:path.join(output,'photo-frame.png')});
 report.checks.push({name:'PNG frame, full scene preserved, device-local time and timezone',...photo,passed:true});
 await page.evaluate(()=>URL.revokeObjectURL(window.__mediaPhoto.url));
 // Real browser audio graph, measured at its destination. This verifies samples,
 // not speaker audibility or the subjective quality of the melody.
 await page.evaluate(()=>{
  const Audio=window.AudioContext;
  window.AudioContext=class extends Audio{constructor(...args){super(...args);window.__audioContext=this;window.__audioMeter=this.createAnalyser();window.__audioMeter.fftSize=2048;}};
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(target,...args){const result=connect.call(this,target,...args);if(target===window.__audioContext?.destination)connect.call(this,window.__audioMeter);return result;};
 });
 await page.setContent('<button id="play">Play</button><button id="stop">Stop</button>');
 await page.evaluate(async()=>{
  const {createGroveMusic}=await import('/src/music.ts');window.__music=createGroveMusic();
  document.querySelector('#play').onclick=()=>{window.__start=window.__music.start();};document.querySelector('#stop').onclick=()=>window.__music.stop();
 });
 await page.click('#play');await page.evaluate(()=>window.__start);await page.waitForTimeout(800);
 async function meter(){return page.evaluate(()=>{const meter=window.__audioMeter,data=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(data);return {state:window.__audioContext.state,rms:Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length),peak:Math.max(...data.map(Math.abs))};});}
 const playing=await meter();assert.equal(playing.state,'running');assert(playing.rms>.00001 && playing.peak<1,'Music produces non-clipped samples');
 await page.click('#stop');await page.waitForTimeout(1500);const stopped=await meter();assert(stopped.rms<.00001,'Stop silences actual samples');
 await page.click('#play');await page.evaluate(()=>window.__start);await page.waitForTimeout(500);const restarted=await meter();assert(restarted.rms>.00001);
 await page.evaluate(()=>window.__music.dispose());await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__audioContext.state),'closed');
 report.checks.push({name:'Real Web Audio graph starts from click, emits samples, stops, restarts, disposes',playing,stopped,restarted,passed:true});
 report.passed=true;
 console.log(JSON.stringify(report,null,2));
} catch(error){report.passed=false;report.error=String(error.stack);throw error;}
finally{await fs.writeFile(path.join(output,'media-report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
