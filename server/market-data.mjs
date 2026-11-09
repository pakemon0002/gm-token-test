// Market observability for the GM/CR *virtual* exchange.
// All trade prices are executable CR cents per 1 GM. No invented trades/candles.
export const INTERVALS={ '1m':60,'5m':300,'15m':900,'1h':3600,'4h':14400,'1d':86400 };
const number=(n)=>Number.isSafeInteger(n)&&n>=0;
export function makeCandles(trades,interval='1h',limit=180){
 const secs=INTERVALS[interval];if(!secs)throw Error('invalid chart interval');
 const result=new Map();
 for(const t of [...trades].sort((a,b)=>a.at-b.at||(a.seq||0)-(b.seq||0)||String(a.id||'').localeCompare(String(b.id||'')))){
  if(t.suspect||!number(t.price)||!number(t.amount_cents)||!number(t.quote_cents)||!number(t.at)||t.price===0)continue;
  const time=Math.floor(t.at/secs)*secs;let c=result.get(time);
  if(!c){c={time,open:t.price,high:t.price,low:t.price,close:t.price,volume_gm_cents:0,volume_cr_cents:0,trades:0};result.set(time,c)}
  c.high=Math.max(c.high,t.price);c.low=Math.min(c.low,t.price);c.close=t.price;
  c.volume_gm_cents+=t.amount_cents;c.volume_cr_cents+=t.quote_cents;c.trades++;
 }
 return [...result.values()].sort((a,b)=>a.time-b.time).slice(-Math.max(1,Math.min(500,limit)));
}
export function tradingSnapshot(trades,nowSecs,bids=[],asks=[]){
 const trusted=[...trades].filter(t=>!t.suspect&&number(t.price)&&t.price>0&&number(t.amount_cents)&&number(t.at)).sort((a,b)=>a.at-b.at||(a.seq||0)-(b.seq||0));
 const last=trusted.at(-1)||null;const day=trusted.filter(t=>t.at>=nowSecs-86400);
 const prior=trusted.filter(t=>t.at<nowSecs-86400).at(-1)||(day.length>=2?day[0]:null);
 const twentyFour=day.reduce((a,t)=>{a.gm+=t.amount_cents;a.cr+=t.quote_cents||0;return a},{gm:0,cr:0});
 const lastPrice=last?.price||null;
 const priceChangeBps=lastPrice&&prior?.price?Math.round((lastPrice-prior.price)*10000/prior.price):null;
 return {last_price:lastPrice,change_bps:priceChangeBps,volume_24h_gm_cents:twentyFour.gm,volume_24h_cr_cents:twentyFour.cr,trades_24h:day.length,best_bid:bids.length?Math.max(...bids.map(x=>x.limit_price)):null,best_ask:asks.length?Math.min(...asks.map(x=>x.limit_price)):null,market_source:'executed_trusted_orders_only',data_confidence:trusted.length<5?'low':'trades_only',suspect_excluded:trades.length-trusted.length};
}
// Indicative *premarket* clearing quote from bids/asks. This is NOT a trade.
// A simple book-based volume estimate; execution still verifies different users,
// available funds, auction priority, and per-order rounding independently.
export function indicativeAuction(orders){
 const active=orders.filter(o=>o.status==='open'&&o.auction&&o.remaining_cents>0&&o.limit_price>0);
 const bids=active.filter(o=>o.side==='buy'),asks=active.filter(o=>o.side==='sell');
 const prices=[...new Set(active.map(o=>o.limit_price))].sort((a,b)=>a-b);
 let best=null;
 for(const price of prices){
  const buy=bids.filter(o=>o.limit_price>=price).reduce((n,o)=>n+o.remaining_cents,0);
  const sell=asks.filter(o=>o.limit_price<=price).reduce((n,o)=>n+o.remaining_cents,0);
  // Upper bound on fills without self-trading: for each user, trades can only
  // match the opposite book held by *other* users. This is the max-flow result
  // for a bipartite book with all cross-user edges except self-edges.
  const perUser=new Map();
  for(const b of bids.filter(o=>o.limit_price>=price)){
   const x=perUser.get(b.user_id)||[0,0];x[0]+=b.remaining_cents;perUser.set(b.user_id,x);
  }
  for(const a of asks.filter(o=>o.limit_price<=price)){
   const x=perUser.get(a.user_id)||[0,0];x[1]+=a.remaining_cents;perUser.set(a.user_id,x);
  }
  const maxSelfRisk=Math.max(0,...[...perUser.values()].map(([b,a])=>b+a));
  const volume=Math.max(0,Math.min(buy,sell,buy+sell-maxSelfRisk)),imbalance=Math.abs(buy-sell);
  if(volume===0)continue;
  if(!best||volume>best.volume||volume===best.volume&&imbalance<best.imbalance){best={price,volume,imbalance,prices:[price]}}
  else if(volume===best.volume&&imbalance===best.imbalance)best.prices.push(price);
 }
 if(!best)return {price:null,volume_gm_cents:0,estimated:true,actual_traded_gm_cents:0};
 // If maximum executable volume and imbalance tie across a price range,
 // use the midpoint of that valid range instead of always favoring one side.
 const low=Math.min(...best.prices),high=Math.max(...best.prices);
 return {price:Math.floor((low+high)/2),volume_gm_cents:best.volume,estimated:true,actual_traded_gm_cents:0};
}
