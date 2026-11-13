import {workerData} from 'node:worker_threads';
import pg from 'pg';
import {getPool} from './postgres.mjs';
import {gameSQL} from './game-pg-sql.mjs';
const {port,signal}=workerData;
const gate=new Int32Array(signal);
for (const oid of [20,1700]) pg.types.setTypeParser(oid,value=>{
  const n=Number(value);
  if(!Number.isSafeInteger(n)) throw new Error('Game integer out of range');
  return n;
});
let client;
async function begin() {
  client=await getPool().connect();
  try {
    await client.query("BEGIN; SET LOCAL search_path=gm_game,pg_catalog; SET LOCAL statement_timeout='15s'; SELECT pg_advisory_xact_lock(hashtext('gm_game_writer'))");
  } catch(e) {client.release(true);client=null;throw e}
}
async function end(command) {
  const current=client;
  client=null;
  if(!current) return;
  try {await current.query(command);current.release()} catch(e){current.release(true);throw e}
}
async function execute({mode,sql,values}) {
  if(mode==='begin'){await begin();return}
  if(mode==='commit'||mode==='rollback'){await end(mode.toUpperCase());return}
  const standalone=!client;
  if(standalone) await begin();
  try {
    const result=await client.query(gameSQL(sql),values);
    if(standalone) await end('COMMIT');
    if(mode==='get')return result.rows[0];
    if(mode==='all')return result.rows;
    return {changes:result.rowCount};
  } catch(e){if(standalone)await end('ROLLBACK');throw e}
}
port.on('message',async request=>{
  let reply;
  try {reply={value:await execute(request)}} catch(e){reply={error:e.message,code:e.code}}
  port.postMessage(reply);
  Atomics.store(gate,0,1);
  Atomics.notify(gate,0);
});
