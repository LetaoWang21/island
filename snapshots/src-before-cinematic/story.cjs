function weatherBeat(previous,next,night){
 const cleared=previous!=='clear'&&next==='clear';
 if(next==='storm')return {place:'lighthouse',rainbow:false,title:'风起时，灯塔会亮',text:'先在这里看一会儿海，等风雨慢慢过去。'};
 if(next==='drizzle')return {place:'pier',rainbow:false,title:'到栈桥边，看看细雨',text:'海风带着细雨，栈桥外的海面泛起涟漪。'};
 if(next==='rain')return {place:'pavilion',rainbow:false,title:'到凉亭里，等雨停',text:'灯已亮起，听雨落在屋檐和海面上。'};
 if(cleared&&night<.5)return {place:'afterrain',rainbow:true,title:'雨停了，海上有一道彩虹',text:'云层慢慢散开，把这一小段晴朗留给自己。'};
 if(cleared)return {place:'lagoon',rainbow:false,title:'雨声歇下，灯塔仍亮着',text:'海面安静下来，夜色里还有一盏为你留的灯。'};
 return {place:'lagoon',rainbow:false,title:'海风轻拂，阳光在浅滩上流动。',text:'拖动、缩放，找到你喜欢的海岛角度。'};
}
function nextCelebration(stage,event){if(event==='CLOSE')return 'closed';if(event==='OPEN'&&stage==='closed')return 'ready';if(event==='RESTART'&&stage!=='closed')return 'ready';return ({ready:{LIGHT:'lit'},lit:{WISH:'wish'},wish:{BLOW:'done'}})[stage]?.[event]||stage;}
function captureReturn({weather,night,place,position,target}){return {weather,night,place,position:[...position],target:[...target]};}
module.exports={weatherBeat,nextCelebration,captureReturn};
