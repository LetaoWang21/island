import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createWorld} from './world.js';
import {islandGrade} from './island-grade.js';
import terrain from './terrain.cjs';
import story from './story.cjs';
import {createCelebration} from './celebration.js';

// 收礼人的名字。填上后，烟花标题和蛋糕旁的小卡片会写成「名字，生日快乐」；留空则只写「生日快乐」。
const giftName = '';
const wishLine = giftName.trim() ? `${giftName.trim()}，生日快乐` : '生日快乐';

const dayExposure = .74, nightExposure = 1.2, bloomBase = .2;
const $=id=>document.getElementById(id),canvas=$('world');
const {lerp,damp,clamp,smoothstep}=T.MathUtils;

const renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
let renderScale=1.35;
renderer.setPixelRatio(Math.min(devicePixelRatio,renderScale));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=dayExposure;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
const camera=new T.PerspectiveCamera(35,innerWidth/innerHeight,.09,1250);
const world=createWorld(renderer),{scene}=world;
const celebration=createCelebration(scene,world.partyDecor);
celebration.setOccasion(wishLine);$('wish-title').textContent=wishLine;
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.05;controls.minDistance=1.3;controls.maxDistance=170;controls.maxPolarAngle=Math.PI*.6;controls.minPolarAngle=.13;controls.rotateSpeed=.5;controls.panSpeed=.45;controls.zoomSpeed=.65;

// The scene is drawn into multisampled HDR buffers so palm fronds and rigging stay clean.
const composer = new EffectComposer(renderer);
const sceneBuffers = [composer.renderTarget1, composer.renderTarget2];
for (const buffer of sceneBuffers) {
 buffer.depthTexture = new T.DepthTexture(buffer.width,buffer.height,T.UnsignedIntType);
 buffer.samples = 4;
}
composer.addPass(new RenderPass(scene,camera));
const bloom = new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),bloomBase,.72,1.1);
composer.addPass(bloom);
const grade = new ShaderPass(islandGrade(camera));
composer.addPass(grade);
composer.addPass(new OutputPass());

let nightTransition=null,nightTarget=0,nightMix=0,weatherKey='clear',weatherMix={...terrain.weather.clear},transition=null,currentPlace='lagoon';
let elapsed=0,previous=performance.now(),frames=0,frameTime=0,frameIndex=0,ready=false,high=true,slowSeconds=0,quickestFrame=1,viewShift=0,toastTimer,nextLightning=999,lightningAt=-999;
let partyStage='closed',returnView=null,afterglowSince=-100,afterglowUntil=0,lastPartyAction=-100,partyDoneAt=-100,sceneQuoteTimer=null,candleMix=0;
const weatherKeys=['clear','drizzle','rain','storm'];
const places={
 lagoon:{pos:[54.6,14.5,70],target:[0,5.5,1],name:'珊瑚海湾',en:'THE LAGOON · ARRIVAL'},
 palms:{pos:[34,9.5,30],target:[5,4.2,12],name:'棕榈沙岸',en:'PALM BEACH · SLOW LIVING'},
 lighthouse:{pos:[-41,6.5,25],target:[-14,12.5,-5],name:'灯塔高地',en:'THE LIGHTHOUSE · LOOKOUT'},
 pier:{pos:[31,7.7,49],target:[12,3,25],name:'海风栈桥',en:'THE JETTY · DEPARTURE'},
 pavilion:{pos:[15.5,4.8,15.6],target:[10,3.6,6.6],name:'到凉亭里，等雨停',en:'UNDER THE EAVES · LISTEN TO THE RAIN'},
 afterrain:{pos:[13,10,26],target:[0,5,76],name:'雨停以后，去看海',en:'AFTER THE RAIN · A LITTLE RAINBOW'},
 celebration:{pos:[11.9,3.85,11.3],target:[10,3.05,7.3],name:'这一刻，为你庆祝',en:'HAPPY BIRTHDAY'}
};
const sceneQuotes={lagoon:'海浪替我说了第一句欢迎。',palms:'这里的时间，走得比别处慢一点。',lighthouse:'有些光，是专门为一个人亮着的。',pier:'再坐一会儿吧，海风还没停。'};

