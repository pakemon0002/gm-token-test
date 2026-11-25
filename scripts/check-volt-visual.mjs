import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.GM_PLAYWRIGHT_MODULE||'playwright');
const pub=resolve('miniapp/public'),assets=resolve('public');
const requests=[];
const server=createServer((req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;requests.push(p);
 const root=p.startsWith('/assets/gpu-v3/')?assets:pub;
 try{const file=resolve(root,'.'+(p==='/'?'/volt-preview.html':p));if(!file.startsWith(root+'/'))throw Error('invalid');res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream'});res.end(readFileSync(file))}catch{res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 mkdirSync('volt-screenshots',{recursive:true});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto(origin,{waitUntil:'networkidle'});
 const check=async(name,selector)=>{await page.locator(selector).waitFor();await page.waitForTimeout(250);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),name+' horizontal overflow');
 const bad=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src));assert.deepEqual(bad,[],name+' broken artwork');
 assert.ok(!(await page.locator('body').innerText()).includes('GM TOKEN'),name+' old name');
 await page.screenshot({path:'volt-screenshots/'+name+'.png',fullPage:true});};
 await check('01-farm','.hero');
 await page.getByRole('button',{name:'TON',exact:true}).click();assert.equal(await page.getByRole('button',{name:'TON',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Запустить ферму'}).click();await page.waitForTimeout(1200);assert.ok(Number(await page.locator('[data-value=xp]').innerText())>0);
 await page.getByRole('button',{name:'Остановить ферму'}).click();
 await page.locator('.shortcuts button').first().click();await check('03-upgrades','.module-art');
 await page.locator('.module-tabs button').nth(1).click();assert.equal(await page.locator('.module-name').innerText(),'Блок питания');
 await page.locator('#dock button').nth(1).click();await check('02-shop','.product');assert.equal(await page.locator('.product').count(),4);
 await page.locator('#dock button').nth(4).click();await check('04-profile','.avatar');
 await page.getByRole('button',{name:'Сменить аватар'}).click();await page.getByRole('button',{name:'Аватар robot'}).click();assert.match(await page.locator('.avatar .portrait').getAttribute('src'),/avatar-robot.png$/);
 await page.locator('#dock button').nth(2).click();await page.getByRole('button',{name:'Готово',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Выполнено'}).isDisabled());
 await page.locator('#dock button').nth(3).click();assert.match(await page.locator('#screen').innerText(),/нет общего рейтинга/);
 assert.deepEqual(errors,[]);assert.ok(!requests.some(p=>p.startsWith('/api/')),'prototype must not call production economy');
 console.log('PASS: four reference screens, all artwork, five-tab navigation, XP simulation, local avatar and task');
}finally{await browser.close();server.close()}
