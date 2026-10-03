// Shared deterministic island layout. All distances are world-space metres.
export const WORLD_RADIUS=11.5;
export const TREE_POINTS=[[-8.3,-5.1],[-6.2,-8],[-2.8,-9.4],[1,-9.7],[5.2,-8.4],[8.5,-5.7],[-10,-.2],[-9,4.5],[9.9,-.3],[-7.5,-6.9],[7.1,-7.4],[10.2,3.7]];
export const ROCK_POINTS=[[-7.9,-6.4,.85],[-9,-4,.6],[8.6,4.8,.5],[-7.3,7.4,.4]];
export const POND={x:4.4,z:-3,r:1.65};
export const STREAM_END={x:WORLD_RADIUS*.82,z:WORLD_RADIUS*.56};
export const OBSTACLES=[...TREE_POINTS.map(([x,z])=>({x,z,r:.37})),...ROCK_POINTS.map(([x,z,r])=>({x,z,r})),POND,...Array.from({length:17},(_,i)=>{const t=i/16;return {x:POND.x+1+(STREAM_END.x-POND.x-1)*t,z:POND.z+1+(STREAM_END.z-POND.z-1)*t,r:.2};})];
export const STARTS=[[-4,4],[1,5],[-4,-3],[4,1],[0,-6]];
export const RADII=[1.75,1.95,2,2.05,1.4];
const SPEEDS=[.48,.45,.43,.56,.72];
const TURN_SPEED=.9;
const ARRIVAL_DISTANCE=.12;
export function seededRandom(seed=214){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function safePoint(x,z,r,others=[],ignore=-1,obstacles=OBSTACLES){
 if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(r)||r<=0||Math.hypot(x,z)>WORLD_RADIUS-r)return false;
 for(const o of obstacles)if(Math.hypot(x-o.x,z-o.z)<r+o.r+.06-1e-8)return false;
 for(let i=0;i<others.length;i++)if(i!==ignore&&Math.hypot(x-others[i].x,z-others[i].z)<r+others[i].r+.13-1e-8)return false;
 return true;
}
function routeSafePoint(x,z,r,others=[],ignore=-1){
 if(!safePoint(x,z,r,others,ignore))return false;
 for(let i=0;i<others.length;i++){
  const other=others[i];if(i!==ignore&&other.manualTarget&&Math.hypot(x-other.manualTarget.x,z-other.manualTarget.z)<r+other.r+.13-1e-8)return false;
 }
 return true;
}
export function createWanderers(random=seededRandom()){
 return STARTS.map(([x,z],id)=>({id,x,z,r:RADII[id],yaw:[.8,-1.4,1.1,-.7,.4][id],target:{x,z},wait:1+id*1.1,behavior:"look",distance:0,speed:0,blocked:0,arrivals:0,greeting:0,thirst:0,drinkTrip:false,manualTarget:null,path:[],moveStatus:"idle",replan:0}));
}
function angleDifference(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
function lineClear(from,to,r,others,ignore){
 const length=Math.hypot(to.x-from.x,to.z-from.z),steps=Math.max(1,Math.ceil(length/.18));
 for(let i=1;i<=steps;i++){const t=i/steps;if(!routeSafePoint(from.x+(to.x-from.x)*t,from.z+(to.z-from.z)*t,r,others,ignore))return false;}
 return true;
}
const GRID_STEP=.5,GRID_SIZE=Math.floor(WORLD_RADIUS*2/GRID_STEP)+1,GRID_COUNT=GRID_SIZE*GRID_SIZE;
const gridCache=new Map(),componentCache=new Map();
function gridPoint(index){return {x:index%GRID_SIZE*GRID_STEP-WORLD_RADIUS,z:Math.floor(index/GRID_SIZE)*GRID_STEP-WORLD_RADIUS};}
function staticGrid(radius){
 if(!gridCache.has(radius)){const cells=new Uint8Array(GRID_COUNT);for(let i=0;i<GRID_COUNT;i++){const p=gridPoint(i);cells[i]=safePoint(p.x,p.z,radius)?1:0;}gridCache.set(radius,cells);}
 return gridCache.get(radius);
}
function staticComponents(radius){
 if(componentCache.has(radius))return componentCache.get(radius);
 const cells=staticGrid(radius),labels=new Int32Array(GRID_COUNT).fill(-1);let label=0;
 for(let start=0;start<GRID_COUNT;start++)if(cells[start]&&labels[start]<0){
  const queue=[start];labels[start]=label;
  for(let cursor=0;cursor<queue.length;cursor++){
   const n=queue[cursor],cx=n%GRID_SIZE,cz=Math.floor(n/GRID_SIZE),p=gridPoint(n);
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    if((!dx&&!dz)||cx+dx<0||cz+dz<0||cx+dx>=GRID_SIZE||cz+dz>=GRID_SIZE)continue;
    const next=n+dx+dz*GRID_SIZE;if(labels[next]>=0||!cells[next])continue;
    if(lineClear(p,gridPoint(next),radius,[],-1)){labels[next]=label;queue.push(next);}
   }
  }
  label++;
 }
 componentCache.set(radius,labels);return labels;
}
function pointComponents(point,radius){
 const labels=staticComponents(radius),found=new Set(),cx=Math.round((point.x+WORLD_RADIUS)/GRID_STEP),cz=Math.round((point.z+WORLD_RADIUS)/GRID_STEP);
 for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
  if(cx+dx<0||cz+dz<0||cx+dx>=GRID_SIZE||cz+dz>=GRID_SIZE)continue;
  const n=(cz+dz)*GRID_SIZE+cx+dx;if(labels[n]<0||found.has(labels[n]))continue;
  const p=gridPoint(n);if(Math.hypot(p.x-point.x,p.z-point.z)<=.95&&lineClear(point,p,radius,[],-1))found.add(labels[n]);
 }
 return found;
}
function pushHeap(heap,item){let i=heap.length;heap.push(item);while(i){const parent=(i-1)>>1;if(heap[parent].score<=item.score)break;heap[i]=heap[parent];i=parent;}heap[i]=item;}
function popHeap(heap){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=last.score)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;}
// A small cached navigation grid routes around the pond, trunks and other residents.
// Exact endpoint and every smoothed segment are collision-checked; no grid snapping.
function findPath(animals,index,target,avoidResidents=true){
 const a=animals[index],others=avoidResidents?animals:[];
 if(!routeSafePoint(target.x,target.z,a.r,others,index))return null;
 if(lineClear(a,target,a.r,others,index))return [{...target}];
 const reachable=pointComponents(a,a.r),destination=pointComponents(target,a.r);
 if(![...destination].some(label=>reachable.has(label)))return null;
 const cells=staticGrid(a.r).slice(),costs=new Float64Array(GRID_COUNT).fill(Infinity),parents=new Int32Array(GRID_COUNT).fill(-1),closed=new Uint8Array(GRID_COUNT),heap=[];
 if(avoidResidents)for(let n=0;n<GRID_COUNT;n++)if(cells[n]){const p=gridPoint(n);for(let j=0;j<animals.length;j++)if(j!==index&&(Math.hypot(p.x-animals[j].x,p.z-animals[j].z)<a.r+animals[j].r+.13||(animals[j].manualTarget&&Math.hypot(p.x-animals[j].manualTarget.x,p.z-animals[j].manualTarget.z)<a.r+animals[j].r+.13))){cells[n]=0;break;}}
 for(let n=0;n<GRID_COUNT;n++)if(cells[n]){const p=gridPoint(n),d=Math.hypot(p.x-a.x,p.z-a.z);if(d<=.95&&lineClear(a,p,a.r,others,index)){costs[n]=d;pushHeap(heap,{index:n,score:d+Math.hypot(p.x-target.x,p.z-target.z)});}}
 let end=-1;
 while(heap.length){
  const current=popHeap(heap).index;if(closed[current])continue;closed[current]=1;
  const p=gridPoint(current);if(Math.hypot(p.x-target.x,p.z-target.z)<=.95&&lineClear(p,target,a.r,others,index)){end=current;break;}
  const cx=current%GRID_SIZE,cz=Math.floor(current/GRID_SIZE);
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   if((!dx&&!dz)||cx+dx<0||cz+dz<0||cx+dx>=GRID_SIZE||cz+dz>=GRID_SIZE)continue;
   const next=current+dx+dz*GRID_SIZE;if(!cells[next]||closed[next])continue;
   const q=gridPoint(next),nextCost=costs[current]+Math.hypot(dx,dz)*GRID_STEP;
   if(nextCost>=costs[next]||!lineClear(p,q,a.r,others,index))continue;
   parents[next]=current;costs[next]=nextCost;pushHeap(heap,{index:next,score:nextCost+Math.hypot(q.x-target.x,q.z-target.z)});
  }
 }
 if(end<0)return null;
 const raw=[{...target}];for(let n=end;n>=0;n=parents[n])raw.push(gridPoint(n));raw.reverse();
 const path=[];let from=a,next=0;
 while(next<raw.length){let far=raw.length-1;while(far>next&&!lineClear(from,raw[far],a.r,others,index))far--;path.push(raw[far]);from=raw[far];next=far+1;}
 return path;
}
function landingCandidates(x,z,a,animals,index){
 const candidates=[];
 if(routeSafePoint(x,z,a.r,animals,index))candidates.push({x,z});
 // Dense rings find a nearby dry spot for taps on water, plants, or another dinosaur.
 for(let distance=.3;distance<=5;distance+=.3){const count=Math.ceil(distance*2*Math.PI/.3);for(let k=0;k<count;k++){const angle=k/count*Math.PI*2,p={x:x+Math.cos(angle)*distance,z:z+Math.sin(angle)*distance};if(routeSafePoint(p.x,p.z,a.r,animals,index))candidates.push(p);}if(candidates.length>45)break;}
 return candidates;
}
function reachableLandings(a,x,z,animals,index){
 const labels=staticComponents(a.r),reachable=pointComponents(a,a.r),points=[];
 for(let n=0;n<GRID_COUNT;n++)if(reachable.has(labels[n])){const p=gridPoint(n);if(routeSafePoint(p.x,p.z,a.r,animals,index))points.push(p);}
 return points.sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));
}
/** Point-to-move is explicit and persists until arrival, including behind obstacles. */
export function commandMove(animals,id,x,z){
 const index=animals.findIndex(a=>a.id===id);
 if(index<0||!Number.isFinite(x)||!Number.isFinite(z)||Math.hypot(x,z)>WORLD_RADIUS)return {accepted:false};
 const a=animals[index];
 // Only the latest accepted command guides a resident. Plan without the old
 // destination reservations, while retaining every resident's physical body.
 const planningAnimals=animals.map((other,j)=>j===index?other:{...other,manualTarget:null});
 const nearby=landingCandidates(x,z,a,planningAnimals,index);
 // Search a connected inland fallback only when the nearby patch is cut off by water.
 let fallback=false;
 for(let n=0;n<nearby.length||!fallback;n++){
  if(n===nearby.length){nearby.push(...reachableLandings(a,x,z,planningAnimals,index).slice(0,25));fallback=true;if(n===nearby.length)break;}
  const target=nearby[n];
  const staticPath=findPath(planningAnimals,index,target,false);
  if(!staticPath)continue;
  const path=findPath(planningAnimals,index,target)||staticPath;
  // Commit atomically: a rejected tap must never cancel an existing command.
  for(let j=0;j<animals.length;j++)if(j!==index&&animals[j].manualTarget)cancelMove(animals[j]);
  a.manualTarget={...target};a.target={...target};a.path=path;a.wait=0;a.greeting=0;a.drinkTrip=false;a.blocked=0;a.replan=0;a.behavior="walk";a.moveStatus="moving";
  return {accepted:true,x:target.x,z:target.z,adjusted:Math.hypot(target.x-x,target.z-z)>.01};
 }
 return {accepted:false};
}
export function cancelMove(animal){
 animal.manualTarget=null;animal.path=[];animal.moveStatus="idle";animal.target={x:animal.x,z:animal.z};animal.blocked=0;animal.replan=0;animal.drinkTrip=false;animal.speed=0;
}
function setDestination(animals,index,target,drink=false){
 const a=animals[index],path=findPath(animals,index,target);
 if(!path)return false;
 a.target={...target};a.path=path;a.drinkTrip=drink;a.replan=0;return true;
}
function pickDestination(animals,index,random){
 const a=animals[index];
 if(a.arrivals%4===0||a.thirst>45){
  for(const offset of [0,.5,-.5,1,-1,1.5,-1.5,2,-2,2.5,-2.5]){
   const angle=Math.PI+offset,d=POND.r+a.r+.075,target={x:POND.x+Math.cos(angle)*d,z:POND.z+Math.sin(angle)*d};
   if(routeSafePoint(target.x,target.z,a.r,animals,index)&&setDestination(animals,index,target,true))return;
  }
 }
 for(let k=0;k<70;k++){
  const angle=random()*Math.PI*2,d=Math.sqrt(random())*(WORLD_RADIUS-a.r-.1),target={x:Math.cos(angle)*d,z:Math.sin(angle)*d};
  if(Math.hypot(target.x-a.x,target.z-a.z)>2&&routeSafePoint(target.x,target.z,a.r,animals,index)&&setDestination(animals,index,target))return;
 }
 a.target={x:a.x,z:a.z};a.path=[];
}
function makeRoom(animals,index){
 const a=animals[index];if(a.manualTarget||a.yieldCooldown>0||a.behavior==="drink")return;
 const directed=animals.find((other,j)=>j!==index&&other.manualTarget&&Math.hypot(other.x-a.x,other.z-a.z)<a.r+other.r+1.6);
 if(!directed)return;
 const away=Math.atan2(a.z-directed.z,a.x-directed.x),candidates=[];
 for(const distance of [2,3.5,5])for(const offset of [0,.5,-.5,1,-1,1.5,-1.5,2,-2,2.5,-2.5,Math.PI]){
  const p={x:a.x+Math.cos(away+offset)*distance,z:a.z+Math.sin(away+offset)*distance};
  if(routeSafePoint(p.x,p.z,a.r,animals,index))candidates.push(p);
 }
 for(const target of candidates)if(setDestination(animals,index,target)){a.wait=0;a.blocked=0;a.behavior="look";a.yieldCooldown=10;return;}
 a.yieldCooldown=1;
}
function arrive(a){
 a.speed=0;a.path=[];a.blocked=0;
 if(a.manualTarget){a.manualTarget=null;a.moveStatus="arrived";a.wait=5;a.behavior="look";return;}
 if(a.drinkTrip){a.wait=4;a.behavior="drink";a.thirst=0;a.drinkTrip=false;a.target={x:a.x,z:a.z};return;}
 a.arrivals++;a.wait=2.5;a.behavior=a.arrivals%3===0?"graze":"look";
}
export function updateWanderers(animals,dt,random=seededRandom()){
 dt=Math.max(0,Math.min(dt,.05));if(!dt)return;
 for(let i=0;i<animals.length;i++){
  const a=animals[i],wasGreeting=a.greeting>0;a.thirst=(a.thirst||0)+dt;a.speed=0;a.greeting=Math.max(0,a.greeting-dt);a.replan=Math.max(0,(a.replan||0)-dt);a.yieldCooldown=Math.max(0,(a.yieldCooldown||0)-dt);
  if(a.greeting>0){if(a.behavior!=="feed")a.behavior="greet";continue;}
  if(wasGreeting)a.behavior="look";
  makeRoom(animals,i);
  if(a.wait>0){
   if(a.behavior==="drink")a.yaw+=Math.max(-dt*TURN_SPEED,Math.min(dt*TURN_SPEED,angleDifference(Math.atan2(POND.x-a.x,POND.z-a.z),a.yaw)));
   a.wait=Math.max(0,a.wait-dt);continue;
  }
  const targetDistance=Math.hypot(a.x-a.target.x,a.z-a.target.z);
  if(targetDistance<(a.drinkTrip?.4:ARRIVAL_DISTANCE)){
   const wasDrink=a.drinkTrip,wasManual=!!a.manualTarget;arrive(a);
   if(!wasDrink&&!wasManual)pickDestination(animals,i,random);
   continue;
  }
  if(!a.path?.length){
   if(!a.manualTarget){pickDestination(animals,i,random);continue;}
   if(a.replan<=0){a.path=findPath(animals,i,a.manualTarget)||[];a.replan=1;}
  }
  while(a.path.length>1&&Math.hypot(a.x-a.path[0].x,a.z-a.path[0].z)<.16)a.path.shift();
  let waypoint=a.path[0];
  if(waypoint&&!lineClear(a,waypoint,a.r,animals,i)&&a.replan<=0){
   const path=findPath(animals,i,a.target);a.replan=1;
   if(path){a.path=path;waypoint=path[0];}else waypoint=null;
  }
  if(!waypoint){
   a.blocked+=dt;a.behavior="look";
   if(a.manualTarget&&a.blocked>.6)a.moveStatus="blocked";
   else if(a.blocked>5){a.blocked=0;pickDestination(animals,i,random);}
   continue;
  }
  const targetAngle=Math.atan2(waypoint.x-a.x,waypoint.z-a.z),difference=angleDifference(targetAngle,a.yaw);
  a.yaw+=Math.max(-dt*TURN_SPEED,Math.min(dt*TURN_SPEED,difference));
  // Turning in place preserves a grounded gait; never translate sideways through a trunk.
  const remainingAngle=Math.abs(angleDifference(targetAngle,a.yaw)),speed=(SPEEDS[a.id]||.48)*(a.manualTarget?1.4:1),step=Math.min(speed*dt,Math.hypot(waypoint.x-a.x,waypoint.z-a.z));
  const nx=a.x+Math.sin(a.yaw)*step,nz=a.z+Math.cos(a.yaw)*step;
  if(remainingAngle<.18&&routeSafePoint(nx,nz,a.r,animals,i)){
   const travelled=Math.hypot(nx-a.x,nz-a.z);a.distance+=travelled;a.x=nx;a.z=nz;a.speed=travelled/dt;a.behavior="walk";a.blocked=0;
   if(a.manualTarget)a.moveStatus="moving";
  }else{
   a.behavior="look";
   if(remainingAngle<.18){a.blocked+=dt;if(a.manualTarget&&a.blocked>.6)a.moveStatus="blocked";if(a.blocked>1&&a.replan<=0){a.path=findPath(animals,i,a.target)||[];a.replan=1;}if(!a.manualTarget&&a.blocked>5){a.blocked=0;pickDestination(animals,i,random);}}
  }
 }
}
