#!/usr/bin/env node
// Validate the official Acton-generated Jetton source before running its TVM emulator tests.
// Never signs, submits transactions, imports wallet secrets, or changes game balances.
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const project=resolve(root,process.argv[2]||'gmtest-acton');
if(!project.startsWith(root+'/'))throw new Error('Expected a disposable generated contract under repository');
const read=(path)=>readFileSync(join(project,path),'utf8');
const required=[
 'Acton.toml',
 'contracts/JettonMinter.tolk',
 'contracts/JettonWallet.tolk',
 'contracts/messages.tolk',
 'contracts/storage.tolk',
 'tests/admin-and-governance.test.tolk',
 'tests/wallet-behavior.test.tolk',
 'tests/bounce-handling.test.tolk',
 'tests/protocol-validation.test.tolk',
 'tests/state-init.test.tolk',
 'tests/gas.test.tolk'
];
for(const path of required){
 const full=join(project,path);
 assert.ok(existsSync(full)&&statSync(full).isFile(),'Official Acton file missing: '+path);
}
const expectedTestNames=[
 ['admin-and-governance.test.tolk',[
  'admin: deploy should create minter without bounce',
  'admin: minter admin should be able to mint jettons',
  'admin: non-admin should not be able to mint jettons',
  'admin: change-admin flow should work and only next admin can claim',
  'admin: non-admin cannot drop admin access',
  'admin: admin can drop admin access'
 ]],
 ['wallet-behavior.test.tolk',[
  'wallet: owner can send jettons',
  'wallet: non-owner cannot send jettons',
  'wallet: cannot send more jettons than balance',
  'wallet: owner can burn jettons',
  'wallet: non-owner cannot burn jettons',
  'wallet: cannot burn more jettons than balance'
 ]],
 ['bounce-handling.test.tolk',[
  'bounce: minter restores supply on internal_transfer bounce',
  'bounce: wallet restores balance on internal_transfer bounce',
  'bounce: wallet restores balance on burn_notification bounce'
 ]],
 ['protocol-validation.test.tolk',[
  'validation: wallet should reject internal transfer from unauthorized sender',
  'validation: minter accepts burn notification only from wallet',
  'validation: minter cannot force burn tokens',
  'validation: minter cannot force transfer tokens'
 ]]
];
for(const [path,cases] of expectedTestNames){
 const source=read('tests/'+path);
 for(const testcase of cases){
  assert.ok(source.includes('test '+testcase),'Official emulator scenario missing: '+testcase);
 }
}
const metadata=JSON.parse(readFileSync(join(root,'docs/ton-v4/GM_TESTNET_METADATA_DRAFT.json'),'utf8'));
assert.equal(metadata.name,'GM TOKEN TESTNET');
assert.equal(metadata.symbol,'GMTEST');
assert.equal(metadata.decimals,'9');
assert.match(metadata.description,/testnet/i);
assert.match(metadata.description,/no monetary value/i);
for(const [key,value] of [
 ['JETTON_NAME',metadata.name],
 ['JETTON_SYMBOL',metadata.symbol],
 ['JETTON_DECIMALS',metadata.decimals],
 ['JETTON_IMAGE',metadata.image]
]){
 assert.equal(process.env[key],value,'GMTEST fixture metadata mismatch: '+key);
}
assert.equal(process.env.JETTON_DESCRIPTION,
 'GM TOKEN development Jetton for TON Testnet ONLY. No monetary value, no connection to a live token, no deposits, redemptions or exchanges.',
 'Testnet disclaimer must be explicit in CI');
const minter=read('contracts/JettonMinter.tolk');
const wallet=read('contracts/JettonWallet.tolk');
assert.ok(minter.length>2000&&wallet.length>2000,'Jetton contract source is suspiciously small');
assert.ok(minter.includes('GMTEST_MAX_OUTSTANDING_RAW = 150000000000000000'),'GMTEST 150m limit absent');
assert.ok(minter.includes('throw Errors.MintCapExceeded'),'TVM cap enforcement absent');
assert.ok(minter.includes('throw Errors.UpgradeDisabled'),'Admin-upgrade lock absent');
assert.ok(!minter.includes('contract.setCodePostponed('),'Admin can bypass cap by replacing code');
assert.ok(existsSync(join(project,'tests/gmtest-cap.test.tolk')),'Dedicated cap tests missing');
assert.ok(!process.env.TON_PRIVATE_KEY&&!process.env.TON_MNEMONIC&&!process.env.JETTON_ADMIN_ADDRESS,'Contract emulator MUST NOT receive wallet secrets');
console.info('GMTEST metadata: verified; official JettonMinter/Wallet source: present');
console.info('Acton emulator security scenarios present:',expectedTestNames.reduce((n,x)=>n+x[1].length,0));
console.info('Local GMTEST variant: 150m maximum outstanding supply plus blocked admin upgrades; not a lifetime issuance counter.');
console.info('Custom logic has NOT undergone independent contract security audit or on-chain deployment.');
console.info('No network deployment or wallet signing requested.');
