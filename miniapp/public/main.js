// GM TOKEN UI · original layouts + original 216 PNG pack. No third-party icon replacements.
const store = { getItem: (key) => { try {
        return window.localStorage.getItem(key);
    }
    catch {
        return null;
    } }, setItem: (key, value) => { try {
        window.localStorage.setItem(key, value);
    }
    catch { } } };
const A = './assets/icons/';
const BRAND = './assets/brand-original-reference/';
const firstWallet = { gm: 0, cr: 0, vault: 0, xp: 0, level: 1, claims: 0, lastClaim: '', lastMiningXpDay: '', lastVaultWithdrawDay: '', streak: 0, storage: 0, storageUpdated: 0, tickets: [], orders: [], traded: 0, rewardClaimed: false };
const xpThreshold = [0, 100, 250, 450, 750, 1150, 1700, 2400, 3300, 4400];
const miningBase = [10, 14, 19, 25, 32, 40, 50, 62, 75, 90];
const powerBonus = (lvl) => lvl >= 10 ? 25 : lvl >= 8 ? 20 : lvl >= 6 ? 15 : lvl >= 4 ? 10 : lvl >= 2 ? 5 : 0;
const storageHours = (lvl) => lvl >= 9 ? 24 : lvl >= 7 ? 20 : lvl >= 5 ? 16 : lvl >= 3 ? 12 : 8;
const holdingBonus = (n) => { let p = 0; for (const [limit, b] of [[50, 5], [100, 10], [250, 15], [500, 20], [1000, 25], [2000, 30], [5000, 35], [10000, 40], [25000, 45], [50000, 50]])
    if (n >= limit)
        p = b; return p; };
const gmRate = (v) => miningBase[Math.min(9, Math.max(0, v.level - 1))] * (1 + powerBonus(v.level) / 100) * (1 + holdingBonus(v.vault) / 100);
const nf = (n, dec = 2) => Number(n).toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const clean = (s) => String(s).replace(/[<>]/g, '');
// No local sample accounts, fictional prices, charts, tasks, or podium entries.
const timeNow = () => new Date().toISOString().slice(0, 10);
const todayUTC = () => new Date().toISOString().slice(0, 10);
const ICON_ALIASES = { search: 'scanner', send: 'telegram', globe: 'info' };
function Icon({ name, theme, size = 24, tile = false, alt = '', className = '' }) {
    const asset = ICON_ALIASES[name] || name;
    return React.createElement("img", { className: 'gm-icon ' + className, src: `${A}${theme}/${tile ? 'tiles' : 'transparent'}/${asset}.png`, width: size, height: size, alt: alt, draggable: "false", loading: "lazy", onError: (event) => { const img = event.currentTarget; if (img.dataset.iconFallback)
            return; img.dataset.iconFallback = '1'; img.src = `${A}${theme}/transparent/info.png`; } });
}
function PlayerAvatar({ name = '', photoUrl = '', size = 'medium', rank = 0 }) {
    const label = String(name || 'GM').trim();
    const initials = label.replace(/^@/, '').split(/[ _-]+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || 'GM';
    const allowedPhoto = typeof photoUrl === 'string' && /^https:\/\//.test(photoUrl) && photoUrl.length < 1024;
    return React.createElement("span", { className: 'gm-player-avatar gm-player-avatar-' + size + ' gm-player-rank-' + rank, "aria-label": 'Аватар ' + label },
        allowedPhoto ? React.createElement("img", { src: photoUrl, alt: "", referrerPolicy: "no-referrer", loading: "lazy", onError: (ev) => { ev.currentTarget.style.display = 'none'; } }) : null,
        React.createElement("span", { className: "gm-player-initials" }, initials),
        React.createElement("span", { className: "gm-player-avatar-spark", "aria-hidden": "true" }, "\u2726"));
}
function Brand({ theme, size = 50 }) { return React.createElement("img", { className: "brand-coin", src: BRAND + (theme === 'light' ? 'gm-coin-light-original.png' : 'gm-coin-dark-original.png'), width: size, height: size, alt: "\u041B\u043E\u0433\u043E\u0442\u0438\u043F GM TOKEN", draggable: "false" }); }
function GButton({ children, onClick, light = false, disabled = false, icon, theme }) { return React.createElement("button", { type: "button", className: 'capsule ' + (light ? 'pale' : 'dark-cap'), onClick: onClick, disabled: disabled },
    icon && React.createElement(Icon, { name: icon, theme: theme, size: 22 }),
    React.createElement("span", null, children)); }
function SparkLine({ theme, compact = false }) {
    return React.createElement("div", { className: "real-data-empty", role: "status" }, "\u0413\u0440\u0430\u0444\u0438\u043A \u0431\u0430\u043B\u0430\u043D\u0441\u0430 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043D\u0430\u043A\u043E\u043F\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u043E\u0439 \u0438\u0441\u0442\u043E\u0440\u0438\u0438");
}
function Candles({ theme, candles = [], selected = null, onSelect = (_time) => { }, interval = '1h' }) {
    const e = React.createElement;
    const valid = (Array.isArray(candles) ? candles : []).filter(c => c && Number.isFinite(c.time) && Number.isFinite(c.open) && Number.isFinite(c.high) &&
        Number.isFinite(c.low) && Number.isFinite(c.close) && Number.isFinite(c.volume_gm_cents) &&
        c.low <= Math.min(c.open, c.close) && c.high >= Math.max(c.open, c.close) && c.volume_gm_cents >= 0).slice(-48);
    if (!valid.length)
        return e('div', { className: 'terminal-empty-chart', role: 'status' }, e('div', { className: 'terminal-empty-chart-mark' }, e(Icon, { theme, name: 'candlesticks', size: 34 })), e('strong', null, 'Пока нет исполненных сделок'), e('span', null, 'График появится после первой сделки GM/CR. Пустые интервалы не заполняются искусственными свечами.'));
    const n = valid.length;
    const rawLow = Math.min(...valid.map(c => c.low)), rawHigh = Math.max(...valid.map(c => c.high));
    const middle = (rawHigh + rawLow) / 2;
    const spread = Math.max(6, Math.ceil(Math.max(rawHigh - rawLow, middle * .07)));
    const boundLow = Math.max(0, Math.floor(middle - spread * .72));
    const boundHigh = Math.max(rawHigh + 1, Math.ceil(middle + spread * .72));
    const top = 20, bottom = 160, volumeTop = 191, volumeBottom = 222;
    const mapPrice = p => top + (boundHigh - p) / (boundHigh - boundLow) * (bottom - top);
    const startX = 15, endX = 283, width = endX - startX;
    const step = width / n;
    const centerAt = i => startX + step * (i + .5);
    const candleWidth = Math.min(13, Math.max(3, step * .58));
    const volumeMax = Math.max(1, ...valid.map(c => c.volume_gm_cents));
    const fmt = t => new Date(t * 1000).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const fmtTime = t => interval === '1d' || interval === '4h' ? new Date(t * 1000).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : new Date(t * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const picked = valid.find(c => c.time === selected) || valid[n - 1];
    const up = theme === 'dark' ? '#73D9BA' : '#278E78';
    const down = theme === 'dark' ? '#FF98A3' : '#C85A72';
    const flat = theme === 'dark' ? '#B2BAD0' : '#717F9B';
    const brush = c => c.close > c.open ? up : c.close < c.open ? down : flat;
    const captionIndices = [0, Math.floor((n - 1) / 2), n - 1].filter((x, i, a) => a.indexOf(x) === i);
    return e('div', { className: 'terminal-candle-view' }, e('div', { className: 'terminal-candle-stage' }, e('svg', { className: 'terminal-candles', viewBox: '0 0 350 252', role: 'img',
        'aria-label': n + ' подтверждённых свечей GM/CR; график построен только по реальным сделкам',
        preserveAspectRatio: 'xMidYMid meet' }, [0, 1, 2, 3, 4].map(i => {
        const price = boundHigh - (boundHigh - boundLow) * i / 4;
        const y = top + (bottom - top) * i / 4;
        return e('g', { key: 'grid' + i }, e('line', { x1: startX, x2: endX, y1: y, y2: y, className: 'terminal-chart-grid' }), e('text', { x: 292, y: y + 3.5, className: 'terminal-chart-price' }, nf(price / 100, 2)));
    }), e('line', { x1: startX, x2: endX, y1: volumeTop - 12, y2: volumeTop - 12, className: 'terminal-chart-separator' }), e('text', { x: startX, y: volumeTop - 2, className: 'terminal-chart-vol-title' }, 'VOLUME · GM'), valid.map((c, i) => {
        const x = centerAt(i), high = mapPrice(c.high), low = mapPrice(c.low), y1 = mapPrice(c.open), y2 = mapPrice(c.close), bodyTop = Math.min(y1, y2), bodyHeight = Math.max(2.5, Math.abs(y2 - y1));
        const col = brush(c);
        const volumeHeight = Math.max(2, c.volume_gm_cents / volumeMax * 26);
        const active = c.time === picked.time;
        return e('g', { key: c.time, className: active ? 'terminal-active-candle' : '',
            onClick: () => onSelect(c.time), tabIndex: 0, role: 'button',
            'aria-label': fmt(c.time) + '; Open ' + nf(c.open / 100) + '; High ' + nf(c.high / 100) + '; Low ' + nf(c.low / 100) + '; Close ' + nf(c.close / 100),
            onKeyDown: ev => { if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                onSelect(c.time);
            } } }, e('title', null, fmt(c.time) + ' · O ' + nf(c.open / 100) + ' H ' + nf(c.high / 100) + ' L ' + nf(c.low / 100) + ' C ' + nf(c.close / 100)), active ? e('line', { x1: x, x2: x, y1: top - 5, y2: volumeBottom + 1, className: 'terminal-chart-crosshair' }) : null, c.high > c.low ? e('line', { x1: x, x2: x, y1: high, y2: low, stroke: col, strokeWidth: 1.45, strokeLinecap: 'round' }) : null, e('rect', { x: x - candleWidth / 2, y: bodyTop - (y1 === y2 ? 1.25 : 0), width: candleWidth, height: bodyHeight, rx: 1.3, fill: col }), e('rect', { x: x - candleWidth / 2, y: volumeBottom - volumeHeight, width: candleWidth, height: volumeHeight, rx: 1.1, fill: col, opacity: .5 }), e('rect', { x: x - Math.max(11, step / 2), y: top - 7, width: Math.max(22, step), height: volumeBottom - top + 13,
            fill: 'transparent', 'aria-hidden': true }));
    }), captionIndices.map(i => e('text', { key: 'label' + i, x: centerAt(i), y: 246,
        textAnchor: i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle',
        className: 'terminal-chart-time' }, fmtTime(valid[i].time))))), e('div', { className: 'terminal-candle-inspector', role: 'status' }, e('div', { className: 'terminal-inspector-heading' }, e('b', null, fmt(picked.time)), e('span', null, n === 1 ? '1 свеча по реальным сделкам' : n + ' свечей с реальными сделками')), e('div', { className: 'terminal-inspector-grid' }, [['O', picked.open], ['H', picked.high], ['L', picked.low], ['C', picked.close]].map(([name, value]) => e('span', { key: name }, e('small', null, name), e('b', null, nf(value / 100)))), e('span', null, e('small', null, 'VOL'), e('b', null, nf(picked.volume_gm_cents / 100))), e('span', null, e('small', null, 'TRADES'), e('b', null, String(picked.trades || 0))))), e('div', { className: 'terminal-candle-legend' }, e('span', null, e('i', { className: 'terminal-legend-up' }), ' Рост'), e('span', null, e('i', { className: 'terminal-legend-down' }), ' Падение'), e('span', null, e('i', { className: 'terminal-legend-flat' }), ' Без изменения'), e('span', { className: 'terminal-legend-note' }, 'Без искусственных свечей')));
}
function BarButton({ name, title, theme, selected = false, onClick }) { return React.createElement("button", { className: 'nav-entry ' + (selected ? 'active' : ''), onClick: onClick, "aria-label": title, "aria-current": selected ? 'page' : undefined },
    React.createElement(Icon, { theme: theme, name: name, size: 23 }),
    React.createElement("span", null, title)); }
async function gmFetchJson(path, opts = {}, retries = 0) {
    let lastError;
    for (let i = 0; i <= retries; i++) {
        const ctl = typeof AbortController === 'function' ? new AbortController() : null;
        const timeout = ctl ? setTimeout(() => ctl.abort(), 24000) : null;
        try {
            const res = await fetch(path, { ...opts, ...(ctl ? { signal: ctl.signal } : {}) });
            const body = await res.json().catch(() => ({}));
            if (res.ok)
                return body;
            const error = Error(String(body?.error || 'HTTP ' + res.status));
            error.status = res.status;
            if (res.status < 500)
                throw error;
            lastError = error;
            if (i === retries)
                throw error;
        }
        catch (err) {
            lastError = err;
            if (err?.status && err.status < 500)
                throw err;
            if (i === retries)
                throw err?.status ? err : Error('Нет связи с сервером. Проверь интернет и открой приложение ещё раз.');
        }
        finally {
            if (timeout)
                clearTimeout(timeout);
        }
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
    throw lastError || Error('Недоступно');
}
const gmLanguages = [['auto', '🌐 Telegram · Auto'], ['ru', '🇷🇺 Русский'], ['uk', '🇺🇦 Українська'], ['en', '🇬🇧 English'], ['es', '🇪🇸 Español'], ['de', '🇩🇪 Deutsch'], ['fr', '🇫🇷 Français'], ['tr', '🇹🇷 Türkçe'], ['pt', '🇵🇹 Português'], ['pl', '🇵🇱 Polski'], ['it', '🇮🇹 Italiano']];
const gmWords = {
    ru: ['Главная', 'Рынок', 'Майнинг', 'Боксы', 'Ещё', 'Язык', 'Настройки', 'Далее', 'Начать', 'Пропустить'],
    uk: ['Головна', 'Ринок', 'Майнінг', 'Бокси', 'Ще', 'Мова', 'Налаштування', 'Далі', 'Почати', 'Пропустити'],
    en: ['Home', 'Market', 'Mining', 'Boxes', 'More', 'Language', 'Settings', 'Next', 'Start', 'Skip'],
    es: ['Inicio', 'Mercado', 'Minería', 'Cajas', 'Más', 'Idioma', 'Ajustes', 'Siguiente', 'Empezar', 'Saltar'],
    de: ['Start', 'Markt', 'Mining', 'Boxen', 'Mehr', 'Sprache', 'Einstellungen', 'Weiter', 'Starten', 'Überspringen'],
    fr: ['Accueil', 'Marché', 'Minage', 'Coffres', 'Plus', 'Langue', 'Paramètres', 'Suivant', 'Commencer', 'Passer'],
    tr: ['Ana sayfa', 'Pazar', 'Madencilik', 'Kutular', 'Diğer', 'Dil', 'Ayarlar', 'Devam', 'Başla', 'Atla'],
    pt: ['Início', 'Mercado', 'Mineração', 'Caixas', 'Mais', 'Idioma', 'Configurações', 'Próximo', 'Começar', 'Pular'],
    pl: ['Start', 'Rynek', 'Wydobycie', 'Skrzynki', 'Więcej', 'Język', 'Ustawienia', 'Dalej', 'Zacznij', 'Pomiń'],
    it: ['Home', 'Mercato', 'Mining', 'Box', 'Altro', 'Lingua', 'Impostazioni', 'Avanti', 'Inizia', 'Salta']
};
const gmKeys = ['home', 'market', 'mining', 'boxes', 'more', 'language', 'settings', 'next', 'start', 'skip'];
const UI_TRANSLATIONS = {
    "profile": { ru: "Профиль", uk: "Профіль", en: "Profile", es: "Perfil", de: "Profil", fr: "Profil", tr: "Profil", pt: "Perfil", pl: "Profil", it: "Profilo" },
    "achievements": { ru: "Достижения", uk: "Досягнення", en: "Achievements", es: "Logros", de: "Erfolge", fr: "Succès", tr: "Başarılar", pt: "Conquistas", pl: "Osiągnięcia", it: "Obiettivi" },
    "history": { ru: "История операций", uk: "Історія операцій", en: "Transaction history", es: "Historial", de: "Verlauf", fr: "Historique", tr: "İşlem geçmişi", pt: "Histórico de transações", pl: "Historia", it: "Cronologia" },
    "friends": { ru: "Друзья", uk: "Друзі", en: "Friends", es: "Amigos", de: "Freunde", fr: "Amis", tr: "Arkadaşlar", pt: "Amigos", pl: "Znajomi", it: "Amici" },
    "balance": { ru: "Баланс", uk: "Баланс", en: "Balance", es: "Saldo", de: "Guthaben", fr: "Solde", tr: "Bakiye", pt: "Saldo", pl: "Saldo", it: "Saldo" },
    "streak": { ru: "Серия", uk: "Серія", en: "Streak", es: "Racha", de: "Serie", fr: "Série", tr: "Seri", pt: "Sequência", pl: "Seria", it: "Serie" },
    "referrals": { ru: "Реферальная программа", uk: "Реферальна програма", en: "Referral program", es: "Referidos", de: "Empfehlungen", fr: "Parrainage", tr: "Davet programı", pt: "Programa de indicações", pl: "Polecenia", it: "Inviti" },
    "support": { ru: "Поддержка", uk: "Підтримка", en: "Support", es: "Soporte", de: "Support", fr: "Assistance", tr: "Destek", pt: "Suporte", pl: "Wsparcie", it: "Supporto" },
    "logout": { ru: "Выйти", uk: "Вийти", en: "Log out", es: "Salir", de: "Abmelden", fr: "Déconnexion", tr: "Çıkış yap", pt: "Sair", pl: "Wyloguj", it: "Esci" },
    "theme": { ru: "Тема оформления", uk: "Тема оформлення", en: "Appearance", es: "Apariencia", de: "Design", fr: "Apparence", tr: "Görünüm", pt: "Aparência", pl: "Wygląd", it: "Aspetto" },
    "personalization": { ru: "Персонализация", uk: "Персоналізація", en: "Personalization", es: "Personalización", de: "Personalisierung", fr: "Personnalisation", tr: "Kişiselleştirme", pt: "Personalização", pl: "Personalizacja", it: "Personalizzazione" },
    "interfaceLanguage": { ru: "Язык интерфейса", uk: "Мова інтерфейсу", en: "Interface language", es: "Idioma de la interfaz", de: "Sprache", fr: "Langue de l’interface", tr: "Arayüz dili", pt: "Idioma da interface", pl: "Język interfejsu", it: "Lingua interfaccia" },
    "instruction": { ru: "Инструкция", uk: "Інструкція", en: "Guide", es: "Guía", de: "Anleitung", fr: "Guide", tr: "Kılavuz", pt: "Instruções", pl: "Instrukcja", it: "Guida" },
    "replay": { ru: "Пройти инструкцию", uk: "Пройти інструкцію", en: "Replay tutorial", es: "Repetir tutorial", de: "Tutorial wiederholen", fr: "Revoir le guide", tr: "Rehberi tekrar aç", pt: "Rever tutorial", pl: "Powtórz samouczek", it: "Rivedi tutorial" },
    "account": { ru: "Аккаунт", uk: "Акаунт", en: "Account", es: "Cuenta", de: "Konto", fr: "Compte", tr: "Hesap", pt: "Conta", pl: "Konto", it: "Account" },
    "game": { ru: "Игра", uk: "Гра", en: "Game", es: "Juego", de: "Spiel", fr: "Jeu", tr: "Oyun", pt: "Jogo", pl: "Gra", it: "Gioco" },
    "help": { ru: "Помощь", uk: "Допомога", en: "Help", es: "Ayuda", de: "Hilfe", fr: "Aide", tr: "Yardım", pt: "Ajuda", pl: "Pomoc", it: "Aiuto" },
    "tasks": { ru: "Задания", uk: "Завдання", en: "Tasks", es: "Tareas", de: "Aufgaben", fr: "Tâches", tr: "Görevler", pt: "Tarefas", pl: "Zadania", it: "Attività" },
    "leaderboard": { ru: "Рейтинг", uk: "Рейтинг", en: "Leaderboard", es: "Clasificación", de: "Rangliste", fr: "Classement", tr: "Liderlik tablosu", pt: "Classificação", pl: "Ranking", it: "Classifica" },
    "global": { ru: "Все", uk: "Усі", en: "Global", es: "Global", de: "Global", fr: "Global", tr: "Genel", pt: "Global", pl: "Globalny", it: "Globale" },
    "miningUpgrades": { ru: "Улучшения майнинга", uk: "Покращення майнінгу", en: "Mining upgrades", es: "Mejoras de minería", de: "Mining-Upgrades", fr: "Améliorations de minage", tr: "Madencilik yükseltmeleri", pt: "Melhorias de mineração", pl: "Ulepszenia kopania", it: "Potenziamenti mining" },
    "nextLevel": { ru: "Следующий уровень", uk: "Наступний рівень", en: "Next level", es: "Siguiente nivel", de: "Nächstes Level", fr: "Niveau suivant", tr: "Sonraki seviye", pt: "Próximo nível", pl: "Następny poziom", it: "Livello successivo" },
    "level": { ru: "Уровень", uk: "Рівень", en: "Level", es: "Nivel", de: "Level", fr: "Niveau", tr: "Seviye", pt: "Nível", pl: "Poziom", it: "Livello" },
    "speed": { ru: "Скорость", uk: "Швидкість", en: "Speed", es: "Velocidad", de: "Tempo", fr: "Vitesse", tr: "Hız", pt: "Velocidade", pl: "Prędkość", it: "Velocità" },
    "upgrade": { ru: "Улучшить майнинг", uk: "Покращити майнінг", en: "Upgrade mining", es: "Mejorar minería", de: "Mining verbessern", fr: "Améliorer le minage", tr: "Madenciliği geliştir", pt: "Melhorar mineração", pl: "Ulepsz kopanie", it: "Migliora mining" },
    "insufficient": { ru: "Недостаточно GM", uk: "Недостатньо GM", en: "Not enough GM", es: "GM insuficiente", de: "Zu wenig GM", fr: "GM insuffisants", tr: "Yetersiz GM", pt: "GM insuficiente", pl: "Za mało GM", it: "GM insufficienti" },
    "allLevels": { ru: "Все 200 уровней", uk: "Усі 200 рівнів", en: "All 200 levels", es: "Los 200 niveles", de: "Alle 200 Level", fr: "Les 200 niveaux", tr: "200 seviye", pt: "Todos os 200 níveis", pl: "200 poziomów", it: "Tutti i 200 livelli" },
    "collapse": { ru: "Свернуть список", uk: "Згорнути список", en: "Collapse list", es: "Cerrar lista", de: "Liste schließen", fr: "Réduire la liste", tr: "Listeyi daralt", pt: "Recolher lista", pl: "Zwiń listę", it: "Chiudi elenco" },
    "locked": { ru: "Закрыто", uk: "Закрито", en: "Locked", es: "Bloqueado", de: "Gesperrt", fr: "Verrouillé", tr: "Kilitli", pt: "Bloqueado", pl: "Zablokowane", it: "Bloccato" },
    "earned": { ru: "Получено", uk: "Отримано", en: "Claimed", es: "Obtenido", de: "Erhalten", fr: "Obtenu", tr: "Alındı", pt: "Obtido", pl: "Odebrane", it: "Ottenuto" },
    "claim": { ru: "Получить", uk: "Отримати", en: "Claim", es: "Reclamar", de: "Abholen", fr: "Réclamer", tr: "Al", pt: "Resgatar", pl: "Odbierz", it: "Riscatta" },
    "wallet": { ru: "Кошелёк", uk: "Гаманець", en: "Wallet", es: "Billetera", de: "Wallet", fr: "Portefeuille", tr: "Cüzdan", pt: "Carteira", pl: "Portfel", it: "Portafoglio" },
    "holdings": { ru: "Рейтинг держателей", uk: "Рейтинг власників", en: "Holders leaderboard", es: "Clasificación de tenedores", de: "Halter-Rangliste", fr: "Classement des détenteurs", tr: "Sahipler sıralaması", pt: "Ranking de detentores", pl: "Ranking posiadaczy", it: "Classifica detentori" },
    "welcome": { ru: "Добро пожаловать в GM TOKEN", uk: "Ласкаво просимо до GM TOKEN", en: "Welcome to GM TOKEN", es: "Bienvenido a GM TOKEN", de: "Willkommen bei GM TOKEN", fr: "Bienvenue sur GM TOKEN", tr: "GM TOKEN'a hoş geldiniz", pt: "Bem-vindo ao GM TOKEN", pl: "Witamy w GM TOKEN", it: "Benvenuto in GM TOKEN" },
    "open": { ru: "Открыть приложение", uk: "Відкрити застосунок", en: "Open app", es: "Abrir app", de: "App öffnen", fr: "Ouvrir l’app", tr: "Uygulamayı aç", pt: "Abrir aplicativo", pl: "Otwórz aplikację", it: "Apri app" },
    "loading": { ru: "Загрузка игры", uk: "Завантаження гри", en: "Loading game", es: "Cargando juego", de: "Spiel wird geladen", fr: "Chargement du jeu", tr: "Oyun yükleniyor", pt: "Carregando jogo", pl: "Ładowanie gry", it: "Caricamento gioco" },
    "later": { ru: "Скоро", uk: "Незабаром", en: "Coming soon", es: "Próximamente", de: "Bald", fr: "Bientôt", tr: "Yakında", pt: "Em breve", pl: "Wkrótce", it: "Presto" },
    "startTour": { ru: "Показать подсказки", uk: "Показати підказки", en: "Show guide", es: "Mostrar guía", de: "Anleitung zeigen", fr: "Afficher le guide", tr: "Rehberi göster", pt: "Mostrar guia", pl: "Pokaż poradnik", it: "Mostra guida" },
    "back": { ru: "Назад", uk: "Назад", en: "Back", es: "Atrás", de: "Zurück", fr: "Retour", tr: "Geri", pt: "Voltar", pl: "Wstecz", it: "Indietro" },
    "next": { ru: "Далее", uk: "Далі", en: "Next", es: "Siguiente", de: "Weiter", fr: "Suivant", tr: "İleri", pt: "Próximo", pl: "Dalej", it: "Avanti" },
    "finish": { ru: "Понятно", uk: "Зрозуміло", en: "Got it", es: "Entendido", de: "Verstanden", fr: "Compris", tr: "Anladım", pt: "Entendi", pl: "Rozumiem", it: "Capito" },
    "skip": { ru: "Пропустить", uk: "Пропустити", en: "Skip", es: "Omitir", de: "Überspringen", fr: "Passer", tr: "Atla", pt: "Pular", pl: "Pomiń", it: "Salta" },
    "tutorialStep": { ru: "Шаг", uk: "Крок", en: "Step", es: "Paso", de: "Schritt", fr: "Étape", tr: "Adım", pt: "Passo", pl: "Krok", it: "Passo" },
    "customize": { ru: "Оформление и язык", uk: "Оформлення і мова", en: "Appearance & language", es: "Apariencia e idioma", de: "Design & Sprache", fr: "Apparence et langue", tr: "Görünüm ve dil", pt: "Aparência e idioma", pl: "Wygląd i język", it: "Aspetto e lingua" },
    "frames": { ru: "Рамки профиля", uk: "Рамки профілю", en: "Profile frames", es: "Marcos de perfil", de: "Profilrahmen", fr: "Cadres de profil", tr: "Profil çerçeveleri", pt: "Molduras de perfil", pl: "Ramki profilu", it: "Cornici profilo" },
    "achievementsLocked": { ru: "Открой достижение, чтобы получить награду", uk: "Відкрий досягнення, щоб отримати нагороду", en: "Unlock achievements to earn rewards", es: "Desbloquea logros para ganar recompensas", de: "Schalte Erfolge für Belohnungen frei", fr: "Débloquez des succès pour des récompenses", tr: "Ödüller için başarıları aç", pt: "Desbloqueie conquistas para ganhar recompensas", pl: "Odblokuj osiągnięcia i nagrody", it: "Sblocca obiettivi e premi" },
    "mining": { ru: "Майнинг", uk: "Майнінг", en: "Mining", es: "Minería", de: "Mining", fr: "Minage", tr: "Madencilik", pt: "Mineração", pl: "Kopanie", it: "Mining" },
    "market": { ru: "Рынок", uk: "Ринок", en: "Market", es: "Mercado", de: "Markt", fr: "Marché", tr: "Pazar", pt: "Mercado", pl: "Rynek", it: "Mercato" },
    "boxes": { ru: "Боксы", uk: "Бокси", en: "Boxes", es: "Cajas", de: "Boxen", fr: "Coffres", tr: "Kutular", pt: "Caixas", pl: "Skrzynki", it: "Box" },
    "avatar": { ru: "Мой профиль", uk: "Мій профіль", en: "My profile", es: "Mi perfil", de: "Mein Profil", fr: "Mon profil", tr: "Profilim", pt: "Meu perfil", pl: "Mój profil", it: "Il mio profilo" },
};
const EXTRA_LANGUAGE = {
    "Пока нет исполненных сделок": { pt: "Ainda não há negociações", uk: "Поки немає виконаних угод", en: "No completed trades yet" },
    "График появится после первой сделки GM/CR. Пустые интервалы не заполняются искусственными свечами.": { pt: "O gráfico aparece após a primeira negociação GM/CR.", uk: "Графік з’явиться після першої угоди GM/CR.", en: "The chart appears after the first GM/CR trade." },
    "Нет связи с сервером. Проверь интернет и открой приложение ещё раз.": { pt: "Sem conexão com o servidor. Verifique a internet.", uk: "Немає зв'язку із сервером. Перевір інтернет.", en: "No server connection. Check the internet." },
    "Недоступно": { pt: "Indisponível", uk: "Недоступно", en: "Unavailable" },
    "Проверяем вход через Telegram…": { pt: "Verificando acesso pelo Telegram…", uk: "Перевіряємо вхід через Telegram…", en: "Checking Telegram login…" },
    "Открой GM TOKEN внутри Telegram": { pt: "Abra GM TOKEN dentro do Telegram", uk: "Відкрий GM TOKEN у Telegram", en: "Open GM TOKEN inside Telegram" },
    "Ошибка: ": { pt: "Erro: ", uk: "Помилка: ", en: "Error: " },
    "Операция выполнена": { pt: "Operação concluída", uk: "Операцію виконано", en: "Operation completed" },
    "Задания": { pt: "Tarefas", uk: "Завдання", en: "Tasks" },
    "Друзья": { pt: "Amigos", uk: "Друзі", en: "Friends" },
    "Твой прогресс": { pt: "Seu progresso", uk: "Твій прогрес", en: "Your progress" },
    "МОЙ БАЛАНС": { pt: "MEU SALDO", uk: "МІЙ БАЛАНС", en: "MY BALANCE" },
    "Перейти в Mining": { pt: "Abrir mineração", uk: "Перейти до майнінгу", en: "Go to mining" },
    "Перейти на рынок": { pt: "Abrir mercado", uk: "Перейти на ринок", en: "Go to market" },
    "РЫНОК · ТЕСТОВЫЙ GM/CR": { pt: "MERCADO · TESTE GM/CR", uk: "РИНОК · ТЕСТОВИЙ GM/CR", en: "MARKET · TEST GM/CR" },
    "Нет цены": { pt: "Preço indisponível", uk: "Немає ціни", en: "No price" },
    "Только реальные игровые сделки · без искусственного графика": { pt: "Somente negociações reais do jogo", uk: "Лише справжні ігрові угоди", en: "Only real in-game trades" },
    "График появится после нескольких сделок": { pt: "Gráfico disponível após algumas negociações", uk: "Графік з'явиться після кількох угод", en: "Chart appears after some trades" },
    "Твои POINTS: ": { pt: "Seus POINTS: ", uk: "Твої POINTS: ", en: "Your POINTS: " },
    " · гарантированные награды": { pt: " · recompensas garantidas", uk: " · гарантовані нагороди", en: " · guaranteed rewards" },
    " Как играть": { pt: " Como jogar", uk: " Як грати", en: " How to play" },
    "Стакан": { pt: "Livro de ofertas", uk: "Стакан", en: "Order book" },
    "Сделки": { pt: "Negociações", uk: "Угоди", en: "Trades" },
    "Мои ордера": { pt: "Minhas ordens", uk: "Мої ордери", en: "My orders" },
    "Пока нет заявок": { pt: "Ainda não há ordens", uk: "Поки немає заявок", en: "No orders yet" },
    "Цена": { pt: "Preço", uk: "Ціна", en: "Price" },
    "Объём": { pt: "Volume", uk: "Обсяг", en: "Volume" },
    "Здесь появятся исполненные, подтверждённые сервером сделки.": { pt: "As negociações executadas aparecerão aqui.", uk: "Тут з'являться виконані угоди.", en: "Completed trades will appear here." },
    "Покупка GM": { pt: "Comprar GM", uk: "Купівля GM", en: "Buy GM" },
    "Продажа GM": { pt: "Vender GM", uk: "Продаж GM", en: "Sell GM" },
    "Отменить": { pt: "Cancelar", uk: "Скасувати", en: "Cancel" },
    "Индикативная цена": { pt: "Preço indicativo", uk: "Орієнтовна ціна", en: "Indicative price" },
    "Последняя цена сделки": { pt: "Último preço", uk: "Остання ціна угоди", en: "Last trade price" },
    "Обновить котировки": { pt: "Atualizar cotações", uk: "Оновити котирування", en: "Refresh quotes" },
    "ОБЪЁМ · 24 Ч": { pt: "VOLUME · 24 H", uk: "ОБСЯГ · 24 Г", en: "VOLUME · 24 H" },
    "СДЕЛОК · 24 Ч": { pt: "NEGOCIAÇÕES · 24 H", uk: "УГОД · 24 Г", en: "TRADES · 24 H" },
    "РЕЖИМ": { pt: "MODO", uk: "РЕЖИМ", en: "MODE" },
    "Реальные сделки": { pt: "Negociações reais", uk: "Реальні угоди", en: "Real trades" },
    "Интервал свечей": { pt: "Intervalo do gráfico", uk: "Інтервал свічок", en: "Candle interval" },
    "Доступно для торговли": { pt: "Disponível para negociar", uk: "Доступно для торгів", en: "Available to trade" },
    "Данные рынка": { pt: "Dados do mercado", uk: "Дані ринку", en: "Market data" },
    "Купить GM": { pt: "Comprar GM", uk: "Купити GM", en: "Buy GM" },
    "Продать GM": { pt: "Vender GM", uk: "Продати GM", en: "Sell GM" },
    "Подтверждение ордера": { pt: "Confirmação da ordem", uk: "Підтвердження ордера", en: "Confirm order" },
    "Проверь заявку": { pt: "Revise a ordem", uk: "Перевір заявку", en: "Review order" },
    "Закрыть": { pt: "Fechar", uk: "Закрити", en: "Close" },
    "Тип заявки": { pt: "Tipo de ordem", uk: "Тип заявки", en: "Order type" },
    "Количество GM": { pt: "Quantidade de GM", uk: "Кількість GM", en: "GM amount" },
    "Цена · CR за 1 GM": { pt: "Preço · CR por 1 GM", uk: "Ціна · CR за 1 GM", en: "Price · CR per GM" },
    "Срок действия заявки": { pt: "Validade da ordem", uk: "Термін заявки", en: "Order duration" },
    "Резерв по заявке": { pt: "Reserva da ordem", uk: "Резерв заявки", en: "Order reserve" },
    "Заблокируется GM": { pt: "GM reservado", uk: "GM буде заблоковано", en: "GM to reserve" },
    "Проверить заявку": { pt: "Revisar ordem", uk: "Перевірити заявку", en: "Review order" },
    "ПОДТВЕРЖДЕНИЕ": { pt: "CONFIRMAÇÃO", uk: "ПІДТВЕРДЖЕННЯ", en: "CONFIRMATION" },
    "Доступно сейчас": { pt: "Disponível agora", uk: "Доступно зараз", en: "Available now" },
    "Отправить ордер": { pt: "Enviar ordem", uk: "Надіслати ордер", en: "Place order" },
    "Отмена": { pt: "Cancelar", uk: "Скасувати", en: "Cancel" },
    "Назад к форме": { pt: "Voltar ao formulário", uk: "Назад до форми", en: "Back to form" },
    "Все": { pt: "Todos", uk: "Усі", en: "All" },
    "Социальные": { pt: "Sociais", uk: "Соціальні", en: "Social" },
    "Игровые": { pt: "Do jogo", uk: "Ігрові", en: "Game" },
    "Подтверди выполнение условия": { pt: "Confirme a conclusão do requisito", uk: "Підтвердь виконання умови", en: "Confirm requirement" },
    "Достижение": { pt: "Conquista", uk: "Досягнення", en: "Achievement" },
    "Забрать": { pt: "Resgatar", uk: "Забрати", en: "Claim" },
    "Игрок": { pt: "Jogador", uk: "Гравець", en: "Player" },
    "Ежедневная награда": { pt: "Recompensa diária", uk: "Щоденна нагорода", en: "Daily reward" },
    "НАГРАДА ЗА СЕГОДНЯ": { pt: "RECOMPENSA DE HOJE", uk: "НАГОРОДА ЗА СЬОГОДНІ", en: "TODAY'S REWARD" },
    "Награда получена": { pt: "Recompensa recebida", uk: "Нагороду отримано", en: "Reward claimed" },
    "Награды не включены": { pt: "Recompensas indisponíveis", uk: "Нагороди не ввімкнено", en: "Rewards unavailable" },
    "Перейти в Майнинг": { pt: "Ir para mineração", uk: "Перейти до майнінгу", en: "Go to mining" },
    "Добывай GM": { pt: "Minere GM", uk: "Видобувай GM", en: "Mine GM" },
    "GM накоплено": { pt: "GM acumulado", uk: "GM накопичено", en: "GM accumulated" },
    "Забрать GM": { pt: "Resgatar GM", uk: "Забрати GM", en: "Claim GM" },
    "Хранилище": { pt: "Armazenamento", uk: "Сховище", en: "Storage" },
    "Мощность": { pt: "Potência", uk: "Потужність", en: "Power" },
    "Резерв": { pt: "Reserva", uk: "Резерв", en: "Reserve" },
    "Уровень и ускорения": { pt: "Nível e melhorias", uk: "Рівень та прискорення", en: "Level and boosts" },
    "Проверяем покупку…": { pt: "Verificando compra…", uk: "Перевіряємо купівлю…", en: "Checking purchase…" },
    "Максимальный уровень открыт": { pt: "Nível máximo alcançado", uk: "Максимальний рівень відкрито", en: "Maximum level reached" },
    "Начальный": { pt: "Inicial", uk: "Початковий", en: "Starter" },
    "Пока недоступно": { pt: "Indisponível", uk: "Поки недоступно", en: "Unavailable" },
    "Не хватает POINTS": { pt: "POINTS insuficientes", uk: "Недостатньо POINTS", en: "Not enough POINTS" },
    "Открыть бокс": { pt: "Abrir caixa", uk: "Відкрити бокс", en: "Open box" },
    "Как заработать ": { pt: "Como ganhar ", uk: "Як заробити ", en: "How to earn " },
    "Твои POINTS": { pt: "Seus POINTS", uk: "Твої POINTS", en: "Your POINTS" },
    "СТАНДАРТ": { pt: "PADRÃO", uk: "СТАНДАРТ", en: "STANDARD" },
    "ПРЕМИУМ": { pt: "PREMIUM", uk: "ПРЕМІУМ", en: "PREMIUM" },
    "ЭЛИТНЫЙ": { pt: "ELITE", uk: "ЕЛІТНИЙ", en: "ELITE" },
    "Приглашай друзей": { pt: "Convide amigos", uk: "Запрошуй друзів", en: "Invite friends" },
    "Приглашено игроков": { pt: "Jogadores convidados", uk: "Запрошено гравців", en: "Invited players" },
    "Получено GM": { pt: "GM recebido", uk: "GM отримано", en: "GM received" },
    "ТВОЯ ПЕРСОНАЛЬНАЯ ССЫЛКА": { pt: "SEU LINK PESSOAL", uk: "ТВОЄ ОСОБИСТЕ ПОСИЛАННЯ", en: "YOUR PERSONAL LINK" },
    "Доступна после входа в Telegram": { pt: "Disponível após entrar no Telegram", uk: "Доступно після входу в Telegram", en: "Available after Telegram login" },
    "Скопировать": { pt: "Copiar", uk: "Скопіювати", en: "Copy" },
    " Поделиться в Telegram ": { pt: " Compartilhar no Telegram ", uk: " Поділитися в Telegram ", en: " Share on Telegram " },
    "Не выполнено": { pt: "Não concluído", uk: "Не виконано", en: "Not completed" },
    "Тема оформления": { pt: "Aparência", uk: "Тема оформлення", en: "Appearance" },
    "Персонализация": { pt: "Personalização", uk: "Персоналізація", en: "Personalization" },
    "Язык интерфейса": { pt: "Idioma da interface", uk: "Мова інтерфейсу", en: "Interface language" },
    "Пройти инструкцию": { pt: "Rever tutorial", uk: "Пройти інструкцію", en: "Replay tutorial" },
    "Виртуальные GM и CR": { pt: "GM e CR virtuais", uk: "Віртуальні GM і CR", en: "Virtual GM and CR" },
    "Добро пожаловать в GM TOKEN": { pt: "Bem-vindo ao GM TOKEN", uk: "Ласкаво просимо до GM TOKEN", en: "Welcome to GM TOKEN" },
    "Поддержка": { pt: "Suporte", uk: "Підтримка", en: "Support" },
    "История операций пока пуста": { pt: "Nenhuma transação registrada", uk: "Історія операцій порожня", en: "No transactions yet" },
    "Загрузить с сервера": { pt: "Carregar do servidor", uk: "Завантажити із сервера", en: "Load from server" },
    "Инструкция": { pt: "Instruções", uk: "Інструкція", en: "Guide" },
    "Профиль": { pt: "Perfil", uk: "Профіль", en: "Profile" },
    "Рейтинг": { pt: "Classificação", uk: "Рейтинг", en: "Leaderboard" },
    "Вывести": { pt: "Retirar", uk: "Вивести", en: "Withdraw" },
    "Пополнить": { pt: "Depositar", uk: "Поповнити", en: "Deposit" },
    "Доступно в кошельке: ": { pt: "Disponível na carteira: ", uk: "Доступно в гаманці: ", en: "Available in wallet: " },
    "Награды к получению": { pt: "Recompensas para resgatar", uk: "Нагороди до отримання", en: "Pending rewards" },
    "Поддержка GM TOKEN": { pt: "Suporte GM TOKEN", uk: "Підтримка GM TOKEN", en: "GM TOKEN support" },
    "Новости": { pt: "Notícias", uk: "Новини", en: "News" },
    "Настройки": { pt: "Configurações", uk: "Налаштування", en: "Settings" },
    "Уровень ": { pt: "Nível ", uk: "Рівень ", en: "Level " },
};
// Translate all literal labels in React.createElement/JSX, not just the bottom navigation.
// Unknown strings remain unchanged rather than being invented by a translation provider.
let gmActiveLocale = 'ru';
const gmNativeCreateElement = React.createElement.bind(React);
const gmTranslate = (value) => {
    if (gmActiveLocale === 'ru')
        return value;
    const t = gmActiveLocale;
    const direct = EXTRA_LANGUAGE[value];
    if (direct)
        return direct[t] || direct.en || value;
    for (const row of Object.values(UI_TRANSLATIONS)) {
        if (row.ru === value || row.en === value)
            return row[t] || row.en || value;
    }
    // Preserve numerals/amounts while translating commonly concatenated prefixes.
    for (const [key, translations] of Object.entries(EXTRA_LANGUAGE)) {
        if (!key.trim() || key.length < 5 || !value.startsWith(key))
            continue;
        const remainder = value.slice(key.length);
        if (remainder && (/^\d|^\s\d/.test(remainder)))
            return (translations[t] || translations.en || key) + remainder;
    }
    return value;
};
React.createElement = (type, props, ...children) => {
    const mapped = children.map(x => typeof x === 'string' ? gmTranslate(x) : x);
    if (props && typeof type === 'string') {
        const p = { ...props };
        for (const key of ['title', 'placeholder', 'aria-label', 'alt']) {
            if (typeof p[key] === 'string')
                p[key] = gmTranslate(p[key]);
        }
        return gmNativeCreateElement(type, p, ...mapped);
    }
    return gmNativeCreateElement(type, props, ...mapped);
};
class AutumnCalendar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {data:null, busy:false, error:false};
    this.pending = false;
  }
  componentDidMount() { this.active = true; void this.refresh(); }
  componentWillUnmount() { this.active = false; }
  async refresh() {
    const data = await this.props.api('/api/autumn-calendar', undefined, true);
    if (this.active) this.setState({data, error:!data});
  }
  async claim() {
    if (this.pending) return;
    this.pending = true;
    this.setState({busy:true});
    try {
      await this.props.api('/api/autumn-calendar/claim', {});
      await this.refresh();
    } finally {
      this.pending = false;
      if (this.active) this.setState({busy:false});
    }
  }
  render() {
    const e = React.createElement;
    const {data, busy, error, selected} = this.state;
    const progress = data?.progress;
    const next = Number(progress?.next_day || 1);
    const received = !!progress?.claimed_today;
    const completed = received && next === 1 ? 30 : next - 1;
    const today = received ? completed : next;
    const rows = data?.schedule || [];
    const names = {xp:'XP', hp:'HP', bronze_box:'Бронзовый бокс', silver_box:'Серебряный бокс', gold_box:'Золотой бокс'};
    const focusDay = selected || today;
    const reward = rows.find(row => Number(row.calendar_day) === focusDay);
    const quantity = row => row.reward_type.endsWith('_box')
      ? names[row.reward_type] + ' × ' + row.reward_amount
      : '+' + row.reward_amount + ' ' + names[row.reward_type];
    return e('section', {className:'autumn', 'aria-label':'Осенний календарь'},
      e('header', {className:'autumn-head'},
        e('div', null, e('span', {className:'autumn-month'}, 'СЕЗОННЫЕ НАГРАДЫ'),
          e('h2', null, 'Осенний календарь')),
        e('span', {className:'autumn-leaf','aria-hidden':true}, '🍁')),
      data && e('div', {className:'autumn-progress'},
        e('span', null, 'Получено дней'), e('strong', null, completed + ' / 30'),
        e('progress', {max:30,value:completed,'aria-label':'Получено дней'})),
      data && e('div', {className:'autumn-grid'}, rows.map(row => {
        const n = Number(row.calendar_day);
        const box = row.reward_type.endsWith('_box');
        const status = n <= completed ? 'получено' : n === today ? 'доступно сегодня' : 'впереди';
        return e('button', {key:n, type:'button',
          className:'autumn-tile' + (n <= completed ? ' done' : '') + (n === focusDay ? ' selected' : ''),
          'aria-pressed':n === focusDay,'aria-label':'День ' + n + ', ' + quantity(row) + ', ' + status,
          onClick:()=>this.setState({selected:n})},
          e('b', null, n), e('span', {className:'autumn-mark','aria-hidden':true}, n <= completed ? '✓' : ''),
          e('small', null, box ? 'Бокс ×' + row.reward_amount : row.reward_amount + ' ' + names[row.reward_type]));
      })),
      reward && e('div', {className:'autumn-detail', 'aria-live':'polite'},
        e('span', null, 'День ' + focusDay + (focusDay <= completed ? ' · получено' : focusDay === today ? ' · сегодня' : ' · впереди')),
        e('strong', null, quantity(reward))),
      received ? e('p', {className:'autumn-status',role:'status'}, '✓  Сегодня награда получена') :
        e('button', {className:'autumn-claim',type:'button',disabled:busy || (!data && !error),onClick:()=>error ? this.refresh() : this.claim()},
          error ? 'Повторить загрузку' : !data ? 'Загрузка календаря…' : busy ? 'Получаем…' : 'Забрать награду за день ' + today));
  }
}

