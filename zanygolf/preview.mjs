// Export the exact playable 3D model. Usage: node zanygolf/preview.mjs output.glb 0
import { createWorld, createCamera } from './src/world3d.js';
import { createGame } from './src/physics.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+blob.type+';base64,'+Buffer.from(b).toString('base64');this.onloadend?.();});}
};
const output=process.argv[2]||'work/zanygolf-course.glb',index=Number(process.argv[3]||0);
const world=createWorld(index),s=createGame(index);s.time=1;s.burger=.3;world.update(s,{},null);
const camera=createCamera();camera.name='GameCamera';world.scene.add(camera);
for(const o of [...world.scene.children])if(o.isLight)world.scene.remove(o);
const result=await new GLTFExporter().parseAsync(world.scene,{binary:true});
await mkdir(dirname(output),{recursive:true});await writeFile(output,Buffer.from(result));world.dispose();
console.log('Exported course',index+1,'to',output);
