import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../miniapp/src/main.tsx',import.meta.url),'utf8');
const calendar=app.slice(app.indexOf('class AutumnCalendar extends React.Component'),app.indexOf('function App(){'));

test('calendar displays canonical XP separately from earned HP and box inventory',()=>{
 assert.match(calendar,/Опыт профиля:/);
 assert.match(calendar,/String\(data\.xp\?\?0\)\+' XP/);
 assert.match(calendar,/Уровень '\+String\(data\.level\?\?1\)/);
 assert.match(calendar,/e\('span',null,'HP'\)/);
 assert.match(calendar,/e\('span',null,'Боксы'\)/);
 assert.match(calendar,/gm-calendar-xp-summary/);
});
test('calendar claim never acknowledges a failed server request as a success',()=>{
 assert.match(calendar,/const result = await this\.props\.api\('\/api\/autumn-calendar\/claim', \{\}\)/);
 assert.match(calendar,/if \(result\?\.reward_type && Number\.isSafeInteger\(Number\(result\.reward_amount\)\)\)/);
 assert.match(calendar,/result\.reward_type\.endsWith\('_box'\)/);
 assert.match(calendar,/Начислено: '\+quantity\+' '\+label/);
 assert.match(calendar,/Не удалось подтвердить получение/);
 assert.match(calendar,/if \(result && this\.props\.onClaim\) await this\.props\.onClaim\(\)/);
 assert.match(calendar,/role:'status','aria-live':'polite'/);
});
test('calendar XP/HP feedback matches Premium Silver/Graphite',()=>{
 const css=readFileSync(new URL('../miniapp/src/styles.css',import.meta.url),'utf8');
 assert.match(css,/\.gm-calendar-feedback\{/);
 assert.match(css,/\.gm-calendar-xp-summary\{/);
 assert.match(css,/color:var\(--ink\)/);
 assert.equal(css,readFileSync(new URL('../miniapp/public/styles.css',import.meta.url),'utf8'));
});
