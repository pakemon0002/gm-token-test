# GM TOKEN 2.0 — approved direction and safe implementation plan

Status: DEVELOPMENT BRANCH ONLY. No live-bot deployment, no Supabase migrations, no changes to existing player balances.

## Confirmed scope
- Keep both original light/dark reference artworks in `docs/`.
- Redesign all screens against original sketches, including premium icons, unique typography, token art, boxes, and market.
- Full-screen polished splash; per-section first-visit guided walkthrough with steps, replay and skip.
- Broad localization including Ukrainian across Profile, Achievements and all other screens; flags and search in picker; persist selection.
- Replace legacy Vault user-facing flow with a wallet-holdings leaderboard. Wallet connection must be read-only by default, via proof-of-control signature; never request seed phrases.
- Mining upgrade progression: 200 sequential levels, first upgrade 150 virtual GM, third 200 virtual GM, +10% at level 2, then +2 percentage points per additional level. Multipliers are NOT additive across levels.
- 10 leagues (Bronze → GM Immortal) based on XP.
- 20 one-of-one early-player cosmetic awards and milestone cosmetics every 25 upgrade levels.
- Ambassador applications: 100 validated referrals, channel ownership verification, tiered bonuses, two equal owners with audit trail.
- Redesign admin panel, support, transaction history; remove noisy confirmation message.

## Migration safety gates
1. Current v5 has a **different** 10-level account XP/mining model and a fixed 45m GM Mining Pool. Do not multiply live GM emissions by the new upgrade bonus until the entire economy and funding model are verified.
2. Upgrade level must be a NEW field/table; never overwrite `users.level` because that drives XP and legacy mining.
3. Any purchase must be a single transaction with atomic sufficient-balance debit, sequential-level enforcement, idempotent operation ID, audit journal, and no user-supplied cost/multiplier.
4. Plan for legacy Vault balances and open positions before hiding legacy Vault endpoints. Never strand player funds or wipe balances.
5. Wallet holding ranking must distinguish game GM from chain GM, verify token contract/network, verify ownership, exclude treasury/shared wallets where needed, and resist double counting.
6. No publishing or connecting real token liquidity without explicit separate review and testing.
7. Regenerate compiled `miniapp/public/main.js` and `styles.css` after source changes and run test/build checks; avoid deploying source-only edits.
8. Visual acceptance: screenshot each screen at matching viewport, compare against both reference sketches, and document mismatches.

## Current commit scope
Implemented in this branch:
- Server stores the independent mining upgrade level in `mining_upgrades` (default 1; existing XP levels untouched).
- Atomic GM upgrade purchases with server-derived costs, strict sequential progression, request-id idempotency, transaction journal and Treasury accounting.
- Bonus applied only to future mining accrual after settlement of previous rate; global mining pool limits remain in place.
- `GET /api/mining/upgrades` returns all 200 levels; `POST /api/mining/upgrade` performs the upgrade; game status exposes current tier.
- Mini App Mining screen contains upgrade summary, purchase button and browsable 200-level progression; light/dark styling.
- Generic success toast removed, targeted feedback retained for collecting GM and upgrading.
- Regression suite includes the existing tests, new math/league tests, API funds/idempotency tests, compiled JavaScript syntax and TypeScript build.
Not yet implemented: dedicated visual redesign of all other screens, league ranking UI, wallet proof flow, ambassador workflow, cosmetics, and the removal of legacy Vault after migration.
**Do not publish to the existing Render service yet:** its `render.yaml` sets `DB_PATH=/tmp/gm-token-test.sqlite` and Render free services use ephemeral filesystems. A new deploy/restart can discard SQLite account and balance data. A verified preservation/migration plan is required before deployment. No new Render service is needed.
