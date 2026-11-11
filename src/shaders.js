import * as T from 'three';
import terrain from './terrain.cjs';
export const noiseGLSL=`
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 rot=mat2(.8,-.6,.6,.8);for(int i=0;i<4;i++){v+=noise(p)*a;p=rot*p*2.03+13.7;a*=.5;}return v;}
`;
const common=`uniform float uTime,uNight,uRain,uCloud,uWaves,uWind,uFlash,uAfterglow;uniform vec3 uSun,uMoon,uFog;`;

// One atmosphere for the sky dome and the sea's distance haze, so the horizon never shows a seam.
// The sun sits low: warm on its side of the sky, dusty and cool opposite, deepening as it sets.
export const atmosphereGLSL=`
vec3 atmosphere(vec3 d){
 float y=clamp(d.y,0.,1.);
 float h=pow(y,.42);
 float az=clamp(dot(normalize(d.xz+vec2(1e-4)),normalize(uSun.xz))*.5+.5,0.,1.);
 float mu=max(0.,dot(normalize(vec3(d.x,y,d.z)),normalize(vec3(uSun.x,max(uSun.y,0.),uSun.z))));
 float low=1.-smoothstep(-.08,.24,uSun.y);
 vec3 zen=mix(vec3(.036,.115,.290),vec3(.028,.055,.185),low);
 vec3 mid=mix(vec3(.200,.330,.500),vec3(.250,.225,.370),low);
 vec3 cool=mix(vec3(.400,.440,.540),vec3(.370,.290,.400),low);
 vec3 warm=mix(vec3(.960,.560,.270),vec3(1.02,.360,.150),low);
 vec3 day=mix(mix(cool,warm,pow(az,2.4)),mid,smoothstep(0.,.52,h));
 day=mix(day,zen,smoothstep(.36,1.,h));
 day+=vec3(1.,.46,.15)*pow(mu,5.)*exp(-y*4.2)*.30;
 day+=vec3(1.,.60,.30)*pow(mu,44.)*.36;
 vec3 night=mix(vec3(.030,.060,.108),vec3(.0035,.0072,.022),pow(y,.5));
 float mm=max(0.,dot(d,uMoon));
 night+=vec3(.16,.25,.40)*pow(mm,22.)*.20+vec3(.20,.30,.46)*pow(mm,200.)*.42;
 vec3 col=mix(day,night,uNight);
 float dusk=uNight*(1.-uNight)*4.;
 col+=vec3(.95,.27,.17)*dusk*pow(az,3.)*exp(-y*5.5)*.32;
 col=mix(col,uFog*mix(1.,.82,y),smoothstep(0.,.55,uRain)*.86);
 col=mix(col,col*vec3(1.12,1.035,.94)+vec3(.025,.009,0.),uAfterglow*(1.-uNight)*.65);
 return col;
}
`;

