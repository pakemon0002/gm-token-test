import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const js=readFileSync(new URL('../miniapp/public/main.js',import.meta.url),'utf8');
const start=js.indexOf('function Candles(');
const end=js.indexOf('function BarButton(',start);
assert.ok(start>=0&&end>start,'candlestick function exists');
const createElement=(type,props,...children)=>({type,props:props||{},children});
const Candles=vm.runInNewContext(js.slice(start,end)+'\nCandles;',{
 React:{createElement},Icon:()=>null,
 nf:(value,digits=2)=>Number(value).toLocaleString('ru-RU',{minimumFractionDigits:digits,maximumFractionDigits:digits}),
 console,Date,Number,Array,Math,String
});
function walk(node,match){
 const list=[];
 function recurse(value){
  if(!value)return;
  if(Array.isArray(value)){for(const v of value)recurse(v);return}
  if(typeof value==='object'){
   if(match(value))list.push(value);
   if(value.children)recurse(value.children);
  }
 }
 recurse(node);
 return list;
}
const one={time:1794253200,open:80,high:80,low:80,close:80,volume_gm_cents:333300,trades:1};
test('single-price real trade produces exactly one narrow neutral doji and one slender volume column',()=>{
 const tree=Candles({theme:'light',candles:[one],interval:'1d'});
 const svg=walk(tree,v=>v.type==='svg');
 assert.equal(svg.length,1);
 assert.equal(svg[0].props.preserveAspectRatio,'xMidYMid meet','no horizontal stretch');
 const body=walk(tree,v=>v.type==='rect'&&v.props.fill==='#717F9B'&&v.props.opacity===undefined);
 assert.equal(body.length,1,'exactly one real price body');
 assert.ok(body[0].props.width<=13,'candle must stay slender for a single trade');
 assert.ok(body[0].props.height>=2&&body[0].props.height<=4,'single-price candle is a doji, not an invented price move');
 const vols=walk(tree,v=>v.type==='rect'&&v.props.opacity===.5);
 assert.equal(vols.length,1,'one volume bar corresponding to one real candle');
 assert.ok(vols[0].props.width<=13,'one volume bar cannot cover the chart width');
 assert.ok(vols[0].props.height<=26,'volume is inside its bounded sub-panel');
 const priceTicks=walk(tree,v=>v.type==='text'&&v.props.className==='terminal-chart-price').map(v=>String(v.children.join('')));
 assert.equal(priceTicks.length,5);
 assert.ok(new Set(priceTicks).size>=4,'price axis must not repeat the same rounded price');
 const candleGroups=walk(tree,v=>v.type==='g'&&v.props.role==='button');
 assert.equal(candleGroups.length,1,'no fictitious candles');
});
test('two actual OHLC records render one rising and one falling candle, not interpolated data',()=>{
 const candles=[{...one,time:one.time-3600,open:80,high:84,low:79,close:84,volume_gm_cents:1100,trades:1},
                {...one,time:one.time,open:85,high:85,low:80,close:81,volume_gm_cents:2200,trades:1}];
 const selected=[];
 const tree=Candles({theme:'dark',candles,interval:'1h',selected:candles[0].time,onSelect:t=>selected.push(t)});
 assert.equal(walk(tree,v=>v.type==='g'&&v.props.role==='button').length,2);
 assert.equal(walk(tree,v=>v.type==='rect'&&v.props.fill==='#73D9BA'&&v.props.opacity===undefined).length,1);
 assert.equal(walk(tree,v=>v.type==='rect'&&v.props.fill==='#FF98A3'&&v.props.opacity===undefined).length,1);
 const hit=walk(tree,v=>v.type==='g'&&v.props.role==='button')[1];
 hit.props.onClick();
 assert.equal(selected[0],candles[1].time);
});
test('no real trades gives genuine empty chart, no simulated OHLCV or invented data',()=>{
 const tree=Candles({theme:'dark',candles:[],interval:'1m'});
 assert.equal(walk(tree,v=>v.type==='svg').length,0);
 assert.equal(walk(tree,v=>v.props.className==='terminal-empty-chart').length,1);
});
test('Trade presents a single terminal with tabs, native balance, and real-only market sources',()=>{
 const tsx=readFileSync(new URL('../miniapp/src/main.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../miniapp/public/styles.css',import.meta.url),'utf8');
 for(const content of [tsx,js]){
  for(const term of ['terminal-shell','terminal-data-tabs','terminal-buy-sell','terminal-depth-row','tradeTab','setTradeTab','terminal-wallet-line','trade-cta-row','liveTicker?.last_price','liveCandles','recentTrades']){
   assert.ok(content.includes(term),'missing real terminal feature '+term);
  }
 }
 for(const term of ['.theme-dark .terminal-shell','.terminal-candles','.terminal-chart-price','.terminal-quote-value','.theme-light .trade-cta-row.terminal-buy-sell>.buy']){
  assert.ok(css.includes(term),'missing theme styling '+term);
 }
 assert.ok(tsx.includes('setPeriod(t)'),'timeframe buttons request current API data');
 assert.ok(tsx.includes('setSelectedCandle(null)'),'timeframe switch clears stale selected candle');
});
