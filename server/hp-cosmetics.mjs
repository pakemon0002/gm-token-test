// Permanent, non-transferable cosmetics earned exclusively with calendar HP.
// No GM mint, on-chain asset or tradeable value is created.
import {withTransaction} from './postgres.mjs';

export const HP_COSMETICS=Object.freeze([
  Object.freeze({id:'autumn_spark',title:'Осенняя искра',cost:30,icon:'sparkles'}),
  Object.freeze({id:'autumn_star',title:'Звезда осени',cost:80,icon:'star'}),
  Object.freeze({id:'autumn_crown',title:'Корона сезона',cost:160,icon:'crown'}),
]);

function validPlayer(id){
  const value=String(id??'');
  if(!/^[1-9][0-9]{0,18}$/.test(value)||BigInt(value)>9223372036854775807n)
    throw new Error('Invalid Telegram user id');
  return value;
}
const operationKey=id=>'hp:cosmetic:'+id+':v1';
const byId=new Map(HP_COSMETICS.map(item=>[item.id,item]));

export async function getHpCosmetics(client,playerId){
  const uid=validPlayer(playerId);
  const rows=await client.query(
    `SELECT operation_key FROM gm_internal.ledger
     WHERE player_id=$1 AND currency='HP' AND category='hp_cosmetic'`,
    [uid]);
  const operations=new Set(rows.rows.map(row=>row.operation_key));
  return HP_COSMETICS.map(item=>({...item,unlocked:operations.has(operationKey(item.id))}));
}

export async function unlockHpCosmeticWithClient(client,playerId,itemId){
  const uid=validPlayer(playerId);
  const chosen=byId.get(itemId);
  if(!chosen)throw new Error('Invalid HP cosmetic');

  const player=await client.query(
    `SELECT status FROM gm_internal.players WHERE telegram_id=$1`,[uid]);
  if(player.rows[0]?.status!=='active')throw new Error('player not found or inactive');

  // Serialise all purchases on the player's HP row before checking the ledger.
  // This prevents two simultaneous HTTP requests from spending the same HP.
  const wallet=await client.query(
    `SELECT balance FROM gm_internal.wallets
     WHERE player_id=$1 AND currency='HP' FOR UPDATE`,[uid]);
  const balance=Number(wallet.rows[0]?.balance??0);
  if(!Number.isSafeInteger(balance)||balance<0)throw new Error('Invalid HP balance');

  const exists=await client.query(
    `SELECT 1 FROM gm_internal.ledger
     WHERE player_id=$1 AND currency='HP' AND operation_key=$2 LIMIT 1`,
    [uid,operationKey(chosen.id)]);
  if(exists.rows.length)return {id:chosen.id,hp:balance,alreadyUnlocked:true};

  if(balance<chosen.cost)throw new Error('Not enough HP');
  const debit=await client.query(
    `UPDATE gm_internal.wallets SET balance=balance-$2,updated_at=now()
     WHERE player_id=$1 AND currency='HP' AND balance>=$2`,
    [uid,chosen.cost]);
  if(debit.rowCount!==1)throw new Error('Not enough HP');

  // UNIQUE(player_id,currency,operation_key) guarantees permanent unlock.
  // If insertion fails, withTransaction rolls the HP deduction back as well.
  await client.query(
    `INSERT INTO gm_internal.ledger(player_id,currency,delta,operation_key,category)
     VALUES ($1,'HP',$2,$3,'hp_cosmetic')`,
    [uid,-chosen.cost,operationKey(chosen.id)]);
  return {id:chosen.id,hp:balance-chosen.cost,alreadyUnlocked:false};
}

export async function unlockHpCosmetic(playerId,itemId){
  const uid=validPlayer(playerId);
  if(typeof itemId!=='string'||!byId.has(itemId))throw new Error('Invalid HP cosmetic');
  return withTransaction(client=>unlockHpCosmeticWithClient(client,uid,itemId));
}
