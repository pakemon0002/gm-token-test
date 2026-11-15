// GM TOKEN economy: CR and POINTS are strictly virtual and never TON assets.
// A future 1:1 GM Jetton is a separate, not-yet-enabled protocol.
export const BOX_POINT_COSTS = Object.freeze({bronze:300,silver:750,gold:1500});

export const GAME_CURRENCY_POLICY = Object.freeze({
  GM:Object.freeze({
    code:'GM',
    purpose:'game_balance',
    game_supply:150_000_000,
    live_jetton_withdrawals:false,
    jetton_backing_verified:false,
    proposed_ton_jetton_ratio:'1 GM game : 1 GM Jetton (pending audit)'
  }),
  CR:Object.freeze({
    code:'CR',
    purpose:'virtual_trade_quote_currency',
    game_supply:1_000_000_000,
    blockchain_asset:false,
    external_deposits:false,
    external_withdrawals:false,
    can_purchase_boxes:false
  }),
  POINTS:Object.freeze({
    code:'POINTS',
    purpose:'in_game_trade_activity_rewards',
    blockchain_asset:false,
    external_deposits:false,
    external_withdrawals:false,
    tradable:false,
    transferable:false,
    earning_basis:'server_confirmed_eligible_GM_CR_fills',
    spending_basis:'fixed_cost_boxes'
  })
});

export function publicGameCurrencyPolicy() {
  return {
    market:'GM/CR — internal game market, not a TON DEX',
    assets:GAME_CURRENCY_POLICY,
    points:{
      daily_earning_cap:1000,
      awarded_for:'eligible executed trades only',
      exclusions:'self-trades, linked traders and excessive repeat-counterparty volume'
    },
    boxes:{
      payment_currency:'POINTS',
      point_costs:BOX_POINT_COSTS,
      calendar_gifts:'Gifted boxes may be opened without paying POINTS',
      awards:'Fixed, disclosed amounts from the finite BOXES game fund; requires reward policy enabled',
      randomized:false
    },
    mainnet_trading_enabled:false
  };
}
