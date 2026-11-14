import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { LEVELS } from './levels.js';
import { OUTLINES, heightAt } from './terrain.js';
import { cupPosition, obstacles, unlocked, clamp } from './physics.js';

export function createCamera(aspect=1200/740){
  const size=900;
  const camera=new THREE.OrthographicCamera(-size*aspect/2,size*aspect/2,size/2,-size/2,1,4000);
  camera.position.set(1180,1180,1330);camera.lookAt(440,35,260);camera.updateMatrixWorld();return camera;
}
export function pickCourse(ray,world){
  const hits=world?ray.intersectObject(world.terrain):[];
  if(hits.length)return hits[0].point;
  // Triangle-edge roundoff can miss an exact seam. Solve against the shared
  // height field so a click on that seam keeps the same elevation and direction.
  const point=new THREE.Vector3(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-28);
  for(let i=0;i<16;i++){
    if(!ray.ray.intersectPlane(plane,point))return null;
    const elevation=world?heightAt(world.index,point.x,point.z):28;
    if(Math.abs(elevation-point.y)<.001)break;
    plane.constant=-elevation;
  }
  return point;
}
export function createWorld(index){
  const l=LEVELS[index],scene=new THREE.Scene();scene.background=new THREE.Color(index===8?'#192c45':'#dce8dd');
  scene.fog=new THREE.Fog(scene.background,2200,3800);
  const root=new THREE.Group();scene.add(root);
  const materials=new Map(),geometryCache=new Map(),animations=[];
  const mat=(color,metal=0,rough=.6,emissive=null)=>{
    const key=[color,metal,rough,emissive].join();if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough,...(emissive?{emissive:new THREE.Color(emissive),emissiveIntensity:1.2}:{})}));return materials.get(key);
  };
  const geo=(key,fn)=>{if(!geometryCache.has(key))geometryCache.set(key,fn());return geometryCache.get(key);};
  function mesh(geometry,material,x,y,z,parent=root){const m=new THREE.Mesh(geometry,typeof material==='string'?mat(material):material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(x,y,z,w,h,d,c,parent=root){const m=mesh(geo('box',()=>new THREE.BoxGeometry(1,1,1)),c,x,y,z,parent);m.scale.set(w,h,d);return m;}
  function sphere(x,y,z,rx,ry,rz,c,parent=root){const m=mesh(geo('sphere',()=>new THREE.SphereGeometry(1,24,16)),c,x,y,z,parent);m.scale.set(rx,ry,rz);return m;}
  function cylinder(x,y,z,rt,rb,h,c,parent=root,segments=32){return mesh(geo(`c${rt},${rb},${h},${segments}`,()=>new THREE.CylinderGeometry(rt,rb,h,segments)),c,x,y,z,parent);}
  function torus(x,y,z,r,t,c,parent=root){return mesh(geo(`t${r},${t}`,()=>new THREE.TorusGeometry(r,t,10,48)),c,x,y,z,parent);}
  function beam(a,b,r,c,parent=root){const dir=new THREE.Vector3().subVectors(b,a),mid=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5);const m=cylinder(mid.x,mid.y,mid.z,r,r,dir.length(),c,parent,12);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return m;}
  function dynamic(o){o.userData.dynamic=true;return o;}
  function group(x,y,z,parent=root){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
  function shadow(x,z,rx,rz,opacity=.13){
    const m=mesh(geo('disc',()=>new THREE.CircleGeometry(1,48)),new THREE.MeshBasicMaterial({color:'#193a2b',transparent:true,opacity,depthWrite:false}),x,2,z);m.rotation.x=-Math.PI/2;m.scale.set(rx,rz,1);m.castShadow=false;
  }
  const h=(x,z)=>heightAt(index,x,z);
  const hemi=new THREE.HemisphereLight('#ecf6ff',index===8?'#26456b':'#77664e',2.1);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff1d6',3.6);sun.position.set(-350,1300,700);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-900,right:900,top:800,bottom:-800,near:100,far:2600});sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=1.2;sun.shadow.bias=-.00015;sun.shadow.radius=4;sun.target.position.set(440,0,260);scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight('#cde8ff',1.2);fill.position.set(900,400,-600);scene.add(fill);
  const ground=mesh(new THREE.PlaneGeometry(6000,6000),mat(index===8?'#192c45':'#dce8dd'),440,-16,260);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  shadow(440,260,690,430,.07);

  // Smooth, subdivided course surface. All visible slopes share the physics height field.
  const outline=OUTLINES[index],poly=outline.map(p=>new THREE.Vector2(...p));
  const positions=[],colors=[],grass=new THREE.Color(index===3?'#eae4d2':index===8?'#4b6574':index===9?'#6dbba5':'#65aa43');
  function triangle(a,b,c){
    for(const v of [a,c,b]){positions.push(v.x,h(v.x,v.y),v.y);const col=grass.clone();const variation=(Math.sin(v.x*.013)*Math.cos(v.y*.011)+1)*.025;col.offsetHSL(0,0,variation);colors.push(col.r,col.g,col.b);}
  }
  function clip(points,axis,value,keepGreater){
    const out=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length],av=a[axis],bv=b[axis],ain=keepGreater?av>=value:av<=value,bin=keepGreater?bv>=value:bv<=value;
      if(ain)out.push(a);
      if(ain!==bin)out.push(a.clone().lerp(b,(value-av)/(bv-av)));
    }return out;
  }
  // Clip a regular grid against the course triangulation. Shared edge samples
  // avoid the cracks produced by independently subdividing adjacent triangles.
  for(const face of THREE.ShapeUtils.triangulateShape(poly,[])){
    const points=face.map(i=>poly[i]),xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    for(let x=Math.floor(Math.min(...xs)/20)*20;x<Math.max(...xs);x+=20)for(let z=Math.floor(Math.min(...ys)/20)*20;z<Math.max(...ys);z+=20){
      let p=points;p=clip(p,'x',x,true);p=clip(p,'x',x+20,false);p=clip(p,'y',z,true);p=clip(p,'y',z+20,false);
      for(let i=1;i<p.length-1;i++)if(Math.abs((p[i].x-p[0].x)*(p[i+1].y-p[0].y)-(p[i].y-p[0].y)*(p[i+1].x-p[0].x))>.001)triangle(p[0],p[i],p[i+1]);
    }
  }
  const terrainGeo=new THREE.BufferGeometry();terrainGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeo.computeVertexNormals();
  const smoothTerrain=mergeVertices(terrainGeo,.001);smoothTerrain.computeVertexNormals();terrainGeo.dispose();
  const terrain=mesh(smoothTerrain,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92}),0,0,0);terrain.userData.playable=true;
  const stone=index===8?'#314653':index===3?'#e86f4a':index===6?'#a1afb5':'#c0a184';
  const curb=index===3?'#f2ac4c':index===8?'#8bd8d6':'#f0e5cc';
  // Exposed masonry and beveled continuous rails around the actual collision outline.
  for(let i=0;i<outline.length;i++){
    const a=new THREE.Vector2(...outline[i]),b=new THREE.Vector2(...outline[(i+1)%outline.length]),n=Math.ceil(a.distanceTo(b)/26);
    for(let k=0;k<n;k++){
      const p=a.clone().lerp(b,k/n),q=a.clone().lerp(b,(k+1)/n),hp=h(p.x,p.y),hq=h(q.x,q.y);
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([p.x,-1,p.y,q.x,-1,q.y,q.x,hq,q.y,p.x,-1,p.y,q.x,hq,q.y,p.x,hp,p.y],3));g.computeVertexNormals();mesh(g,mat(stone),0,0,0);
      beam(new THREE.Vector3(p.x,hp+4,p.y),new THREE.Vector3(q.x,hq+4,q.y),4.5,curb);
      const center=p.clone().lerp(q,.5),length=p.distanceTo(q),angle=-Math.atan2(q.y-p.y,q.x-p.x);
      for(let by=13;by<Math.min(hp,hq)-8;by+=17){const line=box(center.x,by,center.y,length-.8,1.1,1.2,index===8?'#223744':'#a7876c');line.rotation.y=angle;}
    }
  }
  // Turf stripes are very subtle, without enlarged pixels or faceted grass.
  function decalRect(x,z,w,d,c,offset=.65){
    const p=[],step=20;for(let a=x;a<x+w;a+=step)for(let b=z;b<z+d;b+=step){const x2=Math.min(x+w,a+step),z2=Math.min(z+d,b+step);for(const [u,v]of[[a,b],[a,z2],[x2,b],[x2,b],[a,z2],[x2,z2]])p.push(u,h(u,v)+offset,v);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();const m=mesh(g,mat(c),0,0,0);m.castShadow=false;return m;
  }
  for(const sand of l.sand||[])decalRect(sand.x,sand.y,sand.w,sand.h,'#e5cc94');
  if(l.carpet){const r=l.carpet;decalRect(r.x,r.y,r.w,r.h,'#6d44a9');for(let j=0;j<2;j++){const inset=8+j*10;for(const [x,z,w,d]of[[r.x+inset,r.y+inset,r.w-inset*2,3],[r.x+inset,r.y+r.h-inset,r.w-inset*2,3],[r.x+inset,r.y+inset,3,r.h-inset*2],[r.x+r.w-inset,r.y+inset,3,r.h-inset*2]])decalRect(x,z,w,d,'#dcb46b',1);}
    for(let x=r.x+45;x<r.x+r.w-20;x+=65)for(let z=r.y+40;z<r.y+r.h-20;z+=65){const gem=box(x,h(x,z)+1,z,12,1,12,'#ab81cf');gem.rotation.y=Math.PI/4;}
    for(let x=r.x+8;x<r.x+r.w;x+=14)beam(new THREE.Vector3(x,h(x,r.y)+1,r.y),new THREE.Vector3(x,h(x,r.y)+1,r.y-11),1.2,'#e9cb80');
  }
  if(index===8)for(let x=60;x<830;x+=64)for(let z=60;z<465;z+=64){const p=box(x,h(x,z)+.5,z,57,1,57,(Math.round(x/64)+Math.round(z/64))%2?'#4d6574':'#58727f');p.castShadow=false;}
  if(index===3||index===9)for(const [x,z]of[[220,300],[660,300],[440,195]]){const disc=cylinder(x,h(x,z)+1,z,44,44,1,index===3?'#e9bd57':'#a8e3c8');disc.castShadow=false;torus(x,h(x,z)+2,z,31,1.5,index===3?'#de8348':'#e9e4af').rotation.x=Math.PI/2;}

  let seed=884+index;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function tree(x,z,scale=1){
    const g=group(x,0,z);g.scale.setScalar(scale);cylinder(0,38,0,5,8,80,'#846343',g);
    const green=['#4c8154','#6b9657','#4b8b67'][Math.floor(rand()*3)];
    sphere(0,105,0,35,53,34,green,g);sphere(-24,85,7,27,32,27,green,g);sphere(20,93,9,29,35,28,green,g);sphere(-8,130,-2,26,34,25,'#77a56a',g);
    shadow(x,z,45*scale,34*scale,.11);
  }
  function plant(x,z,scale=1){const g=group(x,0,z);for(let j=0;j<5;j++){const a=j*1.25,leaf=sphere(Math.cos(a)*6,8,Math.sin(a)*6,3,14,5,'#6a9458',g);leaf.rotation.z=Math.sin(a)*.5;leaf.rotation.x=Math.cos(a)*.5;}g.scale.setScalar(scale);}
  function flowers(x,z){const g=group(x,0,z);for(let j=0;j<6;j++){const a=j*2.4,r=12+rand()*12;beam(new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r),new THREE.Vector3(Math.cos(a)*r,15,Math.sin(a)*r),.8,'#59824c',g);const c=j%2?'#f4c761':'#e7a4bd';for(let k=0;k<5;k++)sphere(Math.cos(a)*r+Math.cos(k*1.256)*3,16,Math.sin(a)*r+Math.sin(k*1.256)*3,3,2,3,c,g);sphere(Math.cos(a)*r,18,Math.sin(a)*r,2,2,2,'#fae5a1',g);}}
  const greenery=index!==8&&index!==3;
  if(greenery){for(const [x,z,s]of[[-70,40,1.1],[-40,270,.85],[60,-85,1],[260,-90,.8],[910,60,.9],[925,460,.8],[50,580,.65],[690,575,.7]])tree(x,z,s);
    for(const [x,z]of[[-30,400],[110,535],[340,540],[630,-45],[920,220],[745,560]]){flowers(x,z);plant(x+25,z+8,1.4);}
  }
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2,x=440+Math.cos(a)*620,z=260+Math.sin(a)*380;const rock=sphere(x,-2,z,13+rand()*15,8+rand()*12,13+rand()*12,index===8?'#3c5666':'#a7b2a4');rock.rotation.y=rand()*6;}

  const walls=[];
  function wall(r,moving=false){
    const g=group(r.x+r.w/2,h(r.x+r.w/2,r.y+r.h/2),r.y+r.h/2);
    const height=index===6?44:28,col=index===2?'#c27d8c':index===3?'#d95270':index===8?'#415f72':index===5?'#8d75ad':'#b28365';
    function fitted(y,w,hh,d,color){
      const geometry=new THREE.BoxGeometry(w,hh,d,Math.max(1,Math.ceil(w/20)),1,Math.max(1,Math.ceil(d/20))),p=geometry.attributes.position;
      for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+y+h(r.x+r.w/2+p.getX(i),r.y+r.h/2+p.getZ(i))-g.position.y);
      geometry.computeVertexNormals();return mesh(geometry,mat(color),0,0,0,g);
    }
    fitted(height/2,r.w,height,r.h,col);fitted(height+2,r.w+3,5,r.h+3,index===8?'#90d7da':'#e8cba4');
    // Individual masonry joints and bevel-like caps catch the light.
    for(let y=8;y<height;y+=10)fitted(y,r.w+.4,1.1,r.h+.4,'#7f665b');
    for(let z=-r.h/2+16;z<r.h/2;z+=24)box(r.w/2+.6,height/2+h(r.x+r.w,r.y+r.h/2+z)-g.position.y,z,1.2,height-4,1,'#94765f',g);
    if(moving)dynamic(g);walls.push({g,r,moving,base:g.position.y});return g;
  }
  l.walls.forEach(r=>wall(r));(l.moving||[]).forEach(r=>wall(r,true));if(l.gate)wall(l.gate,true);

  function windmill(x,z){
    const g=group(x,h(x,z),z);cylinder(0,8,0,43,47,16,'#c1a683',g);cylinder(0,70,0,26,38,124,'#f1dfb6',g);
    for(let row=0;row<7;row++){const rad=38-row*1.7;for(let i=0;i<14;i++){const a=i*Math.PI/7+(row%2)*.2;const stone=box(Math.sin(a)*rad,15+row*16,Math.cos(a)*rad,10,1.1,1.2,'#ceb98e',g);stone.rotation.y=a;}}
    cylinder(0,148,0,0,52,62,'#bd5b41',g);torus(0,121,0,42,3,'#8a4436',g).rotation.x=Math.PI/2;
    box(0,22,38,19,35,3,'#614937',g);sphere(0,40,38,10,10,2,'#614937',g);
    for(const y of [69,99]){box(0,y,31,14,19,3,'#517680',g);box(0,y,33,2,22,2,'#eee4cb',g);box(0,y,33,17,2,2,'#eee4cb',g);}
    const rotor=dynamic(group(0,111,48,g));sphere(0,0,0,9,9,9,'#654734',rotor);
    for(let i=0;i<4;i++){const arm=group(0,0,0,rotor);arm.rotation.z=i*Math.PI/2;box(0,46,0,4,102,4,'#6c5137',arm);box(10,55,1,20,67,2,'#eee5c9',arm);for(let k=0;k<6;k++)box(10,26+k*11,3,23,2,2,'#b99d6d',arm);box(21,55,3,2,70,2,'#b99d6d',arm);}
    animations.push(s=>{rotor.rotation.z=-s.time*.9;});
  }
  function lighthouse(x,z){
    const g=group(x,0,z);for(let i=0;i<8;i++){const a=i*.8;sphere(Math.cos(a)*42,6,Math.sin(a)*35,24,17,20,'#b29d82',g);}
    cylinder(0,64,0,17,26,125,'#f2e9d3',g);cylinder(0,86,0,20,21,22,'#cd6758',g);cylinder(0,126,0,30,30,6,'#d8d1ba',g);cylinder(0,142,0,16,16,25,'#6c9da6',g);cylinder(0,167,0,0,25,23,'#b75a43',g);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;box(Math.sin(a)*18,143,Math.cos(a)*18,2,28,2,'#f6ead3',g);}sphere(0,144,0,9,9,9,mat('#ffe7a8',0,.3,'#ffd38a'),g);
  }
  if(index===0){windmill(440,165);lighthouse(760,360);const water=cylinder(760,-3,360,110,110,6,mat('#76c7cd',.15,.2));water.scale.z=.8;for(let i=0;i<4;i++){const ripple=torus(760,1,360,45+i*17,.8,'#b6e6db');ripple.rotation.x=Math.PI/2;ripple.scale.y=.8;}}

  const bumperGroups=[];
  for(const [i,[x,z,r]]of(l.bumpers||[]).entries()){
    const g=group(x,h(x,z),z);bumperGroups.push(g);
    cylinder(0,5,0,r+5,r+7,10,mat('#c0d0d0',.7,.24),g);
    cylinder(0,16,0,r,r,14,index===7?'#de9554':index===3?'#62bcca':l.color,g);
    cylinder(0,26,0,r-5,r-2,9,mat(index===3?'#f5d98b':'#e7eec9',.2,.24),g);
    if(index===1){cylinder(0,54,0,13,21,68,'#d74932',g);cylinder(0,94,0,6,13,16,'#f4e4bb',g);cylinder(0,110,0,2,5,18,'#eacda0',g);box(0,50,22,24,24,2,'#f3e6c2',g);box(0,50,24,15,10,2,'#b83326',g);}
  }
  if(index===1){
    const [x,z]=l.cup,g=dynamic(group(x,h(x,z)+15,z));
    cylinder(0,4,0,43,38,13,'#d8943e',g);cylinder(0,12,0,45,43,6,'#7d4229',g);
    for(let i=0;i<11;i++){const a=i*Math.PI*2/11;sphere(Math.sin(a)*36,17,Math.cos(a)*36,16,5,13,i%2?'#80ad38':'#5c8f2c',g);}
    cylinder(0,24,0,42,42,10,'#9b432b',g);cylinder(0,31,0,44,44,6,'#dc4a31',g);
    const cheese=box(0,36,0,67,3,67,'#f6be45',g);cheese.rotation.y=.4;
    const bun=mesh(new THREE.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI/2),mat('#eeb75f',0,.68),0,39,0,g);bun.scale.set(46,24,46);
    cylinder(0,40,0,46,46,3,'#dfa24d',g);
    for(let i=0;i<44;i++){const a=i*2.4,r=Math.sqrt(rand())*40,px=Math.cos(a)*r,pz=Math.sin(a)*r,py=39+24*Math.sqrt(1-r*r/(46*46));const sesame=sphere(px,py,pz,1.2,.8,2.6,'#ffedb8',g);sesame.rotation.y=a;}
    animations.push(s=>{g.position.y=h(x,z)+15+s.burger*100;g.rotation.y=Math.sin(s.time*.8)*.025;});
    // Diner signage and parasol off the playable lane.
    cylinder(125,65,190,3,3,130,'#e7d0a4');cylinder(125,139,190,0,63,31,'#de6c55');
    for(let i=0;i<6;i++){const a=i*Math.PI/3;beam(new THREE.Vector3(125,155,190),new THREE.Vector3(125+Math.cos(a)*60,124,190+Math.sin(a)*60),1.1,'#f8e9c6');}
  }
  if(index===3){
    for(const [x,key,dir]of[[315,'left',1],[565,'right',-1]]){
      const pivot=dynamic(group(x-dir*60,h(x,398)+12,398));const bat=box(dir*60,0,0,130,14,17,mat('#d85874',.15,.32),pivot);sphere(0,0,0,13,8,13,'#f3d7b0',pivot);
      animations.push((s,input)=>{pivot.rotation.y=input[key]?dir*.48:0;});
    }
    for(const [x,z]of[[440,310],[210,260],[670,260]]){const arrow=mesh(new THREE.ConeGeometry(12,30,3),mat('#4babbc'),x,h(x,z)+2,z);arrow.rotation.x=-Math.PI/2;arrow.scale.z=.15;}
    const back=group(440,70,-20);box(0,80,0,430,140,25,'#af4561',back);box(0,80,15,385,100,4,'#25334e',back);
    for(let i=0;i<6;i++){torus(-150+i*60,82,20,18,2.5,mat('#efbc61',.3,.3,'#c18b39'),back);}
  }
  if(l.fans)for(const f of l.fans){
    const x=f.x+f.w/2,z=490,g=group(x,h(x,z),z);cylinder(0,18,0,22,29,36,'#829f9d',g);box(0,50,0,8,70,8,'#b6cfcb',g);
    const rotor=dynamic(group(0,90,0,g));torus(0,0,0,38,4,'#e4e8d7',rotor);
    for(let i=0;i<4;i++){const a=i*Math.PI/2,blade=sphere(Math.sin(a)*18,Math.cos(a)*18,0,11,22,3,'#79bfc5',rotor);blade.rotation.z=-a+.4;}
    sphere(0,0,5,8,8,7,'#f2d3a3',rotor);animations.push((s,input)=>{rotor.rotation.z=-s.time*(input.action?13:1);});
    for(let i=0;i<7;i++){const stream=sphere(x,h(x,f.y)+5,f.y+i*55,3,2,9,mat('#b5f0e2',0,.5));dynamic(stream);stream.castShadow=false;animations.push((s,input)=>{stream.visible=!!input.action;stream.position.z=f.y+(i*55+f.h-s.time*140%f.h)%f.h;stream.position.y=h(x,stream.position.z)+12;});}
  }
  if(index===5){
    for(const [x,z]of[[100,160],[800,380]]){const g=group(x,0,z);cylinder(0,14,0,28,34,28,'#bd945a',g);cylinder(0,37,0,8,24,20,'#d3ae6d',g);sphere(0,58,0,23,15,20,mat('#dcba70',.55,.3),g);torus(28,61,0,13,3,'#c8a254',g);const magic=mesh(new THREE.OctahedronGeometry(16,0),mat('#ccacef',.1,.3,'#7659b4'),0,106,0,g);dynamic(magic);animations.push(s=>{magic.rotation.y=s.time;magic.position.y=106+Math.sin(s.time*2)*8;});}
  }
  if(index===6){
    for(const z of [160,360]){
      const g=group(440,h(440,z),z);cylinder(0,63,0,34,39,126,'#b7c5c3',g);cylinder(0,123,0,44,44,12,'#d7ddd0',g);cylinder(0,167,0,0,51,77,'#627fa1',g);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;box(Math.sin(a)*38,137,Math.cos(a)*38,12,18,12,'#d5ddcf',g);}
      box(37,73,0,3,25,11,'#48667c',g);sphere(37,87,0,2,6,6,'#48667c',g);
      cylinder(0,220,0,1.3,1.3,39,'#d9c694',g);const flag=box(12,227,0,25,15,1,'#ce7b79',g);flag.rotation.y=.3;
    }
    box(440,h(440,260)+113,260,36,26,145,'#c7d3c9');
    const gate=dynamic(group(440,h(440,260),260));for(let z=-48;z<=48;z+=16)box(0,47,z,6,91,4,mat('#6d7378',.5,.45),gate);for(const y of[20,53,83])box(0,y,0,7,5,110,'#8b8f8c',gate);
    animations.push(s=>{const open=Math.sin(s.time*1.5)>.15;gate.position.y=h(440,260)+(open?96:0);gate.scale.y=open?.05:1;});
    const moat=box(440,-5,260,1010,8,660,mat('#7bc6ce',.15,.25));moat.receiveShadow=true;
  }
  if(index===7){
    for(let i=0;i<12;i++){const a=i*.9,x=440+Math.cos(a)*175,z=260+Math.sin(a)*160,g=group(x,h(x,z)+3,z);g.rotation.y=-a;for(let j=0;j<3;j++)sphere(j*4,3,0,3.4,3,2.6,'#69452e',g);for(let j=0;j<3;j++)for(const sign of[-1,1])beam(new THREE.Vector3(j*3,2,0),new THREE.Vector3(j*3+2,1,sign*6),.6,'#503b2b',g);}
  }
  if(index===8){
    for(const [x,z,w]of[[140,-25,90],[265,-25,100],[680,-25,120],[810,530,90]]){
      const g=group(x,0,z);box(0,62,0,w,124,60,mat('#536b78',.45,.4),g);box(0,97,32,w-15,31,3,mat('#82d6d0',.1,.2,'#3fabae'),g);
      for(let i=0;i<4;i++)box(0,25+i*12,32,w-18,4,3,'#273c4d',g);
      for(let i=0;i<5;i++)sphere(-w/2+15+i*14,66,34,3,3,2,mat(i%2?'#e7bc69':'#a4eab2',0,.4,i%2?'#bb7a34':'#62be79'),g);
    }
    for(const [i,[x,z]]of[l.portal,l.exit].entries()){
      const portal=torus(x,h(x,z)+4,z,27,4,mat('#b9f5e7',.3,.22,'#3dbdbb'));portal.rotation.x=Math.PI/2;
      const inner=cylinder(x,h(x,z)+2,z,23,23,2,mat('#548ca3',.4,.2,'#317a9a'));
      dynamic(inner);animations.push(s=>{portal.material.emissiveIntensity=unlocked(s)?2+Math.sin(s.time*4):.12;inner.visible=unlocked(s);});
    }
  }
  const targetGroups=[];
  for(const [i,[x,z]]of(l.targets||[]).entries()){
    const g=group(x,h(x,z),z);cylinder(0,4,0,22,25,8,'#d8bd7b',g);
    const crystal=mesh(new THREE.OctahedronGeometry(index===9?20:14,0),mat(index===8?'#79e8d3':l.color,.25,.25,index===8?'#2b9990':null),0,27,0,g);dynamic(crystal);targetGroups.push(g);
    animations.push(s=>{crystal.rotation.y=s.time*.7+i;crystal.position.y=s.targets[i]?7:29+Math.sin(s.time*2+i)*4;crystal.scale.setScalar(s.targets[i]?.35:1);});
  }
  let paddle;
  if(index===9){paddle=dynamic(group(440,h(440,475)+11,475));box(0,0,0,130,17,18,mat('#d5b975',.45,.3),paddle);box(0,10,0,116,4,14,'#b7e7d5',paddle);animations.push((s,input)=>{paddle.position.x=clamp(input.pointer?.x??440,80,800);});}
  const cup=dynamic(group(l.cup[0],h(...l.cup)+.7,l.cup[1]));
  const cupDisc=cylinder(0,0,0,13,13,1,'#263d35',cup);cupDisc.castShadow=false;cupDisc.name='cup-opening';
  const lip=torus(0,1,0,13,1.5,mat('#d6dcc0',.2,.4),cup);lip.rotation.x=Math.PI/2;
  const flagOffset=index===1?65:21;
  cylinder(flagOffset,44,0,1.5,1.5,88,'#ece6cd',cup);
  const flagGeo=new THREE.PlaneGeometry(33,22,8,3),flag=mesh(flagGeo,new THREE.MeshStandardMaterial({color:'#d9654d',side:THREE.DoubleSide,roughness:.8}),flagOffset+16,78,0,cup);flag.name='cup-flag';
  let burgerGuide=null;
  if(index===1){
    // The guide sits beyond the bun's footprint; the flag and connector point
    // to the covered opening without being hidden inside the burger model.
    burgerGuide=torus(0,1.8,0,56,2.3,mat('#edc569',.15,.4),cup);burgerGuide.rotation.x=Math.PI/2;burgerGuide.castShadow=false;
    beam(new THREE.Vector3(56,1.8,0),new THREE.Vector3(flagOffset,1.8,0),1.5,'#edc569',cup);
  }
  const flagPos=flagGeo.attributes.position,flagOriginal=Float32Array.from(flagPos.array);
  const ball=mesh(new THREE.SphereGeometry(7,32,24),mat('#f9f4de',.05,.2),l.start[0],h(...l.start)+7,l.start[1]);
  dynamic(ball);
  const ballMark=torus(0,0,0,7.03,.35,'#b95845',ball);ballMark.rotation.y=Math.PI/2;
  const ring=torus(l.start[0],h(...l.start)+1,l.start[1],18,1.4,'#f9df8f');ring.rotation.x=Math.PI/2;dynamic(ring);ring.castShadow=false;
  const aimLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#ffec9b',dashSize:9,gapSize:6,depthTest:false}));aimLine.renderOrder=10;root.add(aimLine);
  const marker=torus(0,0,0,10,1.8,'#f8ce67');marker.rotation.x=Math.PI/2;dynamic(marker);marker.castShadow=false;
  // Batch static meshes by material. Animated objects remain independent.
  root.updateMatrixWorld(true);
  const batches=new Map(),remove=[];
  root.traverse(o=>{
    if(!o.isMesh||o===terrain)return;
    for(let parent=o;parent&&parent!==root;parent=parent.parent)if(parent.userData.dynamic)return;
    const key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow;
    if(!batches.has(key))batches.set(key,{material:o.material,cast:o.castShadow,receive:o.receiveShadow,geometries:[]});
    const g=o.geometry.clone().applyMatrix4(o.matrixWorld);
    for(const name of Object.keys(g.attributes))if(!['position','normal'].includes(name))g.deleteAttribute(name);
    batches.get(key).geometries.push(g.index?g.toNonIndexed():g);remove.push(o);
  });
  for(const o of remove)o.removeFromParent();
  for(const batch of batches.values()){
    const geometry=mergeGeometries(batch.geometries,false),m=new THREE.Mesh(geometry,batch.material);m.castShadow=batch.cast;m.receiveShadow=batch.receive;root.add(m);for(const g of batch.geometries)g.dispose();
  }
  function update(s,input={},aim=null,power=35){
    for(const fn of animations)fn(s,input);
    const active=obstacles(s);for(const w of walls)if(w.moving)w.g.visible=active.includes(w.r);
    const b=s.ball;ball.position.set(b.x,h(b.x,b.y)+7,b.y);ball.visible=!s.sunk;
    ball.rotation.x=b.y/7;ball.rotation.z=-b.x/7;ring.position.set(b.x,h(b.x,b.y)+1,b.y);ring.visible=!s.sunk&&Math.hypot(b.vx,b.vy)<2;
    const c=cupPosition(s);cup.position.set(c.x,h(c.x,c.y)+.7,c.y);lip.material.color.set(unlocked(s)?'#e7dfa9':'#c88c72');
    if(burgerGuide)burgerGuide.material.color.set(unlocked(s)?'#a8efb0':'#edc569');
    for(let i=0;i<flagPos.count;i++){const x=flagOriginal[i*3],y=flagOriginal[i*3+1];flagPos.setZ(i,Math.sin(s.time*3+x*.13+y*.04)*(x+16.5)/12);}flagPos.needsUpdate=true;flagGeo.computeVertexNormals();
    aimLine.visible=!!aim&&ring.visible;marker.visible=aimLine.visible;
    if(aimLine.visible){
      const dx=aim.x-b.x,dz=aim.y-b.y,d=Math.hypot(dx,dz)||1,length=50+power*2.3,points=[];
      for(let i=0;i<24;i++){const f=i/23,x=b.x+dx/d*length*f,z=b.y+dz/d*length*f;points.push(new THREE.Vector3(x,h(x,z)+10,z));}
      aimLine.geometry.dispose();aimLine.geometry=new THREE.BufferGeometry().setFromPoints(points);aimLine.computeLineDistances();marker.position.set(aim.x,h(aim.x,aim.y)+2,aim.y);
    }
  }
  function dispose(){const geos=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);});for(const g of geos)g.dispose();for(const g of geometryCache.values())g.dispose();for(const m of mats)m.dispose();sun.shadow.map?.dispose();}
  return {scene,terrain,root,update,dispose,ball,ring,outline,index};
}

export function createRenderer(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const camera=createCamera();let world=null,lastW=0,lastH=0;
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  function resize(){const r=canvas.getBoundingClientRect(),w=Math.round(r.width),hh=Math.round(r.height);if(w===lastW&&hh===lastH)return;lastW=w;lastH=hh;renderer.setSize(w,hh,false);const size=900;camera.left=-size*w/hh/2;camera.right=size*w/hh/2;camera.top=size/2;camera.bottom=-size/2;camera.updateProjectionMatrix();}
  return {
    draw(s,input,aim,power){resize();if(world?.index!==s.index){world?.dispose();world=createWorld(s.index);}world.update(s,input,aim,power);renderer.render(world.scene,camera);},
    pick(clientX,clientY){resize();const r=canvas.getBoundingClientRect();ndc.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);const point=pickCourse(ray,world);return point?{x:point.x,y:point.z}:null;},
    dispose(){world?.dispose();renderer.dispose();},
  };
}
