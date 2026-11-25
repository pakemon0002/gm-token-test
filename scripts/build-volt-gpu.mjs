import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const sandbox={window:{}};runInNewContext(readFileSync('public/assets/gpu-v3/3d/model-data.js','utf8'),sandbox);
const models=sandbox.window.GM_MODELS;
if(!models)throw Error('Missing GPU geometry');
mkdirSync('miniapp/public/volt-gpu-models',{recursive:true});
for(const id of ['4060','4070','4080','4090']){
 const parts=models['gpu-'+id];if(!Array.isArray(parts)||!parts.some(p=>p[3]))throw Error('Missing fan geometry '+id);
 // Pack geometry into a single little-endian float buffer, avoiding large JS mesh scripts.
 const meta=[],floats=[];for(const [v,n,c,f,p,g] of parts){const offset=floats.length;for(let i=0;i<v.length;i++)floats.push(...v[i],...n[i]);meta.push({offset,count:v.length,color:c,fan:f||null,pivot:p,glow:!!g})}
 const header=Buffer.from(JSON.stringify(meta));const padded=(header.length+3)&~3;const out=Buffer.alloc(4+padded+floats.length*4);out.writeUInt32LE(header.length,0);header.copy(out,4);for(let i=0;i<floats.length;i++)out.writeFloatLE(floats[i],4+padded+4*i);
 writeFileSync('miniapp/public/volt-gpu-models/'+id+'.bin',out);console.log(id,'parts',parts.length,'fans',parts.filter(p=>p[3]).length,'bytes',out.length);
}
