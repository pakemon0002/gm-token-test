// Static application statements only. User values are always bound separately.
export function gameSQL(source) {
  let sql=source.trim();
  if (sql==='PRAGMA table_info(orders)') return "SELECT column_name AS name FROM information_schema.columns WHERE table_schema='gm_game' AND table_name='orders'";
  if (/^INSERT OR IGNORE INTO /i.test(sql)) sql=sql.replace(/^INSERT OR IGNORE/i,'INSERT')+' ON CONFLICT DO NOTHING';
  sql=sql.replace('MAX(peak_cents,excluded.peak_cents)','greatest(holding_peak.peak_cents,excluded.peak_cents)');
  for (const [table,column] of [['points_pair_day','eligible_gm_cents'],['box_day','gm_cents'],['shop_day','cr_cents']]) {
    sql=sql.replace(column+'='+column+'+excluded.',column+'='+table+'.'+column+'+excluded.');
  }
  let n=0;
  return sql.replace(/'(?:''|[^'])*'|\?/g,token=>token==='?'?'$'+(++n):token);
}
