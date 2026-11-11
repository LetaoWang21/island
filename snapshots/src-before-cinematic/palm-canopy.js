import * as T from 'three';

const tiers = [
 {count:8, length:[4.15,5.28], rise:.21, drop:.50, lift:0, colors:['#73874c','#637c41','#80924e']},
 {count:7, length:[3.65,4.72], rise:.26, drop:.23, lift:.13, colors:['#80944f','#72894b','#899a56']},
 {count:5, length:[2.65,3.74], rise:.22, drop:.14, lift:.56, colors:['#91a258','#839953','#98a85e']}
];

function frondGeometry({rise, drop, lift, colors}) {
 const positions=[], tones=[], triangles=[];
 const tone = new T.Color();
 const arch = t => lift*t+rise*Math.sin(t*Math.PI)-drop*t*t;

 function ribbon(steps, point, paletteColor) {
  const start=positions.length/3;
  for (let i=0; i<=steps; i++) {
   const t=i/steps;
   for (const edge of [-1,0,1]) {
    positions.push(...point(t,edge));
    tone.set(paletteColor).multiplyScalar((edge===0 ? 1.12 : .89)+t*.09);
    tones.push(tone.r,tone.g,tone.b);
   }
   if (i===0) continue;
   const a=start+(i-1)*3;
   triangles.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5);
  }
 }

 // A tapered rachis continues all the way through the tips of the pinnae.
 ribbon(20,(t,edge)=>[edge*(.007*(1-t)+.0004),arch(t)-Math.abs(edge)*.002,t],'#9b9d62');
 for (let i=0;i<24;i++) {
  for (const side of [-1,1]) {
   const start=.095+i*.037+(side===1?.009:0);
   const spread=(.045+.25*Math.pow(Math.sin(Math.PI*start),.86))*(1-start*.31);
   const sweep=.25+.59*start;
   const color=colors[(i+(side+1)/2)%colors.length];
   const first=positions.length/3;
   const profile=[[0,0],[.33,-1],[.33,0],[.33,1],[.68,-1],[.68,0],[.68,1],[1,0]];
   for (const [t,edge] of profile) {
    const cross=spread*.122*Math.pow(Math.sin(Math.PI*t),.68)*edge;
    const rib=spread*.022*Math.sin(t*Math.PI)*(edge===0?1:0);
    positions.push(
     side*(spread*t*.93+cross*sweep),
     arch(start)+spread*t*(.15-.64*t)+rib-Math.abs(cross)*.20,
     start+spread*t*sweep-cross*.93
    );
    tone.set(color).multiplyScalar((edge===0 ? 1.08 : .86)+t*.09);
    tones.push(tone.r,tone.g,tone.b);
   }
   for (const vertex of [0,1,2,0,2,3,1,4,2,2,4,5,2,5,3,3,5,6,4,7,5,5,7,6]) triangles.push(first+vertex);
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(tones,3));
 geometry.setIndex(triangles);
 geometry.computeVertexNormals();
 return geometry;
}

export function addPalmCanopies(root, crowns, uniforms) {
 let seed=41381;
 const between=(a,b)=>a+(b-a)*((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const material=new T.MeshStandardMaterial({
  vertexColors:true,side:T.DoubleSide,roughness:.76,emissive:'#223513',emissiveIntensity:.12
 });
 material.onBeforeCompile=shader=>{
  shader.uniforms.uTime=uniforms.uTime;
  shader.uniforms.uWind=uniforms.uWind;
  shader.vertexShader='uniform float uTime,uWind;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float phase=dot(instanceMatrix[3].xz,vec2(.43,.23));
   float tip=position.z*position.z;
   transformed.y+=sin(uTime*(1.+uWind)+phase)*tip*(.014+uWind*.051);
   transformed.x+=cos(uTime*.76+phase)*tip*(.012+uWind*.027);
  `);
 };
 const transform=new T.Object3D();
 const tint=new T.Color();
 for (const [layer,tier] of tiers.entries()) {
  const geometry=frondGeometry(tier);
  const mesh=new T.InstancedMesh(geometry,material,crowns.length*tier.count);
  let index=0;
  for (const {top,scale,yaw} of crowns) {
   for (let j=0;j<tier.count;j++) {
    const size=scale*between(...tier.length);
    transform.position.copy(top);
    transform.position.y+=layer*.065;
    transform.rotation.set(between(-.085,.105),yaw+layer*1.19+j*2*Math.PI/tier.count+between(-.21,.21),between(-.20,.20),'YXZ');
    transform.scale.set(size*between(.86,1.10),size,size);
    transform.updateMatrix();
    mesh.setMatrixAt(index,transform.matrix);
    mesh.setColorAt(index,tint.setScalar(between(.83,1.1)));
    index++;
   }
  }
  mesh.castShadow=mesh.receiveShadow=true;
  mesh.computeBoundingSphere();
  root.add(mesh);
 }
}
