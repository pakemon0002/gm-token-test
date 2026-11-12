import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('splash gets its own outer frame and scroll host while regular screens remain unchanged',()=>{
 const app=read('miniapp/src/main.tsx');
 const markup=app.slice(app.lastIndexOf('return <div className={\'application theme-'),app.indexOf(' {toast&&<div',app.lastIndexOf('return <div className={\'application theme-')));
 assert.ok(markup.includes("screen==='splash'?' gm-splash-active':''"),'screen-specific app class');
 assert.ok(markup.includes("screen==='splash'?' gm-splash-frame':''"),'frame background isolation');
 assert.ok(markup.includes("'no-scroll gm-splash-host'"),'scroll padding isolation');
 assert.ok(markup.includes("((screen==='splash')"),'class is only used while splash is active');
 assert.ok(markup.includes("{view}"),'original routing preserved');
});

test('Telegram global scroll padding is explicitly cancelled for splash on all edges',()=>{
 const css=read('miniapp/public/styles.css');
 assert.equal(css,read('miniapp/src/styles.css'),'served CSS and source CSS should match');
 assert.match(css,/\.application\.is-telegram \.phone-scroll\{padding-top:/,'global Telegram padding exists');
 assert.match(css,/\.application\.is-telegram \.phone-scroll\{[\s\S]*?padding-bottom:/,'global Telegram bottom padding exists');
 const patch=css.slice(css.indexOf('GM TOKEN 3.4 — fix the host viewport'));
 assert.ok(patch.length>1200,'3.4 viewport patch must be present');
 for(const term of [
  '.application.is-telegram .phone-scroll.gm-splash-host{',
  'padding-top:0!important;padding-right:0!important;',
  'padding-bottom:0!important;padding-left:0!important;',
  '.application .phone-frame.gm-splash-frame::before',
  'content:none!important;display:none!important;',
  '.application .gm-splash-host>.splash-view.gm-splash-v4{',
  'height:100%!important;min-height:100%!important'
 ])assert.ok(patch.includes(term),'missing host-viewport fix: '+term);
});

test('splash host has stable full-height layout and does not change other pages',()=>{
 const css=read('miniapp/public/styles.css');
 const patch=css.slice(css.indexOf('GM TOKEN 3.4 — fix the host viewport'));
 assert.ok(patch.includes('.application.is-telegram.gm-splash-active .device-stage'));
 assert.ok(patch.includes('.application.is-telegram.gm-splash-active .phone-frame.gm-splash-frame'));
 assert.ok(patch.includes('min-height:100dvh!important;height:100dvh!important'));
 assert.ok(!patch.includes('.application.is-telegram .phone-scroll{'),'no blanket scrolling changes');
 assert.ok(patch.includes('@media(max-height:520px)'), 'short phone fallback');
});
