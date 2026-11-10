import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('auth button invokes Telegram native navigation with browser fallback',()=>{
 for(const path of ['../miniapp/src/main.tsx','../miniapp/public/main.js']){
  const s=read(path);
  assert.ok(s.includes('openTelegramLink(url)'));
  assert.ok(s.includes('window.location.assign(url)'));
  if(path.includes('/src/'))assert.ok(s.includes('Открыть чат бота'),'source must keep Telegram access CTA');
 }
});
test('auth has original GM themed icons and matching CTA contrast rules',()=>{
 const src=read('../miniapp/src/main.tsx');
 assert.ok(src.includes('name="diamond"'));
 assert.ok(src.includes('name="gm-coin-orbit"'));
 for(const path of ['../miniapp/src/styles.css','../miniapp/public/styles.css']){
  const s=read(path);
  assert.ok(s.includes('auth-page.theme-light .auth-cta'));
  assert.ok(s.includes('auth-page.theme-dark .auth-cta'));
 }
});
