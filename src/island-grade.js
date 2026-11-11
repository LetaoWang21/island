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
    // Print-film grade, applied in scene-linear light before tone mapping.
    // Split tone: shadows lean teal, highlights lean amber; night keeps it quieter.
    float l=dot(c,vec3(.2126,.7152,.0722));
    vec3 shadowTint=mix(vec3(.91,1.0,1.07),vec3(.95,1.0,1.05),uNight);
    vec3 highlightTint=mix(vec3(1.055,1.0,.93),vec3(1.02,1.0,.98),uNight);
    c*=mix(shadowTint,highlightTint,smoothstep(.015,.62,l));
    // A soft S-curve pivoted on mid-grey deepens shade without clipping the sky.
    float contrast=mix(1.10,1.05,uNight);
    c=pow(max(c,vec3(0.))/.18,vec3(contrast))*.18;
    // Ease saturation back in the brightest tones so the sun reads as light, not paint.
    l=dot(c,vec3(.2126,.7152,.0722));
    c=mix(vec3(l),c,mix(1.07,.90,smoothstep(.8,3.,l)));
    vec2 p=(vUv-.5)*vec2(1.,.86);
    float falloff=dot(p,p);
    c*=1.-falloff*.52-falloff*falloff*.5;
    float grain=fract(sin(dot(vUv*vec2(1900.,1100.)+fract(uTime*7.31)*vec2(41.,17.),vec2(12.98,78.23)))*43758.54);
    c+=(grain-.5)*.030*sqrt(l+.015);
    gl_FragColor=vec4(max(c,vec3(0.)),1.);
   }
  `
 };
}
