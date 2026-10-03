// Shared deterministic world layout and collision-safe wandering simulation.
export const TREE_POINTS=[[-6,-3],[-5,-5],[-2,-6.5],[.5,-6.6],[3,-6],[5,-4.6],[6.6,-2.8],[-7,.2],[-6.5,3],[6.9,.2],[-4.8,-4.2],[4.5,-4.3]];
export const ROCK_POINTS=[[-5.9,-5.1,.85],[-6.5,-4.2,.6],[6,4.3,.5],[-6,4.8,.4]];
export const POND={x:3.4,z:-1.9,r:1.5};
export const OBSTACLES=[...TREE_POINTS.map(([x,z])=>({x,z,r:.37})),...ROCK_POINTS.map(([x,z,r])=>({x,z,r})),POND,...[0,1,2,3].map(i=>({x:4.6+i*.72,z:-.7+i*.84,r:.44}))];
export const STARTS=[[-3,3],[2,4],[-2.6,-2]];
export const RADII=[1.75,1.95,2.0];
export function seededRandom(seed=214){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function safePoint(x,z,r,others=[],ignore=-1,obstacles=OBSTACLES){
 if(Math.hypot(x,z)>8.15-r)return false;
 for(const o of obstacles)if(Math.hypot(x-o.x,z-o.z)<r+o.r+.06)return false;
 for(let i=0;i<others.length;i++)if(i!==ignore&&Math.hypot(x-others[i].x,z-others[i].z)<r+others[i].r+.13)return false;
 return true;
}
export function createWanderers(random=seededRandom()){
 return STARTS.map(([x,z],id)=>({id,x,z,r:RADII[id],yaw:[.8,-1.4,1.1][id],target:{x,z},wait:1+id*1.7,behavior:"look",distance:0,speed:0,blocked:0,arrivals:0,greeting:0}));
}
function angleDifference(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
export function updateWanderers(animals,dt,random){
 dt=Math.min(dt,.05);
 for(let i=0;i<animals.length;i++){
  const a=animals[i],wasGreeting=a.greeting>0;a.speed=0;a.greeting=Math.max(0,a.greeting-dt);
  if(a.greeting>0){if(a.behavior!=="feed")a.behavior="greet";continue;}
  if(wasGreeting)a.behavior="look";
  if(a.wait>0){
   if(a.behavior==="drink")a.yaw+=Math.max(-dt*.8,Math.min(dt*.8,angleDifference(Math.atan2(POND.x-a.x,POND.z-a.z),a.yaw)));
   a.wait-=dt;continue;
  }
  if(Math.hypot(a.x-a.target.x,a.z-a.target.z)<.35||a.blocked>2.5){
   a.arrivals++;
   if(a.blocked<=2.5){a.wait=2+random()*3;a.behavior=a.arrivals%3===0?"graze":"look";}else{a.wait=.4;a.behavior="look";}
   a.blocked=0;
   let found=false;
   // Try several dry shoreline positions so one resident cannot monopolize the pool.
   if(a.arrivals%4===0){for(const offset of [0,.5,-.5,1,-1,1.5,-1.5]){
    const angle=Math.PI+offset,d=POND.r+a.r+.065,x=POND.x+Math.cos(angle)*d,z=POND.z+Math.sin(angle)*d;
    if(safePoint(x,z,a.r,animals,i)){a.target={x,z};a.drinkTrip=true;found=true;break;}
   }}
   for(let k=0;!found&&k<70;k++){const x=(random()-.5)*11,z=(random()-.5)*11;if(safePoint(x,z,a.r,animals,i)&&Math.hypot(x-a.x,z-a.z)>1.5){a.target={x,z};a.drinkTrip=false;found=true;}}
   if(!found)a.target={x:a.x,z:a.z};
   continue;
  }
  const targetAngle=Math.atan2(a.target.x-a.x,a.target.z-a.z);
  const offsets=[0,.4,-.4,.8,-.8,1.3,-1.3,1.9,-1.9,2.7,-2.7];
  let chosen=null,best=-Infinity;
  for(const offset of offsets){
   const angle=a.yaw+Math.max(-dt*.8,Math.min(dt*.8,angleDifference(targetAngle+offset,a.yaw)));
   const nx=a.x+Math.sin(angle)*.33*dt,nz=a.z+Math.cos(angle)*.33*dt;
   if(!safePoint(nx,nz,a.r,animals,i))continue;
   const aheadX=nx+Math.sin(angle)*.42,aheadZ=nz+Math.cos(angle)*.42;
   const clear=safePoint(aheadX,aheadZ,a.r,animals,i);
   const score=Math.cos(angleDifference(targetAngle,angle))+(clear?2:0)-Math.abs(offset)*.035;
   if(score>best){best=score;chosen={nx,nz,angle};}
  }
  if(chosen){
   a.distance+=Math.hypot(chosen.nx-a.x,chosen.nz-a.z);a.x=chosen.nx;a.z=chosen.nz;a.yaw=chosen.angle;a.speed=.33;a.behavior="walk";a.blocked=0;
   if(a.drinkTrip&&Math.hypot(a.x-a.target.x,a.z-a.target.z)<.4){a.wait=4;a.behavior="drink";a.drinkTrip=false;}
  }else{
   // Turn in place before retrying; the conservative circular body bound remains valid.
   a.yaw+=dt*.9;a.blocked+=dt;a.behavior="look";
  }
 }
}
