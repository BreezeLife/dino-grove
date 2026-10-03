import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as THREE from "three";
import {seededRandom,createWanderers,updateWanderers,safePoint,OBSTACLES,POND} from "../src/navigation.mjs";
const results=[];
const residents=createWanderers();
assert.equal(residents.length,3,"The grove must retain its three original residents");
residents.forEach((a,i)=>assert(safePoint(a.x,a.z,a.r,residents,i),"Resident starts must not overlap: "+i));
const initialState=JSON.stringify(residents);
updateWanderers(residents,-.01,seededRandom(814));
assert.equal(JSON.stringify(residents),initialState,"An early first animation timestamp must not move time backwards");
const fed=residents[residents.length-1];fed.greeting=3;fed.behavior="feed";
const feedingPosition={x:fed.x,z:fed.z};
updateWanderers(residents,1/60,seededRandom(814));
assert.equal(fed.behavior,"feed","An interaction must preserve feeding for its duration");
assert.equal(fed.speed,0,"Feeding pauses wandering");
const interactionRng=seededRandom(814);
for(let frame=0;frame<178;frame++){
 updateWanderers(residents,1/60,interactionRng);
 assert.equal(fed.behavior,"feed","Feeding must persist until the interaction finishes");
 assert(fed.x===feedingPosition.x&&fed.z===feedingPosition.z,"A feeding resident must stay in place");
}
for(let frame=0;frame<22;frame++)updateWanderers(residents,1/60,interactionRng);
assert.notEqual(fed.behavior,"feed","Feeding must finish and return to normal behavior");
const drinker=createWanderers()[0];
drinker.x=POND.x-POND.r-drinker.r-.065;drinker.z=POND.z+.36;
drinker.target={x:drinker.x,z:POND.z};drinker.yaw=Math.PI;drinker.wait=0;drinker.drinkTrip=true;
const yawBefore=drinker.yaw;
updateWanderers([drinker],1/60,seededRandom(7));
assert.equal(drinker.behavior,"drink","Approaching the pond must start drinking");
assert(Math.abs(Math.atan2(Math.sin(drinker.yaw-yawBefore),Math.cos(drinker.yaw-yawBefore)))<=.9/60+1e-8,"Drinking must not snap the dinosaur's heading");
for(let frame=0;frame<120;frame++){
 const yaw=drinker.yaw;updateWanderers([drinker],1/60,seededRandom(7));
 assert(Math.abs(Math.atan2(Math.sin(drinker.yaw-yaw),Math.cos(drinker.yaw-yaw)))<=.9/60+1e-8,"Turning toward the pond must remain smooth");
}
const waterYaw=Math.atan2(POND.x-drinker.x,POND.z-drinker.z);
assert(Math.abs(Math.atan2(Math.sin(drinker.yaw-waterYaw),Math.cos(drinker.yaw-waterYaw)))<1e-4,"A drinking dinosaur must face the water");
for(const seed of [814,7,123456]){
 const rng=seededRandom(seed),animals=createWanderers(rng);
 let clearance=Infinity;const behaviors=animals.map(()=>new Set());
 for(let frame=0;frame<36000;frame++){
  const yaws=animals.map(a=>a.yaw);
  updateWanderers(animals,1/60,rng);
  for(let i=0;i<animals.length;i++){const a=animals[i];assert(safePoint(a.x,a.z,a.r,animals,i),"collision: "+seed+" "+frame+" "+i);assert(Math.abs(Math.atan2(Math.sin(a.yaw-yaws[i]),Math.cos(a.yaw-yaws[i])))<=.9/60+1e-8,"Heading must remain smooth: "+seed+" "+frame+" "+i);for(const o of OBSTACLES)clearance=Math.min(clearance,Math.hypot(a.x-o.x,a.z-o.z)-a.r-o.r);behaviors[i].add(a.behavior);}
 }
 assert(animals.every(a=>a.distance>30),"Every dinosaur must keep wandering");
 behaviors.forEach((behavior,i)=>assert(behavior.has("graze")&&behavior.has("drink"),"Every resident must feed and drink: "+seed+" "+i));
 results.push({seed,seconds:600,minimumClearance:clearance,residents:animals.map((a,i)=>({id:a.id,distance:Math.round(a.distance),behaviors:[...behaviors[i]]}))});
}
if(process.argv.includes("--navigation-only")){console.log(JSON.stringify({passed:true,checks:results},null,2));process.exit(0);}
let renderer,raf,controls,resizeCallback,captureFailure=false;
class MockRenderer{
 constructor(){renderer=this;this.shadowMap={};this.events={};this.domElement={setAttribute(){},addEventListener:(name,fn)=>this.events[name]=fn,removeEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:this.width,height:this.height}),remove(){},toDataURL(){if(captureFailure)throw new Error("simulated capture failure");return "data:image/png;base64,mock";}};}
 setPixelRatio(){}setSize(w,h){this.width=w;this.height=h;}dispose(){}
 render(scene,camera){this.scene=scene;this.camera=camera;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}
}
class MockControls{
 constructor(camera){controls=this;this.camera=camera;this.target=new THREE.Vector3();}
 update(){this.camera.lookAt(this.target);}dispose(){}addEventListener(){}
}
globalThis.__mockThree={...THREE,WebGLRenderer:MockRenderer};
globalThis.__mockControls=MockControls;
globalThis.devicePixelRatio=2;
globalThis.document={hidden:false};
globalThis.ResizeObserver=class{constructor(callback){resizeCallback=callback;}observe(){}disconnect(){}};
globalThis.requestAnimationFrame=fn=>{raf=fn;return 1;};
globalThis.cancelAnimationFrame=()=>{};
const source=fs.readFileSync(new URL("../src/grove.ts",import.meta.url),"utf8");
const transformed=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
 .replace('import * as T from "three";','const T=globalThis.__mockThree;')
 .replace('import { OrbitControls } from "three/addons/controls/OrbitControls.js";','const OrbitControls=globalThis.__mockControls;')
 .replace('"./navigation.mjs"',JSON.stringify(new URL("../src/navigation.mjs",import.meta.url).href))
 .replace('"three/addons/utils/BufferGeometryUtils.js"',JSON.stringify(new URL("../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js",import.meta.url).href));
