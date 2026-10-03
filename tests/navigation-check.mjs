import assert from "node:assert/strict";
import {WORLD_RADIUS,OBSTACLES,POND,TREE_POINTS,STARTS,RADII,seededRandom,safePoint,createWanderers,updateWanderers,commandMove,cancelMove} from "../src/navigation.mjs";
const results=[];
const angularDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function tick(animals,rng){
 const previous=animals.map(a=>({x:a.x,z:a.z,yaw:a.yaw}));
 updateWanderers(animals,1/60,rng);
 animals.forEach((a,index)=>{
  assert(safePoint(a.x,a.z,a.r,animals,index),`Resident ${a.id} must stay on dry ground and outside collision bounds`);
  const travelled=Math.hypot(a.x-previous[index].x,a.z-previous[index].z);
  assert(travelled<=1.008/60+1e-8,"Movement must not teleport");
  assert(Math.abs(a.speed-travelled*60)<1e-8,"Gait speed must match actual world displacement");
  assert(angularDistance(a.yaw,previous[index].yaw)<=.9/60+1e-8,"Turning must stay smooth");
 });
}
function reach(animals,id,seconds=120,seed=42){
 const a=animals.find(a=>a.id===id),rng=seededRandom(seed);let frames=0;
 while(a.moveStatus!=="arrived"&&frames<seconds*60){tick(animals,rng);frames++;}
 assert.equal(a.moveStatus,"arrived",`Resident ${id} must reach a commanded destination within ${seconds}s`);
 assert.equal(a.manualTarget,null,"Arrival releases the manual target");
 assert(Math.hypot(a.x-a.target.x,a.z-a.target.z)<.12,"Arrival must be within 12cm of the landing marker");
 return frames/60;
}
function solo(id=0,x=STARTS[id][0],z=STARTS[id][1]){const a=createWanderers()[id];Object.assign(a,{x,z,target:{x,z},wait:0});assert(safePoint(x,z,a.r));return [a];}
assert.equal(createWanderers().length,5,"Keep the three original species and add T. rex and raptor");
assert.equal(RADII.length,5);assert(WORLD_RADIUS>11,"The expanded habitat must provide additional roaming space");
const residents=createWanderers();residents.forEach((a,i)=>assert(safePoint(a.x,a.z,a.r,residents,i)));
const untouched=JSON.stringify(residents);updateWanderers(residents,-.02);assert.equal(JSON.stringify(residents),untouched,"Negative first frame must be a no-op");
for(const [id,x,z] of [[-1,0,0],[5,0,0],[1.5,0,0],[0,NaN,0],[0,0,Infinity],[0,WORLD_RADIUS+1,0]])assert.deepEqual(commandMove(residents,id,x,z),{accepted:false});
assert.equal(JSON.stringify(residents),untouched,"Rejected clicks must preserve the current state");
{
 const animals=solo(),a=animals[0];const requested={x:-4,z:0};
 assert.deepEqual(commandMove(animals,0,requested.x,requested.z),{accepted:true,...requested,adjusted:false});
 const seconds=reach(animals,0);const arrived={x:a.x,z:a.z};
 for(let i=0;i<120;i++)tick(animals,seededRandom(3));
 assert.deepEqual({x:a.x,z:a.z},arrived,"Stay at the destination long enough for children to see arrival");
 results.push({case:"direct click and arrival pause",seconds});
}
{
 const animals=solo(0,.8,-3);assert(commandMove(animals,0,4.4,2).accepted);
 assert(animals[0].path.length>1,"A pond must require a real detour, not a straight line");
 const seconds=reach(animals,0);results.push({case:"route around pond",seconds});
}
{
 const animals=solo(0,-4,-7);assert(commandMove(animals,0,-1,-8).accepted);
 assert(animals[0].path.length>1,"A tree trunk must require a detour");
 const seconds=reach(animals,0);results.push({case:"route around tree",seconds});
}
for(const [label,x,z] of [["water",POND.x,POND.z],["tree",...TREE_POINTS[0]],["island edge",WORLD_RADIUS-.05,0]]){
 const animals=solo(),result=commandMove(animals,0,x,z);
 assert(result.accepted&&result.adjusted,`${label} clicks must offer the nearest safe landing`);
 assert(safePoint(result.x,result.z,animals[0].r));
 const seconds=reach(animals,0);results.push({case:`safe adjustment: ${label}`,seconds});
}
{
 const animals=solo(),a=animals[0];commandMove(animals,0,-4,0);tick(animals,seededRandom(3));
 const replacement=commandMove(animals,0,1,3);assert(replacement.accepted);
 assert.deepEqual(a.manualTarget,{x:replacement.x,z:replacement.z},"A second click replaces the old route");
 cancelMove(a);assert.equal(a.manualTarget,null);assert.equal(a.moveStatus,"idle");assert.equal(a.path.length,0);assert.equal(a.speed,0);
 a.greeting=3;a.behavior="feed";const start={x:a.x,z:a.z};
 for(let i=0;i<179;i++){tick(animals,seededRandom(3));assert.equal(a.behavior,"feed");assert.deepEqual({x:a.x,z:a.z},start);}
 for(let i=0;i<30;i++)tick(animals,seededRandom(3));assert.notEqual(a.behavior,"feed");
 results.push({case:"replace, cancel and feed commands"});
}
{
 const animals=createWanderers();
 assert(commandMove(animals,0,0,0).accepted);
 const beforeRejected=JSON.stringify(animals);
 assert.deepEqual(commandMove(animals,1,WORLD_RADIUS+1,0),{accepted:false});
 assert.equal(JSON.stringify(animals),beforeRejected,"A rejected new command preserves the old resident's destination and route");
 // Regression: these two accepted commands previously left both residents blocked forever.
 assert(commandMove(animals,1,-1,-2).accepted);
 assert.equal(animals[0].manualTarget,null,"A newly guided resident releases the previous destination reservation");
 assert.equal(animals[0].moveStatus,"idle","The scene can remove the cancelled resident's observed move");
 assert.deepEqual(animals.filter(a=>a.manualTarget).map(a=>a.id),[1],"Only the latest accepted command stays active");
 const seconds=reach(animals,1,90,814);
 results.push({case:"switch resident without manual deadlock",seconds});
}
{
 const animals=createWanderers();
 for(const [id,x,z] of [[0,0,0],[1,-1,-2],[2,5,5],[3,-4,-4],[4,2,4]]){
  assert(commandMove(animals,id,x,z).accepted);
  assert.deepEqual(animals.filter(a=>a.manualTarget).map(a=>a.id),[id],"Rapid resident switches leave exactly one guided destination");
 }
 const seconds=reach(animals,4,90,814),rng=seededRandom(814),behaviors=animals.map(()=>new Set()),distances=animals.map(a=>a.distance);
 for(let frame=0;frame<36000;frame++){tick(animals,rng);animals.forEach((a,index)=>behaviors[index].add(a.behavior));}
 animals.forEach((a,index)=>{
  assert.equal(a.manualTarget,null,"Superseded commands must not reactivate");
  assert(a.distance-distances[index]>30,"Cancelled residents resume autonomous wandering");
  assert(behaviors[index].has("drink"),"Cancelled residents can finish natural drinking trips");
 });
 results.push({case:"five rapid commands then autonomous recovery",seconds,observationSeconds:600});
}
for(const seed of [814,7,123456]){
 const animals=createWanderers(),rng=seededRandom(seed),behaviors=animals.map(()=>new Set());let clearance=Infinity;
 for(let frame=0;frame<36000;frame++){
  tick(animals,rng);animals.forEach((a,index)=>{behaviors[index].add(a.behavior);for(const o of OBSTACLES)clearance=Math.min(clearance,Math.hypot(a.x-o.x,a.z-o.z)-a.r-o.r);});
 }
 animals.forEach((a,index)=>{assert(a.distance>30,`Resident ${a.id} must continue exploring`);for(const behavior of ["walk","graze","drink"])assert(behaviors[index].has(behavior),`Resident ${a.id} must ${behavior} in seed ${seed}`);});
 results.push({case:"five-resident natural behavior",seed,seconds:600,minimumClearance:clearance,distances:animals.map(a=>Math.round(a.distance))});
}
for(const seed of [814,7,123456]){
 const animals=createWanderers();
 // Other residents keep wandering while each command is followed to completion.
 for(const [id,x,z] of [[0,-1,0],[1,-5,2],[2,2,5],[3,-4,-4],[4,4,3]]){
  const result=commandMove(animals,id,x,z);assert(result.accepted,`Resident ${id} accepts a ground click`);
  const seconds=reach(animals,id,90,seed+id);results.push({case:"moving residents and replanning",seed,id,seconds,adjusted:result.adjusted});
 }
}
console.log(JSON.stringify({passed:true,checks:results},null,2));
