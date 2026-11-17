#!/usr/bin/env node
// CI snapshot of in-repository virtual game economy constants; NOT production balances.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {gmFunds,crFunds} from '../server/lib.mjs';
import {snapshotGameAccounts} from '../server/ton-shadow-projection.mjs';
import {gmBackingReadiness} from '../server/ton-reserve-diagnostic.mjs';

const pools=[
 ...Object.entries(gmFunds).map(([name,gm])=>({name,gm:String(BigInt(gm)*100n),cr:'0'})),
 ...Object.entries(crFunds).map(([name,cr])=>({name,gm:'0',cr:String(BigInt(cr)*100n)}))
];
const fixture=snapshotGameAccounts({pools});
const report=Object.freeze({
 reportType:'CI_READ_ONLY_PROPOSAL_NO_CHAIN_CUSTODY',
 source:'game allocation constants from server/lib.mjs; NOT a snapshot of the live database',
 ...gmBackingReadiness(fixture)
});
assert.equal(report.proposedCoverageRequiredRaw,'150000000000000');
assert.equal(report.approvedForRelease,false);
assert.equal(report.currentRealReservesVerified,false);
assert.equal(report.liveWithdrawalsEnabled,false);
assert.equal(report.realTradingEnabled,false);
assert.equal(report.gameToJettonRedemptionEnabled,false);
const encoded=JSON.stringify(report,null,2)+'\n';
writeFileSync('gmtest-backing-readiness-ci.json',encoded,{flag:'w',mode:0o600});
process.stdout.write(encoded);
