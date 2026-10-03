import * as T from 'three';

// Original procedural icon sculpture. No imported textures or models.
export function renderAppIcon(size = 1024) {
  const scene = new T.Scene();
  scene.background = new T.Color('#183f3a');
  const camera = new T.OrthographicCamera(-3.35,3.35,3.35,-3.35,.1,60);
  camera.position.set(4.6,3.3,10);camera.lookAt(0,0,.1);
  const renderer = new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(size,size);renderer.setPixelRatio(1);
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  document.body.append(renderer.domElement);
  const geometries:T.BufferGeometry[]=[],materials:T.Material[]=[];
  function material(color:string,roughness=.75){const mat=new T.MeshStandardMaterial({color,roughness,flatShading:true});materials.push(mat);return mat;}
  function shape(geo:T.BufferGeometry,color:string,p:number[],s:number[]){geometries.push(geo);const mesh=new T.Mesh(geo,material(color));mesh.position.set(...p as [number,number,number]);mesh.scale.set(...s as [number,number,number]);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
  const ball=(color:string,p:number[],s:number[],detail=1)=>shape(new T.IcosahedronGeometry(1,detail),color,p,s);
  function stem(a:number[],b:number[],r:number,color:string){const from=new T.Vector3(...a as [number,number,number]),to=new T.Vector3(...b as [number,number,number]);const obj=shape(new T.CylinderGeometry(r*.08,r,from.distanceTo(to),7),color,from.clone().add(to).multiplyScalar(.5).toArray(),[1,1,1]);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());}
  scene.add(new T.HemisphereLight('#fff7df','#48867a',2.7));
  const light=new T.DirectionalLight('#ffe5b5',4.5);light.position.set(-4,7,8);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:30});light.shadow.normalBias=.03;scene.add(light);
  const fill=new T.DirectionalLight('#a1eadf',2);fill.position.set(5,1,-2);scene.add(fill);
  // A tiny faceted island and two leaves give the head a place in the grove.
  const island=shape(new T.CylinderGeometry(2.35,2.05,.55,9), '#649c78',[0,-1.55,.03],[1,1,.85]);island.rotation.y=.2;
  shape(new T.CylinderGeometry(2.08,1.82,.4,9),'#305d52',[0,-1.94,.03],[1,1,.85]);
  ball('#da874c',[0,.2,-.4],[1.55,1.5,.4]);
  for(let n=0;n<9;n++){const a=n/8*Math.PI;ball('#edac60',[Math.cos(a)*1.37,.1+Math.sin(a)*1.36,-.23],[.21,.23,.14],0);}
  ball('#f2b675',[0,-.1,.2],[1.02,.96,.98]);
  ball('#edaa68',[0,-.47,1.0],[.83,.45,.43]);
  ball('#d48650',[0,-.57,1.31],[.58,.22,.12]);
  for(const side of [-1,1]){
    stem([side*.57,.5,.34],[side*.72,1.82,.91],.18,'#fff1ca');
    ball('#fff9e7',[side*.84,.18,.72],[.17,.2,.13],2);
    ball('#27352e',[side*.85,.18,.84],[.088,.112,.055],2);
    ball('#ffffff',[side*.83,.23,.884],[.025,.03,.017],1);
    ball('#cd7655',[side*.66,-.23,.9],[.2,.11,.06]);
    ball('#a85e3e',[side*.28,-.39,1.41],[.045,.04,.018]);
  }
  stem([0,-.04,1.13],[0,.59,1.42],.12,'#fff1cb');
  for(const side of [-1,1]){
    stem([side*1.45,-1.2,-.3],[side*1.84,-.29,-.68],.09,'#b7d695');
    for(let j=0;j<3;j++){const leaf=ball(j%2?'#94c879':'#b6d986',[side*(1.51+j*.19),-.93+j*.29,-.46],[.32,.53,.11],0);leaf.rotation.z=side*-.7;}
  }
  // Tiny sculpted glint, readable even at launcher size.
  const glint=new T.Group();scene.add(glint);glint.position.set(1.67,1.63,0);
  const glintMat=new T.MeshBasicMaterial({color:'#ffe6a6'});materials.push(glintMat);
  for(const [sx,sy] of [[.075,.3],[.24,.06]]){const g=new T.OctahedronGeometry(1);geometries.push(g);const m=new T.Mesh(g,glintMat);m.scale.set(sx,sy,.075);glint.add(m);}
  renderer.render(scene,camera);
  const result=renderer.domElement.toDataURL('image/png');
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());light.shadow.dispose();renderer.dispose();renderer.domElement.remove();
  return result;
}
