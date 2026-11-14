import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWorld,createCamera,pickCourse} from '../src/world3d.js';
import {createGame,step,STEP,speed} from '../src/physics.js';
import {heightAt,onCourse,courseCollision} from '../src/terrain.js';
import {fireAt,canFire,shotVector} from '../src/aim.js';
import {LEVELS} from '../src/levels.js';
test('Explicit click aim points towards the selected target at every power',()=>{
  const s=createGame();assert(!canFire(s,null));
  for(const target of [{x:700,y:100},{x:30,y:450},{x:120,y:300}]){
    for(const power of [5,35,100]){
      const v=shotVector(s.ball,target,power);assert(v);assert(v.x*(target.x-s.ball.x)+v.y*(target.y-s.ball.y)>0);assert(Math.abs(Math.hypot(v.x,v.y)-155*power/100)<1e-8);
    }
  }
  assert(fireAt(s,{x:300,y:350},35));assert.equal(s.strokes,1);assert(!fireAt(s,{x:500,y:100},35));assert.equal(s.strokes,1);
});
test('Camera ray picking follows slopes across normal, wide and fullscreen viewports',()=>{
  for(let index=0;index<10;index++){
    const w=createWorld(index);w.scene.updateMatrixWorld(true);
    for(const aspect of [1.2,1200/740,1920/1080]){
      const camera=createCamera(aspect),ray=new THREE.Raycaster();
      for(const [x,z]of[LEVELS[index].start,LEVELS[index].cup]){
        const point=new THREE.Vector3(x,heightAt(index,x,z),z),screen=point.clone().project(camera);
        assert(Math.abs(screen.x)<1&&Math.abs(screen.y)<1,'Playable positions must remain framed');
        ray.setFromCamera(new THREE.Vector2(screen.x,screen.y),camera);
        const hit=pickCourse(ray,w);assert(hit,`No terrain under ${index}: ${x},${z}`);
        assert(hit.distanceTo(point)<4,`Picking slope mismatch on ${index}`);
      }
    }
    w.dispose();
  }
});
test('All 10 3D courses contain smooth finite geometry and keep draw calls bounded',()=>{
  for(let index=0;index<10;index++){
    const w=createWorld(index),s=createGame(index);s.time=3;s.burger=1;
    w.update(s,{action:true,left:true,right:true,pointer:{x:300,y:200}},{x:600,y:200},50);
    let meshes=0;
    w.scene.traverse(o=>{if(!o.isMesh)return;meshes++;assert(o.geometry.attributes.position.count>0);for(const v of o.geometry.attributes.position.array)assert(Number.isFinite(v));assert(o.material);});
    assert(meshes<150,`Unbatched geometry on ${index}`);assert.equal(w.ball.position.y,heightAt(index,s.ball.x,s.ball.y)+7);w.dispose();
  }
});
test('Course-shaped boundaries rebound the ball and recover an old save outside the new outline',()=>{
  for(let index=0;index<10;index++){
    const b={x:-100,y:-100,vx:-100,vy:-100};courseCollision(index,b,7);assert(onCourse(index,b.x,b.y),`Recovery on ${index}`);
    const s=createGame(index);fireAt(s,{x:-200,y:900},100);for(let i=0;i<2400&&!s.sunk;i++)step(s,STEP);assert(onCourse(index,s.ball.x,s.ball.y));assert.equal(speed(s.ball),0);
  }
});

test('First course is completable from its tee with a normal aimed shot, without teleportation',()=>{
  const s=createGame(),target={x:750,y:115},distance=Math.hypot(target.x-s.ball.x,target.y-s.ball.y);
  fireAt(s,target,Math.sqrt(150*distance)/651*100);
  for(let i=0;i<1200&&!s.sunk;i++)step(s,STEP);
  assert(s.sunk);assert.equal(s.strokes,1);assert(s.time>3);
});
