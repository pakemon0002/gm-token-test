// GM TOKEN: read-only accounting projection for STAGING tests only.
// No mainnet calls, no custody, no production posting. All values are exact integers.
const MAX_GM_CENTS = 15_000_000_000n; // 150m GM * 100
const MAX_CR_CENTS = 100_000_000_000n; // 1bn CR * 100

function cents(value) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^-?[0-9]+$/.test(value)) return BigInt(value);
  throw new TypeError('Amount must be an exact integer (never float)');
}
function safeId(value) {
  const id = String(value ?? '');
  if (!id || id.length > 140 || /[\x00-\x1f]/.test(id)) throw new TypeError('Invalid account identifier');
  return id;
}
function add(accounts, code, kind, currency, value) {
  const amount = cents(value);
  if (amount < 0n) throw new RangeError('Game account has a negative balance: ' + code);
  const key = currency + ':' + code;
  if (accounts.has(key)) throw new Error('Duplicate snapshot account: ' + key);
  accounts.set(key, {accountCode: code, accountKind: kind, currency, cents: amount});
}
export function snapshotGameAccounts({pools=[], wallets=[], mining=[], holding=[], orders=[]}) {
  const accounts = new Map();
  for (const x of pools) {
    const name = safeId(x.name);
    add(accounts,'fund:' + name + ':GM','fund','GM',x.gm);
    add(accounts,'fund:' + name + ':CR','fund','CR',x.cr);
  }
  for (const x of wallets) {
    const id = safeId(x.user_id);
    add(accounts,'wallet:' + id + ':GM','user_available','GM',x.gm);
    add(accounts,'wallet:' + id + ':CR','user_available','CR',x.cr);
    add(accounts,'vault:' + id + ':GM','user_vault','GM',x.vault);
  }
  for (const x of mining) add(accounts,'pending:mining:' + safeId(x.user_id) + ':GM','user_pending','GM',x.pending_cents);
  for (const x of holding) add(accounts,'pending:holding:' + safeId(x.user_id) + ':GM','user_pending','GM',x.pending_cents);
  for (const x of orders) {
    if (x.status !== 'open') continue;
    if (x.side !== 'buy' && x.side !== 'sell') throw new TypeError('Unknown order side');
    const currency = x.side === 'sell' ? 'GM' : 'CR';
    add(accounts,'order:' + safeId(x.id) + ':' + currency,'user_reserved',currency,x.locked_cents);
  }
  // Holding buckets subdivide the same HOLDING fund: they must NEVER be counted again.
  let gmCents=0n,crCents=0n;
  for (const a of accounts.values()) {
    if (a.currency==='GM') gmCents+=a.cents;
    else crCents+=a.cents;
  }
  return {accounts,gmCents,crCents};
}
export function readGameAccountSnapshot(db) {
  const all=(sql)=>db.prepare(sql).all();
  return snapshotGameAccounts({
    pools:all('SELECT name,gm,cr FROM pools'),
    wallets:all('SELECT user_id,gm,cr,vault FROM wallets'),
    mining:all('SELECT user_id,pending_cents FROM mining_state'),
    holding:all('SELECT user_id,pending_cents FROM holding_state'),
    orders:all("SELECT id,side,status,locked_cents FROM orders WHERE status='open'")
  });
}
export function requireGameSupply(snapshot,{expectedGM=MAX_GM_CENTS,expectedCR=MAX_CR_CENTS}={}) {
  if (snapshot.gmCents!==cents(expectedGM)||snapshot.crCents!==cents(expectedCR))
    throw new Error('GM/CR game supply mismatch: ' + snapshot.gmCents + '/' + snapshot.crCents);
  return true;
}
export function projectGameTransition(before,after,operationId,{jettonDecimals=6}={}) {
  if (!/^[A-Za-z0-9_.:-]{8,100}$/.test(String(operationId||''))) throw new TypeError('Invalid operationId');
  if (!Number.isSafeInteger(jettonDecimals)||jettonDecimals<2||jettonDecimals>18)
    throw new TypeError('Jetton decimals must be an integer >=2 and <=18');
  if (before.gmCents!==after.gmCents||before.crCents!==after.crCents)
    throw new Error('Unbalanced game transaction; cannot project a journal');
  const factor = 10n**BigInt(jettonDecimals-2);
  const keys=[...new Set([...before.accounts.keys(),...after.accounts.keys()])].sort();
  const entries=[];
  for (const key of keys) {
    const prior=before.accounts.get(key),current=after.accounts.get(key);
    const delta=(current?.cents??0n)-(prior?.cents??0n);
    if (delta===0n) continue;
    const a=current||prior;
    entries.push({
      accountCode:a.accountCode,accountKind:a.accountKind,
      currency:a.currency==='GM'?'GM_RAW':'CR_CENTS',
      amountUnits:String(a.currency==='GM'?delta*factor:delta)
    });
  }
  for (const currency of ['GM_RAW','CR_CENTS']) {
    const net=entries.filter(x=>x.currency===currency).reduce((sum,x)=>sum+BigInt(x.amountUnits),0n);
    if (net!==0n) throw new Error('Unbalanced projected journal in ' + currency);
  }
  return {operationId, entries, changed:entries.length>0};
}
