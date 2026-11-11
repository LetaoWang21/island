import * as T from 'three';

// Layered mineral grains, weather stains and pitting in a seamless granite texture.
export function graniteTexture(texture) {
 return texture(512, 512, (ctx, width, height) => {
  const pixels = ctx.createImageData(width, height);
  const hash = (x, y) => {
   const n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
   return ((Math.imul(n ^ (n >>> 13), 1274126177) >>> 0) / 4294967296);
  };
  function noise(u, v, frequency) {
   const x = u * frequency, y = v * frequency;
   const i = Math.floor(x), j = Math.floor(y);
   const a = x - i, b = y - j;
   const sx = a * a * (3 - 2 * a), sy = b * b * (3 - 2 * b);
   const at = (dx, dy) => hash((i + dx) % frequency, (j + dy) % frequency);
   return T.MathUtils.lerp(T.MathUtils.lerp(at(0, 0), at(1, 0), sx), T.MathUtils.lerp(at(0, 1), at(1, 1), sx), sy);
  }
  for (let y = 0; y < height; y++) {
   for (let x = 0; x < width; x++) {
    const u = x / width, v = y / height;
    const strata = noise(u, v, 5) * .5 + noise(u, v, 13) * .32 + noise(u, v, 27) * .18;
    const mica = noise(u, v, 100) * .66 + hash(x + 29, y + 51) * .34;
    const coffee = T.MathUtils.smoothstep(strata, .48, .76);
    const graphite = 1 - T.MathUtils.smoothstep(strata, .08, .33);
    const grit = (mica - .5) * 53 - T.MathUtils.smoothstep(1 - mica, .66, .86) * 46;
    const index = (y * width + x) * 4;
    pixels.data[index] = 183 - coffee * 27 - graphite * 55 + grit;
    pixels.data[index + 1] = 174 - coffee * 35 - graphite * 46 + grit;
    pixels.data[index + 2] = 158 - coffee * 39 - graphite * 37 + grit;
    pixels.data[index + 3] = 255;
   }
  }
  ctx.putImageData(pixels, 0, 0);
 });
}

