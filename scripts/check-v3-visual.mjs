import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.GM_PLAYWRIGHT_MODULE||'playwright');
const publicRoot=resolve('miniapp/public'),assetRoot=resolve('public');
const served=readFileSync(resolve(publicRoot,'main.js'),'utf8');
const server=createServer((req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;
 if(p.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});return res.end('{"error":"isolated visual test"}')}
 const root=p.startsWith('/assets/gpu-v3/')?assetRoot:publicRoot;
 try{const path=resolve(root,'.'+(p==='/'?'/preview.html':p));if(!path.startsWith(root+'/'))throw Error('invalid');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'}[extname(path)]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime});res.end(readFileSync(path))}catch{res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const errors=[];const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 page.on('pageerror',err=>errors.push(err.message));
 await page.addInitScript(()=>{window.Telegram={WebApp:{initData:'isolated-preview',initDataUnsafe:{user:{id:123,username:'Preview'}},colorScheme:'dark',ready(){},expand(){},setBackgroundColor(){},setHeaderColor(){},onEvent(){},offEvent(){}}};localStorage.setItem('gm_reference_theme','dark')});
 await page.route('**/*',async route=>{const url=route.request().url();if(!url.startsWith(origin))return route.abort();if(new URL(url).pathname==='/main.js'){
  // Test-only isolated state; production code and authentication are untouched.
  const js=served.replace("React.useState('splash')","React.useState('mining')").replace('const [demo, setDemo] = React.useState(true)','const [demo, setDemo] = React.useState(false)').replace('const init = webapp?.initData;',"const init = '';");
  assert.notEqual(js,served);return route.fulfill({contentType:'text/javascript',body:js})}return route.continue()});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('.v3-ref-farm-hero').waitFor({timeout:15000});
 const capture=async(name,selector)=>{await page.locator(selector).waitFor();await page.waitForTimeout(300);await page.evaluate(()=>document.querySelector('.phone-scroll')?.scrollTo(0,0));const bounds=await page.locator(selector).boundingBox();assert.ok(bounds&&bounds.width>200,name+' bounds');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),name+' horizontal overflow');const broken=await page.locator('img[src*="/assets/gpu-v3/"]').evaluateAll(imgs=>imgs.filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src));assert.deepEqual(broken,[],name+' missing images');const shot=await page.screenshot({type:'jpeg',quality:65});console.log('VISUAL_'+name+'='+shot.toString('base64'))};
 await capture('farm','.v3-ref-farm-hero');
 await page.locator('.v3-ref-shortcuts button').first().click();await capture('upgrades','.v3-ref-module');await page.locator('.v3-ref-module-tabs button').nth(1).click();assert.equal(await page.locator('.v3-ref-module h2').textContent(),'Блок питания');
 await page.locator('.bottom-nav button').nth(1).click();await capture('shop','.v3-ref-catalog');assert.equal(await page.locator('.v3-ref-product').count(),4);
 await page.locator('.bottom-nav button').nth(4).click();await capture('profile','.v3-profile-art');
 assert.deepEqual(errors,[],'browser runtime errors');
 console.log('PASS: four reference screens rendered at mobile viewport; no broken V3 images or JS errors');
}finally{await browser.close();server.close()}
