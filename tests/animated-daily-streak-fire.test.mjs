import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../miniapp/src/main.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../miniapp/src/styles.css',import.meta.url),'utf8');
const game=readFileSync(new URL('../server/game.mjs',import.meta.url),'utf8');
const getStreakStage=()=>{
 const match=app.match(/function streakStage\(days:number\)\{\s*([\s\S]*?)\n\}/);
 assert.ok(match,'streakStage must exist');
 return new Function('days',match[1]);
};

test('animated fire grows through 0/1-4/5-9/10-19/20-29/30+ stages',()=>{
 const stage=getStreakStage();
 const points=[[0,0],[1,1],[4,1],[5,2],[9,2],[10,3],[19,3],[20,4],[29,4],[30,5],[999,5]];
 for(const [days,expected] of points)assert.equal(stage(days),expected,'days '+days);
 for(const n of [NaN,-1,-100])assert.equal(stage(n),0);
});

test('flame uses only server-verified daily claim streak, not calendar grid day',()=>{
 assert.ok(app.includes('liveState?.daily?.streak??wallet.streak??0'));
 assert.ok(app.includes('streak:Math.max(0,Math.floor(Number(liveState?.daily?.streak??wallet.streak??0)||0))'));
 assert.ok(app.includes("e(GrowingStreakFlame,{days:streakDays,placement:'home'})"));
 assert.ok(app.includes("e(GrowingStreakFlame,{days:Number(this.props.streak||0),placement:'calendar'})"));
 assert.ok(app.includes("onClick:()=>goto('reward')"));
 assert.ok(game.includes('const active=claimed||last===yesterday'));
 assert.ok(game.includes('const streak=active?current:0;'));
});

test('animated silver fire works on both premium themes with limited brightness and reduced motion',()=>{
 for(const selector of ['.gm-home-streak','.gm-streak-calendar','.gm-streak-flame-art','.gm-streak-flame-glow',
  '.gm-streak-flame-stage-0','.gm-streak-flame-stage-1','.gm-streak-flame-stage-2',
  '.gm-streak-flame-stage-3','.gm-streak-flame-stage-4','.gm-streak-flame-stage-5',
  '.theme-dark .gm-home-streak','.theme-dark .gm-streak-calendar'])assert.ok(css.includes(selector),selector);
 for(const animation of ['gm-flame-sway','gm-flame-inner','gm-flame-spark','gm-flame-halo'])assert.ok(css.includes('@keyframes '+animation),animation);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.gm-streak-flame-art,.gm-streak-flame-glow,.gm-streak-flame-inner,.gm-streak-flame-spark\{animation:none!important/);
 assert.ok(app.includes('aria-hidden="true"'));
 assert.ok(app.includes("'aria-label':'Daily Streak: '"));
 assert.ok(app.includes("'aria-label':'Серия ежедневных наград: '"));
});

test('visual flame introduces no new rewards, payment routes or balances',()=>{
 const count=(needle)=>(app.match(new RegExp(needle,'g'))||[]).length;
 assert.ok(count('GrowingStreakFlame')>=3);
 const body=app.slice(app.indexOf('function GrowingStreakFlame'),app.indexOf('function PlayerAvatar'));
 assert.ok(!/fetch\(|api\(|store\.setItem|walletChange|gmToken/.test(body));
 assert.ok(app.includes('Осенний календарь'));
});