const path=new URL("../.sites-runtime/scene-runtime-check.mjs",import.meta.url);fs.mkdirSync(new URL("../.sites-runtime/",import.meta.url),{recursive:true});fs.writeFileSync(path,transformed);
const {createGrove}=await import(path.href);
for(const [w,h] of [[1440,900],[390,844],[320,568],[844,390]]){
 let selected=-1;
 const host={clientWidth:w,clientHeight:h,appendChild(){}};
 const api=createGrove(host,id=>selected=id);
 let objects=0,vertices=0,invalid=0;
 renderer.scene.traverse(o=>{if(!o.isMesh)return;objects++;vertices+=o.geometry.attributes.position.count;for(const v of o.geometry.attributes.position.array)if(!Number.isFinite(v))invalid++;});
 assert.equal(invalid,0);assert(objects<430,"scene mesh budget");
 const island=renderer.scene.children.find(o=>o.isGroup);
 // Project all terrain and tree geometry; the world must fit the initial viewport.
 let bounds={left:Infinity,right:-Infinity,top:-Infinity,bottom:Infinity};
 island.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(renderer.camera);bounds.left=Math.min(bounds.left,v.x);bounds.right=Math.max(bounds.right,v.x);bounds.top=Math.max(bounds.top,v.y);bounds.bottom=Math.min(bounds.bottom,v.y);}});
 assert(bounds.left>=-1&&bounds.right<=1&&bounds.top<=1&&bounds.bottom>=-1,"Entire island must fit viewport "+w+"x"+h);
 function checkFarthestZoom(){
  assert(renderer.camera.far>controls.maxDistance+15,"The far plane must include the island at maximum zoom distance");
  const before=renderer.camera.position.clone();
  renderer.camera.position.sub(controls.target).normalize().multiplyScalar(controls.maxDistance).add(controls.target);
  controls.update();renderer.camera.updateMatrixWorld(true);
  island.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(renderer.camera);assert(v.z<=1,"Maximum zoom must not clip terrain or trees behind the far plane");}});
  renderer.camera.position.copy(before);controls.update();renderer.camera.updateMatrixWorld(true);
 }
 checkFarthestZoom();
 let stamp=performance.now();
 function advance(frames){for(let i=0;i<frames;i++){stamp+=1000/60;raf(stamp);}}
 const dinosaurRoots=renderer.scene.children.filter(o=>o.isGroup&&Number.isInteger(o.userData.dinosaur));
 assert.equal(dinosaurRoots.length,residents.length,"The scene must render every original resident");
 advance(900);
 assert(dinosaurRoots.every(o=>o.position.toArray().every(Number.isFinite)),"Resident positions must stay finite");
 api.select(1);assert.equal(selected,1);
 for(const invalidId of [-1,residents.length,1.5]){api.select(invalidId);assert.equal(selected,1,"Invalid selection must not change the resident");}
 api.interact(residents.length-1,"feed");assert.equal(selected,residents.length-1,"Feeding selects the resident");advance(2);
 api.pause(true);const poses=[];
 renderer.scene.traverse(o=>poses.push({object:o,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()}));
 advance(15);
 poses.forEach(({object,position,quaternion,scale})=>assert(object.position.equals(position)&&object.quaternion.equals(quaternion)&&object.scale.equals(scale),"Pause freezes positions and poses"));
 const pausedPositions=dinosaurRoots.map(o=>o.position.clone());
 api.pause(false);api.clear();
 advance(1);
 dinosaurRoots.forEach((o,i)=>assert(o.position.distanceTo(pausedPositions[i])<=.33/60+1e-8,"Resuming must not jump ahead in time"));
 const cameraBefore=renderer.camera.position.clone();api.focus(residents.length-1);advance(65);
 assert(renderer.camera.position.toArray().every(Number.isFinite)&&renderer.camera.position.distanceTo(cameraBefore)>1,"Focus must move the camera to a finite close view");
 const sunlight=renderer.scene.children.find(o=>o.isDirectionalLight),dayColor=sunlight.color.clone();
 api.setMood("sunset");advance(90);assert(!sunlight.color.equals(dayColor),"Sunset must change the lighting");
 api.setMood("day");advance(90);assert.equal(typeof api.capture,"function","Screenshot export must be available");
 const backgroundBefore=renderer.scene.background;captureFailure=true;
 assert.throws(()=>api.capture(),/simulated capture failure/,"Screenshot failures must propagate to the caller");
 assert.equal(renderer.scene.background,backgroundBefore,"A failed screenshot must restore the scene background");captureFailure=false;
 for(const view of ["pond","overhead","grove"]){api.view(view);advance(65);assert(renderer.camera.position.toArray().every(Number.isFinite));checkFarthestZoom();}
 for(const [width,height] of [[390,844],[844,390],[320,568],[1440,900]]){host.clientWidth=width;host.clientHeight=height;resizeCallback();advance(1);checkFarthestZoom();}
 api.dispose();results.push({viewport:w+"x"+h,meshes:objects,vertices,bounds});
}
fs.unlinkSync(path);
console.log(JSON.stringify({passed:true,checks:results},null,2));
