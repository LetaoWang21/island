import * as T from 'three';

export function islandGrade(camera) {
 return {
  uniforms:{
   tDiffuse:{value:null},
   tDepth:{value:null},
   uPixel:{value:new T.Vector2()},
   uClip:{value:new T.Vector2(camera.near,camera.far)},
   uFocus:{value:100},
   uDepthOfField:{value:1},
   uTime:{value:0},
   uNight:{value:0}
  },
  vertexShader:`
   varying vec2 vUv;
   void main() {
    vUv=uv;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
   }
  `,
  fragmentShader:`
   varying vec2 vUv;
   uniform sampler2D tDiffuse,tDepth;
   uniform vec2 uPixel,uClip;
   uniform float uFocus,uDepthOfField,uTime,uNight;

   float distanceAt(vec2 uv) {
    float depth=texture2D(tDepth,uv).r;
    return uClip.x*uClip.y/(uClip.y-depth*(uClip.y-uClip.x));
   }

   void main() {
    vec3 c=texture2D(tDiffuse,vUv).rgb;
    if(uDepthOfField>.01) {
     float depth=distanceAt(vUv);
     float relative=abs(depth-uFocus)/max(uFocus,3.);
     float aperture=mix(4.3,2.35,smoothstep(14.,80.,uFocus));
     float radius=uDepthOfField*aperture*smoothstep(.16,.92,relative);
     if(radius>.45) {
      float sum=1.;
      for(int i=0;i<8;i++) {
       float angle=float(i)*2.39996;
       float offset=sqrt((float(i)+1.)/8.);
       vec2 uv=clamp(vUv+vec2(cos(angle),sin(angle))*offset*radius*uPixel,0.,1.);
       float separation=abs(distanceAt(uv)-depth);
       float w=(1.-smoothstep(.8,max(1.8,depth*.16),separation))*.74;
       c+=texture2D(tDiffuse,uv).rgb*w;
       sum+=w;
      }
      c/=sum;
     }
    }
    float l=dot(c,vec3(.2126,.7152,.0722));
    c=mix(vec3(l),c,.94);
    vec3 shadowTint=vec3(.94,1.015,1.035);
    vec3 highlightTint=vec3(1.035,1.012,.97);
    c*=mix(shadowTint,highlightTint,smoothstep(.04,.85,l))*(1.-uNight*.25)+vec3(uNight*.25);
    c*=mix(vec3(1.018,1.005,.978),vec3(.98,1.01,1.025),uNight);
    vec2 p=(vUv-.5)*vec2(.95,.8);
    c*=1.-dot(p,p)*.26;
    float grain=fract(sin(dot(vUv*vec2(1900.,1100.)+fract(uTime*.1),vec2(12.98,78.23)))*43758.54);
    c+=(grain-.5)*.0025;
    gl_FragColor=vec4(c,1.);
   }
  `
 };
}
