import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TREE_POINTS,ROCK_POINTS,POND,WORLD_RADIUS,STREAM_END,seededRandom,createWanderers,updateWanderers,commandMove,cancelMove } from "./navigation.mjs";

export type Mood="day"|"sunset"|"night";
export type GroveEvent={type:"phase";phase:Mood}|{type:"move";status:"started"|"arrived"|"blocked";id:number;adjusted?:boolean}|{type:"rotate";enabled:boolean};
export type GroveAPI={select:(id:number)=>void;clear:()=>void;view:(id:string)=>void;pause:(value:boolean)=>void;dispose:()=>void;focus:(id:number)=>void;interact:(id:number,action:"greet"|"feed")=>void;setMood:(mood:Mood)=>void;setDayCycle:(value:boolean)=>void;setAutoRotate:(value:boolean)=>void;capture:()=>string};
type Dino={root:T.Group;torso:T.Group;head:T.Group;tail:T.Group;legs:Leg[];neck?:T.Group;neckBridge?:T.Mesh;lastYaw:number;turnDistance:number;id:number};
type Leg={hip:T.Vector3;upper:T.Mesh;lower:T.Mesh;foot:T.Mesh;anchor:T.Vector3;start:T.Vector3;end:T.Vector3;phase:number;oldPhase:number;anchorYaw:number;endYaw:number;initialized:boolean};
export function createGrove(host:HTMLDivElement,onSelect:(id:number)=>void,onEvent?:(event:GroveEvent)=>void):GroveAPI{
 const random=seededRandom(814),scene=new T.Scene();
 const worldScale=WORLD_RADIUS/8.15;scene.background=new T.Color("#497f74");
 const mobile=host.clientWidth<600;
 const reducedMotion=globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches??false;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:1.8));
 renderer.setSize(host.clientWidth,host.clientHeight);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
 renderer.domElement.setAttribute("aria-label","可旋转、缩放和点选恐龙的迷你丛林");host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(36,host.clientWidth/host.clientHeight,.1,130);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;controls.minPolarAngle=.13;controls.maxPolarAngle=1.35;controls.minDistance=13;controls.maxDistance=55;controls.rotateSpeed=.65;
 controls.target.set(0,1,0);
 scene.fog=new T.Fog("#497f74",65,125);
 const ambient=new T.HemisphereLight("#e8f5df","#568579",1.7);scene.add(ambient);
 const sun=new T.DirectionalLight("#fff0ce",3.05);sun.position.set(-9,16,9);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:55});sun.shadow.bias=-.0007;sun.shadow.normalBias=.025;sun.shadow.radius=4;scene.add(sun);
 const fill=new T.DirectionalLight("#c6eae0",.68);fill.position.set(10,8,-12);scene.add(fill);
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
 const materialCache=new Map<string,T.MeshStandardMaterial>();
 function mat(color:string,roughness=.86){const key=color+roughness;if(!materialCache.has(key)){const m=new T.MeshStandardMaterial({color,roughness,flatShading:true});materialCache.set(key,m);materials.add(m);}return materialCache.get(key)!;}
 // True low-poly geometry: each visible triangle owns its face normal.
 const ball=new T.IcosahedronGeometry(1,1),facet=new T.IcosahedronGeometry(1,0),cylinder=new T.CylinderGeometry(1,1,1,6).toNonIndexed(),cone=new T.ConeGeometry(1,1,5).toNonIndexed(),leafGeo=new T.OctahedronGeometry(1,0);
 for(const g of [ball,facet,cylinder,cone,leafGeo])geometries.add(g);
 function mesh(parent:T.Object3D,geo:T.BufferGeometry,m:T.Material,p:number[],s:number[],shadow=true){const o=new T.Mesh(geo,m);o.position.set(p[0],p[1],p[2]);o.scale.set(s[0],s[1],s[2]);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;}
 function sphere(parent:T.Object3D,color:string,p:number[],s:number[],rough=.86){return mesh(parent,ball,mat(color,rough),p,s);}
 function link(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r1:number,r2:number,color:string){const g=new T.CylinderGeometry(r2,r1,a.distanceTo(b),5).toNonIndexed();geometries.add(g);const o=mesh(parent,g,mat(color),a.clone().add(b).multiplyScalar(.5).toArray(),[1,1,1]);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return o;}
 function point(x:number,y:number,z:number){return new T.Vector3(x,y,z);}
 const ground=new T.Mesh(new T.PlaneGeometry(180,180),new T.ShadowMaterial({opacity:.13}));geometries.add(ground.geometry);materials.add(ground.material);ground.rotation.x=-Math.PI/2;ground.position.y=-2.05;ground.receiveShadow=true;scene.add(ground);
 const island=new T.Group();scene.add(island);
 // Broad triangulated land facets and a tapered, irregular rock shelf replace tiny surface flecks.
 const seasonalMaterials:{material:T.MeshStandardMaterial;colors:Record<Mood,T.Color>}[]=[];
 function palette(day:string,sunset:string,night:string){const material=mat(day);if(!seasonalMaterials.some(p=>p.material===material))seasonalMaterials.push({material,colors:{day:new T.Color(day),sunset:new T.Color(sunset),night:new T.Color(night)}});return material;}
 const landMaterial=new T.MeshStandardMaterial({color:"#65a58c",roughness:1,flatShading:true,vertexColors:true});materials.add(landMaterial);
 seasonalMaterials.push({material:landMaterial,colors:{day:new T.Color("#65a58c"),sunset:new T.Color("#bdad68"),night:new T.Color("#658f9b")}});
 const cliffMaterial=new T.MeshStandardMaterial({color:"#447d70",roughness:1,flatShading:true,vertexColors:true});materials.add(cliffMaterial);
 seasonalMaterials.push({material:cliffMaterial,colors:{day:new T.Color("#447d70"),sunset:new T.Color("#987046"),night:new T.Color("#475c80")}});
 const sectors=20,terrainPositions:number[]=[],terrainColors:number[]=[],cliffPositions:number[]=[],cliffColors:number[]=[];
 function triangle(positions:number[],colors:number[],a:T.Vector3,b:T.Vector3,c:T.Vector3,tone:number){positions.push(...a.toArray(),...b.toArray(),...c.toArray());for(let i=0;i<3;i++)colors.push(tone,tone,tone);}
 const rings=[0,4.6,8.3,WORLD_RADIUS+.22];
 function terrainPoint(ring:number,index:number){const a=index/sectors*Math.PI*2,r=rings[ring]*(1+.016*Math.sin(index*2.3));return point(Math.cos(a)*r,.105,Math.sin(a)*r);}
 for(let i=0;i<sectors;i++){
  triangle(terrainPositions,terrainColors,point(0,.105,0),terrainPoint(1,i+1),terrainPoint(1,i),.86+(i%4)*.055);
  for(let ring=1;ring<3;ring++){const a=terrainPoint(ring,i),b=terrainPoint(ring,i+1),c=terrainPoint(ring+1,i),d=terrainPoint(ring+1,i+1);triangle(terrainPositions,terrainColors,a,b,c,.84+((i+ring)%5)*.05);triangle(terrainPositions,terrainColors,b,d,c,.89+((i*3+ring)%4)*.045);}
  const a=terrainPoint(3,i),b=terrainPoint(3,i+1),shelf=(index:number)=>{const p=terrainPoint(3,index);p.multiplyScalar(.978+(index%3)*.007);p.y=-.8-(index%3)*.1;return p;},bottom=(index:number)=>{const angle=index/sectors*Math.PI*2,r=(WORLD_RADIUS+.22)*(.84+.035*Math.sin(index*2.7));return point(Math.cos(angle)*r,-1.55-(index%3)*.09,Math.sin(angle)*r);},c=shelf(i),d=shelf(i+1),e=bottom(i),f=bottom(i+1);
  triangle(cliffPositions,cliffColors,a,b,c,.56+(i%4)*.14);triangle(cliffPositions,cliffColors,b,d,c,.72+(i%3)*.12);triangle(cliffPositions,cliffColors,c,d,e,.62+(i%3)*.13);triangle(cliffPositions,cliffColors,d,f,e,.75+(i%2)*.13);triangle(cliffPositions,cliffColors,e,f,point(0,-1.65,0),.61+(i%3)*.08);
 }
 for(const [positions,colors,material] of [[terrainPositions,terrainColors,landMaterial],[cliffPositions,cliffColors,cliffMaterial]] as [number[],number[],T.MeshStandardMaterial][]){const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(positions,3));g.setAttribute("color",new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();geometries.add(g);mesh(island,g,material,[0,0,0],[1,1,1]);}
 const staticGroups=new Map<T.Material,T.BufferGeometry[]>();
 function batch(geo:T.BufferGeometry,color:string,p:number[],s:number[],rotation:number[]=[0,0,0]){
  const g=geo.clone();g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p as [number,number,number]),new T.Quaternion().setFromEuler(new T.Euler(...rotation as [number,number,number])),new T.Vector3(...s as [number,number,number])));
  const m=mat(color);if(!staticGroups.has(m))staticGroups.set(m,[]);staticGroups.get(m)!.push(g);
 }
 const windGroups:T.Group[]=[];
 const greens=["#9dbb62","#759c52","#c1cd79","#639975","#8cac61"];
 const warmGreens=["#ddb361","#bf924d","#ebc87d","#a9a45f","#c3aa58"],nightGreens=["#8aaba2","#537f83","#afc6ad","#49758c","#799d9d"];
 greens.forEach((color,i)=>palette(color,warmGreens[i],nightGreens[i]));palette("#e5e5cd","#f4d8b0","#bdcce7");palette("#789183","#9e9272","#6f839f");palette("#af78a2","#d18a71","#ab9bdd");
 TREE_POINTS.forEach(([x,z]:number[],i:number)=>{
  const g=new T.Group();g.position.set(x,.13,z);g.rotation.y=random()*Math.PI*2;island.add(g);
  const tall=i%4===0,h=tall?4.1+(i%3)*.22:2.7+(i%3)*.25,trunk="#e5e5cd";
  // Angular ivory trunks split into a small number of deliberate branches.
  link(g,point(0,0,0),point(.15,h*.62,0),.21,.14,trunk);
  link(g,point(.15,h*.62,0),point(-.12,h,0),.15,.055,trunk);
  for(const side of [-1,1])link(g,point(.09,h*.44,0),point(side*.73,h*.81,side*.08),.115,.045,trunk);
  for(const side of [-1,1])link(g,point(0,.16,0),point(side*.42,.02,.18),.14,.035,trunk);
  const crown=new T.Group();crown.position.set(-.12,h*.85,0);g.add(crown);windGroups.push(crown);
  if(tall){const canopy=mesh(crown,ball,mat(greens[i%5]),[0,.48,0],[.73,1.48,.71]);canopy.rotation.y=.27*i;}
  else{
   const main=mesh(crown,facet,mat(greens[i%5]),[0,.25,0],[1.16,1.03,1.05]);main.rotation.set(.2,i*.6,.1);
   if(i%3!==1){const side=mesh(crown,facet,mat(greens[(i+2)%5]),[.7,-.17,.14],[.7,.72,.66]);side.rotation.set(.1,.8,.4);}
  }
  if(i===5||i===9){link(g,point(.06,h*.43,0),point(-.7,h*.8,.05),.16,.12,trunk);link(g,point(-.7,h*.8,.05),point(-1.08,h*1.03,.05),.12,.055,trunk);}
 });
 // Sparse angular leaf fans and pink shoots leave room for the large terrain facets.
 for(let i=0;i<27;i++){
  const angle=i/27*Math.PI*2+.08*random(),r=WORLD_RADIUS-1.2+random()*.8,x=Math.sin(angle)*r,z=Math.cos(angle)*r;
  if(Math.hypot(x-POND.x,z-POND.z)<1.8)continue;
  const g=new T.Group();g.position.set(x,.13,z);g.rotation.y=random()*Math.PI*2;island.add(g);if(i%3===0)windGroups.push(g);
  for(let j=0;j<3;j++){const lean=(j-1)*.5,leaf=mesh(g,leafGeo,mat(i%4===0?"#af78a2":greens[(i+j)%5]),[lean*.32,.2+Math.abs(lean)*.05,0],[.12,.34+(j%2)*.16,.085]);leaf.rotation.z=-lean;}
  if(i%6===1){const bud=mesh(g,facet,mat("#af78a2"),[.2,.5,.1],[.12,.16,.12]);bud.rotation.z=.2;}
 }
 ROCK_POINTS.forEach(([x,z,r]:number[])=>{const o=mesh(island,facet,mat("#789183"),[x,.42*r,z],[r,.83*r,r]);o.rotation.set(.3,.6,.1);});
 // Quiet blue-green pool, recessed sandy banks, small stones and lily leaves.
 const waterMat=new T.MeshPhysicalMaterial({color:"#91cec5",roughness:.37,metalness:.03,transparent:true,opacity:.88,clearcoat:.35,flatShading:true});materials.add(waterMat);seasonalMaterials.push({material:waterMat,colors:{day:new T.Color("#91cec5"),sunset:new T.Color("#ebbe87"),night:new T.Color("#719fca")}});
 const bankGeo=new T.CylinderGeometry(1.75,1.85,.075,16);geometries.add(bankGeo);mesh(island,bankGeo,mat("#d5ca96"),[POND.x,.137,POND.z],[1,1,.9]);
 const waterGeo=new T.CircleGeometry(1.5,16);geometries.add(waterGeo);const water=mesh(island,waterGeo,waterMat,[POND.x,.182,POND.z],[1,1,.9],false);water.rotation.x=-Math.PI/2;
 for(let i=0;i<12;i++){const a=i*Math.PI*2/12;batch(facet,i%2?"#b3b29c":"#d0c8a8",[POND.x+Math.cos(a)*1.65,.19,POND.z+Math.sin(a)*1.49],[.16+random()*.07,.13,.15]);}
 const ripples:T.Mesh[]=[];const rippleGeo=new T.RingGeometry(.93,1,48);geometries.add(rippleGeo);
 for(let i=0;i<4;i++){const m=new T.MeshBasicMaterial({color:"#e1f2d7",transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide});materials.add(m);const o=mesh(island,rippleGeo,m,[POND.x,.189+i*.001,POND.z],[1,1,1],false);o.rotation.x=-Math.PI/2;ripples.push(o);}
 for(let i=0;i<4;i++){const l=mesh(island,new T.CircleGeometry(.22,12,.2,Math.PI*1.75),mat("#54875a"),[POND.x+.2+i*.24,.192,POND.z+.45*Math.sin(i*2)],[1,1,1],false);geometries.add(l.geometry);l.rotation.x=-Math.PI/2;}
 // A little stream threads its way to the outer bank, as a continuous procedural ribbon.
 const streamEnd=point(STREAM_END.x,.165,STREAM_END.z);
 const streamPoints=Array.from({length:25},(_,i)=>point(POND.x+1,.165,POND.z+1).lerp(streamEnd,i/24));
 const riverVertices:number[]=[],riverIndices:number[]=[];
 streamPoints.forEach((p,i)=>{const width=.25+.06*Math.sin(i*.8);riverVertices.push(p.x-width,p.y,p.z+width,p.x+width,p.y,p.z-width);if(i<24){const a=i*2;riverIndices.push(a,a+1,a+2,a+1,a+3,a+2);}});
 const riverGeo=new T.BufferGeometry();riverGeo.setAttribute("position",new T.Float32BufferAttribute(riverVertices,3));riverGeo.setIndex(riverIndices);riverGeo.computeVertexNormals();geometries.add(riverGeo);waterMat.side=T.DoubleSide;mesh(island,riverGeo,waterMat,[0,.005,0],[1,1,1],false);
 for(const [m,list] of staticGroups){const geo=mergeGeometries(list);if(geo){geometries.add(geo);mesh(island,geo,m,[0,0,0],[1,1,1]);}list.forEach(g=>g.dispose());}

 function collapse(parent:T.Object3D,excluded:T.Object3D[]=[]){
  parent.updateMatrixWorld(true);
  const inversed=parent.matrixWorld.clone().invert(),groups=new Map<T.Material,{geos:T.BufferGeometry[];objects:T.Mesh[]}>();
  parent.traverse(o=>{
   if(!(o as T.Mesh).isMesh)return;
   let ancestor:T.Object3D|null=o;
   while(ancestor&&ancestor!==parent){if(excluded.includes(ancestor))return;ancestor=ancestor.parent;}
   const obj=o as T.Mesh;if(Array.isArray(obj.material)||obj.material.transparent)return;
   const g=obj.geometry.clone().applyMatrix4(inversed.clone().multiply(obj.matrixWorld));
   if(!groups.has(obj.material))groups.set(obj.material,{geos:[],objects:[]});
   groups.get(obj.material)!.geos.push(g);groups.get(obj.material)!.objects.push(obj);
  });
  for(const [m,items] of groups){
   const geo=mergeGeometries(items.geos);
   if(geo){geometries.add(geo);mesh(parent,geo,m,[0,0,0],[1,1,1]);items.objects.forEach(o=>o.removeFromParent());}
   items.geos.forEach(g=>g.dispose());
  }
 }
 windGroups.forEach(g=>collapse(g));collapse(island,windGroups);
 // Faceted, friendly dinosaur anatomy; every limb remains articulated and planted.
 const animals=createWanderers(random);
 const dinos:Dino[]=[];

 function makeDino(id:number){
  const colors=["#e1a06e","#9dbb73","#80bbc3","#e79671","#b6a2e5"],base=colors[id],shade=["#b4774d","#708d52","#508c91","#b6614c","#7968b0"][id],cream="#ffe8be";
  const biped=id>=3;
  const root=new T.Group();root.scale.setScalar(id===4?.68:.85);root.position.set(animals[id].x,.16,animals[id].z);root.rotation.y=animals[id].yaw;scene.add(root);
  const torso=new T.Group();root.add(torso);
  const bodyY=id===2?1.32:biped?1.48:.93;
  const body=sphere(torso,base,[0,bodyY,0],[biped?.58:.65,id===2?.72:biped?.7:.57,id===0?.88:biped?.8:1]);
  if(biped)body.rotation.x=.22;
  sphere(torso,cream,[0,bodyY-.13,biped?.27:.1],[biped?.45:.55,biped?.53:.41,biped?.55:.74]);
  const head=new T.Group();head.position.set(0,bodyY+(biped?.65:.25),id===0?.8:biped?.57:1);torso.add(head);
  let neck:T.Group|undefined;
  if(id===0){
   sphere(head,shade,[0,.17,.04],[.78,.73,.15]); // Neck shield behind the horns.
   for(let j=0;j<11;j++){const a=j*Math.PI/10;const b=sphere(head,base,[Math.cos(a)*.77,.2+Math.sin(a)*.71,.065],[.105,.105,.09]);b.rotation.z=a;}
   sphere(head,base,[0,.05,.38],[.4,.37,.48]);sphere(head,shade,[0,-.04,.74],[.29,.22,.2]);
   for(const x of [-.21,.21]){link(head,point(x,.25,.48),point(x*1.1,.75,.86),.09,.008,cream);}
   link(head,point(0,.11,.88),point(0,.37,1.04),.065,.008,cream);
  }else if(id===1){
   sphere(head,base,[0,-.12,.27],[.23,.26,.4]);sphere(head,shade,[0,-.17,.57],[.21,.16,.18]);
   for(let j=0;j<8;j++){const z=-1.05+j*.29,y=bodyY+.46+Math.sin(j/7*Math.PI)*.13;for(const side of [-1,1]){const plate=mesh(torso,facet,mat(j%2?"#deb375":"#c89d63"),[side*.15,y,z],[.105,.28+Math.sin(j/7*Math.PI)*.19,.22]);plate.rotation.z=side*-.17;plate.rotation.x=.2;}}
  }else if(id===2){
   head.position.set(0,bodyY+.1,.65);
   neck=new T.Group();head.add(neck);
   link(neck,point(0,0,0),point(0,1.3,.34),.31,.2,base);sphere(neck,base,[0,.98,.26],[.235,.44,.23]);link(neck,point(0,1.16,.28),point(0,2,.62),.2,.16,base);
   sphere(neck,base,[0,2.03,.78],[.27,.32,.42]);sphere(neck,shade,[0,1.96,1.05],[.255,.2,.2]);
   // Eyes are attached to the head surface and inherit all neck animation.
   for(const x of [-.225,.225]){sphere(neck,"#f5eedb",[x,2.13,.89],[.052,.071,.077]);sphere(neck,"#283e37",[x*1.04,2.13,.915],[.036,.05,.045],.4);sphere(neck,"#ffffff",[x*1.07,2.151,.932],[.01,.012,.012]);}
   for(let j=0;j<7;j++){sphere(torso,shade,[j%2===0?.55:-.55,bodyY+.1+j%3*.12,-.6+j*.18],[.06,.14,.12]);}
  }
  if(biped){
   // Friendly, recognisable bipeds: a broad T. rex muzzle and a slender feathered raptor.
   const rex=id===3;
   sphere(head,base,[0,.06,.26],[rex?.49:.32,rex?.44:.3,rex?.58:.51]);
   sphere(head,shade,[0,-.12,.67],[rex?.46:.29,rex?.23:.16,rex?.28:.26]);
   sphere(head,cream,[0,-.23,.52],[rex?.37:.235,.075,rex?.36:.32]);
   for(const side of [-1,1]){
    const eyeX=rex?.42:.28;
    sphere(head,"#fff5de",[side*eyeX,.22,.39],[.09,.12,.115]);
    sphere(head,"#283e46",[side*(eyeX+.025),.225,.43],[.062,.083,.072],.35);
    sphere(head,"#ffffff",[side*(eyeX+.066),.257,.46],[.021,.028,.028]);
    sphere(head,rex?"#f3bca0":"#d6b9eb",[side*(eyeX+.02),-.005,.53],[.028,.078,.09]);
    sphere(head,shade,[side*(rex?.23:.16),.015,.83],[.045,.034,.022]);
    const arm=new T.Group();arm.position.set(side*.43,bodyY+.1,.42);arm.rotation.z=side*-.35;torso.add(arm);
    link(arm,point(0,0,0),point(side*.14,-.27,.17),rex?.09:.075,rex?.065:.05,base);
    link(arm,point(side*.14,-.27,.17),point(side*.1,-.24,rex?.35:.51),.06,.045,shade);
    for(let k=0;k<2;k++)sphere(arm,cream,[side*.1+(k-.5)*.06,-.24,rex?.39:.55],[.035,.034,.08]);
   }
   for(let j=0;j<(rex?5:7);j++){
    const ridge=mesh(torso,cone,mat(rex?"#edc17f":"#cce8a1"),[0,bodyY+.63-j*.06,.15-j*.19],[rex?.11:.1,rex?.17:.3,rex?.12:.17]);ridge.rotation.x=-.5;
   }
   if(!rex)for(let j=0;j<3;j++){
    const feather=mesh(head,leafGeo,mat(j%2?"#d9c6f6":"#8d7ab8"),[(j-1)*.11,.37,.03],[.07,.22,.105]);feather.rotation.x=-.8;feather.rotation.z=(j-1)*-.25;
   }
  }
  if(id<2){
   const eyeY=id===0?.18:-.03,eyeZ=id===0?.49:.35,eyeX=id===0?.345:.21;
   for(const side of [-1,1]){sphere(head,"#fff3d9",[side*eyeX,eyeY,eyeZ],[.064,.09,.085]);sphere(head,"#273e32",[side*(eyeX+.025),eyeY,eyeZ+.012],[.041,.061,.05],.4);sphere(head,"#ffffff",[side*(eyeX+.047),eyeY+.025,eyeZ+.03],[.011,.014,.015]);}
  }
  const tail=new T.Group();tail.position.set(0,bodyY,-.77);torso.add(tail);
  link(tail,point(0,0,0),point(0,biped?.05:-.13,-.7),biped?.32:.28,.13,base);link(tail,point(0,biped?.05:-.13,-.68),point(.15,biped?.15:-.17,id===0?-1.13:biped?-1.55:-1.4),.135,.015,base);
  if(id===1)for(const side of [-1,1])for(let j=0;j<2;j++)link(tail,point(0,-.17,-.94-j*.23),point(side*.28,.04,-1.03-j*.23),.055,.007,cream);
  const neckBridge=id!==2?mesh(torso,biped?ball:cylinder,mat(base),[0,biped?1.6:.9,.65],[biped?.27:.2,.3,biped?.27:.2]):undefined;
  const legs:Leg[]=[];
  for(let j=0;j<(biped?2:4);j++){
   const side=j%2===0?-1:1,front=j<2;
   const hip=point(side*(biped?.45:.43),bodyY-.12,biped?-.12:front?.57:-.54);
   const upper=mesh(root,biped?ball:cylinder,mat(base),[0,0,0],[.18,.5,.18]),lower=mesh(root,biped?ball:cylinder,mat(shade),[0,0,0],[.135,.4,.135]),foot=sphere(root,base,[hip.x,.1,hip.z],[biped?.22:.19,.105,biped?.35:.25]);
   for(let k=0;k<3;k++)sphere(foot,cream,[(k-1)*.34,-.16,.74],[.16,.24,.15]); // Local unit coordinates on scaled foot.
   legs.push({hip,upper,lower,foot,anchor:new T.Vector3(),start:new T.Vector3(),end:new T.Vector3(),phase:biped?j*.5:j*.25,oldPhase:0,anchorYaw:root.rotation.y,endYaw:root.rotation.y,initialized:false});
  }
  // Batch each rigid anatomical section, retaining only the joints that animate.
  if(neck)collapse(neck);collapse(head,neck?[neck]:[]);collapse(tail);collapse(torso,[head,tail,...(neckBridge?[neckBridge]:[])]);
  root.traverse(o=>{o.userData.dinosaur=id;});
  const d={root,torso,head,tail,legs,neck,neckBridge,lastYaw:animals[id].yaw,turnDistance:0,id};dinos.push(d);return d;
 }
 for(let i=0;i<animals.length;i++)makeDino(i);
 // Unlit, non-raycast guide meshes stay readable at every time of day. Geometry
 // is pooled once; all animation uses scene time so pause also freezes guidance.
 function guideMaterial(color:string,opacity=1){const m=new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,toneMapped:false,fog:false});materials.add(m);return m;}
 function guideMesh(parent:T.Object3D,geometry:T.BufferGeometry,material:T.Material,y=0){const o=mesh(parent,geometry,material,[0,y,0],[1,1,1],false);o.raycast=()=>{};o.receiveShadow=false;return o;}
 function guideRing(parent:T.Object3D,inner:number,outer:number,material:T.Material,y=0){const geo=new T.RingGeometry(inner,outer,64);geometries.add(geo);const o=guideMesh(parent,geo,material,y);o.rotation.x=-Math.PI/2;return o;}
 const selectionRing=new T.Group();selectionRing.name="selection-halo";selectionRing.visible=false;scene.add(selectionRing);
 guideRing(selectionRing,.85,1.33,guideMaterial("#17364b",.62));
 guideRing(selectionRing,.7,1.46,guideMaterial("#ffdb78",.12),.001);
 guideRing(selectionRing,.94,1.04,guideMaterial("#fff9d6"),.003);
 guideRing(selectionRing,1.17,1.29,guideMaterial("#ffd263"),.004);
 const selectedMeshes=new Map<T.Mesh,T.MeshStandardMaterial>(),selectedMaterials=new Map<T.MeshStandardMaterial,T.MeshStandardMaterial>();
 function restoreSelection(){for(const [o,material] of selectedMeshes)o.material=material;selectedMeshes.clear();}
 function highlightResident(id:number){
  restoreSelection();dinos[id].root.traverse(o=>{const body=o as T.Mesh;if(!body.isMesh||!(body.material instanceof T.MeshStandardMaterial))return;
   const original=body.material;let highlighted=selectedMaterials.get(original);
   if(!highlighted){highlighted=original.clone();highlighted.emissive.set("#ffe0a0");highlighted.emissiveIntensity=.16;selectedMaterials.set(original,highlighted);materials.add(highlighted);}
   selectedMeshes.set(body,original);body.material=highlighted;
  });
 }
 const destination=new T.Group();destination.name="movement-destination";destination.visible=false;scene.add(destination);
 const destinationMat=guideMaterial("#80ffe4"),destinationWhite=guideMaterial("#f2fff7"),destinationShadow=guideMaterial("#123749",.68);
 guideRing(destination,.4,.88,destinationShadow);
 const destinationRing=guideRing(destination,.48,.61,destinationMat,.003);
 const destinationOuter=guideRing(destination,.73,.82,destinationWhite,.005);
 const destinationCore=guideMesh(destination,cone,destinationMat,.88);destinationCore.scale.set(.28,.48,.28);destinationCore.rotation.z=Math.PI;
 const checkShape=new T.Shape();checkShape.moveTo(-.28,.02);checkShape.lineTo(-.12,-.13);checkShape.lineTo(.3,.28);checkShape.lineTo(.39,.18);checkShape.lineTo(-.12,-.31);checkShape.lineTo(-.38,-.07);checkShape.closePath();
 const checkGeo=new T.ShapeGeometry(checkShape);geometries.add(checkGeo);const destinationCheck=guideMesh(destination,checkGeo,destinationWhite,.85);destinationCheck.visible=false;
 const routeGroup=new T.Group();routeGroup.name="movement-route";routeGroup.visible=false;scene.add(routeGroup);
 const routeMaterial=guideMaterial("#a6ffe7"),routeShadow=guideMaterial("#153648",.72);
 const arrowShape=new T.Shape();arrowShape.moveTo(0,.23);arrowShape.lineTo(.19,-.1);arrowShape.lineTo(.085,-.1);arrowShape.lineTo(0,.055);arrowShape.lineTo(-.085,-.1);arrowShape.lineTo(-.19,-.1);arrowShape.closePath();
 const routeGeo=new T.ShapeGeometry(arrowShape);geometries.add(routeGeo);
 const routeArrows=Array.from({length:24},(_,index)=>{const group=new T.Group();group.name="movement-route-arrow-"+index;routeGroup.add(group);group.visible=false;
  const shadow=guideMesh(group,routeGeo,routeShadow);shadow.rotation.x=Math.PI/2;shadow.scale.setScalar(1.4);
  const arrow=guideMesh(group,routeGeo,routeMaterial,.004);arrow.rotation.x=Math.PI/2;return group;
 });
 let destinationId=-1,arrivalTime=-1,blockedTintUntil=0;
 function hideGuidance(){destination.visible=false;routeGroup.visible=false;destinationId=-1;arrivalTime=-1;blockedTintUntil=0;destination.userData.status="idle";routeArrows.forEach(arrow=>arrow.visible=false);}
 function showDestination(id:number,x:number,z:number){destinationId=id;arrivalTime=-1;blockedTintUntil=0;destination.position.set(x,.19,z);destination.visible=true;destination.userData.resident=id;updateGuidance();}
 function updateSelection(){
  if(selected<0)return;const a=animals[selected];selectionRing.position.set(a.x,.19,a.z);
  selectionRing.scale.setScalar(a.r*.72*(reducedMotion?1:1+Math.sin(time*1.8)*.012));selectionRing.userData.resident=selected;
 }
 function updateGuidance(){
  if(!destination.visible||destinationId<0)return;const a=animals[destinationId],arrived=arrivalTime>=0,age=arrived?time-arrivalTime:0;
  if(arrived&&age>=1.5){hideGuidance();return;}
  const blocked=!arrived&&(a.moveStatus==="blocked"||time<blockedTintUntil),fade=arrived?1-T.MathUtils.clamp((age-.6)/.9,0,1):1;
  destination.userData.status=arrived?"arrived":blocked?"blocked":"moving";
  const color=arrived?"#b7ff83":blocked?"#ffc766":"#80ffe4";destinationMat.color.set(color);routeMaterial.color.set(color);
  destinationMat.opacity=fade;destinationWhite.opacity=fade;destinationShadow.opacity=fade*.68;
  const pulse=reducedMotion?1:1+Math.sin(time*3)*.075;destinationRing.scale.setScalar(pulse);destinationOuter.scale.setScalar(reducedMotion?1:1+Math.sin(time*3+.7)*.04);
  destinationCore.visible=!arrived;destinationCore.position.y=.88+(reducedMotion?0:Math.sin(time*3)*.065);destinationCheck.visible=arrived;destinationCheck.quaternion.copy(camera.quaternion);
  routeGroup.visible=!arrived&&a.path.length>0;routeGroup.userData.resident=destinationId;
  // Sample the remaining A* polyline, never a direct line to the destination.
  // Re-use the 24 arrow meshes and walk segments without allocating per frame.
  const path=a.path as {x:number;z:number}[];let length=0,from:{x:number;z:number}=a;for(const waypoint of path){length+=Math.hypot(waypoint.x-from.x,waypoint.z-from.z);from=waypoint;}
  const count=Math.min(routeArrows.length,Math.max(0,Math.floor((length-.7)/.75))),spacing=length/(count+1);routeGroup.userData.remainingLength=length;
  for(let i=0;i<routeArrows.length;i++){
   const arrow=routeArrows[i];arrow.visible=routeGroup.visible&&i<count;if(!arrow.visible)continue;
   let along=(i+1)*spacing;from=a;
   for(let segment=0;segment<path.length;segment++){
    const to=path[segment],distance=Math.hypot(to.x-from.x,to.z-from.z);
    if(along<=distance||segment===path.length-1){const part=distance?along/distance:0;arrow.position.set(T.MathUtils.lerp(from.x,to.x,part),.205,T.MathUtils.lerp(from.z,to.z,part));arrow.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);arrow.scale.setScalar(reducedMotion?1:.96+.04*Math.sin(time*3-i*.7));arrow.userData.segment=segment;break;}
    along-=distance;from=to;
   }
  }
 }
 const observedMoves=new Map<number,{notified:"moving"|"blocked";blockedFor:number;movingFor:number}>();
 // Procedural stars and fireflies add a readable sense of night without darkening the residents.
 const starPositions:number[]=[];
 for(let i=0;i<84;i++){const a=random()*Math.PI*2,r=12+random()*7;starPositions.push(Math.cos(a)*r,6+random()*11,Math.sin(a)*r);}
 const starGeo=new T.BufferGeometry();starGeo.setAttribute("position",new T.Float32BufferAttribute(starPositions,3));geometries.add(starGeo);
 const starMat=new T.PointsMaterial({color:"#d8e8ff",size:.09,transparent:true,opacity:0,depthWrite:false});materials.add(starMat);const stars=new T.Points(starGeo,starMat);scene.add(stars);
 const fireflyGeo=new T.BufferGeometry();const fireflyPositions=new Float32Array(24*3);fireflyGeo.setAttribute("position",new T.BufferAttribute(fireflyPositions,3));geometries.add(fireflyGeo);
 const fireflyMat=new T.PointsMaterial({color:"#f5ffc0",size:.095,transparent:true,opacity:0,depthWrite:false});materials.add(fireflyMat);const fireflies=new T.Points(fireflyGeo,fireflyMat);scene.add(fireflies);
 const sunOrbMat=new T.MeshBasicMaterial({color:"#ffda79",transparent:true,opacity:.9});materials.add(sunOrbMat);
 const moonMat=new T.MeshBasicMaterial({color:"#e7f1ff",transparent:true,opacity:0});materials.add(moonMat);
 const sunOrb=mesh(scene,ball,sunOrbMat,[-9,8,-10],[.65,.65,.65],false),moon=mesh(scene,ball,moonMat,[-9,8,-10],[.58,.58,.58],false);
 sunOrb.userData.decoration=true;moon.userData.decoration=true;
 // Insects and procedural, edge-softened mist wisps; no image assets.
 const insects:T.Group[]=[];
 for(let i=0;i<9;i++){const g=new T.Group();scene.add(g);sphere(g,"#e4b765",[0,0,0],[.025,.03,.08]);for(const side of [-1,1]){const wing=mesh(g,leafGeo,mat(i%2?"#e2dcaa":"#bbcda1"),[side*.09,0,0],[.1,.016,.065],false);wing.rotation.z=side*.4;}insects.push(g);}
 const mistMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{t:{value:0}},vertexShader:"varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"varying vec2 v;uniform float t;void main(){float d=length((v-0.5)*vec2(1.,2.5));float a=(1.-smoothstep(.08,.55,d))*.065;gl_FragColor=vec4(.91,.96,.89,a);}"});materials.add(mistMat);
 const mistGeo=new T.PlaneGeometry(5.5,1.8);geometries.add(mistGeo);const mists:T.Mesh[]=[];
 for(let i=0;i<5;i++){const o=mesh(scene,mistGeo,mistMat,[-5+i*2.5,.6,-5+(i%2)*1.5],[1,1,1],false);mists.push(o);}
 function poseLeg(leg:Leg,root:T.Group,distance:number,moving:boolean,id:number){
  const phase=(distance/.72+leg.phase)%1;
  root.updateMatrixWorld(true);
  const nominal=leg.hip.clone();nominal.y=.04;
  const targetWorld=root.localToWorld(nominal.clone());
  if(!leg.initialized){leg.anchor.copy(targetWorld);leg.start.copy(targetWorld);leg.end.copy(targetWorld);leg.oldPhase=phase;leg.initialized=true;}
  if(moving){
   if(phase<.63){ // Stance: the world-space foot remains planted.
    if(leg.oldPhase>=.63){leg.anchor.copy(leg.end);leg.anchorYaw=leg.endYaw;}
    leg.foot.position.copy(root.worldToLocal(leg.anchor.clone()));leg.foot.rotation.y=leg.anchorYaw-root.rotation.y;
   }else{
    if(leg.oldPhase<.63){leg.start.copy(leg.anchor);const ahead=nominal.clone();ahead.z+=.27;leg.end.copy(root.localToWorld(ahead));leg.endYaw=root.rotation.y;}
    const p=(phase-.63)/.37,e=p*p*(3-2*p),w=leg.start.clone().lerp(leg.end,e);w.y+=Math.sin(p*Math.PI)*.18;
    leg.foot.position.copy(root.worldToLocal(w));
    const turn=Math.atan2(Math.sin(leg.endYaw-leg.anchorYaw),Math.cos(leg.endYaw-leg.anchorYaw));leg.foot.rotation.y=leg.anchorYaw+turn*e-root.rotation.y;
   }
  }else{
   // Gently settle residual swing to the ground when stopping.
   const w=root.localToWorld(leg.foot.position.clone());w.y=T.MathUtils.lerp(w.y,.2,.15);leg.anchor.copy(w);leg.start.copy(w);leg.end.copy(w);leg.anchorYaw=root.rotation.y+leg.foot.rotation.y;leg.endYaw=leg.anchorYaw;leg.foot.position.copy(root.worldToLocal(w));
  }
  leg.oldPhase=phase;
  const hip=leg.hip,foot=leg.foot.position;
  const mid=hip.clone().lerp(foot,.5);mid.z+=id>=3?.38:id===2?.1:.13;mid.y+=.025;
  function segment(o:T.Mesh,a:T.Vector3,b:T.Vector3,r:number){o.position.copy(a).add(b).multiplyScalar(.5);o.scale.set(r,o.geometry===ball?a.distanceTo(b)/2+r*.35:a.distanceTo(b),r);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());}
  segment(leg.upper,hip,mid,id>=3?.23:id===2?.175:.17);segment(leg.lower,mid,foot,id>=3?.145:.13);
 }
 let paused=false,time=0,selected=-1,focused=-1,frame=0,last=performance.now(),disposed=false;
 let mood:Mood="day",dayCycle=true,cycleClock=0,autoRotate=false,nightAmount=0,lightingChanged=false;
 const lighting:Record<Mood,{sun:T.Color;sky:T.Color;ground:T.Color;background:T.Color;fill:T.Color;sunPower:number;ambientPower:number;fillPower:number;exposure:number}>={
  day:{sun:new T.Color("#fff0ce"),sky:new T.Color("#e8f5df"),ground:new T.Color("#568579"),background:new T.Color("#497f74"),fill:new T.Color("#c6eae0"),sunPower:3.05,ambientPower:1.7,fillPower:.68,exposure:1.04},
  sunset:{sun:new T.Color("#ffc17b"),sky:new T.Color("#f6c98c"),ground:new T.Color("#a56c57"),background:new T.Color("#aa683c"),fill:new T.Color("#eebd9d"),sunPower:2.85,ambientPower:1.8,fillPower:.7,exposure:1.02},
  night:{sun:new T.Color("#bfcbff"),sky:new T.Color("#b7cff4"),ground:new T.Color("#5c73a3"),background:new T.Color("#1b2649"),fill:new T.Color("#adbcf5"),sunPower:1.75,ambientPower:2.05,fillPower:1,exposure:1.07}
 };
 function changePhase(next:Mood){if(next===mood)return;mood=next;lightingChanged=paused;onEvent?.({type:"phase",phase:mood});}
 function setAutoRotate(value:boolean){autoRotate=value;controls.autoRotate=value;if(value){cameraTransition=null;focused=-1;}onEvent?.({type:"rotate",enabled:value});}
 function stopAutoRotate(){if(autoRotate)setAutoRotate(false);}
 controls.autoRotateSpeed=.36;
 // A small reusable particle pool keeps every interaction entirely procedural.
 const heart=new T.Shape();heart.moveTo(0,.15);heart.bezierCurveTo(-.3,.5,-.6,.1,0,-.35);heart.bezierCurveTo(.6,.1,.3,.5,0,.15);
 const heartGeo=new T.ShapeGeometry(heart);geometries.add(heartGeo);
 const particles=Array.from({length:12},(_,i)=>{const m=new T.MeshBasicMaterial({color:i%2?"#de8d75":"#deb75e",transparent:true,depthWrite:false,side:T.DoubleSide});materials.add(m);const o=mesh(scene,heartGeo,m,[0,0,0],[.32,.32,.32],false);o.visible=false;return {o,age:2,origin:new T.Vector3(),offset:i};});
 const snacks=new T.Group();scene.add(snacks);snacks.visible=false;
 for(let j=0;j<5;j++){sphere(snacks,j%2?"#dd8872":"#e7bb74",[(j-2)*.12,.08,Math.sin(j*3)*.14],[.1,.1,.1]);}
 let snackAge=0;
 let cameraTransition:{start:T.Vector3;end:T.Vector3;startTarget:T.Vector3;endTarget:T.Vector3;p:number}|null=null;
 let framingBasis=1.06,minDistanceFactor=13*worldScale,framing=Math.max(1,1.06/(host.clientWidth/host.clientHeight));
 // Portrait framing pulls the camera back; keep the atmospheric fog at the
 // same relative distance instead of washing out the entire island.
 function syncFramingFog(){const fog=scene.fog as T.Fog;fog.near=65*framing;fog.far=125*framing;}
 function setView(id:string,immediate=false){
  focused=-1;
  const aspect=host.clientWidth/host.clientHeight,fit=Math.max(1,1.06/aspect);framingBasis=1.06;minDistanceFactor=13*worldScale;framing=fit;syncFramingFog();
  const p=id==="pond"?point(15,10,15):id==="overhead"?point(.01,27,.01):point(18,15,21);
  p.multiplyScalar(fit*worldScale);const target=id==="pond"?point(1.5,.6,-.2):point(0,1,0);
  controls.minDistance=13*fit*worldScale;controls.maxDistance=58*fit*worldScale;camera.far=controls.maxDistance+50;camera.updateProjectionMatrix();
  if(immediate){camera.position.copy(p);controls.target.copy(target);controls.update();}
  else cameraTransition={start:camera.position.clone(),end:p,startTarget:controls.target.clone(),endTarget:target,p:0};
 }
 setView("grove",true);
 const onResize=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,host.clientWidth<600?1.5:1.8));camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);const next=Math.max(1,framingBasis/camera.aspect);const ratio=next/framing;camera.position.sub(controls.target).multiplyScalar(ratio).add(controls.target);
  if(cameraTransition){cameraTransition.end.sub(cameraTransition.endTarget).multiplyScalar(ratio).add(cameraTransition.endTarget);cameraTransition.start.copy(camera.position);cameraTransition.startTarget.copy(controls.target);cameraTransition.p=0;}
  framing=next;syncFramingFog();controls.minDistance=minDistanceFactor*next;controls.maxDistance=58*next*worldScale;camera.far=controls.maxDistance+50;camera.updateProjectionMatrix();};
 const resizeObserver=new ResizeObserver(onResize);resizeObserver.observe(host);
 const raycaster=new T.Raycaster(),pointer=new T.Vector2(),groundPlane=new T.Plane(point(0,1,0),-.13);
 const pointers=new Map<number,{x:number;y:number;time:number;moved:boolean}>();let multitouch=false;
 const pointerDown=(e:PointerEvent)=>{if(e.button!==0)return;stopAutoRotate();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,time:performance.now(),moved:false});if(pointers.size>1)multitouch=true;cameraTransition=null;};
 const pointerMove=(e:PointerEvent)=>{const p=pointers.get(e.pointerId);if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>7){p.moved=true;focused=-1;}};
 function select(id:number){
  if(!Number.isInteger(id)||id<0||id>=dinos.length)return;if(focused!==id)focused=-1;
  if(selected!==id){hideGuidance();highlightResident(id);}selected=id;
  if(!animals[id].manualTarget){animals[id].greeting=2.6;animals[id].behavior="greet";}
  selectionRing.visible=true;updateSelection();const target=animals[id].manualTarget as {x:number;z:number}|null;if(target)showDestination(id,target.x,target.z);onSelect(id);
 }
 function focus(id:number){
  if(!dinos[id])return;stopAutoRotate();focused=id;
  const fit=Math.max(1,.8/camera.aspect),target=dinos[id].root.position.clone().add(point(0,id===2?1.35:1,0));
  const distance=(id===4?8:9.2)*fit,offset=new T.Vector3();
  const clearRay=new T.Raycaster();let bestScore=-Infinity;
  island.updateMatrixWorld(true);
  for(const turn of [.65,-.65,1.5,-1.5,2.35,-2.35,Math.PI,0]){
   const angle=animals[id].yaw+turn,candidate=point(Math.sin(angle)*distance,4.7*fit,Math.cos(angle)*distance),length=candidate.length();
   clearRay.set(target,candidate.clone().normalize());clearRay.far=length-.6;
   const blocked=clearRay.intersectObject(island,true)[0],score=blocked?blocked.distance/length:2-Math.abs(turn)*.02;
   if(score>bestScore){bestScore=score;offset.copy(candidate);}
  }
  framingBasis=.8;minDistanceFactor=5;framing=fit;syncFramingFog();controls.minDistance=5*fit;
  cameraTransition={start:camera.position.clone(),end:target.clone().add(offset),startTarget:controls.target.clone(),endTarget:target,p:0};
 }
 function interact(id:number,action:"greet"|"feed"){
  if(!dinos[id])return;cancelMove(animals[id]);observedMoves.delete(id);if(destinationId===id)hideGuidance();select(id);paused=false;const a=animals[id];a.greeting=3;a.behavior=action==="feed"?"feed":"greet";
  const origin=dinos[id].root.position.clone().add(point(0,2.4,0));
  if(!reducedMotion)particles.forEach((p,i)=>{p.age=-i*.085;p.origin.copy(origin);});
  if(action==="feed"){const reach=id===2?2.4:id===3?1.7:id===4?1.36:1.1;snacks.position.set(a.x+Math.sin(a.yaw)*reach,.22,a.z+Math.cos(a.yaw)*reach);snacks.visible=true;snackAge=3;}
 }
 const pointerUp=(e:PointerEvent)=>{
  const press=pointers.get(e.pointerId);pointers.delete(e.pointerId);
  if(multitouch){if(!pointers.size)multitouch=false;return;}
  if(!press||press.moved||Math.hypot(e.clientX-press.x,e.clientY-press.y)>7||performance.now()-press.time>650)return;
  const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  // Dinosaur picking has priority over ground commands. Markers and atmosphere never intercept taps.
  const hit=raycaster.intersectObjects(dinos.map(d=>d.root),true)[0];if(hit){select(hit.object.userData.dinosaur);return;}
  if(selected<0)return;
  const landing=raycaster.ray.intersectPlane(groundPlane,new T.Vector3());
  if(!landing||Math.hypot(landing.x,landing.z)>WORLD_RADIUS+.2){if(destinationId===selected){blockedTintUntil=time+1.3;updateGuidance();}onEvent?.({type:"move",status:"blocked",id:selected});return;}
  const move=commandMove(animals,selected,landing.x,landing.z);
  if(!move.accepted){if(destinationId===selected){blockedTintUntil=time+1.3;updateGuidance();}onEvent?.({type:"move",status:"blocked",id:selected});return;}
  paused=false;focused=-1;cameraTransition=null;showDestination(selected,move.x!,move.z!);observedMoves.clear();observedMoves.set(selected,{notified:"moving",blockedFor:0,movingFor:0});
  onEvent?.({type:"move",status:"started",id:selected,adjusted:move.adjusted});
 };
 const pointerCancel=(e:PointerEvent)=>{pointers.delete(e.pointerId);multitouch=pointers.size>0;};
 renderer.domElement.addEventListener("pointerdown",pointerDown);renderer.domElement.addEventListener("pointermove",pointerMove);renderer.domElement.addEventListener("pointerup",pointerUp);renderer.domElement.addEventListener("pointercancel",pointerCancel);renderer.domElement.addEventListener("lostpointercapture",pointerCancel);
 const wheel=()=>{focused=-1;cameraTransition=null;stopAutoRotate();};renderer.domElement.addEventListener("wheel",wheel,{passive:true});
 controls.addEventListener("start",()=>{cameraTransition=null;stopAutoRotate();});
 function animate(now:number){
  if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.max(0,Math.min((now-last)/1000,.04));last=now;
  if(!document.hidden&&!paused){
   time+=dt;
   if(dayCycle){cycleClock=(cycleClock+dt)%120;changePhase(cycleClock<42?"day":cycleClock<62?"sunset":cycleClock<106?"night":"day");}
   updateWanderers(animals,dt,random);
   for(const [id,state] of observedMoves){
    const next=animals[id].moveStatus;
    if(next==="idle"){observedMoves.delete(id);if(destinationId===id)hideGuidance();continue;}
    if(next==="arrived"){observedMoves.delete(id);onEvent?.({type:"move",status:"arrived",id});if(destinationId===id)arrivalTime=time;continue;}
    if(next==="blocked"){state.blockedFor+=dt;state.movingFor=0;if(state.blockedFor>.9&&state.notified!=="blocked"){state.notified="blocked";onEvent?.({type:"move",status:"blocked",id});}}
    else if(next==="moving"){state.movingFor+=dt;state.blockedFor=0;if(state.movingFor>.6&&state.notified==="blocked"){state.notified="moving";onEvent?.({type:"move",status:"started",id});}}
   }
   dinos.forEach((d,i)=>{const a=animals[i];d.root.position.set(a.x,.16,a.z);d.root.rotation.y=a.yaw;
    const turn=Math.abs(Math.atan2(Math.sin(a.yaw-d.lastYaw),Math.cos(a.yaw-d.lastYaw)));d.lastYaw=a.yaw;d.turnDistance+=turn*.45;
    const moving=a.speed>0||turn>.0005;d.torso.position.y=moving?Math.sin((a.distance+d.turnDistance)*17)*.018:Math.sin(time*1.3+i)*.01;
    const greeting=a.greeting>0&&a.behavior!=="feed",squish=greeting?Math.sin(time*9)*.045*Math.min(1,a.greeting):0;d.torso.scale.set(1-squish*.45,1+squish,1-squish*.45);
    d.tail.rotation.y=Math.sin(time*1.7+i)*.12;d.torso.rotation.x=T.MathUtils.lerp(d.torso.rotation.x,i>=3&&(a.behavior==="drink"||a.behavior==="feed")?.25:0,.07);d.torso.position.z=T.MathUtils.lerp(d.torso.position.z,i>=3&&a.behavior==="drink"?.28:0,.07);
    const nod=a.behavior==="graze"||a.behavior==="drink"||a.behavior==="feed"?.5+.07*Math.sin(time*2):a.greeting>0?-.12+Math.sin(time*6)*.14:Math.sin(time*.6+i)*.06;
    d.head.rotation.x=T.MathUtils.lerp(d.head.rotation.x,nod,.07);
    const headY=i===2?1.42:i>=3?2.13:1.18,feeding=a.behavior==="graze"||a.behavior==="feed";
    const lower=a.behavior==="drink"||a.behavior==="feed"?(i===0?.64:i===1?.57:i>=3?1:.87):feeding?.25:0;
    d.head.position.y=T.MathUtils.lerp(d.head.position.y,headY-lower,.07);
    const headZ=i===0?.8:i===1?1:i>=3?.57:.65;d.head.position.z=T.MathUtils.lerp(d.head.position.z,headZ+(a.behavior==="drink"?(i===0?.65:i===1?.85:i>=3?1.03:0):i>=3&&a.behavior==="feed"?.6:0),.07);
    if(d.neckBridge){const from=point(0,i>=3?1.48:.93,.5),to=d.head.position.clone();d.neckBridge.position.copy(from).add(to).multiplyScalar(.5);const radius=i>=3?.27:i===0?.25:.16;d.neckBridge.scale.set(radius,i>=3?from.distanceTo(to)/2+.1:from.distanceTo(to),radius);d.neckBridge.quaternion.setFromUnitVectors(point(0,1,0),to.sub(from).normalize());}
    d.head.rotation.y=a.greeting>0?Math.sin(time*5)*.1:Math.sin(time*.5+i)*.05;
    if(d.neck)d.neck.rotation.x=T.MathUtils.lerp(d.neck.rotation.x,(a.behavior==="drink"||a.behavior==="feed")?.75:feeding?.3:Math.sin(time*.6)*.055,.06);
    d.legs.forEach(l=>poseLeg(l,d.root,a.distance+d.turnDistance,moving,i));
   });
   particles.forEach(p=>{p.age+=dt;p.o.visible=p.age>=0&&p.age<1.7;if(p.o.visible){p.o.position.copy(p.origin).add(point(Math.sin(p.offset*2.4)*(.2+p.age*.4),p.age*.8,Math.cos(p.offset*2.4)*(.2+p.age*.4)));p.o.quaternion.copy(camera.quaternion);(p.o.material as T.MeshBasicMaterial).opacity=Math.sin(p.age/1.7*Math.PI)*.85;}});
   if(snacks.visible){snackAge-=dt;snacks.visible=snackAge>0;snacks.scale.setScalar(Math.min(1,Math.max(0,snackAge)));}
   windGroups.forEach((g,i)=>{g.rotation.z=Math.sin(time*.75+i)*.025;g.rotation.x=Math.sin(time*.5+i)*.015;});
   ripples.forEach((o,i)=>{const p=(time*.18+i*.25)%1;o.scale.setScalar(.12+p*1.34);(o.material as T.MeshBasicMaterial).opacity=Math.sin(p*Math.PI)*.22;});
   insects.forEach((g,i)=>{g.position.set(Math.sin(time*.3+i*2)*5,1.1+Math.sin(time*.7+i)*.5,Math.cos(time*.24+i*3)*5);g.rotation.y=-time*.3+i;g.children.forEach((o,j)=>{if(j>0)o.rotation.z=Math.sin(time*28)*.5*(j===1?1:-1);});});
   mists.forEach((o,i)=>{o.position.x=-5+i*2.5+Math.sin(time*.08+i)*.7;o.quaternion.copy(camera.quaternion);});
   for(let i=0;i<24;i++){const a=i*2.399+time*.045,r=3+(i%7)*1.1;fireflyPositions[i*3]=Math.sin(a)*r;fireflyPositions[i*3+1]=.65+Math.sin(time*.6+i)*.28+(i%4)*.28;fireflyPositions[i*3+2]=Math.cos(a)*r;}
   fireflyGeo.attributes.position.needsUpdate=true;
   updateGuidance();
  }
  updateSelection();
  if(cameraTransition){cameraTransition.p=reducedMotion?1:Math.min(1,cameraTransition.p+dt*1.3);const p=cameraTransition.p,e=p*p*(3-2*p);camera.position.lerpVectors(cameraTransition.start,cameraTransition.end,e);controls.target.lerpVectors(cameraTransition.startTarget,cameraTransition.endTarget,e);if(p===1)cameraTransition=null;}
  if(focused>=0&&!cameraTransition&&!paused){const target=dinos[focused].root.position.clone().add(point(0,focused===2?1.35:1,0)),shift=target.sub(controls.target).multiplyScalar(Math.min(1,dt*3));controls.target.add(shift);camera.position.add(shift);}
  const light=lighting[mood],blend=Math.min(1,dt*1.1);
  if(!paused||lightingChanged){seasonalMaterials.forEach(p=>p.material.color.lerp(p.colors[mood],blend));sun.color.lerp(light.sun,blend);sun.intensity=T.MathUtils.lerp(sun.intensity,light.sunPower,blend);ambient.color.lerp(light.sky,blend);ambient.groundColor.lerp(light.ground,blend);ambient.intensity=T.MathUtils.lerp(ambient.intensity,light.ambientPower,blend);fill.color.lerp(light.fill,blend);fill.intensity=T.MathUtils.lerp(fill.intensity,light.fillPower,blend);scene.fog!.color.lerp(light.background,blend);(scene.background as T.Color).lerp(light.background,blend);renderer.toneMappingExposure=T.MathUtils.lerp(renderer.toneMappingExposure,light.exposure,blend);nightAmount=T.MathUtils.lerp(nightAmount,mood==="night"?1:0,blend);if(Math.abs(nightAmount-(mood==="night"?1:0))<.001&&Math.abs(sun.intensity-light.sunPower)<.001)lightingChanged=false;}
  starMat.opacity=nightAmount*.9;fireflyMat.opacity=nightAmount*.95;sunOrbMat.opacity=(1-nightAmount)*.9;moonMat.opacity=nightAmount;sunOrb.visible=nightAmount<.98;moon.visible=nightAmount>.02;
  controls.autoRotate=autoRotate&&!paused&&!cameraTransition;controls.update(dt);renderer.render(scene,camera);
 }
 // Initialise complete geometry and planted feet before the first frame.
 dinos.forEach((d,i)=>d.legs.forEach(l=>poseLeg(l,d.root,0,false,i)));
 renderer.render(scene,camera);frame=requestAnimationFrame(animate);
 return {select,focus,interact,
  setMood(next){if(!lighting[next])return;dayCycle=false;changePhase(next);},
  setDayCycle(value){dayCycle=value;if(value){cycleClock=mood==="day"?0:mood==="sunset"?42:62;}},
  setAutoRotate,
  capture(){renderer.render(scene,camera);return renderer.domElement.toDataURL("image/png");},
  clear(){selected=-1;selectionRing.visible=false;focused=-1;restoreSelection();hideGuidance();},view:setView,pause(v){paused=v;if(v){cameraTransition=null;controls.autoRotate=false;const damping=controls.enableDamping;controls.enableDamping=false;controls.update(0);controls.enableDamping=damping;}},
  dispose(){disposed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();controls.dispose();renderer.domElement.removeEventListener("wheel",wheel);renderer.domElement.removeEventListener("pointerdown",pointerDown);renderer.domElement.removeEventListener("pointermove",pointerMove);renderer.domElement.removeEventListener("pointerup",pointerUp);renderer.domElement.removeEventListener("pointercancel",pointerCancel);renderer.domElement.removeEventListener("lostpointercapture",pointerCancel);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());sun.shadow.dispose();renderer.dispose();renderer.domElement.remove();}
 };
}