export function skyMaterial(U){return new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:U,vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`${common}${noiseGLSL}${atmosphereGLSL}
varying vec3 vDir;
void main(){
 vec3 d=normalize(vDir);
 vec3 col=atmosphere(d);
 float above=smoothstep(-.006,.010,d.y);
 float clear=1.-smoothstep(.05,.5,uRain);
 float low=1.-smoothstep(-.08,.24,uSun.y);
 float mu=dot(d,uSun);

 // Stars first, so cloud can pass in front of them.
 vec2 starUV=vec2(atan(d.x,d.z),asin(clamp(d.y,-1.,1.)))*380.;
 vec2 cell=floor(starUV);
 float seed=hash21(cell);
 float star=step(.9915,seed)*pow(max(0.,1.-length(fract(starUV)-.5)*2.),6.);
 star*=.55+.45*sin(uTime*(1.2+seed*3.)+seed*90.);
 col+=mix(vec3(.72,.83,1.),vec3(1.,.9,.78),fract(seed*37.))*star*1.5*uNight*smoothstep(.05,.36,d.y)*(1.-uCloud*.9);

 // Moon: a soft-edged disc with faint maria, bright enough to bloom.
 float moon=dot(d,uMoon);
 float moonDisc=smoothstep(.99962,.99976,moon);
 float maria=.74+.26*noise(d.xy*150.+d.zx*90.);
 col+=vec3(.78,.86,1.)*moonDisc*maria*3.2*uNight*clear;

 if(d.y>-.02){
  vec2 sunXZ=normalize(uSun.xz);
  vec2 p=d.xz/(max(d.y,0.)+.16)*.95;
  p=vec2(p.x*.8+p.y*.6,(-p.x*.6+p.y*.8)*1.7)+vec2(uTime*.007*(.4+uWind),-uTime*.0024);
  // Warp the field so cloud edges curl instead of following the noise lattice.
  p+=(vec2(fbm(p*.55+7.3),fbm(p*.55+31.7))-.5)*1.5;
  float n=fbm(p),fine=fbm(p*2.7+4.);
  float body=n+fine*.2;
  float cloud=smoothstep(mix(.55,.27,uCloud),mix(.78,.47,uCloud),body);
  // Sample a step toward the sun: where it thins out, this edge is catching light.
  float lit=clamp((body-fbm(p+sunXZ*.22)-fbm((p+sunXZ*.22)*2.7+4.)*.2)*3.+.46,0.,1.);
  vec3 sunlit=mix(vec3(1.05,.68,.44),vec3(1.10,.44,.24),low);
  vec3 shade=mix(vec3(.30,.31,.42),vec3(.24,.19,.31),low);
  vec3 cc=mix(shade,sunlit,lit*lit);
  cc+=vec3(1.,.56,.26)*pow(max(0.,mu),6.)*.55;
  cc=mix(cc,vec3(.14,.17,.21)+vec3(.10,.11,.12)*lit,smoothstep(.15,.75,uCloud));
  vec3 nightCloud=vec3(.016,.026,.046)+vec3(.05,.075,.12)*lit*pow(max(0.,moon),3.);
  cc=mix(cc,nightCloud,uNight);
  col=mix(col,cc,cloud*smoothstep(.012,.11,d.y)*mix(.86,1.,uCloud));
  float cirrus=pow(fbm(d.xz/max(.2,d.y)*vec2(5.,13.)+uTime*.002),5.)*.34*(1.-uCloud);
  col+=cirrus*mix(vec3(1.,.72,.5),vec3(.9,.42,.3),low)*(1.-uNight)*smoothstep(.22,.55,d.y);
 }

 // The sun itself, drawn over thin cloud and reddening as it meets the sea.
 float sunDisc=smoothstep(.99991,.99996,mu);
 float corona=pow(max(0.,mu),900.)*.9+pow(max(0.,mu),180.)*.28;
 col+=mix(vec3(1.,.70,.38),vec3(1.,.38,.14),low)*(sunDisc*7.+corona)*above*clear*(1.-smoothstep(.55,.95,uNight));

 col+=vec3(.65,.76,1.)*uFlash*.9;
 gl_FragColor=vec4(col,1.);
}
`});}
export const waveCode=`
float waves(vec2 p){float t=uTime;float a=.06+uWaves*.21;return (sin(dot(p,vec2(.15,.09))+t*.64)+sin(dot(p,vec2(-.12,.22))-t*.85)*.48+sin(dot(p,vec2(.33,.17))+t*1.2)*.23)*a;}
float fineWaves(vec2 p){return waves(p)+sin(p.x*1.7+sin(p.y*1.1+uTime*.9))*sin(p.y*1.8-uTime*1.1)*(.018+uWaves*.028)+sin(p.x*4.3+p.y*3.7+uTime*2.)*.004;}
`;
export function oceanMaterial(U,bed,reflector){return new T.ShaderMaterial({uniforms:{...U,uBed:{value:bed},tDiffuse:reflector.material.uniforms.tDiffuse,textureMatrix:reflector.material.uniforms.textureMatrix},vertexShader:`${common}${waveCode}
uniform mat4 textureMatrix;varying vec3 vWorld;varying vec4 vMirror;void main(){vec3 transformed=position;vec3 wp=(modelMatrix*vec4(transformed,1.)).xyz;transformed.z+=waves(wp.xz);vWorld=(modelMatrix*vec4(transformed,1.)).xyz;vMirror=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,fragmentShader:`${common}${noiseGLSL}${waveCode}${atmosphereGLSL}
uniform sampler2D uBed,tDiffuse;varying vec3 vWorld;varying vec4 vMirror;
// Wind chop: warped sine trains crossing at odd angles, so no lattice shows in the highlights.
float chop(vec2 p){
 float t=uTime;
 float h=sin(dot(p,vec2(.91,.42))*1.9+t*1.3+sin(dot(p,vec2(-.38,.92))*.9+t*.4)*1.3)*.5;
 h+=sin(dot(p,vec2(-.55,.83))*3.1-t*1.7+sin(dot(p,vec2(.8,.6))*1.4-t*.5)*1.1)*.28;
 h+=sin(dot(p,vec2(.29,-.96))*5.3+t*2.3+sin(dot(p,vec2(.7,.71))*2.3+t*.7)*.9)*.14;
 return h;
}
void main(){
 vec2 p=vWorld.xz;
 vec2 bedUV=(p+90.)/180.;
 float bed=texture2D(uBed,clamp(bedUV,0.,1.)).r*24.-8.;
 float depth=vWorld.y-bed;
 if(depth<-.18)discard;
 vec3 toCamera=cameraPosition-vWorld;
 float dist=length(toCamera);
 vec3 V=toCamera/dist;

 // Swell from the shared wave field, plus drifting ripples that break up its regularity.
 float e=.09;
 float dx=(fineWaves(p+vec2(e,0.))-fineWaves(p-vec2(e,0.)))/(2.*e),dz=(fineWaves(p+vec2(0.,e))-fineWaves(p-vec2(0.,e)))/(2.*e);
 float chop0=chop(p);
 vec2 ripple=vec2(chop(p+vec2(.07,0.))-chop0,chop(p+vec2(0.,.07))-chop0)/.07;
 float calm=1./(1.+dist*.0045);
 dx+=ripple.x*(.050+uWaves*.055)*calm;
 dz+=ripple.y*(.050+uWaves*.055)*calm;
 vec3 N=normalize(vec3(-dx,1.,-dz));
 float facing=max(0.,dot(N,V));
 float fresnel=.035+pow(1.-facing,4.2)*.82;

 // Seabed sand shows through the lagoon, then gives way to clear aquamarine and deep teal.
 float waterDepth=max(0.,depth);
 float reef=fbm(p*.36);
 vec3 sandBed=mix(vec3(.36,.40,.28),vec3(.50,.52,.36),reef);
 vec3 shallows=vec3(.045,.42,.37);
 vec3 blueWater=vec3(.008,.070,.125);
 vec3 col=mix(blueWater,shallows,exp(-waterDepth*.27));
 col=mix(col,sandBed,exp(-waterDepth*1.0)*.74);
 vec2 causticUV=p*2.15+vec2(uTime*.23,-uTime*.17);
 float rippleA=sin(causticUV.x+1.2*sin(causticUV.y*.83));
 float rippleB=sin(causticUV.y-1.35*sin(causticUV.x*.64+uTime*.39));
 float ridge=abs(rippleA+rippleB*.54);
 float caustic=(1.-smoothstep(.025,.19+fwidth(ridge),ridge))*smoothstep(.2,.8,reef);
 float sunUp=smoothstep(-.05,.05,uSun.y)*(1.-uNight);
 col+=vec3(.12,.13,.085)*caustic*exp(-waterDepth*.79)*(1.-uRain*.7);
 // Low sun warms the lit water a little; night and rain take the colour back out.
 col*=mix(vec3(1.),vec3(1.10,1.,.90),sunUp*.6);
 col*=mix(1.,.13,uNight)*mix(1.,.48,uRain);

 vec4 proj=vMirror;
 proj.xy+=N.xz*vec2(.022,.05)*proj.w;
 vec3 reflection=min(texture2DProj(tDiffuse,proj).rgb,vec3(mix(1.15,1.4,uNight)));
 col=mix(col,reflection,fresnel*mix(.56,.86,max(uNight,max(uRain,smoothstep(1.0,5.0,waterDepth)))));

 // Glitter path: tight sparkles inside a broad warm sheen under the sun, silver under the moon.
 float twinkle=.22+.78*smoothstep(.15,.85,.5+.5*sin(p.x*7.3+sin(p.y*5.1+uTime*.8)*2.)*sin(p.y*6.7-sin(p.x*4.3-uTime*.6)*2.));
 float gloss=mix(260.,110.,uWaves);
 vec3 sunTone=mix(vec3(1.,.50,.22),vec3(1.,.78,.50),smoothstep(0.,.22,uSun.y));
 float sunSpec=max(0.,dot(N,normalize(uSun+V+vec3(0.,1e-3,0.))));
 col+=sunTone*(pow(sunSpec,gloss)*twinkle*2.6+pow(sunSpec,26.)*.20)*sunUp*mix(1.,.12,uRain);
 float moonSpec=max(0.,dot(N,normalize(uMoon+V)));
 col+=vec3(.50,.66,.95)*(pow(moonSpec,gloss)*twinkle*1.5+pow(moonSpec,30.)*.07)*uNight*mix(1.,.2,uRain);

 float foamNoise=fbm(p*1.6+vec2(uTime*.12,-uTime*.08));
 float wash=sin(depth*5.-uTime*1.5+foamNoise*3.);
 float foam=(1.-smoothstep(.10,.8,depth))*.50+smoothstep(.79,.95,wash)*(1.-smoothstep(.35,2.3,depth))*.32;
 foam*=smoothstep(.18,.7,foamNoise+.2);
 foam*=smoothstep(-.15,.12,depth);
 float crest=pow(max(0.,N.x+N.z),3.)*uRain*.17;
 foam+=crest;
 vec2 cell=floor(p*1.2);
 float phase=fract(uTime*1.5+hash21(cell));
 vec2 spot=fract(p*1.2)-.5;
 float ring=exp(-pow((length(spot)-phase*.48)*45.,2.))*(1.-phase);
 col+=ring*uRain*.08*mix(vec3(1.),vec3(.2,.3,.4),uNight);
 vec3 foamTone=mix(mix(vec3(.66,.72,.70),vec3(.86,.72,.58),sunUp*.7),vec3(.12,.2,.25),uNight);
 col=mix(col,foamTone,clamp(foam,0.,.86));

 // Far water dissolves into exactly the colour the sky has at that bearing.
 float haze=1.-exp(-pow(dist/400.,2.6));
 haze=max(haze,1.-exp(-dist*.006*uRain));
 col=mix(col,atmosphere(vec3(-V.x,0.,-V.z)),haze);
 col+=vec3(.35,.45,.6)*uFlash*.3;
 gl_FragColor=vec4(col,1.);
}
`});}
export function rainSystem(U,bed){
const count=8500;const geo=new T.InstancedBufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,1,0],3));let offsets=new Float32Array(count*3),seeds=new Float32Array(count);let r=71;const rand=()=>{r=(r*1664525+1013904223)>>>0;return r/4294967296};for(let i=0;i<count;i++){offsets[i*3]=(rand()-.5)*105;offsets[i*3+1]=rand()*42;offsets[i*3+2]=(rand()-.5)*105;seeds[i]=rand();}geo.setAttribute('aOffset',new T.InstancedBufferAttribute(offsets,3));geo.setAttribute('aSeed',new T.InstancedBufferAttribute(seeds,1));geo.instanceCount=0;
const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{...U,uBed:{value:bed},uOrigin:{value:new T.Vector3()},uExtent:{value:105},uTop:{value:44}},vertexShader:`${common}uniform sampler2D uBed;uniform vec3 uOrigin;uniform float uExtent,uTop;attribute vec3 aOffset;attribute float aSeed;varying float vAlpha;void main(){float fall=mod(aOffset.y/42.*uTop-uTime*mix(12.,30.,uRain),uTop);vec3 p=vec3(aOffset.x*uExtent/105.,fall,aOffset.z*uExtent/105.)+uOrigin;p.x+=(uTop-fall)*uWind*.16;p.y+=position.y*mix(.35,1.5,uRain);p.x-=position.y*uWind*.32;float bed=texture2D(uBed,clamp((p.xz+90.)/180.,0.,1.)).r*24.-8.;float floorY=max(0.,bed);vAlpha=step(floorY,p.y)*(.2+aSeed*.55);if(p.x>5.2&&p.x<14.8&&p.z>3.&&p.z<12.&&p.y<6.2)vAlpha=0.;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,fragmentShader:`${common}varying float vAlpha;void main(){vec3 color=mix(vec3(.67,.77,.78),vec3(.38,.51,.66),uNight);color+=uFlash*.4;gl_FragColor=vec4(color,vAlpha*mix(.4,.6,uRain));}`});const lines=new T.LineSegments(geo,material);lines.visible=false;lines.frustumCulled=false;lines.renderOrder=4;return {lines,update(camera){lines.visible=U.uRain.value>.008;geo.instanceCount=Math.floor(count*U.uRain.value);const v=terrain.rainVolume(camera.position.x,camera.position.y,camera.position.z);material.uniforms.uOrigin.value.set(v.x,0,v.z);material.uniforms.uExtent.value=v.extent;material.uniforms.uTop.value=v.top;}};
}

// Thin leaves let low sun through: the far side glows when you look toward the light.
export function applyBacklight(shader,U,tint='vec3(.82,.90,.30)',amount=.42){
 shader.uniforms.uLightDir=U.uLightDir;
 shader.uniforms.uLightColor=U.uLightColor;
 shader.fragmentShader='uniform vec3 uLightDir,uLightColor;\n'+shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 {
  vec3 lightView=normalize((viewMatrix*vec4(uLightDir,0.)).xyz);
  float through=max(0.,dot(-normal,lightView));
  float toward=pow(max(0.,dot(-normalize(vViewPosition),lightView)),3.);
  reflectedLight.directDiffuse+=diffuseColor.rgb*RECIPROCAL_PI*uLightColor*${tint}*through*(.4+1.5*toward)*${amount.toFixed(3)};
 }`);
}
