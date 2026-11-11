import * as T from 'three';
import terrain from './terrain.cjs';
export const noiseGLSL=`
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 rot=mat2(.8,-.6,.6,.8);for(int i=0;i<4;i++){v+=noise(p)*a;p=rot*p*2.03+13.7;a*=.5;}return v;}
`;
const common=`uniform float uTime,uNight,uRain,uCloud,uWaves,uWind,uFlash,uAfterglow;uniform vec3 uSun,uFog;`;
export function skyMaterial(U){return new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:U,vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`${common}${noiseGLSL}
varying vec3 vDir;
void main(){vec3 d=normalize(vDir);float elevation=max(0.,d.y);vec3 horizon=mix(vec3(.35,.58,.68),vec3(.052,.093,.15),uNight);vec3 zenith=mix(vec3(.025,.15,.32),vec3(.004,.009,.027),uNight);vec3 col=mix(horizon,zenith,pow(elevation,.48));
float sunDot=max(0.,dot(d,uSun));col+=vec3(1.,.61,.27)*pow(sunDot,12.)*.22*(1.-uNight);col+=vec3(1.,.83,.55)*pow(sunDot,1300.)*8.*(1.-uNight);
vec3 moonDir=normalize(vec3(.48,.49,-.73));float moon=dot(d,moonDir);float moonDisc=smoothstep(.99975,.99988,moon);float moonNoise=noise(d.xz*1700.)*.18+.75;col+=vec3(.7,.83,1.)*moonDisc*moonNoise*2.2*uNight;col+=vec3(.22,.36,.54)*pow(max(0.,moon),80.)*.2*uNight;
vec2 starUV=vec2(atan(d.x,d.z),asin(d.y))*430.;vec2 si=floor(starUV);float star=step(.994,hash21(si))*pow(max(0.,1.-length(fract(starUV)-.5)*2.),7.);col+=vec3(.7,.83,1.)*star*uNight*smoothstep(.08,.4,d.y)*(1.-uCloud*.9);
if(d.y>-.02){vec2 p=d.xz/max(.03,d.y)*.35+vec2(uTime*.006*uWind,-uTime*.002);float n=fbm(p),fine=fbm(p*2.4+4.);float cloud=smoothstep(mix(.68,.28,uCloud),mix(.84,.48,uCloud),n+fine*.18);float shade=fbm(p+vec2(-.12,.05));vec3 cc=mix(vec3(.76,.79,.77),vec3(.98,.96,.86),shade);cc=mix(cc,vec3(.12,.15,.19),uCloud*.7);cc=mix(cc,cc*.10+vec3(.012,.022,.04),uNight);col=mix(col,cc,cloud*smoothstep(.015,.10,d.y));float cirrus=pow(fbm(d.xz/max(.2,d.y)*vec2(4.,18.)+uTime*.002),5.)*.55*(1.-uCloud);col+=cirrus*(1.-uNight)*smoothstep(.24,.55,d.y);}
col=mix(col,vec3(.17,.21,.26),uRain*.38*(1.-uNight));col=mix(col,col*vec3(1.12,1.035,.94)+vec3(.025,.009,0.),uAfterglow*(1.-uNight)*.65);col+=vec3(.65,.76,1.)*uFlash*.9;gl_FragColor=vec4(col,1.);}
`});}
export const waveCode=`
float waves(vec2 p){float t=uTime;float a=.06+uWaves*.21;return (sin(dot(p,vec2(.15,.09))+t*.64)+sin(dot(p,vec2(-.12,.22))-t*.85)*.48+sin(dot(p,vec2(.33,.17))+t*1.2)*.23)*a;}
float fineWaves(vec2 p){return waves(p)+sin(p.x*1.7+sin(p.y*1.1+uTime*.9))*sin(p.y*1.8-uTime*1.1)*(.018+uWaves*.028)+sin(p.x*4.3+p.y*3.7+uTime*2.)*.004;}
`;
export function oceanMaterial(U,bed,reflector){return new T.ShaderMaterial({uniforms:{...U,uBed:{value:bed},tDiffuse:reflector.material.uniforms.tDiffuse,textureMatrix:reflector.material.uniforms.textureMatrix},vertexShader:`${common}${waveCode}
uniform mat4 textureMatrix;varying vec3 vWorld;varying vec4 vMirror;void main(){vec3 transformed=position;vec3 wp=(modelMatrix*vec4(transformed,1.)).xyz;transformed.z+=waves(wp.xz);vWorld=(modelMatrix*vec4(transformed,1.)).xyz;vMirror=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,fragmentShader:`${common}${noiseGLSL}${waveCode}
uniform sampler2D uBed,tDiffuse;varying vec3 vWorld;varying vec4 vMirror;
void main(){vec2 p=vWorld.xz;vec2 bedUV=(p+90.)/180.;float bed=texture2D(uBed,clamp(bedUV,0.,1.)).r*24.-8.;float depth=vWorld.y-bed;if(depth<-.18)discard;float e=.09;float dx=(fineWaves(p+vec2(e,0.))-fineWaves(p-vec2(e,0.)))/(2.*e),dz=(fineWaves(p+vec2(0.,e))-fineWaves(p-vec2(0.,e)))/(2.*e);vec3 N=normalize(vec3(-dx,1.,-dz)),V=normalize(cameraPosition-vWorld);float facing=max(0.,dot(N,V));float fresnel=.04+pow(1.-facing,4.)*.8;
float waterDepth=max(0.,depth);
float reef=fbm(p*.36);
vec3 sandBed=mix(vec3(.29,.37,.27),vec3(.39,.46,.32),reef);
vec3 shallows=vec3(.038,.40,.33);
vec3 blueWater=vec3(.011,.093,.155);
vec3 col=mix(blueWater,shallows,exp(-waterDepth*.28));
col=mix(col,sandBed,exp(-waterDepth*1.05)*.71);
vec2 causticUV=p*2.15+vec2(uTime*.23,-uTime*.17);
float rippleA=sin(causticUV.x+1.2*sin(causticUV.y*.83));
float rippleB=sin(causticUV.y-1.35*sin(causticUV.x*.64+uTime*.39));
float ridge=abs(rippleA+rippleB*.54);
float caustic=(1.-smoothstep(.025,.19+fwidth(ridge),ridge))*smoothstep(.2,.8,reef);
col+=vec3(.085,.13,.10)*caustic*exp(-waterDepth*.79)*(1.-uRain*.7);
col*=mix(1.,.13,uNight)*mix(1.,.48,uRain);vec4 proj=vMirror;proj.xy+=N.xz*.012*proj.w;vec3 reflection=min(texture2DProj(tDiffuse,proj).rgb,vec3(mix(.92,1.4,uNight)));col=mix(col,reflection,fresnel*mix(.50,.85,max(uNight,max(uRain,smoothstep(1.0,5.0,waterDepth)))));
vec3 L=normalize(mix(uSun,vec3(.48,.49,-.73),uNight));vec3 H=normalize(L+V);float spec=pow(max(0.,dot(N,H)),mix(240.,100.,uWaves));col+=mix(vec3(.3,.25,.17),vec3(.25,.36,.55),uNight)*spec*(.25+.75*smoothstep(.35,.8,noise(p*6.+vec2(uTime*.1,-uTime*.15))))*mix(1.,.24,uRain);col+=vec3(.22,.29,.31)*pow(max(0.,dot(N,H)),24.)*.12*(1.-uRain*.7);
float foamNoise=fbm(p*1.6+vec2(uTime*.12,-uTime*.08));float wash=sin(depth*5.-uTime*1.5+foamNoise*3.);float foam=(1.-smoothstep(.12,.9,depth))*.48+smoothstep(.79,.95,wash)*(1.-smoothstep(.35,2.3,depth))*.34;foam*=smoothstep(.18,.7,foamNoise+.2);foam*=smoothstep(-.15,.12,depth);float crest=pow(max(0.,N.x+N.z),3.)*uRain*.17;foam+=crest;
vec2 cell=floor(p*1.2);float phase=fract(uTime*1.5+hash21(cell));vec2 spot=fract(p*1.2)-.5;float ring=exp(-pow((length(spot)-phase*.48)*45.,2.))*(1.-phase);col+=ring*uRain*.08*mix(vec3(1.),vec3(.2,.3,.4),uNight);col=mix(col,mix(vec3(.60,.72,.66),vec3(.12,.2,.25),uNight),clamp(foam,0.,.86));
float distanceFog=1.-exp(-length(cameraPosition-vWorld)*mix(.00065,.006,uRain));col=mix(col,uFog,distanceFog);col+=vec3(.35,.45,.6)*uFlash*.3;gl_FragColor=vec4(col,1.);}
`});}
export function rainSystem(U,bed){
const count=8500;const geo=new T.InstancedBufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,1,0],3));let offsets=new Float32Array(count*3),seeds=new Float32Array(count);let r=71;const rand=()=>{r=(r*1664525+1013904223)>>>0;return r/4294967296};for(let i=0;i<count;i++){offsets[i*3]=(rand()-.5)*105;offsets[i*3+1]=rand()*42;offsets[i*3+2]=(rand()-.5)*105;seeds[i]=rand();}geo.setAttribute('aOffset',new T.InstancedBufferAttribute(offsets,3));geo.setAttribute('aSeed',new T.InstancedBufferAttribute(seeds,1));geo.instanceCount=0;
const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{...U,uBed:{value:bed},uOrigin:{value:new T.Vector3()},uExtent:{value:105},uTop:{value:44}},vertexShader:`${common}uniform sampler2D uBed;uniform vec3 uOrigin;uniform float uExtent,uTop;attribute vec3 aOffset;attribute float aSeed;varying float vAlpha;void main(){float fall=mod(aOffset.y/42.*uTop-uTime*mix(12.,30.,uRain),uTop);vec3 p=vec3(aOffset.x*uExtent/105.,fall,aOffset.z*uExtent/105.)+uOrigin;p.x+=(uTop-fall)*uWind*.16;p.y+=position.y*mix(.35,1.5,uRain);p.x-=position.y*uWind*.32;float bed=texture2D(uBed,clamp((p.xz+90.)/180.,0.,1.)).r*24.-8.;float floorY=max(0.,bed);vAlpha=step(floorY,p.y)*(.2+aSeed*.55);if(p.x>5.2&&p.x<14.8&&p.z>3.&&p.z<12.&&p.y<6.2)vAlpha=0.;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,fragmentShader:`${common}varying float vAlpha;void main(){vec3 color=mix(vec3(.67,.77,.78),vec3(.38,.51,.66),uNight);color+=uFlash*.4;gl_FragColor=vec4(color,vAlpha*mix(.4,.6,uRain));}`});const lines=new T.LineSegments(geo,material);lines.visible=false;lines.frustumCulled=false;lines.renderOrder=4;return {lines,update(camera){lines.visible=U.uRain.value>.008;geo.instanceCount=Math.floor(count*U.uRain.value);const v=terrain.rainVolume(camera.position.x,camera.position.y,camera.position.z);material.uniforms.uOrigin.value.set(v.x,0,v.z);material.uniforms.uExtent.value=v.extent;material.uniforms.uTop.value=v.top;}};
}
