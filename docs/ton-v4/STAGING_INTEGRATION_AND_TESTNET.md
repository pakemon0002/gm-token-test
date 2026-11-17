# GM TOKEN — Ledger v4 + TON Testnet: результаты разработки

Дата проверки: 15 ноября 2026. GitHub: pakemon0002/gm-token-test, PR №32.

**Статус: только staging и read-only Testnet. Не развёрнуто в Render. Не задействует реальную торговлю или реальные переводы.**

## Реализовано

### 1. Атомарная интеграция PostgreSQL

- server/ton-shadow-projection.mjs: точный учёт игровых кошельков, фондов, накопленных Mining/Holding наград, Vault и заблокированных ордеров.
- server/ton-shadow-stage-bridge.mjs: только localhost + база gm_shadow_ci. Читает текущие игровые балансы в настоящей схеме gm_game, выполняет тестовую игровую SQL-операцию и записывает бухгалтерские проводки в gm_ton_shadow в **одной PostgreSQL-транзакции**.
- При недостаточном балансе, расхождении общего предложения или повторном идентификаторе операции откатываются и игровое изменение, и Ledger.
- scripts/ton-shadow-stage-bridge-ci.mjs использует реальную игровую миграцию migrations/20261113_game_postgres.sql в одноразовой базе, проверяя Daily, Mining settle/claim, Holding settle/claim, Vault deposit/withdraw, комиссию, CR-бонус, размещение и снятие ордеров, повтор начисления, сбой и параллельный расход.
- Дополнительный тест scripts/ton-shadow-concurrency-ci.mjs подтверждает блокировку второго параллельного расходования и восстановление после обрыва неподтверждённой сессии.
- Test-only opening использует явный счёт UNBACKED clearing. **Он не означает, что существуют реальные токены в TON.**

### 2. Проверка TON Testnet без подписания транзакций

- server/ton-testnet-preflight.mjs: читает только Testnet-данные Jetton Master с фиксированного endpoint TON Center.
- Идентификатор сети должен быть -3 (Mainnet -239 запрещён).
- Проверяет тип Jetton Master, точное совпадение адреса, наличие total_supply в целых числах, флаг mintable и адрес администратора.
- Предварительная модель: 150 000 000 GM с decimals=6 по уточнению пользователя, то есть 150000000000000 базовых единиц. Не окончательный контракт.
- tests/ton-testnet-preflight.test.mjs проверяет Mainnet mismatch, fake token и некорректный total_supply.

## Что пока не сделано

- Настоящий GM Jetton **не выпускался** ни в Testnet, ни в Mainnet: адрес контракта не предоставлен.
- Нет реального on-chain custody, мониторинга операций, фактической сверки резервов или доступных депозитов и выводов.
- Новая бухгалтерия пока **не подключена к production server/game-pg-worker.mjs**. Это доказанный локальными тестами staging adapter, а не работающая функция для игроков.
- Не определена окончательная tokenomics ликвидности и условий конвертации. Общая игровая эмиссия сама по себе не создаёт реальную ликвидность.
- Нужен аудит взаимодействия календаря в gm_internal с game GM, а также юридическая проверка и правила доступа к финансовым операциям.

## Выполнение тестов

GitHub Actions выполняет проверку без секретов:
1. Pure read-only projector tests.
2. TON Testnet preflight unit tests (mock API, без сетевых вызовов).
3. PostgreSQL 17, шаблоны RLS/staging ledger.
4. Реальная миграция gm_game в одноразовую CI PostgreSQL, атомарные пары игровых изменений и Ledger.
5. Повтор, конкурентные проводки и разрыв соединения.

Результат последнего запуска следует смотреть в GitHub Actions для текущего коммита PR №32; **не считать подготовленный код доказательством боевого запуска**.

Документация TON:
- https://docs.ton.org/applications/payments/jettons
- https://docs.ton.org/ecosystem/walletkit/browser-extension
- https://docs.ton.org/api/v2/rpc/get-token-data
