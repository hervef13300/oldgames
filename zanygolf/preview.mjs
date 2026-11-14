// Render the actual game scene to vector artwork without a browser dependency.
import { writeFile } from 'node:fs/promises';
import { createGame } from './src/physics.js';
import { render } from './src/render.js';
const parts=[];let path='',ellipseMarkup='',dash=[];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const ctx={fillStyle:'#000',strokeStyle:'#fff',lineWidth:1,font:'12px sans-serif',textAlign:'left',
  createLinearGradient(){return {addColorStop(){},toString(){return '#294344';}};},
  fillRect(x,y,w,h){parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${this.fillStyle}"/>`);},
  beginPath(){path='';ellipseMarkup='';},moveTo(x,y){path+=`M${x},${y} `;},lineTo(x,y){path+=`L${x},${y} `;},closePath(){path+='Z';},
  ellipse(x,y,rx,ry,rot){ellipseMarkup=`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot*180/Math.PI} ${x} ${y})"`;},
  fill(){parts.push(ellipseMarkup?`${ellipseMarkup} fill="${this.fillStyle}"/>`:`<path d="${path}" fill="${this.fillStyle}"/>`);},
  stroke(){const props=`fill="none" stroke="${this.strokeStyle}" stroke-width="${this.lineWidth}" stroke-dasharray="${dash.join(' ')}"`;parts.push(ellipseMarkup?`${ellipseMarkup} ${props}/>`:`<path d="${path}" ${props}/>`);},
  setLineDash(value){dash=value;},
  fillText(value,x,y){parts.push(`<text x="${x}" y="${y}" font-family="sans-serif" font-size="${parseFloat(this.font)}" fill="${this.fillStyle}" text-anchor="${this.textAlign==='center'?'middle':'start'}">${esc(value)}</text>`);}
};
const s=createGame(Number(process.argv[3]||0));s.time=.7;
render(ctx,s,{}, {x:s.ball.x-60,y:s.ball.y+70});
await writeFile(process.argv[2]||'public/assets/zanygolf.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 740">'+parts.join('')+'</svg>');
