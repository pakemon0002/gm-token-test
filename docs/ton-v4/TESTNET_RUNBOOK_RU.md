# GM TOKEN · TON Testnet — безопасный план пробного выпуска
Дата: 15 ноября 2026. Статус: **подготовка без выпуска и без подписания**.

## Что готово в GitHub
- `docs/ton-v4/GM_TESTNET_METADATA_DRAFT.json`: отдельные **GM TOKEN TESTNET / GMTEST**, 9 decimals. Настоящий тикер **GM** не занят этим тестовым выпуском.
- `server/gm-testnet-release.mjs`: сверка предварительной эмиссии **150 000 000 GM** = **150000000000000000** raw units, проверка сети `-3`, метаданных и admin/master без записи в блокчейн.
- `scripts/gm-testnet-status.mjs`: проверка готовности без адреса; после тестового развёртывания — только чтение Master из **TON Testnet**, без транзакций.
- `tests/gm-testnet-release.test.mjs`: проверки ложного Mainnet, чужого Master, неподходящего администратора, порчи эмиссии и вводящих в заблуждение метаданных.
- Приложение Mini App, рабочая Supabase и Render не менялись. Никаких реальных средств и токенов не переведено.

## Техническая база: только официальный Acton jetton template
Пока **нет подготовленного или развёрнутого смарт-контракта**. Для следующего, отдельно подтверждаемого этапа используем официальный шаблон Acton с стандартными `JettonMinter.tolk` и `JettonWallet.tolk`, а не неизвестный контракт или случайный конструктор токенов.

Официальный путь для отдельного локального проекта (команды не выполнялись в GitHub или на Render):

```sh
acton new gm-token-testnet --template jetton --agents
cd gm-token-testnet
acton build
acton test
acton run deploy-emulation
```

Параметры тестового проекта из этого PR:
```
JETTON_NAME="GM TOKEN TESTNET"
JETTON_SYMBOL="GMTEST"
JETTON_DECIMALS="9"
JETTON_DESCRIPTION="GM TOKEN development Jetton for TON Testnet ONLY. No monetary value, no connection to a live token, no deposits, redemptions or exchanges. In-game GM and virtual CR/POINTS remain separate."
JETTON_IMAGE="https://gm-token-test-iprj.onrender.com/assets/brand-original-reference/gm-lettermark-metallic-transparent.png"
```

**Проверка 15.11.2026:** GitHub Actions запросил указанный HTTPS URL и подтвердил, что он отдаёт PNG (проверены MIME и размер). Это не закрепляет файл криптографически и не означает, что итоговые Jetton metadata уже опубликованы на TON. Перед развёртыванием нужно проверить финальную картинку, источник и условия неизменности.

## Граница подписания: требуется действие владельца
Testnet-контракт может быть развёрнут только после отдельного подтверждения тестового кошелька. Никогда не сообщайте seed-фразу, приватный ключ, резервные коды и не добавляйте их в код, GitHub, Supabase или переменные Render.

Для тестового (безценного) Jetton официальный Acton поддерживает TON Connect, чтобы владелец кошелька сам подтверждал действие. Операции с Mainnet в этом этапе запрещены. Первоначальная эмиссия после deploy может быть равна нулю — это нормально. Предварительные 150 млн являются верхней тестовой целью, не автоматически созданными Jetton.

**После появления тестового адреса Jetton Master:**

```sh
node scripts/gm-testnet-status.mjs --master=0:PASTE_REAL_TESTNET_MASTER_ADDRESS
```

При необходимости проверяем, что on-chain admin совпадает с **проверенным тестовым** кошельком:

```sh
node scripts/gm-testnet-status.mjs --master=0:PASTE_REAL_TESTNET_MASTER_ADDRESS --admin=0:EXPECTED_ADMIN_ADDRESS
```

Этот скрипт не создаёт токены и не изменяет игровые данные. Отсутствие адреса означает, что токен не развёрнут. Совпадение `total_supply` **не доказывает** обеспечение игровых GM.

## Проверки до следующей стадии
1. Получить проверенный код официального шаблона и зафиксировать его исходный коммит/версию и хеш собранного контракта; пройти тесты в локальном эмуляторе.
2. Проверить URL изображения и неизменность metadata.
3. Подтвердить тестовую сеть `-3` и проверить адрес администратора в самом кошельке.
4. Проверить корректную передачу и отзыв прав эмиссии, адрес получателя, кошельки Jetton и устойчивость к поддельному Master.
5. Провести испытания transfer, burn, bounce, replay, договорный cap без каких-либо реальных средств.
6. Решить отдельным обсуждением, какие игровые GM вообще доступны для вывода и как подтвердить on-chain резервы. **CR и POINTS никогда не являются Jetton.**
7. Только после независимой проверки безопасности можно обсуждать реальный выпуск. Mainnet, депозит и вывод остаются выключены.

Источники:
- https://docs.ton.org/contracts/standard/tokens/jettons/create
- https://docs.ton.org/contracts/standard/tokens/metadata
- https://docs.ton.org/api/v2/rpc/get-token-data
- https://docs.ton.org/applications/payments/jettons
