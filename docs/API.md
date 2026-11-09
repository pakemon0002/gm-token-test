> **Актуальная безопасность:** см. [SECURITY_AUDIT_2026-11-08.md](SECURITY_AUDIT_2026-11-08.md). Этот API нельзя считать готовым для публичного запуска.

# GM TOKEN Server API v0.1

## Режим

HTTP `localhost:8787`; при развёртывании передавать HTTPS из Telegram. `GET /api/health` публичен. Каждый пользовательский запрос отправляет HTTP `Authorization: tma <Telegram.WebApp.initData>` (сырой query string), HMAC вычисляется только на сервере с BOT_TOKEN, срок годности 24 ч. `GET /api/bootstrap` создаёт пользователя и единожды выдаёт 5000 CR из Welcome Reserve.

## Основные маршруты

| Метод | Путь | Состояние |
|---|---|---|
| GET | /api/health | Работает |
| GET | /api/public/pools | Работает, баланс в сотых |
| GET | /api/bootstrap | Работает, авторизация Telegram |
| GET | /api/me | Работает |
| GET | /api/history | Журнал действий пользователя; ограниченно |
| GET/POST | /api/tickets | Работает |
| POST | /api/tickets/:id/auto | Работает, максимум две попытки для P3 |
| POST | /api/tickets/:id/claim | Работает для модераторов |
| POST | /api/tickets/:id/reply | Работает |
| POST | /api/tickets/:id/resolve | Работает |
| POST | /api/tickets/:id/reopen | Работает |
| GET | /api/admin/team | Owner / Co-Owner |
| POST | /api/admin/moderators | Только владельцы + TOTP |
| GET | /api/admin/pools | Owner / Co-Owner |
| POST | /api/admin/transfer | Только Treasury/Future, TOTP, журнал |
| POST | /api/admin/correction | Коррекция из реального резерва, TOTP, журнал |
| POST | /api/admin/restrictions | До 24 ч, Owner/Co-Owner/Moderator |
| GET/POST | /api/game/status, /api/mining/claim | Реализовано (награды из конечного пула) |
| POST | /api/vault/deposit, /api/vault/withdraw, /api/vault/claim | Реализовано; ставка Holding по умолчанию 0 |
| GET/POST | /api/exchange/book, /api/exchange/orders, /api/exchange/order, /api/exchange/edit, /api/exchange/cancel, /api/exchange/trades | Реализовано в тестовой среде; не готово к публичной эксплуатации |
| GET/POST | /api/shop/quote, /api/shop/exchange | Выключено до утверждения безопасной формулы курса |
| GET/POST | /api/boxes/open, /api/tasks, /api/achievements | Зависит от утверждённого каталога наград |
| POST | /api/admin/restrictions/revoke | Снятие ограничения владельцем, с 2FA |

## Примеры JSON-запросов администраторов

Перевод (подписанный запрос только от владельца):

```json
{"source":"TREASURY","target":"HOLDING","amount":"100.00","reason":"Пополнение игрового фонда Holding","operationId":"<uuid>","code":"<6-значный TOTP>"}
```

Исправление баланса:

```json
{"userId":"<telegram-id>","sourcePool":"MINING","currency":"GM","amount":"100.00","direction":"credit","ticket":"GM-000123","reason":"Проверенная ошибка начисления Mining","operationId":"<uuid>","code":"<6-значный TOTP>"}
```

**Никогда** не храните BOT_TOKEN или TOTP-секреты в браузерном коде. Код подтверждения можно ввести только в Admin Panel по HTTPS. Для каждого важного действия нужен новый, ещё не использованный TOTP.
