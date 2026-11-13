import {MessageChannel, Worker, receiveMessageOnPort} from 'node:worker_threads';
// Preserve the game's synchronous transaction callbacks on a dedicated database worker.
// A timeout terminates the process to prevent reuse of an uncertain transaction.
export function openGamePostgres() {
  const {port1,port2}=new MessageChannel();
  const gate=new Int32Array(new SharedArrayBuffer(4));
  const worker=new Worker(new URL('./game-pg-worker.mjs',import.meta.url),{workerData:{port:port2,signal:gate.buffer},transferList:[port2]});
  function call(mode,sql='',values=[]) {
    Atomics.store(gate,0,0);
    port1.postMessage({mode,sql,values});
    if(Atomics.wait(gate,0,0,45000)==='timed-out'){console.error('Game database worker unavailable');process.exit(1)}
    const reply=receiveMessageOnPort(port1).message;
    if(reply.error){const error=new Error(reply.error);error.code=reply.code;throw error}
    return reply.value;
  }
  return {
    prepare(sql){return {get:(...v)=>call('get',sql,v),all:(...v)=>call('all',sql,v),run:(...v)=>call('run',sql,v)}},
    exec(sql){
      if(sql==='BEGIN IMMEDIATE')return call('begin');
      if(sql==='COMMIT'||sql==='ROLLBACK')return call(sql.toLowerCase());
      if(sql.startsWith('CREATE TABLE IF NOT EXISTS')||sql.startsWith('PRAGMA foreign_keys'))return;
      throw new Error('Install game DDL via a PostgreSQL migration');
    },
    close(){port1.close();return worker.terminate()}
  };
}
