import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gmFunds} from '../server/lib.mjs';
import {
  TON_JETTON_PROPOSAL,TON_GAME_ALLOCATION,proposedSupplyBaseUnits,
  publicTonLaunchStatus,denyTonTokenOperation
} from '../server/ton-prelaunch.mjs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('150m GM preliminary proposal matches every virtual budget bucket exactly',()=>{
  assert.equal(TON_JETTON_PROPOSAL.supply_gm,150_000_000);
  assert.deepEqual(TON_GAME_ALLOCATION,gmFunds);
  assert.equal(
    Object.values(TON_GAME_ALLOCATION).reduce((a,n)=>a+BigInt(n),0n),150_000_000n);
  assert.equal(proposedSupplyBaseUnits,150_000_000_000_000_000n);
  assert.equal(Number.isSafeInteger(Number(proposedSupplyBaseUnits)),false);
  assert.equal(TON_JETTON_PROPOSAL.decimals_candidate,9);
  assert.equal(TON_JETTON_PROPOSAL.approved_for_issuance,false);
  assert.equal(TON_JETTON_PROPOSAL.distribution_approved_for_chain,false);
  assert.equal(TON_JETTON_PROPOSAL.conversion_ratio_approved,false);
  assert.equal(TON_JETTON_PROPOSAL.withdrawals_approved,false);
});

test('public TON status cannot be mistaken for minted or redeemable Jetton',()=>{
  const response=publicTonLaunchStatus();
  assert.equal(response.phase,'proposal_only');
  assert.equal(response.proposed_supply_gm,150_000_000);
  assert.equal(response.decimals_finalized,false);
  assert.equal(response.contract_address,null);
  assert.equal(response.contract_approved,false);
  assert.equal(response.withdrawals_available,false);
  assert.equal(response.deposits_available,false);
  assert.equal(response.minting_available,false);
  assert.equal(response.game_to_jetton_conversion_approved,false);
  assert.match(response.disclaimer,/не являются токенами TON/);
  assert.ok(!Object.hasOwn(response,'mnemonic'));
  assert.ok(!Object.hasOwn(response,'seed'));
});

test('real withdrawal is permanently closed during preparation, even if env flags are forged',()=>{
  const saved=process.env.GM_ENABLE_JETTON_WITHDRAWALS;
  try {
    process.env.GM_ENABLE_JETTON_WITHDRAWALS='true';
    assert.equal(denyTonTokenOperation().withdrawals_available,false);
    assert.equal(publicTonLaunchStatus().withdrawals_available,false);
    const code=source('server/index.mjs');
    const auth=code.indexOf('const identity=auth(req);id=identity.id;');
    const guard=code.indexOf("if(p==='/api/ton/withdraw'&&verb==='POST')");
    const game=code.indexOf("if(p==='/api/bootstrap'&&verb==='GET')");
    assert.ok(auth>0&&guard>auth&&game>guard);
    assert.match(code.slice(guard,guard+120),/return send\(res,503,denyTonTokenOperation\(\)\)/);
    assert.match(code,/if\(p==='\/api\/ton\/launch-status'&&verb==='GET'\)return send\(res,200,publicTonLaunchStatus\(\)\)/);
    assert.ok(!code.includes("'/api/ton/mint'"));
    assert.ok(!code.includes("'/api/ton/transfer'"));
  }finally{
    if(saved===undefined)delete process.env.GM_ENABLE_JETTON_WITHDRAWALS;
    else process.env.GM_ENABLE_JETTON_WITHDRAWALS=saved;
  }
});

test('TON Connect display name is GM TOKEN, original domain still matches proof domain',()=>{
  const manifest=JSON.parse(source('miniapp/public/tonconnect-manifest.json'));
  assert.equal(manifest.name,'GM TOKEN');
  assert.equal(manifest.url,'https://gm-token-test-iprj.onrender.com');
  assert.ok(manifest.iconUrl.startsWith(manifest.url+'/'));
  const verify=source('server/ton-proof.mjs');
  assert.match(verify,/proof\.payload!==nonce/);
  assert.match(verify,/proof\.domain\?\.value!==domain/);
  assert.match(verify,/contractAddress\(address\.workChain,state\)\.equals\(address\)/);
});

test('draft TEP-64 metadata is intentionally not deployable until separately approved',()=>{
  const draft=JSON.parse(source('docs/TON_JETTON_METADATA_DRAFT.json'));
  assert.equal(draft.name,'GM TOKEN');
  assert.equal(draft.symbol,'GM');
  assert.equal(draft.decimals,'9');
  assert.match(draft.image,/^REPLACE_WITH_VERIFIED_PUBLIC/);
  assert.match(draft.description,/not currently be redeemed/);
  const docs=source('docs/TON_JETTON_LAUNCH_PLAN_RU.md');
  assert.match(docs,/предварительно выбрал \*\*150 000 000 GM\*\*/);
  assert.match(docs,/не является разрешением на выпуск/);
});
