import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const directory=process.env.QA_OUTPUT||'docs/qa/night-adventure/scene';await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:process.env.QA_CHANNEL||'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1200,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/qa-scene',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Scene observation</title><style>body{margin:0;background:#122332}#scene{width:100vw;height:100vh}</style><div id="scene"></div><script type="module">import {createGrove} from "/src/grove.ts";window.sceneAPI=createGrove(document.getElementById("scene"),()=>{});</script></html>'}));
await page.route('**/src/grove.ts*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('function animate(now) {','globalThis.__dinoQA={scene,camera,renderer,animals,dinos,get mood(){return mood}};function animate(now) {');await route.fulfill({response,body});});
await page.goto('http://127.0.0.1:5173/qa-scene');await page.waitForFunction(()=>window.sceneAPI&&window.__dinoQA);
const report={durationSeconds:90,mode:'Real-time unmodified scene animation in a browser harness, followed by controlled drinking poses',samples:[],errors};
for(let t=0;t<=(process.env.QA_POSES_ONLY?0:90);t++){
 const sample=await page.evaluate(()=>window.__dinoQA.animals.map(a=>({id:a.id,x:a.x,z:a.z,yaw:a.yaw,behavior:a.behavior,distance:a.distance})));
 report.samples.push({elapsed:t,animals:sample,phase:await page.evaluate(()=>window.__dinoQA.mood)});
 if(t%30===0){await page.screenshot({path:`${directory}/natural-${String(t).padStart(3,'0')}.png`});console.log(`Observed ${t}s`,sample.map(a=>a.behavior).join(','));}
 if(t<90&&!process.env.QA_POSES_ONLY)await page.waitForTimeout(1000);
}
assert.equal(errors.length,0,'Natural rendering must have no page errors');
if(!process.env.QA_POSES_ONLY)assert(report.samples.some(s=>s.phase==='night'),'Real-time automatic cycle reaches night');
await page.evaluate(()=>window.sceneAPI.setMood('day'));
for(let id=0;id<5;id++){
 await page.evaluate(id=>{const q=window.__dinoQA;q.dinos.forEach((d,i)=>d.root.visible=i===id);const a=q.animals[id];q.dinos[id].legs.forEach(l=>{l.initialized=false;l.foot.position.copy(l.hip);l.foot.position.y=.04;l.foot.rotation.y=0;});a.x=4.4-1.65-a.r-.075;a.z=-3;a.yaw=Math.PI/2;a.manualTarget=null;a.path=[];a.behavior='drink';a.wait=8;a.greeting=0;window.sceneAPI.focus(id);},id);
 await page.waitForTimeout(1800);await page.screenshot({path:`${directory}/controlled-drink-${id}.png`});
}
report.passed=errors.length===0;
await fs.writeFile(`${directory}/${process.env.QA_POSES_ONLY?'pose-observation':'observation'}.json`,JSON.stringify(report,null,2)+'\n');await browser.close();
