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
const dayExposure = .74;
const $=id=>document.getElementById(id),canvas=$('world');
const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=dayExposure;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
const camera=new T.PerspectiveCamera(40,innerWidth/innerHeight,.09,1250);camera.position.set(57,43,73);const world=createWorld(renderer),{scene}=world;
const celebration=createCelebration(scene,world.partyDecor);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,3.5,1);controls.enableDamping=true;controls.dampingFactor=.05;controls.minDistance=1.3;controls.maxDistance=145;controls.maxPolarAngle=Math.PI*.475;controls.minPolarAngle=.13;controls.rotateSpeed=.5;controls.panSpeed=.45;controls.zoomSpeed=.65;
const composer = new EffectComposer(renderer);
for (const buffer of [composer.renderTarget1, composer.renderTarget2]) {
 buffer.depthTexture = new T.DepthTexture(buffer.width,buffer.height,T.UnsignedIntType);
}
composer.addPass(new RenderPass(scene,camera));
const bloom = new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.14,.65,1.25);
composer.addPass(bloom);
const grade = new ShaderPass(islandGrade(camera));
composer.addPass(grade);
composer.addPass(new OutputPass());
let nightTransition=null,nightTarget=0,nightMix=0,weatherKey='clear',weatherMix={...terrain.weather.clear},isTour=false,tourStart=0,transition=null,currentPlace='lagoon';
let elapsed=0,previous=performance.now(),frames=0,frameTime=0,frameIndex=0,ready=false,high=true,toastTimer,nextLightning=999,lightningAt=-999;
let partyStage='closed',returnView=null,afterglowSince=-100,afterglowUntil=0,lastPartyAction=-100,partyDoneAt=-100,sceneQuoteTimer=null;
const weatherKeys=['clear','drizzle','rain','storm'],weatherNames={clear:'晴天',drizzle:'小雨',rain:'中雨',storm:'暴雨'},weatherEn={clear:'CLEAR',drizzle:'DRIZZLE',rain:'RAIN',storm:'STORM'};
const places={
 lagoon:{pos:[57,43,73],target:[0,3.5,1],name:'珊瑚海湾',en:'THE LAGOON · ARRIVAL'},
 palms:{pos:[34,9.5,30],target:[5,4.2,12],name:'棕榈沙岸',en:'PALM BEACH · SLOW LIVING'},
 lighthouse:{pos:[-33,22,20],target:[-12,11,-4],name:'灯塔高地',en:'THE LIGHTHOUSE · LOOKOUT'},
 pier:{pos:[31,7.7,49],target:[12,3,25],name:'海风栈桥',en:'THE JETTY · DEPARTURE'},
 pavilion:{pos:[15.5,4.8,15.6],target:[10,3.6,6.6],name:'到凉亭里，等雨停',en:'UNDER THE EAVES · LISTEN TO THE RAIN'},
 afterrain:{pos:[13,10,26],target:[0,5,76],name:'雨停以后，去看海',en:'AFTER THE RAIN · A LITTLE RAINBOW'},
 celebration:{pos:[12.4,4.05,12.4],target:[10,3.1,7.3],name:'这一刻，值得庆祝',en:'HERE’S TO YOU · A LITTLE CELEBRATION'}
};
const sceneQuotes={lagoon:'海浪替我说了第一句欢迎。',palms:'这里的时间，走得比别处慢一点。',lighthouse:'有些光，是专门为一个人亮着的',pier:'再坐一会儿吧，海风还没停。'};
const settingsPanel = document.querySelector('.panel');
const toastElement = $('toast');

function alignNarrativeToast() {
 const panel = settingsPanel.getBoundingClientRect();
 toastElement.style.setProperty('--panel-bottom', `${innerHeight - panel.bottom}px`);
 toastElement.style.setProperty('--panel-left', `${panel.left}px`);
}

function queueSceneQuote(key, delay = 2400) {
 clearTimeout(sceneQuoteTimer);
 if (sceneQuotes[key]) {
  sceneQuoteTimer = setTimeout(() => toast(sceneQuotes[key], 3000, true), delay);
 }
}

