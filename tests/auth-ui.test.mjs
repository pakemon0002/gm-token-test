import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
// TSC emits semantically equivalent whitespace; verify the same tokens across TSX and JS.
const has=(code,fragment)=>code.replace(/\s+/g,'').includes(fragment.replace(/\s+/g,''));
test('auth button invokes Telegram native navigation with browser fallback',()=>{
 for(const path of ['../miniapp/src/main.tsx','../miniapp/public/main.js']){
  const s=read(path);
  assert.ok(has(s,'openTelegramLink(url)'));
  assert.ok(has(s,'window.location.assign(url)'));
  assert.ok(has(s,'Открыть чат бота')||has(s,'auth-cta-copy'),'Telegram chat CTA exists');
 }
});
test('auth has original GM themed icons and matching CTA contrast rules',()=>{
 const src=read('../miniapp/src/main.tsx');
 assert.ok(has(src,'name="diamond"'));
 assert.ok(has(src,'name="gm-coin-orbit"'));
 for(const path of ['../miniapp/src/styles.css','../miniapp/public/styles.css']){
  const s=read(path);
  assert.ok(has(s,'auth-page.theme-light .auth-cta'));
  assert.ok(has(s,'auth-page.theme-dark .auth-cta'));
 }
});
