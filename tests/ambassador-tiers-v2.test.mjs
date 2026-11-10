import test from 'node:test';
import assert from 'node:assert/strict';
import {AMBASSADOR_TIERS,ambassadorTierForFollowers,normalizedChannelLink} from '../server/ambassador.mjs';
test('ambassadors: 25-50% virtual gaming tiers',()=>{
 assert.deepEqual(AMBASSADOR_TIERS.map(x=>x.rate_pct),[25,32,35,40,50]);
 assert.equal(ambassadorTierForFollowers(1999).id,'player');
 assert.equal(ambassadorTierForFollowers(2000).id,'scout');
 assert.equal(ambassadorTierForFollowers(10000).id,'partner');
 assert.equal(ambassadorTierForFollowers(50000).id,'elite');
 assert.equal(ambassadorTierForFollowers(100000).id,'ambassador');
 assert.throws(()=>ambassadorTierForFollowers(-1),RangeError);
});
test('ambassador application channels are public Telegram names only',()=>{
 assert.equal(normalizedChannelLink('@GMChannel123'),'https://t.me/GMChannel123');
 assert.equal(normalizedChannelLink('https://t.me/ExampleChannel'),'https://t.me/ExampleChannel');
 for(const url of ['https://evil.com/channel','https://t.me/+invite','javascript:alert(1)','https://t.me/a?q=x','@xx']){
  assert.throws(()=>normalizedChannelLink(url));
 }
});
