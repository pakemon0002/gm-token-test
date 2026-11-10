// GM TOKEN 2.0 — in-game referral ambassador tiers.
// Percentages apply only to approved virtual-game referral campaigns, not deposits.
export const AMBASSADOR_MIN_REFERRALS=100;
export const AMBASSADOR_TIERS=Object.freeze([
 {id:'player',title:'GM Player',followers:0,rate_pct:25,verified:false},
 {id:'scout',title:'GM Scout',followers:2000,rate_pct:32,verified:true},
 {id:'partner',title:'GM Partner',followers:10000,rate_pct:35,verified:true},
 {id:'elite',title:'GM Elite',followers:50000,rate_pct:40,verified:true},
 {id:'ambassador',title:'GM Ambassador',followers:100000,rate_pct:50,verified:true}
]);
export function ambassadorTierForFollowers(followers){
 if(!Number.isSafeInteger(followers)||followers<0)throw new RangeError('invalid follower count');
 let tier=AMBASSADOR_TIERS[0];
 for(const option of AMBASSADOR_TIERS)if(followers>=option.followers)tier=option;
 return tier;
}
export function normalizedChannelLink(input){
 const source=String(input||'').trim();
 const name=source.startsWith('@')?source.slice(1):
  /^(?:https:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]+)\/?$/i.exec(source)?.[1];
 if(!name||!(/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(name)))throw new Error('valid public Telegram channel link is required');
 return 'https://t.me/'+name;
}
