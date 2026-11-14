import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../miniapp/src/main.tsx',import.meta.url),'utf8');

test('new @GmTokenApp first-run experience does not reuse old bot localStorage flags',()=>{
 const intro=app.match(/const onboardingKey=\(\)=>authenticatedUserId\?'([^']+)'\+authenticatedUserId:'';/);
 const tour=app.match(/const tutorialKey=\(section:string\)=>'([^']+)'\+authenticatedUserId\+'_\'\+section;/);
 assert.ok(intro&&intro[1].includes('gmtokenapp'),'onboarding key must be bot scoped');
 assert.ok(tour&&tour[1].includes('gmtokenapp'),'tour completion must be bot scoped');
 assert.match(app,/const tutorialKey=\(section:string\)=>'gm_tour_v25_gmtokenapp_'\+authenticatedUserId\+'_\'\+section;/);
 assert.ok(!app.includes("'gm_tour_v24_'+authenticatedUserId"));
 assert.ok(!app.includes("'gm_intro_v24_'+authenticatedUserId"));
 assert.match(app,/store\.getItem\(onboardingKey\(\)\)\?'home':'intro'/);
 assert.match(app,/store\.getItem\(tutorialKey\(screen\)\)/);
 assert.match(app,/store\.setItem\(onboardingKey\(\),'1'\)/);
 assert.match(app,/store\.setItem\(tutorialKey\(guideScreen\),'1'\)/);
});

test('the home Boxes step highlights the boxes card, NEVER the nearby mining card',()=>{
 const home=app.slice(app.indexOf('function Home(){'),app.indexOf('function Trading(){'));
 assert.match(app,/\['gift','boxes','\.gm-home-offer\[data-guide="boxes"\]','home\.reward'\]/);
 const mining=home.match(/className:'gm-home-offer gm-premium-card','data-guide':'mining'/g)||[];
 const boxes=home.match(/className:'gm-home-offer gm-premium-card','data-guide':'boxes'/g)||[];
 assert.equal(mining.length,1);
 assert.equal(boxes.length,1);
 assert.match(home,/onClick:\(\)=>goto\('boxes'\)/);
 assert.match(home,/Открывай боксы за POINTS/);
});

test('tour finds targets inside the live Mini App, not unrelated desktop or hidden UI',()=>{
 const matches=app.match(/document\.querySelector\('\.phone-scroll'\)\?\.querySelector\(selector\)/g)||[];
 assert.equal(matches.length,2,'both alignment and scroll targets must be scoped to active phone');
 assert.match(app,/\{guideScreen&&GuideOverlay\(\)\}/);
 assert.match(app,/if\(!guideScreen\|\|!guideCatalog\[guideScreen\]\)return null/);
});

test('replaying introduction from Settings always starts at step 1 and is available after completion',()=>{
 assert.match(app,/resetGuide\(\);if\(route==='intro'\)setIntroStep\(0\);setScreen\(route\)/);
 assert.match(app,/className:'gm-settings-onboard gm-premium-card',onClick:\(\)=>goto\('intro'\)/);
 assert.match(app,/className:'gm-settings-onboard gm-premium-card',onClick:\(\)=>openGuide\('settings'\)/);
});