// A narrow frame gets a wider lens, and the arrival view backs off until the whole island fits.
function fitLens(){const aspect=innerWidth/innerHeight;camera.aspect=aspect;camera.fov=lerp(52,35,smoothstep(aspect,.5,1.25));camera.updateProjectionMatrix();}
function placePose(key){
 const p=places[key],position=new T.Vector3(...p.pos),target=new T.Vector3(...p.target);
 if(key==='lagoon'){
  // Tall frames are narrow: swing a few degrees toward the sun so it stays in shot.
  const half=Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect),offset=position.clone().sub(target);
  offset.applyAxisAngle(new T.Vector3(0,1,0),lerp(.14,0,smoothstep(camera.aspect,.5,1.1)));
  position.copy(target).addScaledVector(offset,Math.max(1,31/Math.tan(half)/offset.length()));
 }
 return {position,target};
}

function toast(text, duration = 3800) {
 $('toast').textContent = text;
 $('toast').classList.add('show');
 clearTimeout(toastTimer);
 toastTimer = setTimeout(() => $('toast').classList.remove('show'), duration);
}
function queueSceneQuote(key, delay = 2600) {
 clearTimeout(sceneQuoteTimer);
 if (sceneQuotes[key]) sceneQuoteTimer = setTimeout(() => toast(sceneQuotes[key], 4200), delay);
}
function settle(){document.body.classList.add('arrived','settled');}

function active(id,value){$(id).classList.toggle('active',value);$(id).setAttribute('aria-pressed',String(value));}
function labelPlace(key){const p=places[key];document.querySelectorAll('[data-place]').forEach(el=>el.classList.toggle('active',el.dataset.place===key));$('place-name').textContent=p.name;$('place-en').textContent=p.en;}
const easeInOut=t=>t*t*(3-2*t),easeOut=t=>1-Math.pow(1-t,3);
function moveCamera(position,target,duration=2600,ease=easeInOut){transition={start:performance.now(),duration,ease,from:camera.position.clone(),to:position.isVector3?position:new T.Vector3(...position),fromTarget:controls.target.clone(),toTarget:target.isVector3?target:new T.Vector3(...target)};}
function setPlace(key,instant=false){clearTimeout(sceneQuoteTimer);clearTimeout(toastTimer);$('toast').classList.remove('show');currentPlace=key;labelPlace(key);const pose=placePose(key);if(instant){transition=null;camera.position.copy(pose.position);controls.target.copy(pose.target);controls.update();return;}moveCamera(pose.position,pose.target);queueSceneQuote(key);}
function setNight(value,announce=true,duration=5200){nightTransition={start:performance.now(),from:nightMix,to:value,duration};nightTarget=value;active('day',!value);active('night',!!value);$('time-label').textContent=value?'22:10':'17:48';if(announce)toast(value?'夜幕降临，灯塔与月色为你引路。':'回到黄昏，落日还留在海面上。');}
function setWeather(key,narrate=true){const previousWeather=weatherKey;weatherKey=key;for(const k of weatherKeys)active(k,k===key);const beat=story.weatherBeat(previousWeather,key,nightTarget);$('weather-copy').textContent=beat.title;if(key==='storm')nextLightning=elapsed+3.5;if(key!=='clear')afterglowUntil=0;if(narrate){stopTour();if(beat.rainbow){afterglowSince=elapsed;afterglowUntil=elapsed+48;}setPlace(beat.place);toast(beat.text,4200);}}

