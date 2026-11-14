// Read-only, PRELIMINARY launch planning. Nothing in this module mints,
// signs, transfers, reserves, converts or withdraws Jettons or game GM.
import {gmFunds} from './lib.mjs';

export const TON_JETTON_PROPOSAL=Object.freeze({
  name:'GM TOKEN',
  symbol:'GM',
  standard:'TEP-74',
  metadata_standard:'TEP-64',
  network:'TON',
  supply_gm:150_000_000,
  decimals_candidate:9, // Proposed, NOT separately approved
  stage:'preliminary_proposal',
  approved_for_issuance:false,
  conversion_ratio_approved:false,
  distribution_approved_for_chain:false,
  withdrawals_approved:false
});

export const TON_GAME_ALLOCATION=Object.freeze({...gmFunds});
const total=Object.values(TON_GAME_ALLOCATION).reduce((sum,n)=>sum+BigInt(n),0n);
if(total!==BigInt(TON_JETTON_PROPOSAL.supply_gm))
  throw new Error('TON proposal must reconcile with the 150m GM game budget');

// This is a CANDIDATE scale only. Never use Number for Jetton base units.
export const proposedSupplyBaseUnits=BigInt(TON_JETTON_PROPOSAL.supply_gm)
  *10n**BigInt(TON_JETTON_PROPOSAL.decimals_candidate);

export function publicTonLaunchStatus(){
  return {
    name:TON_JETTON_PROPOSAL.name,
    symbol:TON_JETTON_PROPOSAL.symbol,
    network:'TON',
    standard:TON_JETTON_PROPOSAL.standard,
    phase:'proposal_only',
    proposed_supply_gm:TON_JETTON_PROPOSAL.supply_gm,
    proposed_decimals:TON_JETTON_PROPOSAL.decimals_candidate,
    decimals_finalized:false,
    supply_finalized:false,
    contract_approved:false,
    contract_address:null,
    game_to_jetton_conversion_approved:false,
    withdrawals_available:false,
    minting_available:false,
    deposits_available:false,
    disclaimer:'Игровые GM не являются токенами TON. Обмен и выводы недоступны.'
  };
}

// Explicit fail-closed route guard. Env vars must NOT enable token operations.
export function denyTonTokenOperation(){
  return {
    code:'TON_JETTON_NOT_LAUNCHED',
    error:'Реальный GM Jetton ещё не выпущен. Выводы и операции с токеном недоступны.',
    withdrawals_available:false
  };
}
