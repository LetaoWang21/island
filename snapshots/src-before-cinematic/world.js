import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import terrain from './terrain.cjs';
import {graniteTexture,addCoastalPlants} from './coastal-detail.js';
import {addPalmCanopies} from './palm-canopy.js';
import {skyMaterial,oceanMaterial,rainSystem} from './shaders.js';
let seed=19217;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};const rr=(a,b)=>a+(b-a)*random();const V=(x,y,z)=>new T.Vector3(x,y,z);
export function createWorld(renderer){
 const scene=new T.Scene();scene.fog=new T.FogExp2('#afc8c5',.0018);scene.background=new T.Color('#829eaa');const root=new T.Group();scene.add(root);const obstacles=[],partyDecor=[];
 const U={uTime:{value:0},uNight:{value:0},uRain:{value:0},uCloud:{value:.12},uWaves:{value:.22},uWind:{value:.18},uFlash:{value:0},uAfterglow:{value:0},uSun:{value:V(-.52,.72,-.46).normalize()},uFog:{value:new T.Color('#afc8c5')}};
 const m=(color,roughness=.85,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});const boxG=new T.BoxGeometry(1,1,1);
 function mesh(g,mat,x=0,y=0,z=0,parent=root){const o=new T.Mesh(g,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,mat,x,y,z,parent=root){const o=mesh(boxG,mat,x,y,z,parent);o.scale.set(w,h,d);return o;}
 function soft(w,h,d,mat,x,y,z,r=.08,parent=root){return mesh(new RoundedBoxGeometry(w,h,d,3,r),mat,x,y,z,parent);}
 function pole(a,b,r,mat,r2=r,parent=root,sides=8){const d=b.clone().sub(a);const o=mesh(new T.CylinderGeometry(r2,r,d.length(),sides),mat);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());if(parent!==root){o.removeFromParent();parent.add(o);}return o;}
 function texture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return tex;}
 const sandTex=texture(256,256,(c,w,h)=>{c.fillStyle='#eee9da';c.fillRect(0,0,w,h);for(let i=0;i<26000;i++){const n=rr(120,240);c.fillStyle=`rgba(${n},${n*.95},${n*.8},${rr(.04,.18)})`;c.fillRect(rr(0,w),rr(0,h),rr(.5,2),rr(.5,2));}});sandTex.repeat.set(108,108);
 const rockTex=texture(256,256,(c,w,h)=>{c.fillStyle='#879087';c.fillRect(0,0,w,h);for(let i=0;i<13000;i++){const n=rr(20,220);c.fillStyle=`rgba(${n},${n},${n*.94},.25)`;c.fillRect(rr(0,w),rr(0,h),rr(1,5),rr(1,5));}});
 const woodTex=texture(256,512,(c,w,h)=>{c.fillStyle='#9c8461';c.fillRect(0,0,w,h);for(let i=0;i<1700;i++){const x=rr(0,w),y=rr(0,h);c.strokeStyle=random()>.5?'#d7c29135':'#493d2d4a';c.lineWidth=rr(.4,1.7);c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+rr(-3,3),y+30,x+rr(-3,3),y+60,x+rr(-3,3),y+rr(60,190));c.stroke();}});
 const barkTex=texture(128,512,(c,w,h)=>{c.fillStyle='#a1997c';c.fillRect(0,0,w,h);for(let i=0;i<h;i+=9){c.fillStyle='#514b3960';c.fillRect(0,i,w,2);c.fillStyle='#d4c49a55';c.fillRect(0,i+2,w,1);}for(let i=0;i<2000;i++){c.fillStyle='#61573f30';c.fillRect(rr(0,w),rr(0,h),rr(1,3),rr(1,8));}});
 const thatchTex=texture(256,256,(c,w,h)=>{c.fillStyle='#9c8352';c.fillRect(0,0,w,h);for(let i=0;i<4500;i++){const x=rr(0,w),y=rr(0,h);c.strokeStyle=random()>.5?'#e0c78e77':'#433c2866';c.lineWidth=rr(.5,1.4);c.beginPath();c.moveTo(x,y);c.lineTo(x+rr(-2,2),y+rr(10,70));c.stroke();}});thatchTex.repeat.set(3,3);
 const granite=graniteTexture(texture);
 const wood=m('#e2cba5',.73,{map:woodTex,bumpMap:woodTex,bumpScale:.035}),darkwood=m('#998168',.82,{map:woodTex}),bark=m('#d4c9a8',1,{map:barkTex,bumpMap:barkTex,bumpScale:.09}),stone=m('#fff9ec',.96,{map:granite,bumpMap:granite,bumpScale:.083,vertexColors:true}),darkStone=m('#7c7667',.96,{map:granite,bumpMap:granite,bumpScale:.051}),plaster=m('#f4efdf',.82,{bumpMap:rockTex,bumpScale:.025}),metal=m('#38505a',.45,{metalness:.65}),linen=m('#e2d4ad',.95,{side:T.DoubleSide}),teal=m('#5c9189',.7),gold=m('#b7a577',.45,{metalness:.55});
 const lightMat=m('#ffdfab',.45,{emissive:'#ffbd65',emissiveIntensity:3});const warmLights=[];
 function point(x,y,z,power=12,range=12){const l=new T.PointLight('#ffc17d',power,range,1.7);l.position.set(x,y,z);l.userData.power=power;scene.add(l);warmLights.push(l);return l;}
 // Continuous island terrain. Dry sand, pale ground cover, deep tropical greens and exposed stone.
 const geo=new T.PlaneGeometry(180,180,300,300);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;const colors=[];const pathPoints=[V(13,0,18),V(7,0,11),V(-2,0,8),V(-7,0,1),V(-15,0,-5)];const path=new T.CatmullRomCurve3(pathPoints).getPoints(50);
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,terrain.height(x,z));}geo.computeVertexNormals();const normals=geo.attributes.normal;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=pos.getY(i);let c=new T.Color('#e5cf9f');const patch=(Math.sin(x*.3+Math.sin(z*.42))+Math.sin(z*.65-x*.14))*.5;const vegetation=terrain.smooth(.9,2.4,h+patch*.35);c.lerp(new T.Color('#678557'),vegetation);c.lerp(new T.Color('#456b50'),terrain.smooth(2.6,7,h)*.55);const slope=1-normals.getY(i);c.lerp(new T.Color('#90998b'),terrain.smooth(.19,.43,slope)*.8);let pd=100;for(const p of path)pd=Math.min(pd,Math.hypot(x-p.x,z-p.z));if(pd<1.1&&h>.7)c.lerp(new T.Color('#bbaa7a'),terrain.smooth(1.1,.45,pd)*.64);c.multiplyScalar(.98+Math.sin(x*2.8+z*3.9)*.018);colors.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));const groundMat=m('#ffffff',.98,{map:sandTex,bumpMap:sandTex,bumpScale:.010,vertexColors:true});groundMat.onBeforeCompile=s=>{s.uniforms.uRain=U.uRain;s.vertexShader='varying vec3 vWetWorld;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWetWorld=(modelMatrix*vec4(transformed,1.)).xyz;');s.fragmentShader='uniform float uRain;varying vec3 vWetWorld;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat shoreWet=1.-smoothstep(.05,.8,vWetWorld.y);float dampness=max(shoreWet*.68,uRain*.75);roughnessFactor=mix(roughnessFactor,.38,dampness);diffuseColor.rgb*=1.-dampness*.12;');};mesh(geo,groundMat);
 // Bed height texture is shared by sea shading and rain-ground clipping.
 const data=new Uint8Array(512*512*4);for(let z=0;z<512;z++)for(let x=0;x<512;x++){const h=terrain.height(x/511*180-90,z/511*180-90);const n=Math.round(T.MathUtils.clamp((h+8)/24,0,1)*255),i=(z*512+x)*4;data[i]=data[i+1]=data[i+2]=n;data[i+3]=255;}const bed=new T.DataTexture(data,512,512,T.RGBAFormat);bed.minFilter=bed.magFilter=T.LinearFilter;bed.needsUpdate=true;
 const sky=mesh(new T.SphereGeometry(720,32,16),skyMaterial(U));sky.castShadow=sky.receiveShadow=false;sky.frustumCulled=false;
 const water=new Reflector(new T.PlaneGeometry(1300,1300,200,200),{textureWidth:1024,textureHeight:512,clipBias:.004,multisample:0});water.rotation.x=-Math.PI/2;water.position.y=0;const oldMat=water.material;water.material=oceanMaterial(U,bed,water);oldMat.dispose();water.receiveShadow=false;root.add(water);
 const originalReflection=water.onBeforeRender;let reflectTime=-1000;const lastPos=V(999,999,999),lastQuaternion=new T.Quaternion();water.onBeforeRender=function(r,s,c,...args){const now=performance.now(),moved=c.position.distanceToSquared(lastPos)>.0003||c.quaternion.angleTo(lastQuaternion)>.002;if(!moved&&now-reflectTime<140)return;originalReflection.call(this,r,s,c,...args);reflectTime=now;lastPos.copy(c.position);lastQuaternion.copy(c.quaternion);};
 const environmentScene=new T.Scene();
 const environmentMaterial=new T.ShaderMaterial({side:T.BackSide,vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vDirection;void main(){vec3 d=normalize(vDirection);vec3 c=mix(vec3(.18,.21,.18),vec3(.68,.86,.95),smoothstep(-.3,.8,d.y));c+=vec3(1.,.82,.58)*pow(max(0.,dot(d,normalize(vec3(-.52,.72,-.46)))),18.)*.65;gl_FragColor=vec4(c,1.);}`});
 const environmentGeometry=new T.SphereGeometry(50,24,12);environmentScene.add(new T.Mesh(environmentGeometry,environmentMaterial));
 const pmrem=new T.PMREMGenerator(renderer);const environmentTarget=pmrem.fromScene(environmentScene,.025,.1,100);scene.environment=environmentTarget.texture;scene.environmentIntensity=.18;pmrem.dispose();environmentGeometry.dispose();environmentMaterial.dispose();
 const hemi=new T.HemisphereLight('#d7e7df','#6d7756',2.35);scene.add(hemi);const sun=new T.DirectionalLight('#ffdfab',3.8);sun.position.copy(U.uSun.value).multiplyScalar(90);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-43,right:43,top:43,bottom:-43,near:1,far:190});sun.shadow.normalBias=.045;sun.shadow.bias=-.00035;sun.shadow.radius=3;scene.add(sun);const fill=new T.DirectionalLight('#bbd7e3',.65);fill.position.set(30,20,50);scene.add(fill);const flash=new T.DirectionalLight('#cbdfff',0);flash.position.set(20,60,-40);scene.add(flash);
 // Weathered headland lighthouse, stone platform and lantern gallery.
 const lx=-15,lz=-5,ly=terrain.height(lx,lz);const lighthouse=new T.Group();lighthouse.position.set(lx,ly,lz);root.add(lighthouse);obstacles.push({x:lx,z:lz,r:1.65});
 // The hill falls away under the platform. Bury the footing below the entire footprint.
 let lowestGround = ly;
 for (let dx = -5; dx <= 5; dx++) {
  for (let dz = -5; dz <= 5; dz++) {
   lowestGround = Math.min(lowestGround, terrain.height(lx + dx * .6, lz + dz * .6));
  }
 }
 const footingTop = ly + .05;
 const footingBottom = lowestGround - .3;
 const footingHeight = footingTop - footingBottom;
 const footingCenter = (footingTop + footingBottom) / 2 - ly;
 mesh(new T.CylinderGeometry(2.65, 2.95, footingHeight, 20), darkStone, 0, footingCenter, 0, lighthouse);
 mesh(new T.CylinderGeometry(2.5,2.7,.35,20),darkStone,0,.1,0,lighthouse);mesh(new T.CylinderGeometry(1.25,1.82,7,24),plaster,0,3.67,0,lighthouse);mesh(new T.CylinderGeometry(1.4,1.46,.22,24),metal,0,6.75,0,lighthouse);mesh(new T.CylinderGeometry(1.67,1.7,.24,24),plaster,0,7.25,0,lighthouse);
 const glassMat=new T.MeshPhysicalMaterial({color:'#9fbec0',roughness:.13,metalness:.15,transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false});mesh(new T.CylinderGeometry(1.12,1.12,1.35,16,1,true),glassMat,0,8.05,0,lighthouse);for(let a=0;a<Math.PI*2;a+=Math.PI/4)pole(V(Math.cos(a)*1.17,7.35,Math.sin(a)*1.17),V(Math.cos(a)*1.17,8.77,Math.sin(a)*1.17),.045,metal,.045,lighthouse);mesh(new T.ConeGeometry(1.55,.8,16),metal,0,9.12,0,lighthouse);pole(V(0,9.4,0),V(0,10.0,0),.035,gold,.018,lighthouse);const beaconLensMat=lightMat.clone();mesh(new T.SphereGeometry(.2,12,8),beaconLensMat,0,8.04,0,lighthouse);
 for(let a=0;a<Math.PI*2;a+=Math.PI/10){pole(V(Math.cos(a)*1.62,7.35,Math.sin(a)*1.62),V(Math.cos(a)*1.62,8.0,Math.sin(a)*1.62),.025,metal,.025,lighthouse);}for(let y of [7.45,8]){const ring=mesh(new T.TorusGeometry(1.64,.025,5,40),metal,0,y,0,lighthouse);ring.rotation.x=Math.PI/2;}
 box(.72,1.45,.11,darkwood,0,.92,1.76,lighthouse);soft(.52,1.2,.06,teal,0,.91,1.83,.1,lighthouse);box(.05,.08,.05,gold,.18,.85,1.88,lighthouse);for(let y of [3,5]){soft(.45,.76,.16,metal,0,y,1.56-y*.04,.09,lighthouse);soft(.29,.58,.18,glassMat,0,y,1.65-y*.04,.08,lighthouse);}
 const lighthouseLamp=point(lx,ly+8,lz,9,18);const beacon=new T.SpotLight('#ffe6ba',0,155,.065,.55,1);beacon.position.set(lx,ly+8.1,lz);scene.add(beacon,beacon.target);
 const beaconMood={value:0};const haloTex=texture(64,64,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#fff5ddff');g.addColorStop(.2,'#ffe5ad55');g.addColorStop(1,'#ffe5ad00');c.fillStyle=g;c.fillRect(0,0,w,h);});const beaconHalo=new T.Sprite(new T.SpriteMaterial({map:haloTex,color:'#ffd28c',transparent:true,depthWrite:false,blending:T.AdditiveBlending}));beaconHalo.position.set(lx,ly+8.04,lz);scene.add(beaconHalo);
 const beamMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{...U,uCelebration:beaconMood},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uNight,uRain,uCelebration;void main(){float a=pow(max(0.,sin(vUv.x*3.14159)),2.)*pow(vUv.y,1.5)*max(uNight,uRain*.5)*(.015+uRain*.04)*(1.+uCelebration*2.7);gl_FragColor=vec4(1.,.85,.59,a);}`});const beamGroup=new T.Group();beamGroup.position.set(lx,ly+8.1,lz);root.add(beamGroup);for(let a of [0,Math.PI/2]){const b=mesh(new T.PlaneGeometry(6,60),beamMaterial,0,0,-30,beamGroup);b.rotation.x=Math.PI/2;b.rotation.z=a;b.castShadow=false;}
 // A beach pavilion: airy structure, layered thatch and warm practical lights.
 const hx=10,hz=7,hy=terrain.pavilion.top-.07,house=new T.Group();house.position.set(hx,hy,hz);root.add(house);for(let z=-2.5;z<=2.5;z+=.22)box(6.15,.14,.205,wood,0,0,z,house);for(let x of [-2.7,2.7])for(let z of [-2.1,2.1])pole(V(x,-.3,z),V(x,3.18,z),.12,wood,.10,house);for(let z of [-2.1,2.1])pole(V(-2.9,2.95,z),V(2.9,2.95,z),.11,darkwood,.11,house);
 const thatch=m('#c0ac76',1,{map:thatchTex,bumpMap:thatchTex,bumpScale:.14,side:T.DoubleSide});const roofAngle=Math.atan2(1.5,3.55);for(let side of [-1,1]){const roof=box(3.92,.18,6.35,thatch,side*1.77,3.76,0,house);roof.rotation.z=-side*roofAngle;for(let j=0;j<4;j++){const strip=box(1.12,.16,6.5,thatch,side*(.4+j*.88),4.36-j*.37,0,house);strip.rotation.z=-side*roofAngle;}}
 pole(V(0,4.57,-3.3),V(0,4.57,3.3),.12,darkwood,.12,house);for(let z of [-2.7,2.7]){pole(V(-3.5,3.1,z),V(0,4.58,z),.07,wood,.07,house);pole(V(0,4.58,z),V(3.5,3.1,z),.07,wood,.07,house);}
 // Linen sofa, field table, folded towels, books and a ceramic vessel.
 soft(3.4,.35,.95,wood,0,.45,-1.45,.07,house);soft(3.25,.17,.9,linen,0,.7,-1.45,.07,house);soft(3.35,.65,.2,linen,0,1.03,-1.87,.07,house);for(let x of [-1.1,1.1]){const p=soft(.6,.55,.15,teal,x,1.08,-1.65,.09,house);p.rotation.z=rr(-.1,.1);}box(1.6,.12,1,wood,0,.52,.3,house);for(let x of [-.6,.6])for(let z of [-.05,.65])box(.08,.52,.08,darkwood,x,.22,z,house);const book=box(.4,.035,.3,teal,-.35,.61,.25,house),vase=mesh(new T.CylinderGeometry(.09,.12,.24,12),linen,.42,.7,.3,house);for(const o of [book,vase]){o.userData.partyHide=true;partyDecor.push(o);}
 const lantern=(x,y,z,s=.7)=>{const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(s);root.add(g);soft(.23,.37,.23,lightMat,0,0,0,.035,g);for(let xx of [-.15,.15])for(let zz of [-.15,.15])pole(V(xx,-.22,zz),V(xx,.23,zz),.013,metal,.013,g);mesh(new T.ConeGeometry(.26,.15,4),metal,0,.3,0,g).rotation.y=Math.PI/4;box(.34,.04,.34,metal,0,-.24,0,g);return g;};
 lantern(7.35,4.1,9.1,.8);lantern(12.65,4.1,9.1,.8);lantern(10,3.1,5.5,.8);const houseLamp=point(10,3.7,7,18,11);for(const [x,z] of [[7.3,4.9],[12.7,4.9],[7.3,9.1],[12.7,9.1]])obstacles.push({x,z,r:.15});obstacles.push({x:10,z:5.5,r:1.2},{x:10,z:7.3,r:.6});
 for(let i=0;i<6;i++){const z=9.76+i*.33,h=terrain.floor(10,z),base=terrain.height(10,z),thickness=Math.max(.08,h-base);box(2.2,thickness,.345,wood,10,h-thickness/2,z);}
 // Jetty starts on the sand, so its deck and the navigation surface join continuously.
 for(let z=16;z<40.5;z+=.29)box(2.85,.16,.275,wood,13,.97,z);for(let x of [11.85,14.15])box(.17,.25,24.7,darkwood,x,.76,28.1);for(let z=16;z<=40;z+=3.5)for(let x of [11.55,14.45]){pole(V(x,-1,z),V(x,1.73,z),.10,darkwood);box(.28,.09,.28,wood,x,1.76,z);}for(let x of [11.55,14.45])for(let z=19.5;z<39;z+=3.5){const pts=[];for(let i=0;i<=12;i++)pts.push(V(x,1.65-Math.sin(i/12*Math.PI)*.24,z+i/12*3.5));mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),12,.017,4),linen);}
 for(let z of [23,37]){lantern(11.55,1.98,z,.5);lantern(14.45,1.98,z,.5);}point(13,2.7,35,10,12);
 // Uneven granite outcrops with smaller rocks partially buried around them.
 const rockG = new T.IcosahedronGeometry(1, 3);
 const rockPositions = rockG.attributes.position;
 const rockTones = [];
 const mineralTone = new T.Color();
 const lichenTone = new T.Color('#929567');
 for (let i = 0; i < rockPositions.count; i++) {
  const x=rockPositions.getX(i), y=rockPositions.getY(i), z=rockPositions.getZ(i);
  const shape=.92+.095*Math.sin(x*4.6+z*2.7)+.06*Math.cos(y*5.4-x*3.8)+.031*Math.sin(x*15+y*11+z*9);
  rockPositions.setXYZ(i,x*shape,Math.min(y*shape,.76+.07*x),z*shape);
  const flecks=Math.sin(x*8.6+z*7.3)*Math.cos(y*6.4+z*3.2);
  const lichen=T.MathUtils.smoothstep(flecks,.22,.82)*(1-T.MathUtils.smoothstep(y,.12,.78))*.53;
  mineralTone.set('#ffffff').lerp(lichenTone,lichen);
  rockTones.push(mineralTone.r,mineralTone.g,mineralTone.b);
 }
 rockG.setAttribute('color',new T.Float32BufferAttribute(rockTones,3));
 rockG.computeVertexNormals();
 const rockMatrices=[], rockColors=[], rockSites=[], dummy=new T.Object3D();
 function rock(x,z,size) {
  const h=terrain.height(x,z);
  dummy.position.set(x,h+size*.15,z);
  dummy.rotation.set(rr(-.3,.3),rr(0,6.28),rr(-.25,.25));
  dummy.scale.set(size*rr(.9,1.5),size*rr(.5,.9),size*rr(.7,1.3));
  dummy.updateMatrix();
  rockMatrices.push(dummy.matrix.clone());
  rockColors.push(new T.Color().setHSL(rr(.075,.13),rr(.09,.24),.78 + (rockMatrices.length % 11)*.018));
  if (h>-.2 && size>.55) obstacles.push({x,z,r:size*.7});
  if (h>.16 && size>.58) rockSites.push({x,z,size});
 }
 for(let i=0;i<115;i++){
  const a=rr(0,6.28), r=rr(24,31);
  const x=Math.cos(a)*r*1.1, z=Math.sin(a)*r*.92;
  if((x>-10&&x<24&&z>10)||(x>8&&x<17&&z>9)) continue;
  const seam=Math.sin(a*5+Math.sin(a*3))*1.35+Math.sin(a*11+1.6)*.52;
  rock(x+Math.cos(a)*seam,z+Math.sin(a)*seam,rr(.40,2.35));
 }
 for(let i=0;i<40;i++){const x=rr(-18,15),z=rr(-16,9);if(Math.hypot(x+15,z+5)<4)continue;rock(x,z,rr(.25,.9));}
 for(let i=0;i<12;i++)rock(rr(-28,-19),rr(4,14),rr(1,2.7));
 const rocks = new T.InstancedMesh(rockG,stone,rockMatrices.length);
 rockMatrices.forEach((matrix,i)=>{rocks.setMatrixAt(i,matrix);rocks.setColorAt(i,rockColors[i]);});
 rocks.castShadow=rocks.receiveShadow=true;
 root.add(rocks);
 addCoastalPlants(root,terrain.height,hy,rockSites,path);
 // Shared leaves for the rooted understory.
 const leafTex=texture(64,256,(c,w,h)=>{const grad=c.createLinearGradient(0,0,w,0);grad.addColorStop(0,'#5b7d42');grad.addColorStop(.5,'#9eab69');grad.addColorStop(1,'#6e8f49');c.fillStyle=grad;c.fillRect(0,0,w,h);c.strokeStyle='#d7d48e88';c.beginPath();c.moveTo(32,0);c.lineTo(32,h);c.stroke();for(let i=0;i<256;i+=11){c.strokeStyle='#d8ce863d';c.beginPath();c.moveTo(32,i);c.lineTo(0,i+17);c.moveTo(32,i);c.lineTo(64,i+17);c.stroke();}});
 const leafG=new T.BufferGeometry();const lp=[],luv=[],li=[];for(let i=0;i<=4;i++){const t=i/4,w=Math.sin(Math.PI*t)*.25;for(let side=-1;side<=1;side++){lp.push(side*w,Math.sin(t*Math.PI)*.07-Math.abs(side)*w*.2,t);luv.push(side*.5+.5,t);}}for(let i=0;i<4;i++)for(let j=0;j<2;j++){const a=i*3+j;li.push(a,a+3,a+1,a+1,a+3,a+4);}leafG.setAttribute('position',new T.Float32BufferAttribute(lp,3));leafG.setAttribute('uv',new T.Float32BufferAttribute(luv,2));leafG.setIndex(li);leafG.computeVertexNormals();const leafMat=new T.MeshStandardMaterial({color:'#b4c99a',map:leafTex,roughness:.76,side:T.DoubleSide,emissive:'#243b16',emissiveIntensity:.12});
 leafMat.onBeforeCompile=s=>{s.uniforms.uTime=U.uTime;s.uniforms.uWind=U.uWind;s.vertexShader='uniform float uTime,uWind;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec3 wp=(instanceMatrix*vec4(position,1.)).xyz;transformed.x+=sin(wp.x*.3+wp.z*.4+uTime*(.8+uWind))*position.z*position.z*(.025+uWind*.12);transformed.y+=cos(wp.z*.6+uTime)*position.z*.03*uWind;\n#endif`);};
 const leaves=[],leafColors=[];function leaf(x,y,z,len,w,ry,rx,color){dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rr(-.08,.08));dummy.scale.set(w,len,len);dummy.updateMatrix();leaves.push(dummy.matrix.clone());leafColors.push(color||new T.Color().setHSL(rr(.2,.27),rr(.25,.4),rr(.45,.66)));}
 const palmPaths=[];
 const palms=[[-22,8,8],[23,2,9],[19,12,7],[4,20,8],[-8,18,9],[-19,-1,8],[17,-2,10],[1,-14,9],[-2,6,8],[-10,9,9],[4,-1,9],[13,1,8]];
 for(let i=0;i<26;i++){const x=rr(-22,22),z=rr(-18,18);if(terrain.height(x,z)<1.0||Math.hypot(x+15,z+5)<5||(x>5&&x<15&&z>3&&z<12)||(Math.abs(x-13)<2&&z>13))continue;palms.push([x,z,rr(6,10)]);}
 const crowns=[];
 for (const [x,z,height] of palms) {
  if (Math.hypot(x+15,z+5)<7.5) continue;
  const ground=terrain.height(x,z), lean=rr(.6,1.7), yaw=rr(0,Math.PI*2);
  const points=Array.from({length:11},(_,i)=>{
   const t=i/10;
   return V(x+Math.sin(yaw)*lean*t*t,ground+height*t,z+Math.cos(yaw)*lean*t*t);
  });
  palmPaths.push({x,z,points});
  mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.175,8,false),bark);
  obstacles.push({x,z,r:.22});
  crowns.push({top:points[10],yaw,scale:T.MathUtils.lerp(.8,1.08,T.MathUtils.clamp((height-6)/4,0,1))});
 }
 addPalmCanopies(root,crowns,U);

 // Rooted patches on the green slopes keep the sand and paths open.
 for (let i=0;i<112;i++) {
  const x=rr(-23,23),z=rr(-20,21),h=terrain.height(x,z);
  if (h<1.9 || Math.hypot(x+15,z+5)<3.5 || (x>5.8&&x<15&&z>2&&z<13)) continue;
  if (path.some(p=>Math.hypot(x-p.x,z-p.z)<1.5)) continue;
  const scale=rr(.65,1.6), yaw=rr(0,Math.PI*2);
  for(let j=0;j<8;j++) {
   leaf(x,h+.06,z,scale*rr(.72,1.14),rr(.86,1.31),yaw+j*.78+rr(-.2,.2),rr(-.72,-.1));
  }
 }
 const leafBins=new Map();leaves.forEach((matrix,i)=>{const e=matrix.elements,key=Math.floor(e[12]/10)+','+Math.floor(e[14]/10);if(!leafBins.has(key))leafBins.set(key,[]);leafBins.get(key).push(i);});for(const indices of leafBins.values()){const b=new T.InstancedMesh(leafG,leafMat,indices.length);indices.forEach((index,i)=>{b.setMatrixAt(i,leaves[index]);b.setColorAt(i,leafColors[index]);});b.castShadow=b.receiveShadow=true;b.computeBoundingSphere();root.add(b);}
 // A moored sloop, cream sails filled by the sea breeze.
 const boat=new T.Group();boat.position.set(19,.15,32);boat.rotation.y=-.5;root.add(boat);const hullShape=new T.Shape();hullShape.moveTo(0,-3.6);hullShape.bezierCurveTo(1.5,-2.9,1.55,1.6,1.0,2.8);hullShape.quadraticCurveTo(0,3.5,-1,2.8);hullShape.bezierCurveTo(-1.55,1.6,-1.5,-2.9,0,-3.6);const hullGeo=new T.ExtrudeGeometry(hullShape,{depth:.72,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.17,bevelThickness:.18});const hull=mesh(hullGeo,m('#e2ddc6',.5),0,-.32,0,boat);hull.rotation.x=-Math.PI/2;const deck=mesh(new T.ShapeGeometry(hullShape),wood,0,.48,0,boat);deck.rotation.x=-Math.PI/2;box(1.1,.42,1.6,plaster,0,.68,.3,boat);soft(.72,.1,.65,teal,0,.93,.25,.06,boat);pole(V(0,.45,-.3),V(0,7.7,-.3),.045,wood,.025,boat);pole(V(0,1.4,-.3),V(2.7,1.4,-.3),.035,wood,.03,boat);
 function sail(a,b,c){const p=[],uv=[],ind=[];const n=12;for(let row=0;row<=n;row++){const t=row/n;for(let col=0;col<=n;col++){const s=col/n;const p0=a.clone().lerp(b,t),p1=c.clone().lerp(b,t),v=p0.lerp(p1,s);v.z+=Math.sin(s*Math.PI)*Math.sin((1-t)*Math.PI*.8)*.38;p.push(v.x,v.y,v.z);uv.push(s,t);}}for(let row=0;row<n;row++)for(let col=0;col<n;col++){const a=row*(n+1)+col;ind.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();mesh(g,linen,0,0,0,boat);}
 sail(V(.08,1.5,-.3),V(.03,7.48,-.3),V(2.7,1.5,-.3));sail(V(-.1,2.0,-.35),V(-.1,7.2,-.35),V(-1.9,.85,2.8));for(const [a,b] of [[V(0,7.7,-.3),V(0,.6,-3.3)],[V(0,7.7,-.3),V(-1.1,.6,2.5)],[V(0,7.7,-.3),V(1.1,.6,2.5)]])pole(a,b,.009,linen,.009,boat,4);const mooringPts=[V(14.45,1.4,34),V(16.5,.25,33.2),V(19,.7,32)];mesh(new T.TubeGeometry(new T.CatmullRomCurve3(mooringPts),20,.018,6),linen);
 // Small beach details: two recliners, a parasol and a curved trail of driftwood steps.
 function lounger(x,z,angle){const g=new T.Group();g.position.set(x,terrain.height(x,z)+.05,z);g.rotation.y=angle;root.add(g);for(let xx of [-.4,.4]){pole(V(xx,0,-.8),V(xx,.3,.8),.035,wood,.035,g);pole(V(xx,.1,.3),V(xx,.85,-.7),.035,wood,.035,g);}const seat=box(.83,.06,1.4,linen,0,.34,.15,g);seat.rotation.x=-.1;const back=box(.83,.06,.9,linen,0,.67,-.62,g);back.rotation.x=.8;}
 lounger(2,19,.25);lounger(4,18.5,.05);const ux=3,uz=17.7,uy=terrain.height(ux,uz);pole(V(ux,uy,uz),V(ux,uy+2.6,uz),.035,wood);const umbrella=mesh(new T.ConeGeometry(1.8,.65,10,1,true),linen,ux,uy+2.65,uz);umbrella.rotation.y=.1;
 for(let i=0;i<18;i++){const p=path[Math.floor(22+i*1.4)],h=terrain.height(p.x,p.z);if(h<2)continue;const stair=box(1.8,.08,.2,wood,p.x,h+.025,p.z);stair.rotation.y=-.45;}
 // Distant seabirds add scale without distracting from the island.
 const birds=[];const birdG=new T.BufferGeometry();birdG.setAttribute('position',new T.Float32BufferAttribute([-.6,0,0,-.18,.12,0,0,0,0,0,0,0,.18,.12,0,.6,0,0],3));for(let i=0;i<9;i++){const b=new T.LineSegments(birdG,new T.LineBasicMaterial({color:'#253e44',transparent:true,opacity:.6}));b.userData={phase:rr(0,6.28),radius:rr(22,40),height:rr(22,35)};scene.add(b);birds.push(b);}
 const rain=rainSystem(U,bed);scene.add(rain.lines);
 // Shared-material static meshes are merged before rendering.
 root.updateMatrixWorld(true);const batches=new Map();root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||!o.material.isMeshStandardMaterial||o.material.transparent||o.userData.partyHide)return;for(let a=o;a;a=a.parent)if(a===boat||a===beamGroup)return;const key=o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);});for(const list of batches.values()){if(list.length<2)continue;const geometries=list.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g;});const merged=mergeGeometries(geometries,false);if(merged){mesh(merged,list[0].material);list.forEach(o=>o.removeFromParent());}geometries.forEach(g=>g.dispose());}
 // Day and weather change the entire light field, not just the sky colour.
 const fogDay=new T.Color('#abc3c0'),fogNight=new T.Color('#122837'),fogStorm=new T.Color('#596e76');
 function update(t,night,weather,flashValue,camera,story={}){U.uAfterglow.value=story.afterglow||0;U.uTime.value=t;U.uNight.value=night;U.uRain.value=weather.rain;U.uCloud.value=weather.clouds;U.uWaves.value=weather.waves;U.uWind.value=weather.wind;U.uFlash.value=flashValue;
 U.uFog.value.copy(fogDay).lerp(fogStorm,weather.rain*.6).lerp(fogNight,night);scene.fog.color.copy(U.uFog.value);scene.fog.density=weather.fog;scene.environmentIntensity=T.MathUtils.lerp(.18,.035,night)*T.MathUtils.lerp(1,.55,weather.rain);scene.background.copy(U.uFog.value);
 hemi.color.set('#dcecf0').lerp(new T.Color('#7295b2'),night);hemi.groundColor.set('#a49578').lerp(new T.Color('#243f45'),night);hemi.intensity=T.MathUtils.lerp(2.2,.7,night)*T.MathUtils.lerp(1,.72,weather.rain);
 sun.color.set('#ffe8c8').lerp(new T.Color('#8aadd2'),night);sun.position.copy(U.uSun.value).lerp(V(.48,.49,-.73).normalize(),night).normalize().multiplyScalar(90);sun.intensity=T.MathUtils.lerp(3.2,.7,night)*weather.brightness;fill.intensity=T.MathUtils.lerp(.82,.22,night)*T.MathUtils.lerp(1,.75,weather.rain);flash.intensity=flashValue*7;
 const celebration=story.celebration||0;beaconMood.value=celebration;warmLights.forEach(l=>l.intensity=l.userData.power*T.MathUtils.lerp(.25,1.3,Math.max(night,weather.rain*.65)));lightMat.emissiveIntensity=T.MathUtils.lerp(1.1,4,Math.max(night,weather.rain*.7));
 lighthouseLamp.intensity*=1+celebration*2.2;houseLamp.intensity*=1+celebration*.55;beaconLensMat.emissiveIntensity=lightMat.emissiveIntensity*(1+celebration*2.5);beaconHalo.material.opacity=Math.max(night,weather.rain*.5)*(.2+celebration*.38);beaconHalo.scale.setScalar(2.2+celebration*2.6);
 const a=t*.16;beacon.target.position.set(lx+Math.sin(a)*90,ly+7.9,lz+Math.cos(a)*90);beacon.intensity=Math.max(night,weather.rain*.8)*85*(1+celebration*2.2);beamGroup.rotation.y=a+Math.PI;beamGroup.visible=Math.max(night,weather.rain*.5)>.03;
 boat.position.y=.15+Math.sin(t*.65)*(.04+weather.waves*.09);boat.rotation.z=Math.sin(t*.5)*(.007+weather.waves*.014);boat.rotation.x=Math.sin(t*.71)*.012;
 birds.forEach((b,i)=>{const p=b.userData,a=t*.06+p.phase;b.position.set(Math.sin(a)*p.radius,p.height+Math.sin(t*.7+i)*.4,Math.cos(a)*p.radius-10);b.rotation.y=-a;b.rotation.z=Math.sin(t*2.5+i)*.1;b.material.opacity=(1-night*.95)*(1-weather.rain*.8)*.7;});rain.update(camera);
 }
 return {scene,U,update,obstacles,water,sun,flash,partyDecor,palmPaths,stats:{palms:palms.length,leaves:leaves.length},terrain};
}
