import { LEVELS, TOTAL_PAR } from './levels.js';
import { courseCollision } from './terrain.js';
export const WIDTH = 880, HEIGHT = 520, RADIUS = 7, STEP = 1 / 120;
export const inside = (b, r) => b.x >= r.x && b.x <= r.x + r.w && b.y >= r.y && b.y <= r.y + r.h;
export const speed = b => Math.hypot(b.vx, b.vy);
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function createGame(index = 0, practice = false) {
  const l = LEVELS[index];
  return { version: 1, index, practice, ball: {x:l.start[0], y:l.start[1], vx:0, vy:0}, strokes:0, scores:[], time:0,
    targets: (l.targets || []).map(() => false), sunk:false, paused:false, complete:false, burger:0, portalCooldown:0, particles:[], trail:[], events:[] };
}
export function cupPosition(s) {
  const l = LEVELS[s.index];
  return l.theme === 'anthill' ? {x:440 + Math.cos(s.time * .6) * 70, y:250 + Math.sin(s.time * .6) * 45} : {x:l.cup[0], y:l.cup[1]};
}
export function unlocked(s) { return s.targets.every(Boolean) && (LEVELS[s.index].theme !== 'burger' || s.burger > .65); }
export function obstacles(s) {
  const l = LEVELS[s.index], r = [...l.walls];
  if(l.gate && Math.sin(s.time * (l.theme === 'castle' ? 1.5 : 2.2)) < .15) r.push(l.gate);
  for(const [i, w] of (l.moving || []).entries()) if(Math.sin(s.time * 1.8 - i * 1.6) > -.25) r.push(w);
  return r;
}
export function shoot(s, dx, dy) {
  if(s.sunk || s.paused || s.complete || speed(s.ball) > 2) return false;
  const length = Math.hypot(dx, dy);
  if(length < 4) return false;
  const power = Math.min(length, 155) * 4.2;
  s.ball.vx = dx / length * power; s.ball.vy = dy / length * power; s.strokes++;
  s.events.push('shot'); return true;
}
function collideRect(b, r, restitution = .78) {
  const nx = clamp(b.x, r.x, r.x+r.w), ny = clamp(b.y, r.y, r.y+r.h), dx=b.x-nx, dy=b.y-ny;
  const distance=Math.hypot(dx,dy);
  if(distance >= RADIUS) return false;
  let ux, uy, penetration;
  if(distance > .001) { ux=dx/distance; uy=dy/distance; penetration=RADIUS-distance; }
  else {
    const sides=[{d:b.x-r.x,x:-1,y:0},{d:r.x+r.w-b.x,x:1,y:0},{d:b.y-r.y,x:0,y:-1},{d:r.y+r.h-b.y,x:0,y:1}].sort((a,c)=>a.d-c.d);
    ux=sides[0].x; uy=sides[0].y; penetration=sides[0].d+RADIUS;
  }
  b.x+=ux*(penetration+.01); b.y+=uy*(penetration+.01);
  const dot=b.vx*ux+b.vy*uy;
  if(dot<0){b.vx-=(1+restitution)*dot*ux; b.vy-=(1+restitution)*dot*uy;}
  return dot < -12;
}
export function step(s, dt = STEP, input = {}) {
  if(s.paused || s.sunk || s.complete) return;
  dt=clamp(dt, 0, 1/60); s.time+=dt;
  const l=LEVELS[s.index], b=s.ball, moving=speed(b)>0;
  s.burger=clamp(s.burger + (input.action ? 2.9 : -1.8)*dt,0,1);
  s.portalCooldown=Math.max(0,s.portalCooldown-dt);
  if(l.theme==='carpet' && moving && input.action && input.pointer && inside(b,l.carpet)){
    const dx=input.pointer.x-b.x, dy=input.pointer.y-b.y, d=Math.hypot(dx,dy);
    if(d>5){ b.vx+=dx/Math.max(d,80)*420*dt; b.vy+=dy/Math.max(d,80)*420*dt; }
  }
  if(l.fans && moving && input.action) for(const fan of l.fans) if(inside(b,fan)) b.vy-=430*dt;
  if(l.slope && moving && inside(b,l.slope)) b.vx-=130*dt;
  if(l.theme==='anthill' && moving){
    const dx=b.x-440,dy=b.y-260,d=Math.hypot(dx,dy);
    if(d>25 && d<210){b.vx+=dx/d*90*dt;b.vy+=dy/d*90*dt;}
  }
  const v=speed(b); if(v>800){b.vx*=800/v;b.vy*=800/v;}
  b.x+=b.vx*dt; b.y+=b.vy*dt;
  let hit=false;
  if(b.x<RADIUS){b.x=RADIUS;b.vx=Math.abs(b.vx)*.78;hit=true;}
  if(b.x>WIDTH-RADIUS){b.x=WIDTH-RADIUS;b.vx=-Math.abs(b.vx)*.78;hit=true;}
  if(b.y<RADIUS){b.y=RADIUS;b.vy=Math.abs(b.vy)*.78;hit=true;}
  if(b.y>HEIGHT-RADIUS){b.y=HEIGHT-RADIUS;b.vy=-Math.abs(b.vy)*.78;hit=true;}
  hit=courseCollision(s.index,b,RADIUS)||hit;
  for(const r of obstacles(s)) hit=collideRect(b,r)||hit;
  for(const [x,y,r] of l.bumpers||[]){
    let dx=b.x-x,dy=b.y-y,d=Math.hypot(dx,dy);
    if(d<r+RADIUS){
      if(d<.01){dx=1;dy=0;d=1;}
      b.x=x+dx/d*(r+RADIUS+.1);b.y=y+dy/d*(r+RADIUS+.1);
      if(l.theme==='anthill' && input.action){const a=Math.atan2(260-b.y,440-b.x);b.vx=Math.cos(a)*460;b.vy=Math.sin(a)*460;}
      else {const dot=b.vx*dx/d+b.vy*dy/d;if(dot<0){b.vx-=2*dot*dx/d;b.vy-=2*dot*dy/d;const k=340/Math.max(1,speed(b));if(k>1){b.vx*=k;b.vy*=k;}}}
      hit=true;
    }
  }
  if(l.theme==='pinball') for(const [x,key,dir] of [[315,'left',1],[565,'right',-1]]){
    const r={x:x-68,y:390,w:136,h:16};
    if(input[key] && Math.abs(b.x-x)<90 && Math.abs(b.y-382)<42){b.vx=dir*130;b.vy=-510;hit=true;}
    else hit=collideRect(b,r)||hit;
  }
  if(l.theme==='bonus'){
    const x=clamp(input.pointer?.x??440,80,800);
    if(collideRect(b,{x:x-65,y:475,w:130,h:12})){b.vy=-Math.max(330,Math.abs(b.vy));b.vx+=(b.x-x)*3;hit=true;}
  }
  for(const [i,[x,y]] of (l.targets||[]).entries()) if(!s.targets[i]&&Math.hypot(b.x-x,b.y-y)<26){s.targets[i]=true;s.events.push('target');}
  if(l.portal && unlocked(s) && s.portalCooldown===0 && Math.hypot(b.x-l.portal[0],b.y-l.portal[1])<28){
    b.x=l.exit[0];b.y=l.exit[1];b.vx=80;b.vy=-20;s.portalCooldown=2;s.events.push('portal');s.trail=[];
  }
  const cup=cupPosition(s), dc=Math.hypot(b.x-cup.x,b.y-cup.y);
  if(unlocked(s)&&s.strokes>0&&dc<15&&speed(b)<210){
    b.x=cup.x;b.y=cup.y;b.vx=0;b.vy=0;s.sunk=true;s.events.push('sink');return;
  }
  if(l.theme==='burger'&&!unlocked(s)&&dc<38){
    const dx=b.x-cup.x,dy=b.y-cup.y,d=Math.max(dc,.01); b.x=cup.x+dx/d*38;b.y=cup.y+dy/d*38;
    const dot=(b.vx*dx+b.vy*dy)/d;if(dot<0){b.vx-=1.7*dot*dx/d;b.vy-=1.7*dot*dy/d;hit=true;}
  }
  const sand=(l.sand||[]).some(r=>inside(b,r));
  const before=speed(b), after=Math.max(0,before-(sand?240:75)*dt);
  if(before){b.vx*=after/before;b.vy*=after/before;}
  if(after<2){b.vx=0;b.vy=0;}
  if(hit&&moving)s.events.push('bounce');
}
export function nextHole(s){
  if(!s.sunk)return s;
  const scores=[...s.scores,s.strokes];
  const bonus=!s.practice&&s.index===8&&scores.reduce((a,b)=>a+b,0)<=TOTAL_PAR+9;
  if(s.practice||s.index===9||(s.index===8&&!bonus))return {...s,scores,complete:true};
  const next=createGame(s.index+1); next.scores=scores;return next;
}
export function serialize(s){return JSON.stringify({...s,paused:false,events:[],particles:[],trail:[]});}
export function restore(raw){
  const o=JSON.parse(raw);
  if(o.version!==1||!Number.isInteger(o.index)||o.index<0||o.index>=LEVELS.length)throw Error('Sauvegarde incompatible');
  if(!o.ball||!['x','y','vx','vy'].every(k=>Number.isFinite(o.ball[k]))||o.ball.x<0||o.ball.x>WIDTH||o.ball.y<0||o.ball.y>HEIGHT||speed(o.ball)>1000)throw Error('Balle invalide');
  if(!Number.isInteger(o.strokes)||o.strokes<0||o.strokes>9999||!Array.isArray(o.scores)||o.scores.length>10||o.scores.some(n=>!Number.isInteger(n)||n<0||n>9999))throw Error('Score invalide');
  if(!Number.isFinite(o.time)||o.time<0||!Array.isArray(o.targets)||o.targets.length!==(LEVELS[o.index].targets||[]).length||o.targets.some(t=>typeof t!=='boolean'))throw Error('État invalide');
  for(const key of ['practice','sunk','complete'])if(typeof o[key]!=='boolean')throw Error('État invalide');
  if(!Number.isFinite(o.burger)||o.burger<0||o.burger>1||!Number.isFinite(o.portalCooldown)||o.portalCooldown<0||o.portalCooldown>2)throw Error('État invalide');
  const state={...createGame(o.index,o.practice),...o,paused:false,events:[],particles:[],trail:[]};
  courseCollision(state.index,state.ball,RADIUS);
  return state;
}
