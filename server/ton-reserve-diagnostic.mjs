// GM TOKEN v4 — TEST-ONLY read-only reserve diagnostics.
// This cannot attest custody, authorize redemption or enable a blockchain transaction.
// Observations are deliberately untrusted synthetic examples; NO network requests occur.
import {Address} from '@ton/ton';
import {requireGameSupply} from './ton-shadow-projection.mjs';

export const GMTEST_DIAGNOSTIC_CHAIN='-3';
export const GM_CENT_TO_JETTON_RAW=10000000n; // proposed 9 decimals, game uses cents
export const GMTEST_CANDIDATE_RAW_CAP=150000000000000000n;

function raw(value,label) {
  if (typeof value!=='string'||!/^(0|[1-9][0-9]*)$/.test(value)||value.length>78)
    throw new TypeError(label+' must be an unsigned decimal integer string');
  return BigInt(value);
}
function address(value,label) {
  if(typeof value!=='string'||value.length>100)throw new TypeError(label+' must be a TON address');
  const parsed=Address.parse(value);
  if(parsed.workChain!==0)throw new Error(label+' must be on TON basechain');
  return parsed.toRawString();
}
function disabledBase(snapshot) {
  requireGameSupply(snapshot);
  return {
    mode:'TESTNET_MATH_DIAGNOSTIC_ONLY',
    asset:'GMTEST',
    gameAsset:'VIRTUAL_GM',
    equivalentToRealGM:false,
    proposedGameGmCents:snapshot.gmCents.toString(),
    proposedCoverageRequiredRaw:(snapshot.gmCents*GM_CENT_TO_JETTON_RAW).toString(),
    crIsOnChain:false,
    pointsAreOnChain:false,
    gameSupplyReconciled:true,
    currentRealReservesVerified:false,
    actualCustodyVerified:false,
    gameToJettonRedemptionEnabled:false,
    liveDepositsEnabled:false,
    liveWithdrawalsEnabled:false,
    realTradingEnabled:false,
    approvedForRelease:false
  };
}
export function gmBackingReadiness(snapshot) {
  return Object.freeze({
    ...disabledBase(snapshot),
    evidenceStatus:'NO_INDEPENDENT_MAINNET_MASTER_OR_CUSTODY_EVIDENCE',
    testnetObservationsPresent:false,
    simulatedCoverage:null,
    reason:'The 150M GM game budget is not proof of any Jetton reserve; GMTEST is only a test token.'
  });
}
// Use only in test fixtures. Never feed these numbers into a production reserve claim.
// A matching synthetic testnet number is NOT a statement about real on-chain assets.
export function evaluateSyntheticGmtestCoverage(snapshot,observation) {
  const base=disabledBase(snapshot);
  if(!observation||typeof observation!=='object'||Array.isArray(observation))
    throw new TypeError('Synthetic Testnet observation required');
  if(observation.fixtureType!=='synthetic_testnet_only'||observation.chainId!==GMTEST_DIAGNOSTIC_CHAIN)
    throw new Error('Only explicitly synthetic TON Testnet observations are accepted');
  if(observation.decimals!==9)throw new Error('GMTEST test fixture must use 9 decimals');
  const master=address(observation.masterAddress,'Jetton master');
  const supply=raw(observation.masterSupplyRaw,'master supply');
  if(supply>GMTEST_CANDIDATE_RAW_CAP)throw new Error('Synthetic master supply exceeds GMTEST candidate cap');
  if(!Array.isArray(observation.custodyWallets)||observation.custodyWallets.length>50)
    throw new TypeError('Synthetic custodyWallets array required');
  const seen=new Set();
  let custody=0n;
  for(const wallet of observation.custodyWallets) {
    if(!wallet||typeof wallet!=='object')throw new TypeError('Synthetic wallet object required');
    const addr=address(wallet.walletAddress,'Jetton wallet');
    if(seen.has(addr))throw new Error('Duplicate synthetic custody wallet, including alternate address encodings');
    seen.add(addr);
    if(address(wallet.masterAddress,'Wallet master')!==master)
      throw new Error('Custody wallet belongs to a different Jetton master');
    const balance=raw(wallet.balanceRaw,'custody balance');
    custody+=balance;
    if(custody>supply)throw new Error('Synthetic custody sum cannot exceed master total supply');
  }
  const required=snapshot.gmCents*GM_CENT_TO_JETTON_RAW;
  if(required!==GMTEST_CANDIDATE_RAW_CAP)throw new Error('Game and proposed GMTEST supplies differ');
  const missing=required>custody?required-custody:0n;
  const output={
    ...base,
    evidenceStatus:'SYNTHETIC_TEST_FIXTURE_IS_NOT_CHAIN_PROOF',
    testnetObservationsPresent:true,
    simulatedCoverage:Object.freeze({
      syntheticMasterAddress:master,
      syntheticMasterSupplyRaw:supply.toString(),
      syntheticCustodyRaw:custody.toString(),
      proposedRequirementRaw:required.toString(),
      syntheticShortfallRaw:missing.toString(),
      arithmeticCoverageOnly:custody>=required,
      accountsCounted:seen.size
    }),
    reason:'Only test data were compared. A testnet GMTEST balance cannot provide Mainnet GM backing.'
  };
  return Object.freeze(output);
}