// The tour is cut like a short film: five slow moves, each crossing through black into the next.
const shots=[
 {from:[[86,9,108],[0,7,0]],to:[[58,13,74],[0,6,1]],seconds:12},
 {from:[[5,2.6,45],[13,2.6,24]],to:[[9,3.6,33],[11,3.6,9]],seconds:11},
 {from:[[-45,4,19],[-15,11,-5]],to:[[-38,11.5,27],[-15,14,-5]],seconds:11},
 {from:[[31,4.4,21],[9,4,8]],to:[[23,5.4,30],[8,4.2,8]],seconds:11},
 {from:[[-30,34,84],[0,4,0]],to:[[8,30,92],[0,4,2]],seconds:12}
].map((s,i)=>({seconds:s.seconds,line:[sceneQuotes.lagoon,sceneQuotes.pier,sceneQuotes.lighthouse,sceneQuotes.palms,'这里一切都属于你。'][i],from:s.from.map(v=>new T.Vector3(...v)),to:s.to.map(v=>new T.Vector3(...v))}));
let isTour=false,shotIndex=0,shotStart=0,spokenShot=-1;
function startTour(){endParty({restorePose:false});clearTimeout(sceneQuoteTimer);clearTimeout(toastTimer);$('toast').classList.remove('show');transition=null;settle();isTour=true;shotIndex=0;spokenShot=-1;shotStart=elapsed+.8;$('fade').classList.add('on');document.body.classList.add('touring');active('tour',true);$('tour').querySelector('span').textContent='结束巡游';}
function stopTour(){if(!isTour)return;isTour=false;clearTimeout(toastTimer);$('toast').classList.remove('show');$('fade').classList.remove('on');document.body.classList.remove('touring');active('tour',false);$('tour').querySelector('span').textContent='电影巡游';}
function playTour(){
 const wait=shotStart-elapsed;if(wait>0)return;
 let shot=shots[shotIndex],progress=(elapsed-shotStart)/shot.seconds;
 if(progress>=1){shotIndex=(shotIndex+1)%shots.length;shotStart=elapsed;shot=shots[shotIndex];progress=0;spokenShot=-1;}
 if(spokenShot!==shotIndex&&progress*shot.seconds>2.2){spokenShot=shotIndex;toast(shot.line,5200);}
 camera.position.lerpVectors(shot.from[0],shot.to[0],progress);controls.target.lerpVectors(shot.from[1],shot.to[1],progress);
 $('fade').classList.toggle('on',(1-progress)*shot.seconds<.78);
}

const partyCopy={ready:['生日快乐','蛋糕已经备好了，先把蜡烛点上。','点亮蜡烛'],lit:['许个愿吧','不用说出来，在心里慢慢许。','许好了'],wish:['轻轻吹灭蜡烛','点一下按钮，或者点一下蛋糕。','吹灭蜡烛'],done:['愿好事，慢慢向你靠近','这一小段灯火与烟花，送给此刻的你。','']};
function renderParty(){const open=partyStage!=='closed';$('party-card').hidden=!open;document.body.classList.toggle('celebrating',open);document.body.classList.toggle('celebration-finale',partyStage==='done');if(partyStage!=='done')$('celebration-title').classList.remove('show');active('celebrate',open);$('party-restart').hidden=partyStage!=='done';$('party-action').hidden=partyStage==='done';if(open){const [title,text,action]=partyCopy[partyStage];$('party-heading').textContent=title;$('party-copy').textContent=text;$('party-action').textContent=action;}}
function clearPartySky(){setWeather('clear',false);Object.assign(weatherMix,terrain.weather.clear);afterglowUntil=0;nextLightning=999;lightningAt=-999;renderer.shadowMap.needsUpdate=true;if(audio)audio.rainGain.gain.setTargetAtTime(0,audio.ctx.currentTime,.04);$('weather-copy').textContent='雨已停，晴朗夜色里只留下灯火。';}
function beginParty(){if(partyStage!=='closed')return;returnView=story.captureReturn({weather:weatherKey,night:nightTarget,place:currentPlace,position:camera.position.toArray(),target:controls.target.toArray()});stopTour();settle();setNight(1,false,5500);partyStage=story.nextCelebration(partyStage,'OPEN');lastPartyAction=-100;celebration.setStage(partyStage,performance.now()/1000);setPlace('celebration');renderParty();}
function endParty({restorePose=true}={}){if(partyStage==='closed')return;const saved=returnView;returnView=null;partyStage=story.nextCelebration(partyStage,'CLOSE');celebration.setStage(partyStage,performance.now()/1000);renderParty();transition=null;if(saved){setWeather(saved.weather,false);setNight(saved.night,false);currentPlace=saved.place;labelPlace(currentPlace);if(restorePose)moveCamera(saved.position,saved.target,1800);}}
function partySound(){if(!soundOn||!audio)return;for(let i=0;i<3;i++){const o=audio.ctx.createOscillator(),g=audio.ctx.createGain(),t=audio.ctx.currentTime+i*.11;o.type='sine';o.frequency.value=[523.25,659.25,783.99][i];g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.6);o.connect(g);g.connect(audio.master);o.start(t);o.stop(t+.65);}}
function actParty(){const actionTime=performance.now()/1000;if(partyStage==='closed'||partyStage==='done'||actionTime-lastPartyAction<.45)return;const event={ready:'LIGHT',lit:'WISH',wish:'BLOW'}[partyStage];if(partyStage==='ready')clearPartySky();partyStage=story.nextCelebration(partyStage,event);lastPartyAction=actionTime;celebration.setStage(partyStage,performance.now()/1000);renderParty();partySound();if(partyStage==='done'){partyDoneAt=performance.now()/1000;moveCamera([51,8.5,67],[0,15.5,-9],4200);}}
$('celebrate').onclick=beginParty;$('party-close').onclick=()=>endParty();$('party-action').onclick=actParty;$('party-restart').onclick=()=>{partyStage=story.nextCelebration(partyStage,'RESTART');lastPartyAction=-100;celebration.setStage(partyStage,performance.now()/1000);setPlace('celebration');renderParty();};
$('day').onclick=()=>{endParty({restorePose:false});setNight(0);};$('night').onclick=()=>{endParty({restorePose:false});setNight(1);};for(const k of weatherKeys)$(k).onclick=()=>{endParty({restorePose:false});setWeather(k);};document.querySelectorAll('[data-place]').forEach(el=>el.onclick=()=>{endParty({restorePose:false});stopTour();settle();setPlace(el.dataset.place);});
$('tour').onclick=()=>{if(isTour)stopTour();else startTour();};controls.addEventListener('start',()=>{transition=null;stopTour();settle();});
function clean(){document.body.classList.toggle('clean');}$('hide').onclick=clean;$('restore').onclick=clean;$('help-open').onclick=()=>{$('help').classList.add('open');};$('help-close').onclick=()=>{$('help').classList.remove('open');};$('help').onclick=e=>{if(e.target===$('help'))$('help').classList.remove('open');};

