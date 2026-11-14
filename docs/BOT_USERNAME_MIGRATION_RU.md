# GM TOKEN — переход на @GmTokenApp

## Проверенная идентичность

При развертывании на Render 14 ноября 2026 Telegram API getMe подтвердил, что сохраненный в Render BOT_TOKEN принадлежит **@gmtokenapp**. Это имя пишется здесь в согласованной форме **@GmTokenApp** — регистр букв в usernames Telegram несущественен.

Новый бот с username @GM_TOKEN_BOT был создан отдельно, но пользователь выбрал вместо него уже доступного @GmTokenApp. Продолжать использовать в Render токен именно @GmTokenApp.

## Обновление

- Все пользовательские ссылки на Mini App, профиль бота, реферальные приглашения и сообщения поддержки должны указывать на `https://t.me/GmTokenApp`.
- Значение Render `BOT_USERNAME`: `GmTokenApp`.
- `BOT_TOKEN`: существующий подтвержденный сервером токен @GmTokenApp (не копировать в GitHub или чат).
- `BOT_WEBHOOK_SECRET`: уже заменен ранее на новый случайный секрет.
- Публичный URL приложения не менять: `https://gm-token-test-iprj.onrender.com`.
- После выпуска проверить серверный лог `Telegram bot identity verified: @gmtokenapp`, затем `Telegram webhook configured.`.
- В @BotFather → /mybots → @GmTokenApp настроить **Main App** на существующий Mini App URL. Меню откроет тот же URL, если сервер успеет выполнить `setChatMenuButton`.
- Нажать `/start` в @GmTokenApp, проверить Mini App авторизацию, сохраненный игровой баланс и историю, рефералов и поддержку.
- Старые ссылки @gm_token_test_bot и @GM_TOKEN_BOT не будут автоматически переадресованы; заменить их в публичных каналах и постах.

## Что остается неизменным

Существующая Supabase PostgreSQL, пользователи (по Telegram ID), игровые GM/CR/POINTS, история операций, календарь, Render service, адрес Mini App. Реальные TON Jetton не выпускались, выводы выключены.

Ни одна seed-фраза, wallet key или BotFather API token не должна сохраняться в GitHub. При следующем обновлении безопасно проверить, что никто из модераторов не потерял доступ к уведомлениям.