export function addCoastalPlants(root, height, deck, rockSites, path) {
 let seed = 74581;
 const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
 const range = (a, b) => a + (b - a) * rand();
 const pick = palette => palette[Math.floor(rand() * palette.length)];
 const v = (x, y, z) => new T.Vector3(x, y, z);
 const greens = ['#455534', '#53683a', '#617746', '#708254', '#3b533d'];
 const agaves = ['#436656', '#567867', '#658574', '#597b72'];
 const mosses = ['#687145', '#7b7951', '#525e37'];
 const leafMat = new T.MeshStandardMaterial({roughness:.79, side:T.DoubleSide, vertexColors:true});
 const mossMat = new T.MeshStandardMaterial({roughness:1});
 const stemMat = new T.MeshStandardMaterial({color:'#57442d', roughness:1});
 const leafGeo = blade(.27, .09, .1);
 const strapGeo = blade(.12, .73, -.35);
 const broadGeo = blade(.33,.22,.035);
 const mossGeo = new T.IcosahedronGeometry(1, 1);

 // Folded surfaces catch grazing light differently on each side of the midrib.
 function blade(width, rise, droop) {
  const coords = [], indices = [], tones = [];
  for (let i = 0; i <= 6; i++) {
   const t = i / 6;
   const edge = width * (.04 + .96 * Math.pow(Math.sin(Math.PI * t), .8)) * (1.2 - .42 * t);
   const y = rise * Math.sin(t * 1.8) + droop * t * t;
   coords.push(-edge, y - edge * .26, t, 0, y, t, edge, y - edge * .26, t);
   const edgeTone = .73 + t*.20;
   tones.push(edgeTone,edgeTone,edgeTone, 1,1,.97, edgeTone*.98,edgeTone,edgeTone);
   if (i > 0) {
    const a = (i - 1) * 3;
    indices.push(a, a+3, a+1, a+1, a+3, a+4, a+1, a+4, a+2, a+2, a+4, a+5);
   }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(coords, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(tones, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
 }

 const batches = new Map();
 const dummy = new T.Object3D();
 function instance(geometry, material, position, scales, yaw, pitch, roll, color) {
  dummy.position.copy(position);
  dummy.scale.set(...scales);
  dummy.rotation.set(pitch, yaw, roll, 'YXZ');
  dummy.updateMatrix();
  if (!batches.has(geometry)) batches.set(geometry, {material, matrices:[], colors:[]});
  const batch = batches.get(geometry);
  batch.matrices.push(dummy.matrix.clone());
  batch.colors.push(new T.Color(color));
 }

 function stem(points, width) {
  const geometry = new T.TubeGeometry(new T.CatmullRomCurve3(points), 12, width, 4, false);
  const mesh = new T.Mesh(geometry, stemMat);
  mesh.receiveShadow = true;
  root.add(mesh);
 }

 function vine(at, size) {
  stem(Array.from({length:8}, (_, i) => at(i / 7)), .016 * size);
  for (let i = 0; i < 30; i++) {
   const t = (i + rand() * .65) / 30, base = at(t);
   const length = range(.24, .51) * size * (1 - .40 * t);
   const yaw = range(-Math.PI, Math.PI);
   instance(leafGeo, leafMat, base, [length, length, length], yaw, range(.10, .95), range(-.65, .65), pick(greens));
   if (i % 3 === 0) {
    const branchLeaf = base.clone().add(v(Math.sin(yaw)*length*.38,.04,Math.cos(yaw)*length*.38));
    instance(leafGeo,leafMat,branchLeaf,[length*.94,length*.84,length*.91],yaw+1.4,range(-.4,.7),range(-.5,.5),pick(greens));
   }
  }
 }

 // Follow the tower's taper, with gaps around the door, windows and lantern.
 const towerGround = height(-15, -5);
 for (let i = 0; i < 18; i++) {
  const angle = i < 10 ? range(2.05, 3.02) : range(.12, .80);
  const top = range(3.0, 5.3), drop = range(1.55, 3.65), phase = range(0,6.28);
  vine(t => {
   const y = top - t * drop;
   const a = angle + .15 * Math.sin(t * 6 + phase) + t * .28 * Math.sin(phase);
   const radius = 1.84 - Math.max(0,y-.17)*.081 + (.05+.08*t)*Math.sin(t*8+phase) + .10*t;
   return v(-15 + Math.cos(a) * radius, towerGround + y, -5 + Math.sin(a) * radius);
  }, range(.74,1.26));
 }

 // Curtains grow from the eaves and outer posts, clear of the stairs and lamps.
 for (let i = 0; i < 17; i++) {
  const east = i < 10;
  const top = east ? range(2.88,3.16) : range(3.14,3.85);
  const x = east ? range(3.22,3.48) : range(-2.95,-1.68);
  const z = east ? range(-2.96,1.22) : range(2.76,3.06);
  const drop = range(.62,2.27), phase = range(0,6.28);
  vine(t => v(10+x+.13*Math.sin(t*7+phase), deck+top-t*drop, 7+z+.12*Math.cos(t*6+phase)), range(.86,1.27));
 }

 function fern(x, y, z, scale) {
  const yaw = range(0,6.28);
  const count = Math.floor(range(5,9));
  for (let frond = 0; frond < count; frond++) {
   const angle = yaw + frond * 6.28/count + range(-.29,.29), length = scale * range(.68,1.28);
   const lean = range(.48,.86), color = pick(greens);
   const at = t => v(x+Math.sin(angle)*t*length, y+Math.sin(t*2.3)*length*lean, z+Math.cos(angle)*t*length);
   stem([at(0),at(.33),at(.66),at(1)], .008 * scale);
   for (let i = 1; i <= 11; i++) {
    const t = i/12;
    const size = length * (.055+.26*Math.sin(Math.PI*t)*Math.pow(1-t,.38));
    for (const side of [-1,1]) instance(leafGeo, leafMat, at(t), [size*.68,size,size], angle+side*1.05, range(-.28,.14), side*.26, color);
   }
  }
 }

 function agave(x, y, z, scale) {
  const yaw = range(0,6.28);
  for (let j = 0; j < 13; j++) {
   const inner = j > 8;
   const length = scale * range(.59,1.08);
   instance(strapGeo, leafMat, v(x,y+range(0,.08),z), [length, length, length], yaw+j*2.4, inner ? range(-.62,-.35) : range(-.2,.15), range(-.22,.22), pick(agaves));
  }
 }

 for (const [x,z,s] of [[6.1,8.3,1.1],[13.4,8.7,1.05],[13.6,4.6,.9],[-18.2,-3.8,.9],[-12.7,-7.7,1.0],[2.9,16,.77],[16.4,12.2,.9],[8.4,4,.96]]) fern(x,height(x,z)-.06,z,s);
 for (const [x,z,s] of [[5.8,11,1.13],[15.2,8.8,1.12],[-17.8,-2.8,.8],[15.7,15.1,.86],[-6.6,18.4,1.06],[18.8,8.7,1.22]]) agave(x,height(x,z)-.05,z,s);

 // Ground cover follows dry rock pockets, with larger fronds only at selected seams.
 const groundColors=['#536840','#667c42','#748449','#83914e','#567443'];
 const pockets=[];
 const orderedSites=rockSites.slice().sort((a,b)=>b.size-a.size);
 for (const {x,z,size} of orderedSites) {
  if (pockets.length>=30 || size<.65) continue;
  const inland=Math.atan2(-x,-z);
  const angle=inland+range(-1.35,1.35);
  const edgeX=x+Math.sin(angle)*size*1.29, edgeZ=z+Math.cos(angle)*size*1.29;
  if (height(edgeX,edgeZ)<.54 || path.some(p=>Math.hypot(edgeX-p.x,edgeZ-p.z)<1.5)) continue;
  if (pockets.some(p=>Math.hypot(edgeX-p.x,edgeZ-p.z)<2.1)) continue;
  pockets.push({x:edgeX,z:edgeZ});
  const spread=Math.min(.98,.37+size*.27);
  for (let j=0;j<5;j++) {
   const mx=edgeX+range(-spread,spread), mz=edgeZ+range(-spread,spread);
   const y=height(mx,mz);
   if (y<.34) continue;
   instance(mossGeo,mossMat,v(mx,y+.014,mz),[range(.14,.33),range(.035,.088),range(.13,.30)],range(0,6.28),0,0,pick(mosses));
   for (let k=0;k<6;k++) {
    const length=range(.35,.71);
    instance(broadGeo,leafMat,v(mx,y-.02,mz),[length,length,length],k*2.39+range(-.35,.35),range(-.66,-.10),range(-.24,.24),pick(groundColors));
   }
  }
  const y=height(edgeX,edgeZ);
  if (pockets.length%4===0) agave(edgeX,y-.03,edgeZ,range(.67,.96));
  else if (size>1.45 || pockets.length%3===0) fern(edgeX,y-.04,edgeZ,range(.83,1.25));
 }
 for (const [geometry, {material,matrices,colors}] of batches) {
  const mesh = new T.InstancedMesh(geometry,material,matrices.length);
  matrices.forEach((matrix,i) => {
   mesh.setMatrixAt(i,matrix);
   mesh.setColorAt(i,colors[i]);
  });
  mesh.receiveShadow = true;
  mesh.castShadow = geometry === leafGeo || geometry === strapGeo || geometry === broadGeo;
  mesh.computeBoundingSphere();
  root.add(mesh);
 }
}
