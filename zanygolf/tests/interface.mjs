// Integration check with a small DOM double. This does not replace browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { project } from '../src/render.js';
test('Desktop UI starts, shoots, cancels, pauses, saves and preserves campaign in practice',async()=>{
  const html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
  const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
  const listeners={},winListeners={},store=new Map();let frame;
  const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  class Element{
    constructor(id){this.id=id;this.style={};this.hidden=id==='secondary';this.tagName=id==='game'?'CANVAS':'BUTTON';this.handlers={};this.value='0';this.attrs={};this._text='';}
    set textContent(v){this._text=String(v);}get textContent(){return this._text;}
    addEventListener(n,f){this.handlers[n]=f;}focus(){document.activeElement=this;}setAttribute(k,v){this.attrs[k]=v;}
    getContext(){return context;}getBoundingClientRect(){return {left:0,top:0,width:1200,height:740};}
    setPointerCapture(){this.captured=true;}hasPointerCapture(){return this.captured;}releasePointerCapture(){this.captured=false;}
    querySelectorAll(){return [elements.primary,elements.secondary].filter(e=>!e.hidden);}
  }
  const elements=Object.fromEntries(ids.map(id=>[id,new Element(id)]));
  globalThis.document={getElementById:id=>{assert(elements[id],id);return elements[id];},addEventListener:(n,f)=>listeners[n]=f,querySelector:()=>({requestFullscreen:async()=>{}}),activeElement:null};
  globalThis.window={addEventListener:(n,f)=>winListeners[n]=f};globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
  globalThis.requestAnimationFrame=f=>frame=f;
  const realTimeout=globalThis.setTimeout,realClear=globalThis.clearTimeout;
  globalThis.setTimeout=()=>0;globalThis.clearTimeout=()=>{};
  try{
    await import('../src/main.js');
    assert(!elements.overlay.hidden);elements.primary.onclick();assert(elements.overlay.hidden);assert.equal(elements.strokes.textContent,'0');
    const event=p=>({...project(p.x,p.y),clientX:project(p.x,p.y).x,clientY:project(p.x,p.y).y,pointerId:1,pointerType:'mouse',button:0,preventDefault(){}});
    elements.game.handlers.pointerdown(event({x:120,y:410}));elements.game.handlers.pointermove(event({x:90,y:440}));elements.game.handlers.pointerup(event({x:90,y:440}));assert.equal(elements.strokes.textContent,'1');
    let now=100;for(let i=0;i<1600;i++){frame(now);now+=16.667;}
    const key='oldgames:zanygolf:save:v1',state=JSON.parse(store.get(key));assert.equal(state.strokes,1);
    elements.game.handlers.pointerdown(event(state.ball));elements.game.handlers.pointermove(event({x:state.ball.x-40,y:state.ball.y}));
    listeners.keydown({code:'Escape',key:'Escape',preventDefault(){},target:elements.game});elements.game.handlers.pointerup(event({x:state.ball.x-40,y:state.ball.y}));assert.equal(elements.strokes.textContent,'1');
    listeners.keydown({code:'KeyP',key:'p',preventDefault(){},target:elements.game});assert(!elements.overlay.hidden);const atPause=store.get(key);for(let i=0;i<120;i++){frame(now);now+=16.667;}assert.equal(store.get(key),atPause);
    listeners.keydown({code:'Escape',key:'Escape',preventDefault(){},target:elements.game});assert(elements.overlay.hidden);
    elements.save.onclick();const campaign=store.get(key);elements['course-select'].value='5';elements.practice.onclick();assert.equal(elements['hole-name'].textContent,'Le tapis magique');elements.save.onclick();assert.equal(store.get(key),campaign);
    winListeners.blur();assert(!elements.overlay.hidden);
  }finally{globalThis.setTimeout=realTimeout;globalThis.clearTimeout=realClear;}
});
