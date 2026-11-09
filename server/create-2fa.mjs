// Run locally: node server/create-2fa.mjs OWNER_TELEGRAM_ID
import crypto from 'node:crypto';
const user=process.argv[2]||'Owner';const bytes=crypto.randomBytes(20);
let bits=0,v=0,out='';const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
for(const b of bytes){v=(v<<8)|b;bits+=8;while(bits>=5){bits-=5;out+=abc[(v>>bits)&31]}}
if(bits)out+=abc[(v<<(5-bits))&31];
console.log('Save secret privately; do not put it in the Mini App or in Git.');
console.log('Telegram ID:',user,'\nTOTP base32:',out);
console.log('Authenticator URI:',`otpauth://totp/GM%20TOKEN:${encodeURIComponent(user)}?secret=${out}&issuer=GM%20TOKEN&algorithm=SHA1&digits=6&period=30`);
