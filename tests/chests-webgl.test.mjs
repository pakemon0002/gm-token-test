import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const file=new URL('../miniapp/public/assets/chests/gm-chest-3d.js',import.meta.url);
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('procedural chests are genuine 3D meshes, with independent moving lid and fallback',()=>{
 execFileSync(process.execPath,['--check',file.pathname]);
 const engine=readFileSync(file,'utf8');
 for(const feature of ['getContext("webgl"','const meshes=shape()','uniform float uYaw,uPitch,uLid,uIsLid,uSize',
  'gl.drawArrays(gl.TRIANGLES','requestAnimationFrame','pointerdown','IntersectionObserver',
  'prefers-reduced-motion: reduce','document.hidden','window.GMChest3D']){
   assert.ok(engine.includes(feature),'missing real 3D feature: '+feature);
 }
 assert.ok(engine.includes('return null;'),'unsupported WebGL must retain SVG');
 assert.ok(!engine.includes('http://')&&!engine.includes('https://'),'renderer must not need remote CDNs');
});
test('3D renderer is served before game boot and binds to actual chest UI',()=>{
 const html=read('miniapp/public/preview.html'),viteHtml=read('miniapp/index.html'),
       ui=read('miniapp/src/main.tsx'),style=read('miniapp/public/styles.css');
 assert.ok(html.indexOf('gm-chest-3d.js')>=0);
 assert.ok(html.indexOf('gm-chest-3d.js')<html.indexOf('main.js'));
 assert.ok(viteHtml.includes('gm-chest-3d.js'));
 assert.ok(ui.includes('renderer.mountAll()'));
 assert.ok(ui.includes("'data-gm-chest':selected.kind"));
 assert.ok(ui.includes("'data-gm-chest-open':'true'"));
 assert.ok(style.includes('.gm-chest-stage-art.gm-chest-rendered>img'));
 assert.ok(style.includes('.gm-chest-3d:not(.gm-chest-rendered)>.gm-chest-3d-canvas'));
});
test('POINTS tour is directly accessible and does not mutate balances',()=>{
 const source=read('miniapp/src/main.tsx'),css=read('miniapp/src/styles.css');
 const boxes=source.slice(source.indexOf('function Boxes(){'),source.indexOf('function BoxRevealModal(){'));
 assert.ok(boxes.includes('gm-chests-points-tour'));
 assert.ok(boxes.includes("openGuide('points')"));
 assert.ok(boxes.includes('setPointsGuideOpen(true)'));
 assert.ok(css.includes('.gm-chests-tutorial-row'));
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
});