function toast(text, duration = 3800, narrative = false) {
 toastElement.textContent = text;
 toastElement.classList.toggle('narrative-toast', narrative);
 if (narrative) alignNarrativeToast();
 toastElement.classList.add('show');
 clearTimeout(toastTimer);
 toastTimer = setTimeout(() => toastElement.classList.remove('show'), duration);
}

function active(id,value){$(id).classList.toggle('active',value);$(id).setAttribute('aria-pressed',String(value));}
function stopTour(){isTour=false;active('tour',false);$('tour').querySelector('span').textContent='开启电影巡游';}
function labelPlace(key){const p=places[key];document.querySelectorAll('[data-place]').forEach(el=>el.classList.toggle('active',el.dataset.place===key));$('place-name').textContent=p.name;$('place-en').textContent=p.en;}
function moveCamera(position,target,duration=2400){transition={start:performance.now(),duration,from:camera.position.clone(),to:new T.Vector3(...position),fromTarget:controls.target.clone(),toTarget:new T.Vector3(...target)};}
function setPlace(key,instant=false){clearTimeout(sceneQuoteTimer);clearTimeout(toastTimer);$('toast').classList.remove('show');currentPlace=key;labelPlace(key);const p=places[key];if(instant){transition=null;camera.position.fromArray(p.pos);controls.target.fromArray(p.target);controls.update();return;}moveCamera(p.pos,p.target);queueSceneQuote(key);}
function setNight(value,announce=true,duration=3800){nightTransition={start:performance.now(),from:nightMix,to:value,duration};nightTarget=value;active('day',!value);active('night',!!value);$('time-label').textContent=value?'22:10':'16:40';$('day-status').textContent=value?'MOONLIT NIGHT':'LATE AFTERNOON';if(announce)toast(value?'夜幕降临 · 灯塔与月色为你引路':'白昼归来 · 让阳光重新落在海上');}
function setWeather(key,narrate=true){const previousWeather=weatherKey;weatherKey=key;for(const k of weatherKeys)active(k,k===key);$('weather-en').textContent=weatherEn[key];$('weather-status').textContent=key==='clear'?'CLEAR SKIES':weatherEn[key];const beat=story.weatherBeat(previousWeather,key,nightTarget);$('weather-copy').textContent=beat.title;if(key==='storm')nextLightning=elapsed+3.5;if(key!=='clear')afterglowUntil=0;if(narrate){stopTour();if(beat.rainbow){afterglowSince=elapsed;afterglowUntil=elapsed+48;}setPlace(beat.place);toast(beat.text, 3800, true);}}
function renderParty(){const open=partyStage!=='closed';$('party-card').hidden=!open;document.body.classList.toggle('celebrating',open);document.body.classList.toggle('celebration-finale',partyStage==='done');if(partyStage!=='done')$('celebration-title').classList.remove('show');active('celebrate',open);$('celebrate').querySelector('span').textContent=open?'正在为今天庆祝':'为今天庆祝';$('occasion-row').hidden=partyStage!=='ready';$('party-restart').hidden=partyStage!=='done';$('party-action').hidden=partyStage==='done';const copy={ready:['今天，值得庆祝','生日、重逢，或一个普通的好日子。','点亮蜡烛'],lit:['把心愿留在烛光里','不用写出来，慢慢许一个愿就好。','许好了'],wish:['现在，轻轻吹灭蜡烛','点一下按钮，或者点一下蛋糕。','吹灭蜡烛'],done:['愿好事，慢慢向你靠近','这一小段灯火与烟花，送给此刻的你。','']};if(open){const [title,text,action]=copy[partyStage];$('party-heading').textContent=title;$('party-copy').textContent=text;$('party-action').textContent=action;}}
function clearPartySky(){setWeather('clear',false);Object.assign(weatherMix,terrain.weather.clear);afterglowUntil=0;nextLightning=999;lightningAt=-999;renderer.shadowMap.needsUpdate=true;if(audio)audio.rainGain.gain.setTargetAtTime(0,audio.ctx.currentTime,.04);$('weather-copy').textContent='雨已停，晴朗夜色里只留下灯火。';}
function beginParty(){if(partyStage!=='closed')return;returnView=story.captureReturn({weather:weatherKey,night:nightTarget,place:currentPlace,position:camera.position.toArray(),target:controls.target.toArray()});stopTour();setNight(1,false,5500);partyStage=story.nextCelebration(partyStage,'OPEN');lastPartyAction=-100;celebration.setOccasion($('occasion').value);celebration.setStage(partyStage,performance.now()/1000);setPlace('celebration');renderParty();}
function endParty({restorePose=true}={}){if(partyStage==='closed')return;const saved=returnView;returnView=null;partyStage=story.nextCelebration(partyStage,'CLOSE');celebration.setStage(partyStage,performance.now()/1000);renderParty();transition=null;if(saved){setWeather(saved.weather,false);setNight(saved.night,false);currentPlace=saved.place;labelPlace(currentPlace);if(restorePose)moveCamera(saved.position,saved.target,1800);}}
function partySound(){if(!soundOn||!audio)return;for(let i=0;i<3;i++){const o=audio.ctx.createOscillator(),g=audio.ctx.createGain(),t=audio.ctx.currentTime+i*.11;o.type='sine';o.frequency.value=[523.25,659.25,783.99][i];g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.6);o.connect(g);g.connect(audio.master);o.start(t);o.stop(t+.65);}}
function actParty(){const actionTime=performance.now()/1000;if(partyStage==='closed'||partyStage==='done'||actionTime-lastPartyAction<.45)return;const event={ready:'LIGHT',lit:'WISH',wish:'BLOW'}[partyStage];if(partyStage==='ready'){clearPartySky();celebration.setOccasion($('occasion').value);}partyStage=story.nextCelebration(partyStage,event);lastPartyAction=actionTime;celebration.setStage(partyStage,performance.now()/1000);renderParty();partySound();if(partyStage==='done'){partyDoneAt=performance.now()/1000;$('occasion-title').textContent=($('occasion').value.trim()||'今天')+'，值得庆祝';moveCamera([43,24,66],[0,11,-9],2600);}}
$('celebrate').onclick=beginParty;$('party-close').onclick=()=>endParty();$('party-action').onclick=actParty;$('party-restart').onclick=()=>{partyStage=story.nextCelebration(partyStage,'RESTART');lastPartyAction=-100;celebration.setStage(partyStage,performance.now()/1000);setPlace('celebration');renderParty();};
$('day').onclick=()=>{endParty({restorePose:false});setNight(0);};$('night').onclick=()=>{endParty({restorePose:false});setNight(1);};for(const k of weatherKeys)$(k).onclick=()=>{endParty({restorePose:false});setWeather(k);};document.querySelectorAll('[data-place]').forEach(el=>el.onclick=()=>{endParty({restorePose:false});stopTour();setPlace(el.dataset.place);});
$('tour').onclick=()=>{if(isTour){stopTour();return;}endParty({restorePose:false});setPlace('lagoon',true);isTour=true;tourStart=elapsed;active('tour',true);$('tour').querySelector('span').textContent='暂停电影巡游';toast('电影巡游已开启 · 拖动画面即可自由观看');};controls.addEventListener('start',()=>{transition=null;stopTour();});
function clean(){document.body.classList.toggle('clean');}$('hide').onclick=clean;$('restore').onclick=clean;$('help-open').onclick=()=>{$('help').classList.add('open');};$('help-close').onclick=()=>{$('help').classList.remove('open');};$('help').onclick=e=>{if(e.target===$('help'))$('help').classList.remove('open');};
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);}window.addEventListener('resize', resize);
new ResizeObserver(alignNarrativeToast).observe(settingsPanel);
window.addEventListener('resize', alignNarrativeToast);
$('quality').onchange=e=>{high=e.target.value==='high';renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.2:.85));composer.setPixelRatio(renderer.getPixelRatio());bloom.enabled=high;world.sun.shadow.mapSize.set(high?2048:1024,high?2048:1024);if(world.sun.shadow.map){world.sun.shadow.map.dispose();world.sun.shadow.map=null;}renderer.shadowMap.needsUpdate=true;resize();toast(high?'精细画质 · 完整海面与光影':'流畅画质 · 适合较慢的设备');};
window.addEventListener('keydown',e=>{if(e.code==='Escape'){if($('help').classList.contains('open'))$('help').classList.remove('open');else if(document.body.classList.contains('clean'))clean();else endParty();return;}if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.repeat||$('help').classList.contains('open'))return;if(e.code==='KeyH')clean();if(e.code==='KeyR'){endParty({restorePose:false});stopTour();setPlace('lagoon');}if(e.code==='KeyN'){endParty({restorePose:false});setNight(1-nightTarget);}if(e.code==='KeyF'){endParty({restorePose:false});setWeather(weatherKeys[(weatherKeys.indexOf(weatherKey)+1)%4]);}});document.addEventListener('visibilitychange',()=>{previous=performance.now();});
const raycaster=new T.Raycaster(),pointer=new T.Vector2();let clickStart=null;canvas.addEventListener('pointerdown',e=>{clickStart={x:e.clientX,y:e.clientY,id:e.pointerId};});canvas.addEventListener('pointercancel',()=>clickStart=null);canvas.addEventListener('pointerup',e=>{if(!clickStart||clickStart.id!==e.pointerId)return;const distance=Math.hypot(e.clientX-clickStart.x,e.clientY-clickStart.y);clickStart=null;if(distance>5||partyStage==='closed'||partyStage==='done'||$('help').classList.contains('open'))return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);if(raycaster.intersectObjects(celebration.hitTargets,true).length)actParty();});
// Procedural stereo surf, wind and rain; audio starts only after a user gesture.
let soundOn=false,audio=null,lastAudioUpdate=0;
function makeAudio(){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return null;const ctx=new AudioContext(),master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);const length=ctx.sampleRate*5,buffer=ctx.createBuffer(2,length,ctx.sampleRate);for(let channel=0;channel<2;channel++){const d=buffer.getChannelData(channel);let brown=0;for(let i=0;i<length;i++){brown=(brown+(Math.random()*2-1)*.025)/1.025;d[i]=brown*4;}}const surf=ctx.createBufferSource();surf.buffer=buffer;surf.loop=true;const surfFilter=ctx.createBiquadFilter();surfFilter.type='lowpass';surfFilter.frequency.value=750;const surfGain=ctx.createGain();surfGain.gain.value=.18;surf.connect(surfFilter);surfFilter.connect(surfGain);surfGain.connect(master);surf.start();const lfo=ctx.createOscillator(),lfoGain=ctx.createGain();lfo.frequency.value=.13;lfoGain.gain.value=.075;lfo.connect(lfoGain);lfoGain.connect(surfGain.gain);lfo.start();const rainBuffer=ctx.createBuffer(2,length,ctx.sampleRate);for(let ch=0;ch<2;ch++){const d=rainBuffer.getChannelData(ch);for(let i=0;i<length;i++)d[i]=Math.random()*2-1;}const rainSource=ctx.createBufferSource();rainSource.buffer=rainBuffer;rainSource.loop=true;const rainFilter=ctx.createBiquadFilter();rainFilter.type='lowpass';rainFilter.frequency.value=4300;const rainGain=ctx.createGain();rainGain.gain.value=0;rainSource.connect(rainFilter);rainFilter.connect(rainGain);rainGain.connect(master);rainSource.start();return {ctx,master,rainGain,surfGain,thunder(){const source=ctx.createBufferSource();source.buffer=rainBuffer;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=100;const g=ctx.createGain(),t=ctx.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.32,t+.25);g.gain.exponentialRampToValueAtTime(.0001,t+3.5);source.connect(f);f.connect(g);g.connect(master);source.start();source.stop(t+3.6);}};}
$('sound').onclick=async()=>{if(!audio)audio=makeAudio();if(!audio){toast('当前浏览器不支持环境音');return;}soundOn=!soundOn;await audio.ctx.resume();audio.master.gain.setTargetAtTime(soundOn?1:0,audio.ctx.currentTime,.5);active('sound',soundOn);$('sound').setAttribute('aria-label',soundOn?'关闭海岛环境音':'开启海岛环境音');toast(soundOn?'海岛环境音已开启 · 海浪、风与雨':'环境音已关闭');};
renderer.info.autoReset=false;
function animate(now){requestAnimationFrame(animate);const raw=(now-previous)/1000,dt=Math.min(raw,.1);previous=now;if(document.hidden)return;elapsed+=dt;if(nightTransition){const p=T.MathUtils.clamp((now-nightTransition.start)/nightTransition.duration,0,1),ease=p*p*p*(p*(p*6-15)+10);nightMix=T.MathUtils.lerp(nightTransition.from,nightTransition.to,ease);if(p===1)nightTransition=null;}const target=terrain.weather[weatherKey];for(const key in weatherMix)weatherMix[key]=T.MathUtils.damp(weatherMix[key],target[key],1.7,dt);
 if(weatherKey==='storm'&&weatherMix.rain>.75&&elapsed>nextLightning){lightningAt=elapsed;nextLightning=elapsed+11+Math.random()*10;if(soundOn&&audio)setTimeout(()=>{if(soundOn&&weatherKey==='storm')audio.thunder();},1100);}const since=elapsed-lightningAt,lightning=weatherKey==='storm'?(Math.exp(-since*16)+(since>.17?Math.exp(-(since-.17)*26)*.45:0)):0;
 if(transition){const t=T.MathUtils.clamp((now-transition.start)/transition.duration,0,1),ease=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.fromTarget,transition.toTarget,ease);if(t>=1)transition=null;}if(isTour){const t=(elapsed-tourStart)*.055,a=.45+Math.sin(t*.65)*.62,r=86+Math.sin(t*.7)*7;camera.position.set(Math.sin(a)*r,39+Math.sin(t*.9)*5,Math.cos(a)*r);controls.target.set(Math.sin(t*.4)*2,3.9,1);}controls.update();
 const afterglow=weatherKey==='clear'&&elapsed<afterglowUntil?T.MathUtils.smoothstep(elapsed-afterglowSince,0,2)*T.MathUtils.smoothstep(afterglowUntil-elapsed,0,8):0;celebration.update(now/1000,afterglow,nightMix);$('celebration-title').classList.toggle('show',partyStage==='done'&&now/1000-partyDoneAt>1.7&&now/1000-partyDoneAt<9.5);world.update(elapsed,nightMix,weatherMix,lightning,camera,{afterglow,celebration:celebration.lightLevel});bloom.strength=T.MathUtils.damp(bloom.strength,.14+celebration.lightLevel*.2,2,dt);renderer.toneMappingExposure=T.MathUtils.lerp(dayExposure,1.25,nightMix);grade.uniforms.uTime.value=elapsed;grade.uniforms.uNight.value=nightMix;
 // The bloom pass blends into the scene buffer without swapping or writing depth.
 const sceneBuffer = composer.readBuffer;
 grade.uniforms.tDepth.value = sceneBuffer.depthTexture;
 grade.uniforms.uPixel.value.set(1/sceneBuffer.width,1/sceneBuffer.height);
 grade.uniforms.uFocus.value = camera.position.distanceTo(controls.target);
 grade.uniforms.uDepthOfField.value = high && partyStage==='closed' ? 1 : 0;
 if(frameIndex++%14===0&&(Math.abs(nightMix-nightTarget)>.008||Math.abs(weatherMix.rain-target.rain)>.008||!ready))renderer.shadowMap.needsUpdate=true;renderer.info.reset();composer.render();if(audio&&elapsed-lastAudioUpdate>.4){audio.rainGain.gain.setTargetAtTime(weatherMix.rain*.12,audio.ctx.currentTime,.4);lastAudioUpdate=elapsed;}
 if(!ready&&elapsed>.18){ready=true;$('loading').style.opacity='0';$('loading').style.pointerEvents='none';setTimeout(()=>$('loading')?.remove(),1300);document.body.dataset.ready='true';queueSceneQuote(currentPlace,1100);}frames++;frameTime+=raw;if(frameTime>1){Object.assign(document.body.dataset,{mode:'orbit',weather:weatherKey,rain:weatherMix.rain.toFixed(2),night:nightMix.toFixed(2),celebration:partyStage,place:currentPlace,afterglow:afterglow.toFixed(2),camera:camera.position.toArray().map(x=>x.toFixed(2)).join(','),target:controls.target.toArray().map(x=>x.toFixed(2)).join(','),fireworks:String(celebration.fireworks.visible),lightLevel:celebration.lightLevel.toFixed(2),houseLightStrength:celebration.houseLights.strength.toFixed(2),fps:String(Math.round(frames/frameTime)),drawcalls:String(renderer.info.render.calls)});frames=0;frameTime=0;}}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('图形资源暂时中断，请刷新页面重新进入海岛。');});setPlace('lagoon',true);requestAnimationFrame(animate);
