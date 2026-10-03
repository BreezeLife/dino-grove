import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:process.env.QA_CHANNEL||'chrome',headless:true});
try{
 const page=await browser.newPage();
 await page.route('**/icon-workshop',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0"></body></html>'}));
 await page.goto('http://127.0.0.1:5173/icon-workshop');
 const images=await page.evaluate(async()=>{
  const {renderAppIcon}=await import('/scripts/app-icon.ts');const source=renderAppIcon(1024),image=new Image();image.src=source;await image.decode();
  const images={};
  for(const size of [1024,512,192,180,64,32]){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;canvas.getContext('2d').drawImage(image,0,0,size,size);images[size]=canvas.toDataURL('image/png').split(',')[1];}
  return images;
 });
 await fs.mkdir('public',{recursive:true});
 for(const [size,data] of Object.entries(images))await fs.writeFile(`public/app-icon-${size}.png`,Buffer.from(data,'base64'));
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><clipPath id="icon"><rect width="512" height="512" rx="112"/></clipPath></defs><image width="512" height="512" clip-path="url(#icon)" href="data:image/png;base64,${images[512]}"/></svg>\n`;
 await fs.writeFile('public/app-icon.svg',svg);await fs.writeFile('public/favicon.svg',svg.replace(images[512],images[64]));
 console.log('Generated procedural 3D app icon: 1024, 512, 192, 180, 64, 32 PNG + rounded SVG');
}finally{await browser.close();}
