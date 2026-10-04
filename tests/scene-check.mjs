import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as THREE from "three";
import {seededRandom,createWanderers,updateWanderers,safePoint,OBSTACLES,POND} from "../src/navigation.mjs";
const results=[];
const residents=createWanderers();
assert.equal(residents.length,5,"The grove must include the original three residents plus T. rex and Velociraptor");
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
 .replace('function animate(now) {','globalThis.__sceneCheckState={animals};function animate(now) {')
 .replace('"three/addons/utils/BufferGeometryUtils.js"',JSON.stringify(new URL("../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js",import.meta.url).href));
const path=new URL("../.sites-runtime/scene-runtime-check.mjs",import.meta.url);fs.mkdirSync(new URL("../.sites-runtime/",import.meta.url),{recursive:true});fs.writeFileSync(path,transformed);
const {createGrove}=await import(path.href);
for(const [w,h] of [[1440,900],[390,844],[320,568],[844,390]]){
 let selected=-1;const events=[];
 const host={clientWidth:w,clientHeight:h,appendChild(){}};
 const api=createGrove(host,id=>selected=id,event=>events.push(event));
 let objects=0,vertices=0,invalid=0;
 renderer.scene.traverse(o=>{if(!o.isMesh)return;objects++;vertices+=o.geometry.attributes.position.count;for(const v of o.geometry.attributes.position.array)if(!Number.isFinite(v))invalid++;});
 assert.equal(invalid,0);assert(objects<430,"scene mesh budget");
 const island=renderer.scene.children.find(o=>o.isGroup);
 // Project all terrain and tree geometry; the world must fit the initial viewport.
 let bounds={left:Infinity,right:-Infinity,top:-Infinity,bottom:Infinity};
 island.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(renderer.camera);bounds.left=Math.min(bounds.left,v.x);bounds.right=Math.max(bounds.right,v.x);bounds.top=Math.max(bounds.top,v.y);bounds.bottom=Math.min(bounds.bottom,v.y);}});
 assert(bounds.left>=-1&&bounds.right<=1&&bounds.top<=1&&bounds.bottom>=-1,"Entire island must fit viewport "+w+"x"+h);
 function checkFramingFog(basis=1.06){
  const framing=Math.max(1,basis/(host.clientWidth/host.clientHeight));
  assert.equal(renderer.scene.fog.near,65*framing,"Fog near follows the current framing factor");
  assert.equal(renderer.scene.fog.far,125*framing,"Fog far preserves the original atmospheric depth");
 }
 function checkIslandBeforeFog(){
  let maximumDepth=0;
  island.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).applyMatrix4(renderer.camera.matrixWorldInverse);maximumDepth=Math.max(maximumDepth,-v.z);}});
  assert(maximumDepth<renderer.scene.fog.near,"Default camera must keep the entire island in front of fog, including portrait fullscreen "+host.clientWidth+"x"+host.clientHeight);
  return maximumDepth;
 }
 checkFramingFog();const initialIslandDepth=checkIslandBeforeFog();
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
 dinosaurRoots.forEach((o,i)=>assert(o.position.distanceTo(pausedPositions[i])<=.72/60+1e-8,"Resuming must not jump ahead in time"));
 const cameraBefore=renderer.camera.position.clone();api.focus(residents.length-1);advance(65);
 assert(renderer.camera.position.toArray().every(Number.isFinite)&&renderer.camera.position.distanceTo(cameraBefore)>1,"Focus must move the camera to a finite close view");
 checkFramingFog(.8);
 const sunlight=renderer.scene.children.find(o=>o.isDirectionalLight),dayColor=sunlight.color.clone();
 api.setMood("sunset");advance(90);assert(!sunlight.color.equals(dayColor),"Sunset must change the lighting");
 api.setMood("night");advance(180);assert(sunlight.intensity>=1,"Night keeps a readable key light");
 assert(renderer.scene.children.find(o=>o.isHemisphereLight).intensity>=2,"Night ambient stays usable");
 api.pause(true);api.setMood("day");advance(180);assert(sunlight.intensity>2.5,"An explicit light change works even while paused");api.pause(false);
 if(w===1440){events.length=0;api.setDayCycle(true);advance(7600);assert(events.some(e=>e.type==="phase"&&e.phase==="sunset")&&events.some(e=>e.type==="phase"&&e.phase==="night"),"Automatic cycle reports distinct phases");}
 api.setAutoRotate(true);advance(1);assert.equal(controls.autoRotate,true);
 renderer.events.pointerdown({button:0,pointerId:1,clientX:20,clientY:20});
 assert(events.some(e=>e.type==="rotate"&&!e.enabled),"Manual pointer interaction interrupts auto-rotation");renderer.events.pointercancel({pointerId:1});
 api.setDayCycle(false);api.setMood("day");advance(90);assert.equal(typeof api.capture,"function","Screenshot export must be available");
 const backgroundBefore=renderer.scene.background;captureFailure=true;
 assert.throws(()=>api.capture(),/simulated capture failure/,"Screenshot failures must propagate to the caller");
 assert.equal(renderer.scene.background,backgroundBefore,"A failed screenshot must restore the scene background");captureFailure=false;
 for(const view of ["pond","overhead","grove"]){api.view(view);advance(65);assert(renderer.camera.position.toArray().every(Number.isFinite));checkFarthestZoom();checkFramingFog();}
 for(const [width,height] of [[390,844],[844,390],[320,568],[1440,900]]){host.clientWidth=width;host.clientHeight=height;resizeCallback();advance(1);checkFarthestZoom();checkFramingFog();checkIslandBeforeFog();}
 assert.equal(renderer.scene.fog.near,65,"Returning to landscape restores the original wide-screen fog");
 api.dispose();results.push({viewport:w+"x"+h,meshes:objects,vertices,bounds,initialIslandDepth,initialFogNear:65*Math.max(1,1.06/(w/h))});
}
// Controlled navigation states verify visual lifecycle separately from the
// navigation simulator above. This renderer cannot judge actual GPU contrast.
for(const reducedMotion of [false,true]){
 globalThis.matchMedia=()=>({matches:reducedMotion});
 const events=[],api=createGrove({clientWidth:1440,clientHeight:900,appendChild(){}},()=>{},event=>events.push(event));
 const {animals}=globalThis.__sceneCheckState,scene=renderer.scene;
 const halo=scene.getObjectByName("selection-halo"),destination=scene.getObjectByName("movement-destination"),route=scene.getObjectByName("movement-route");
 const roots=scene.children.filter(o=>o.isGroup&&Number.isInteger(o.userData.dinosaur));
 const originals=new Map();roots.forEach(root=>root.traverse(o=>{if(o.isMesh)originals.set(o,o.material);}));
 let stamp=performance.now();function advance(frames){for(let i=0;i<frames;i++){stamp+=1000/60;raf(stamp);}}
 function snapshot(){const state=[];scene.traverse(o=>{if(!o.isMesh&&!o.isGroup)return;state.push({name:o.name,visible:o.visible,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),material:o.isMesh?[o.material.color?.getHex(),o.material.emissive?.getHex(),o.material.opacity]:null});});return JSON.stringify(state);}
 api.setDayCycle(false);animals.forEach(a=>a.wait=1000);
 for(let id=0;id<animals.length;id++){
  api.select(id);advance(190);
  assert(halo.visible&&halo.userData.resident===id,"Selection halo persists beyond the greeting for every species");
  assert(Math.hypot(halo.position.x-animals[id].x,halo.position.z-animals[id].z)<1e-8,"Halo follows its resident exactly");
  assert(halo.position.y>.105,"Halo sits above all terrain facets");
  assert(halo.scale.x>animals[id].r*.7,"Halo scales to each resident's body footprint");
  roots.forEach((root,index)=>root.traverse(o=>{if(o.isMesh)assert(index===id?o.material!==originals.get(o):o.material===originals.get(o),"Selection highlight must not leak into another resident");}));
 }
 api.clear();assert(!halo.visible&&!destination.visible&&!route.visible,"Clear removes every old guide");
 originals.forEach((material,o)=>assert.equal(o.material,material,"Clearing restores original shared materials"));
 api.view("overhead");advance(65);api.select(4);
 const previousHalo=halo.scale.clone();if(reducedMotion){advance(10);assert(halo.scale.equals(previousHalo),"Reduced-motion halo stays static");}
 function tapGround(x,z){const p=new THREE.Vector3(x,.13,z).project(renderer.camera),e={button:0,pointerId:1,clientX:(p.x+1)*renderer.width/2,clientY:(1-p.y)*renderer.height/2};renderer.events.pointerdown(e);renderer.events.pointerup(e);}
 tapGround(6,-6);assert(events.some(e=>e.type==="move"&&e.status==="started"),"Ground pointer must create a visible movement command");
 const a=animals[4];assert(a.path.length>1,"Fixture must contain a bend around obstacles");
 assert(destination.visible&&destination.userData.status==="moving"&&route.visible,"Active command exposes target and route immediately");
 const guideMeshes=[];for(const parent of [halo,destination,route])parent.traverse(o=>{if(o.isMesh)guideMeshes.push(o);});
 for(const o of guideMeshes){const hits=[];o.raycast(null,hits);assert.equal(hits.length,0,"Guide meshes must not intercept clicks");assert.equal(o.material.fog,false,"Selection and movement guides remain bright even when zooming far out");}
 for(const arrow of route.children.filter(o=>o.visible)){
  const segment=arrow.userData.segment,from=segment?a.path[segment-1]:a,to=a.path[segment],dx=to.x-from.x,dz=to.z-from.z;
  const fraction=((arrow.position.x-from.x)*dx+(arrow.position.z-from.z)*dz)/(dx*dx+dz*dz);
  assert(fraction>=0&&fraction<=1,"Every route arrow lies within a remaining path segment");
  assert(Math.abs((arrow.position.x-from.x)*dz-(arrow.position.z-from.z)*dx)<1e-5,"Route arrows follow the A* polyline rather than a shortcut");
  assert(Math.abs(arrow.rotation.y-Math.atan2(dx,dz))<1e-8,"Arrows face the actual next waypoint");
  assert(safePoint(arrow.position.x,arrow.position.z,a.r),"Route guidance stays on navigable land");
 }
 if(reducedMotion){const before=route.children.filter(o=>o.visible).map(o=>o.scale.toArray());a.wait=100;advance(10);assert.deepEqual(route.children.filter(o=>o.visible).map(o=>o.scale.toArray()),before,"Reduced-motion arrows do not pulse");}
 api.pause(true);const frozen=snapshot();advance(20);assert.equal(snapshot(),frozen,"Pause freezes halo, target, path, opacity, and dinosaur highlights");api.pause(false);
 a.moveStatus="blocked";a.wait=100;advance(1);assert.equal(destination.userData.status,"blocked");assert.equal(destination.children[1].material.color.getHexString(),"ffc766","Blocked guidance is amber");
 api.select(0);assert(!destination.visible&&!route.visible,"Switching selection removes the previous resident's movement guide");api.select(4);assert(destination.visible,"Returning to a commanded resident restores its real remaining route");
 tapGround(0,1);assert.equal(destination.userData.status,"moving","A replacement command clears blocked styling");assert(Math.hypot(destination.position.x-a.manualTarget.x,destination.position.z-a.manualTarget.z)<1e-8,"Only the latest destination is shown");
 a.moveStatus="arrived";a.manualTarget=null;a.path=[];a.wait=100;advance(1);assert(destination.visible&&!route.visible&&destination.userData.status==="arrived","Arrival keeps a short confirmation and removes path arrows");
 api.pause(true);const arrivalFrozen=snapshot();advance(100);assert.equal(snapshot(),arrivalFrozen,"Arrival confirmation waits for scene time while paused");api.pause(false);advance(100);assert(!destination.visible,"Arrival confirmation fades out after resuming");assert(halo.visible,"Arrival never clears the selected resident's persistent halo");
 const disposedMaterials=new Set(),disposedGeometry=new Set();scene.traverse(o=>{if(!o.isMesh)return;o.material.addEventListener("dispose",()=>disposedMaterials.add(o.material));o.geometry.addEventListener("dispose",()=>disposedGeometry.add(o.geometry));});
 api.dispose();guideMeshes.forEach(o=>{assert(disposedMaterials.has(o.material)&&disposedGeometry.has(o.geometry),"Guide GPU resources are disposed");});
 results.push({guidance:true,reducedMotion,pathArrows:route.children.length,checked:"Persistent selection, isolated highlight, A* arrows, blocked and arrival states, pause, cleanup"});
}
fs.unlinkSync(path);
console.log(JSON.stringify({passed:true,checks:results},null,2));
