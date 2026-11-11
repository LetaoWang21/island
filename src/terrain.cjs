const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
function height(x,z){const a=Math.atan2(z/.92,x/1.12),r=Math.hypot(x/1.12,z/.92),coast=27+1.9*Math.sin(a*3+.4)+1.3*Math.sin(a*5-1)+.7*Math.cos(a*9),d=coast-r;let h=d<0?Math.max(-7,.12+d*.39):.12+Math.min(1.2,d*.18);const hill=8.6*Math.exp(-((x+6)**2/115+(z+6)**2/90))+3.4*Math.exp(-((x+16)**2/30+(z+5)**2/42));h+=hill*smooth(1.3,10,d);h+=Math.sin(x*.8+Math.sin(z*.45))*Math.sin(z*.7)*.14*smooth(0,6,d);return h;}
function pier(x,z){return x>11.55&&x<14.45&&z>15.5&&z<40.5;}
const pavilion={x:10,z:7,width:6.15,depth:5.2,top:2.12};
function floor(x,z){if(Math.abs(x-pavilion.x)<pavilion.width/2&&Math.abs(z-pavilion.z)<pavilion.depth/2)return pavilion.top;if(Math.abs(x-10)<1.1&&z>=9.6&&z<11.6)return pavilion.top+(height(x,11.6)-pavilion.top)*smooth(9.6,11.6,z);return pier(x,z)?Math.max(1.05,height(x,z)):height(x,z);}
function rainVolume(x,y,z){return {x:x*.35,z:z*.35,bottom:0,top:Math.max(44,y+16),extent:Math.max(105,Math.hypot(x,z)*1.35+62)};}
function walkable(x,z,obstacles=[]){if(Math.hypot(x,z)>49||(!pier(x,z)&&height(x,z)<.18))return false;for(const o of obstacles)if(Math.hypot(x-o.x,z-o.z)<o.r+.23)return false;return true;}
function canMove(x,z,nx,nz,obstacles=[]){return walkable(nx,nz,obstacles)&&Math.abs(floor(nx,nz)-floor(x,z))<.36;}
const weather={clear:{rain:0,clouds:.12,waves:.22,wind:.18,fog:.0018,brightness:1},drizzle:{rain:.19,clouds:.56,waves:.37,wind:.35,fog:.003,brightness:.78},rain:{rain:.52,clouds:.81,waves:.62,wind:.65,fog:.006,brightness:.52},storm:{rain:1,clouds:.99,waves:1,wind:1,fog:.011,brightness:.3}};
module.exports={height,floor,walkable,canMove,weather,pier,smooth,pavilion,rainVolume};
