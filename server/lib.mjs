import crypto from 'node:crypto';

export function verifyInitData(raw, botToken, now = Math.floor(Date.now()/1000)) {
  if(typeof raw!=='string'||!raw||!botToken||raw.length>8000)throw Error('missing/invalid initData');
  const params=new URLSearchParams(raw);const hash=params.get('hash');const ts=Number(params.get('auth_date'));
  if(!hash||!/^[0-9a-f]{64}$/i.test(hash)||!Number.isInteger(ts)||ts>now+60||now-ts>86400)throw Error('initData expired or invalid');
  const data=[...params.entries()].filter(([k])=>k!=='hash'&&k!=='signature').map(([k,v])=>`${k}=${v}`).sort().join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(botToken).digest();
  const check=crypto.createHmac('sha256',secret).update(data).digest('hex');
  if(!crypto.timingSafeEqual(Buffer.from(check,'hex'),Buffer.from(hash,'hex')))throw Error('initData signature mismatch');
  const user=JSON.parse(params.get('user')||'null');
  if(!user||!Number.isSafeInteger(user.id))throw Error('user missing');
  return {id:String(user.id),username:typeof user.username==='string'?user.username:'',firstName:user.first_name||'',authDate:ts,startParam:params.get('start_param')||''};
}
export function base32Decode(value){
 let bits=0,x=0;const out=[];for(const s of String(value).toUpperCase().replace(/=|\s/g,'')){
  const v='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(s);if(v<0)throw Error('invalid base32');x=(x<<5)|v;bits+=5;
  if(bits>=8){bits-=8;out.push((x>>>bits)&255)}
 }return Buffer.from(out);
}
export function totp(secret,now=Date.now()){
 const key=base32Decode(secret);if(key.length<10)throw Error('TOTP secret too short');
 const time=Math.floor(now/30000);const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(time));const h=crypto.createHmac('sha1',key).update(b).digest();const off=h[h.length-1]&15;return String((h.readUInt32BE(off)&0x7fffffff)%1000000).padStart(6,'0');
}
export function checkTotp(secret,code,now=Date.now()){
 if(!secret||!/^\d{6}$/.test(String(code)))return false;
 return [-30000,0,30000].some(t=>totp(secret,now+t)===String(code));
}
export function toCents(amount){
 if(typeof amount==='number'){if(!Number.isFinite(amount))throw Error('invalid amount');amount=amount.toFixed(2)}
 if(typeof amount!=='string'||!/^\d{1,13}(\.\d{1,2})?$/.test(amount))throw Error('amount must have at most two decimals');
 const [whole,cents='']=amount.split('.');const value=Number(whole)*100+Number(cents.padEnd(2,'0'));
 if(!Number.isSafeInteger(value)||value<=0)throw Error('amount out of range');return value;
}
export function formatCents(cents){if(!Number.isSafeInteger(cents))throw Error('invalid cents');return (cents/100).toFixed(2)}
export const gmFunds={MINING:45000000,HOLDING:23000000,BOXES:25000000,DAILY:13000000,COMMUNITY:12000000,DEVELOPMENT:10000000,FUTURE:5000000,TREASURY:7000000,FOUNDER:10000000};
export const crFunds={WELCOME:250000000,SHOP:750000000};