function resize(){viewShift=0;camera.clearViewOffset();fitLens();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);}window.addEventListener('resize', resize);
function applyQuality(){const ratio=Math.min(devicePixelRatio,high?renderScale:.85);for(const buffer of sceneBuffers){buffer.samples=high?4:0;buffer.dispose();}renderer.setPixelRatio(ratio);composer.setPixelRatio(ratio);bloom.enabled=high;world.sun.shadow.mapSize.set(high?2048:1024,high?2048:1024);if(world.sun.shadow.map){world.sun.shadow.map.dispose();world.sun.shadow.map=null;}renderer.shadowMap.needsUpdate=true;resize();}
$('quality').onchange=e=>{high=e.target.value==='high';applyQuality();toast(high?'精细画质，完整的海面与光影。':'流畅画质，适合较慢的设备。');};
window.addEventListener('keydown',e=>{if(e.code==='Escape'){if($('help').classList.contains('open'))$('help').classList.remove('open');else if(isTour)stopTour();else if(document.body.classList.contains('clean'))clean();else endParty();return;}if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.repeat||$('help').classList.contains('open'))return;if(e.code==='KeyH')clean();if(e.code==='KeyR'){endParty({restorePose:false});stopTour();setPlace('lagoon');}if(e.code==='KeyN'){endParty({restorePose:false});setNight(1-nightTarget);}if(e.code==='KeyF'){endParty({restorePose:false});setWeather(weatherKeys[(weatherKeys.indexOf(weatherKey)+1)%4]);}});document.addEventListener('visibilitychange',()=>{previous=performance.now();});
const raycaster=new T.Raycaster(),pointer=new T.Vector2();let clickStart=null;canvas.addEventListener('pointerdown',e=>{clickStart={x:e.clientX,y:e.clientY,id:e.pointerId};});canvas.addEventListener('pointercancel',()=>clickStart=null);canvas.addEventListener('pointerup',e=>{if(!clickStart||clickStart.id!==e.pointerId)return;const distance=Math.hypot(e.clientX-clickStart.x,e.clientY-clickStart.y);clickStart=null;if(distance>5||partyStage==='closed'||partyStage==='done'||$('help').classList.contains('open'))return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);if(raycaster.intersectObjects(celebration.hitTargets,true).length)actParty();});
// Procedural stereo surf, wind and rain; audio starts only after a user gesture.
let soundOn=false,audio=null,lastAudioUpdate=0;
function makeAudio(){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return null;const ctx=new AudioContext(),master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);const length=ctx.sampleRate*5,buffer=ctx.createBuffer(2,length,ctx.sampleRate);for(let channel=0;channel<2;channel++){const d=buffer.getChannelData(channel);let brown=0;for(let i=0;i<length;i++){brown=(brown+(Math.random()*2-1)*.025)/1.025;d[i]=brown*4;}}const surf=ctx.createBufferSource();surf.buffer=buffer;surf.loop=true;const surfFilter=ctx.createBiquadFilter();surfFilter.type='lowpass';surfFilter.frequency.value=750;const surfGain=ctx.createGain();surfGain.gain.value=.18;surf.connect(surfFilter);surfFilter.connect(surfGain);surfGain.connect(master);surf.start();const lfo=ctx.createOscillator(),lfoGain=ctx.createGain();lfo.frequency.value=.13;lfoGain.gain.value=.075;lfo.connect(lfoGain);lfoGain.connect(surfGain.gain);lfo.start();const rainBuffer=ctx.createBuffer(2,length,ctx.sampleRate);for(let ch=0;ch<2;ch++){const d=rainBuffer.getChannelData(ch);for(let i=0;i<length;i++)d[i]=Math.random()*2-1;}const rainSource=ctx.createBufferSource();rainSource.buffer=rainBuffer;rainSource.loop=true;const rainFilter=ctx.createBiquadFilter();rainFilter.type='lowpass';rainFilter.frequency.value=4300;const rainGain=ctx.createGain();rainGain.gain.value=0;rainSource.connect(rainFilter);rainFilter.connect(rainGain);rainGain.connect(master);rainSource.start();return {ctx,master,rainGain,surfGain,thunder(){const source=ctx.createBufferSource();source.buffer=rainBuffer;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=100;const g=ctx.createGain(),t=ctx.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.32,t+.25);g.gain.exponentialRampToValueAtTime(.0001,t+3.5);source.connect(f);f.connect(g);g.connect(master);source.start();source.stop(t+3.6);}};}
$('sound').onclick=async()=>{if(!audio)audio=makeAudio();if(!audio){toast('当前浏览器不支持环境音。');return;}soundOn=!soundOn;await audio.ctx.resume();audio.master.gain.setTargetAtTime(soundOn?1:0,audio.ctx.currentTime,.5);active('sound',soundOn);$('sound').setAttribute('aria-label',soundOn?'关闭海岛环境音':'开启海岛环境音');toast(soundOn?'环境音已开启：海浪、风与雨。':'环境音已关闭。');};
renderer.info.autoReset=false;

