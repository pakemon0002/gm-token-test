GM TOKEN V3 — пакет ассетов для ветки design/gpu-farm-v3.
Распакуйте в корень существующего репозитория holding-group, сохранив структуру public/assets/gpu-v3.
Файлы относятся только к игровой XP-симуляции. Не заменяют базу данных или настройки Telegram.
3D: локальный viewer.js и model-data.js, GLB-модели для дальнейшей работы.
Проверка: npm ci && npm run build && npm run check:api && npm test.
Не переносить в main до проверки интерфейса и сборки.
