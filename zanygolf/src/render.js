import { LEVELS } from './levels.js';
import { cupPosition, obstacles, unlocked, speed, clamp } from './physics.js';
export function project(x,y,z=0){return {x:100+.95*x+.33*y,y:220-.16*x+.69*y-z};}
export function unproject(x,y){const px=x-100,py=y-220,d=.95*.69+.33*.16;return {x:(px*.69-py*.33)/d,y:(py*.95+px*.16)/d};}
export function render(ctx,s,input={},aim=null){
  const l=LEVELS[s.index],t=s.time;
  const poly=(points,fill,stroke)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}};
  const line=(a,b,color,width=1)=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
  const ellipse=(x,y,rx,ry,color)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
  const text=(str,x,y,size,color,font='sans-serif')=>{ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.fillText(str,x,y);};
  function patch(x,y,w,h,color,stroke){poly([project(x,y),project(x+w,y),project(x+w,y+h),project(x,y+h)],color,stroke);}
  function box(x,y,w,h,z,top='#e0cba3',side='#a78a63',front='#bea47c'){
    const a=project(x,y),b=project(x+w,y),c=project(x+w,y+h),d=project(x,y+h),at=project(x,y,z),bt=project(x+w,y,z),ct=project(x+w,y+h,z),dt=project(x,y+h,z);
    poly([b,c,ct,bt],side);poly([c,d,dt,ct],front);poly([at,bt,ct,dt],top);line(at,bt,'#fff3');line(at,dt,'#fff3');
  }
  const gradient=ctx.createLinearGradient(0,0,1200,740);gradient.addColorStop(0,'#294344');gradient.addColorStop(1,'#203535');ctx.fillStyle=gradient;ctx.fillRect(0,0,1200,740);
  // Faint cartographic grid gives the floating diorama a quiet backdrop.
  for(let x=-500;x<1300;x+=65)line({x,y:0},{x:x+480,y:740},'#b8c9a706');
  for(let y=0;y<900;y+=55)line({x:0,y},{x:1200,y:y-180},'#b8c9a706');
  ellipse(615,470,465,170,'#0e252a45');
  // Garden islands, trees and shrubs are original vector artwork.
  function tree(x,y,h,shade){const p=project(x,y);ellipse(p.x+9,p.y+9,24,10,'#122e3055');line(p,{x:p.x,y:p.y-h},'#987d53',5);ellipse(p.x,p.y-h+5,19,25,shade);ellipse(p.x-12,p.y-h+17,16,18,shade);ellipse(p.x+10,p.y-h+20,17,17,shade);ellipse(p.x-5,p.y-h-2,10,13,'#bfd08a22');}
  for(const [x,y,h,c] of [[80,-80,60,'#607c59'],[230,-70,85,'#6f8759'],[710,-65,67,'#8c9a65'],[810,-78,91,'#527458'],[-55,120,70,'#729168'],[-55,380,88,'#5e7e5c'],[935,90,80,'#6c8e69'],[940,350,60,'#7f9862']])tree(x,y,h,c);
  box(-17,-17,914,554,0,'#bda681');
  const A=project(-17,-17),B=project(897,-17),C=project(897,537),D=project(-17,537);
  poly([B,C,{x:C.x,y:C.y+34},{x:B.x,y:B.y+34}],'#736d54');poly([C,D,{x:D.x,y:D.y+34},{x:C.x,y:C.y+34}],'#938362');
  line({x:D.x,y:D.y+32},{x:C.x,y:C.y+32},'#c5ad79',2);
  patch(0,0,880,520,'#7da56c');
  for(let i=0;i<11;i++)patch(i*80,0,80,520,i%2?'#84ad73':'#79a269');
  for(let i=0;i<125;i++){const x=(i*173+43)%870,y=(i*79+17)%510,p=project(x,y);line(p,{x:p.x+3,y:p.y-1},'#e9efac20');}
  if(l.theme==='anthill'){
    const c=project(440,260);for(let i=5;i>0;i--){ctx.beginPath();ctx.ellipse(c.x,c.y,i*39,i*24,-.15,0,Math.PI*2);ctx.strokeStyle='#d9e79544';ctx.lineWidth=2;ctx.stroke();}
  }
  for(const r of l.sand||[]){patch(r.x,r.y,r.w,r.h,'#d1c18a','#ebd9a8');for(let i=0;i<30;i++){const p=project(r.x+(i*31)%r.w,r.y+(i*23)%r.h);ellipse(p.x,p.y,1.5,.8,'#a58f6388');}}
  if(l.slope){const r=l.slope;patch(r.x,r.y,r.w,r.h,'#94b774');for(let i=0;i<5;i++){const p=project(r.x+25+i*24,r.y+65);line(p,{x:p.x+8,y:p.y-5},'#e6eab177');}}
  if(l.carpet){const r=l.carpet;patch(r.x,r.y,r.w,r.h,'#79719c','#e6c9ed');patch(r.x+12,r.y+12,r.w-24,r.h-24,'#827aa5','#c2a6ce');for(let x=r.x+40;x<r.x+r.w;x+=65)for(let y=r.y+40;y<r.y+r.h;y+=65){const p=project(x,y);poly([{x:p.x,y:p.y-5},{x:p.x+7,y:p.y},{x:p.x,y:p.y+5},{x:p.x-7,y:p.y}],'#c8b1d259');}}
  for(const f of l.fans||[]){patch(f.x,f.y,f.w,f.h,input.action?'#91c9ba99':'#6caaa855');for(let i=0;i<7;i++){const y=f.y+((i*65-(input.action?t*120:0))%f.h+f.h)%f.h,p=project(f.x+f.w/2,y);line({x:p.x-6,y:p.y+7},p,'#d2f0dd99',2);line(p,{x:p.x+9,y:p.y+5},'#d2f0dd99',2);}const p=project(f.x+f.w/2,495,22);ellipse(p.x,p.y,25,25,'#c7d8c3');ellipse(p.x,p.y,21,21,'#3b655f');for(let i=0;i<3;i++){const a=t*(input.action?12:1)+i*Math.PI*2/3;line(p,{x:p.x+Math.cos(a)*17,y:p.y+Math.sin(a)*17},'#b5d9ce',8);}ellipse(p.x,p.y,5,5,'#e5ebcf');}
  // Boundary rails.
  box(-10,-10,900,10,10,'#d5c497','#9e8b65','#b9a67d');box(-10,0,10,530,10,'#ddceaa','#9e8b65','#b9a67d');
  // Checkered tee.
  for(let x=0;x<4;x++)for(let y=0;y<4;y++)patch(l.start[0]-20+x*10,l.start[1]-20+y*10,10,10,(x+y)%2?'#b7cf90':'#70945f');
  for(const r of l.moving||[])patch(r.x,r.y,r.w,r.h,'#dcb5b255','#e8ccd077');
  if(l.gate)patch(l.gate.x,l.gate.y,l.gate.w,l.gate.h,'#c4c9a1');
  for(const r of obstacles(s))box(r.x,r.y,r.w,r.h,22,l.theme==='walls'?'#d6a1ad':'#dfd1af',l.theme==='walls'?'#986c80':'#a4977c',l.theme==='walls'?'#b58194':'#bfb08f');
  if(l.portal){for(const [i,[x,y]] of [l.portal,l.exit].entries()){const p=project(x,y);for(let j=3;j>0;j--)ellipse(p.x,p.y,j*11,j*6,unlocked(s)?['#bfffe3','#68dbca55','#4ebba933'][j-1]:'#466c65');text(i?'B':'A',p.x-4,p.y+4,11,'#243e3c');}}
  const cup=cupPosition(s),cp=project(cup.x,cup.y);
  ellipse(cp.x,cp.y,14,8,unlocked(s)?'#d5e8a1':'#829782');ellipse(cp.x,cp.y,9,5,'#183729');
  if(!unlocked(s)){line({x:cp.x-6,y:cp.y-4},{x:cp.x+6,y:cp.y+4},'#ecb084',2);line({x:cp.x+6,y:cp.y-4},{x:cp.x-6,y:cp.y+4},'#ecb084',2);}
  // Flag pole and animated pennant.
  line({x:cp.x+7,y:cp.y},{x:cp.x+7,y:cp.y-67},'#f4e8c9',2.5);
  poly([{x:cp.x+8,y:cp.y-66},{x:cp.x+41,y:cp.y-59+Math.sin(t*2)*2},{x:cp.x+8,y:cp.y-46}],l.color);
  text(String(s.index+1).padStart(2,'0'),cp.x+14,cp.y-53,9,'#31453a');
  for(const [i,[x,y]] of (l.targets||[]).entries()){
    const p=project(x,y);ellipse(p.x,p.y,24,13,'#183d3244');
    box(x-13,y-13,26,26,s.targets[i]?7:27,s.targets[i]?'#b8df95':l.color,'#57695f','#8b9c7f');
    if(!s.targets[i]){ellipse(p.x,p.y-33,3,3,'#fff3c1');text('✦',p.x-5,p.y-42-Math.sin(t*3+i)*4,14,'#f6e2a7');}
  }
  for(const [i,[x,y,r]] of (l.bumpers||[]).entries()){
    const p=project(x,y);ellipse(p.x+5,p.y+5,r+5,r*.6,'#173b3044');ellipse(p.x,p.y,r,r*.65,'#a77f55');ellipse(p.x,p.y-9,r,r*.65,l.theme==='burger'?'#bd5c47':l.color);ellipse(p.x,p.y-12,r*.68,r*.43,l.theme==='burger'?'#e67d55':'#edf0bd');ellipse(p.x,p.y-14,r*.3,r*.2,'#486d5d');
  }
  if(l.theme==='windmill'){
    box(402,150,74,65,76,'#e8d9b0','#a79570','#d1bb8e');
    const p=project(440,185,84);
    poly([{x:p.x-45,y:p.y+4},{x:p.x,y:p.y-52},{x:p.x+45,y:p.y-11}],'#bd694d');
    const hub={x:p.x+5,y:p.y+7};
    for(let i=0;i<4;i++){const a=t*.9+i*Math.PI/2,dx=Math.cos(a),dy=Math.sin(a);poly([{x:hub.x+dx*11-dy*5,y:hub.y+dy*11+dx*5},{x:hub.x+dx*67-dy*10,y:hub.y+dy*67+dx*10},{x:hub.x+dx*67+dy*7,y:hub.y+dy*67-dx*7},{x:hub.x+dx*11+dy*3,y:hub.y+dy*11-dx*3}],'#e9e2bd','#887f60');}
    ellipse(hub.x,hub.y,7,7,'#755c49');
  }
  if(l.theme==='castle')for(const y of [170,320]){box(402,y,72,58,65,'#c8ccbb','#8c9486','#a8b1a0');for(let x=400;x<470;x+=24)box(x,y,14,58,77,'#dce0ce','#a0a999','#bec6b3');const p=project(435,y+58,28);ctx.fillStyle='#65796d';ctx.fillRect(p.x-4,p.y-17,9,18);}
  if(l.theme==='burger'){
    const p=project(cup.x,cup.y,16+s.burger*65);ellipse(p.x+6,p.y+18+s.burger*45,46,24,'#1b3c2f44');
    ellipse(p.x,p.y+9,41,21,'#da9a4b');ellipse(p.x,p.y+2,44,19,'#677e35');ellipse(p.x,p.y-4,42,18,'#714931');ellipse(p.x,p.y-10,44,16,'#e6c25b');ellipse(p.x,p.y-15,42,18,'#cb6944');ellipse(p.x,p.y-22,43,24,'#efbe6b');
    for(let i=0;i<8;i++){const x=p.x-26+(i*19)%54,y=p.y-30+(i*7)%20;line({x,y},{x:x+3,y:y-1},'#fff1bb',2);}
  }
  if(l.theme==='pinball')for(const [x,key,dir] of [[315,'left',1],[565,'right',-1]]){const a=project(x-dir*60,398,10),b=project(x+dir*60,398-(input[key]?65:0),10);line(a,b,'#506258',20);line(a,b,l.color,13);ellipse(a.x,a.y,7,6,'#f0e2b9');}
  if(l.theme==='bonus'){const x=clamp(input.pointer?.x??440,80,800);box(x-65,475,130,12,13,'#e6c978','#aa8c4b','#cfad60');}
  for(let i=0;i<s.trail.length;i++){const v=s.trail[i],p=project(v.x,v.y,5);ellipse(p.x,p.y,2.5,1.7,`rgba(245,238,197,${i/s.trail.length*.3})`);}
  const b=s.ball,bp=project(b.x,b.y,9);
  if(aim && speed(b)<2&&!s.sunk){
    const dx=aim.x-b.x,dy=aim.y-b.y,len=Math.hypot(dx,dy),power=Math.min(len,155),ex=b.x-dx/Math.max(1,len)*power*1.25,ey=b.y-dy/Math.max(1,len)*power*1.25;
    ctx.setLineDash([6,7]);line(project(b.x,b.y,3),project(ex,ey,3),'#fff0ad',2);ctx.setLineDash([]);
    const ep=project(ex,ey,3),angle=Math.atan2(ep.y-bp.y,ep.x-bp.x);line(ep,{x:ep.x-Math.cos(angle-.5)*12,y:ep.y-Math.sin(angle-.5)*12},'#fff0ad',2);line(ep,{x:ep.x-Math.cos(angle+.5)*12,y:ep.y-Math.sin(angle+.5)*12},'#fff0ad',2);
    line(project(b.x,b.y),project(aim.x,aim.y),'#eee0ab55',1);ellipse(project(aim.x,aim.y).x,project(aim.x,aim.y).y,5,5,'#e0d5ab88');
  }
  if(!s.sunk){
    if(speed(b)===0){const p=project(b.x,b.y);ctx.beginPath();ctx.ellipse(p.x,p.y,18,11,-.1,0,Math.PI*2);ctx.strokeStyle='#f4eab788';ctx.lineWidth=1;ctx.stroke();}
    ellipse(bp.x+3,bp.y+9,9,5,'#163e3055');ellipse(bp.x,bp.y,8,8,'#b9c8a3');ellipse(bp.x-1,bp.y-2,6.5,6.5,'#fffbe4');ellipse(bp.x-3,bp.y-4,2,2,'#ffffff');
  }
  box(0,520,890,10,9,'#d6c395','#9e8b65','#b9a67d');box(880,0,10,520,9,'#d6c395','#9e8b65','#b9a67d');
  for(const [x,y] of [[140,590],[700,590],[950,500]]){const p=project(x,y);ellipse(p.x,p.y,25,11,'#1b3434');ellipse(p.x-7,p.y-7,14,14,'#779266');ellipse(p.x+8,p.y-9,16,17,'#8c9e6d');}
  ctx.textAlign='center';text('Z A N Y   G O L F   C L U B',600,688,10,'#aec0a66b');ctx.textAlign='left';
}