// Arrival: the cover dissolves while the camera is still drifting in from open water.
function arrive(){
 ready=true;document.body.dataset.ready='true';
 const loading=$('loading');loading.style.opacity='0';loading.style.pointerEvents='none';setTimeout(()=>loading.remove(),2000);
 const pose=placePose('lagoon');moveCamera(pose.position,pose.target,9000,easeOut);
 setTimeout(()=>document.body.classList.add('arrived'),3000);
 setTimeout(settle,10500);
 queueSceneQuote(currentPlace,5600);
}
function animate(now){requestAnimationFrame(animate);const raw=(now-previous)/1000,dt=Math.min(raw,.1);previous=now;if(document.hidden)return;elapsed+=dt;
 if(nightTransition){const p=clamp((now-nightTransition.start)/nightTransition.duration,0,1),ease=p*p*p*(p*(p*6-15)+10);nightMix=lerp(nightTransition.from,nightTransition.to,ease);if(p===1)nightTransition=null;}
 const target=terrain.weather[weatherKey];for(const key in weatherMix)weatherMix[key]=damp(weatherMix[key],target[key],1.7,dt);
 if(weatherKey==='storm'&&weatherMix.rain>.75&&elapsed>nextLightning){lightningAt=elapsed;nextLightning=elapsed+11+Math.random()*10;if(soundOn&&audio)setTimeout(()=>{if(soundOn&&weatherKey==='storm')audio.thunder();},1100);}const since=elapsed-lightningAt,lightning=weatherKey==='storm'?(Math.exp(-since*16)+(since>.17?Math.exp(-(since-.17)*26)*.45:0)):0;
 if(transition){const t=clamp((now-transition.start)/transition.duration,0,1),ease=transition.ease(t);camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.fromTarget,transition.toTarget,ease);if(t>=1)transition=null;}
 if(isTour)playTour();
 // While the settings panel is on screen the picture is composed slightly left of it.
 const framed=innerWidth>1000&&!isTour&&!document.body.classList.contains('clean')&&!document.body.classList.contains('fireworks')?innerWidth*.062:0;
 if(Math.abs(framed-viewShift)>.25){viewShift=ready?damp(viewShift,framed,1.6,dt):framed;camera.setViewOffset(innerWidth,innerHeight,viewShift,0,innerWidth,innerHeight);}
 controls.update();
 // The camera may look up at the lighthouse from below, but never sinks under the sea or the ground.
 const ground=Math.max(0,terrain.floor(camera.position.x,camera.position.z))+1.15;
 if(camera.position.y<ground){camera.position.y=ground;camera.lookAt(controls.target);}
 const afterglow=weatherKey==='clear'&&elapsed<afterglowUntil?smoothstep(elapsed-afterglowSince,0,2)*smoothstep(afterglowUntil-elapsed,0,8):0;celebration.update(now/1000,afterglow,nightMix);
 const sinceFinale=now/1000-partyDoneAt;$('celebration-title').classList.toggle('show',partyStage==='done'&&sinceFinale>2.4&&sinceFinale<16);document.body.classList.toggle('fireworks',partyStage==='done'&&sinceFinale<27.5);
 const candlesLit=partyStage==='lit'||partyStage==='wish';candleMix=damp(candleMix,candlesLit?1:0,2.2,dt);
 world.update(elapsed,nightMix,weatherMix,lightning,camera,{afterglow,celebration:celebration.lightLevel,candles:candleMix});
 bloom.strength=damp(bloom.strength,bloomBase+nightMix*.06+(partyStage==='done'?.17:0),2,dt);
 renderer.toneMappingExposure=lerp(dayExposure,nightExposure,nightMix)*lerp(1,.86,candleMix);
 grade.uniforms.uTime.value=elapsed;grade.uniforms.uNight.value=nightMix;
 // The bloom pass blends into the scene buffer without swapping or writing depth.
 const sceneBuffer = composer.readBuffer;
 grade.uniforms.tDepth.value = sceneBuffer.depthTexture;
 grade.uniforms.uPixel.value.set(1/sceneBuffer.width,1/sceneBuffer.height);
 grade.uniforms.uFocus.value = camera.position.distanceTo(controls.target);
 // Fireworks are drawn without depth, so the finale stays sharp; the cake close-up gets a shallow focus.
 grade.uniforms.uDepthOfField.value = !high || partyStage==='done' ? 0 : partyStage==='closed' ? 1 : 1.5;
 if(frameIndex++%14===0&&(Math.abs(nightMix-nightTarget)>.008||Math.abs(weatherMix.rain-target.rain)>.008||!ready))renderer.shadowMap.needsUpdate=true;renderer.info.reset();composer.render();if(audio&&elapsed-lastAudioUpdate>.4){audio.rainGain.gain.setTargetAtTime(weatherMix.rain*.12,audio.ctx.currentTime,.4);lastAudioUpdate=elapsed;}
 if(!ready&&elapsed>1.5)arrive();
 frames++;frameTime+=raw;quickestFrame=Math.min(quickestFrame,raw);if(frameTime>1){const fps=frames/frameTime;
  // If a device cannot hold the full-quality frame, give back resolution before smoothness.
  // Judged by the quickest frame each second, so a throttled background tab is not mistaken for a slow GPU.
  if(ready&&high&&elapsed>6){slowSeconds=quickestFrame>.037?slowSeconds+1:0;if(slowSeconds>=3&&renderScale>.9){renderScale=Math.max(.9,renderScale-.25);slowSeconds=0;applyQuality();}}quickestFrame=1;
  Object.assign(document.body.dataset,{mode:isTour?'tour':'orbit',weather:weatherKey,rain:weatherMix.rain.toFixed(2),night:nightMix.toFixed(2),celebration:partyStage,place:currentPlace,afterglow:afterglow.toFixed(2),camera:camera.position.toArray().map(x=>x.toFixed(2)).join(','),target:controls.target.toArray().map(x=>x.toFixed(2)).join(','),fireworks:String(celebration.fireworks.visible),lightLevel:celebration.lightLevel.toFixed(2),houseLightStrength:celebration.houseLights.strength.toFixed(2),fps:String(Math.round(fps)),drawcalls:String(renderer.info.render.calls)});frames=0;frameTime=0;}
}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('图形资源暂时中断，请刷新页面重新进入海岛。');});

// Open on the island from farther out and lower down; arrive() eases the camera in from here.
fitLens();labelPlace('lagoon');
{const pose=placePose('lagoon'),offset=pose.position.clone().sub(pose.target);camera.position.copy(pose.target).addScaledVector(offset,1.42);camera.position.y-=4.5;controls.target.copy(pose.target).add(new T.Vector3(0,1.5,0));controls.update();}
requestAnimationFrame(animate);