function App() {
    const webapp = window.Telegram?.WebApp;
    const openBot = (ev) => {
        ev?.preventDefault?.();
        const url = 'https://t.me/gm_token_test_bot';
        if (webapp?.openTelegramLink) {
            try {
                webapp.openTelegramLink(url);
                if (typeof webapp.close === 'function')
                    window.setTimeout(() => { try {
                        webapp.close();
                    }
                    catch { } }, 700);
                return;
            }
            catch { }
        }
        window.location.assign(url);
    };
    const [theme, setTheme] = React.useState((store.getItem('gm_theme') || webapp?.colorScheme || 'light') === 'dark' ? 'dark' : 'light');
    const [screen, setScreen] = React.useState('splash');
    const [locale, setLocale] = React.useState(store.getItem('gm_lang') || 'auto');
    const [introStep, setIntroStep] = React.useState(0);
    // Tutorial completion belongs to the authenticated Telegram account, not the device.
    const [authenticatedUserId, setAuthenticatedUserId] = React.useState('');
    const tutorialKey = (section) => 'gm_tour_v24_' + authenticatedUserId + '_' + section;
    const onboardingKey = () => authenticatedUserId ? 'gm_intro_v24_' + authenticatedUserId : '';
    const telegramLanguage = String(webapp?.initDataUnsafe?.user?.language_code || navigator.language || 'en').toLowerCase().split(/[-_]/)[0];
    const actualLang = locale === 'auto' ? telegramLanguage : locale;
    gmActiveLocale = actualLang;
    const lang = key => {
        const index = gmKeys.indexOf(key);
        return index < 0 ? key : (gmWords[actualLang] || gmWords.en)[index] || gmWords.en[index];
    };
    const L = (key) => UI_TRANSLATIONS[key]?.[actualLang] || UI_TRANSLATIONS[key]?.en || key;
    const [guideScreen, setGuideScreen] = React.useState('');
    const [guideStep, setGuideStep] = React.useState(0);
    const [guideSpot, setGuideSpot] = React.useState(null);
    const [languageOpen, setLanguageOpen] = React.useState(false);
    const [languageSearch, setLanguageSearch] = React.useState('');
    // Each tutorial entry points at a real, visible control rather than a generic icon.
    const guideCatalog = {
        home: [['wallet', 'balance', '.gm-home-wallet', 'home.balance'], ['lightning', 'mining', '.gm-home-shortcuts button', 'home.shortcuts'], ['gift', 'boxes', '.gm-home-offer', 'home.reward']],
        mining: [['gm-coin-orbit', 'mining', '.gm-mining-coin-wrap', 'mining.coin'], ['diamond', 'claim', '.gm-mining-claim', 'mining.claim'], ['lightning', 'miningUpgrades', '.gm-mining-upgrades', 'mining.upgrades'], ['coins', 'upgrade', '.gm-upgrades-purchase', 'mining.purchase'], ['clock', 'speed', '.gm-mining-energy', 'mining.storage']],
        trade: [['candlesticks', 'market', '.terminal-quote', 'trade.price'], ['candlesticks', 'market', '.terminal-periods', 'trade.chart'], ['wallet', 'balance', '.terminal-wallet-line', 'trade.balance'], ['coins', 'market', '.terminal-buy-sell', 'trade.actions'], ['shield-check', 'next', '.gm-trade-quick-card', 'trade.quantity'], ['coins', 'next', '.gm-trade-quick-continue', 'trade.review']],
        boxes: [
            ['wallet', 'balance', '.gm-boxes-points', 'boxes.points'],
            ['gift', 'boxes', '.gm-chests-list', 'boxes.choose'],
            ['gift', 'boxes', '.gm-flat-card.selected .gm-flat-card-image', 'boxes.preview'],
            ['coins', 'boxes', '.gm-chests-qty', 'boxes.quantity'],
            ['shield-check', 'boxes', '.gm-chests-open', 'boxes.claim']
        ],
        points: [
            ['wallet', 'balance', '.gm-boxes-points', 'points.balance'],
            ['info', 'instruction', '.gm-points-guide', 'points.earn'],
            ['candlesticks', 'market', '.gm-points-guide-action', 'points.market'],
            ['gift', 'boxes', '.gm-chests-list', 'points.spend'],
            ['shield-check', 'boxes', '.gm-chests-open', 'points.open']
        ],
        tasks: [['tasks', 'tasks', '.gm-task-filters', 'tasks.filter'], ['trophy', 'achievements', '.gm-task-list', 'tasks.claim']],
        profile: [['profile', 'profile', '.gm-league-card', 'profile.league'], ['trophy', 'frames', '.gm-frames-section', 'profile.frames']],
        more: [['settings', 'customize', '.gm-more-list', 'more.menu']],
        achievements: [['trophy', 'achievements', '.gm-achievement-planned', 'achievements.locked']],
        settings: [['settings', 'theme', '.gm-theme-list', 'settings.theme'], ['globe', 'interfaceLanguage', '.gm-language-grid', 'settings.language']],
        support: [['shield-check', 'support', '.gm-support-form', 'support.ticket'], ['send', 'support', '.gm-support-submit', 'support.send']]
    };
    const guideText = {
        'home.balance': { ru: 'Здесь отображаются твои игровые GM и CR. Нажми на соответствующую кнопку, чтобы перейти к основным возможностям; это не криптовалютный кошелёк.', uk: 'Тут показано твої ігрові GM і CR. Натисни потрібну кнопку, щоб перейти до функцій — це не криптогаманець.', pt: 'Veja seus GM e CR do jogo. Os saldos aqui não são uma carteira cripto.', en: 'Your in-game GM and CR balances live here. These are not on-chain wallet balances.' },
        'home.shortcuts': { ru: 'Эти кнопки ведут прямо в Майнинг, Боксы, Задания и Друзья. Начни с майнинга: монета показывает накопление, а собирать GM можно с установленного минимума.', uk: 'Ці кнопки відкривають Майнінг, Бокси, Завдання та Друзів. Почни з майнінгу.', pt: 'Estes atalhos abrem Mineração, Caixas, Tarefas e Amigos. Comece pela mineração.', en: 'These shortcuts open Mining, Boxes, Tasks, and Friends. Start by exploring Mining.' },
        'home.reward': { ru: 'В карточке наград находятся игровые задания и бонусы. Начисления всегда подтверждаются сервером; обещаний случайных призов здесь нет.', uk: 'У картці нагород є завдання та бонуси. Нарахування перевіряє сервер.', pt: 'Aqui ficam tarefas e recompensas. Os prêmios são verificados pelo servidor.', en: 'Tasks and rewards are here. The server confirms any earned rewards.' },
        'mining.coin': { ru: 'Это главная GM-монета. Майнинг идёт автоматически по действующей скорости. Нажимая на монету, ты собираешь накопленные игровые GM — если накопилось не меньше 1 GM.', uk: 'Це головна монета GM. Майнінг відбувається автоматично. Натисни монету, коли накопичиш щонайменше 1 GM.', pt: 'Esta é a moeda GM. A mineração é automática. Toque na moeda para coletar após acumular pelo menos 1 GM.', en: 'This is the main GM coin. Mining accrues automatically. Tap to claim after at least 1 GM is stored.' },
        'mining.claim': { ru: 'Эта отдельная кнопка выполняет тот же сбор. Пока на счёте меньше 1 GM, она неактивна. Сбор не требует оплаты или подключения кошелька.', uk: 'Ця кнопка збирає накопичені GM. До 1 GM вона неактивна.', pt: 'Este botão coleta os GM acumulados. Ele fica desativado até 1 GM.', en: 'This button claims stored GM. It stays disabled below the 1 GM minimum.' },
        'mining.upgrades': { ru: 'Здесь показаны 200 уровней, цена каждого и бонус к скорости. По договорённости уровни будут связаны с подтверждённым внешним кошельком. Пока контракт GM не проверен, оплата и покупка отключены, игровые GM не списываются.', uk: 'Тут 200 рівнів, ціни та бонуси. Оплата через зовнішній гаманець поки недоступна — контракт GM ще не підтверджений.', pt: 'Aqui estão 200 níveis e seus bônus. Compras com carteira externa estão desativadas até verificar o contrato GM.', en: 'Explore all 200 levels and bonuses. Wallet-based purchases remain disabled until the GM contract is verified.' },
        'mining.purchase': { ru: 'Это кнопка перехода к следующему уровню. Пока подтверждение внешних GM не настроено, она недоступна. Никаких игровых GM здесь списывать нельзя; после проверки контракта будет показан понятный способ получения улучшения.', uk: 'Це кнопка наступного рівня. До перевірки контракту вона неактивна й не списує ігрові GM.', pt: 'Este botão será usado para subir de nível. Fica desativado até a verificação do contrato GM; GM do jogo não serão gastos.', en: 'This is the upgrade control. It remains disabled until external GM ownership can be verified; no in-game GM is charged.' },
        'mining.storage': { ru: 'Полоса показывает, сколько GM накоплено относительно вместимости. Когда хранилище заполнено, новые начисления останавливаются до сбора. Ниже указана текущая скорость за час.', uk: 'Смуга показує наповнення сховища. Коли воно повне, зберіть GM, щоб звільнити місце.', pt: 'A barra mostra o armazenamento atual. Colete GM para liberar espaço quando estiver cheio.', en: 'The bar shows storage capacity. Claim stored GM when the container is full.' },
        'trade.price': { ru: 'Здесь указана рыночная цена GM/CR. Для тестового рынка она берётся из реально исполненных игровых заявок; мы не рисуем вымышленные сделки.', uk: 'Тут ціна GM/CR за виконаними ігровими угодами, без штучних свічок.', pt: 'O preço GM/CR vem de negociações reais dentro do jogo, sem dados inventados.', en: 'The GM/CR price reflects executed in-game trades; no synthetic market data.' },
        'trade.chart': { ru: 'Выбирай интервал свечей — от минуты до дня. График показывает историю исполненных игровых сделок, а пустые интервалы остаются пустыми.', uk: 'Обери інтервал від хвилини до дня. Порожні періоди не домальовуються.', pt: 'Escolha o intervalo do gráfico. Períodos sem negociações permanecem vazios.', en: 'Choose a candle interval. Periods without executed in-game trades stay empty.' },
        'trade.balance': { ru: 'Тут доступны твои игровые GM и CR. Открытые заявки могут резервировать часть средств; перед отправкой заявки проверь остаток.', uk: 'Тут доступні ігрові GM і CR. Відкриті ордери можуть резервувати кошти.', pt: 'Aqui estão seus GM e CR do jogo. Ordens abertas podem reservar saldo.', en: 'Your in-game GM and CR balances are shown here. Open orders reserve funds.' },
        'trade.actions': { ru: 'Выбери «Купить GM» или «Продать GM». Кнопки переключают форму ниже, не отправляя заявку. Это тренировочный игровой рынок, не биржа настоящих денег.', uk: 'Обери «Купити» або «Продати». Перемикач змінює форму, але нічого не надсилає.', pt: 'Escolha Comprar ou Vender. Os botões apenas alternam o formulário, sem enviar ordem.', en: 'Select Buy or Sell. These buttons only switch the form; they do not place an order.' },
        'trade.review': { ru: 'Эта кнопка открывает отдельное окно проверки заявки, где ты задаёшь цену и срок. Она не совершает сделку сразу. Отправка на игровой сервер будет только после ещё одного подтверждения.', uk: 'Кнопка відкриває перевірку ціни та терміну. Угода не надсилається одразу.', pt: 'Este botão abre a revisão de preço e prazo. A ordem não é enviada imediatamente.', en: 'This button opens the order review, where you set price and duration. It does not submit immediately.' },
        'trade.quantity': { ru: 'Укажи количество GM. Ниже сразу появится приблизительный итог в CR. Нажми «Продолжить», проверь цену и срок заявки в следующем окне, затем отдельно подтверди отправку.', uk: 'Вкажи кількість GM, переглянь приблизну суму в CR і відкрий перевірку заявки.', pt: 'Digite o valor em GM para ver a estimativa em CR e abrir a revisão da ordem.', en: 'Enter a GM amount, review the CR estimate, and continue to the separate confirmation step.' },
        'points.balance': { ru: 'Это баланс POINTS. Очки начисляются только за подтверждённый игровой торговый объём, не за нажатие кнопки.', uk: 'Це баланс POINTS, нарахованих за підтверджену торгову активність.', en: 'This is your POINTS balance, earned through verified game trading.' },
        'points.earn': { ru: 'Чтобы заработать POINTS, перейди на игровой рынок и соверши подтверждённую сделку. Лимиты и антинакрутка применяются сервером.', uk: 'Щоб отримати POINTS, здійсни підтверджену ігрову угоду.', en: 'Earn POINTS from completed, verified in-game trades, subject to limits.' },
        'points.market': { ru: 'Эта кнопка ведёт к рынку GM/CR. Просто создать заявку недостаточно: POINTS появляются только после исполнения сделки.', uk: 'Ця кнопка веде на ринок GM/CR. Очки нараховуються лише після виконання угоди.', en: 'Open the GM/CR market. POINTS are earned only from executed trades.' },
        'points.spend': { ru: 'Вернувшись сюда, выбери бронзовый, серебряный или золотой сундук. У каждого своя стоимость в POINTS и фиксированная награда.', uk: 'Повернись і вибери скриню з фіксованою вартістю та нагородою.', en: 'Return here and select a chest. Each has a fixed POINTS cost and GM reward.' },
        'points.open': { ru: 'Выбери количество 1, 3, 5 или 10 и открой сундуки. POINTS списываются, а виртуальные GM начисляются одной проверенной серверной операцией.', uk: 'Вибери кількість скринь і відкрий їх однією перевіреною операцією.', en: 'Choose a quantity and open chests in one server-verified operation.' },
        'boxes.points': { ru: 'Это твои POINTS. Их можно заработать за подтверждённые игровые сделки. Открой «Как получить», чтобы увидеть правила.', uk: 'Тут показано POINTS. Отримуй їх за підтверджені ігрові угоди.', pt: 'Este é o seu saldo de POINTS, obtido com negociações verificadas.', en: 'Your POINTS balance comes from verified in-game trades.' },
        'boxes.preview': { ru: 'Здесь крупно показан выбранный 3D-сундук, награда за одно открытие и стоимость. Бронзовый, серебряный и золотой сундуки отличаются оформлением.', uk: 'Тут показано вибрану скриню, нагороду та вартість.', pt: 'Veja o baú selecionado, o prêmio fixo e o custo.', en: 'Preview the selected chest, fixed reward and cost.' },
        'boxes.quantity': { ru: 'Выбери, сколько сундуков открыть сразу: 1, 3, 5 или 10. Ниже пересчитаются стоимость в POINTS и итоговая награда GM.', uk: 'Вибери 1, 3, 5 або 10 скринь. Вартість та нагорода перерахуються.', pt: 'Escolha 1, 3, 5 ou 10 baús. O custo e a recompensa são atualizados.', en: 'Choose 1, 3, 5 or 10 chests. Total POINTS and GM update automatically.' },
        'boxes.choose': { ru: 'Здесь выбирают тип бокса. В каждом — заранее утверждённые игровые награды; их состав и доступность показывает сервер.', uk: 'Тут обирають тип боксу. Нагороди визначає сервер.', pt: 'Escolha o tipo de caixa. As recompensas são aprovadas pelo servidor.', en: 'Choose a box type. Rewards and availability come from the server.' },
        'boxes.claim': { ru: 'Здесь открываются выбранные сундуки. Сервер сначала проверяет POINTS и лимит наград, затем начисляет виртуальные GM. Одна общая анимация показывает результат.', uk: 'Бокс відкривається за POINTS; результат підтверджує сервер.', pt: 'Abra caixas com POINTS; o resultado é confirmado pelo servidor.', en: 'Use POINTS to open a box; the reveal follows server confirmation.' },
        'tasks.filter': { ru: 'Фильтры разделяют задания на общие, социальные и игровые. Выполняй условия; неподтверждённые задания не начисляют наград.', uk: 'Фільтри розділяють завдання за типами. Нагороду дають лише за виконану умову.', pt: 'Filtre tarefas por tipo. Recompensas exigem conclusão verificada.', en: 'Filter tasks by type. Rewards require verified completion.' },
        'tasks.claim': { ru: 'Каждая карточка содержит условие и награду. После выполнения появится кнопка получения; выдача проверяется сервером.', uk: 'Кожна картка містить умову й нагороду. Видачу перевіряє сервер.', pt: 'Cada cartão mostra o objetivo e a recompensa verificada.', en: 'Each task shows an objective and a server-verified reward.' },
        'profile.league': { ru: 'Это твоя лига и опыт XP. Полоса показывает прогресс, а под ней указано, сколько XP осталось до следующего ранга.', uk: 'Це твоя ліга та XP. Смуга показує шлях до наступного рангу.', pt: 'Sua liga e XP. A barra mostra o progresso até o próximo nível.', en: 'Your league and XP are here. The progress bar shows how close the next rank is.' },
        'profile.frames': { ru: 'Рамки профиля открываются за игровые достижения. Серые пока закрыты. У первых 20 участников есть особые уникальные рамки.', uk: 'Рамки відкриваються за досягнення. Сірі ще заблоковані.', pt: 'Molduras são liberadas por conquistas. As cinzas estão bloqueadas.', en: 'Earn frames from achievements. Grey frames are locked; the earliest 20 players have exclusive ones.' },
        'more.menu': { ru: 'Здесь находятся профиль, достижения, история, поддержка и настройки. Нужный раздел откроется по нажатию на карточку.', uk: 'Тут профіль, досягнення, історія та підтримка.', pt: 'Aqui ficam Perfil, Conquistas, Histórico e Suporte.', en: 'Find Profile, Achievements, History, Support, and Settings here.' },
        'achievements.locked': { ru: 'Цветные карточки — открытые награды, серые — ещё недоступные. Уникальные ранние награды закрепляются за конкретными игроками.', uk: 'Кольорові нагороди відкриті, сірі — ще заблоковані.', pt: 'Conquistas coloridas estão abertas; as cinzas continuam bloqueadas.', en: 'Unlocked achievements are colored; locked achievements are grey.' },
        'settings.theme': { ru: 'Выбирай Premium Silver или Premium Graphite — оба варианта используют один GM-дизайн и одинаковые функции.', uk: 'Обери Premium Silver або Premium Graphite — функції ті самі.', pt: 'Escolha Premium Silver ou Premium Graphite. As funções são iguais.', en: 'Choose Premium Silver or Premium Graphite; both themes have the same features.' },
        'settings.language': { ru: 'Выбери язык здесь. Настройка сохраняется на устройстве и применяется к переводимым элементам приложения. Кнопка «Auto» использует язык Telegram.', uk: 'Обери мову тут; Auto використовує мову Telegram.', pt: 'Escolha o idioma aqui. Auto usa o idioma do Telegram.', en: 'Pick your preferred language. Auto follows your Telegram language.' },
        'support.send': { ru: 'После ввода темы и описания нажми здесь. Обращение попадёт в серверный список поддержки, а его статус появится ниже. По возможности укажи раздел, время и текст ошибки.', uk: 'Після опису натисни сюди. Звернення збережеться на сервері, а статус з’явиться нижче.', pt: 'Depois de descrever o problema, toque aqui. O chamado será salvo e o status aparecerá abaixo.', en: 'After entering the topic and description, tap here. The server stores your ticket and its status appears below.' },
        'support.ticket': { ru: 'Выбери категорию и опиши проблему минимум десятью символами. Обращение создаётся на сервере и появляется в списке; можно просматривать ответы.', uk: 'Оберіть категорію й опишіть проблему. Звернення збережеться на сервері.', pt: 'Escolha a categoria e descreva o problema. O chamado será salvo no servidor.', en: 'Choose a category and describe the issue. Your ticket is saved on the server.' }
    };
    const resetGuide = () => { setGuideScreen(''); setGuideStep(0); setGuideSpot(null); };
    const closeGuide = () => { if (guideScreen && authenticatedUserId)
        store.setItem(tutorialKey(guideScreen), '1'); resetGuide(); };
    const openGuide = (name) => { if (guideCatalog[name]) {
        setGuideScreen(name);
        setGuideStep(0);
        setGuideSpot(null);
    } };
    React.useEffect(() => {
        if (!guideScreen)
            return;
        const step = guideCatalog[guideScreen]?.[guideStep];
        if (!step)
            return;
        const selector = String(step[2] || '');
        let handle;
        const align = () => {
            const element = document.querySelector(selector);
            if (!element) {
                setGuideSpot(null);
                return;
            }
            const rect = element.getBoundingClientRect();
            const height = window.visualViewport?.height || window.innerHeight;
            const top = Math.max(8, rect.top - 5), bottom = Math.min(height - 8, rect.bottom + 5);
            const x = Math.max(8, rect.left - 6), right = Math.min(window.innerWidth - 8, rect.right + 6);
            const spotHeight = Math.max(36, bottom - top);
            const cardHeight = 260;
            const above = top - cardHeight - 15;
            const below = bottom + 14;
            const cardTop = (above >= 12 ? above : below + cardHeight <= height - 10 ? below : Math.max(12, height - cardHeight - 12));
            setGuideSpot({ top, left: x, width: right - x, height: spotHeight, cardTop });
        };
        const element = document.querySelector(selector);
        element?.scrollIntoView?.({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        const timer = window.setTimeout(align, 320);
        window.addEventListener('resize', align);
        window.addEventListener('scroll', align, true);
        return () => { window.clearTimeout(timer); window.removeEventListener('resize', align); window.removeEventListener('scroll', align, true); };
    }, [guideScreen, guideStep]);
    const [wallet, setWallet] = React.useState(firstWallet);
    const [toast, setToast] = React.useState('');
    const [gmBalanceMenu, setGmBalanceMenu] = React.useState(false);
    const [pointsGuideOpen, setPointsGuideOpen] = React.useState(false);
    const [framePreview, setFramePreview] = React.useState('standard');
    const [showFounderCollection, setShowFounderCollection] = React.useState(false);
    const [period, setPeriod] = React.useState('1h');
    const [selectedCandle, setSelectedCandle] = React.useState(null);
    const [tradeTab, setTradeTab] = React.useState('book');
    const [side, setSide] = React.useState('buy');
    const [amount, setAmount] = React.useState('');
    const [taskFilter, setTaskFilter] = React.useState('All');
    const [rankFilter, setRankFilter] = React.useState('Global');
    const [shopAmount, setShopAmount] = React.useState('');
    const [vaultAmount, setVaultAmount] = React.useState('');
    const [supportText, setSupportText] = React.useState('');
    const [supportTickets, setSupportTickets] = React.useState([]);
    const [staffReply, setStaffReply] = React.useState('');
    const [supportCategory, setSupportCategory] = React.useState('Общий вопрос');
    const [liveState, setLiveState] = React.useState(null);
    const [liveOrders, setLiveOrders] = React.useState([]);
    const [liveBook, setLiveBook] = React.useState(null);
    const [liveTicker, setLiveTicker] = React.useState(null);
    const [liveCandles, setLiveCandles] = React.useState([]);
    const [recentTrades, setRecentTrades] = React.useState([]);
    const [clock, setClock] = React.useState(Math.floor(Date.now() / 1000));
    const [adminStats, setAdminStats] = React.useState(null);
    const [liveTasks, setLiveTasks] = React.useState([]);
    const [liveAchievements, setLiveAchievements] = React.useState([]);
    const [liveReferrals, setLiveReferrals] = React.useState(null);
    const [liveRanks, setLiveRanks] = React.useState(null);
    const [holderRanks, setHolderRanks] = React.useState(null);
    const [holderStatus, setHolderStatus] = React.useState(null);
    const [holderLoading, setHolderLoading] = React.useState(false);
    const [holderMoreBusy, setHolderMoreBusy] = React.useState(false);
    const [holderShowPosition, setHolderShowPosition] = React.useState(false);
    const [holderConsentBusy, setHolderConsentBusy] = React.useState(false);
    const [shopQuote, setShopQuote] = React.useState(null);
    const [orderType, setOrderType] = React.useState('limit');
    const [orderPrice, setOrderPrice] = React.useState('');
    const [orderDuration, setOrderDuration] = React.useState('24h');
    const [tradeReady, setTradeReady] = React.useState(false);
    const [serverHistory, setServerHistory] = React.useState([]);
    const [myTicketHistory, setMyTicketHistory] = React.useState([]);
    const [demo, setDemo] = React.useState(true);
    React.useEffect(() => {
        if (screen !== 'splash' || demo || !authenticatedUserId)
            return;
        const timeout = setTimeout(() => setScreen(store.getItem(onboardingKey()) ? 'home' : 'intro'), 1350);
        return () => clearTimeout(timeout);
    }, [screen, demo, authenticatedUserId]);
    React.useEffect(() => {
        if (demo || !authenticatedUserId || ['splash', 'intro', 'reward'].includes(screen) || !guideCatalog[screen] || guideScreen)
            return;
        if (!store.getItem(tutorialKey(screen))) {
            const timeout = setTimeout(() => openGuide(screen), 550);
            return () => clearTimeout(timeout);
        }
    }, [screen, demo, guideScreen, authenticatedUserId]);
    const [liveRole, setLiveRole] = React.useState('player');
    const [adminId, setAdminId] = React.useState('');
    const [adminCode, setAdminCode] = React.useState('');
    const [adminAction, setAdminAction] = React.useState('grant');
    const [adminTeam, setAdminTeam] = React.useState([]);
    const [adminTasks, setAdminTasks] = React.useState([]);
    const [taskEditingId, setTaskEditingId] = React.useState('');
    const [taskDeleteArmed, setTaskDeleteArmed] = React.useState('');
    const [taskForm, setTaskForm] = React.useState({
        id: '', title: '', description: '', category: 'Other', icon: 'tasks',
        type: 'mining_claim_count', gte: '1', xp: '25', gm: '0', daily: false
    });
    const [task2fa, setTask2fa] = React.useState('');
    const [taskSaving, setTaskSaving] = React.useState(false);
    const [adminFunds, setAdminFunds] = React.useState([]);
    const [adminAmount, setAdminAmount] = React.useState('1000');
    const [adminFrom, setAdminFrom] = React.useState('TREASURY');
    const [adminTo, setAdminTo] = React.useState('MINING');
    const [adminReason, setAdminReason] = React.useState('Пополнение игрового фонда по решению владельца');
    const [adminCorrectionCurrency, setAdminCorrectionCurrency] = React.useState('GM');
    const [adminCorrectionPool, setAdminCorrectionPool] = React.useState('MINING');
    const [adminTicket, setAdminTicket] = React.useState('');
    const [testRecipient, setTestRecipient] = React.useState('self');
    const [testUserId, setTestUserId] = React.useState('');
    const [testCurrency, setTestCurrency] = React.useState('GM');
    const [selectedFrame, setSelectedFrame] = React.useState(store.getItem('gm_profile_frame') || 'standard');
    const [tonAccount, setTonAccount] = React.useState('');
    const [tonError, setTonError] = React.useState('');
    const tonUi = React.useRef(null);
    const [testAmount, setTestAmount] = React.useState('1000');
    const [testReason, setTestReason] = React.useState('Начисление виртуальных GM/CR для проверки торговой системы');
    const [testCode, setTestCode] = React.useState('');
    const [testBusy, setTestBusy] = React.useState(false);
    const walletLanguage = (pt, uk, en, ru) => actualLang === 'pt' ? pt : actualLang === 'uk' ? uk : actualLang === 'ru' ? ru : en;
    const holderAuthHeaders = () => ({ Authorization: 'tma ' + (webapp?.initData || ''), 'Content-Type': 'application/json' });
    const fetchHolders = async (offset = 0, append = false) => {
        if (demo || !webapp?.initData)
            return null;
        if (offset === 0)
            setHolderLoading(true);
        else
            setHolderMoreBusy(true);
        try {
            const response = await fetch('/api/holders?limit=30&offset=' + offset, { headers: holderAuthHeaders(), cache: 'no-store' });
            const data = await response.json();
            if (!response.ok)
                throw Error(data.error || 'Holders unavailable');
            setHolderRanks((old) => append && old ? { ...data, users: [...(old.users || []), ...(data.users || [])] } : data);
            return data;
        }
        catch (error) {
            setTonError(String(error.message || error));
            return null;
        }
        finally {
            setHolderLoading(false);
            setHolderMoreBusy(false);
        }
    };
    const getHolderStatus = async () => {
        if (!webapp?.initData)
            return;
        try {
            const response = await fetch('/api/holders/status', { headers: holderAuthHeaders(), cache: 'no-store' });
            if (response.ok) {
                const d = await response.json();
                setHolderStatus(d);
                return d;
            }
        }
        catch { }
        return null;
    };
    React.useEffect(() => { if (demo || screen !== 'leaderboard')
        return; void fetchHolders(); void getHolderStatus(); }, [screen, demo]);
    React.useEffect(() => { if (demo || screen !== 'wallet')
        return; void getHolderStatus(); }, [screen, demo]);
    React.useEffect(() => {
        if (demo || !webapp?.initData)
            return;
        const sdk = window.TON_CONNECT_UI;
        if (!sdk?.TonConnectUI) {
            setTonError('TON Connect SDK unavailable');
            return;
        }
        let disposed = false;
        try {
            const instance = new sdk.TonConnectUI({ manifestUrl: window.location.origin + '/tonconnect-manifest.json' });
            tonUi.current = instance;
            const prepareProof = async () => {
                if (disposed)
                    return;
                instance.setConnectRequestParameters({ state: 'loading' });
                try {
                    const response = await fetch('/api/holders/challenge', { method: 'POST', headers: holderAuthHeaders(), body: '{}' });
                    const challenge = await response.json();
                    if (!response.ok || !challenge.payload)
                        throw Error(challenge.error || 'Could not prepare wallet proof');
                    if (!disposed)
                        instance.setConnectRequestParameters({ state: 'ready', value: { tonProof: challenge.payload } });
                }
                catch (error) {
                    if (!disposed) {
                        instance.setConnectRequestParameters(null);
                        setTonError(String(error?.message || error));
                    }
                }
            };
            const unsubscribe = instance.onStatusChange(async (connected) => {
                if (disposed)
                    return;
                const address = connected?.account?.address || '';
                setTonAccount(address);
                if (!address) {
                    void getHolderStatus();
                    void prepareProof();
                    return;
                }
                const signed = connected?.connectItems?.tonProof;
                if (!signed || !('proof' in signed)) {
                    await getHolderStatus();
                    return;
                }
                try {
                    const proof = signed.proof;
                    const response = await fetch('/api/holders/verify', {
                        method: 'POST', headers: holderAuthHeaders(), body: JSON.stringify({
                            address: connected.account.address, network: connected.account.chain,
                            public_key: connected.account.publicKey,
                            proof: { ...proof, state_init: connected.account.walletStateInit }
                        })
                    });
                    const outcome = await response.json();
                    if (!response.ok || !outcome.verified)
                        throw Error(outcome.error || 'TON proof rejected');
                    if (!disposed) {
                        setTonError('');
                        await getHolderStatus();
                        void fetchHolders();
                    }
                }
                catch (error) {
                    if (!disposed)
                        setTonError(String(error?.message || error));
                }
            }, (error) => { if (!disposed)
                setTonError(String(error?.message || error)); });
            void prepareProof();
            void getHolderStatus();
            return () => { disposed = true; if (typeof unsubscribe === 'function')
                unsubscribe(); tonUi.current = null; };
        }
        catch (error) {
            setTonError(String(error?.message || error));
        }
    }, [demo]);
    const connectTonWallet = async () => {
        try {
            if (!tonUi.current)
                throw Error('TON Connect is not ready');
            if (tonUi.current.connected) {
                await tonUi.current.disconnect();
                setTonAccount('');
            }
            const response = await fetch('/api/holders/challenge', { method: 'POST', headers: holderAuthHeaders(), body: '{}' });
            const data = await response.json();
            if (!response.ok || !data.payload)
                throw Error(data.error || 'TON proof challenge unavailable');
            tonUi.current.setConnectRequestParameters({ state: 'ready', value: { tonProof: data.payload } });
            await tonUi.current.openModal();
        }
        catch (error) {
            setTonError(String(error?.message || error));
        }
    };
    const disconnectTonWallet = async () => {
        try {
            const response = await fetch('/api/holders/disconnect', { method: 'POST', headers: holderAuthHeaders(), body: '{}' });
            if (!response.ok)
                throw Error('Unable to unlink verified wallet');
            await tonUi.current?.disconnect();
            setTonAccount('');
            setTonError('');
            await getHolderStatus();
            void fetchHolders();
        }
        catch (error) {
            setTonError(String(error?.message || error));
        }
    };
    const setHolderOptIn = async (allowed) => {
        setHolderConsentBusy(true);
        try {
            const response = await fetch('/api/holders/consent', { method: 'POST', headers: holderAuthHeaders(), body: JSON.stringify({ opt_in: allowed }) });
            const data = await response.json();
            if (!response.ok)
                throw Error(data.error || 'Consent update failed');
            setHolderStatus(data);
            void fetchHolders();
        }
        catch (error) {
            setTonError(String(error?.message || error));
        }
        finally {
            setHolderConsentBusy(false);
        }
    };
    const refreshHolderBalance = async () => {
        setHolderLoading(true);
        try {
            const response = await fetch('/api/holders/refresh', { method: 'POST', headers: holderAuthHeaders(), body: '{}' });
            const data = await response.json();
            if (!response.ok)
                throw Error(data.error || 'Blockchain balance not verified');
            void fetchHolders();
            void getHolderStatus();
        }
        catch (error) {
            setTonError(String(error?.message || error));
        }
        finally {
            setHolderLoading(false);
        }
    };
    const [backendStatus, setBackendStatus] = React.useState('Проверяем вход через Telegram…');
    const [modal, setModal] = React.useState('');
    const [boxReveal, setBoxReveal] = React.useState({ kind: 'bronze', gm: 0, count: 1, unit: 0, spent: 0, xp: 0, unitXp: 0, unlocked: [] });
    const [boxKind, setBoxKind] = React.useState('bronze');
    const [boxCount, setBoxCount] = React.useState(1);
    const [boxBusy, setBoxBusy] = React.useState(false);
    const [upgradeData, setUpgradeData] = React.useState(null);
    const [upgradeBusy, setUpgradeBusy] = React.useState(false);
    const [showAllUpgrades, setShowAllUpgrades] = React.useState(false);
    const [modalText, setModalText] = React.useState('');
    const toastRef = React.useRef(0);
    const flash = (msg) => { setToast(msg); toastRef.current++; };
    React.useEffect(() => {
        if (!toast)
            return;
        const timeout = window.setTimeout(() => setToast(''), 3000);
        return () => window.clearTimeout(timeout);
    }, [toast]);
    const setW = (patch) => setWallet((w) => ({ ...w, ...(typeof patch === 'function' ? patch(w) : patch) }));
    const navStack = React.useRef([]);
    const goBack = () => {
        const prev = navStack.current.pop() || 'home';
        setScreen(prev);
        setModal('');
        try {
            history.replaceState({ gmScreen: prev }, '', '#' + prev);
        }
        catch { }
        document.querySelector('.phone-scroll')?.scrollTo(0, 0);
    };
    const goto = s => {
        setGmBalanceMenu(false);
        const route = String(s || 'home');
        if (route !== screen) {
            navStack.current.push(screen);
            if (navStack.current.length > 30)
                navStack.current.shift();
        }
        resetGuide();
        setScreen(route);
        setModal('');
        try {
            history.pushState({ gmScreen: route }, '', '#' + route);
        }
        catch { }
        document.querySelector('.phone-scroll')?.scrollTo(0, 0);
    };
    React.useEffect(() => {
        const onPop = () => {
            const prev = navStack.current.pop() || 'home', route = location.hash.slice(1);
            const allowed = ['home', 'trade', 'earn', 'tasks', 'leaderboard', 'profile', 'reward', 'splash', 'intro', 'mining', 'vault', 'wallet', 'shop', 'referrals', 'history', 'settings', 'support', 'admin', 'achievements', 'more', 'streak', 'boxes'];
            setScreen(allowed.includes(route) ? route : prev);
            setModal('');
            document.querySelector('.phone-scroll')?.scrollTo(0, 0);
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);
    React.useEffect(() => { try {
        store.setItem('gm_theme', theme);
    }
    catch { } ; webapp?.setBackgroundColor?.(theme === 'dark' ? '#030406' : '#E8EAF4'); }, [theme]);
    React.useEffect(() => { try {
        window.localStorage.removeItem('gm_demo_wallet');
    }
    catch { } }, []);
    React.useEffect(() => { const timer = setInterval(() => setClock(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(timer); }, []);
    React.useEffect(() => {
        webapp?.ready?.();
        webapp?.expand?.();
        const init = webapp?.initData;
        if (!init) {
            setBackendStatus('Открой приложение через @gm_token_test_bot в Telegram');
            return;
        }
        let valid = true;
        gmFetchJson('/api/bootstrap', { headers: { Authorization: 'tma ' + init } }, 2)
            .then(d => {
            if (!valid)
                return;
            setAuthenticatedUserId(String(d.user?.id || ''));
            setDemo(false);
            setScreen('splash');
            setLiveRole(d.user?.role || 'player');
            setBackendStatus('Telegram аккаунт: ' + (d.user?.id || 'подтверждён'));
            if (d.wallet)
                setW(w => ({ ...w, gm: d.wallet.gm / 100, cr: d.wallet.cr / 100, vault: d.wallet.vault / 100, level: d.user?.level || w.level, xp: d.user?.xp ?? w.xp }));
        })
            .catch(err => {
            if (!valid)
                return;
            setDemo(true);
            const msg = String(err?.message || '');
            setBackendStatus(/signature mismatch/i.test(msg) ? 'Ошибка подписи Telegram. Проверь настройки токена бота.' :
                /expired|invalid initData/i.test(msg) ? 'Срок авторизации истёк — открой GM TOKEN заново из чата бота.' :
                    'Ошибка соединения или авторизации. ' + msg);
        });
        return () => { valid = false; };
    }, []);
    const api = async (path, payload = undefined, silent = false) => {
        const init = webapp?.initData;
        if (!init) {
            if (!silent)
                flash('Открой GM TOKEN внутри Telegram');
            return null;
        }
        try {
            return await gmFetchJson(path, { method: payload ? 'POST' : 'GET',
                headers: { Authorization: 'tma ' + init, 'Content-Type': 'application/json' },
                body: payload ? JSON.stringify(payload) : undefined }, payload ? 0 : 2);
        }
        catch (error) {
            if (!silent)
                flash('Ошибка: ' + String(error?.message || error));
            return null;
        }
    };
    const refreshLive = async () => { if (!webapp?.initData)
        return; const d = await api('/api/game/status', undefined, true); if (!d)
        return; setLiveState(d); setW((w) => ({ ...w, gm: d.wallet.gm / 100, cr: d.wallet.cr / 100, vault: d.wallet.vault / 100, storage: d.mining.pending_cents / 100, level: d.user?.level || w.level, xp: d.user?.xp ?? w.xp })); const [orders, book, tasks, achievements, refs, ranks, ticker, chart, trades] = await Promise.all([api('/api/exchange/orders', undefined, true), api('/api/exchange/book', undefined, true), api('/api/tasks', undefined, true), api('/api/achievements', undefined, true), api('/api/referrals/me', undefined, true), api('/api/leaderboard', undefined, true), api('/api/market/ticker', undefined, true), api('/api/market/ohlcv?interval=' + period, undefined, true), api('/api/exchange/trades', undefined, true)]); if (orders)
        setLiveOrders(orders.orders || []); if (book)
        setLiveBook(book); if (tasks)
        setLiveTasks(tasks.tasks || []); if (achievements)
        setLiveAchievements(achievements.achievements || []); if (refs)
        setLiveReferrals(refs); if (ranks)
        setLiveRanks(ranks); if (ticker)
        setLiveTicker(ticker); if (chart)
        setLiveCandles(chart.candles || []); if (trades)
        setRecentTrades((trades.trades || []).filter((t) => !t.suspect).slice(0, 10)); setW((w) => ({ ...w, streak: d.daily?.streak || 0, lastClaim: d.daily?.last_claim_day || '' })); };
    const gameAction = async (path, payload = {}) => { const result = await api(path, { operationId: cryptoId(), ...payload }); if (result) {
        if (result.wallet)
            setW((w) => ({ ...w, gm: result.wallet.gm / 100, cr: result.wallet.cr / 100, vault: result.wallet.vault / 100 }));
        await refreshLive();
    } return result; };
    React.useEffect(() => { if (demo)
        return; refreshLive(); const timer = setInterval(() => { refreshLive(); }, 12000); return () => clearInterval(timer); }, [demo, period]);
    const nav = (s) => goto(s);
    const adminRequest = async (path, payload) => {
        if (demo || !webapp?.initData) {
            flash('Только после Telegram-авторизации владельца');
            return;
        }
        try {
            const response = await fetch(path, { method: payload ? 'POST' : 'GET', headers: { Authorization: 'tma ' + webapp.initData, 'Content-Type': 'application/json' }, body: payload ? JSON.stringify(payload) : undefined });
            const x = await response.json();
            if (!response.ok)
                throw Error(x.error || 'Сервер отказал');
            return x;
        }
        catch (e) {
            flash('Ошибка: ' + String(e.message || e));
            return null;
        }
    };
    const loadAdminTasks = async () => { const data = await adminRequest('/api/admin/task-catalog'); if (data?.tasks)
        setAdminTasks(data.tasks); };
    React.useEffect(() => { if (!demo && screen === 'admin' && ['owner', 'coowner'].includes(liveRole))
        void loadAdminTasks(); }, [demo, screen, liveRole]);
    const beginTaskEdit = (task) => {
        setTaskEditingId(task.id);
        setTaskDeleteArmed('');
        setTaskForm({ id: task.id, title: task.title, description: task.description, category: task.category || 'Other', icon: task.icon || 'tasks',
            type: task.condition?.type || 'mining_claim_count', gte: String(task.condition?.gte || 1),
            xp: String(task.xp || 0), gm: String(task.gm || 0), daily: Boolean(task.daily) });
    };
    const saveAdminTask = async (action = 'save') => {
        if (taskSaving || task2fa.length !== 6)
            return;
        setTaskSaving(true);
        try {
            const kind = action === 'delete' ? 'delete' : taskEditingId ? 'update' : 'create';
            const data = await adminRequest('/api/admin/task-catalog', {
                action: kind, id: taskForm.id, title: taskForm.title, description: taskForm.description, category: taskForm.category,
                icon: taskForm.icon, condition: { type: taskForm.type, gte: Number(taskForm.gte) }, xp: Number(taskForm.xp),
                gm: Number(taskForm.gm), daily: taskForm.daily, code: task2fa
            });
            if (data?.ok) {
                setAdminTasks(data.tasks || []);
                setTask2fa('');
                setTaskDeleteArmed('');
                setTaskEditingId('');
                setTaskForm({ id: '', title: '', description: '', category: 'Other', icon: 'tasks', type: 'mining_claim_count', gte: '1', xp: '25', gm: '0', daily: false });
                flash(kind === 'delete' ? 'Задание удалено' : 'Задание сохранено');
                await refreshLive();
            }
        }
        finally {
            setTaskSaving(false);
        }
    };
    const adminChangeRole = () => adminRequest('/api/admin/moderators', { telegramId: adminId, code: adminCode, action: adminAction }).then(() => adminRequest('/api/admin/team').then(x => x && setAdminTeam(x.team || [])));
    const adminTransfer = () => adminRequest('/api/admin/transfer', { source: adminFrom, target: adminTo, amount: adminAmount, code: adminCode, reason: adminReason, operationId: cryptoId() }).then(() => adminRequest('/api/admin/pools').then(x => x && setAdminFunds(x.pools || [])));
    const adminCorrection = () => adminRequest('/api/admin/correction', { userId: adminId, sourcePool: adminCorrectionPool, currency: adminCorrectionCurrency, amount: adminAmount, direction: 'credit', ticket: adminTicket, code: adminCode, reason: adminReason, operationId: cryptoId() });
    const testGrant = async () => {
        if (testBusy)
            return;
        setTestBusy(true);
        try {
            const out = await adminRequest(testCurrency === 'POINTS' ? '/api/admin/points-grant' : '/api/admin/test-grant', { recipient: testRecipient, userId: testRecipient === 'id' ? testUserId : undefined, currency: testCurrency, amount: testAmount, reason: testReason, code: testCode, operationId: cryptoId() });
            if (out?.ok) {
                setTestCode('');
                flash('Начислено ' + testAmount + ' ' + testCurrency + ' игроку ' + out.userId);
                await refreshLive();
            }
        }
        finally {
            setTestBusy(false);
        }
    };
    function cryptoId() { return (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : 'manual-' + Date.now() + '-' + Math.floor(Math.random() * 999999); }
    const todayClaim = async () => { const x = await gameAction('/api/daily/claim'); if (x)
        goto('reward'); };
    const miningClaim = async () => { const result = await gameAction('/api/mining/claim'); if (result?.gm_cents)
        flash('Собрано ' + nf(result.gm_cents / 100) + ' GM'); };
    React.useEffect(() => {
        if (screen !== 'mining' || demo)
            return;
        let valid = true;
        api('/api/mining/upgrades', undefined, true).then(data => { if (valid && data?.levels)
            setUpgradeData(data); });
        return () => { valid = false; };
    }, [screen, demo]);
    const buyMiningUpgrade = async () => {
        if (upgradeBusy || demo)
            return;
        if (!upgradeData?.upgrade?.purchasable) {
            goto('wallet');
            return;
        }
        const next = upgradeData?.upgrade?.next_level ?? liveState?.mining?.upgrade?.next_level;
        if (!next)
            return;
        setUpgradeBusy(true);
        try {
            const result = await gameAction('/api/mining/upgrade', { level: next });
            if (result?.upgrade) {
                setUpgradeData((old) => old ? { ...old, upgrade: result.upgrade } : old);
                flash('Майнинг улучшен до уровня ' + result.upgrade.level);
            }
        }
        finally {
            setUpgradeBusy(false);
        }
    };
    const openBox = async (kind, count = boxCount) => {
        if (boxBusy || demo)
            return;
        setBoxBusy(true);
        try {
            const result = await api('/api/boxes/open', { kind, count, operationId: cryptoId() });
            if (result?.gm_cents != null) {
                setBoxReveal({ kind, gm: result.gm_cents / 100, count: result.count || count,
                    unit: Number(result.unit_reward_gm || 0), spent: Number(result.spent_points || 0),
                    xp: Number(result.xp || 0), unitXp: Number(result.unit_xp || 0),
                    unlocked: Array.isArray(result.unlocked_frames) ? result.unlocked_frames : [] });
                await refreshLive();
                setModal('boxReveal');
            }
        }
        finally {
            setBoxBusy(false);
        }
    };
    const depositVault = async () => { await gameAction('/api/vault/deposit', { amount: vaultAmount.replace(',', '.') }); };
    const withdrawVault = async () => { await gameAction('/api/vault/withdraw', { amount: vaultAmount.replace(',', '.') }); };
    const tradeIssue = () => {
        const v = String(amount || '').trim().replace(',', '.');
        if (!/^\d{1,13}(\.\d{1,2})?$/.test(v))
            return 'Введи количество GM с точностью до двух знаков.';
        const n = Number(v);
        if (!Number.isFinite(n) || n < 10)
            return 'Минимальная заявка — 10 GM.';
        if (side === 'sell') {
            if (n > wallet.gm + 0.000001)
                return 'Недостаточно GM: доступно ' + nf(wallet.gm) + ' GM. Пополни баланс через Admin или Mining.';
            if (orderType === 'market' && !liveTicker?.best_bid)
                return 'В стакане нет покупателей для Market-продажи. Используй Limit.';
        }
        else if (orderType === 'market' && !liveTicker?.best_ask)
            return 'В стакане нет продавцов для Market-покупки. Используй Limit.';
        if (liveTicker?.premarket && orderType === 'market')
            return 'До завершения Premarket допускаются только Limit-заявки.';
        const p = String(orderPrice || '').trim().replace(',', '.');
        if (orderType === 'limit' && (!/^\d{1,13}(\.\d{1,2})?$/.test(p) || Number(p) < 0.01))
            return 'Укажи цену Limit не меньше 0,01 CR за 1 GM.';
        if (side === 'buy') {
            const rate = orderType === 'limit' ? Number(p) : Math.floor(Number(liveTicker?.best_ask || 0) * 1.03) / 100;
            const locked = Math.ceil(n * rate * 100) / 100;
            if (locked > wallet.cr + 0.000001)
                return 'Недостаточно CR: потребуется около ' + nf(locked) + ' CR, доступно ' + nf(wallet.cr) + ' CR.';
        }
        return '';
    };
    const submitOrder = async () => {
        const issue = tradeIssue();
        if (issue) {
            flash(issue);
            setModal('tradeForm');
            return;
        }
        const request = { type: orderType, side, amount: amount.replace(',', '.'), price: orderPrice.replace(',', '.'), duration: orderDuration };
        const x = await gameAction('/api/exchange/order', request);
        if (x) {
            setModal('');
            setTradeReady(false);
            flash(x.auction ? 'Заявка на аукционе · проверь «Мои ордера»' : 'Заявка размещена · проверь «Мои ордера»');
        }
    };
    const cancelLiveOrder = async (id) => { await gameAction('/api/exchange/cancel', { orderId: id }); };
    const loadHistory = async () => {
        const [x, y] = await Promise.all([api('/api/history', undefined, true), api('/api/tickets/my', undefined, true)]);
        if (x)
            setServerHistory(x.events || []);
        if (y)
            setMyTicketHistory(y.tickets || []);
    };
    React.useEffect(() => { if (!demo && screen === 'history')
        void loadHistory(); }, [screen, demo]);
    const tradePreview = () => {
        const issue = tradeIssue();
        if (issue) {
            flash(issue);
            return;
        }
        const n = Number(amount.replace(',', '.'));
        const price = Number(orderPrice.replace(',', '.'));
        setModalText((side === 'buy' ? 'Покупка ' : 'Продажа ') + nf(n) + ' GM. ' + (orderType === 'limit' ? 'Лимит ' + nf(price) + ' CR/GM.' : 'Market с защитой 3% от проскальзывания.') + ' Комиссия при исполнении: 0,5% для каждой стороны. Подтверждение отправляет заявку на сервер.');
        setTradeReady(true);
        setModal('order');
    };
    const loadTickets = async () => {
        try {
            const r = await fetch('/api/tickets', { headers: { Authorization: 'tma ' + webapp?.initData } });
            const x = await r.json();
            if (!r.ok)
                throw Error(x.error);
            setSupportTickets(x.tickets || []);
        }
        catch (e) {
            flash('Ошибка получения тикетов: ' + e.message);
        }
    };
    React.useEffect(() => { if (!demo && screen === 'support')
        void loadTickets(); }, [screen, demo]);
    const ticketAction = async (id, action, payload = {}) => {
        const x = await adminRequest(`/api/tickets/${id}/${action}`, payload);
        if (x)
            loadTickets();
    };
    const createTicket = async () => {
        if (supportText.trim().length < 10) {
            flash('Опиши проблему минимум в 10 символах');
            return;
        }
        const x = await adminRequest('/api/tickets', { category: supportCategory, body: supportText });
        if (x) {
            setSupportText('');
            flash('Обращение создано');
            await loadTickets();
        }
    };
    const icon = (n, size = 23, tile = false) => React.createElement(Icon, { name: n, theme: theme, size: size, tile: tile });
    const isLight = theme === 'light';
    const top = (title, back = true, right = 'more') => React.createElement("header", { className: 'screen-header ' + (!isLight ? 'dark-head' : '') },
        React.createElement("button", { className: "header-icon", "aria-label": "\u041D\u0430\u0437\u0430\u0434", onClick: () => back ? goBack() : goto('more') }, back ? icon('chevron-left', 24) : React.createElement(Brand, { theme: theme, size: 35 })),
        React.createElement("strong", null, title),
        React.createElement("button", { className: "header-icon", onClick: () => right === 'settings' ? goto('settings') : right === 'info' ? openGuide(screen) : goto('more'), "aria-label": right === 'info' ? L('instruction') : "Дополнительные действия" }, icon(right, 23)));
    const menuItems = [['home', 'home', lang('home')], ['trade', 'candlesticks', lang('market')], ['mining', 'lightning', lang('mining')], ['boxes', 'gift', lang('boxes')], ['more', 'more', lang('more')]];
    const bottom = () => React.createElement("nav", { className: "bottom-nav", "aria-label": "\u041E\u0441\u043D\u043E\u0432\u043D\u044B\u0435 \u0440\u0430\u0437\u0434\u0435\u043B\u044B" }, menuItems.map(([s, i, t]) => React.createElement(BarButton, { key: s, name: i, theme: theme, title: t, selected: screen === s || (isLight && s === 'earn' && screen === 'tasks') || (!isLight && s === 'earn' && screen === 'tasks'), onClick: () => goto(s === 'earn' && isLight ? 'tasks' : s) })));
    function Home() {
        const e = React.createElement;
        const points = liveState?.points?.points ?? 0;
        const miningRate = (liveState?.mining?.rate_cents_day != null ? liveState.mining.rate_cents_day / 100 : gmRate(wallet));
        const level = wallet.level || 1;
        const nextLevel = xpThreshold[Math.min(9, level)] || xpThreshold[9];
        const previous = xpThreshold[Math.max(0, level - 1)] || 0;
        const progress = Math.max(0, Math.min(100, (wallet.xp - previous) / Math.max(1, nextLevel - previous) * 100));
        const data = (liveCandles || []).filter(c => Number.isFinite(c.close)).slice(-18);
        const closes = data.map(c => c.close);
        const min = Math.min(...closes), max = Math.max(...closes), delta = Math.max(1, max - min);
        const spark = data.length >= 2 ? e('svg', { viewBox: '0 0 320 90', preserveAspectRatio: 'none', role: 'img', 'aria-label': 'Подтверждённые цены GM/CR' }, e('defs', null, e('linearGradient', { id: 'gm-spark-grad', x1: 0, y1: 0, x2: 0, y2: 1 }, e('stop', { offset: '0%', stopColor: theme === 'light' ? '#6b788e' : '#cfd5e1', stopOpacity: .23 }), e('stop', { offset: '100%', stopColor: theme === 'light' ? '#6b788e' : '#cfd5e1', stopOpacity: 0 }))), e('polyline', { points: closes.map((v, i) => (12 + i * 296 / (closes.length - 1)) + ',' + (78 - (v - min) / delta * 61)).join(' '),
            fill: 'none', stroke: theme === 'light' ? '#485465' : '#c3cedc', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }))
            : e('div', { className: 'gm-home-market-empty' }, icon('candlesticks', 21), e('span', null, 'График появится после нескольких сделок'));
        const quick = [['lightning', 'Майнинг', 'mining'], ['gift', 'Боксы', 'boxes'], ['tasks', 'Задания', 'tasks'], ['friends', 'Друзья', 'referrals']];
        return e('div', { className: 'gm-home-v8' }, e('header', { className: 'gm-home-topline' }, e('div', { className: 'gm-home-brand' }, e(Brand, { theme, size: 37 }), e('div', null, e('b', null, 'GM TOKEN'), e('small', null, 'PREMIUM EDITION'))), e('button', { className: 'gm-home-settings', type: 'button', onClick: () => goto('settings'), 'aria-label': 'Настройки' }, icon('settings', 23))), e('div', { className: 'gm-home-level' }, e('div', null, e('span', null, 'Твой прогресс'), e('b', null, 'Уровень ' + level)), e('div', { className: 'gm-home-level-right' }, nf(wallet.xp, 0) + ' / ' + nf(nextLevel, 0) + ' XP'), e('div', { className: 'gm-home-level-track' }, e('span', { style: { width: progress + '%' } }))), e('section', { className: 'gm-home-wallet gm-premium-card' }, e('div', { className: 'gm-home-wallet-head' }, e('span', null, 'МОЙ БАЛАНС'), e('span', null, icon('shield-check', 16), ' Подтверждён')), e('div', { className: 'gm-home-balance-row' }, e('span', { className: 'gm-home-balance-icon' }, e(Brand, { theme, size: 33 })), e('div', null, e('small', null, 'GM'), e('strong', null, nf(wallet.gm))), e('button', { type: 'button', onClick: () => setGmBalanceMenu(true), 'aria-label': 'Варианты получения GM' }, icon('plus', 21))), e('div', { className: 'gm-home-balance-row' }, e('span', { className: 'gm-home-balance-icon' }, icon('coins', 31)), e('div', null, e('small', null, 'CR'), e('strong', null, nf(wallet.cr))), e('button', { type: 'button', onClick: () => goto('trade'), 'aria-label': 'Перейти на рынок' }, icon('chevron-right', 21)))), e('button', { type: 'button', className: 'gm-home-chart gm-premium-card', onClick: () => goto('trade') }, e('div', { className: 'gm-home-chart-top' }, e('div', null, e('small', null, 'РЫНОК · ТЕСТОВЫЙ GM/CR'), e('b', null, liveTicker?.last_price ? nf(liveTicker.last_price / 100) + ' CR' : 'Нет цены')), icon('chevron-right', 21)), spark, e('small', { className: 'gm-home-chart-note' }, 'Только реальные игровые сделки · без искусственного графика')), e('div', { className: 'gm-home-shortcuts' }, quick.map(([img, label, route]) => e('button', { type: 'button', key: route, onClick: () => goto(route), className: 'gm-home-shortcut' }, e('span', null, icon(img, 30, true)), e('b', null, label)))), e('button', { type: 'button', className: 'gm-home-offer gm-premium-card', onClick: () => goto('mining') }, e('span', { className: 'gm-home-offer-coin' }, e(Brand, { theme, size: 51 })), e('span', null, e('b', null, 'Майнинг работает'), e('small', null, nf(miningRate, 0) + ' GM/сутки · накоплено ' + nf(wallet.storage) + ' GM')), icon('chevron-right', 21)), e('button', { type: 'button', className: 'gm-home-offer gm-premium-card', onClick: () => goto('boxes') }, e('span', { className: 'gm-home-offer-coin' }, icon('gift', 45, true)), e('span', null, e('b', null, 'Открывай боксы за POINTS'), e('small', null, 'Твои POINTS: ' + nf(points, 0) + ' · гарантированные награды')), icon('chevron-right', 21)), e('div', { className: 'gm-home-lower' }, e('button', { type: 'button', onClick: () => goto('reward') }, icon('flame', 19), ' Daily Reward', icon('chevron-right', 15)), e('button', { type: 'button', onClick: () => goto('more') }, icon('info', 19), ' Как играть', icon('chevron-right', 15))));
    }
    function Trading() {
        const e = React.createElement;
        const tr = (pt, uk, en, ru) => walletLanguage(pt, uk, en, ru);
        const pre = liveTicker?.premarket ?? !liveBook?.auction_done;
        const remain = Math.max(0, (liveTicker?.auction_end_at || liveBook?.auction_end_at || 0) - clock);
        const countdown = [Math.floor(remain / 3600), Math.floor(remain % 3600 / 60), remain % 60].map(x => String(x).padStart(2, '0')).join(':');
        const quote = pre ? liveTicker?.indicative?.price : liveTicker?.last_price;
        const bids = liveBook?.bids || [], asks = liveBook?.asks || [];
        const activeOrders = liveOrders.filter(o => o.status === 'open');
        const isOwner = ['owner', 'coowner'].includes(liveRole);
        const topDepth = Math.max(1, ...[...bids, ...asks].map(o => o.gm_cents));
        const openTrade = (kind) => {
            setSide(kind);
            setOrderType('limit');
            if (!orderPrice) {
                const px = Number((pre ? liveTicker?.indicative?.price : kind === 'buy' ? liveTicker?.best_ask : liveTicker?.best_bid) || liveTicker?.last_price || 0);
                if (px > 0)
                    setOrderPrice((px / 100).toFixed(2));
            }
            setModal('tradeForm');
        };
        const quickPriceCents = Number((pre ? liveTicker?.indicative?.price : side === 'buy' ? liveTicker?.best_ask : liveTicker?.best_bid) || liveTicker?.last_price || 0);
        const quickQty = Number(String(amount).replace(',', '.'));
        const quickTotal = Number.isFinite(quickQty) && quickQty > 0 && quickPriceCents > 0 ? nf(quickQty * quickPriceCents / 100, 2) + ' CR' : '—';
        const tradeName = pre ? 'PREMARKET' : liveTicker?.trade_test_mode ? 'TEST SPOT' : 'SPOT';
        const timeframe = ['1m', '5m', '15m', '1h', '4h', '1d'];
        const tabNames = [['book', 'Стакан'], ['recent', 'Сделки'], ['orders', 'Мои ордера']];
        const depthRows = (orders, kind) => orders.length ?
            orders.slice(0, 10).map(o => e('div', { className: 'terminal-depth-row ' + kind, key: kind + o.limit_price }, e('div', { className: 'terminal-depth-bar', style: { width: Math.max(3, Math.min(100, 100 * o.gm_cents / topDepth)) + '%' } }), e('span', null, nf(o.limit_price / 100)), e('b', null, nf(o.gm_cents / 100, 2))))
            : e('p', { className: 'terminal-table-empty' }, 'Пока нет заявок');
        const bookPanel = e('div', { className: 'terminal-depth' }, e('div', { className: 'terminal-depth-head' }, e('span', null, 'Цена', e('small', null, 'CR / GM')), e('span', null, 'Объём', e('small', null, 'GM'))), e('div', { className: 'terminal-depth-columns' }, e('div', { className: 'terminal-depth-column' }, e('div', { className: 'terminal-depth-label bid' }, e('i'), e('b', null, 'ПОКУПКА')), depthRows(bids, 'bid')), e('div', { className: 'terminal-depth-column' }, e('div', { className: 'terminal-depth-label ask' }, e('i'), e('b', null, 'ПРОДАЖА')), depthRows(asks, 'ask'))), e('div', { className: 'terminal-depth-bottom' }, e('span', null, 'Bid ', e('b', null, liveTicker?.best_bid ? nf(liveTicker.best_bid / 100) : '—')), e('span', null, 'Ask ', e('b', null, liveTicker?.best_ask ? nf(liveTicker.best_ask / 100) : '—'))));
        const tradesPanel = e('div', { className: 'terminal-trade-history' }, recentTrades.length ? recentTrades.map((t, i) => e('div', { className: 'terminal-history-row', key: String(t.at || i) + '-' + i }, e('span', null, new Date((t.at || 0) * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })), e('b', null, nf(t.price / 100) + ' CR'), e('span', null, nf(t.amount_cents / 100) + ' GM')))
            : e('div', { className: 'terminal-tab-empty' }, icon('clock', 30), e('b', null, 'Сделок пока нет'), e('small', null, 'Здесь появятся исполненные, подтверждённые сервером сделки.')));
        const ordersPanel = e('div', { className: 'terminal-my-orders' }, activeOrders.length ? activeOrders.slice(0, 25).map(o => e('div', { className: 'trade-open-row terminal-own-row', key: o.id }, e('div', null, e('b', { className: o.side === 'buy' ? 'terminal-order-buy' : 'terminal-order-sell' }, o.side === 'buy' ? 'Покупка GM' : 'Продажа GM'), e('small', null, nf(o.remaining_cents / 100) + ' GM · ' + nf(o.limit_price / 100) + ' CR/GM')), e('button', { type: 'button', onClick: () => cancelLiveOrder(o.id) }, 'Отменить')))
            : e('div', { className: 'terminal-tab-empty' }, icon('layers', 30), e('b', null, 'Активных ордеров нет'), e('small', null, 'Выбери «Купить» или «Продать», чтобы создать Limit-заявку.')));
        return e(React.Fragment, null, top(L('market'), true, 'info'), e('section', { className: 'terminal-shell' }, e('div', { className: 'terminal-pair-top' }, e('div', { className: 'terminal-pair-logo' }, icon('gm-coin-orbit', 39)), e('div', { className: 'terminal-pair-text' }, e('b', null, 'GM / CR'), e('small', null, 'GM TOKEN · торговая пара')), e('div', { className: 'terminal-live-tag' }, e('i', { className: 'terminal-live-dot' }), tradeName)), e('div', { className: 'terminal-quote' }, e('div', { className: 'terminal-quote-label' }, e('span', null, pre ? 'Индикативная цена' : 'Последняя цена сделки'), e('button', { type: 'button', onClick: refreshLive, 'aria-label': 'Обновить котировки' }, icon('refresh', 17))), e('div', { className: 'terminal-quote-value' }, quote ? nf(quote / 100) : '—', e('small', null, 'CR')), e('p', null, quote ? pre ? 'Ориентировочная цена не означает исполненную сделку.' : 'Подтверждено исполненной сделкой GM/CR.' : 'Цена появится после первой исполненной сделки между разными игроками')), e('div', { className: 'terminal-metrics' }, e('div', null, e('small', null, 'ОБЪЁМ · 24 Ч'), e('b', null, nf((liveTicker?.volume_24h_gm_cents || 0) / 100) + ' GM')), e('div', null, e('small', null, 'СДЕЛОК · 24 Ч'), e('b', null, String(liveTicker?.trades_24h || 0))), e('div', null, e('small', null, 'РЕЖИМ'), e('b', null, pre ? countdown : 'Активен'))), e('div', { className: 'terminal-chart-toolbar' }, e('div', null, e('b', null, tr('GRÁFICO', 'ГРАФІК', 'CHART', 'ГРАФИК')), e('small', null, 'OHLCV')), e('div', { className: 'terminal-chart-truth' }, icon('shield-check', 15), 'Реальные сделки')), e(Candles, { theme, candles: liveCandles, selected: selectedCandle, onSelect: setSelectedCandle, interval: period }), e('div', { className: 'terminal-periods', 'aria-label': 'Интервал свечей' }, timeframe.map(t => e('button', { type: 'button', key: t, className: period === t ? 'active' : '',
            'aria-pressed': period === t, onClick: () => { setSelectedCandle(null); setPeriod(t); } }, t)))), e('section', { className: 'terminal-controls' }, e('div', { className: 'trade-wallet-balances terminal-wallet-line' }, e('div', null, e('small', null, 'Доступно для торговли'), e('span', null, icon('wallet', 17), ' Твой баланс')), e('div', { className: 'terminal-wallet-amounts' }, e('span', null, e('b', null, nf(wallet.gm)), ' GM'), e('span', null, e('b', null, nf(wallet.cr)), ' CR'))), e('div', { className: 'trade-cta-row terminal-buy-sell', role: 'group', 'aria-label': 'Купить или продать игровые GM' }, e('button', { type: 'button', className: 'trade-cta buy ' + (side === 'buy' ? 'active' : ''), 'aria-pressed': side === 'buy', onClick: () => setSide('buy') }, icon('plus', 19), e('span', null, e('b', null, tr('COMPRAR GM', 'КУПИТИ GM', 'BUY GM', 'КУПИТЬ GM')), e('small', null, tr('Por CR do jogo', 'За ігрові CR', 'For in-game CR', 'За игровые CR')))), e('button', { type: 'button', className: 'trade-cta sell ' + (side === 'sell' ? 'active' : ''), 'aria-pressed': side === 'sell', onClick: () => setSide('sell') }, icon('minus', 19), e('span', null, e('b', null, tr('VENDER GM', 'ПРОДАТИ GM', 'SELL GM', 'ПРОДАТЬ GM')), e('small', null, tr('Receber CR', 'Отримати CR', 'Receive CR', 'Получить CR'))))), e('div', { className: 'gm-trade-quick-card gm-premium-card' }, e('div', { className: 'gm-trade-quick-head' }, e('span', null, side === 'buy' ? tr('COMPRA · GM', 'КУПІВЛЯ · GM', 'BUY · GM', 'ПОКУПКА · GM') : tr('VENDA · GM', 'ПРОДАЖ · GM', 'SELL · GM', 'ПРОДАЖА · GM')), e('b', null, 'GM / CR')), e('label', { htmlFor: 'gm-trade-quick-amount' }, tr('Quantidade', 'Кількість', 'Quantity', 'Количество')), e('div', { className: 'gm-trade-quick-input' }, e('input', { id: 'gm-trade-quick-amount', inputMode: 'decimal', type: 'text', placeholder: '0.00', value: amount, onChange: ev => setAmount(ev.target.value), 'aria-label': 'Количество GM' }), e('span', null, 'GM')), e('div', { className: 'gm-trade-quick-presets' }, ['10', '100', '500', '1000'].map(x => e('button', { type: 'button', key: x, className: amount === x ? 'active' : '', onClick: () => setAmount(x) }, x))), e('div', { className: 'gm-trade-quick-total' }, e('span', null, side === 'buy' ? tr('Valor estimado', 'Орієнтовна вартість', 'Estimated cost', 'Предварительно потребуется') : tr('Recebimento estimado', 'Орієнтовне надходження', 'Estimated proceeds', 'Предварительно получится')), e('strong', null, quickTotal)), e('small', { className: 'gm-trade-quick-disclaimer' }, quickPriceCents > 0 ? tr('Estimativa pela última cotação; confirme o preço antes de enviar.', 'Оцінка за останньою ціною; підтвердь ціну перед відправленням.', 'Estimate from latest quote; review the price before submission.', 'Расчёт по последней доступной цене; окончательная цена указывается в заявке.') : tr('Preço ainda indisponível. Defina seu próprio preço na revisão.', 'Ціна ще недоступна. Встанови власну ціну під час перевірки.', 'Price unavailable. Set your own limit price during review.', 'Рыночная цена пока не подтверждена. Ты сможешь задать свою цену при проверке заявки.')), e('button', { type: 'button', className: 'gm-trade-quick-continue', disabled: !Number.isFinite(quickQty) || quickQty < 10, onClick: () => openTrade(side) }, side === 'buy' ? tr('Continuar compra', 'Продовжити купівлю', 'Continue buying', 'Продолжить покупку') : tr('Continuar venda', 'Продовжити продаж', 'Continue selling', 'Продолжить продажу'), icon('chevron-right', 21))), (isOwner || wallet.gm < 10) ? e('div', { className: 'terminal-funding' }, e('span', null, 'Доступно для торговли: GM и CR; открытые заявки резервируют средства.'), e('button', { type: 'button', onClick: () => goto(isOwner ? 'admin' : 'mining') }, isOwner ? 'Пополнить тестовый баланс' : 'Mining', icon('chevron-right', 16))) : null), e('section', { className: 'terminal-data-panel' }, e('div', { className: 'terminal-data-tabs', role: 'tablist', 'aria-label': 'Данные рынка' }, tabNames.map(([value, label]) => e('button', { type: 'button', key: value, role: 'tab',
            className: tradeTab === value ? 'active' : '', 'aria-selected': tradeTab === value,
            onClick: () => setTradeTab(value) }, label))), e('div', { className: 'terminal-tab-content' }, tradeTab === 'book' ? bookPanel : tradeTab === 'recent' ? tradesPanel : ordersPanel)), e('p', { className: 'terminal-fine-print' }, 'GM и CR — виртуальные игровые единицы. Свечи и объём рассчитываются только по исполненным сделкам. Комиссия 0,5% для каждой стороны при исполнении.'));
    }
    function TradeOrderModal() {
        const e = React.createElement;
        const pre = !!liveTicker?.premarket;
        const isForm = modal === 'tradeForm';
        const qty = Number(String(amount).replace(',', '.'));
        const px = Number(String(orderPrice).replace(',', '.'));
        const quotePrice = orderType === 'limit' ? px : (Number(liveTicker?.best_ask || 0) / 100) * 1.03;
        const estimate = Number.isFinite(qty) && qty > 0 && Number.isFinite(quotePrice) && quotePrice > 0 ? Math.ceil(qty * quotePrice * 100) / 100 : 0;
        const available = side === 'buy' ? wallet.cr : wallet.gm;
        const required = side === 'buy' ? estimate : qty;
        const issue = tradeIssue();
        const label = side === 'buy' ? 'Купить GM' : 'Продать GM';
        return e('div', { className: 'overlay trade-overlay', onClick: () => setModal('') }, e('div', { className: 'modal-box trade-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': isForm ? label : 'Подтверждение ордера', onClick: ev => ev.stopPropagation() }, e('div', { className: 'trade-sheet-head' }, e('div', { className: 'trade-sheet-title' }, e('div', { className: 'trade-sheet-icon' }, icon(side === 'buy' ? 'deposit' : 'withdraw', 30)), e('span', null, e('strong', null, isForm ? label : 'Проверь заявку'), e('small', null, 'GM / CR · ' + (pre ? 'Premarket' : 'Test Spot')))), e('button', { type: 'button', className: 'trade-sheet-x', onClick: () => setModal(''), 'aria-label': 'Закрыть' }, icon('close', 21))), e('div', { className: 'trade-sheet-balance' }, e('span', null, 'Доступно ' + (side === 'buy' ? 'CR' : 'GM')), e('strong', null, nf(available) + ' ' + (side === 'buy' ? 'CR' : 'GM'))), isForm ? e(React.Fragment, null, e('div', { className: 'trade-field' }, e('label', { htmlFor: 'trade-order-type' }, 'Тип заявки'), e('div', { className: 'gm-trade-type-pills', role: 'group', 'aria-label': 'Тип заявки' }, e('button', { type: 'button', className: orderType === 'limit' ? 'active' : '', 'aria-pressed': orderType === 'limit', onClick: () => setOrderType('limit') }, 'LIMIT', e('small', null, 'Своя цена')), e('button', { type: 'button', disabled: pre, className: orderType === 'market' ? 'active' : '', 'aria-pressed': orderType === 'market', onClick: () => setOrderType('market') }, 'MARKET', e('small', null, 'До 3% проскальзывания')))), e('div', { className: 'trade-field' }, e('label', { htmlFor: 'trade-qty' }, 'Количество GM'), e('input', { id: 'trade-qty', type: 'text', inputMode: 'decimal', placeholder: 'Например, 5000', value: amount, onChange: ev => setAmount(ev.target.value) })), e('div', { className: 'trade-sheet-presets' }, ['10', '100', '1000', '5000'].map(v => e('button', { type: 'button', key: v, className: amount === v ? 'active' : '', onClick: () => setAmount(v) }, v))), orderType === 'limit' ? e('div', { className: 'trade-field' }, e('label', { htmlFor: 'trade-price' }, 'Цена · CR за 1 GM'), e('input', { id: 'trade-price', type: 'text', inputMode: 'decimal', value: orderPrice, placeholder: 'Например, 0.50', onChange: ev => setOrderPrice(ev.target.value) })) : null, orderType === 'limit' ? e('div', { className: 'trade-field' }, e('label', { htmlFor: 'trade-expiry' }, 'Срок действия заявки'), e('div', { className: 'gm-trade-duration-pills', role: 'group', 'aria-label': 'Срок действия заявки' }, ['1h', '6h', '12h', '24h', '3d', '7d', 'GTC'].map(x => e('button', { type: 'button', key: x, className: orderDuration === x ? 'active' : '', 'aria-pressed': orderDuration === x, onClick: () => setOrderDuration(x) }, x)))) : null, e('div', { className: 'trade-sheet-estimate' }, e('span', null, side === 'buy' ? 'Резерв по заявке' : 'Заблокируется GM'), e('strong', null, (required > 0 ? nf(required) : '—') + ' ' + (side === 'buy' ? 'CR' : 'GM'))), issue ? e('p', { className: 'trade-form-alert', role: 'alert' }, icon('shield-check', 17), issue) : e('p', { className: 'trade-form-help' }, 'Комиссия 0,5% при исполнении с обеих сторон. Без фиктивных сделок.'), e('button', { type: 'button', className: 'trade-sheet-primary', disabled: !!issue, onClick: tradePreview }, 'Проверить заявку', icon('chevron-right', 20))) :
            e(React.Fragment, null, e('div', { className: 'trade-review' }, e('span', null, 'ПОДТВЕРЖДЕНИЕ'), e('p', null, modalText)), e('div', { className: 'trade-sheet-estimate' }, e('span', null, 'Доступно сейчас'), e('strong', null, nf(available) + ' ' + (side === 'buy' ? 'CR' : 'GM'))), issue ? e('p', { className: 'trade-form-alert', role: 'alert' }, issue) : null, e('button', { type: 'button', className: 'trade-sheet-primary', disabled: !!issue, onClick: submitOrder }, 'Отправить ордер', icon('shield-check', 20))), e('button', { type: 'button', className: 'trade-sheet-secondary', onClick: () => { setModal(isForm ? '' : 'tradeForm'); } }, isForm ? 'Отмена' : 'Назад к форме')));
    }
    function Earn() { return React.createElement(React.Fragment, null,
        !isLight ? React.createElement("header", { className: "dark-top" },
            React.createElement("b", null, "GM TOKEN"),
            React.createElement("button", { onClick: () => goto('settings') },
                icon('more', 22),
                " ",
                icon('close', 17))) : top('Earn', true, 'gift'),
        React.createElement("div", { className: 'earn-total ' + (isLight ? 'pearl-card' : 'metallic-card') },
            React.createElement("div", null,
                React.createElement("small", null, "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0431\u0430\u043B\u0430\u043D\u0441 GM"),
                React.createElement("div", { className: "earned-number" },
                    nf(wallet.gm, 0),
                    " ",
                    React.createElement("span", null, "GM"))),
            icon('trending-up', 48)),
        React.createElement("h3", { className: "section-title" }, "Earn Methods"),
        React.createElement("div", { className: "earn-methods" }, [['gift', 'Daily Reward', 'Get free GM tokens every day', 'reward'], ['coins', 'Hold & Earn', 'Earn game rewards for holding', 'vault'], ['tasks', 'Tasks', 'Complete tasks and earn more', 'tasks'], ['friends', 'Invite Friends', 'Get bonuses for referrals', 'referrals'], ['lightning', 'Mining', 'Play to earn virtual GM', 'mining'], ['swap', 'GM Shop', 'Exchange virtual GM into CR', 'shop']].map(([i, title, description, s]) => React.createElement("button", { key: title, className: 'earn-item ' + (isLight ? 'pearl-card' : 'metallic-card'), onClick: () => goto(s) },
            icon(i, 48, true),
            React.createElement("span", null,
                React.createElement("b", null, title),
                React.createElement("small", null, description)),
            icon('chevron-right', 19))))); }
    function Tasks() {
        const e = React.createElement;
        const tabs = [['All', 'Все'], ['Social', 'Социальные'], ['Other', 'Игровые']];
        const shown = (liveTasks || []).filter(t => taskFilter === 'All' || t.category === taskFilter);
        const rows = shown.length ? shown.map(t => {
            const completed = !!t.claimed, ready = !!t.available;
            const caption = (t.xp > 0 ? '+' + t.xp + ' XP' : '') + (t.gm > 0 ? ' · +' + t.gm + ' GM' : '');
            const action = async () => { const result = await gameAction('/api/tasks/claim', { id: t.id }); if (result)
                await refreshLive(); };
            return e('div', { className: 'gm-task-item gm-premium-card', key: t.id }, e('span', { className: 'gm-task-icon' }, icon(t.icon || 'tasks', 29, true)), e('div', { className: 'gm-task-details' }, e('b', null, t.title || 'Задание'), e('small', null, t.description || 'Подтверди выполнение условия'), e('strong', null, caption || 'Достижение')), e('button', { type: 'button', disabled: demo || completed || !ready, onClick: action,
                className: completed ? 'done' : ready ? 'ready' : '' }, completed ? icon('check', 18) : ready ? 'Забрать' : icon('clock', 18)));
        }) : e('div', { className: 'gm-task-empty gm-premium-card' }, icon('tasks', 44, true), e('b', null, 'Задания готовятся'), e('small', null, 'Проверь список после подключения Telegram.'));
        return e(React.Fragment, null, top(L('tasks'), true, 'info'), e('div', { className: 'gm-task-header gm-premium-card' }, icon('tasks', 44, true), e('div', null, e('b', null, 'Выполняй цели'), e('small', null, 'Игровые задания с проверяемыми условиями. Награды начисляет только сервер.'))), e('div', { className: 'gm-task-filters' }, tabs.map(([value, label]) => e('button', { type: 'button', key: value,
            className: taskFilter === value ? 'active' : '', onClick: () => setTaskFilter(value) }, label))), e('div', { className: 'gm-task-list' }, rows), e('p', { className: 'gm-task-note' }, 'Задания за подписки появятся после настройки безопасной проверки членства через Telegram. Сейчас доступны только проверяемые игровые действия.'));
    }
    function Leaderboard() {
        const data = holderRanks;
        const podium = data?.podium || [];
        const entrants = data?.users || [];
        const verified = data?.enabled === true;
        const statusMessage = !data ? walletLanguage('Verificando dados…', 'Перевіряємо дані…', 'Checking verified holders…', 'Проверяем подтверждённых держателей…') :
            !verified ? walletLanguage('Aguardando contrato oficial do GM Jetton. Nenhum saldo fictício é exibido.', 'Очікуємо офіційний контракт GM Jetton. Вигадані баланси не показуються.', 'Waiting for the official GM Jetton contract. No fictional balances are displayed.', 'Ожидаем официальный контракт GM Jetton. Вымышленные балансы и участники не отображаются.') :
                !data.participants ? walletLanguage('Ainda não há detentores com saldo e carteira verificados.', 'Наразі немає власників із перевіреними гаманцями та балансами.', 'No opted-in players have a fresh verified wallet balance yet.', 'Пока нет игроков с подтверждёнными кошельками и свежим проверенным балансом.') : null;
        const slots = [3, 1, 2];
        return React.createElement(React.Fragment, null,
            top(L('holdings'), true, 'trophy'),
            React.createElement("section", { className: "gm-holders-header gm-premium-card" },
                React.createElement("div", { className: "gm-holders-header-label" },
                    icon('shield-check', 20, true),
                    " ",
                    React.createElement("span", null, "TON MAINNET \u00B7 VERIFIED HOLDERS")),
                React.createElement("h2", null, walletLanguage('Ranking de detentores GM', 'Рейтинг власників GM', 'GM holders ranking', 'Рейтинг держателей GM')),
                React.createElement("p", null, walletLanguage('Somente GM verificado na blockchain entra no ranking. GM do jogo não conta.', 'Враховуються лише перевірені GM у блокчейні. Ігрові GM не враховуються.', 'Only independently verified on-chain GM counts. In-game GM is excluded.', 'Учитываются только GM, проверенные в блокчейне. Игровые GM не влияют на рейтинг.')),
                React.createElement("div", { className: "gm-holders-stats" },
                    React.createElement("div", null,
                        React.createElement("small", null, walletLanguage('Participantes', 'Учасники', 'Participants', 'Участников')),
                        React.createElement("strong", null, verified ? data.participants : '—')),
                    React.createElement("div", null,
                        React.createElement("small", null, walletLanguage('Rede', 'Мережа', 'Network', 'Сеть')),
                        React.createElement("strong", null, "TON")),
                    React.createElement("div", null,
                        React.createElement("small", null, walletLanguage('Verificação', 'Перевірка', 'Verification', 'Проверка')),
                        React.createElement("strong", null, verified ? 'ON-CHAIN' : '—')))),
            React.createElement("section", { className: "gm-holder-podium-wrap gm-premium-card" },
                React.createElement("div", { className: "gm-holder-section-title" },
                    icon('crown', 21),
                    " ",
                    React.createElement("b", null, "TOP 3 \u00B7 GM TOKEN")),
                React.createElement("div", { className: "gm-holder-podium", "aria-label": "Verified Top 3" }, slots.map(place => {
                    const person = podium.find((p) => p.rank === place);
                    return React.createElement("div", { className: 'gm-holder-podium-slot gm-holder-place-' + place + (person ? ' is-filled' : ' is-empty'), key: place },
                        React.createElement("div", { className: "gm-holder-podium-crown" }, icon(place === 1 ? 'crown' : 'shield-check', place === 1 ? 32 : 25, true)),
                        React.createElement("div", { className: "gm-holder-podium-avatar" }, person ? React.createElement(PlayerAvatar, { name: person.username, size: place === 1 ? 'large' : 'medium', rank: place, photoUrl: data?.my_rank === place ? (webapp?.initDataUnsafe?.user?.photo_url || '') : '' }) : React.createElement(PlayerAvatar, { name: "GM", size: place === 1 ? 'large' : 'medium', rank: place })),
                        React.createElement("div", { className: "gm-holder-podium-alias", title: person?.username || '' }, person ? person.username : '—'),
                        React.createElement("div", { className: "gm-holder-podium-amount" }, person ? person.gm + ' GM' : '—'),
                        React.createElement("div", { className: "gm-holder-podium-pillar" },
                            React.createElement("b", null, place),
                            React.createElement("span", null, place === 1 ? 'CHAMPION' : place === 2 ? 'SILVER' : 'BRONZE')));
                })),
                statusMessage ? React.createElement("p", { className: "gm-holder-pending" },
                    icon('info', 18),
                    " ",
                    statusMessage) : null),
            React.createElement("section", { className: "gm-holders-list gm-premium-card" },
                React.createElement("div", { className: "gm-holder-list-head" },
                    React.createElement("div", null,
                        React.createElement("small", null, "GM TOKEN"),
                        React.createElement("h3", null, walletLanguage('Todos os participantes', 'Усі учасники', 'All participants', 'Все участники'))),
                    React.createElement("button", { type: "button", className: "gm-holder-refresh", disabled: holderLoading, onClick: () => void fetchHolders(), "aria-label": L('refresh') }, icon('refresh', 19))),
                React.createElement("button", { type: "button", className: "gm-holder-my-position", onClick: () => setHolderShowPosition(!holderShowPosition) },
                    icon('search', 18),
                    React.createElement("span", null, walletLanguage('Minha posição', 'Моє місце', 'My position', 'Моё место')),
                    React.createElement("strong", null, data?.my_rank ? '#' + data.my_rank : '—'),
                    icon(holderShowPosition ? 'chevron-up' : 'chevron-down', 16)),
                holderShowPosition ? React.createElement("div", { className: "gm-holder-me-note" }, data?.my_rank ? walletLanguage('Sua posição foi calculada usando GM confirmado on-chain.', 'Твоє місце визначене за підтвердженим балансом GM.', 'Your rank uses a recent verified on-chain GM balance.', 'Твоё место рассчитано по свежему подтверждённому балансу GM.') :
                    walletLanguage('Conecte e verifique sua carteira, permita aparecer no ranking e atualize o saldo.', 'Підтвердь гаманець, дозволь участь у рейтингу та онови баланс.', 'Verify your wallet, opt in and refresh your GM balance to participate.', 'Подтверди кошелёк, разреши участие и обнови баланс GM, чтобы попасть в рейтинг.')) : null,
                React.createElement("div", { className: "gm-holder-rows" }, entrants.filter((u) => u.rank >= 4).map((u) => React.createElement("div", { className: "gm-holder-row", key: u.rank },
                    React.createElement("div", { className: "gm-holder-row-rank" }, u.rank),
                    React.createElement("div", { className: "gm-holder-row-avatar" },
                        React.createElement(PlayerAvatar, { name: u.username, size: "small", photoUrl: data?.my_rank === u.rank ? (webapp?.initDataUnsafe?.user?.photo_url || '') : '' })),
                    React.createElement("div", { className: "gm-holder-row-user" },
                        React.createElement("b", null, u.username),
                        React.createElement("small", null, walletLanguage('Saldo verificado', 'Баланс перевірено', 'Verified holdings', 'Баланс проверен'))),
                    React.createElement("strong", null,
                        u.gm,
                        " ",
                        React.createElement("small", null, "GM"))))),
                verified && data?.participants > 0 && data?.participants <= 3 ? React.createElement("p", { className: "gm-holder-list-note" }, walletLanguage('Todos os participantes estão no pódio.', 'Усі учасники на п’єдесталі.', 'All current participants are on the podium.', 'Все участники сейчас на пьедестале.')) : null,
                verified && data?.has_more ? React.createElement("button", { type: "button", className: "gm-holders-load-more", disabled: holderMoreBusy, onClick: () => void fetchHolders(data.next_offset || 30, true) },
                    holderMoreBusy ? '…' : walletLanguage('Carregar mais', 'Завантажити ще', 'Load more', 'Показать ещё'),
                    icon('chevron-down', 18)) : null,
                !verified ? React.createElement("div", { className: "gm-holder-privacy-foot" },
                    icon('shield-check', 18),
                    " ",
                    walletLanguage('Nenhum saldo não verificado é publicado.', 'Непідтверджені баланси не публікуються.', 'Unverified amounts are never published.', 'Неподтверждённые суммы не публикуются.')) : null),
            React.createElement("button", { type: "button", className: "gm-holders-wallet-link", onClick: () => goto('wallet') },
                icon('wallet', 23),
                walletLanguage('Verificar carteira', 'Перевірити гаманець', 'Verify my wallet', 'Проверить мой кошелёк'),
                icon('chevron-right', 19)));
    }
    function Profile() {
        const e = React.createElement;
        const cosmetics = liveState?.cosmetics || { founder_slot: null, frames: [] };
        const frames = [{ id: 'standard', title: 'GM Classic', claimed: true }, ...(cosmetics.frames || []).filter(f => !f.type || f.type === 'frame')];
        const boxCollectibles = (cosmetics.frames || []).filter(f => f.category === 'box' && f.type && f.type !== 'frame');
        const chosen = frames.find((f) => f.id === selectedFrame && f.claimed) ? selectedFrame : 'standard';
        const league = liveState?.league || { name: 'Bronze', min_xp: 0 };
        const leagues = liveState?.leagues || [];
        const nextLeague = leagues.find((x) => wallet.xp < x.min_xp);
        const previousXp = Number(league.min_xp) || 0;
        const nextXp = nextLeague?.min_xp ?? previousXp;
        const progress = nextLeague ? Math.min(100, Math.max(0, (wallet.xp - previousXp) / Math.max(1, nextXp - previousXp) * 100)) : 100;
        const user = webapp?.initDataUnsafe?.user;
        return e(React.Fragment, null, top(L('profile'), false, 'settings'), e('div', { className: 'profile-hero gm-profile-v2' }, e('div', { className: 'gm-profile-avatar ' + (chosen === 'standard' ? '' : 'gm-profile-avatar-special') }, e(PlayerAvatar, { name: user?.username || user?.first_name || 'GM PLAYER', photoUrl: user?.photo_url || '', size: 'large' })), e('h2', null, user?.username || user?.first_name || 'GM PLAYER'), e('p', null, '#' + String(user?.id || '')), cosmetics.founder_slot ? e('span', { className: 'gm-founders-medal' }, icon('crown', 18), ' FOUNDERS #' + cosmetics.founder_slot) : null), e('div', { className: 'gm-league-card gm-premium-card' }, e('div', { className: 'gm-league-head' }, e('div', null, e('small', null, 'GM LEAGUE'), e('h3', null, league.name)), e('b', null, nf(wallet.xp, 0) + ' XP')), e('div', { className: 'gm-upgrades-progress' }, e('span', { style: { width: progress + '%' } })), e('small', null, nextLeague ? '→ ' + nextLeague.name + ' · ' + nf(Math.max(0, nextXp - wallet.xp), 0) + ' XP' : 'GM IMMORTAL · MAX')), e('div', { className: 'stats-grid' }, [['friends', String(liveReferrals?.referred?.length || 0), L('friends')], ['wallet', nf(wallet.gm, 0), L('balance')], ['lightning', String(wallet.streak), L('streak')]].map(([i, n, label]) => e('div', { className: 'stat-card', key: label }, icon(i, 23), e('b', null, n), e('small', null, label)))), e('section', { className: 'gm-frames-section gm-premium-card' }, e('h3', null, L('frames')), e('p', null, L('achievementsLocked')), e('div', { className: 'gm-frame-preview-detail' }, e('div', { className: 'gm-frame-preview-showcase' }, e('span', { className: 'gm-frame-art gm-frame-art-big ' + (framePreview === 'standard' ? 'gm-frame-standard' : framePreview.startsWith('founder') ? 'gm-frame-founder' : 'gm-frame-milestone'),
            style: { '--frame-hue': String(String(framePreview).split('').reduce((n, c) => n + c.charCodeAt(0), 0) % 360) + 'deg' } }, e('span', { className: 'gm-frame-inner' }, e(PlayerAvatar, { name: user?.username || user?.first_name || 'GM PLAYER', photoUrl: user?.photo_url || '', size: 'large' })))), e('div', { className: 'gm-frame-preview-copy' }, e('b', null, frames.find((f) => f.id === framePreview)?.title || 'GM Classic'), e('small', null, frames.find((f) => f.id === framePreview)?.claimed ? 'Рамка открыта · можно использовать' : 'Рамка пока закрыта · предпросмотр'), e('button', { type: 'button', disabled: !frames.find((f) => f.id === framePreview)?.claimed,
            onClick: () => { setSelectedFrame(framePreview); store.setItem('gm_profile_frame', framePreview); } }, framePreview === chosen ? 'Используется' : 'Применить рамку'))), e('div', { className: 'gm-frame-grid' }, frames.map((f) => e('button', { key: f.id, type: 'button',
            className: 'gm-frame-card ' + (f.claimed ? 'unlocked' : 'locked') + (framePreview === f.id ? ' active' : ''),
            'aria-pressed': framePreview === f.id,
            onClick: () => setFramePreview(f.id) }, e('span', { className: 'gm-frame-art gm-frame-thumb ' + (f.category === 'founder' ? 'gm-frame-founder' : f.category === 'milestone' ? 'gm-frame-milestone' : f.category === 'box' ? 'gm-frame-box' : 'gm-frame-standard'),
            style: { '--frame-hue': String(String(f.id).split('').reduce((n, c) => n + c.charCodeAt(0), 0) % 360) + 'deg' } }, e('span', { className: 'gm-frame-inner' }, e(PlayerAvatar, { name: user?.username || 'GM', size: 'small' }))), e('span', null, f.title), f.claimed ? icon('check', 16) : icon('minus', 16))))), boxCollectibles.length ? e('section', { className: 'gm-profile-collection gm-premium-card' },
            e('h3', null, 'Коллекция сундуков'),
            e('p', null, 'Значки, фоны, титулы и медали за открытия сундуков.'),
            e('div', { className: 'gm-profile-collection-grid' }, boxCollectibles.map(f => e('div', {
                key: f.id, className: 'gm-profile-collection-item ' + (f.claimed ? 'unlocked' : 'locked')
            }, icon(f.type === 'badge' ? 'award' : f.type === 'background' ? 'image' : f.type === 'title' ? 'type' : 'medal', 21),
                e('span', null, e('b', null, f.title), e('small', null, ({ badge: 'Значок', background: 'Фон', title: 'Титул', medal: 'Медаль' })[f.type] || 'Награда')),
                e('strong', null, f.claimed ? 'Получено' : 'Закрыто'))))) : null, e('div', { className: 'profile-menu' }, [['trophy', L('achievements'), 'achievements'], ['friends', L('referrals'), 'referrals'], ['clock', L('history'), 'history'], ['wallet', L('wallet'), 'wallet'], ['settings', L('customize'), 'settings'], ['info', L('support'), 'support']].map(([i, t, route]) => e('button', { key: route, onClick: () => goto(route) }, icon(i, 21), e('span', null, t), icon('chevron-right', 18)))), e('button', { type: 'button', className: 'gm-settings-onboard gm-premium-card', onClick: () => openGuide('profile') }, icon('info', 22), L('startTour'), icon('chevron-right', 18)));
    }
    function Reward() {
        const e = React.createElement;
        const daily = liveState?.daily || {};
        const enabled = !!liveState?.config?.daily_enabled;
        const claimed = Boolean(daily.claimed_today ?? (wallet.lastClaim === todayUTC()));
        const streak = Math.max(0, Number(daily.streak ?? wallet.streak) || 0);
        const best = Math.max(streak, Number(daily.best_streak || 0));
        const nextStreak = Math.max(1, Number(daily.next_streak || streak + 1));
        const reward = Number(daily.next_reward_gm ?? liveState?.config?.daily_reward_gm ?? 0);
        const flameTier = streak >= 30 ? 5 : streak >= 20 ? 4 : streak >= 10 ? 3 : streak >= 5 ? 2 : 1;
        const milestones = [5, 10, 15, 20, 25, 30];
        const milestoneRewards = daily.milestone_rewards || {};
        const nextMilestone = milestones.find(n => n > Math.min(streak % 30 || (streak === 0 ? 0 : 30), 30)) || 5;
        const milestoneActive = !!daily.milestone_enabled;
        return e('div', { className: 'gm-daily-v8 gm-daily-v9' }, e('button', { type: 'button', className: 'gm-daily-close', onClick: goBack, 'aria-label': 'Назад' }, icon('chevron-left', 23)), e(AutumnCalendar, {api}), e('div', { className: 'gm-daily-intro' }, e('div', { className: 'gm-streak-flame gm-flame-' + flameTier, role: 'img', 'aria-label': 'Огонь серии ' + streak + ' дней' }, e('svg', { viewBox: '0 0 120 150', focusable: 'false', 'aria-hidden': 'true' }, e('defs', null, e('linearGradient', { id: 'gm-flame-outer', x1: '0', x2: '1', y1: '1', y2: '0' }, e('stop', { offset: '0%', stopColor: '#526682' }), e('stop', { offset: '60%', stopColor: '#a9c7f5' }), e('stop', { offset: '100%', stopColor: '#f7faff' })), e('linearGradient', { id: 'gm-flame-inner', x1: '0', x2: '1', y1: '1', y2: '0' }, e('stop', { offset: '0%', stopColor: '#d5e5ff' }), e('stop', { offset: '100%', stopColor: '#ffffff' }))), e('path', { d: 'M63 6 C74 34 94 48 93 73 C102 65 107 55 108 48 C124 89 108 128 80 140 C40 156 7 128 12 91 C16 67 33 49 39 25 C46 46 44 66 50 72 C69 55 71 31 63 6 Z', fill: 'url(#gm-flame-outer)' }), e('path', { d: 'M65 66 C82 90 92 98 86 119 C82 135 70 142 58 140 C34 135 29 115 38 100 C42 93 54 86 54 78 C58 87 63 89 65 66 Z', fill: 'url(#gm-flame-inner)' })), e('span', { className: 'gm-streak-fire-count' }, streak + ' дн.')), e('span', null, 'DAILY STREAK'), e('h1', null, 'Ежедневная серия'), e('p', null, claimed ? 'Награда за сегодня получена. Продолжай серию завтра!' : 'Забирай награду каждый день и развивай свой огонёк.')), e('div', { className: 'gm-daily-amount gm-premium-card' }, e('small', null, claimed ? 'СЛЕДУЮЩАЯ НАГРАДА' : 'НАГРАДА ЗА СЕГОДНЯ'), e('strong', null, (reward > 0 ? nf(reward, 0) : '—') + ' GM'), e('span', null, 'Сейчас: ' + streak + ' дней · Рекорд: ' + best + ' дней')), e('section', { className: 'gm-daily-milestones gm-premium-card' }, e('b', null, 'Путь огонька · 30 дней'), e('p', null, milestoneActive ? 'Юбилейные награды каждые 5 дней. После 30-го цикл наград начинается снова.' : 'Серия сохраняется на сервере. Юбилейные GM-награды проходят проверку тестовой экономики.'), e('div', { className: 'gm-daily-milestones-grid' }, milestones.map(n => e('div', { key: n, className: 'gm-daily-milestone' + ((streak > 0 && n <= (streak - 1) % 30 + 1) ? ' done' : '') + (nextMilestone === n ? ' next' : '') }, e('span', null, 'ДЕНЬ ' + n), e('b', null, milestoneActive ? nf(Number(milestoneRewards[n] || 0), 0) + ' GM' : '✦'), e('small', null, milestoneActive ? 'Награда' : 'Цель')))), e('div', { className: 'gm-daily-cycle-summary' }, 'Следующее получение — день ' + nextStreak + ' серии')), e('button', { type: 'button', className: 'gm-daily-action', disabled: demo || !enabled || claimed, onClick: todayClaim }, icon(claimed ? 'check' : 'flame', 23), claimed ? 'Награда получена' : enabled ? 'Получить ' + nf(reward, 0) + ' GM' : 'Награды не включены'), e('button', { type: 'button', className: 'gm-daily-secondary', onClick: () => goto('mining') }, icon('lightning', 21), 'Перейти в Майнинг', icon('chevron-right', 17)), e('p', { className: 'gm-daily-foot' }, 'Серии и начисления проверяются сервером по UTC. Повторная награда в один день невозможна.'));
    }
    function Splash() {
        return React.createElement("div", { className: "splash-view gm-splash-v4", role: "status", "aria-live": "polite" },
            React.createElement("div", { className: "gm-splash-v4-stack" },
                React.createElement("div", { className: "gm-splash-v4-eyebrow" },
                    "GM ",
                    React.createElement("span", { "aria-hidden": "true" }, "\u2726"),
                    " TOKEN"),
                React.createElement("div", { className: "gm-splash-v4-orbit", "aria-hidden": "true" },
                    React.createElement("div", { className: "gm-splash-v4-coin" },
                        React.createElement("div", { className: "gm-splash-v4-coin-inner" },
                            React.createElement("img", { src: BRAND + 'gm-lettermark-metallic-transparent.png', alt: "" })))),
                React.createElement("div", { className: "gm-splash-v4-wordmark" },
                    React.createElement("h1", null, "GM TOKEN"),
                    React.createElement("p", null, "\u0422\u0412\u041E\u042F \u0418\u0413\u0420\u041E\u0412\u0410\u042F \u042D\u041A\u041E\u0421\u0418\u0421\u0422\u0415\u041C\u0410")),
                React.createElement("div", { className: "gm-splash-v4-status" },
                    React.createElement("div", { className: "gm-splash-v4-track", "aria-hidden": "true" },
                        React.createElement("span", null)),
                    React.createElement("small", null, L('loading'))),
                React.createElement("div", { className: "gm-splash-v4-tagline" },
                    "MINING ",
                    React.createElement("span", null, "\u00B7"),
                    " MARKET ",
                    React.createElement("span", null, "\u00B7"),
                    " REWARDS")));
    }
    function Mining() {
        const e = React.createElement;
        const rate = liveState?.mining?.rate_cents_day != null ? liveState.mining.rate_cents_day / 100 : gmRate(wallet);
        const upgrade = upgradeData?.upgrade || liveState?.mining?.upgrade || { level: 1, max_level: 200, bonus_pct: 0, next_level: 2, next_cost_gm: 150, next_bonus_pct: 0.10 };
        const bonusValue = Math.max(0, Number(upgrade.bonus_pct) || 0);
        const baseRate = rate / (1 + bonusValue / 100);
        const projectedRate = (bonus) => baseRate * (1 + Math.max(0, bonus) / 100);
        const upgradeList = upgradeData?.levels || Array.from({ length: 200 }, (_, i) => { const level = i + 1; return { level, cost_gm: level === 1 ? 0 : level === 2 ? 150 : Math.round(200 * Math.pow(1.04, level - 3) / 10) * 10, bonus_pct: level === 1 ? 0 : (10 + 2 * (level - 2)) / 100 }; });
        const visibleUpgrades = showAllUpgrades ? upgradeList : upgradeList.filter((row) => row.level >= Math.max(1, upgrade.level - 1) && row.level <= Math.min(200, upgrade.level + 5));
        const stored = wallet.storage;
        const hours = storageHours(wallet.level);
        const cap = Math.max(1, rate * hours / 24);
        const pct = Math.max(0, Math.min(100, stored / cap * 100));
        const mineClick = () => {
            if (demo)
                return flash('Войди через Telegram для добычи GM');
            if (stored < 1)
                return flash('Монета активна: GM добываются автоматически. Сбор доступен от 1 GM.');
            miningClaim();
        };
        return e('div', { className: 'gm-mining-v8' }, top(L('mining'), true, 'info'), e('div', { className: 'gm-mining-title' }, e('span', null, 'Добывай GM'), e('small', null, 'Майнинг ' + upgrade.level + '/200 · ' + nf(rate, 0) + ' GM / сутки')), e('button', { type: 'button', className: 'gm-mining-coin-wrap', onClick: mineClick, 'aria-label': 'Собрать накопленные GM' }, e('span', { className: 'gm-mining-coin-rim' }, e('span', { className: 'gm-mining-coin-face' }, e(Brand, { theme, size: 198 })), e('span', { className: 'gm-mining-metal-inscription' }, 'GM')), e('span', { className: 'gm-mining-coin-outer-ring' }), e('span', { className: 'gm-mining-coin-glint' })), e('div', { className: 'gm-mining-total' }, icon('lightning', 28), e('strong', null, nf(stored)), e('span', null, 'GM накоплено')), e('div', { className: 'gm-mining-speed-cards gm-premium-card' }, e('div', null, e('small', null, 'ЗА ЧАС'), e('strong', null, nf(rate / 24, 3) + ' GM')), e('div', null, e('small', null, 'ЗА СУТКИ'), e('strong', null, nf(rate, 2) + ' GM'))), e('p', { className: 'gm-mining-tap-guide' }, 'Нажми на монету, чтобы забрать накопленные GM (от 1 GM). Добыча идёт автоматически.'), e('div', { className: 'gm-mining-energy gm-premium-card' }, e('div', { className: 'gm-mining-energy-head' }, e('b', null, 'Хранилище'), e('span', null, nf(stored) + ' / ' + nf(cap) + ' GM')), e('div', { className: 'gm-mining-energy-track' }, e('span', { style: { width: pct + '%' } })), e('div', { className: 'gm-mining-energy-foot' }, e('small', null, 'Вместимость: ' + hours + ' ч'), e('small', null, nf(rate / 24, 2) + ' GM/час'))), e('button', { type: 'button', className: 'gm-mining-claim', disabled: demo || stored < 1, onClick: miningClaim }, icon('diamond', 23), e('span', null, 'Забрать GM'), icon('chevron-right', 19)), e('section', { className: 'gm-mining-benefits gm-premium-card' }, e('b', null, 'Уровень и ускорения'), e('div', null, e('span', null, icon('lightning', 21), ' Мощность'), e('strong', null, '+' + powerBonus(wallet.level) + '%')), e('div', null, e('span', null, icon('clock', 21), ' Хранилище'), e('strong', null, hours + ' часов')), e('div', null, e('span', null, icon('database', 21), ' Резерв'), e('strong', null, '45 млн GM'))), e('section', { className: 'gm-mining-upgrades gm-premium-card' }, e('div', { className: 'gm-upgrades-head' }, e('div', null, e('small', null, 'MINING UPGRADES'), e('h3', null, L('miningUpgrades'))), icon('lightning', 28)), e('div', { className: 'gm-upgrades-summary' }, e('div', null, e('small', null, L('level')), e('strong', null, upgrade.level + ' / 200')), e('div', null, e('small', null, L('speed')), e('strong', null, '+' + nf(Number(upgrade.bonus_pct), 2) + '%'))), e('div', { className: 'gm-upgrades-progress' }, e('span', { style: { width: upgrade.level / 200 * 100 + '%' } })), upgrade.next_level ?
            e('div', { className: 'gm-upgrade-next' }, e('span', null, L('nextLevel') + ' ' + upgrade.next_level), e('strong', null, nf(upgrade.next_cost_gm, 0) + ' GM · +' + nf(Number(upgrade.next_bonus_pct), 2) + '%'), e('div', { className: 'gm-upgrade-rate-preview' }, e('small', null, 'При новом уровне (расчётно):'), e('b', null, nf(projectedRate(Number(upgrade.next_bonus_pct)) / 24, 3) + ' GM/ч'), e('b', null, nf(projectedRate(Number(upgrade.next_bonus_pct)), 2) + ' GM/сутки')), e('button', { type: 'button', className: 'gm-upgrades-purchase', disabled: demo || upgradeBusy || (!upgrade.purchasable && upgrade.purchasable !== undefined) || (upgrade.purchasable && wallet.gm < upgrade.next_cost_gm) || !upgradeData?.upgrade, onClick: buyMiningUpgrade }, upgradeBusy ? 'Проверяем покупку…' : !upgrade.purchasable ? 'Привязка GM к кошельку ещё не настроена' : wallet.gm < upgrade.next_cost_gm ? L('insufficient') : L('upgrade'), icon('chevron-right', 17)))
            : e('div', { className: 'gm-upgrades-max' }, icon('crown', 21), 'Максимальный уровень открыт'), e('div', { className: 'gm-upgrade-preview' }, ...visibleUpgrades.map((row) => e('div', { key: row.level, className: 'gm-upgrade-row ' + (row.level <= upgrade.level ? 'gm-upgrade-unlocked' : row.level === upgrade.next_level ? 'gm-upgrade-available' : 'gm-upgrade-locked') }, e('span', { className: 'gm-upgrade-number' }, row.level), e('span', { className: 'gm-upgrade-row-copy' }, e('b', null, row.level === 200 ? 'GM Immortal' : 'Уровень ' + row.level), e('small', null, row.level === 1 ? 'Начальный' : nf(row.cost_gm, 0) + ' GM')), e('strong', null, '+' + nf(Number(row.bonus_pct), 2) + '%'), e('span', { className: 'gm-upgrade-row-rate' }, e('small', null, nf(projectedRate(Number(row.bonus_pct)) / 24, 3) + ' GM/ч'), e('small', null, nf(projectedRate(Number(row.bonus_pct)), 2) + ' GM/сутки')), row.level <= upgrade.level ? icon('check', 17) : icon('minus', 17)))), e('button', { type: 'button', className: 'gm-upgrades-toggle', onClick: () => setShowAllUpgrades(!showAllUpgrades) }, showAllUpgrades ? L('collapse') : L('allLevels'), icon(showAllUpgrades ? 'chevron-up' : 'chevron-down', 16))), e('p', { className: 'gm-mining-footnote' }, 'Скорости в списке расчётные, без учёта ограничений Mining Pool. Улучшения за реальные GM на внешнем кошельке пока отключены до проверки официального контракта. Игровые GM не списываются.'));
    }
    function WalletConnection() {
        const e = React.createElement;
        const verified = holderStatus?.wallet_verified === true;
        const walletAddress = holderStatus?.wallet_address || tonAccount;
        const display = walletAddress ? (walletAddress.length > 26 ? walletAddress.slice(0, 13) + '…' + walletAddress.slice(-8) : walletAddress) : '—';
        const loc = walletLanguage;
        return e('div', { className: 'gm-wallet-screen' }, top(L('wallet'), true, 'shield-check'), e('div', { className: 'gm-wallet-hero gm-premium-card' }, e('div', { className: 'gm-wallet-hero-icon' }, icon('wallet', 72, true)), e('small', null, 'TON CONNECT · READ ONLY'), e('h2', null, L('wallet')), e('p', null, loc('Prove que você controla sua carteira TON. O app nunca pede transferências ou frases-semente.', 'Підтвердь право на TON-гаманець. Застосунок не просить переказів або seed-фраз.', 'Prove that you control your TON wallet. No funds, transfers or recovery phrases are requested.', 'Подтверди, что TON-кошелёк принадлежит тебе. Переводы монет и сид-фразы не запрашиваются.')), e('div', { className: 'gm-wallet-proof-status ' + (verified ? 'verified' : 'unverified') }, icon(verified ? 'shield-check' : 'clock', 18), verified ? loc('Propriedade verificada', 'Власність підтверджено', 'Wallet ownership verified', 'Владение кошельком подтверждено') :
            loc('Assinatura ainda não verificada', 'Підпис ще не перевірено', 'Wallet signature not verified', 'Подпись кошелька не проверена')), e('div', { className: 'gm-wallet-address' }, e('small', null, loc('Endereço da carteira', 'Адреса гаманця', 'Wallet address', 'Адрес кошелька')), e('strong', null, display)), e('button', { type: 'button', className: 'gm-wallet-connect', onClick: tonAccount || verified ? disconnectTonWallet : connectTonWallet }, icon(tonAccount || verified ? 'close' : 'link', 22), tonAccount || verified ? loc('Desconectar carteira', 'Від’єднати гаманець', 'Disconnect wallet', 'Отключить кошелёк') :
            loc('Conectar e verificar TON', 'Підключити й перевірити TON', 'Connect & verify TON', 'Подключить и проверить TON'))), tonError ? e('div', { className: 'gm-wallet-error', role: 'status' }, tonError) : null, e('section', { className: 'gm-wallet-holders gm-premium-card' }, e('div', { className: 'gm-wallet-holders-title' }, icon('trophy', 27, true), e('span', null, e('b', null, L('holdings')), e('small', null, 'TON MAINNET · GM JETTON'))), e('p', null, holderStatus?.configured ?
            loc('Somente GM verificados na blockchain contam para o ranking.', 'Рейтинг враховує лише перевірені GM у блокчейні.', 'Only independently verified on-chain GM counts in the holders ranking.', 'В рейтинге учитываются только подтверждённые сервером GM в блокчейне.') :
            loc('Aguardando o endereço oficial do contrato GM Jetton. Nenhum saldo será inventado.', 'Очікуємо офіційну адресу контракту GM Jetton. Баланси не вигадуємо.', 'Official GM Jetton contract is pending. No balances are fabricated.', 'Ожидаем официальный контракт GM Jetton. Балансы не будут выдуманы.')), e('button', { type: 'button', className: 'gm-wallet-consent ' + (holderStatus?.opt_in ? 'opted-in' : ''),
            disabled: !verified || holderConsentBusy, onClick: () => void setHolderOptIn(!holderStatus?.opt_in) }, icon(holderStatus?.opt_in ? 'check' : 'shield-check', 21), loc(holderStatus?.opt_in ? 'Estou no ranking' : 'Participar do ranking', holderStatus?.opt_in ? 'Беру участь у рейтингу' : 'Участь у рейтингу', holderStatus?.opt_in ? 'Visible in leaderboard' : 'Join leaderboard', holderStatus?.opt_in ? 'Показываюсь в рейтинге' : 'Участвовать в рейтинге'), e('span', { className: 'gm-wallet-consent-state' }, holderStatus?.opt_in ? 'ON' : 'OFF')), e('p', { className: 'gm-wallet-consent-note' }, loc('Seu endereço permanece privado no ranking. Você pode sair a qualquer momento.', 'Твоя адреса у рейтингу прихована. Можна вийти будь-коли.', 'Your wallet address remains private. You can leave the public ranking at any time.', 'Адрес кошелька публично не показывается. Из рейтинга можно выйти в любой момент.')), e('button', { type: 'button', className: 'gm-wallet-verify-balance', disabled: !verified || !holderStatus?.configured || holderLoading,
            onClick: () => void refreshHolderBalance() }, icon('refresh', 18), loc('Verificar saldo GM', 'Перевірити баланс GM', 'Verify GM balance', 'Проверить баланс GM')), e('button', { type: 'button', className: 'gm-wallet-to-ranks', onClick: () => goto('leaderboard') }, icon('trophy', 18), L('holdings'), icon('chevron-right', 18))), wallet.vault > 0 ? e('button', { type: 'button', className: 'gm-wallet-legacy', onClick: () => goto('vault') }, icon('database', 20), loc('Saldo legado do jogo: ', 'Старий ігровий баланс: ', 'Legacy in-game Vault: ', 'Старый игровой Vault: ') + nf(wallet.vault) + ' GM', icon('chevron-right', 18)) : null, e('p', { className: 'gm-mining-footnote' }, loc('Nunca compartilhe sua frase-semente ou chave privada.', 'Ніколи не повідомляй seed-фразу чи приватний ключ.', 'Never share a seed phrase or private key.', 'Никогда не передавай сид-фразу или приватный ключ.')));
    }
    function Vault() {
        const e = React.createElement;
        return e(React.Fragment, null, top('Holding (Vault)', true, 'database'), e('div', { className: 'vault-hero pearl-card' }, e('div', { className: 'vault-orb' }, icon('database', 100, true)), e('small', null, 'GM в Holding'), e('h1', null, nf(wallet.vault), ' GM'), e('p', null, 'Награда зависит от утверждённых правил и остатка фонда')), e('div', { className: 'vault-stats' }, e('div', { className: 'pearl-card' }, e('small', null, 'Mining Boost'), e('b', null, '+', holdingBonus(wallet.vault), '%')), e('div', { className: 'pearl-card' }, e('small', null, 'Комиссия вывода'), e('b', null, '5% GM'))), e('div', { className: 'form-surface pearl-card vault-form' }, e('label', { htmlFor: 'vault-amount' }, 'Сумма для операции, GM'), e('input', { id: 'vault-amount', inputMode: 'decimal', placeholder: '0.00', value: vaultAmount, onChange: event => setVaultAmount(event.target.value) }), e('div', { className: 'vault-available' }, e('span', null, 'Доступно в кошельке: ', nf(wallet.gm), ' GM'), e('span', null, 'В Holding: ', nf(wallet.vault), ' GM')), e('div', { className: 'twin-buttons vault-actions' }, e('button', { type: 'button', className: 'vault-action vault-deposit', onClick: depositVault }, icon('deposit', 24), e('span', null, 'Пополнить')), e('button', { type: 'button', className: 'vault-action vault-withdraw', onClick: withdrawVault }, icon('withdraw', 24), e('span', null, 'Вывести')))), e('p', { className: 'disclaimer' }, 'Вывод — один раз в UTC-сутки, комиссия 5%. Награды зависят от состояния фонда и включённых правил. Это виртуальная игровая валюта.'), e('div', { className: 'vault-pending pearl-card' }, e('div', { className: 'split-line' }, e('span', null, 'Награды к получению'), e('b', null, nf((liveState?.holding?.pending_cents || 0) / 100), ' GM')), e(GButton, { theme, disabled: !(liveState?.holding?.pending_cents), onClick: () => gameAction('/api/vault/claim'), icon: 'gift' }, 'Claim Rewards')));
    }
    function Shop() { return React.createElement(React.Fragment, null,
        top('GM Shop', true, 'swap'),
        React.createElement("div", { className: "shop-banner pearl-card" },
            icon('swap', 54, true),
            React.createElement("div", null,
                React.createElement("h2", null, "GM \u2192 CR"),
                React.createElement("p", null, "\u0412\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u043E\u0431\u043C\u0435\u043D, \u0431\u0435\u0437 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0445 \u0434\u0435\u043D\u0435\u0433"))),
        React.createElement("div", { className: "form-surface pearl-card" },
            React.createElement("label", null, "\u041E\u0442\u0434\u0430\u0451\u0442\u0435 GM"),
            React.createElement("input", { inputMode: "decimal", value: shopAmount, onChange: (e) => { setShopAmount(e.target.value); setShopQuote(null); } }),
            React.createElement("div", { className: "split-line" },
                React.createElement("span", null, "\u041A\u043E\u043C\u0438\u0441\u0441\u0438\u044F GM Shop"),
                React.createElement("b", null, "1%")),
            React.createElement("div", { className: "split-line" },
                React.createElement("span", null, "\u041F\u043E\u0441\u043B\u0435 \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0438"),
                React.createElement("b", null,
                    nf(Math.max(0, Number(shopAmount.replace(',', '.') || 0) * .99)),
                    " GM")),
            React.createElement("div", { className: "split-line" },
                React.createElement("span", null, "\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 CR"),
                React.createElement("b", null, shopQuote ? nf(shopQuote.cr_cents / 100) + ' CR' : 'Нужна котировка')),
            !demo && React.createElement(GButton, { theme: theme, disabled: !liveState?.config?.shop_enabled, onClick: async () => { const x = await api('/api/shop/quote?amount=' + encodeURIComponent(shopAmount.replace(',', '.'))); if (x)
                    setShopQuote(x); } }, "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0440\u044B\u043D\u043E\u0447\u043D\u044B\u0439 \u043A\u0443\u0440\u0441"),
            React.createElement(GButton, { theme: theme, disabled: demo || !shopQuote || !liveState?.config?.shop_enabled, onClick: async () => { const x = await gameAction('/api/shop/exchange', { amount: shopAmount.replace(',', '.'), minCrCents: shopQuote.cr_cents, quoteExpiresAt: shopQuote.quote_expires_at }); if (x)
                    setShopQuote(null); } }, "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043E\u0431\u043C\u0435\u043D GM \u2192 CR")),
        React.createElement("p", { className: "disclaimer" }, "\u041B\u0438\u043C\u0438\u0442: 50 000 CR \u0432 \u0441\u0443\u0442\u043A\u0438. \u0412\u0441\u0435 \u043F\u043E\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u044B\u0435 GM \u043F\u043E\u0441\u0442\u0443\u043F\u0430\u044E\u0442 \u0432 Treasury, \u0432\u043A\u043B\u044E\u0447\u0430\u044F 1% \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0438. \u0414\u043E \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0444\u043E\u0440\u043C\u0443\u043B\u044B \u043A\u0443\u0440\u0441\u0430 \u043E\u0431\u043C\u0435\u043D \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D.")); }
    function Boxes() {
        const e = React.createElement;
        const points = Number(liveState?.points?.points || 0), enabled = !!liveState?.config?.boxes_enabled;
        const payouts = liveState?.config?.box_rewards || {};
        const xpRewards = liveState?.config?.box_xp_rewards || {};
        const bonusEnabled = Boolean(liveState?.config?.box_bonus_enabled);
        const collection = liveState?.box_collection || {};
        const frameRewards = liveState?.config?.box_frame_rewards || [];
        const catalog = [
            { kind: 'bronze', name: 'Бронзовый сундук', tag: 'Базовые награды', cost: 300 },
            { kind: 'silver', name: 'Серебряный сундук', tag: 'Улучшенные награды', cost: 750 },
            { kind: 'gold', name: 'Золотой сундук', tag: 'Максимальные награды', cost: 1500 }
        ];
        const selected = catalog.find(x => x.kind === boxKind) || catalog[0];
        const reward = Number(payouts[selected.kind] || 0), totalCost = selected.cost * boxCount, totalReward = reward * boxCount;
        const totalXp = bonusEnabled ? Number(xpRewards[selected.kind] || 0) * boxCount : 0;
        const picture = (kind) => './assets/chests/gm-chest-badge-' + kind + '.svg';
        return e('div', { className: 'gm-boxes-v9 gm-flat-boxes' }, top('Боксы', true, 'info'),

        e('header', { className: 'gm-flat-heading' }, e('h2', null, 'Сундуки GM'), e('p', null, bonusEnabled ? 'Открывай сундуки и получай GM, XP и коллекционные рамки. Все призы гарантированы.' : 'Открывай сундуки и получай виртуальные GM. Награды фиксированные.')), e('div', { className: 'gm-boxes-points gm-flat-wallet' }, e('span', { className: 'gm-flat-point-icon' }, icon('diamond', 26, true)), e('div', { className: 'gm-flat-wallet-balance' }, e('small', null, 'Ваши POINTS'), e('strong', null, nf(points, 0) + ' POINTS')), e('button', { type: 'button', className: 'gm-flat-points-help',
            onClick: () => { setPointsGuideOpen(true); openGuide('points'); } }, icon('book-open', 18), 'Как получить POINTS?', icon('chevron-right', 16))), e('div', { className: 'gm-flat-tour-buttons' }, e('button', { type: 'button', className: 'gm-chests-tutorial', onClick: () => openGuide('boxes') }, icon('info', 15), 'Инструкция по сундукам'), e('button', { type: 'button', className: 'gm-chests-points-tour', onClick: () => {
                setPointsGuideOpen(true);
                openGuide('points');
            } }, icon('book-open', 15), 'Инструкция POINTS')), pointsGuideOpen ? e('section', { className: 'gm-points-guide gm-flat-points-detail' }, e('p', null, 'POINTS начисляются за подтверждённый игровой торговый объём с учётом лимитов и проверок.'), e('button', { type: 'button', className: 'gm-points-guide-action', onClick: () => goto('trade') }, 'Перейти на рынок', icon('chevron-right', 16))) : null, e('div', { className: 'gm-chests-list gm-flat-catalog', role: 'group', 'aria-label': 'Выбор сундука' }, catalog.map(x => {
            const active = boxKind === x.kind;
            return e('button', { key: x.kind, type: 'button',
                className: 'gm-chest-choice gm-flat-card ' + x.kind + (active ? ' selected' : ''),
                'aria-pressed': active, onClick: () => setBoxKind(x.kind) }, e('span', { className: 'gm-flat-card-image' }, e('img', { src: picture(x.kind), alt: '', draggable: false, 'aria-hidden': true })), e('span', { className: 'gm-chest-choice-info gm-flat-card-body' }, e('b', null, x.name), e('small', null, x.tag), e('span', { className: 'gm-flat-card-stats' }, e('span', null, 'Награда', e('strong', null, nf(Number(payouts[x.kind] || 0), 0) + ' GM')), e('span', null, 'Стоимость', e('strong', null, nf(x.cost, 0) + ' POINTS'))), bonusEnabled ? e('span', { className: 'gm-box-bonus' }, icon('sparkles', 15), e('b', null, '+' + nf(Number(xpRewards[x.kind] || 0), 0) + ' XP'), e('small', null, (() => {
                const milestone = frameRewards.find((f) => f.kind === x.kind);
                const value = Number(collection[x.kind] || 0);
                return milestone ? value >= milestone.required ? 'Рамка открыта' : 'Рамка: ' + value + '/' + milestone.required : 'Бонус опыта';
            })())) : null), active ? e('span', { className: 'gm-flat-card-check', 'aria-label': 'Выбран' }, icon('check', 17)) : null);
        })), e('section', { className: 'gm-chest-prize-preview', 'aria-label': 'Предпросмотр наград выбранного сундука' },
            e('div', { className: 'gm-chest-prize-head' },
                e('div', null, e('small', null, 'СОДЕРЖИМОЕ СУНДУКА'), e('h3', null, 'Что внутри?')),
                e('span', { className: 'gm-chest-prize-kind' }, selected.name)),
            e('div', { className: 'gm-chest-prize-grid' },
                e('div', { className: 'gm-chest-prize-item' },
                    e('span', { className: 'gm-chest-prize-icon' }, icon('coins', 23, true)),
                    e('span', null, e('b', null, 'GM TOKEN'), e('small', null, 'Гарантированная награда')),
                    e('strong', null, reward > 0 ? '+' + nf(reward, 0) + ' GM' : '—')),
                bonusEnabled ? e('div', { className: 'gm-chest-prize-item' },
                    e('span', { className: 'gm-chest-prize-icon' }, icon('sparkles', 23, true)),
                    e('span', null, e('b', null, 'Опыт XP'), e('small', null, 'За каждое открытие')),
                    e('strong', null, '+' + nf(Number(xpRewards[selected.kind] || 0), 0) + ' XP')) : null,
                ...frameRewards.filter(f => f.kind === selected.kind).map(f => {
                    const progress = Number(collection[selected.kind] || 0), required = Number(f.required || 0);
                    return e('div', { className: 'gm-chest-prize-item gm-chest-prize-frame', key: String(f.id || f.title) },
                        e('span', { className: 'gm-chest-prize-icon' }, icon('award', 23, true)),
                        e('span', null, e('b', null, String(f.title || 'Коллекционная рамка')),
                            e('small', null, required > 0 ? 'За ' + required + ' открытий этого сундука' : 'Коллекционная награда')),
                        e('strong', null, required > 0 ? (progress >= required ? 'Получена' : progress + '/' + required) : 'Бонус'));
                })),
            e('p', { className: 'gm-chest-prize-note' }, 'Награды и прогресс берутся из настроек игры. Рамки выдаются за достижения, а не случайным образом.')), e('section', { className: 'gm-flat-opening' }, e('h3', null, 'Сколько открыть?'), e('div', { className: 'gm-chests-qty', role: 'group', 'aria-label': 'Количество открытий' }, [1, 3, 5, 10].map(count => e('button', { type: 'button', key: count,
            'aria-pressed': boxCount === count, className: boxCount === count ? 'active' : '',
            onClick: () => setBoxCount(count) }, '×' + count))), e('div', { className: 'gm-chests-subtotal' }, e('span', null, 'Итого: ', e('b', null, '+' + nf(totalReward, 0) + ' GM')), e('span', null, nf(totalCost, 0) + ' POINTS')), bonusEnabled ? e('div', { className: 'gm-box-total-bonuses' }, icon('sparkles', 17), 'Дополнительно: +' + nf(totalXp, 0) + ' XP', e('span', null, 'Рамки за открытия 5/5/5 и 30 всего')) : null, e('div', { className: 'gm-chests-actions' }, e('button', { type: 'button', className: 'gm-chests-open',
            disabled: demo || !enabled || !reward || boxBusy || points < totalCost,
            onClick: () => openBox(selected.kind, boxCount) }, icon('gift', 20), boxBusy ? 'Подтверждаем...' : !enabled ? 'Сундуки недоступны' : !reward ? 'Награды недоступны' :
            points < totalCost ? 'Не хватает ' + nf(totalCost - points, 0) + ' POINTS' : 'Открыть сундук ×' + boxCount), !demo && enabled && reward > 0 && points < totalCost ?
            e('button', { type: 'button', className: 'gm-chests-how-points',
                onClick: () => { setPointsGuideOpen(true); openGuide('points'); } }, icon('info', 16), 'Как заработать POINTS', icon('chevron-right', 16)) : null)), e('p', { className: 'gm-boxes-honest' }, bonusEnabled ? 'POINTS списываются, GM и XP начисляются одним серверным действием. Рамки доступны в профиле. Дневные лимиты сохранены.' : 'POINTS списываются и GM начисляются сервером. Дневные лимиты сохранены.'));
    }
    function BoxRevealModal() {
        const e = React.createElement;
        const kind = boxReveal.kind || 'bronze', count = boxReveal.count || 1;
        const reward = Number(boxReveal.unit || ((boxReveal.gm || 0) / count));
        const bonusXp = Number(boxReveal.xp || 0), unitXp = Number(boxReveal.unitXp || 0);
        return e('div', { className: 'gm-box-overlay gm-chests-overlay', role: 'presentation',
            onClick: () => setModal('') }, e('div', { className: 'gm-chests-result gm-flat-result gm-premium-card ' + kind,
            role: 'dialog', 'aria-modal': true, 'aria-label': 'Получены награды за сундуки',
            onClick: event => event.stopPropagation() }, e('div', { className: 'gm-flat-result-image', 'aria-hidden': true }, e('div', { className: 'gm-chests-burst' }), e('img', { src: './assets/chests/gm-chest-badge-' + kind + '.svg', alt: '', draggable: false })), e('div', { className: 'gm-chests-result-copy' }, e('span', { className: 'gm-chests-finished-tag' }, 'Открыто ' + count + ' ' + (count === 1 ? 'сундук' : count === 3 ? 'сундука' : 'сундуков')), e('h2', null, 'Полученные награды'), e('div', { className: 'gm-chests-rewards-grid' }, Array.from({ length: count }, (_, i) => e('div', { key: i, className: 'gm-chest-reward-tile' }, icon('coins', 24, true), e('b', null, '+' + nf(reward, 0) + ' GM'), unitXp ? e('small', { className: 'gm-box-reveal-xp' }, '+' + nf(unitXp, 0) + ' XP') : null, e('small', null, 'Сундук ' + (i + 1))))), e('div', { className: 'gm-chests-reward-total' }, e('span', null, 'Итого начислено'), e('strong', null, '+' + nf(boxReveal.gm || 0, 0) + ' GM')), bonusXp ? e('div', { className: 'gm-box-reveal-total-xp' }, icon('sparkles', 19), 'Дополнительно: +' + nf(bonusXp, 0) + ' XP') : null, boxReveal.unlocked.length ? e('div', { className: 'gm-box-reveal-unlocks' }, icon('award', 20), e('div', null, e('b', null, 'Новая рамка профиля!'), ...boxReveal.unlocked.map(f => e('span', { key: f.id }, f.title)))) : null, e('p', null, bonusXp ? 'Виртуальные GM и XP начислены сервером, POINTS списаны.' : 'Виртуальные GM начислены сервером, POINTS списаны.'), e('button', { type: 'button', className: 'gm-chests-close', onClick: () => setModal('') }, 'Отлично!', icon('check', 20)))));
    }
    function Referrals() {
        const e = React.createElement;
        const id = String(webapp?.initDataUnsafe?.user?.id || '');
        const link = id ? 'https://t.me/gm_token_test_bot?startapp=ref_' + id : '';
        const copy = async () => {
            if (!link) {
                flash('Открой через Telegram, чтобы получить ссылку');
                return;
            }
            try {
                if (navigator.clipboard?.writeText)
                    await navigator.clipboard.writeText(link);
                else {
                    const el = document.createElement('textarea');
                    el.value = link;
                    el.style.position = 'fixed';
                    el.style.opacity = '0';
                    document.body.appendChild(el);
                    el.select();
                    const ok = document.execCommand('copy');
                    el.remove();
                    if (!ok)
                        throw Error('copy');
                }
                flash('Ссылка скопирована');
            }
            catch {
                flash('Используй кнопку «Поделиться»');
            }
        };
        const share = () => {
            if (!link) {
                flash('Открой GM TOKEN в Telegram');
                return;
            }
            const url = 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent('Присоединяйся ко мне в GM TOKEN!');
            if (webapp?.openTelegramLink) {
                try {
                    webapp.openTelegramLink(url);
                    return;
                }
                catch { }
            }
            if (navigator.share) {
                navigator.share({ title: 'GM TOKEN', url: link }).catch(() => { });
                return;
            }
            window.location.assign(url);
        };
        const stats = e('div', { className: 'gm-referral-stats' }, e('div', { className: 'gm-premium-card' }, e('strong', null, String(liveReferrals?.referred?.length || 0)), e('small', null, 'Приглашено игроков')), e('div', { className: 'gm-premium-card' }, e('strong', null, nf((liveReferrals?.received_gm_cents || 0) / 100)), e('small', null, 'Получено GM')));
        return e(React.Fragment, null, top('Приглашай друзей', true, 'friends'), e('div', { className: 'gm-referral-hero' }, icon('friends', 110, true), e('h2', null, 'Играйте вместе'), e('p', null, 'Отправь другу свою ссылку, чтобы он присоединился к GM TOKEN.')), e('div', { className: 'gm-referral-link gm-premium-card' }, e('small', null, 'ТВОЯ ПЕРСОНАЛЬНАЯ ССЫЛКА'), e('div', null, e('span', null, link || 'Доступна после входа в Telegram'), e('button', { type: 'button', onClick: copy, 'aria-label': 'Скопировать' }, icon('copy', 23)))), e('button', { type: 'button', className: 'gm-referral-share', onClick: share }, icon('friends', 23), ' Поделиться в Telegram ', icon('chevron-right', 18)), stats, e('div', { className: 'gm-referral-rule gm-premium-card' }, icon('shield-check', 29), e('div', null, e('b', null, 'Как начисляется бонус'), e('p', null, '25% от подтверждённых Holding Rewards приглашённого друга. За простую отправку ссылки GM не начисляются.'))));
    }
    function History() {
        const labels = {
            mining_claim: 'Сбор GM', daily_claim: 'Ежедневная награда',
            ticket_created: 'Обращение в поддержку', admin_test_grant: 'Тестовое начисление',
            admin_points_grant: 'Начисление POINTS', task_claimed: 'Задание выполнено',
            achievement_claimed: 'Достижение открыто', box_open: 'Открытие бокса',
            mining_upgrade: 'Улучшение майнинга', trade: 'Игровая сделка',
            order_placed: 'Торговая заявка'
        };
        const statusLabels = { open: 'Открыто', auto_support: 'Автопомощь', in_review: 'На рассмотрении', resolved: 'Решено', closed: 'Закрыто' };
        return React.createElement(React.Fragment, null,
            top(L('history'), true, 'clock'),
            React.createElement("section", { className: "gm-history-section gm-premium-card" },
                React.createElement("div", { className: "gm-history-section-head" },
                    icon('clock', 26, true),
                    React.createElement("div", null,
                        React.createElement("b", null, "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0439"),
                        React.createElement("small", null, "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0432 \u0438\u0433\u0440\u0435"))),
                !serverHistory.length ? React.createElement("div", { className: "gm-history-placeholder" },
                    icon('clock', 29),
                    React.createElement("p", null, "\u041E\u043F\u0435\u0440\u0430\u0446\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u041D\u043E\u0432\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438.")) : null,
                serverHistory.map((x) => React.createElement("div", { className: "gm-history-entry", key: x.id },
                    React.createElement("span", { className: "gm-history-entry-icon" }, icon(x.kind === 'mining_claim' ? 'lightning' : x.kind?.includes('ticket') ? 'shield-check' : x.kind?.includes('trade') ? 'candlesticks' : 'check', 24, true)),
                    React.createElement("span", null,
                        React.createElement("b", null, labels[x.kind] || String(x.kind || 'Операция').replace(/_/g, ' ')),
                        React.createElement("small", null, new Date(Number(x.at) * 1000).toLocaleString(actualLang === 'uk' ? 'uk-UA' : 'ru-RU'))),
                    icon('check', 17)))),
            React.createElement("section", { className: "gm-history-section gm-premium-card" },
                React.createElement("div", { className: "gm-history-section-head" },
                    icon('shield-check', 26, true),
                    React.createElement("div", null,
                        React.createElement("b", null, "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0439"),
                        React.createElement("small", null, "\u0417\u0430\u043F\u0440\u043E\u0441\u044B \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443 \u0438 \u0438\u0445 \u0441\u0442\u0430\u0442\u0443\u0441\u044B"))),
                !myTicketHistory.length ? React.createElement("p", { className: "gm-history-support-empty" }, "\u0423 \u0442\u0435\u0431\u044F \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0439 \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443.") : null,
                myTicketHistory.map((ticket) => React.createElement("button", { type: "button", className: "gm-history-ticket", key: ticket.id, onClick: () => goto('support') },
                    React.createElement("span", { className: "gm-history-ticket-avatar" }, icon('info', 22)),
                    React.createElement("span", null,
                        React.createElement("b", null, ticket.category),
                        React.createElement("small", null,
                            new Date(Number(ticket.created_at) * 1000).toLocaleDateString(actualLang === 'uk' ? 'uk-UA' : 'ru-RU'),
                            " \u00B7 ",
                            String(ticket.body || '').slice(0, 90))),
                    React.createElement("strong", { className: 'gm-history-ticket-status ' + ticket.status }, statusLabels[ticket.status] || ticket.status))),
                React.createElement("button", { type: "button", className: "gm-history-support-button", onClick: () => goto('support') },
                    icon('shield-check', 19),
                    " \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443 ",
                    icon('chevron-right', 17))));
    }
    function Achievements() {
        const all = (liveState?.cosmetics?.frames || []);
        const everyone = all.filter((x) => x.category !== 'founder');
        const founders = all.filter((x) => x.category === 'founder');
        const future = [
            ['first_claim', 'lightning', 'Искра GM', 'Первый сбор майнинга'],
            ['collector', 'gift', 'Хранитель артефактов', 'Собери коллекцию игровых наград'],
            ['community', 'friends', 'Сила сообщества', 'Пригласи друзей'],
            ['immortal', 'crown', 'GM Immortal', 'Достигни максимальной лиги']
        ];
        return React.createElement(React.Fragment, null,
            top(L('achievements'), true, 'info'),
            React.createElement("section", { className: "gm-achievement-intro gm-premium-card" },
                icon('trophy', 41, true),
                React.createElement("div", null,
                    React.createElement("h2", null, "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F GM"),
                    React.createElement("p", null, "\u041E\u0431\u044B\u0447\u043D\u044B\u0435 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432\u0441\u0435\u043C. \u041F\u0435\u0440\u0432\u044B\u0435 20 \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u043F\u043E\u043B\u0443\u0447\u0430\u044E\u0442 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0443\u044E \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u043D\u0443\u044E \u043A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u044E \u0440\u0430\u043C\u043E\u043A."))),
            React.createElement("section", { className: "gm-achievement-planned" },
                React.createElement("h3", null, "\u041E\u0431\u044B\u0447\u043D\u044B\u0435 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F \u00B7 \u0434\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E"),
                liveAchievements.map((t) => React.createElement("div", { className: 'gm-achievement-locked ' + (t.claimed ? 'claimed' : ''), key: t.id },
                    icon(t.icon || 'trophy', 34, true),
                    React.createElement("span", null,
                        React.createElement("b", null, t.title || t.id),
                        React.createElement("small", null,
                            t.description || '',
                            " \u00B7 ",
                            t.xp || 0,
                            " XP \u00B7 \u0414\u041E\u0421\u0422\u0423\u041F\u041D\u041E \u041A\u0410\u0416\u0414\u041E\u041C\u0423")),
                    !demo && t.available && !t.claimed ? React.createElement("button", { type: "button", onClick: async () => { const x = await gameAction('/api/achievements/claim', { id: t.id }); if (x)
                            await refreshLive(); } }, "\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C") : icon(t.claimed ? 'check' : 'minus', 17))),
                everyone.map((f) => React.createElement("div", { className: 'gm-achievement-locked ' + (f.claimed ? 'claimed' : ''), key: f.id },
                    icon('diamond', 34, true),
                    React.createElement("span", null,
                        React.createElement("b", null, f.title),
                        React.createElement("small", null, "\u041C\u0430\u0439\u043D\u0438\u043D\u0433 \u00B7 \u043D\u0430\u0433\u0440\u0430\u0434\u0430 \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u0438\u0433\u0440\u043E\u043A\u043E\u0432")),
                    icon(f.claimed ? 'check' : 'minus', 17))),
                future.map(([id, ic, title, description]) => React.createElement("div", { className: "gm-achievement-locked", key: id },
                    icon(ic, 34, true),
                    React.createElement("span", null,
                        React.createElement("b", null, title),
                        React.createElement("small", null,
                            description,
                            " \u00B7 \u0441\u043A\u043E\u0440\u043E")),
                    icon('minus', 17)))),
            React.createElement("section", { className: "gm-founder-achievements gm-premium-card" },
                React.createElement("button", { type: "button", className: "gm-founder-collection-trigger", onClick: () => setShowFounderCollection(!showFounderCollection) },
                    icon('crown', 33, true),
                    React.createElement("span", null,
                        React.createElement("b", null, "GM GENESIS \u00B7 20 \u043F\u0435\u0440\u0432\u044B\u0445 \u0438\u0433\u0440\u043E\u043A\u043E\u0432"),
                        React.createElement("small", null, "\u0422\u043E\u043B\u044C\u043A\u043E 20 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0445 \u0440\u0430\u043C\u043E\u043A \u00B7 \u043F\u043E \u043E\u0434\u043D\u043E\u0439 \u043D\u0430 \u0438\u0433\u0440\u043E\u043A\u0430")),
                    icon(showFounderCollection ? 'chevron-up' : 'chevron-down', 19)),
                showFounderCollection ? React.createElement("div", { className: "gm-founder-collection" }, founders.map((f) => React.createElement("div", { className: 'gm-achievement-locked ' + (f.claimed ? 'claimed' : ''), key: f.id },
                    icon('crown', 31, true),
                    React.createElement("span", null,
                        React.createElement("b", null, f.title),
                        React.createElement("small", null,
                            "\u042D\u043A\u0441\u043A\u043B\u044E\u0437\u0438\u0432 #",
                            f.id.replace('founder_', ''),
                            " \u00B7 GM GENESIS")),
                    icon(f.claimed ? 'check' : 'minus', 17)))) : null));
    }
    function Settings() {
        const e = React.createElement;
        const themes = [['light', 'Premium Silver'], ['dark', 'Premium Graphite']];
        const themeButtons = themes.map(([value, label]) => e('button', { type: 'button', key: value,
            className: theme === value ? 'active' : '', onClick: () => setTheme(value) }, e('i', { className: 'gm-theme-swatch ' + value }), e('b', null, label), theme === value ? icon('check', 18) : null));
        return e(React.Fragment, null, top(lang('settings'), true, 'settings'), e('div', { className: 'gm-settings-summary gm-premium-card' }, icon('settings', 39, true), e('span', null, e('b', null, L('personalization')), e('small', null, 'GM TOKEN · PREMIUM UI'))), e('section', { className: 'gm-settings-block gm-premium-card' }, e('h3', null, L('theme')), e('p', null, 'Платиновый светлый вариант и графитовый тёмный вариант с тем же логотипом GM.'), e('div', { className: 'gm-theme-list' }, themeButtons)), e('section', { className: 'gm-settings-block gm-premium-card' }, e('label', { htmlFor: 'gm-lang-select' }, L('interfaceLanguage')), e('p', null, 'Telegram · ' + L('interfaceLanguage')), e('div', { className: 'gm-language-grid', role: 'group', 'aria-label': L('interfaceLanguage') }, gmLanguages.map(([code, label]) => e('button', { type: 'button', key: code, className: 'gm-lang-choice ' + (locale === code ? 'selected' : ''), onClick: () => { setLocale(code); store.setItem('gm_lang', code); }, 'aria-pressed': locale === code }, e('span', null, label), locale === code ? icon('check', 17) : null)))), e('button', { type: 'button', className: 'gm-settings-onboard gm-premium-card', onClick: () => goto('intro') }, icon('info', 26), e('span', null, L('replay')), icon('chevron-right', 20)), e('button', { type: 'button', className: 'gm-settings-onboard gm-premium-card', onClick: () => openGuide('settings') }, icon('info', 26), e('span', null, L('startTour')), icon('chevron-right', 20)), e('p', { className: 'gm-settings-note' }, 'GM TOKEN Premium · светлая и тёмная темы без цветного неона'));
    }
    function Support() {
        const e = React.createElement;
        const tr = (pt, uk, en, ru) => walletLanguage(pt, uk, en, ru);
        const categories = ['Общий вопрос', 'Mining', 'Holding', 'Биржа GM/CR', 'Баланс GM/CR', 'Апелляция', 'Рефералы'];
        const labels = [tr('Geral', 'Загальне питання', 'General', 'Общий вопрос'), tr('Mineração', 'Майнінг', 'Mining', 'Mining'), tr('Holding', 'Холдинг', 'Holding', 'Holding'), tr('Mercado GM/CR', 'Ринок GM/CR', 'GM/CR market', 'Биржа GM/CR'), tr('Saldo GM/CR', 'Баланс GM/CR', 'GM/CR balance', 'Баланс GM/CR'), tr('Recurso', 'Оскарження', 'Appeal', 'Апелляция'), tr('Indicações', 'Реферали', 'Referrals', 'Рефералы')];
        const rows = (supportTickets || []).map(t => {
            const isOwn = t.user_id === String(webapp?.initDataUnsafe?.user?.id || '');
            const isStaff = ['owner', 'coowner', 'moderator'].includes(liveRole);
            const actions = [];
            if (!demo && isOwn && t.status !== 'closed')
                actions.push(e('button', { type: 'button', key: 'auto',
                    onClick: () => ticketAction(t.id, 'auto') }, 'Автопроверка (' + (t.auto_attempts || 0) + '/2)'));
            if (!demo && isStaff && t.status === 'open')
                actions.push(e('button', { type: 'button', key: 'claim',
                    onClick: () => ticketAction(t.id, 'claim') }, 'Взять в работу'));
            if (!demo && isStaff && t.status === 'in_review') {
                actions.push(e('input', { key: 'reply', placeholder: 'Ответ пользователю', value: staffReply, onChange: event => setStaffReply(event.target.value) }));
                actions.push(e('button', { type: 'button', key: 'send', onClick: () => ticketAction(t.id, 'reply', { body: staffReply }) }, 'Ответить'));
                actions.push(e('button', { type: 'button', key: 'resolve', onClick: () => ticketAction(t.id, 'resolve') }, 'Решено'));
            }
            if (!demo && isOwn && ['resolved', 'closed'].includes(t.status))
                actions.push(e('button', { type: 'button', key: 'reopen',
                    onClick: () => ticketAction(t.id, 'reopen') }, 'Открыть повторно'));
            return e('section', { className: 'gm-support-ticket gm-premium-card', key: t.id }, e('div', null, e('b', null, '#' + String(t.id).slice(0, 8)), e('span', null, t.category)), e('p', null, clean(t.body || t.text || '')), e('small', null, 'Статус: ' + t.status + ' · ' + (t.priority || 'P3')), e('div', { className: 'gm-support-actions' }, actions));
        });
        return e(React.Fragment, null, top(L('support'), true, 'info'), e('div', { className: 'gm-support-hero gm-premium-card' }, icon('shield-check', 43, true), e('div', null, e('b', null, tr('Central de suporte GM TOKEN', 'Центр підтримки GM TOKEN', 'GM TOKEN Support Center', 'Центр поддержки GM TOKEN')), e('p', null, tr('Ajuda com mineração, caixas, ordens, saldo e login no Telegram.', 'Допомога з майнінгом, боксами, угодами, балансом і входом у Telegram.', 'Help with Mining, Boxes, orders, balances and Telegram login.', 'Поможем разобраться с Mining, боксами, сделками, балансом и входом в Telegram.')))), e('section', { className: 'gm-support-form gm-premium-card' }, e('div', { className: 'gm-support-form-head' }, icon('info', 29), e('span', null, e('b', null, tr('Novo chamado', 'Нове звернення', 'New ticket', 'Новое обращение')), e('small', null, tr('Histórico e respostas salvos no servidor', 'Історія й відповіді на сервері', 'Status and replies stored on the server', 'Ответы и статус сохраняются на сервере')))), e('label', null, tr('Assunto', 'Тема звернення', 'Topic', 'Тема обращения')), e('div', { className: 'gm-support-category-grid', role: 'group', 'aria-label': 'Тема обращения' }, categories.map((x, i) => e('button', { type: 'button', key: x, className: 'gm-support-category ' + (supportCategory === x ? 'selected' : ''), 'aria-pressed': supportCategory === x, onClick: () => setSupportCategory(x) }, icon(['info', 'lightning', 'wallet', 'candlesticks', 'coins', 'shield-check', 'friends'][i], 18), labels[i]))), e('label', { htmlFor: 'gm-support-message' }, tr('Descreva o problema', 'Опиши проблему', 'Describe the issue', 'Опиши проблему')), e('textarea', { id: 'gm-support-message', rows: 5, value: supportText,
            placeholder: tr('Ex.: meu saldo sumiu após abrir o Mini App…', 'Наприклад: після відкриття Mini App зник баланс…', 'E.g. my balance disappeared after opening the Mini App…', 'Например: после открытия Mini App пропал баланс…'),
            onChange: event => setSupportText(event.target.value) }), e('small', { className: 'gm-support-length' }, supportText.trim().length + ' / 3000 · ' + tr('mínimo 10 caracteres', 'мінімум 10 символів', 'minimum 10 characters', 'минимум 10 символов')), e('button', { type: 'button', className: 'gm-support-submit', disabled: demo || supportText.trim().length < 10, onClick: createTicket }, icon('send', 20), tr('Enviar chamado', 'Створити звернення', 'Submit ticket', 'Создать обращение'))), e('div', { className: 'gm-support-section-label' }, e('b', null, tr('Meus chamados', 'Мої звернення', 'My tickets', 'Мои обращения')), e('button', { type: 'button', onClick: loadTickets }, icon('refresh', 17), tr('Atualizar', 'Оновити', 'Refresh', 'Обновить'))), rows.length ? rows : e('p', { className: 'gm-support-empty' }, tr('Você ainda não tem chamados. Use o formulário acima.', 'Звернень поки немає. Скористайся формою вище.', 'No tickets yet. Use the form above.', 'Пока нет обращений. Создай обращение через форму выше.')), e('p', { className: 'gm-support-foot' }, 'При серьёзной ошибке баланса выбери «Баланс GM/CR». Не сообщай коды 2FA и секреты бота.'));
    }
    function AdminTaskCatalog() {
        const f = taskForm;
        const setField = (field, val) => setTaskForm((old) => ({ ...old, [field]: val }));
        const examples = [
            ['mining_claim_count', 'Сборы GM'], ['trade_count', 'Исполненные сделки'], ['referrals_count', 'Приглашённые игроки'],
            ['mining_level', 'Уровень профиля'], ['daily_claim', 'Ежедневная награда'], ['founder_slot', 'Первые 20 игроков']
        ];
        return React.createElement("section", { className: "gm-admin-task-editor gm-premium-card" },
            React.createElement("div", { className: "gm-admin-task-head" },
                icon('tasks', 39, true),
                React.createElement("div", null,
                    React.createElement("h3", null, "\u041A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0442\u043E\u0440 \u0437\u0430\u0434\u0430\u043D\u0438\u0439"),
                    React.createElement("p", null, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435, \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0438 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u0439 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u043D\u043E\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u043E\u0439 \u0438 2FA. \u041F\u043E\u0434\u0434\u0435\u043B\u044C\u043D\u044B\u0435 \u043D\u0430\u0433\u0440\u0430\u0434\u044B \u043D\u0435 \u043D\u0430\u0447\u0438\u0441\u043B\u044F\u044E\u0442\u0441\u044F."))),
            React.createElement("div", { className: "gm-admin-task-summary" },
                React.createElement("b", null,
                    adminTasks.length,
                    " \u0437\u0430\u0434\u0430\u043D\u0438\u0439"),
                React.createElement("button", { type: "button", onClick: () => void loadAdminTasks() },
                    icon('refresh', 17),
                    " \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C")),
            React.createElement("div", { className: "gm-admin-task-list" }, adminTasks.map((item) => React.createElement("button", { type: "button", className: 'gm-admin-task-row ' + (taskEditingId === item.id ? 'selected' : ''), key: item.id, onClick: () => beginTaskEdit(item) },
                React.createElement("span", null, icon(item.icon || 'tasks', 25, true)),
                React.createElement("span", { className: "gm-admin-task-text" },
                    React.createElement("b", null, item.title),
                    React.createElement("small", null,
                        item.id,
                        " \u00B7 +",
                        item.xp || 0,
                        " XP",
                        item.gm ? ' · +' + item.gm + ' GM' : '')),
                icon('chevron-right', 18)))),
            React.createElement("div", { className: "gm-admin-task-controls" },
                React.createElement("button", { type: "button", className: "gm-admin-task-new", onClick: () => {
                        setTaskEditingId('');
                        setTaskDeleteArmed('');
                        setTaskForm({ id: '', title: '', description: '', category: 'Other', icon: 'tasks', type: 'mining_claim_count', gte: '1', xp: '25', gm: '0', daily: false });
                    } },
                    icon('plus', 19),
                    " \u041D\u043E\u0432\u043E\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u0435")),
            React.createElement("div", { className: "gm-admin-task-form" },
                React.createElement("h4", null, taskEditingId ? 'Редактирование: ' + taskEditingId : 'Создать задание'),
                React.createElement("label", { htmlFor: "gm-task-id" }, "ID (\u043B\u0430\u0442\u0438\u043D\u0438\u0446\u0430, \u0431\u0435\u0437 \u043F\u0440\u043E\u0431\u0435\u043B\u043E\u0432)"),
                React.createElement("input", { id: "gm-task-id", value: f.id, disabled: Boolean(taskEditingId), maxLength: 60, placeholder: "my_unique_task", onChange: (e) => setField('id', e.target.value) }),
                React.createElement("label", { htmlFor: "gm-task-title" }, "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435"),
                React.createElement("input", { id: "gm-task-title", value: f.title, maxLength: 70, placeholder: "\u0421\u0442\u0430\u043B\u044C\u043D\u0430\u044F \u043B\u0435\u0433\u0435\u043D\u0434\u0430", onChange: (e) => setField('title', e.target.value) }),
                React.createElement("label", { htmlFor: "gm-task-description" }, "\u0423\u0441\u043B\u043E\u0432\u0438\u0435 \u0434\u043B\u044F \u0438\u0433\u0440\u043E\u043A\u0430"),
                React.createElement("textarea", { id: "gm-task-description", rows: 3, maxLength: 210, value: f.description, placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u0441\u043E\u0431\u0435\u0440\u0438 GM 5 \u0440\u0430\u0437", onChange: (e) => setField('description', e.target.value) }),
                React.createElement("div", { className: "gm-admin-task-fields" },
                    React.createElement("label", null,
                        "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F",
                        React.createElement("select", { value: f.category, onChange: (e) => setField('category', e.target.value) },
                            React.createElement("option", { value: "Other" }, "\u0418\u0433\u0440\u043E\u0432\u044B\u0435"),
                            React.createElement("option", { value: "Social" }, "\u0421\u043E\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0435"))),
                    React.createElement("label", null,
                        "\u0418\u043A\u043E\u043D\u043A\u0430",
                        React.createElement("select", { value: f.icon, onChange: (e) => setField('icon', e.target.value) }, ['tasks', 'lightning', 'candlesticks', 'friends', 'gift', 'trophy', 'crown', 'clock', 'diamond', 'coins', 'star'].map(x => React.createElement("option", { key: x, value: x }, x))))),
                React.createElement("label", null, "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C\u043E\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u0435"),
                React.createElement("select", { value: f.type, onChange: (e) => { setField('type', e.target.value); if (e.target.value === 'daily_claim' || e.target.value === 'founder_slot')
                        setField('gte', '1'); } }, examples.map(([type, label]) => React.createElement("option", { key: type, value: type }, label))),
                React.createElement("div", { className: "gm-admin-task-fields" },
                    React.createElement("label", null,
                        "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u043D\u0443\u0436\u043D\u043E",
                        React.createElement("input", { inputMode: "numeric", type: "number", min: 1, max: 10000, value: f.gte, disabled: f.type === 'daily_claim' || f.type === 'founder_slot', onChange: (e) => setField('gte', e.target.value) })),
                    React.createElement("label", null,
                        "\u041D\u0430\u0433\u0440\u0430\u0434\u0430 XP",
                        React.createElement("input", { inputMode: "numeric", type: "number", min: 0, max: 1000, value: f.xp, onChange: (e) => setField('xp', e.target.value) }))),
                React.createElement("label", null,
                    "\u041D\u0430\u0433\u0440\u0430\u0434\u0430 \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0445 GM (0\u2013100)",
                    React.createElement("input", { inputMode: "numeric", type: "number", min: 0, max: 100, value: f.gm, onChange: (e) => setField('gm', e.target.value) })),
                React.createElement("label", { className: "gm-admin-task-check" },
                    React.createElement("input", { type: "checkbox", checked: f.daily, disabled: f.type !== 'daily_claim', onChange: (e) => setField('daily', e.target.checked) }),
                    React.createElement("span", null, "\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u0442\u044C \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E (\u0442\u043E\u043B\u044C\u043A\u043E \u0437\u0430 \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u0443\u044E \u043D\u0430\u0433\u0440\u0430\u0434\u0443)")),
                React.createElement("label", null, "\u041A\u043E\u0434 2FA \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430"),
                React.createElement("input", { value: task2fa, maxLength: 6, inputMode: "numeric", autoComplete: "one-time-code", placeholder: "6 \u0446\u0438\u0444\u0440", onChange: (e) => setTask2fa(e.target.value) }),
                React.createElement("div", { className: "gm-admin-task-buttons" },
                    React.createElement("button", { type: "button", className: "gm-admin-task-save", disabled: demo || taskSaving || task2fa.length !== 6 || !f.id || !f.title || !f.description, onClick: () => void saveAdminTask() },
                        icon('check', 19),
                        " ",
                        taskSaving ? 'Сохранение…' : 'Сохранить задание'),
                    taskEditingId ? React.createElement("button", { type: "button", className: "gm-admin-task-delete", disabled: demo || taskSaving || task2fa.length !== 6, onClick: () => taskDeleteArmed === f.id ? void saveAdminTask('delete') : setTaskDeleteArmed(f.id) },
                        icon('minus', 18),
                        " ",
                        taskDeleteArmed === f.id ? 'Подтвердить удаление' : 'Удалить') : null),
                React.createElement("small", { className: "gm-admin-task-foot" }, "\u0414\u043B\u044F \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0439 \u043D\u0443\u0436\u0435\u043D \u0441\u0432\u0435\u0436\u0438\u0439 \u043A\u043E\u0434 2FA. GM \u0431\u0435\u0440\u0443\u0442\u0441\u044F \u0438\u0437 \u0438\u0433\u0440\u043E\u0432\u043E\u0433\u043E \u0444\u043E\u043D\u0434\u0430 DAILY. \u0423\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0442\u0441\u044F \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C \u2014 \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u043F\u043E \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0435 \u0431\u0435\u0437 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F.")));
    }
    function AdminTestGrants() {
        const e = React.createElement;
        return e('section', { className: 'test-grants form-surface pearl-card', 'aria-label': 'Тестовые начисления GM и CR' }, e('div', { className: 'test-grants-heading' }, icon('coins', 40, true), e('div', null, e('strong', null, 'Тестовые начисления'), e('small', null, 'GM / CR / POINTS · только Owner / Co-Owner'))), e('p', { className: 'test-grants-note' }, testCurrency === 'POINTS' ? 'POINTS — игровые очки, не токен. Выдача ограничена, требует 2FA и фиксируется в журнале.' : 'GM/CR берутся из существующих резервов. Все начисления проходят 2FA и фиксируются в журнале.'), e('label', null, 'Кому начислить'), e('div', { className: 'test-grants-options', role: 'group', 'aria-label': 'Получатель' }, [['self', 'Себе'], ['other-owner', 'Совладельцу'], ['id', 'Игроку']].map(([id, title]) => e('button', { type: 'button', className: testRecipient === id ? 'selected' : '', key: id, onClick: () => setTestRecipient(id), 'aria-pressed': testRecipient === id }, title))), testRecipient === 'id' ? e('input', { value: testUserId, placeholder: 'Telegram ID зарегистрированного игрока', inputMode: 'numeric', onChange: event => setTestUserId(event.target.value), 'aria-label': 'Telegram ID игрока' }) : null, e('label', null, 'Игровая валюта'), e('div', { className: 'test-grants-options', role: 'group', 'aria-label': 'Валюта' }, ['GM', 'CR', 'POINTS'].map(currency => e('button', { key: currency, type: 'button', className: testCurrency === currency ? 'selected' : '', onClick: () => { setTestCurrency(currency); setTestAmount(currency === 'POINTS' ? '300' : currency === 'GM' ? '1000' : '10000'); }, 'aria-pressed': testCurrency === currency }, icon(currency === 'GM' ? 'gm-coin-orbit' : currency === 'POINTS' ? 'trophy' : 'coins', 23), currency))), e('label', null, 'Сумма ' + testCurrency), e('input', { value: testAmount, inputMode: 'decimal', placeholder: 'Например, 1000', onChange: event => setTestAmount(event.target.value), 'aria-label': 'Сумма тестового начисления' }), e('div', { className: 'test-grants-presets' }, (testCurrency === 'POINTS' ? ['100', '300', '1000'] : testCurrency === 'GM' ? ['1000', '5000', '10000'] : ['10000', '50000', '100000']).map(n => e('button', { key: n, type: 'button', onClick: () => setTestAmount(n) }, n))), e('small', { className: 'test-grants-limit' }, testCurrency === 'POINTS' ? 'До 1 000 POINTS за операцию и 5 000 POINTS в UTC-день на игрока.' : testCurrency === 'GM' ? 'До 10 000 GM за операцию и 50 000 GM в UTC-день на игрока.' : 'До 100 000 CR за операцию и 500 000 CR в UTC-день на игрока.'), e('label', null, 'Зачем выдаём'), e('textarea', { rows: 2, value: testReason, onChange: event => setTestReason(event.target.value), 'aria-label': 'Причина начисления' }), e('label', null, 'Код 2FA владельца'), e('input', { value: testCode, inputMode: 'numeric', type: 'text', autoComplete: 'one-time-code', maxLength: 6, placeholder: '6 цифр из приложения 2FA', onChange: event => setTestCode(event.target.value), 'aria-label': 'Код TOTP' }), e(GButton, { theme, disabled: demo || testBusy || !testAmount || testCode.length !== 6, onClick: testGrant, icon: 'shield-check' }, testBusy ? 'Проверяем начисление...' : 'Выдать тестовые ' + testCurrency), e('p', { className: 'test-grants-footer' }, 'Другой совладелец или игрок должен хотя бы один раз открыть GM TOKEN. При необходимости между начислениями дождись нового кода 2FA.'));
    }
    function Admin() {
        const isOwner = ['owner', 'coowner'].includes(liveRole);
        if (!demo && !isOwner)
            return React.createElement(React.Fragment, null,
                top('Admin Panel', true, 'shield-check'),
                React.createElement("div", { className: "empty-state" },
                    icon('shield-check', 70, true),
                    React.createElement("h2", null, "\u0414\u043E\u0441\u0442\u0443\u043F \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D"),
                    React.createElement("p", null, "\u0422\u043E\u043B\u044C\u043A\u043E Owner \u0438 Co-Owner \u043C\u043E\u0433\u0443\u0442 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u0438\u0432\u043D\u0443\u044E \u043F\u0430\u043D\u0435\u043B\u044C. \u0420\u043E\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0442\u0441\u044F \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C.")));
        return React.createElement(React.Fragment, null,
            top('Admin Panel', true, 'settings'),
            React.createElement("div", { className: "admin-banner pearl-card" },
                icon('crown', 49, true),
                React.createElement("div", null,
                    React.createElement("b", null, liveRole.toUpperCase()),
                    React.createElement("small", null, "\u0412\u0445\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D Telegram; \u043A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438 \u0442\u0440\u0435\u0431\u0443\u044E\u0442 TOTP"))),
            React.createElement("div", { className: "admin-numbers" }, [['Users', adminStats?.users ?? '—'], ['Orders', adminStats?.orders ?? '—'], ['Trades (24h)', adminStats?.trades_24h ?? '—'], ['Open tickets', adminStats?.open_tickets ?? '—']].map(([a, b]) => React.createElement("div", { className: "pearl-card", key: a },
                React.createElement("small", null, a),
                React.createElement("b", null, b),
                React.createElement("small", null, "\u0421\u0435\u0440\u0432\u0435\u0440\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435")))),
            AdminTestGrants(),
            AdminTaskCatalog(),
            React.createElement("h3", { className: "section-title" }, "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435"),
            React.createElement("div", { className: "admin-actions pearl-card" },
                React.createElement("button", { onClick: async () => { const x = await adminRequest('/api/admin/team'); if (x)
                        setAdminTeam(x.team || []); } },
                    icon('friends', 21),
                    " \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u0440\u043E\u043B\u0435\u0439"),
                React.createElement("button", { onClick: async () => { const x = await adminRequest('/api/admin/pools'); if (x)
                        setAdminFunds(x.pools || []); const st = await adminRequest('/api/admin/stats'); if (st)
                        setAdminStats(st); } },
                    icon('database', 21),
                    " \u041E\u0441\u0442\u0430\u0442\u043A\u0438 \u0444\u043E\u043D\u0434\u043E\u0432")),
            adminTeam.length > 0 && React.createElement("div", { className: "admin-records pearl-card" }, adminTeam.map((x) => React.createElement("div", { key: x.id },
                React.createElement("span", null, x.username || x.id),
                React.createElement("b", null, x.role)))),
            adminFunds.length > 0 && React.createElement("div", { className: "admin-records pearl-card" }, adminFunds.map((x) => React.createElement("div", { key: x.name },
                React.createElement("span", null, x.name),
                React.createElement("b", null,
                    nf((x.gm || x.cr) / 100),
                    " ",
                    x.gm ? 'GM' : 'CR')))),
            React.createElement("div", { className: "form-surface pearl-card" },
                React.createElement("b", null, "\u041C\u043E\u0434\u0435\u0440\u0430\u0442\u043E\u0440\u044B"),
                React.createElement("label", null, "Telegram ID \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0430"),
                React.createElement("input", { value: adminId, onChange: (e) => setAdminId(e.target.value), placeholder: "\u0422\u043E\u043B\u044C\u043A\u043E \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 ID" }),
                React.createElement("label", null, "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435"),
                React.createElement("select", { value: adminAction, onChange: (e) => setAdminAction(e.target.value) },
                    React.createElement("option", { value: "grant" }, "\u0412\u044B\u0434\u0430\u0442\u044C Moderator"),
                    React.createElement("option", { value: "revoke" }, "\u041E\u0442\u043E\u0437\u0432\u0430\u0442\u044C Moderator")),
                React.createElement("label", null, "\u041A\u043E\u0434 2FA \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430"),
                React.createElement("input", { value: adminCode, onChange: (e) => setAdminCode(e.target.value), inputMode: "numeric", placeholder: "6-\u0437\u043D\u0430\u0447\u043D\u044B\u0439 TOTP" }),
                React.createElement(GButton, { theme: theme, onClick: adminChangeRole, disabled: demo }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0440\u043E\u043B\u044C")),
            React.createElement("div", { className: "form-surface pearl-card" },
                React.createElement("b", null, "\u041F\u0435\u0440\u0435\u0432\u043E\u0434 \u043C\u0435\u0436\u0434\u0443 \u0438\u0433\u0440\u043E\u0432\u044B\u043C\u0438 \u0444\u043E\u043D\u0434\u0430\u043C\u0438"),
                React.createElement("label", null, "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A"),
                React.createElement("select", { value: adminFrom, onChange: (e) => setAdminFrom(e.target.value) },
                    React.createElement("option", { value: "TREASURY" }, "Treasury"),
                    React.createElement("option", { value: "FUTURE" }, "Future Ecosystem")),
                React.createElement("label", null, "\u041F\u043E\u043B\u0443\u0447\u0430\u0442\u0435\u043B\u044C"),
                React.createElement("select", { value: adminTo, onChange: (e) => setAdminTo(e.target.value) }, ['MINING', 'HOLDING', 'BOXES', 'DAILY', 'COMMUNITY', 'DEVELOPMENT'].map(x => React.createElement("option", { key: x }, x))),
                React.createElement("label", null, "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E GM"),
                React.createElement("input", { value: adminAmount, onChange: (e) => setAdminAmount(e.target.value), inputMode: "decimal" }),
                React.createElement("label", null, "\u041F\u0440\u0438\u0447\u0438\u043D\u0430 (15+ \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432)"),
                React.createElement("textarea", { rows: 3, value: adminReason, onChange: (e) => setAdminReason(e.target.value) }),
                React.createElement(GButton, { theme: theme, onClick: adminTransfer, disabled: demo }, "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043F\u0435\u0440\u0435\u0432\u043E\u0434 + 2FA")),
            React.createElement("div", { className: "form-surface pearl-card" },
                React.createElement("b", null, "\u041A\u043E\u0440\u0440\u0435\u043A\u0446\u0438\u044F \u043E\u0448\u0438\u0431\u043E\u0447\u043D\u043E\u0433\u043E \u0431\u0430\u043B\u0430\u043D\u0441\u0430"),
                React.createElement("small", null, "\u0422\u043E\u043B\u044C\u043A\u043E \u043F\u043E \u0442\u0438\u043A\u0435\u0442\u0443 \u0438 \u0441 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u043E\u0439 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0433\u043E \u0440\u0435\u0437\u0435\u0440\u0432\u0430."),
                React.createElement("label", null, "ID \u0438\u0433\u0440\u043E\u043A\u0430 (\u0432\u044B\u0448\u0435)"),
                React.createElement("input", { value: adminId, onChange: (e) => setAdminId(e.target.value) }),
                React.createElement("label", null, "\u0412\u0430\u043B\u044E\u0442\u0430"),
                React.createElement("select", { value: adminCorrectionCurrency, onChange: (e) => { setAdminCorrectionCurrency(e.target.value); setAdminCorrectionPool(e.target.value === 'GM' ? 'MINING' : 'WELCOME'); } },
                    React.createElement("option", null, "GM"),
                    React.createElement("option", null, "CR")),
                React.createElement("label", null, "\u0424\u043E\u043D\u0434-\u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u043A\u0438"),
                React.createElement("select", { value: adminCorrectionPool, onChange: (e) => setAdminCorrectionPool(e.target.value) }, (adminCorrectionCurrency === 'GM' ? ['MINING', 'BOXES', 'DAILY', 'COMMUNITY', 'DEVELOPMENT', 'FUTURE', 'TREASURY'] : ['WELCOME', 'SHOP']).map(x => React.createElement("option", { key: x }, x))),
                React.createElement("label", null, "\u041D\u043E\u043C\u0435\u0440 \u0442\u0438\u043A\u0435\u0442\u0430"),
                React.createElement("input", { value: adminTicket, onChange: (e) => setAdminTicket(e.target.value), placeholder: "GM-..." }),
                React.createElement("label", null, "\u0421\u0443\u043C\u043C\u0430 (\u0432\u044B\u0448\u0435)"),
                React.createElement("input", { value: adminAmount, onChange: (e) => setAdminAmount(e.target.value) }),
                React.createElement(GButton, { theme: theme, onClick: adminCorrection, disabled: demo }, "\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0447\u0435\u0440\u0435\u0437 \u0440\u0435\u0437\u0435\u0440\u0432 + 2FA")),
            React.createElement("p", { className: "disclaimer" }, "\u0412 \u0434\u0435\u043C\u043E \u0432\u0441\u0435 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u044B. \u0423 \u0434\u0432\u0443\u0445 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0435\u0432 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0435 \u0437\u0430\u0449\u0438\u0449\u0451\u043D\u043D\u044B\u0435 \u043F\u0440\u0430\u0432\u0430; \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430 \u0447\u0435\u0440\u0435\u0437 UI."));
    }
    function More() {
        const e = React.createElement;
        const groups = [
            [L('account'), [['profile', 'profile', L('profile'), L('balance')], ['achievements', 'trophy', L('achievements'), L('earned')], ['history', 'clock', L('history'), L('history')]]],
            [L('game'), [['reward', 'gift', 'Daily Reward', L('claim')], ['tasks', 'tasks', L('tasks'), L('earned')], ['referrals', 'friends', L('friends'), L('referrals')], ['leaderboard', 'trophy', L('leaderboard'), L('holdings')], ['wallet', 'wallet', L('wallet'), L('wallet')]]],
            [L('help'), [['support', 'shield-check', L('support'), L('help')], ['settings', 'settings', L('customize'), L('interfaceLanguage')], ['intro', 'info', L('instruction'), L('replay')]]]
        ];
        if (['owner', 'coowner'].includes(liveRole))
            groups.push(['АДМИНИСТРИРОВАНИЕ', [['admin', 'crown', 'Admin Panel', 'Только Owner и Co-Owner']]]);
        const sections = groups.map(([title, rows]) => {
            const buttons = rows.map(([route, img, label, subtitle]) => e('button', { type: 'button', key: route, className: 'gm-more-item', onClick: () => goto(route) }, e('span', { className: 'gm-more-icon' }, icon(img, 26)), e('span', { className: 'gm-more-label' }, e('b', null, label), e('small', null, subtitle)), icon('chevron-right', 18)));
            return e('section', { className: 'gm-more-section', key: title }, e('h3', null, title), e('div', { className: 'gm-more-list gm-premium-card' }, buttons));
        });
        return e(React.Fragment, null, top(lang('more'), true, 'more'), e('div', { className: 'gm-more-logo gm-premium-card' }, e(Brand, { theme, size: 54 }), e('div', null, e('b', null, 'GM TOKEN'), e('small', null, 'PREMIUM SILVER · PREMIUM GRAPHITE'))), sections, e('p', { className: 'gm-more-footer' }, 'Виртуальные GM и CR · GM TOKEN Premium'));
    }
    function Intro() {
        const e = React.createElement;
        const steps = [
            ['gm-coin-orbit', 'Добывай GM', 'Зайди в Майнинг и нажми на большую GM-монету, чтобы забрать накопленные виртуальные монеты.'],
            ['gift', 'Открывай боксы', 'Зарабатывай POINTS и обменивай их на боксы. Призы фиксированы и выдаются из игрового фонда.'],
            ['candlesticks', 'Знакомься с рынком', 'Следи за подтверждёнными игровыми сделками. POINTS зависят от исполненного объёма и антифрод-проверок.'],
            ['friends', 'Приглашай друзей', 'Поделись персональной ссылкой. Награды появляются только после подтверждённых действий друзей.']
        ];
        const step = steps[Math.max(0, Math.min(steps.length - 1, introStep))];
        const complete = () => { if (authenticatedUserId)
            store.setItem(onboardingKey(), '1'); navStack.current = []; setScreen('home'); };
        const ticks = steps.map((_, i) => e('i', { key: i, className: i <= introStep ? 'current' : '' }));
        const displayedLanguages = gmLanguages.filter(([code, label]) => (label.toLowerCase().includes(languageSearch.toLowerCase()) || code.includes(languageSearch.toLowerCase())));
        const chosenLanguage = gmLanguages.find(([code]) => code === locale)?.[1] || gmLanguages[0][1];
        const chooseLanguage = (code) => { setLocale(code); store.setItem('gm_lang', code); setLanguageOpen(false); setLanguageSearch(''); };
        const languagePicker = introStep === 0 ? e('div', { className: 'gm-intro-language gm-premium-card' }, e('label', { className: 'gm-intro-language-label' }, L('interfaceLanguage')), e('button', { type: 'button', className: 'gm-intro-lang-trigger', onClick: () => setLanguageOpen(!languageOpen), 'aria-expanded': languageOpen }, e('span', null, chosenLanguage), icon(languageOpen ? 'chevron-up' : 'chevron-down', 18)), languageOpen ? e('div', { className: 'gm-intro-lang-panel', role: 'group', 'aria-label': L('interfaceLanguage') }, e('input', { type: 'search', placeholder: 'Search / Поиск / Pesquisar', value: languageSearch, onChange: (ev) => setLanguageSearch(ev.target.value), 'aria-label': 'Search languages' }), e('div', { className: 'gm-intro-lang-results' }, displayedLanguages.map(([code, label]) => e('button', { key: code, type: 'button', className: 'gm-intro-lang-option ' + (locale === code ? 'selected' : ''), onClick: () => chooseLanguage(code) }, e('span', null, label), locale === code ? icon('check', 18) : null)))) : null) : null;
        const back = introStep > 0 ? e('button', { type: 'button', className: 'gm-intro-prev', onClick: () => setIntroStep(introStep - 1) }, L('back')) : null;
        return e('div', { className: 'gm-intro-v8' }, e('header', { className: 'gm-intro-header' }, e(Brand, { theme, size: 34 }), e('b', null, 'GM TOKEN'), e('button', { type: 'button', onClick: complete }, lang('skip'))), e('div', { className: 'gm-intro-progress' }, ticks), e('div', { className: 'gm-intro-art' }, e('div', { className: 'gm-intro-art-ring' }, icon(step[0], 114, true))), e('div', { className: 'gm-intro-copy' }, e('small', null, L('tutorialStep') + ' ' + (introStep + 1) + ' / 4'), e('h1', null, introStep === 0 ? L('welcome') : step[1]), e('p', null, step[2])), languagePicker, e('div', { className: 'gm-intro-actions' }, e('button', { type: 'button', className: 'gm-intro-next',
            onClick: () => introStep === steps.length - 1 ? complete() : setIntroStep(introStep + 1) }, introStep === steps.length - 1 ? lang('start') : lang('next'), icon('chevron-right', 20)), back));
    }
    function GuideOverlay() {
        if (!guideScreen || !guideCatalog[guideScreen])
            return null;
        const steps = guideCatalog[guideScreen];
        const step = steps[Math.min(guideStep, steps.length - 1)];
        const copy = guideText[step[3]];
        const description = copy?.[actualLang] || copy?.en || L(step[3]);
        const next = () => { if (guideStep + 1 >= steps.length)
            closeGuide();
        else
            setGuideStep(guideStep + 1); };
        const dimensions = guideSpot;
        const viewportWidth = window.innerWidth, viewportHeight = window.visualViewport?.height || window.innerHeight;
        return React.createElement("div", { className: "gm-tour-backdrop", role: "dialog", "aria-modal": "true", "aria-label": L('instruction') },
            dimensions ? React.createElement(React.Fragment, null,
                React.createElement("div", { className: "gm-tour-shade", style: { left: 0, top: 0, width: '100%', height: dimensions.top } }),
                React.createElement("div", { className: "gm-tour-shade", style: { left: 0, top: dimensions.top, width: dimensions.left, height: dimensions.height } }),
                React.createElement("div", { className: "gm-tour-shade", style: { left: dimensions.left + dimensions.width, top: dimensions.top, width: Math.max(0, viewportWidth - dimensions.left - dimensions.width), height: dimensions.height } }),
                React.createElement("div", { className: "gm-tour-shade", style: { left: 0, top: dimensions.top + dimensions.height, width: '100%', height: Math.max(0, viewportHeight - dimensions.top - dimensions.height) } }),
                React.createElement("div", { className: "gm-tour-spotlight", style: { left: dimensions.left, top: dimensions.top, width: dimensions.width, height: dimensions.height }, onClick: next },
                    React.createElement("span", { className: "gm-tour-pointer" }, "\u2193"))) : React.createElement("div", { className: "gm-tour-shade gm-tour-shade-full" }),
            React.createElement("div", { className: "gm-tour-card", style: dimensions ? { top: dimensions.cardTop } : undefined },
                React.createElement("div", { className: "gm-tour-step-content", key: guideStep },
                    React.createElement("div", { className: "gm-tour-head" },
                        React.createElement(Brand, { theme: theme, size: 37 }),
                        React.createElement("span", { className: "gm-tour-step-counter" },
                            L('tutorialStep'),
                            " ",
                            guideStep + 1,
                            " / ",
                            steps.length),
                        React.createElement("button", { type: "button", onClick: closeGuide, "aria-label": L('skip') }, icon('close', 19))),
                    React.createElement("div", { className: "gm-tour-guide-name" },
                        L('instruction'),
                        " \u00B7 GM TOKEN"),
                    React.createElement("h2", null, L(step[1])),
                    React.createElement("p", null, description),
                    React.createElement("div", { className: "gm-tour-hint" },
                        icon('info', 16),
                        " ",
                        actualLang === 'ru' ? 'Выделена нужная кнопка или область экрана.' : actualLang === 'uk' ? 'Підсвічено потрібну кнопку або ділянку.' : actualLang === 'pt' ? 'O botão ou a área relevante está destacado.' : 'The relevant button or area is highlighted.'),
                    React.createElement("div", { className: "gm-tour-track" }, steps.map((_, i) => React.createElement("i", { className: i <= guideStep ? 'active' : '', key: i }))),
                    React.createElement("div", { className: "gm-tour-actions" },
                        React.createElement("button", { type: "button", onClick: closeGuide }, L('skip')),
                        React.createElement("button", { type: "button", className: "gm-tour-primary", onClick: next },
                            guideStep + 1 >= steps.length ? L('finish') : L('next'),
                            icon('chevron-right', 18))))));
    }
    function Streak() { return React.createElement(React.Fragment, null,
        top('Daily Streak', true, 'flame'),
        React.createElement("div", { className: "referral-hero pearl-card" },
            icon('flame', 90, true),
            React.createElement("h1", null,
                wallet.streak,
                " \u0434\u043D\u0435\u0439"),
            React.createElement("p", null, "\u0421\u0435\u0440\u0438\u044F \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u044B\u0445 \u043F\u043E\u0441\u0435\u0449\u0435\u043D\u0438\u0439. \u041F\u043E\u0432\u0442\u043E\u0440\u043D\u043E\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0435 \u043D\u0430\u0433\u0440\u0430\u0434\u044B \u0432 \u043E\u0434\u0438\u043D \u0434\u0435\u043D\u044C \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u043E.")),
        React.createElement(GButton, { theme: theme, onClick: () => goto('reward') }, "\u0415\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u0430\u044F \u043D\u0430\u0433\u0440\u0430\u0434\u0430")); }
    if (demo) {
        return React.createElement("main", { className: 'application auth-page theme-' + theme },
            React.createElement("div", { className: "auth-ambient", "aria-hidden": "true" }),
            React.createElement("section", { className: "auth-gate pearl-card", "aria-labelledby": "auth-title" },
                React.createElement("div", { className: "auth-brand" },
                    React.createElement(Brand, { theme: theme, size: 78 }),
                    React.createElement("div", { className: "auth-brand-copy" },
                        React.createElement("span", null, "TELEGRAM MINI APP"),
                        React.createElement("h1", { id: "auth-title" }, "GM TOKEN"))),
                React.createElement("div", { className: "auth-divider" }),
                React.createElement("div", { className: "auth-status", role: "status" },
                    React.createElement("span", { className: "auth-status-dot", "aria-hidden": "true" }),
                    React.createElement("div", null,
                        React.createElement("strong", null, "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0432\u0445\u043E\u0434 \u0447\u0435\u0440\u0435\u0437 Telegram"),
                        React.createElement("p", null, backendStatus))),
                React.createElement("a", { className: "auth-cta", href: "https://t.me/gm_token_test_bot", onClick: openBot },
                    React.createElement("span", { className: "auth-cta-icon" },
                        React.createElement(Icon, { name: "telegram", theme: theme, size: 29 })),
                    React.createElement("span", { className: "auth-cta-copy" },
                        React.createElement("strong", null, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0447\u0430\u0442 \u0431\u043E\u0442\u0430"),
                        React.createElement("small", null, "@gm_token_test_bot")),
                    React.createElement(Icon, { name: "chevron-right", theme: theme, size: 22 })),
                React.createElement("div", { className: "auth-theme-row" },
                    React.createElement("span", null, "\u041E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435"),
                    React.createElement("div", { className: "auth-theme-toggle", role: "group", "aria-label": "\u0412\u044B\u0431\u043E\u0440 \u0442\u0435\u043C\u044B" },
                        React.createElement("button", { type: "button", className: theme === 'light' ? 'active' : '', "aria-pressed": theme === 'light', onClick: () => setTheme('light') },
                            React.createElement(Icon, { name: "diamond", theme: theme, size: 17 }),
                            "\u0421\u0432\u0435\u0442\u043B\u0430\u044F"),
                        React.createElement("button", { type: "button", className: theme === 'dark' ? 'active' : '', "aria-pressed": theme === 'dark', onClick: () => setTheme('dark') },
                            React.createElement(Icon, { name: "gm-coin-orbit", theme: theme, size: 17 }),
                            "\u0422\u0451\u043C\u043D\u0430\u044F"))),
                React.createElement("div", { className: "auth-privacy" },
                    React.createElement(Icon, { name: "shield-check", theme: theme, size: 22 }),
                    React.createElement("span", null, "\u0418\u0433\u0440\u043E\u0432\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0441\u043B\u0435 \u0437\u0430\u0449\u0438\u0449\u0451\u043D\u043D\u043E\u0433\u043E \u0432\u0445\u043E\u0434\u0430. \u0414\u0435\u043C\u043E\u0431\u0430\u043B\u0430\u043D\u0441\u043E\u0432 \u0437\u0434\u0435\u0441\u044C \u043D\u0435\u0442."))));
    }
    let view;
    switch (screen) {
        case 'home':
            view = Home();
            break;
        case 'trade':
            view = Trading();
            break;
        case 'earn':
            view = Earn();
            break;
        case 'tasks':
            view = Tasks();
            break;
        case 'leaderboard':
            view = Leaderboard();
            break;
        case 'profile':
            view = Profile();
            break;
        case 'reward':
            view = Reward();
            break;
        case 'splash':
            view = Splash();
            break;
        case 'intro':
            view = Intro();
            break;
        case 'mining':
            view = Mining();
            break;
        case 'vault':
            view = Vault();
            break;
        case 'wallet':
            view = WalletConnection();
            break;
        case 'shop':
            view = Shop();
            break;
        case 'boxes':
            view = Boxes();
            break;
        case 'referrals':
            view = Referrals();
            break;
        case 'history':
            view = History();
            break;
        case 'settings':
            view = Settings();
            break;
        case 'support':
            view = Support();
            break;
        case 'admin':
            view = ['owner', 'coowner'].includes(liveRole) ? Admin() : Home();
            break;
        case 'achievements':
            view = Achievements();
            break;
        case 'more':
            view = More();
            break;
        case 'streak':
            view = Streak();
            break;
        default: view = Home();
    }
    return React.createElement("div", { className: 'application theme-' + theme + (webapp?.initData ? ' is-telegram' : '') + (screen === 'splash' ? ' gm-splash-active' : '') },
        React.createElement("aside", { className: "desktop-toolbar" },
            React.createElement("div", { className: "toolbar-logo" },
                React.createElement(Brand, { theme: theme, size: 42 }),
                React.createElement("span", null,
                    React.createElement("b", null, "GM TOKEN"),
                    React.createElement("small", null, "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u044D\u0441\u043A\u0438\u0437\u044B \u00B7 \u0438\u043D\u0442\u0435\u0440\u0430\u043A\u0442\u0438\u0432\u043D\u0430\u044F \u0441\u0431\u043E\u0440\u043A\u0430"))),
            React.createElement("div", { className: "toolbar-tabs" },
                React.createElement("button", { onClick: () => setTheme('light'), className: isLight ? 'chosen' : '' }, "Light"),
                React.createElement("button", { onClick: () => setTheme('dark'), className: !isLight ? 'chosen' : '' }, "Dark")),
            React.createElement("div", { className: "toolbar-links" }, ['home', 'trade', 'earn', 'tasks', 'leaderboard', 'profile', 'mining', 'wallet', 'vault', 'shop', 'support', 'admin'].map(s => React.createElement("button", { key: s, className: screen === s ? 'chosen' : '', onClick: () => goto(s) }, s))),
            React.createElement("p", null, "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0435 PNG \u00B7 54 \u0438\u043A\u043E\u043D\u043A\u0438 \u00D7 4 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430 \u00B7 \u0431\u0435\u0437 \u043F\u043E\u0434\u043C\u0435\u043D\u044B \u0441\u0442\u043E\u0440\u043E\u043D\u043D\u0438\u043C\u0438 \u043F\u0438\u043A\u0442\u043E\u0433\u0440\u0430\u043C\u043C\u0430\u043C\u0438")),
        React.createElement("div", { className: "device-stage" },
            React.createElement("div", { className: 'phone-frame' + (screen === 'splash' ? ' gm-splash-frame' : '') },
                React.createElement("div", { className: 'phone-scroll ' + ((screen === 'splash') ? 'no-scroll gm-splash-host' : '') }, view),
                !['reward', 'splash', 'intro'].includes(screen) && bottom(),
                React.createElement("div", { className: "home-indicator" })),
            React.createElement("div", { className: "underphone" },
                React.createElement("span", { className: "demo-pill" }, 'Серверная авторизация · виртуальные GM/CR'),
                React.createElement("button", { onClick: () => goto('splash') }, "\u0417\u0430\u0441\u0442\u0430\u0432\u043A\u0430"),
                React.createElement("button", { onClick: () => goto('home') }, "Home"),
                React.createElement("button", { onClick: () => setTheme(isLight ? 'dark' : 'light') }, "\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u0442\u0435\u043C\u0443")),
            React.createElement("small", { className: "status-note" }, backendStatus)),
        toast && React.createElement("div", { className: 'toast-message ' + (/ошиб|недоступ|error|отмен/i.test(toast) ? 'toast-error' : 'toast-info'), role: "status", "aria-live": "polite" },
            React.createElement("span", { className: "gm-toast-icon" }, icon(/ошиб|недоступ|error|отмен/i.test(toast) ? 'info' : 'check', 21, true)),
            React.createElement("span", { className: "gm-toast-copy" }, toast),
            React.createElement("button", { type: "button", "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435", onClick: () => setToast('') }, icon('close', 18)),
            React.createElement("span", { className: "gm-toast-progress", "aria-hidden": "true" })),
        gmBalanceMenu && React.createElement("div", { className: "gm-balance-overlay", role: "presentation", onClick: () => setGmBalanceMenu(false) },
            React.createElement("div", { className: "gm-balance-sheet gm-premium-card", role: "dialog", "aria-modal": "true", "aria-label": "\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C GM", onClick: (ev) => ev.stopPropagation() },
                React.createElement("div", { className: "gm-balance-sheet-head" },
                    icon('gm-coin-orbit', 39, true),
                    React.createElement("div", null,
                        React.createElement("b", null, "\u041A\u0430\u043A \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C GM?"),
                        React.createElement("small", null, "\u0412\u044B\u0431\u0435\u0440\u0438 \u0443\u0434\u043E\u0431\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442")),
                    React.createElement("button", { type: "button", onClick: () => setGmBalanceMenu(false), "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" }, icon('close', 20))),
                React.createElement("button", { type: "button", className: "gm-balance-option", onClick: () => goto('mining') },
                    icon('lightning', 28, true),
                    React.createElement("span", null,
                        React.createElement("b", null, "\u041C\u0430\u0439\u043D\u0438\u043D\u0433 GM"),
                        React.createElement("small", null, "\u041D\u0430\u043A\u0430\u043F\u043B\u0438\u0432\u0430\u0439 \u0438\u0433\u0440\u043E\u0432\u044B\u0435 GM \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438")),
                    icon('chevron-right', 20)),
                React.createElement("div", { className: "gm-balance-option gm-balance-option-unavailable" },
                    icon('external-link', 28, true),
                    React.createElement("span", null,
                        React.createElement("b", null, "\u0412\u043D\u0435\u0448\u043D\u0438\u0439 \u0440\u044B\u043D\u043E\u043A GM"),
                        React.createElement("small", null, "\u041F\u043E\u043A\u0443\u043F\u043A\u0430 \u043F\u043E\u043A\u0430 \u043D\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430: \u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u043A\u043E\u043D\u0442\u0440\u0430\u043A\u0442 \u0438 \u0442\u043E\u0440\u0433\u043E\u0432\u0430\u044F \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0430 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u044B")),
                    icon('minus', 19)))),
        modal === 'boxReveal' ? BoxRevealModal() : modal && TradeOrderModal(),
        guideScreen && GuideOverlay());
}
// Offline renderer uses the bundled React 16.0 UMD (no built-in Hooks). A tiny
// isolated adapter keeps the same React/TSX source working in preview.html.
// When loaded with modern React (Vite production), native hooks are used.
if (typeof React.Fragment === 'undefined') {
    React.Fragment = function OfflineFragment(props) { return React.createElement('div', { style: { display: 'contents' } }, props.children); };
}
if (typeof React.useState !== 'function') {
    let active = null;
    React.useState = (initial) => {
        const owner = active, idx = owner.cursor++;
        if (!(idx in owner.slot))
            owner.slot[idx] = typeof initial === 'function' ? initial() : initial;
        return [owner.slot[idx], (next) => {
                owner.slot[idx] = typeof next === 'function' ? next(owner.slot[idx]) : next;
                owner.setState((old) => ({ tick: old.tick + 1 }));
            }];
    };
    React.useRef = (initial) => { const owner = active, idx = owner.cursor++; if (!(idx in owner.slot))
        owner.slot[idx] = { current: initial }; return owner.slot[idx]; };
    React.useEffect = (fn, deps) => {
        const owner = active, idx = owner.cursor++;
        let prev = owner.dependencies[idx];
        if (!prev || !deps || deps.some((x, i) => x !== prev[i])) {
            owner.dependencies[idx] = deps ? deps.slice() : undefined;
            owner.pending.push(fn);
        }
    };
    class OfflineHooks extends React.Component {
        slot = [];
        dependencies = [];
        pending = [];
        cursor = 0;
        constructor(props) { super(props); this.state = { tick: 0 }; }
        render() { active = this; this.cursor = 0; const el = App(); active = null; return el; }
        componentDidMount() { this.run(); }
        componentDidUpdate() { this.run(); }
        run() { const a = this.pending.splice(0); for (const f of a)
            f(); }
    }
    ReactDOM.render(React.createElement(OfflineHooks, null), document.getElementById('root'));
}
else {
    ReactDOM.render(React.createElement(App, null), document.getElementById('root'));
}
