import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCharge} from '../src/charge.js';
import {createMusic,TRACKS} from '../src/music.js';
test('Hold charges smoothly, release fires once, saturation and cancellation are safe',()=>{
  const c=createCharge();assert.equal(c.release(),null);c.start();c.tick(.5);const p=c.power;assert(p>30&&p<40);
  assert(!c.start());assert.equal(c.release(),p);assert.equal(c.release(),null);
  c.start();c.tick(20);assert.equal(c.release(),100);c.start();c.tick(.5);c.cancel();assert.equal(c.release(),null);
});
test('Original course music loops, pauses, changes tracks and obeys mute and volume',async()=>{
  globalThis.document={baseURI:'https://example.test/zanygolf/'};
  const a={paused:true,plays:0,loads:0,play(){this.paused=false;this.plays++;return Promise.resolve();},pause(){this.paused=true;},load(){this.loads++;}};
  const music=createMusic(()=>a);await music.sync(0,false);assert.equal(a.loads,0);
  await music.sync(0,true);assert.equal(a.src,'https://example.test/zanygolf/music/windmill.mp3');assert(a.loop);assert.equal(a.volume,.3);
  await music.sync(0,true);assert.equal(a.loads,1);await music.sync(0,false);assert(a.paused);
  await music.sync(1,true);assert(a.src.endsWith('/hamburger.mp3'));assert.equal(a.loads,2);
  music.setVolume(.65);assert.equal(a.volume,.65);music.setEnabled(false);assert(a.paused);await music.sync(2,true);assert.equal(a.loads,2);
  music.setEnabled(true);await music.sync(2,true);assert(a.src.endsWith('/walls.mp3'));
});
test('Each of the 10 music assets matches its original-source checksum',async()=>{
  const provenance=JSON.parse(await readFile(new URL('../music-provenance.json',import.meta.url),'utf8'));
  assert.equal(provenance.tracks.length,10);
  for(const [i,t]of provenance.tracks.entries()){
    assert.equal(t.file,TRACKS[i]+'.mp3');const data=await readFile(new URL('../src/music/'+t.file,import.meta.url));
    assert.equal(createHash('sha256').update(data).digest('hex'),t.sha256);
  }
});
