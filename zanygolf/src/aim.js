import { clamp, shoot, speed } from './physics.js';
export function shotVector(ball,target,power){
  if(!target||![target.x,target.y,power].every(Number.isFinite))return null;
  const dx=target.x-ball.x,dy=target.y-ball.y,d=Math.hypot(dx,dy);
  if(d<3)return null;
  const length=155*clamp(power,5,100)/100;return {x:dx/d*length,y:dy/d*length};
}
export function fireAt(game,target,power){const v=shotVector(game.ball,target,power);return !!v&&shoot(game,v.x,v.y);}
export function canFire(game,target){return !!target&&!game.paused&&!game.sunk&&!game.complete&&speed(game.ball)<2&&Math.hypot(target.x-game.ball.x,target.y-game.ball.y)>=3;}
