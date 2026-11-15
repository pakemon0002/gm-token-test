import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../miniapp/src/main.tsx',import.meta.url),'utf8');
const built=readFileSync(new URL('../miniapp/public/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../miniapp/src/styles.css',import.meta.url),'utf8');
const servedCss=readFileSync(new URL('../miniapp/public/styles.css',import.meta.url),'utf8');
const game=readFileSync(new URL('../server/game.mjs',import.meta.url),'utf8');

test('no flame or fire visuals remain on any screen',()=>{
 for(const code of [app,built]){
  assert.doesNotMatch(code,/GrowingStreakFlame|gm-streak-flame|nextFlameStage|icon\(['"]flame|[Оо]гон[её]к|пламя/i);
  assert.ok(code.includes('StreakDaysBadge'));
  assert.ok(code.includes('Заходи ежедневно и сохраняй серию'));
 }
 assert.doesNotMatch(css,/gm-streak-flame|gm-streak-fire|gm-streak-pulse|gm-streak-ignite/);
 assert.equal(css,servedCss,'CSS published unchanged from source');
});

test('no change to authenticated Daily Streak accounting or calendar',()=>{
 assert.ok(app.includes('liveState?.daily?.streak??wallet.streak??0'));
 assert.ok(app.includes('streak:Math.max(0,Math.floor(Number(liveState?.daily?.streak??wallet.streak??0)||0))'));
 assert.ok(app.includes("e(StreakDaysBadge,{days:streakDays})"));
 assert.ok(app.includes("e(StreakDaysBadge,{days:Number(this.props.streak||0)})"));
 assert.ok(game.includes('const active=claimed||last===yesterday'));
 assert.ok(game.includes('const streak=active?current:0;'));
});

test('clean premium day badges for light and dark screens and reward route',()=>{
 for(const selector of ['.gm-home-streak','.gm-streak-calendar','.gm-streak-day-mark',
 '.theme-light .gm-streak-day-mark','.theme-dark .gm-streak-day-mark',
 '.theme-light .gm-home-streak','.theme-dark .gm-home-streak','.gm-streak-overview'])
 assert.ok(css.includes(selector),selector);
 assert.ok(app.includes("top('Серия дней',true,'clock')"));
 assert.ok(app.includes("onClick:()=>goto('reward')"));
 const badge=app.slice(app.indexOf('function StreakDaysBadge'),app.indexOf('function PlayerAvatar'));
 assert.ok(!/fetch\(|api\(|store\.setItem|walletChange/.test(badge));
});
