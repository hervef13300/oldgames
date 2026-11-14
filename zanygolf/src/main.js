import { LEVELS, TOTAL_PAR } from './levels.js';
import { createGame, shoot, step, nextHole, speed, STEP, serialize, restore, clamp } from './physics.js';
import { createRenderer } from './world3d.js';
import { fireAt, canFire } from './aim.js';
import { createMusic } from './music.js';
import { createCharge } from './charge.js';
const music=createMusic(),charge=createCharge();
const $=id=>document.getElementById(id), canvas=$('game');
let view=null,power=35,actionLatched=false,graphicsLost=false;
const KEY='oldgames:zanygolf:save:v1';
let game=createGame(),started=false,aim=null,menu='welcome',primaryAction,secondaryAction,sound=false,audio=null,last=0,acc=0,lastSave=0,uiCache='',noticeTimer;
const input={action:false,left:false,right:false,pointer:{x:440,y:260}};
const themes=['THE WINDMILL CLUB','BURGER ON THE GREEN','THE MOVING GARDEN','PINBALL COUNTRY CLUB','A BREATH OF FRESH AIR','THE MAGIC GREEN','CASTLE ON THE HILL','THE WANDERING HOLE','THE ENERGY GARDEN','THE SECRET GARDEN'];
const tips=['Passez entre les pales.','Le trou est sous le burger.','Choisissez votre fenêtre.','Deux cibles avant le drapeau.','Laissez le vent travailler.','Prenez la balle en main.','La porte ne reste pas ouverte.','Visez un trou qui se déplace.','Rallumez les deux circuits.','Quatre cristaux, une sortie.'];
function notice(message){$('notice').textContent=message;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{$('notice').textContent='';},7000);}
function clearInput(){charge.cancel();input.action=false;input.left=false;input.right=false;aim=null;actionLatched=false;$('action').setAttribute('aria-pressed','false');}
function beep(type){
  if(!sound)return;
  try{
    audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});
    const notes={shot:[420,.07],bounce:[170,.035],target:[740,.17],portal:[540,.28],sink:[880,.45]},[f,d]=notes[type]||notes.shot;
    const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type==='sink'?'sine':'triangle';osc.frequency.setValueAtTime(f,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(type==='sink'?1320:f*.55,audio.currentTime+d);gain.gain.setValueAtTime(.045,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+d);
  }catch{sound=false;$('sound').setAttribute('aria-pressed','false');notice('Le son n’est pas disponible dans ce navigateur.');}
}
function toggleSound(){sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'Couper le son':'Activer le son');if(sound)beep('target');}
function save(manual=false){
  if(!started){if(manual)notice('Commencez une partie avant de sauvegarder.');return;}
  if(game.practice){if(manual)notice('L’entraînement ne remplace pas votre sauvegarde de parcours.');return;}
  try{localStorage.setItem(KEY,serialize(game));if(manual)notice('Partie sauvegardée dans ce navigateur.');}catch{if(manual)notice('Stockage indisponible. Votre partie reste jouable pendant cette session.');}
}
function saved(){try{const raw=localStorage.getItem(KEY);return raw?restore(raw):null;}catch{return null;}}
function showDialog({kind,kicker,title,text,extra='',primary,onPrimary,secondary,onSecondary,footnote=''}){
  menu=kind;clearInput();game.paused=true;$('dialog-kicker').textContent=kicker;$('dialog-title').innerHTML=title;$('dialog-text').textContent=text;$('dialog-extra').innerHTML=extra;$('primary').textContent=primary;$('secondary').hidden=!secondary;$('secondary').textContent=secondary||'';$('dialog-footnote').textContent=footnote;primaryAction=onPrimary;secondaryAction=onSecondary;$('overlay').hidden=false;$('primary').focus();paintUI();syncMusic();
}
function syncMusic(){music.sync(game.index,started&&!menu&&!document.hidden).catch(()=>{music.setEnabled(false);$('music').setAttribute('aria-pressed','false');notice("Cliquez sur Musique pour autoriser la lecture audio.");});}
function hideDialog(){menu='';$('overlay').hidden=true;game.paused=false;clearInput();last=0;acc=0;canvas.focus();paintUI();syncMusic();}
function start(index=0,practice=false){game=createGame(index,practice);started=true;hideDialog();save();paintUI();}
function resumeSaved(){const s=saved();if(!s){notice('Aucune sauvegarde valide à reprendre.');return;}game=s;started=true;hideDialog();if(game.complete)finish();else if(game.sunk)holeFinished();}
function welcome(){
  const hasSave=!!saved();
  showDialog({kind:'welcome',kicker:'BIENVENUE AU CLUB',title:'Le golf prend<br>la tangente<span>.</span>',text:'Cliquez sur le terrain pour choisir une direction. Maintenez Espace pour faire monter la puissance, puis relâchez pour tirer. E ou le bouton Action commande les mécanismes.',extra:'<div class="gesture"><span>①</span><b>VISEZ</b><span>②</span><b>DOSEZ</b><span>③</span><b>TIREZ</b></div>',primary:'Commencer la partie ↗',onPrimary:()=>hasSave?confirmNew(()=>start()):start(),secondary:hasSave?'Reprendre ma partie':null,onSecondary:resumeSaved,footnote:'9 trous · Bonus si vous terminez en '+(TOTAL_PAR+9)+' coups maximum · Sauvegarde automatique'});
}
function confirmNew(action){
  const wasStarted=started;
  showDialog({kind:'confirm',kicker:'NOUVEAU DÉPART',title:'On repart du tee ?',text:'Une nouvelle partie remplacera votre progression sauvegardée. Votre carte actuelle sera remise à zéro.',primary:'Commencer une nouvelle partie',onPrimary:action,secondary:'Revenir',onSecondary:()=>wasStarted?hideDialog():welcome()});
}
function pause(){
  if(!started||game.complete||game.sunk)return;
  if(menu==='pause'){hideDialog();return;}if(menu)return;
  save();showDialog({kind:'pause',kicker:'PETITE PAUSE AU CLUB',title:'Le green vous attend<span>.</span>',text:'Votre partie est en pause. Reprenez quand vous êtes prêt.',primary:'Reprendre la partie ↗',onPrimary:hideDialog,secondary:'Recommencer le parcours',onSecondary:()=>confirmNew(()=>start()),footnote:'P ou Échap pour reprendre'});
}
function holeFinished(){
  const l=LEVELS[game.index],delta=game.strokes-l.par;
  const label=game.strokes===1?'Trou en un !':delta<=-2?'Eagle !':delta===-1?'Birdie !':delta===0?'Dans le par !':'Bien joué !';
  showDialog({kind:'hole',kicker:'TROU '+String(game.index+1).padStart(2,'0')+' TERMINÉ',title:label+'<span> ✦</span>',text:l.name+' est derrière vous. '+(delta>0?`${delta} coup${delta>1?'s':''} au-dessus du par.`:'Un beau passage sur le green.'),extra:`<div class="result-stats"><div><b>${game.strokes}</b><span>COUPS</span></div><div><b>${l.par}</b><span>PAR</span></div><div><b>${game.scores.reduce((a,b)=>a+b,0)+game.strokes}</b><span>TOTAL</span></div></div>`,primary:game.practice?'Terminer l’entraînement':game.index>=8?'Voir la suite ↗':'Trou suivant ↗',onPrimary:()=>{game=nextHole(game);hideDialog();save();if(game.complete)finish();else if(game.index===9)notice('Bonus débloqué : bienvenue dans le jardin secret !');},footnote:'La progression est sauvegardée automatiquement.'});
  save();
}
function finish(){
  const total=game.scores.reduce((a,b)=>a+b,0);
  showDialog({kind:'finish',kicker:game.practice?'ENTRAÎNEMENT TERMINÉ':'CARTE COMPLÈTE',title:'À bientôt sur<br>le green<span>.</span>',text:game.practice?'Votre partie principale est conservée. Choisissez un autre trou pour vous entraîner.':`${total} coups sur ${game.scores.length} trous. ${game.scores.length===10?'Vous avez exploré le jardin secret !':'Le jardin secret se débloque en '+(TOTAL_PAR+9)+' coups ou moins sur les neuf trous.'}`,extra:`<div class="result-stats"><div><b>${total}</b><span>COUPS AU TOTAL</span></div><div><b>${game.scores.length}</b><span>TROUS TERMINÉS</span></div></div>`,primary:'Rejouer le parcours ↗',onPrimary:()=>start(),secondary:game.practice&&saved()?'Reprendre ma partie':'Retour à la collection',onSecondary:game.practice&&saved()?resumeSaved:()=>{location.href='../';},footnote:'Merci d’avoir joué · Oldgames'});
}
function paintUI(){
  const l=LEVELS[game.index],total=game.scores.reduce((a,b)=>a+b,0)+(game.complete?0:game.strokes),signature=[game.index,game.strokes,total,game.paused,game.scores.join(),game.practice].join('|');
  if(signature===uiCache)return;uiCache=signature;
  $('hole-number').textContent=String(game.index+1).padStart(2,'0')+' / '+(game.index===9?'10':'09');$('hole-name').textContent=l.name;$('par').textContent=l.par;$('strokes').textContent=game.strokes;$('total').textContent=total;$('tip-title').textContent=tips[game.index];$('tip').textContent=l.tip;$('course-theme').textContent=themes[game.index];$('stage-subtitle').textContent=l.subtitle;$('pause').innerHTML=game.paused?'▶ <span>Reprendre</span>':'Ⅱ <span>Pause</span>';
  $('score-grid').innerHTML=LEVELS.slice(0,game.index===9?10:9).map((level,i)=>`<div class="score-cell ${i===game.index?'active':''} ${game.scores[i]!==undefined?'done':''}"><small>${String(i+1).padStart(2,'0')}</small><b>${game.practice?(i===game.index?game.strokes:'·'):(game.scores[i]??(i===game.index?game.strokes:'·'))}</b><small>PAR ${level.par}</small></div>`).join('');
  $('score-grid').style.gridTemplateColumns=`repeat(${game.index===9?10:9},1fr)`;
}
function pointerPosition(e){return view?.pick(e.clientX,e.clientY);}
function fire(){
  if(menu||!started||charge.active||!canFire(game,aim))return;
  if(fireAt(game,aim,power)){aim=null;canvas.focus();paintUI();save();}
}
canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'||e.button!==0||menu||!started||game.sunk||speed(game.ball)>2)return;
  const p=pointerPosition(e);if(!p)return;
  e.preventDefault();canvas.focus();aim=p;input.pointer=p;
});
canvas.addEventListener('pointermove',e=>{const p=pointerPosition(e);if(p)input.pointer=p;});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();charge.cancel();aim=null;});
canvas.addEventListener('wheel',e=>{
  if(menu||!started||charge.active)return;e.preventDefault();power=clamp(power+(e.deltaY<0?2:-2),5,100);$('shot-power').value=power;
},{passive:false});
$('shot-power').addEventListener('input',e=>{if(!charge.active)power=clamp(Number(e.target.value)||35,5,100);});
$('fire').onclick=fire;
$('action').onclick=()=>{if(menu)return;actionLatched=!actionLatched;input.action=actionLatched;$('action').setAttribute('aria-pressed',String(actionLatched));canvas.focus();};
document.addEventListener('keydown',e=>{
  if(menu&&e.key==='Tab'){
    const buttons=[...$('overlay').querySelectorAll('button:not([hidden])')],first=buttons[0],end=buttons.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();end.focus();}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus();}return;
  }
  if(!menu&&e.code==='Space'){
    e.preventDefault();
    if(!e.repeat&&started&&canFire(game,aim)&&charge.start()){power=5;canvas.focus();}
    else if(!e.repeat&&!aim)notice('Cliquez d’abord sur le terrain pour viser.');
    return;
  }
  if(e.target.tagName==='SELECT')return;
  if(e.target.tagName==='INPUT'){if(e.code==='Enter'&&!menu){e.preventDefault();fire();}return;}
  if(e.code==='Escape'){e.preventDefault();if(aim){charge.cancel();aim=null;}else if(menu==='pause')hideDialog();else if(!menu)pause();return;}
  if(menu){if(e.code==='Enter'&&!e.repeat&&e.target.tagName!=='BUTTON'){e.preventDefault();primaryAction?.();}return;}
  if(e.target.tagName==='BUTTON'&&(e.code==='Space'||e.code==='Enter'))return;
  if(['KeyE','ArrowLeft','ArrowRight','KeyP','KeyM','KeyF'].includes(e.code))e.preventDefault();
  if(e.code==='KeyE')input.action=true;if(e.code==='ArrowLeft')input.left=true;if(e.code==='ArrowRight')input.right=true;
  if(e.code==='Enter'&&!e.repeat){e.preventDefault();fire();}if(e.repeat)return;if(e.code==='KeyP')pause();if(e.code==='KeyM')toggleSound();if(e.code==='KeyF')fullscreen();
});
document.addEventListener('keyup',e=>{if(e.code==='Space'){const released=charge.release();if(released!==null){e.preventDefault();power=released;fire();}}if(e.code==='KeyE')input.action=actionLatched;if(e.code==='ArrowLeft')input.left=false;if(e.code==='ArrowRight')input.right=false;});
window.addEventListener('blur',()=>{clearInput();if(!menu)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();save();if(!menu)pause();}});
window.addEventListener('pagehide',()=>save());
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.game-shell').requestFullscreen();}catch{notice('Le plein écran n’est pas disponible. Vous pouvez agrandir la fenêtre du navigateur.');}}
$('primary').onclick=()=>primaryAction?.();$('secondary').onclick=()=>secondaryAction?.();$('sound').onclick=toggleSound;$('music').onclick=()=>{music.setEnabled(!music.enabled);$('music').setAttribute('aria-pressed',String(music.enabled));syncMusic();};$('music-volume').addEventListener('input',e=>music.setVolume(Number(e.target.value)/100));$('pause').onclick=pause;$('fullscreen').onclick=fullscreen;$('save').onclick=()=>save(true);$('restart').onclick=()=>confirmNew(()=>start());
$('course-select').innerHTML=LEVELS.slice(0,9).map((l,i)=>`<option value="${i}">${String(i+1).padStart(2,'0')} · ${l.name}</option>`).join('');
$('practice').onclick=()=>{save();start(Number($('course-select').value),true);notice('Mode entraînement : votre partie principale est conservée.');};
function frame(now){
  if(!last)last=now;const dt=Math.min((now-last)/1000,.1);last=now;
  if(started&&!menu){
    if(charge.active){power=charge.tick(dt);$('shot-power').value=Math.round(power);}
    acc+=dt;while(acc>=STEP){step(game,STEP,input);acc-=STEP;if(game.sunk)break;}
    const events=game.events.splice(0);for(const type of new Set(events))beep(type);
    if(speed(game.ball)>8){game.trail.push({x:game.ball.x,y:game.ball.y});if(game.trail.length>16)game.trail.shift();}else if(game.trail.length)game.trail.shift();
    if(game.sunk)holeFinished();
    if(now-lastSave>5000){save();lastSave=now;}
  }
  if(!graphicsLost)view.draw(game,input,aim,power);paintUI();
  $('power-fill').style.width=power+'%';$('power-value').textContent=Math.round(power)+' %';$('shot-power-value').textContent=Math.round(power)+' %';
  $('fire').disabled=!!menu||charge.active||!canFire(game,aim);$('shot-power').disabled=charge.active;
  $('play-status').textContent=menu?'Zany Golf · Édition 3D':charge.active?'Maintenez Espace pour doser · Relâchez pour tirer · Échap pour annuler':speed(game.ball)>2?'Balle en jeu · E ou Action pour les mécanismes':aim?'Maintenez Espace pour charger, puis relâchez pour tirer':'① Cliquez sur le terrain pour choisir votre direction';
  requestAnimationFrame(frame);
}
try{view=createRenderer(canvas);welcome();requestAnimationFrame(frame);}catch(error){
  console.error('Zany Golf 3D initialization failed',error);
  showDialog({kind:'error',kicker:'AFFICHAGE 3D INDISPONIBLE',title:'Activez l’accélération graphique.',text:'Ce jeu utilise WebGL 2. Activez l’accélération matérielle du navigateur, ou ouvrez-le dans une version récente de Chrome, Edge, Firefox ou Safari.',primary:'Réessayer',onPrimary:()=>location.reload(),secondary:'Retour aux jeux',onSecondary:()=>{location.href='../';}});
}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsLost=true;save();if(!menu)pause();notice('Affichage 3D interrompu. La partie est sauvegardée.');});

canvas.addEventListener('webglcontextrestored',()=>{graphicsLost=false;notice('Affichage 3D rétabli. Vous pouvez reprendre la partie.');});
