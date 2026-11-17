#!/usr/bin/env node
// Test-only Acton template hardening inside local TVM emulator. No wallet signing or chain writes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const project=resolve(root,process.argv[2]||'gmtest-acton');
if(!project.startsWith(root+'/'))throw Error('Refuse modifications outside temporary GMTEST project');
const update=(name,oldText,newText)=>{
 const file=join(project,name),before=readFileSync(file,'utf8');
 if(before.split(oldText).length!==2)throw Error('Acton template changed; refusing unsafe patch: '+name+' / '+oldText.slice(0,80));
 writeFileSync(file,before.replace(oldText,newText));
};
const tick=String.fromCharCode(96);
const removeSupersededTest=(path,name,nextName)=>{
 const file=join(project,path),s=readFileSync(file,'utf8');
 const a=s.indexOf('get fun '+tick+name+tick+'() {');
 const b=s.indexOf('get fun '+tick+nextName+tick+'() {',a);
 if(a<0||b<0||b-a>9000)throw Error('Expected Acton test missing: '+name);
 writeFileSync(file,s.slice(0,a)+'// The uncapped-template test below is replaced by gmtest-cap.test.tolk.\n\n'+s.slice(b));
};
// 150m whole GMTEST x 10^6 decimals. Maximum OUTSTANDING supply (not lifetime minted).
update('contracts/JettonMinter.tolk','contract JettonMinter {',
 'const GMTEST_MAX_OUTSTANDING_RAW = 150000000000000\n\ncontract JettonMinter {');
update('contracts/errors.tolk','    WrongWorkchain = 333',
 '    MintCapExceeded = 75\n    UpgradeDisabled = 76\n    WrongWorkchain = 333');
update('contracts/JettonMinter.tolk',
 '            storage.totalSupply += internalTransferMsg.jettonAmount;\n            storage.save();',
 '            assert (internalTransferMsg.jettonAmount > 0) throw Errors.MintCapExceeded;\n            assert (storage.totalSupply + internalTransferMsg.jettonAmount <= GMTEST_MAX_OUTSTANDING_RAW) throw Errors.MintCapExceeded;\n            storage.totalSupply += internalTransferMsg.jettonAmount;\n            storage.save();');
update('contracts/JettonMinter.tolk',
 '            contract.setCodePostponed(msg.newCode);\n            contract.setData(msg.newData);',
 '            // Prevent code and data replacement from bypassing supply limit.\n            throw Errors.UpgradeDisabled;');
removeSupersededTest('tests/admin-and-governance.test.tolk',
 'test admin: admin should be able to upgrade minter code and data',
 'test shard: wallet address should keep owner shard prefix in get/discovery/transfer');
removeSupersededTest('tests/state-init.test.tolk',
 'test state: should mint max jetton value',
 'test state: wallet storage and init-state bounds should match fee constants');
const capTests=join(root,'docs/ton-v4/gmtest-cap.test.tolk');
assert.ok(existsSync(capTests),'Dedicated cap regression tests missing');
copyFileSync(capTests,join(project,'tests/gmtest-cap.test.tolk'));
const minter=readFileSync(join(project,'contracts/JettonMinter.tolk'),'utf8');
assert.ok(!minter.includes('contract.setCodePostponed(')&&!minter.includes('contract.setData(msg.newData)'), 'Code upgrade still possible');
assert.ok(minter.includes('GMTEST_MAX_OUTSTANDING_RAW'));
console.log('GMTEST test-only outstanding cap 150m, code-upgrade lock and cap regressions applied.');
console.log('NOT lifetime issuance cap, NOT a deployed or audited contract.');
