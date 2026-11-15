import test from 'node:test';
import assert from 'node:assert/strict';
import {BOX_POINT_COSTS,GAME_CURRENCY_POLICY,publicGameCurrencyPolicy} from '../server/game-currency-policy.mjs';

test('CR is exactly one billion virtual credits; it has no TON wallet or withdrawals',()=>{
  const {CR,POINTS,GM}=GAME_CURRENCY_POLICY;
  assert.equal(CR.game_supply,1_000_000_000);
  assert.equal(CR.blockchain_asset,false);
  assert.equal(CR.external_deposits,false);
  assert.equal(CR.external_withdrawals,false);
  assert.equal(CR.can_purchase_boxes,false);
  assert.equal(POINTS.blockchain_asset,false);
  assert.equal(POINTS.transferable,false);
  assert.equal(POINTS.tradable,false);
  assert.equal(POINTS.earning_basis,'server_confirmed_eligible_GM_CR_fills');
  assert.equal(POINTS.spending_basis,'fixed_cost_boxes');
  assert.equal(GM.game_supply,150_000_000);
  assert.equal(GM.live_jetton_withdrawals,false);
  assert.equal(GM.jetton_backing_verified,false);
});

test('POINTS buy disclosed fixed-cost boxes; neither CR nor POINTS are TON tokens',()=>{
  const info=publicGameCurrencyPolicy();
  assert.equal(info.market,'GM/CR — internal game market, not a TON DEX');
  assert.equal(info.boxes.payment_currency,'POINTS');
  assert.deepEqual(info.boxes.point_costs,BOX_POINT_COSTS);
  assert.deepEqual(BOX_POINT_COSTS,{bronze:300,silver:750,gold:1500});
  assert.equal(info.boxes.randomized,false);
  assert.equal(info.points.daily_earning_cap,1000);
  assert.equal(info.mainnet_trading_enabled,false);
  assert.equal(Object.hasOwn(BOX_POINT_COSTS,'constructor'),false);
  assert.equal(Object.isFrozen(BOX_POINT_COSTS),true);
});
