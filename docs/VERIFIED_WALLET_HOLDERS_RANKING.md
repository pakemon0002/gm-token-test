# GM TOKEN — verified external-wallet holders leaderboard
Status: **implemented in a test feature branch; not yet deployed**, with contract-dependent scoring disabled until an authentic GM Jetton master is provided (2026-11-11)

## Definition of holdings
- Rank players **only by real GM Jetton holdings on an externally connected TON mainnet wallet**.
- In-game GM, CR, mined rewards, Vault/holding balances, screenshots, manually entered values, TON coin balance, and tokens sharing the "GM" ticker **do not count**.
- Use an explicitly confirmed GM Jetton **master contract address**, not a token's name, symbol or a claimed exchange ticker.
- Until the authentic contract is approved and configured, the leaderboard remains **inactive with an honest explanation**. Do not display made-up participants or invented GM balances.

## Required proof of wallet control
1. User signs into the Telegram Mini App using validated Telegram initData; use server-derived Telegram user ID.
2. TON Connect requests a short-lived, server-issued, single-use `ton_proof` challenge, bound to that Telegram ID and the actual dApp domain.
3. Server validates the complete TON proof: wallet StateInit/address, supported wallet code/public key, Ed25519 signature, domain, network (-239 mainnet), signing time, nonce expiry and replay prevention. **Never trust a wallet address or a public key asserted by a browser without cryptographic verification**.
4. Persist only the verified canonical account address, Telegram user ID, proof time and verification metadata. Never request or store seed phrases, recovery phrases, signing keys, or transactions.
5. One verified address may count for only one active leaderboard participant. Re-linking must invalidate its previous association and require a fresh signed proof. A user cannot count multiple accounts by duplicating a wallet.
6. Disconnecting a wallet removes it from the active leaderboard. Allow opt-in/opt-out without deleting the user's game account.

## Authoritative balance checks
- Server fetches the real on-chain balance of **the configured GM master contract**, indexed by the verified canonical TON address, over a trusted TON mainnet API.
- Check Jetton master identity in the response; reject wrong contract, mismatched chain, malformed balance, unexpected decimals, API errors, and unavailable blockchain data.
- Store amounts as arbitrary-precision integers in smallest token units; do not use JS floating point for the rank order.
- Show the timestamp of the last successful check. Refresh every few minutes with backoff and API rate limits. If the last confirmation is stale, temporarily exclude the balance from public ranking instead of reusing it as a fresh value.
- Read-only balance checks: no payments, token transfers, approvals, staking or withdrawal logic.

## Ranking UI (both Silver & Graphite)
- Top three on an **asymmetric podium**: #1 center highest, #2 to the right slightly lower, #3 to the left lower.
- Below: all verified eligible players, sorted by chain holdings descending; use stable user-ID tie-break to avoid flickering.
- Paginated/infinite-scroll results and "Find my position"; no fixed top 50 cut-off. Show participants count and freshness time.
- Only show opted-in players. Public profile exposes a display alias and rank/GM amount, **not the full wallet address**. User can hide their entry any time.
- Missing official contract / failed proof / expired snapshot / empty holder set have distinct, helpful states. Never fake the #1, #2, or #3 podium.
- User's position updates after successful on-chain verification, not from client-submitted balances.

## Abuse resistance & acceptance tests
- Forged wallet address, fake TON proof, expired nonce, replayed nonce, wrong network/domain, duplicate wallet link, wrong Jetton master, negative/malformed balance, RPC outage and expired balance snapshots do not produce a rank.
- A large valid balance ranks ahead of a smaller valid balance using integer-safe arithmetic; ties are deterministic.
- No direct client API can set `verified=true`, balances, holding amounts or ranks.
- Client can never authorize a transfer or request secret wallet credentials.
- Never mix this score with the separate in-game XP leagues.
- Refrain from promoting financial trading or rewards based on real token purchasing in this feature.

## Integration prerequisite
**GM_JETTON_MASTER_ADDRESS** (verified contract on TON mainnet) is presently **unknown**. Do not guess from name or symbol. A production-grade TON proof validator and authoritative chain balance reader must be implemented, tested and reviewed **before** enabling the ranking.

## Implementation notes (2026-11-11)
- `server/ton-proof.mjs` checks recognized V4/V5 state initialization, address derivation, timestamp, signed hostname, nonce, mainnet and Ed25519 signature using pinned `@ton/ton`.
- `server/holders.mjs` holds one-time challenges, unique links and privacy opt-in, fetches GM Jetton balances from a fixed TON API endpoint, then sorts chain-verified balances as decimal-integer strings. Zero-token wallets do not rank.
- `GET /api/holders`, `GET /api/holders/status`, `POST /api/holders/challenge`, `/verify`, `/consent`, `/refresh`, `/disconnect` use signed Telegram initData. No API accepts an arbitrary balance.
- The React Mini App provides a silver/graphite #3/#1/#2 podium, unlimited paginated rows, the player's rank, proof-confirmed wallet status and opt-in/out.
- Existing deployment uses ephemeral `/tmp` SQLite. Before production use, relocate linked wallet identities and snapshots to persistent storage and externally review proof support and TON API consistency.
- Test suite exercises valid and forged V4/V5 signatures, replay, binding, stale snapshots, consent, giant balances and invalid HTTP requests. Live TON mainnet and contract data have not been end-to-end exercised.
