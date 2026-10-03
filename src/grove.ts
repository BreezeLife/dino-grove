import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TREE_POINTS,ROCK_POINTS,POND,seededRandom,createWanderers,updateWanderers } from "./navigation.mjs";

export type GroveAPI={select:(id:number)=>void;clear:()=>void;view:(id:string)=>void;pause:(value:boolean)=>void;dispose:()=>void;focus:(id:number)=>void;interact:(id:number,action:"greet"|"feed")=>void;setMood:(mood:"day"|"sunset")=>void;capture:()=>string};
type Dino={root:T.Group;torso:T.Group;head:T.Group;tail:T.Group;legs:Leg[];neck?:T.Group;neckBridge?:T.Mesh;lastYaw:number;turnDistance:number;id:number};
type Leg={hip:T.Vector3;upper:T.Mesh;lower:T.Mesh;foot:T.Mesh;anchor:T.Vector3;start:T.Vector3;end:T.Vector3;phase:number;oldPhase:number;anchorYaw:number;endYaw:number;initialized:boolean};
export function createGrove(host:HTMLDivElement,onSelect:(id:number)=>void):GroveAPI{
 const random=seededRandom(814),scene=new T.Scene();
 const mobile=host.clientWidth<600;
 const reducedMotion=globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches??false;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:1.8));
 renderer.setSize(host.clientWidth,host.clientHeight);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
 renderer.domElement.setAttribute("aria-label","可旋转、缩放和点选恐龙的迷你丛林");host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(36,host.clientWidth/host.clientHeight,.1,130);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;controls.minPolarAngle=.13;controls.maxPolarAngle=1.35;controls.minDistance=13;controls.maxDistance=55;controls.rotateSpeed=.65;
 controls.target.set(0,1,0);
 scene.fog=new T.Fog("#f0f0e5",43,85);
 const ambient=new T.HemisphereLight("#fff6e5","#879d80",2.8);scene.add(ambient);
 const sun=new T.DirectionalLight("#fff1d9",2.8);sun.position.set(-9,16,9);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:45});sun.shadow.bias=-.0007;sun.shadow.normalBias=.025;sun.shadow.radius=4;scene.add(sun);
 const fill=new T.DirectionalLight("#d2eeee",1);fill.position.set(10,8,-12);scene.add(fill);
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
 const materialCache=new Map<string,T.MeshStandardMaterial>();
 function mat(color:string,roughness=.86){const key=color+roughness;if(!materialCache.has(key)){const m=new T.MeshStandardMaterial({color,roughness});materialCache.set(key,m);materials.add(m);}return materialCache.get(key)!;}
 const ball=new T.SphereGeometry(1,16,12),facet=new T.IcosahedronGeometry(1,1),cylinder=new T.CylinderGeometry(1,1,1,9),cone=new T.ConeGeometry(1,1,9),leafGeo=new T.SphereGeometry(1,8,6);
 for(const g of [ball,facet,cylinder,cone,leafGeo])geometries.add(g);
 function mesh(parent:T.Object3D,geo:T.BufferGeometry,m:T.Material,p:number[],s:number[],shadow=true){const o=new T.Mesh(geo,m);o.position.set(p[0],p[1],p[2]);o.scale.set(s[0],s[1],s[2]);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;}
 function sphere(parent:T.Object3D,color:string,p:number[],s:number[],rough=.86){return mesh(parent,ball,mat(color,rough),p,s);}
 function link(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r1:number,r2:number,color:string){const g=new T.CylinderGeometry(r2,r1,a.distanceTo(b),9);geometries.add(g);const o=mesh(parent,g,mat(color),a.clone().add(b).multiplyScalar(.5).toArray(),[1,1,1]);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return o;}
 function point(x:number,y:number,z:number){return new T.Vector3(x,y,z);}
 const ground=new T.Mesh(new T.PlaneGeometry(180,180),new T.ShadowMaterial({opacity:.13}));geometries.add(ground.geometry);materials.add(ground.material);ground.rotation.x=-Math.PI/2;ground.position.y=-1.3;ground.receiveShadow=true;scene.add(ground);
 const island=new T.Group();scene.add(island);
 // Stacked, scalloped exposed-earth terraces.
 for(const [r,y,h,color] of [[8.5,-.64,1.14,"#ad8e67"],[8.42,-.14,.24,"#ccbb89"],[8.35,.025,.15,"#8ba15a"]] as [number,number,number,string][]){
  const geo=new T.CylinderGeometry(r,r*.97,h,64,1);const positions=geo.attributes.position;
  for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),angle=Math.atan2(z,x);const f=1+.015*Math.sin(angle*7)+.013*Math.sin(angle*11);positions.setX(i,x*f);positions.setZ(i,z*f);}geo.computeVertexNormals();geometries.add(geo);mesh(island,geo,mat(color),[0,y,0],[1,1,1]);
 }
 // Soft moss patches and pebbles are batched to keep mobile draw calls low.
 const staticGroups=new Map<T.Material,T.BufferGeometry[]>();
 function batch(geo:T.BufferGeometry,color:string,p:number[],s:number[],rotation:number[]=[0,0,0]){
  const g=geo.clone();g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p as [number,number,number]),new T.Quaternion().setFromEuler(new T.Euler(...rotation as [number,number,number])),new T.Vector3(...s as [number,number,number])));
  const m=mat(color);if(!staticGroups.has(m))staticGroups.set(m,[]);staticGroups.get(m)!.push(g);
 }
 for(let i=0;i<110;i++){const angle=random()*Math.PI*2,r=7.9*Math.sqrt(random()),x=Math.cos(angle)*r,z=Math.sin(angle)*r;if(Math.hypot(x-POND.x,z-POND.z)<2.05)continue;batch(leafGeo,i%3===0?"#aac372":"#93ae62",[x,.115,z],[.14+random()*.32,.035,.14+random()*.4]);}
 for(let i=0;i<85;i++){const a=random()*Math.PI*2,r=7.9+random()*.35;batch(facet,i%2?"#c7bd99":"#b3b08b",[Math.cos(a)*r,.15,Math.sin(a)*r],[.06+random()*.15,.1+random()*.12,.08+random()*.12]);}
 const windGroups:T.Group[]=[];
 const greens=["#4d7b60","#659369","#7ba165","#98aa6e","#48775d"];
 TREE_POINTS.forEach(([x,z]:number[],i:number)=>{
  const g=new T.Group();g.position.set(x,.13,z);g.rotation.y=random()*6.28;island.add(g);
  const h=3.3+random()*2;
  link(g,point(0,0,0),point(.13,h,0),.2,.11,"#7e7450");
  for(let j=0;j<4;j++){const a=j*Math.PI/2;link(g,point(0,.18,0),point(Math.sin(a)*.65,.025,Math.cos(a)*.65),.11,.02,"#7e7450");}
  const crown=new T.Group();crown.position.set(.13,h*.7,0);g.add(crown);windGroups.push(crown);
  if(i%3===0){ // Layered umbrella palms with broad, ribbed fronds.
   link(g,point(.1,h*.65,0),point(.13,h+.1,0),.11,.045,"#7e7450");
   for(let j=0;j<7;j++){const a=j*6.28/7;const frond=new T.Group();frond.rotation.y=a;crown.add(frond);
    for(let k=0;k<5;k++){const d=.28+k*.3;const leaf=mesh(frond,leafGeo,mat(greens[(i+j)%5]),[0,.8+Math.sin(k*.6)*.25-k*.09,d],[.36-k*.037,.065,.32]);leaf.rotation.x=.25+k*.12;}
   }
  }else{
   for(let j=0;j<6;j++){const a=j*2.4;const radius=j===0?0:.65;const canopy=mesh(crown,facet,mat(greens[(i+j)%5]),[Math.cos(a)*radius,.4+(j%3)*.5,Math.sin(a)*radius],[1.1, .78,1]);canopy.rotation.set(random(),random(),random());}
   link(g,point(.07,h*.55,0),point(.85,h*.85,.2),.085,.045,"#7e7450");
  }
  // Curling hanging vines, generated as tubes.
  if(i%2===0){const points=Array.from({length:14},(_,j)=>point(.68+Math.sin(j*.43)*.12,h*.72-j*.12,.3+Math.cos(j*.43)*.1));const geo=new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.025,5,false);geometries.add(geo);mesh(g,geo,mat("#56804a"),[0,0,0],[1,1,1]);}
 });
 // Ferns, broad-leaf plants, and tiny flowers around the edge rather than the walking paths.
 for(let i=0;i<55;i++){
  const angle=random()*6.28,r=6.9+random()*.95,x=Math.sin(angle)*r,z=Math.cos(angle)*r;
  if(Math.hypot(x-POND.x,z-POND.z)<1.8)continue;
  const g=new T.Group();g.position.set(x,.14,z);g.rotation.y=random()*6.28;island.add(g);if(i%3===0)windGroups.push(g);
  const sc=.65+random()*.5;g.scale.setScalar(sc);
  if(i%3===0){
   for(let j=0;j<5;j++){const a=j*6.28/5;
    const end=point(Math.sin(a)*.7,.6,Math.cos(a)*.7);link(g,point(0,0,0),end,.018,.008,"#729651");
    for(let k=1;k<5;k++)for(const side of [-1,1]){const leaf=mesh(g,leafGeo,mat("#4e8b58"),[Math.sin(a)*k*.14+Math.cos(a)*side*.12,k*.125,Math.cos(a)*k*.14-Math.sin(a)*side*.12],[.18,.028,.075]);leaf.rotation.y=-a;leaf.rotation.z=side*.22;}
   }
  }else{
   for(let j=0;j<5;j++){const a=j*6.28/5;const leaf=mesh(g,leafGeo,mat(greens[i%5]),[Math.sin(a)*.22,.24,Math.cos(a)*.22],[.11,.37,.055]);leaf.rotation.set(Math.cos(a)*.6,a,Math.sin(a)*.6);}
  }
  if(i%7===0){for(let j=0;j<3;j++){link(g,point(0,0,0),point(j*.13,.32+j*.09,.2),.012,.008,"#6d8650");sphere(g,"#f0d27d",[j*.13,.35+j*.09,.2],[.065,.04,.065]);}}
 }
 ROCK_POINTS.forEach(([x,z,r]:number[])=>{const o=mesh(island,facet,mat("#909889"),[x,.25*r,z],[r,.7*r,r]);o.rotation.set(.3,.6,.1);mesh(island,leafGeo,mat("#6f914f"),[x,.75*r,z],[r*.65,.06,r*.65]);});
 // Quiet blue-green pool, recessed sandy banks, small stones and lily leaves.
 const waterMat=new T.MeshPhysicalMaterial({color:"#71b8b3",roughness:.27,metalness:.08,transparent:true,opacity:.82,clearcoat:.7});materials.add(waterMat);
 const bankGeo=new T.CylinderGeometry(1.75,1.85,.075,48);geometries.add(bankGeo);mesh(island,bankGeo,mat("#d5ca96"),[POND.x,.137,POND.z],[1,1,.9]);
 const waterGeo=new T.CircleGeometry(1.5,48);geometries.add(waterGeo);const water=mesh(island,waterGeo,waterMat,[POND.x,.182,POND.z],[1,1,.9],false);water.rotation.x=-Math.PI/2;
 for(let i=0;i<22;i++){const a=i*6.28/22;batch(facet,i%2?"#b3b29c":"#d0c8a8",[POND.x+Math.cos(a)*1.65,.19,POND.z+Math.sin(a)*1.49],[.12+random()*.08,.12,.12]);}
 const ripples:T.Mesh[]=[];const rippleGeo=new T.RingGeometry(.93,1,48);geometries.add(rippleGeo);
 for(let i=0;i<4;i++){const m=new T.MeshBasicMaterial({color:"#e1f2d7",transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide});materials.add(m);const o=mesh(island,rippleGeo,m,[POND.x,.189+i*.001,POND.z],[1,1,1],false);o.rotation.x=-Math.PI/2;ripples.push(o);}
 for(let i=0;i<4;i++){const l=mesh(island,new T.CircleGeometry(.22,12,.2,Math.PI*1.75),mat("#54875a"),[POND.x+.2+i*.24,.192,POND.z+.45*Math.sin(i*2)],[1,1,1],false);geometries.add(l.geometry);l.rotation.x=-Math.PI/2;}
 // A little stream threads its way to the outer bank, as a continuous procedural ribbon.
 const streamPoints=Array.from({length:25},(_,i)=>point(POND.x+1+i*.145,.165,POND.z+1+ i*.174));
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
 // Cute clay dinosaur anatomy, facing +Z; each limb has articulated segments.
 const animals=createWanderers(random);
 const dinos:Dino[]=[];

 function makeDino(id:number){
  const colors=["#cf956a","#92a971","#78aeb1"],base=colors[id],shade=["#b4774d","#708d52","#508c91"][id],cream="#f7dfb5";
  const root=new T.Group();root.scale.setScalar(.85);root.position.set(animals[id].x,.16,animals[id].z);root.rotation.y=animals[id].yaw;scene.add(root);
  const torso=new T.Group();root.add(torso);
  const bodyY=id===2?1.32:.93;
  sphere(torso,base,[0,bodyY,0],[.65,id===2?.72:.57,id===0?.88:1]);
  sphere(torso,cream,[0,bodyY-.13,.1],[.55,.41,.74]);
  const head=new T.Group();head.position.set(0,bodyY+.25,id===0?.8:1);torso.add(head);
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
  if(id<2){
   const eyeY=id===0?.18:-.03,eyeZ=id===0?.49:.35,eyeX=id===0?.345:.21;
   for(const side of [-1,1]){sphere(head,"#fff3d9",[side*eyeX,eyeY,eyeZ],[.064,.09,.085]);sphere(head,"#273e32",[side*(eyeX+.025),eyeY,eyeZ+.012],[.041,.061,.05],.4);sphere(head,"#ffffff",[side*(eyeX+.047),eyeY+.025,eyeZ+.03],[.011,.014,.015]);}
  }
  const tail=new T.Group();tail.position.set(0,bodyY,-.77);torso.add(tail);
  link(tail,point(0,0,0),point(0,-.13,-.7),.28,.13,base);link(tail,point(0,-.13,-.68),point(.15,-.17,id===0?-1.13:-1.4),.135,.015,base);
  if(id===1)for(const side of [-1,1])for(let j=0;j<2;j++)link(tail,point(0,-.17,-.94-j*.23),point(side*.28,.04,-1.03-j*.23),.055,.007,cream);
  const neckBridge=id<2?mesh(torso,cylinder,mat(base),[0,.9,.65],[.2,.3,.2]):undefined;
  const legs:Leg[]=[];
  for(let j=0;j<4;j++){
   const side=j%2===0?-1:1,front=j<2;
   const hip=point(side*.43,bodyY-.12,front?.57:-.54);
   const upper=mesh(root,cylinder,mat(base),[0,0,0],[.18,.5,.18]),lower=mesh(root,cylinder,mat(shade),[0,0,0],[.135,.4,.135]),foot=sphere(root,base,[hip.x,.1,hip.z],[.19,.105,.25]);
   for(let k=0;k<3;k++)sphere(foot,cream,[(k-1)*.34,-.16,.74],[.16,.24,.15]); // Local unit coordinates on scaled foot.
   legs.push({hip,upper,lower,foot,anchor:new T.Vector3(),start:new T.Vector3(),end:new T.Vector3(),phase:j*.25,oldPhase:0,anchorYaw:root.rotation.y,endYaw:root.rotation.y,initialized:false});
  }
  root.traverse(o=>{o.userData.dinosaur=id;});
  const d={root,torso,head,tail,legs,neck,neckBridge,lastYaw:animals[id].yaw,turnDistance:0,id};dinos.push(d);return d;
 }
 for(let i=0;i<animals.length;i++)makeDino(i);
 const ringMat=new T.MeshBasicMaterial({color:"#d9e9a2",transparent:true,opacity:.6,depthWrite:false,side:T.DoubleSide});materials.add(ringMat);
 const ringGeo=new T.RingGeometry(1.2,1.25,64);geometries.add(ringGeo);const selectionRing=mesh(scene,ringGeo,ringMat,[0,.17,0],[1,1,1],false);selectionRing.rotation.x=-Math.PI/2;selectionRing.visible=false;
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
  const mid=hip.clone().lerp(foot,.5);mid.z+=id===2?.1:.13;mid.y+=.025;
  function segment(o:T.Mesh,a:T.Vector3,b:T.Vector3,r:number){o.position.copy(a).add(b).multiplyScalar(.5);o.scale.set(r,a.distanceTo(b),r);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());}
  segment(leg.upper,hip,mid,id===2?.175:.17);segment(leg.lower,mid,foot,.13);
 }
 let paused=false,time=0,selected=-1,focused=-1,frame=0,last=performance.now(),disposed=false;
 let moodTarget=0,moodAmount=0;
 const dayColor=new T.Color("#fff1d9"),sunsetColor=new T.Color("#ffc29a"),dayFog=new T.Color("#f0f0e5"),sunsetFog=new T.Color("#f2dfcd");
 // A small reusable particle pool keeps every interaction entirely procedural.
 const heart=new T.Shape();heart.moveTo(0,.15);heart.bezierCurveTo(-.3,.5,-.6,.1,0,-.35);heart.bezierCurveTo(.6,.1,.3,.5,0,.15);
 const heartGeo=new T.ShapeGeometry(heart);geometries.add(heartGeo);
 const particles=Array.from({length:12},(_,i)=>{const m=new T.MeshBasicMaterial({color:i%2?"#de8d75":"#deb75e",transparent:true,depthWrite:false,side:T.DoubleSide});materials.add(m);const o=mesh(scene,heartGeo,m,[0,0,0],[.32,.32,.32],false);o.visible=false;return {o,age:2,origin:new T.Vector3(),offset:i};});
 const snacks=new T.Group();scene.add(snacks);snacks.visible=false;
 for(let j=0;j<5;j++){sphere(snacks,j%2?"#dd8872":"#e7bb74",[(j-2)*.12,.08,Math.sin(j*3)*.14],[.1,.1,.1]);}
 let snackAge=0;
 let cameraTransition:{start:T.Vector3;end:T.Vector3;startTarget:T.Vector3;endTarget:T.Vector3;p:number}|null=null;
 let framingBasis=1.06,minDistanceFactor=13,framing=Math.max(1,1.06/(host.clientWidth/host.clientHeight));
 function setView(id:string,immediate=false){
  focused=-1;
  const aspect=host.clientWidth/host.clientHeight,fit=Math.max(1,1.06/aspect);framingBasis=1.06;minDistanceFactor=13;framing=fit;
  const p=id==="pond"?point(15,10,15):id==="overhead"?point(.01,27,.01):point(18,15,21);
  p.multiplyScalar(fit);const target=id==="pond"?point(1.5,.6,-.2):point(0,1,0);
  controls.minDistance=13*fit;controls.maxDistance=58*fit;camera.far=controls.maxDistance+40;camera.updateProjectionMatrix();
  if(immediate){camera.position.copy(p);controls.target.copy(target);controls.update();}
  else cameraTransition={start:camera.position.clone(),end:p,startTarget:controls.target.clone(),endTarget:target,p:0};
 }
 setView("grove",true);
 const onResize=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,host.clientWidth<600?1.5:1.8));camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);const next=Math.max(1,framingBasis/camera.aspect);const ratio=next/framing;camera.position.sub(controls.target).multiplyScalar(ratio).add(controls.target);
  if(cameraTransition){cameraTransition.end.sub(cameraTransition.endTarget).multiplyScalar(ratio).add(cameraTransition.endTarget);cameraTransition.start.copy(camera.position);cameraTransition.startTarget.copy(controls.target);cameraTransition.p=0;}
  framing=next;controls.minDistance=minDistanceFactor*next;controls.maxDistance=58*next;camera.far=controls.maxDistance+40;camera.updateProjectionMatrix();};
 const resizeObserver=new ResizeObserver(onResize);resizeObserver.observe(host);
 const raycaster=new T.Raycaster(),pointer=new T.Vector2();let down={x:0,y:0,time:0},pointerCount=0,multitouch=false;
 const pointerDown=(e:PointerEvent)=>{pointerCount++;if(pointerCount>1)multitouch=true;down={x:e.clientX,y:e.clientY,time:performance.now()};cameraTransition=null;};
 function select(id:number){if(!Number.isInteger(id)||id<0||id>=dinos.length)return;if(focused!==id)focused=-1;selected=id;animals[id].greeting=2.6;animals[id].behavior="greet";selectionRing.visible=true;onSelect(id);}
 function focus(id:number){
  if(!dinos[id])return;focused=id;
  const fit=Math.max(1,.8/camera.aspect),target=dinos[id].root.position.clone().add(point(0,id===2?1.35:1,0));
  const offset=point(6,4.2,7).multiplyScalar(fit);framingBasis=.8;minDistanceFactor=5;framing=fit;controls.minDistance=5*fit;
  cameraTransition={start:camera.position.clone(),end:target.clone().add(offset),startTarget:controls.target.clone(),endTarget:target,p:0};
 }
 function interact(id:number,action:"greet"|"feed"){
  if(!dinos[id])return;select(id);paused=false;const a=animals[id];a.greeting=3;a.behavior=action==="feed"?"feed":"greet";
  const origin=dinos[id].root.position.clone().add(point(0,2.4,0));
  if(!reducedMotion)particles.forEach((p,i)=>{p.age=-i*.085;p.origin.copy(origin);});
  if(action==="feed"){const reach=id===2?2.4:1.1;snacks.position.set(a.x+Math.sin(a.yaw)*reach,.22,a.z+Math.cos(a.yaw)*reach);snacks.visible=true;snackAge=3;}
 }
 const pointerUp=(e:PointerEvent)=>{pointerCount=Math.max(0,pointerCount-1);if(multitouch){if(pointerCount===0)multitouch=false;return;}if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>7||performance.now()-down.time>500)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(scene.children,true);const first=hits.find(h=>(h.object as T.Mesh).isMesh&&!(h.object===selectionRing)&&h.object!==ground&&(h.object as T.Mesh).material!==mistMat);if(first&&first.object.userData.dinosaur!==undefined)select(first.object.userData.dinosaur);};
 const pointerCancel=()=>{pointerCount=0;multitouch=false;};
 renderer.domElement.addEventListener("pointerdown",pointerDown);renderer.domElement.addEventListener("pointerup",pointerUp);renderer.domElement.addEventListener("pointercancel",pointerCancel);
 controls.addEventListener("start",()=>{cameraTransition=null;focused=-1;});
 function animate(now:number){
  if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.04);last=now;
  if(!document.hidden&&!paused){
   time+=dt;updateWanderers(animals,dt,random);
   dinos.forEach((d,i)=>{const a=animals[i];d.root.position.set(a.x,.16,a.z);d.root.rotation.y=a.yaw;
    const turn=Math.abs(Math.atan2(Math.sin(a.yaw-d.lastYaw),Math.cos(a.yaw-d.lastYaw)));d.lastYaw=a.yaw;d.turnDistance+=turn*.45;
    const moving=a.speed>0||turn>.0005;d.torso.position.y=moving?Math.sin((a.distance+d.turnDistance)*17)*.018:Math.sin(time*1.3+i)*.01;
    const greeting=a.greeting>0&&a.behavior!=="feed",squish=greeting?Math.sin(time*9)*.045*Math.min(1,a.greeting):0;d.torso.scale.set(1-squish*.45,1+squish,1-squish*.45);
    d.tail.rotation.y=Math.sin(time*1.7+i)*.12;
    const nod=a.behavior==="graze"||a.behavior==="drink"||a.behavior==="feed"?.5+.07*Math.sin(time*2):a.greeting>0?-.12+Math.sin(time*6)*.14:Math.sin(time*.6+i)*.06;
    d.head.rotation.x=T.MathUtils.lerp(d.head.rotation.x,nod,.07);
    const headY=i===2?1.42:1.18,feeding=a.behavior==="graze"||a.behavior==="feed";
    const lower=a.behavior==="drink"||a.behavior==="feed"?(i===0?.64:i===1?.57:.87):feeding?.25:0;
    d.head.position.y=T.MathUtils.lerp(d.head.position.y,headY-lower,.07);
    const headZ=i===0?.8:i===1?1:.65;d.head.position.z=T.MathUtils.lerp(d.head.position.z,headZ+(a.behavior==="drink"?(i===0?.65:i===1?.85:0):0),.07);
    if(d.neckBridge){const from=point(0,.93,.5),to=d.head.position.clone();d.neckBridge.position.copy(from).add(to).multiplyScalar(.5);const radius=i===0?.25:.16;d.neckBridge.scale.set(radius,from.distanceTo(to),radius);d.neckBridge.quaternion.setFromUnitVectors(point(0,1,0),to.sub(from).normalize());}
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
  }
  if(selected>=0){selectionRing.position.set(animals[selected].x,.17,animals[selected].z);selectionRing.scale.setScalar(1.1+Math.sin(time*2)*.03);}
  if(cameraTransition){cameraTransition.p=reducedMotion?1:Math.min(1,cameraTransition.p+dt*1.3);const p=cameraTransition.p,e=p*p*(3-2*p);camera.position.lerpVectors(cameraTransition.start,cameraTransition.end,e);controls.target.lerpVectors(cameraTransition.startTarget,cameraTransition.endTarget,e);if(p===1)cameraTransition=null;}
  if(focused>=0&&!cameraTransition){const target=dinos[focused].root.position.clone().add(point(0,focused===2?1.35:1,0)),shift=target.sub(controls.target).multiplyScalar(Math.min(1,dt*3));controls.target.add(shift);camera.position.add(shift);}
  moodAmount=T.MathUtils.lerp(moodAmount,moodTarget,Math.min(1,dt*2));sun.color.copy(dayColor).lerp(sunsetColor,moodAmount);sun.intensity=2.8-moodAmount*.7;ambient.intensity=2.8-moodAmount*.65;scene.fog!.color.copy(dayFog).lerp(sunsetFog,moodAmount);
  controls.update();renderer.render(scene,camera);
 }
 // Initialise complete geometry and planted feet before the first frame.
 dinos.forEach((d,i)=>d.legs.forEach(l=>poseLeg(l,d.root,0,false,i)));
 renderer.render(scene,camera);frame=requestAnimationFrame(animate);
 return {select,focus,interact,setMood(mood){moodTarget=mood==="sunset"?1:0;},capture(){const background=scene.background;try{scene.background=new T.Color(moodTarget?"#f2dfcd":"#f5f3ec");renderer.render(scene,camera);return renderer.domElement.toDataURL("image/png");}finally{scene.background=background;renderer.render(scene,camera);}},clear(){selected=-1;selectionRing.visible=false;focused=-1;},view:setView,pause(v){paused=v;},dispose(){disposed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();controls.dispose();renderer.domElement.removeEventListener("pointerdown",pointerDown);renderer.domElement.removeEventListener("pointerup",pointerUp);renderer.domElement.removeEventListener("pointercancel",pointerCancel);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());sun.shadow.dispose();renderer.dispose();renderer.domElement.remove();}};
}
