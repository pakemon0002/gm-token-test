import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCandles,tradingSnapshot,indicativeAuction,INTERVALS} from '../server/market-data.mjs';
const at=1800000000;
const trade=(id,price,volume,when=at,suspect=0)=>({id,seq:Number(id.slice(1)),price,amount_cents:volume,quote_cents:Math.floor(volume*price/100),at:when,suspect});
test('no seed prices or artificial OHLCV when trades do not exist',()=>{
 assert.deepEqual(makeCandles([], '1m'),[]);
 const m=tradingSnapshot([],at,[],[]);
 assert.equal(m.last_price,null);assert.equal(m.volume_24h_gm_cents,0);assert.equal(m.trades_24h,0);
 assert.equal(m.change_bps,null);
});
test('OHLCV is exact ordered execution data, includes quote volume and no made-up gaps',()=>{
 const xs=[trade('t1',1100,300,at),trade('t2',900,200,at+5),trade('t3',1200,500,at+10),trade('t4',850,200,at+70)];
 const cs=makeCandles(xs,'1m');assert.equal(cs.length,2);
 assert.deepEqual([cs[0].open,cs[0].high,cs[0].low,cs[0].close],[1100,1200,900,1200]);
 assert.equal(cs[0].volume_gm_cents,1000);assert.equal(cs[0].trades,3);
 assert.equal(cs[1].volume_gm_cents,200);
});
test('suspicious volume never appears in trusted chart or 24h market price',()=>{
 const xs=[trade('t1',1200,1000),trade('t2',9999,30000,at+1,1)];
 const cs=makeCandles(xs,'5m');assert.equal(cs.length,1);assert.equal(cs[0].close,1200);assert.equal(cs[0].volume_gm_cents,1000);
 const m=tradingSnapshot(xs,at+10);assert.equal(m.last_price,1200);assert.equal(m.volume_24h_gm_cents,1000);assert.equal(m.suspect_excluded,1);
});
test('premarket quote is indicative and never claims trades occurred',()=>{
 const orders=[
  {user_id:'1',side:'buy',status:'open',auction:1,limit_price:1200,remaining_cents:3000},
  {user_id:'2',side:'sell',status:'open',auction:1,limit_price:1100,remaining_cents:2200}
 ];
 const r=indicativeAuction(orders);assert.equal(r.price!==null,true);assert.equal(r.volume_gm_cents,2200);
 assert.equal(r.actual_traded_gm_cents,0);assert.equal(r.estimated,true);
});
test('premarket cannot invent an indicative price when one person crosses themselves',()=>{
 const orders=[
  {user_id:'1',side:'buy',status:'open',auction:1,limit_price:1800,remaining_cents:10000},
  {user_id:'1',side:'sell',status:'open',auction:1,limit_price:500,remaining_cents:10000},
 ];
 assert.deepEqual(indicativeAuction(orders),{price:null,volume_gm_cents:0,estimated:true,actual_traded_gm_cents:0});
});
test('premarket theoretical cross-user maximum avoids inflated self-crossing volume',()=>{
 const orders=[
  {user_id:'1',side:'buy',status:'open',auction:1,limit_price:1200,remaining_cents:10000},
  {user_id:'1',side:'sell',status:'open',auction:1,limit_price:900,remaining_cents:9000},
  {user_id:'2',side:'sell',status:'open',auction:1,limit_price:900,remaining_cents:1000},
 ];
 const r=indicativeAuction(orders);
 assert.equal(r.volume_gm_cents,1000,'only volume that can cross a distinct user counts');
});
test('invalid candle interval and unsupported price data are rejected',()=>{
 assert.throws(()=>makeCandles([],'2m'),/invalid chart interval/);
 assert.ok(INTERVALS['1d']);
 assert.deepEqual(makeCandles([trade('t1',0,100)]),[]);
});

test('opening auction ties choose the midpoint of the valid buy/sell price range',()=>{
 const orders=[{user_id:'1',side:'buy',status:'open',auction:1,limit_price:1200,remaining_cents:1000},{user_id:'2',side:'sell',status:'open',auction:1,limit_price:1000,remaining_cents:1000}];
 const r=indicativeAuction(orders);assert.equal(r.price,1100);assert.equal(r.volume_gm_cents,1000);
});
