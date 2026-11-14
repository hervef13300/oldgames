import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, TOTAL_PAR } from '../src/levels.js';
import { createGame, step, shoot, nextHole, serialize, restore, speed, cupPosition, obstacles, unlocked, STEP } from '../src/physics.js';
const advance=(s,seconds,input={})=>{for(let i=0;i<Math.round(seconds/STEP);i++)step(s,STEP,input);};
test('Dragging backwards shoots forwards, caps power and counts a shot once',()=>{
  const s=createGame();assert(shoot(s,90,-50));assert(s.ball.vx>0&&s.ball.vy<0);assert.equal(s.strokes,1);assert.equal(shoot(s,20,30),false);
  advance(s,20);assert.equal(speed(s.ball),0);assert(shoot(s,1000,0));assert(speed(s.ball)<=652);assert.equal(s.strokes,2);
});
test('Collision substeps prevent a maximum-power ball tunneling through a thin wall',()=>{
  const s=createGame(1);s.ball={x:250,y:300,vx:650,vy:0};advance(s,.065);assert(s.ball.x<280);assert(s.ball.vx<0);
});
test('Walls eject a ball safely even when an obstacle rises around its center',()=>{
  const s=createGame(2);s.time=1;s.ball={x:247,y:280,vx:0,vy:0};step(s);assert(s.ball.x<235||s.ball.x>259);
});
test('Pause freezes ball, timers and obstacles and rejects shots',()=>{
  const s=createGame();shoot(s,90,0);s.paused=true;const before=serialize(s);advance(s,4);assert.equal(serialize(s),before);assert.equal(shoot(s,10,0),false);
});
test('Burger blocks the cup until the action is held; an actual shot then sinks',()=>{
  const s=createGame(1);s.ball={x:650,y:170,vx:0,vy:0};assert(!unlocked(s));shoot(s,27,0);advance(s,3);assert(!s.sunk);
  s.ball={x:650,y:170,vx:0,vy:0};advance(s,.5,{action:true});assert(unlocked(s));shoot(s,27,0);advance(s,3,{action:true});assert(s.sunk);
});
test('Fan and carpet controls change moving-ball trajectories',()=>{
  const a=createGame(4);a.ball={x:200,y:330,vx:30,vy:50};const b=restore(serialize(a));advance(a,.25);advance(b,.25,{action:true});assert(b.ball.vy<a.ball.vy-70);
  const c=createGame(5);c.ball={x:230,y:250,vx:20,vy:0};advance(c,.2,{action:true,pointer:{x:260,y:100}});assert(c.ball.vy<-50);
});
test('Pinball flippers impart an upward impulse only when activated',()=>{
  const s=createGame(3);s.ball={x:315,y:370,vx:0,vy:20};step(s,STEP,{left:true});assert(s.ball.vy<-490);
});
test('Targets unlock Energy and teleport moves a live ball with cooldown',()=>{
  const s=createGame(8);assert(!unlocked(s));for(const [x,y] of LEVELS[8].targets){s.ball={x,y,vx:20,vy:0};step(s);}assert(unlocked(s));
  s.ball={x:340,y:260,vx:40,vy:0};step(s);assert(s.ball.x>650);assert(s.portalCooldown>1);assert(s.events.includes('portal'));
});
test('Hole advances once, preserves score, unlocks bonus and finishes',()=>{
  let s=createGame();for(let i=0;i<9;i++){assert.equal(s.index,i);s.strokes=LEVELS[i].par;s.sunk=true;s=nextHole(s);}
  assert.equal(s.index,9);assert.equal(s.scores.reduce((a,b)=>a+b,0),TOTAL_PAR);s.strokes=4;s.sunk=true;s=nextHole(s);assert(s.complete);assert.equal(s.scores.length,10);
  const poor=createGame(8);poor.scores=Array(8).fill(8);poor.strokes=8;poor.sunk=true;assert(nextHole(poor).complete);
});
test('Each hole accepts a slow approach when required mechanisms are satisfied',()=>{
  for(let i=0;i<LEVELS.length;i++){const s=createGame(i);s.targets.fill(true);s.burger=1;const c=cupPosition(s);s.ball={x:c.x-22,y:c.y,vx:0,vy:0};shoot(s,16,0);advance(s,.35,{action:true});assert(s.sunk,LEVELS[i].name);}
});
test('Practice does not enter the next hole, serialized state resumes exactly',()=>{
  const s=createGame(3,true);shoot(s,15,-80);advance(s,.8);const r=restore(serialize(s));advance(s,1);advance(r,1);assert.equal(serialize(s),serialize(r));s.sunk=true;const end=nextHole(s);assert(end.complete);assert.equal(end.index,3);
});
test('Malformed saves are rejected without poisoning the simulation',()=>{
  for(const patch of [{index:99},{ball:{x:NaN,y:0,vx:0,vy:0}},{scores:[-1]},{targets:[true]},{time:null},{burger:7},{practice:'true'}])assert.throws(()=>restore(JSON.stringify({...createGame(),...patch})));
  assert.throws(()=>restore('{bad json'));
});
