// Course outlines are shared by drawing, collisions and pointer projection.
export const OUTLINES = [
  [[30,280],[310,280],[310,40],[850,40],[850,280],[600,280],[600,490],[30,490]],
  [[40,320],[220,320],[220,70],[840,70],[840,260],[700,260],[700,480],[40,480]],
  [[30,340],[180,340],[180,45],[830,45],[830,200],[735,200],[735,480],[30,480]],
  [[90,40],[790,40],[830,420],[650,490],[230,490],[50,420]],
  [[40,300],[115,300],[115,30],[800,30],[840,130],[800,490],[40,490]],
  [[40,330],[150,330],[150,35],[830,35],[830,200],[730,200],[730,485],[40,485]],
  [[40,315],[250,315],[250,35],[840,35],[840,270],[610,270],[610,485],[40,485]],
  [[170,35],[710,35],[840,140],[840,380],[690,490],[190,490],[40,380],[40,140]],
  [[40,40],[840,40],[840,480],[40,480]],
  [[80,30],[800,30],[850,450],[720,505],[160,505],[30,450]],
];
export function onCourse(index,x,y){
  const p=OUTLINES[index];let inside=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const [ax,ay]=p[i],[bx,by]=p[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }return inside;
}
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function heightAt(index,x,y){
  if(index===0||index===6)return 28+ease((440-x)/160)*62;
  if(index===2)return 28+ease((520-y)/380)*60;
  if(index===7){const d=Math.hypot((x-440)/1.1,y-260);return 22+Math.max(0,1-d/230)*85;}
  if(index===8)return 24+ease((x-420)/120)*48;
  return 28;
}
export function courseCollision(index,b,radius){
  const points=OUTLINES[index];let nearest=null;
  for(let i=0;i<points.length;i++){
    const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length],dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);
    const t=Math.max(0,Math.min(1,((b.x-ax)*dx+(b.y-ay)*dy)/(length*length))),x=ax+t*dx,y=ay+t*dy,d=Math.hypot(b.x-x,b.y-y);
    if(!nearest||d<nearest.d)nearest={x,y,d,nx:-dy/length,ny:dx/length};
  }
  const outside=!onCourse(index,b.x,b.y);
  if(outside||nearest.d<radius){
    const n=nearest;
    if(outside){b.x=n.x+n.nx*(radius+.2);b.y=n.y+n.ny*(radius+.2);}
    else {b.x+=n.nx*(radius-n.d+.1);b.y+=n.ny*(radius-n.d+.1);}
    const dot=b.vx*n.nx+b.vy*n.ny;
    if(dot<0){b.vx-=1.78*dot*n.nx;b.vy-=1.78*dot*n.ny;return true;}
  }return false;
}
