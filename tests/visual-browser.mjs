// Runtime smoke test for the actual compiled Mini App, using React UMD and jsdom.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../miniapp/package.json',import.meta.url));
const {JSDOM,VirtualConsole}=require('jsdom');
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const errors=[];
const virtualConsole=new VirtualConsole();
virtualConsole.on('jsdomError',e=>errors.push(e.message));
virtualConsole.on('error',e=>errors.push(String(e)));
const dom=new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>',{
 url:'https://gm-token-test-iprj.onrender.com/preview.html',
 runScripts:'outside-only',pretendToBeVisual:true,virtualConsole
});
const win=dom.window;
win.localStorage.setItem('gm_lang','pt');
win.localStorage.setItem('gm_onboarding_complete','1');
win.Telegram={WebApp:{initData:'signed-in-qa',initDataUnsafe:{user:{id:123456,username:'visualqa',language_code:'pt'}},
 ready(){},expand(){},setBackgroundColor(){},colorScheme:'dark'}};
const calls=[];
const upgradeLevels=Array.from({length:200},(_,i)=>({level:i+1,cost_gm:i===0?0:i===1?150:200,bonus_pct:i===0?0:10}));
win.fetch=async(url,options={})=>{
 const path=String(url);calls.push({path,method:options.method||'GET'});
 let data={};
 if(path.includes('/api/bootstrap'))data={user:{id:'123456',username:'visualqa',role:'owner',level:1,xp:0},wallet:{gm:0,cr:500000,vault:0}};
 else if(path.includes('/api/game/status'))data={user:{level:1,xp:0,username:'visualqa',pioneer_rank:1},wallet:{gm:0,cr:500000,vault:0},mining:{pending_cents:0,rate_cents_day:1000,upgrade:{level:1,max_level:200,bonus_pct:0,next_level:2,next_cost_gm:150,next_bonus_pct:10}},points:{points:0},daily:{streak:0,last_claim_day:''},config:{boxes_enabled:false,box_rewards:{},daily_reward_gm:0}};
 else if(path.includes('/api/mining/upgrades'))data={levels:upgradeLevels,upgrade:{level:1,max_level:200,bonus_pct:0,next_level:2,next_cost_gm:150,next_bonus_pct:10},wallet_upgrade_required:true,game_purchase_enabled:false};
 else if(path.includes('/api/market/ohlcv'))data={candles:[]};
 else if(path.includes('/api/leaderboard'))data={users:[],pending_rule:true};
 else if(path.includes('/api/referrals/me'))data={referred:[]};
 else if(path.includes('/api/tasks'))data={tasks:[]};
 else if(path.includes('/api/achievements'))data={achievements:[],pioneer_rank:1};
 else if(path.includes('/api/market/ticker'))data={premarket:false};
 else if(path.includes('/api/exchange/orders'))data={orders:[]};
 else if(path.includes('/api/exchange/book'))data={bids:[],asks:[]};
 else if(path.includes('/api/exchange/trades'))data={trades:[]};
 return {ok:true,status:200,json:async()=>data};
};
try{
 win.eval(read('../miniapp/public/vendor/react.production.min.js'));
 win.eval(read('../miniapp/public/vendor/react-dom.production.min.js'));
 win.eval(read('../miniapp/public/main.js'));
 await new Promise(resolve=>setTimeout(resolve,1450));
 assert.ok(!errors.length,'Uncaught UI error: '+errors.join(' | '));
 const text=()=>win.document.body.textContent||'';
 assert.match(text(),/Início/,'Portuguese navbar must render');
 assert.ok(!win.document.querySelector('.auth-page'),'signed-in visitor must see app');
 const nav=[...win.document.querySelectorAll('.nav-entry')].find(x=>x.textContent.includes('Mineração'));
 assert.ok(nav,'Portuguese Mining navbar must exist');
 nav.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
 await new Promise(resolve=>setTimeout(resolve,1000));
 assert.ok(!errors.length,'Opening mining must not crash: '+errors.join(' | '));
 assert.ok(win.document.querySelector('.gm-mining-upgrades'),'200-level section must appear');
 assert.match(text(),/Melhorias de mineração/,'Mining section must actually be in Portuguese');
 assert.ok(win.document.querySelector('.gm-tour-card'),'first-time contextual guide must open');
 const skip=win.document.querySelector('.gm-tour-bar button');
 skip?.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
 await new Promise(resolve=>setTimeout(resolve,150));
 const walletLink=win.document.querySelector('.gm-upgrades-purchase');
 assert.ok(walletLink,'mining must offer external wallet flow');
 walletLink.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
 await new Promise(resolve=>setTimeout(resolve,250));
 assert.ok(!calls.some(x=>x.path.includes('/api/mining/upgrade')&&x.method==='POST'),'must NOT charge in-game GM for upgrades');
 assert.ok(win.document.querySelector('.gm-wallet-page'),'wallet page must open');
 assert.match(text(),/Carteira externa GM/,'wallet flow must translate to Portuguese');
 assert.ok(!errors.length,'UI must run without uncaught errors: '+errors.join(' | '));
 console.log('PASS: Portuguese real DOM, splash/auth, Mining onboarding, external wallet routing and no game-GM charges.');
}finally{
 win.close();
}
