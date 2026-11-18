# GM TOKEN — voluntary anti-bot Verified badge (native GRAM)

This implementation does **not** charge users for connecting or signing a TON wallet proof. A one-time optional **0.05 GRAM** payment to the project recipient enables an extra **GM TOKEN VERIFIED** status for the *same cryptographically verified wallet*.

- Recipient: `UQAUQTPaWFvCkNF9XD_ZgaKjGB6Z1tMraH_8tGbXYBEMaRNB` (public TON address, checksum-validated)
- Network: TON mainnet (`-239`); native currency **GRAM**, **not** a Jetton, **not** GMG.
- Amount: `50000000` nanograms = 0.05 GRAM; a separate network fee applies.
- The user initiates every payment explicitly using the connected wallet's `sendTransaction`. No backend private key, no silent transfers, no payments for TON proof.
- Payment note: `GMV:<random16bytes>`; TON cell with `0x00000000` plain-text comment opcode.
- A server-issued invoice is bound to one authenticated Telegram account and its previously verified wallet address. Reusing an invoice never adds another charge. An expired invoice can be reconciled manually if the user already paid.
- Verification is granted only after a **successful inbound on-chain transfer** to the exact receiver, from the proven sender wallet, with the exact amount, unique note and valid timestamp. A unique transaction hash cannot pay for multiple requests. A screenshot or a client-submitted hash is never sufficient.
- Existing in-game GM/CR balances, funds, mainnet GMG transfers and existing TonProof wallet linking are unchanged.
- A paid badge is not itself evidence that an account is human: retain anti-spam limits and abuse detection.

## Activation prerequisites

1. Apply `migrations/20261118_gram_verification.sql` to the currently connected **GM TOKEN** Supabase instance. The table is private (`gm_game`), has RLS enabled, no client policies/grants, and never edits player balances.
2. Open the existing Mini App from the actual administrator's Telegram account. Connect and cryptographically verify the receiving wallet **itself**. The account must have `owner` or `coowner` role and the signed wallet address must equal the recipient above. Supplying a public address in chat is insufficient to verify ownership.
3. Only after deployment and a test transaction accepted and reconciled with TonAPI, set `GM_GRAM_VERIFICATION_ENABLED=1` in the **existing** Render service configuration. Do not set it before the recipient proof, or users will see unavailable state.
4. Verify a fresh player in Telegram on mainnet, confirm nonce, balance and one-time payment, and verify duplicate clicks, cancellation, low-balance, wrong recipient, wrong sender, incomplete/failed transfers and reconciliation delays.
5. Keep this flag off if chain indexer credentials, reconciliation, refunds/support, published terms, or local regulatory requirements are not ready. This code alone is not a production payment audit.

## Backend endpoints (Telegram-authenticated)

- `GET /api/gram-verification/status` — recipient, amount and verified state, no sensitive data.
- `POST /api/gram-verification/invoice` — idempotent user-bound invoice; returns wallet transaction payload.
- `POST /api/gram-verification/check` — server-side receipt verification against the receiving wallet's TON transactions. Unavailable indexer => no status granted.

## Limitations

- TonAPI transaction history is currently read in batches of up to 100. High-volume production payments require a dedicated reconciler with pagination / archival cursor and retry queue, independent confirmation and operational monitoring.
- The currently deployed app is not a custodial service and cannot sign on behalf of users.
- Native GRAM verification is **separate** from the unfinished on-chain $GMG withdrawal mechanism (still disabled).
