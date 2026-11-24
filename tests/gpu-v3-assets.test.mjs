import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root));
test('All V3 artwork and models match SHA-256 manifest',()=>{
 const prefix='public/assets/gpu-v3/';
 const m=JSON.parse(read(prefix+'manifest.json'));
 assert.equal(m.version,'3');
 assert.equal(Object.keys(m.files).length,322);
 for(const [path,hash] of Object.entries(m.files)){
  assert.match(path,/^[a-zA-Z0-9_./-]+$/);
  assert.ok(!path.split('/').includes('..'));
  assert.equal(createHash('sha256').update(read(prefix+path)).digest('hex'),hash,path);
 }
 for(const path of m.required)assert.ok(Object.hasOwn(m.files,path),path);
});
test('V3 renders are wired to both source and compiled WebView bundle',()=>{
 for(const path of ['miniapp/src/main.tsx','miniapp/public/main.js']){
  const s=read(path).toString();
  for(const term of ['class V3Scene','class V3Catalog','class V3ProfileArt','/assets/gpu-v3/','GMViewer','rig-live','v3-nav-icon','v3-rank-art'])assert.ok(s.includes(term),path+' '+term);
  const component=s.slice(s.indexOf('class V3Scene'),s.indexOf('function GButton'));
  assert.ok(!component.includes('sendTransaction('));
  assert.ok(!component.includes('/api/'));
 }
 const css=read('miniapp/src/styles.css').toString();assert.equal(css,read('miniapp/public/styles.css').toString());
 for(const x of ['farm-lab.webp','.v3-stage','.v3-catalog-grid','.v3-avatar-picker','prefers-reduced-motion'])assert.ok(css.includes(x),x);
});
