import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Architectural warm lights are confined to the pavilion and its own deck.
export function createHouseLights(scene){
 const group=new T.Group();group.visible=false;scene.add(group);
 const positions=[],cords=[],ribbons=[];const V=(x,y,z)=>new T.Vector3(x,y,z);
 function strand(points,spacing=.28,size=.035){
  const curve=new T.CatmullRomCurve3(points),n=Math.ceil(curve.getLength()/spacing);
  for(let i=0;i<=n;i++)positions.push({point:curve.getPoint(i/n),size});
  const segments=Math.max(30,points.length*2);cords.push(new T.TubeGeometry(curve,segments,.006,3));ribbons.push(new T.TubeGeometry(curve,segments,.012,4));
 }
 // Sit above the layered thatch and timber ridge so roof lights stay visible.
 const eaveY=5.30,ridgeY=6.87;
 for(const z of [3.63,10.37]){
  strand([V(6.32,eaveY,z),V(10,ridgeY,z)],.24,.041);
  strand([V(10,ridgeY,z),V(13.68,eaveY,z)],.24,.041);
 }
 for(const x of [6.32,13.68])strand([V(x,eaveY,3.63),V(x,eaveY,10.37)],.26,.039);
 strand([V(10,ridgeY,3.63),V(10,ridgeY,10.37)],.24,.044);
 for(const z of [5.2,7,8.8]){
  strand([V(6.45,5.36,z),V(10,6.9,z)],.3,.035);
  strand([V(10,6.9,z),V(13.55,5.36,z)],.3,.035);
 }
 for(const x of [7.3,12.7])for(const z of [4.9,9.1]){
  strand(Array.from({length:90},(_,i)=>{const t=i/89,a=t*Math.PI*8;return V(x+Math.cos(a)*.132,2.45+t*2.5,z+Math.sin(a)*.132);}),.2,.028);
 }
 // A low warm outline hugs the wooden porch, leaving beach and trees untouched.
 strand([V(6.96,2.21,4.52),V(13.04,2.21,4.52),V(13.04,2.21,9.48),V(6.96,2.21,9.48),V(6.96,2.21,4.52)],.48,.026);
 group.add(new T.Mesh(mergeGeometries(cords,false),new T.MeshBasicMaterial({color:'#574935'})));cords.forEach(g=>g.dispose());
 const ribbonMaterial=new T.MeshBasicMaterial({color:'#ffc36e',transparent:true,opacity:0,depthWrite:false,toneMapped:false});group.add(new T.Mesh(mergeGeometries(ribbons,false),ribbonMaterial));ribbons.forEach(g=>g.dispose());
 const bulbMaterial=new T.MeshBasicMaterial({color:'#ffce85',toneMapped:false}),bulbs=new T.InstancedMesh(new T.SphereGeometry(1,8,6),bulbMaterial,positions.length),matrix=new T.Matrix4();
 positions.forEach((p,i)=>{matrix.makeScale(p.size,p.size*1.15,p.size);matrix.setPosition(p.point);bulbs.setMatrixAt(i,matrix);});group.add(bulbs);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions.flatMap(p=>p.point.toArray()),3));const strength={value:0};
 const glow=new T.Points(geo,new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{uStrength:strength},vertexShader:`void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(230./max(1.,-p.z),1.5,16.);}`,fragmentShader:`uniform float uStrength;void main(){float r=length(gl_PointCoord-.5)*2.;float a=exp(-r*r*4.)*(1.-smoothstep(.55,1.,r));gl_FragColor=vec4(1.,.66,.27,a*uStrength*.23);}`}));glow.frustumCulled=false;group.add(glow);
 const baseColor=new T.Color('#ffce85');let currentStrength=0;
 function update(night,level){const darkness=T.MathUtils.smoothstep(night,.08,.8);currentStrength=darkness*(.2+level*1.05);group.visible=darkness>.005;bulbMaterial.color.copy(baseColor).multiplyScalar(currentStrength);ribbonMaterial.opacity=darkness*(.09+level*.65);strength.value=currentStrength;}
 return {update,get strength(){return currentStrength;},count:positions.length};
}
