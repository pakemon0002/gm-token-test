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
function Icon({ name, theme, size = 24, tile = false, alt = '', className = '' }) {
    return React.createElement("img", { className: 'gm-icon ' + className, src: `${A}${theme}/${tile ? 'tiles' : 'transparent'}/${name}.png`, width: size, height: size, alt: alt, draggable: "false", loading: "lazy" });
}
function Brand({ theme, size = 50 }) { return React.createElement("img", { className: "brand-coin", src: BRAND + (theme === 'light' ? 'gm-coin-light-original.png' : 'gm-coin-dark-original.png'), width: size, height: size, alt: "\u041B\u043E\u0433\u043E\u0442\u0438\u043F GM TOKEN", draggable: "false" }); }
function GButton({ children, onClick, light = false, disabled = false, icon, theme }) { return React.createElement("button", { type: "button", className: 'capsule ' + (light ? 'pale' : 'dark-cap'), onClick: onClick, disabled: disabled },
    icon && React.createElement(Icon, { name: icon, theme: theme, size: 22 }),
    React.createElement("span", null, children)); }
function SparkLine({ theme, compact = false }) {
    return React.createElement("div", { className: "real-data-empty", role: "status" }, "\u0413\u0440\u0430\u0444\u0438\u043A \u0431\u0430\u043B\u0430\u043D\u0441\u0430 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043D\u0430\u043A\u043E\u043F\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u043E\u0439 \u0438\u0441\u0442\u043E\u0440\u0438\u0438");
}
function Candles({ theme, candles = [], selected = null, onSelect = () => { } }) {
    if (!candles.length)
        return React.createElement("div", { className: "candles-empty" },
            React.createElement(Icon, { theme: theme, name: "candlesticks", size: 42 }),
            React.createElement("b", null, "\u0421\u0434\u0435\u043B\u043E\u043A \u0435\u0449\u0451 \u043D\u0435 \u0431\u044B\u043B\u043E"),
            React.createElement("small", null, "\u0421\u0432\u0435\u0447\u0438 \u0438 \u043E\u0431\u044A\u0451\u043C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0441\u043B\u0435 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0445 \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0445 \u043E\u0440\u0434\u0435\u0440\u043E\u0432 GM/CR. \u041D\u0438\u043A\u0430\u043A\u0438\u0445 \u043D\u0430\u0440\u0438\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0446\u0435\u043D."));
    const recent = candles.slice(-32);
    const all = recent.flatMap((c) => [c.low, c.high]);
    const min = Math.min(...all), max = Math.max(...all), span = Math.max(1, max - min);
    const vol = Math.max(1, ...recent.map((x) => x.volume_gm_cents));
    const xWidth = 320 / recent.length;
    const current = recent.find((c) => c.time === selected) || recent[recent.length - 1];
    const stamp = (sec) => new Date(sec * 1000).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const y = (price) => 16 + (max - price) / span * 165;
    return React.createElement(React.Fragment, null,
        React.createElement("div", { className: "candle-inspector", role: "status" },
            React.createElement("b", null, stamp(current.time)),
            React.createElement("span", null,
                "O ",
                nf(current.open / 100)),
            React.createElement("span", null,
                "H ",
                nf(current.high / 100)),
            React.createElement("span", null,
                "L ",
                nf(current.low / 100)),
            React.createElement("span", null,
                "C ",
                nf(current.close / 100)),
            React.createElement("small", null,
                "\u041E\u0431\u044A\u0451\u043C: ",
                nf(current.volume_gm_cents / 100),
                " GM \u00B7 ",
                current.trades,
                " \u0441\u0434\u0435\u043B\u043E\u043A")),
        React.createElement("svg", { className: "candles", role: "img", "aria-label": "\u0412\u044B\u0431\u0438\u0440\u0430\u0435\u043C\u044B\u0435 \u0441\u0432\u0435\u0447\u0438 OHLCV, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043D\u044B\u0435 \u0438\u0437 \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0445 \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0445 \u043E\u0440\u0434\u0435\u0440\u043E\u0432", viewBox: "0 0 360 265", preserveAspectRatio: "none" },
            [0, 1, 2, 3, 4].map(i => React.createElement("g", { key: i },
                React.createElement("line", { x1: "5", x2: "325", y1: 16 + i * 42, y2: 16 + i * 42, className: "chart-grid" }),
                React.createElement("text", { x: "330", y: 18 + i * 42, className: "price-label" }, nf((max - span * i / 4) / 100, 2)))),
            recent.map((c, i) => {
                const x = 5 + i * xWidth + 2, w = Math.max(2, xWidth - 3), positive = c.close >= c.open, col = positive ? '#54B39C' : '#CF7F91';
                return React.createElement("g", { key: c.time, onClick: () => onSelect(c.time), style: { cursor: 'pointer', opacity: selected !== null && selected !== c.time ? 0.72 : 1 } },
                    React.createElement("title", null, stamp(c.time) + ' · O ' + nf(c.open / 100) + ' H ' + nf(c.high / 100) + ' L ' + nf(c.low / 100) + ' C ' + nf(c.close / 100) + ' · ' + nf(c.volume_gm_cents / 100) + ' GM'),
                    React.createElement("line", { x1: x + w / 2, x2: x + w / 2, y1: y(c.high), y2: y(c.low), stroke: col, strokeWidth: "1.5" }),
                    React.createElement("rect", { x: x, y: Math.min(y(c.open), y(c.close)), width: w, height: Math.max(2, Math.abs(y(c.open) - y(c.close))), fill: col }),
                    React.createElement("rect", { x: x, y: 258 - (c.volume_gm_cents / vol) * 54, width: w, height: (c.volume_gm_cents / vol) * 54, fill: col, opacity: ".66" }));
            }),
            [0, Math.floor((recent.length - 1) / 2), recent.length - 1].filter((x, i, a) => a.indexOf(x) === i).map(i => React.createElement("text", { key: 'time-' + i, x: 5 + i * xWidth, y: "197", className: "time-label" }, new Date(recent[i].time * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })))));
}
function BarButton({ name, title, theme, selected = false, onClick }) { return React.createElement("button", { className: 'nav-entry ' + (selected ? 'active' : ''), onClick: onClick, "aria-label": title, "aria-current": selected ? 'page' : undefined },
    React.createElement(Icon, { theme: theme, name: name, size: 23 }),
    React.createElement("span", null, title)); }
function App() {
    const webapp = window.Telegram?.WebApp;
    const openBot = (ev) => {
        ev?.preventDefault?.();
        const url = 'https://t.me/gm_token_test_bot';
        if (webapp?.openTelegramLink) {
            try {
                webapp.openTelegramLink(url);
                if (typeof webapp.close === 'function')
                    window.setTimeout(() => { try { webapp.close(); } catch { } }, 700);
                return;
            } catch { }
        }
        window.location.assign(url);
    };
    const [theme, setTheme] = React.useState((store.getItem('gm_theme') || webapp?.colorScheme || 'light') === 'dark' ? 'dark' : 'light');
    const [screen, setScreen] = React.useState('home');
    const [wallet, setWallet] = React.useState(firstWallet);
    const [toast, setToast] = React.useState('');
    const [period, setPeriod] = React.useState('1h');
    const [selectedCandle, setSelectedCandle] = React.useState(null);
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
    const [shopQuote, setShopQuote] = React.useState(null);
    const [orderType, setOrderType] = React.useState('limit');
    const [orderPrice, setOrderPrice] = React.useState('');
    const [orderDuration, setOrderDuration] = React.useState('24h');
    const [tradeReady, setTradeReady] = React.useState(false);
    const [serverHistory, setServerHistory] = React.useState([]);
    const [demo, setDemo] = React.useState(true);
    const [liveRole, setLiveRole] = React.useState('player');
    const [adminId, setAdminId] = React.useState('');
    const [adminCode, setAdminCode] = React.useState('');
    const [adminAction, setAdminAction] = React.useState('grant');
    const [adminTeam, setAdminTeam] = React.useState([]);
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
    const [testAmount, setTestAmount] = React.useState('1000');
    const [testReason, setTestReason] = React.useState('Начисление виртуальных GM/CR для проверки торговой системы');
    const [testCode, setTestCode] = React.useState('');
    const [testBusy, setTestBusy] = React.useState(false);
    const [backendStatus, setBackendStatus] = React.useState('Проверяем вход через Telegram…');
    const [modal, setModal] = React.useState('');
    const [modalText, setModalText] = React.useState('');
    const toastRef = React.useRef(0);
    const flash = (msg) => { setToast(msg); toastRef.current++; };
    const setW = (patch) => setWallet((w) => ({ ...w, ...(typeof patch === 'function' ? patch(w) : patch) }));
    const goto = (s) => { setScreen(s); try {
        history.pushState(null, '', '#' + s);
    }
    catch { } ; document.querySelector('.phone-scroll')?.scrollTo(0, 0); };
    React.useEffect(() => { try {
        store.setItem('gm_theme', theme);
    }
    catch { } ; webapp?.setBackgroundColor?.(theme === 'dark' ? '#030406' : '#E8EAF4'); }, [theme]);
    React.useEffect(() => { try {
        window.localStorage.removeItem('gm_demo_wallet');
    }
    catch { } }, []);
    React.useEffect(() => { const timer = setInterval(() => setClock(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(timer); }, []);
    React.useEffect(() => { webapp?.ready?.(); webapp?.expand?.(); const init = webapp?.initData; if (!init) {
        setBackendStatus('Открой Mini App через @gm_token_test_bot: вход в браузере без Telegram отключён');
        return;
    } fetch('/api/bootstrap', { headers: { 'Authorization': `tma ${init}` } }).then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) {
            const reason = String(d?.error || '');
            if (/signature mismatch/i.test(reason))
                throw Error('Подпись Telegram не совпадает с токеном бота на сервере. Проверь BOT_TOKEN для @gm_token_test_bot в Render.');
            if (/expired|invalid initData/i.test(reason))
                throw Error('Данные Telegram устарели. Закрой Mini App и открой её кнопкой бота.');
            throw Error('Сервер отклонил вход (HTTP ' + r.status + '). ' + (reason || 'Повтори вход через Telegram.'));
        } setDemo(false); setLiveRole(d.user?.role || 'player'); setBackendStatus(`Telegram аккаунт: ${d.user?.id || 'подтверждён'}`); if (d.wallet)
        setW((w) => ({ ...w, gm: d.wallet.gm / 100, cr: d.wallet.cr / 100, vault: d.wallet.vault / 100, level: d.user.level, xp: d.user.xp })); }).catch((e) => { setDemo(true); setBackendStatus('Ошибка авторизации Telegram. Попробуй открыть бот заново. ' + String(e.message || '')); }); }, []);
    const api = async (path, payload) => {
        const init = webapp?.initData;
        if (!init) {
            flash('Открой приложение внутри Telegram через @gm_token_test_bot');
            return null;
        }
        try {
            const r = await fetch(path, { method: payload ? 'POST' : 'GET', headers: { Authorization: 'tma ' + init, 'Content-Type': 'application/json' }, body: payload ? JSON.stringify(payload) : undefined });
            const d = await r.json();
            if (!r.ok)
                throw Error(d.error || 'Ошибка сервера');
            return d;
        }
        catch (e) {
            flash('Ошибка: ' + (e.message || e));
            return null;
        }
    };
    const refreshLive = async () => { if (!webapp?.initData)
        return; const d = await api('/api/game/status'); if (!d)
        return; setLiveState(d); setW((w) => ({ ...w, gm: d.wallet.gm / 100, cr: d.wallet.cr / 100, vault: d.wallet.vault / 100, storage: d.mining.pending_cents / 100, level: d.user?.level || w.level, xp: d.user?.xp ?? w.xp })); const [orders, book, tasks, achievements, refs, ranks, ticker, chart, trades] = await Promise.all([api('/api/exchange/orders'), api('/api/exchange/book'), api('/api/tasks'), api('/api/achievements'), api('/api/referrals/me'), api('/api/leaderboard'), api('/api/market/ticker'), api('/api/market/ohlcv?interval=' + period), api('/api/exchange/trades')]); if (orders)
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
        flash('Операция подтверждена сервером');
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
            flash('Операция выполнена');
            return x;
        }
        catch (e) {
            flash('Ошибка: ' + String(e.message || e));
            return null;
        }
    };
    const adminChangeRole = () => adminRequest('/api/admin/moderators', { telegramId: adminId, code: adminCode, action: adminAction }).then(() => adminRequest('/api/admin/team').then(x => x && setAdminTeam(x.team || [])));
    const adminTransfer = () => adminRequest('/api/admin/transfer', { source: adminFrom, target: adminTo, amount: adminAmount, code: adminCode, reason: adminReason, operationId: cryptoId() }).then(() => adminRequest('/api/admin/pools').then(x => x && setAdminFunds(x.pools || [])));
    const adminCorrection = () => adminRequest('/api/admin/correction', { userId: adminId, sourcePool: adminCorrectionPool, currency: adminCorrectionCurrency, amount: adminAmount, direction: 'credit', ticket: adminTicket, code: adminCode, reason: adminReason, operationId: cryptoId() });
    const testGrant = async () => { if (testBusy) return; setTestBusy(true);
        try {
            const out = await adminRequest('/api/admin/test-grant', { recipient: testRecipient, userId: testRecipient === 'id' ? testUserId : undefined, currency: testCurrency, amount: testAmount, reason: testReason, code: testCode, operationId: cryptoId() });
            if (out?.ok) { setTestCode(''); flash('Начислено ' + testAmount + ' ' + testCurrency + ' игроку ' + out.userId); await refreshLive(); }
        } finally { setTestBusy(false); }
    };
    function cryptoId() { return (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : 'manual-' + Date.now() + '-' + Math.floor(Math.random() * 999999); }
    const todayClaim = async () => { const x = await gameAction('/api/daily/claim'); if (x)
        goto('reward'); };
    const miningClaim = async () => { await gameAction('/api/mining/claim'); };
    const depositVault = async () => { await gameAction('/api/vault/deposit', { amount: vaultAmount.replace(',', '.') }); };
    const withdrawVault = async () => { await gameAction('/api/vault/withdraw', { amount: vaultAmount.replace(',', '.') }); };
    const submitOrder = async () => { const request = { type: orderType, side, amount: amount.replace(',', '.'), price: orderPrice.replace(',', '.'), duration: orderDuration }; const x = await gameAction('/api/exchange/order', request); if (x) {
        setModal('');
        setTradeReady(false);
        flash(x.auction ? 'Предварительная заявка принята на аукцион' : 'Подтверждённый сервером ордер');
    } };
    const cancelLiveOrder = async (id) => { await gameAction('/api/exchange/cancel', { orderId: id }); };
    const loadHistory = async () => { const x = await api('/api/history'); if (x)
        setServerHistory(x.events || []); };
    const tradePreview = () => { const n = Number(amount.replace(',', '.')); if (orderType === 'limit' && (!(Number(orderPrice) > 0) || !Number.isFinite(Number(orderPrice)))) {
        flash('Укажи цену Limit-заявки в CR за 1 GM');
        return;
    } if (!(n >= 10)) {
        flash('Минимум нового ордера — 10 GM');
        return;
    } setModalText(`${side === 'buy' ? 'Покупка' : 'Продажа'} ${nf(n)} GM, ${orderType === 'limit' ? 'лимит ' + orderPrice + ' CR/GM' : 'рыночная цена ±3%'}. Комиссия: 0,5% с обеих сторон. Подтверди отправку на сервер.`); setTradeReady(true); setModal('order'); };
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
            await loadTickets();
        }
    };
    const icon = (n, size = 23, tile = false) => React.createElement(Icon, { name: n, theme: theme, size: size, tile: tile });
    const isLight = theme === 'light';
    const top = (title, back = true, right = 'more') => React.createElement("header", { className: 'screen-header ' + (!isLight ? 'dark-head' : '') },
        React.createElement("button", { className: "header-icon", "aria-label": "\u041D\u0430\u0437\u0430\u0434", onClick: () => back ? goto('home') : flash('Меню') }, back ? icon('chevron-left', 24) : React.createElement(Brand, { theme: theme, size: 35 })),
        React.createElement("strong", null, title),
        React.createElement("button", { className: "header-icon", onClick: () => right === 'settings' ? goto('settings') : goto('more'), "aria-label": "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F" }, icon(right, 23)));
    const menuItems = [['home', 'home', 'Home'], ['trade', 'candlesticks', 'Trade'], ['earn', isLight ? 'gift' : 'settings', isLight ? 'Tasks' : 'Earn'], ['profile', 'profile', 'Profile']];
    const bottom = () => React.createElement("nav", { className: "bottom-nav", "aria-label": "\u041E\u0441\u043D\u043E\u0432\u043D\u044B\u0435 \u0440\u0430\u0437\u0434\u0435\u043B\u044B" }, menuItems.map(([s, i, t]) => React.createElement(BarButton, { key: s, name: i, theme: theme, title: t, selected: screen === s || (isLight && s === 'earn' && screen === 'tasks') || (!isLight && s === 'earn' && screen === 'tasks'), onClick: () => goto(s === 'earn' && isLight ? 'tasks' : s) })));
    
 function Home(){
  const e=React.createElement;
  const isPremarket=!!liveTicker?.premarket;
  const dailyEnabled=!!liveState?.config?.daily_enabled;
  const pointBalance=liveState?.points?.points??0;
  const rate=liveState?.mining?.rate_cents_day!=null?liveState.mining.rate_cents_day/100:gmRate(wallet);
  const shortcuts=e('div',{className:'quick-grid home-quick-grid','aria-label':'Быстрые действия'},
   [['candlesticks','Trade','trade'],['gift','Earn','earn'],['friends','Invite','referrals'],['more','More','more']].map(([i,t,s])=>
    e('button',{type:'button',className:'quick-card '+(isLight?'pearl-card':'metallic-card'),key:t,onClick:()=>goto(s)},
      icon(i,28),e('span',null,t))));
  const mining=e('button',{type:'button',className:'home-mining-card '+(isLight?'pearl-card':'metallic-card'),onClick:()=>goto('mining')},
    e('span',{className:'home-mining-icon'},icon('lightning',36,true)),
    e('span',{className:'home-mining-text'},e('strong',null,'Mining · добыча GM'),e('small',null,'Уровень '+wallet.level+' · '+nf(rate,2)+' GM/сутки'),e('small',{className:'home-mining-sub'},'Накоплено: '+nf(wallet.storage,2)+' GM · открой и забери')),
    icon('chevron-right',21));
  const pointGuide=e('section',{className:'home-guide '+(isLight?'pearl-card':'metallic-card'),'aria-label':'Как заработать GM и POINTS'},
    e('div',{className:'home-guide-title'},icon('diamond',30),
      e('div',null,e('strong',null,'Как получать GM и POINTS'),e('small',null,'Игровые награды без придуманных начислений'))),
    e('div',{className:'home-guide-steps'},
      e('div',null,e('b',null,'01'),e('span',null,'Добывай GM через Mining и нажимай Claim.')),
      e('div',null,e('b',null,'02'),e('span',null,'Торгуй GM/CR: POINTS начисляются только после исполнения ордера.')),
      e('div',null,e('b',null,'03'),e('span',null,'Обменивай POINTS на коробки GM Boxes после утверждения наград.'))),
    e('p',{className:'home-guide-rule'},'10 POINTS за каждые 10 000 GM исполненного объёма · максимум 1 000 POINTS/сутки. Подозрительные сделки не засчитываются.'),
    isPremarket?e('p',{className:'home-guide-market-note'},'Сейчас Premarket: сделки ещё не исполняются, POINTS не начисляются.'):null,
    e('div',{className:'home-guide-footer'},
       e('span',null,'Твои POINTS: ',e('b',null,String(pointBalance))),
       e('button',{type:'button',onClick:()=>goto('boxes')},'GM Boxes ',icon('chevron-right',16))));
  const lightHome=e(React.Fragment,null,
    e('header',{className:'home-header'},e('span',{className:'hbrand'},e(Brand,{theme,size:38}),e('b',null,'GM TOKEN')),
       e('button',{type:'button',className:'header-icon',onClick:()=>goto('settings'),'aria-label':'Настройки'},icon('settings',24))),
    e('div',{className:'balance-glass pearl-card'},
       e('div',{className:'balance-top'},e('div',null,e('small',null,'Your Balance'),
         e('div',{className:'balance-numeral'},nf(wallet.gm,0),e('span',null,' GM')),
         e('span',{className:'neutral-change'},'Подтверждённый баланс GM')),
         e('div',{className:'balance-graph-icon'},icon('bar-chart',41))),
       e('button',{className:'home-graph-link',type:'button',onClick:()=>goto('trade')},'Открыть график GM/CR ',icon('chevron-right',16))),
    mining,
    e('button',{type:'button',className:'collect-claim',onClick:()=>goto('reward')},
       e('div',{className:'claim-electric'},icon('gift',31)),
       e('span',null,e('strong',null,'Daily Reward'),e('small',null,dailyEnabled?'Ежедневная награда GM':'Награды пока не включены')),
       icon('chevron-right',23)),
    e('button',{type:'button',className:'streak-card pearl-card',onClick:()=>goto('streak')},icon('flame',46),
       e('span',null,e('b',null,'Daily Streak'),e('span',{className:'streak-count'},wallet.streak,' дней')),icon('chevron-right',22)),
    shortcuts,pointGuide);
  const darkHome=e(React.Fragment,null,
    e('header',{className:'dark-top'},e('b',null,'GM TOKEN'),e('button',{type:'button',onClick:()=>goto('settings')},icon('settings',23))),
    e('div',{className:'orbit-hero'},e(Brand,{theme:'dark',size:93}),e('span',{className:'planet-ring'})),
    e('div',{className:'dark-balance'},e('div',null,nf(wallet.gm,0),e('span',{className:'currency-mark'},' GM')),
      e('p',{className:'neutral-change'},'Подтверждённый баланс GM')),
    e('div',{className:'dark-spark'},
       e(SparkLine,{theme:'dark'}),
       e('button',{type:'button',onClick:()=>goto('trade')},'График GM/CR ',icon('chevron-right',15))),
    mining,
    e('button',{type:'button',className:'dark-reward metallic-card',onClick:()=>goto('reward')},
       icon('gift',30),e('span',null,e('b',null,'Daily Reward'),
       e('small',null,dailyEnabled?'Ежедневная награда GM':'Награды пока не включены')),icon('chevron-right',19)),
    e('button',{type:'button',className:'dark-streak metallic-card',onClick:()=>goto('streak')},
       icon('flame',44),e('span',null,e('b',null,'Daily Streak'),e('strong',null,wallet.streak,' дней')),icon('chevron-right',20)),
    shortcuts,pointGuide);
  return isLight?lightHome:darkHome;
 }
 function Trading() {
        const pre = liveTicker?.premarket ?? !liveBook?.auction_done;
        const remain = Math.max(0, (liveTicker?.auction_end_at || liveBook?.auction_end_at || 0) - clock);
        const countdown = [Math.floor(remain / 3600), Math.floor(remain % 3600 / 60), remain % 60].map(x => String(x).padStart(2, '0')).join(':');
        const p = liveTicker?.last_price;
        const bid = liveTicker?.best_bid, ask = liveTicker?.best_ask;
        const book = liveBook || { bids: [], asks: [] };
        return React.createElement(React.Fragment, null,
            top('GM/CR · Биржа', true, 'bar-chart'),
            React.createElement("div", { className: "trade-meta" },
                React.createElement("b", null, pre ? 'PREMARKET · предварительные заявки' : liveTicker?.trade_test_mode ? 'ТЕСТОВЫЙ SPOT · GM/CR' : 'SPOT · игровой GM/CR'),
                React.createElement("span", null, pre ? `До открытия ${countdown}` : 'Торговля активна')),
            React.createElement("div", { className: "market-price-panel pearl-card" },
                React.createElement("small", null, pre ? 'Предварительная цена (не сделка)' : 'Последняя подтверждённая цена'),
                React.createElement("div", { className: "price-big" },
                    pre ? (liveTicker?.indicative?.price ? nf(liveTicker.indicative.price / 100) : '—') : (p ? nf(p / 100) : '—'),
                    " ",
                    React.createElement("small", null, "CR / GM")),
                React.createElement("div", { className: "market-metrics" },
                    React.createElement("span", null,
                        "\u041E\u0431\u044A\u0451\u043C 24 \u0447: ",
                        React.createElement("b", null,
                            nf((liveTicker?.volume_24h_gm_cents || 0) / 100),
                            " GM")),
                    React.createElement("span", null,
                        "\u0421\u0434\u0435\u043B\u043E\u043A: ",
                        React.createElement("b", null, liveTicker?.trades_24h || 0))),
                React.createElement("small", null, pre ? 'Примерный объём на аукционе: ' + nf((liveTicker?.indicative?.volume_gm_cents || 0) / 100) + ' GM · не исполнен' : liveTicker?.trade_test_mode ? 'Тестовая торговля открыта. Цена и объём появятся после настоящих сделок.' : 'Цена и объём только по реально исполненным проверенным ордерам')),
            React.createElement("div", { className: "intervals" }, ['1m', '5m', '15m', '1h', '4h', '1d'].map(i => React.createElement("button", { className: period === i ? 'on' : '', key: i, onClick: () => setPeriod(i) }, i))),
            React.createElement(Candles, { theme: theme, candles: liveCandles, selected: selectedCandle, onSelect: setSelectedCandle }),
            React.createElement("p", { className: "disclaimer" }, pre ? 'Первые 24 часа — только предварительные Limit-заявки. Фактический объём равен нулю, пока сделки не исполняются.' : 'OHLCV получен из реальных сделок. Подозрительные сделки исключаются из доверенных свечей; это не биржа реальных денег.'),
            React.createElement("div", { className: "market-book pearl-card" },
                React.createElement("b", null, "\u0421\u0442\u0430\u043A\u0430\u043D \u0437\u0430\u044F\u0432\u043E\u043A \u00B7 GM / CR"),
                React.createElement("div", { className: "book-columns" },
                    React.createElement("div", null,
                        React.createElement("strong", null, "\u041F\u043E\u043A\u0443\u043F\u043A\u0438"),
                        book.bids.length ? book.bids.slice(0, 8).map((o) => React.createElement("div", { className: "book-level buy", key: 'b' + o.limit_price },
                            React.createElement("span", null, nf(o.limit_price / 100)),
                            React.createElement("span", null,
                                nf(o.gm_cents / 100),
                                " GM"))) : React.createElement("small", null, "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0437\u0430\u044F\u0432\u043E\u043A")),
                    React.createElement("div", null,
                        React.createElement("strong", null, "\u041F\u0440\u043E\u0434\u0430\u0436\u0438"),
                        book.asks.length ? book.asks.slice(0, 8).map((o) => React.createElement("div", { className: "book-level sell", key: 'a' + o.limit_price },
                            React.createElement("span", null, nf(o.limit_price / 100)),
                            React.createElement("span", null,
                                nf(o.gm_cents / 100),
                                " GM"))) : React.createElement("small", null, "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0437\u0430\u044F\u0432\u043E\u043A"))),
                React.createElement("small", null,
                    "\u041B\u0443\u0447\u0448\u0430\u044F \u043F\u043E\u043A\u0443\u043F\u043A\u0430: ",
                    bid ? nf(bid / 100) : '—',
                    " CR \u00B7 \u043F\u0440\u043E\u0434\u0430\u0436\u0430: ",
                    ask ? nf(ask / 100) : '—',
                    " CR")),
            React.createElement("div", { className: "pair-trade-buttons" },
                React.createElement("button", { onClick: () => { setSide('buy'); setOrderType('limit'); setModal('tradeForm'); } }, "Buy GM"),
                React.createElement("button", { onClick: () => { setSide('sell'); setOrderType('limit'); setModal('tradeForm'); } }, "Sell GM")),
            React.createElement("div", { className: "form-surface pearl-card" },
                React.createElement("b", null, "\u041C\u043E\u0438 \u0437\u0430\u044F\u0432\u043A\u0438"),
                liveOrders.filter((o) => o.status === 'open').slice(0, 20).map((o) => React.createElement("div", { key: o.id, className: "split-line" },
                    React.createElement("span", null,
                        o.side === 'buy' ? 'Buy' : 'Sell',
                        " \u00B7 ",
                        nf(o.remaining_cents / 100),
                        " GM \u00B7 ",
                        nf(o.limit_price / 100),
                        " CR"),
                    React.createElement("button", { onClick: () => cancelLiveOrder(o.id) }, "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C"))),
                !liveOrders.some((o) => o.status === 'open') && React.createElement("small", null, "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0437\u0430\u044F\u0432\u043E\u043A \u043D\u0435\u0442"),
                React.createElement("button", { className: "small-button", onClick: refreshLive }, "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0430\u043A\u0430\u043D")),
            !pre && React.createElement("div", { className: "form-surface pearl-card" },
                React.createElement("b", null, "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u0441\u0434\u0435\u043B\u043A\u0438"),
                recentTrades.map((t, i) => React.createElement("div", { key: i, className: "split-line" },
                    React.createElement("span", null,
                        nf(t.price / 100),
                        " CR"),
                    React.createElement("span", null,
                        nf(t.amount_cents / 100),
                        " GM"))),
                !recentTrades.length && React.createElement("small", null, "\u0421\u0434\u0435\u043B\u043E\u043A \u043F\u043E\u043A\u0430 \u043D\u0435\u0442")));
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
    function Tasks() { return React.createElement(React.Fragment, null,
        isLight ? top('Tasks', true, 'tasks') : React.createElement("header", { className: "dark-top" },
            React.createElement("b", null, "GM TOKEN"),
            React.createElement("button", { onClick: () => goto('settings') },
                icon('more', 23),
                " ",
                icon('close', 17))),
        !isLight && React.createElement("button", { className: "task-promo metallic-card", onClick: () => flash('Бонусы доступны только после проверки условий') },
            icon('tasks', 55),
            React.createElement("b", null,
                "Complete tasks",
                React.createElement("br", null),
                "and earn GM")),
        React.createElement("div", { className: "task-tabs" }, ['All', 'Social', 'Crypto', 'Other'].map(x => React.createElement("button", { className: taskFilter === x ? 'on' : '', key: x, onClick: () => setTaskFilter(x) }, x))),
        isLight && React.createElement("button", { className: "task-promo pearl-card", onClick: () => flash('Задания появятся после подтверждения условий на сервере') },
            icon('gift', 54),
            React.createElement("b", null,
                "Complete tasks",
                React.createElement("br", null),
                "and earn GM"),
            icon('chevron-right', 20)),
        React.createElement("div", { className: "tasks-list" }, (liveTasks.map((t) => ({ key: t.id, icon: t.icon || 'tasks', title: t.title || t.id, reward: `${t.gm || 0} GM · ${t.xp || 0} XP`, category: t.category || 'Other', desc: t.description || '', available: t.available, claimed: t.claimed }))).filter((t) => taskFilter === 'All' || taskFilter === t.category).map(t => React.createElement("div", { className: 'task-row ' + (isLight ? 'pearl-card' : 'metallic-card'), key: t.key },
            icon(t.icon, 40, true),
            React.createElement("span", null,
                React.createElement("b", null, t.title),
                React.createElement("small", { className: "green" }, t.reward)),
            React.createElement("button", { disabled: !demo && (t.claimed || !t.available), onClick: async () => { if (demo) {
                    if (t.key === 'vault')
                        goto('vault');
                    else
                        flash(t.desc);
                    return;
                } const x = await gameAction('/api/tasks/claim', { id: t.key }); if (x)
                    await refreshLive(); } }, demo ? 'Start' : t.claimed ? 'Получено' : t.available ? 'Получить' : 'Не выполнено')))),
        isLight && React.createElement("button", { className: "premium-box pearl-card", onClick: () => flash('Premium Tasks: функция не утверждена для запуска') },
            icon('diamond', 40),
            React.createElement("span", null,
                React.createElement("b", null, "Premium Tasks"),
                React.createElement("small", null, "\u041F\u043E\u043A\u0430 \u043D\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E")),
            icon('chevron-right', 21))); }
    function Leaderboard() { const users = (liveRanks?.users || []).filter((u) => rankFilter === 'Global' || (liveReferrals?.referred || []).some((r) => r.user_id === u.id)); return React.createElement(React.Fragment, null,
        top('Leaderboard', true, 'trophy'),
        React.createElement("div", { className: "rank-tabs" },
            React.createElement("button", { onClick: () => setRankFilter('Global'), className: rankFilter === 'Global' ? 'on' : '' }, "Global"),
            React.createElement("button", { onClick: () => setRankFilter('Friends'), className: rankFilter === 'Friends' ? 'on' : '' }, "Friends")),
        React.createElement("div", { className: "leader-rows" }, users.map((u, i) => React.createElement("div", { className: "leader-row", key: u.id },
            React.createElement("b", null, i + 1),
            icon('profile', 27),
            React.createElement("span", null, clean(u.username || 'Игрок')),
            React.createElement("small", null,
                nf(u.score_cents / 100),
                " GM")))),
        users.length === 0 && React.createElement("p", { className: "disclaimer" }, liveRanks?.pending_rule ? 'Рейтинг ещё не включён: формула не утверждена. Фальшивых участников нет.' : 'Пока нет игроков в выбранном списке.')); }
    function Profile() { return React.createElement(React.Fragment, null,
        isLight ? React.createElement("header", { className: "profile-top" },
            React.createElement("span", null),
            React.createElement("button", { className: "header-icon", onClick: () => goto('settings') }, icon('settings', 25))) : React.createElement("header", { className: "dark-top" },
            React.createElement("b", null, "GM TOKEN"),
            React.createElement("button", { onClick: () => goto('settings') },
                icon('more', 20),
                " ",
                icon('close', 17))),
        React.createElement("div", { className: "profile-hero" },
            React.createElement(Brand, { theme: theme, size: isLight ? 103 : 98 }),
            React.createElement("h2", null, webapp?.initDataUnsafe?.user?.username || webapp?.initDataUnsafe?.user?.first_name || 'Игрок'),
            React.createElement("p", null,
                "#",
                String(webapp?.initDataUnsafe?.user?.id || ''),
                " ",
                React.createElement("button", { className: "inline-icon", onClick: () => { navigator.clipboard?.writeText(String(webapp?.initDataUnsafe?.user?.id || '')); flash('ID скопирован'); } }, icon('copy', 15)))),
        React.createElement("div", { className: "xp-area" },
            React.createElement("div", { className: "xp-line" },
                React.createElement("b", null,
                    "Lv. ",
                    wallet.level),
                React.createElement("small", null,
                    nf(wallet.xp, 0),
                    " / ",
                    nf(xpThreshold[Math.min(wallet.level, 9)] || 4400, 0),
                    " XP")),
            React.createElement("div", { className: "progress" },
                React.createElement("div", { style: { width: (Math.min(100, 100 * wallet.xp / (xpThreshold[Math.min(wallet.level, 9)] || 4400))) + '%' } }))),
        React.createElement("div", { className: "stats-grid" }, [['friends', String(liveReferrals?.referred?.length || 0), 'Friends'], ['wallet', nf(wallet.gm, 0), 'Balance'], ['lightning', String(wallet.streak), 'Streak']].map(([i, n, label]) => React.createElement("div", { className: "stat-card", key: label },
            icon(i, 23),
            React.createElement("b", null, n),
            React.createElement("small", null, label)))),
        React.createElement("div", { className: "profile-menu" }, [['trophy', 'Achievements', 'achievements'], ['friends', 'Referral Program', 'referrals'], ['clock', 'Transaction History', 'history'], ['settings', 'Settings', 'settings'], ['info', 'Support', 'support']].map(([i, t, s]) => React.createElement("button", { key: t, onClick: () => goto(s) },
            icon(i, 21),
            React.createElement("span", null, t),
            icon('chevron-right', 18)))),
        isLight && React.createElement("button", { className: "logout", onClick: () => flash('Закрой Mini App в Telegram для выхода') },
            icon('logout', 20),
            " Log Out")); }
    
 function Reward(){
  const e=React.createElement;
  const enabled=!!liveState?.config?.daily_enabled;
  const claimed=wallet.lastClaim===todayUTC();
  const streak=Math.max(0,wallet.streak||0);
  return e('div',{className:'reward-view reward-v2'},
    e('button',{type:'button',className:'reward-close',onClick:()=>goto('home'),'aria-label':'Закрыть Daily Reward'},icon('close',23)),
    e('div',{className:'reward-kicker'},icon('gift',20),e('span',null,'GM TOKEN · DAILY')),
    e('div',{className:'reward-hero-v2'},
      e('div',{className:'reward-coin-v2'},e(Brand,{theme,size:116})),
      e('h1',null,'Daily Reward'),
      e('p',null,claimed?'Награда за сегодня уже получена.':enabled?'Возвращайся каждый день за подтверждённой игровой наградой.':'Награды пока отключены: размер ежедневной выдачи GM ещё не утверждён.')),
    e('section',{className:'reward-streak-panel '+(isLight?'pearl-card':'metallic-card')},
       e('div',{className:'reward-streak-head'},e('div',null,e('small',null,'DAILY STREAK'),e('strong',null,streak,' дней')),icon('flame',29)),
       e('div',{className:'reward-week','aria-label':'Семидневная серия посещений'},
          [1,2,3,4,5,6,7].map(n=>e('div',{key:n,className:'reward-day '+(n<=Math.min(streak,7)?'complete':'')},
             e('span',null,'Д',n),n<=Math.min(streak,7)?icon('check',17):e('b',null,n)))),
       e('p',null,'Серия отображает подтверждённую активность. Суммы наград не показываем, пока их правила не утверждены.')),
    e('div',{className:'reward-actions'},
      e('button',{type:'button',className:'reward-main-action',disabled:!enabled||claimed,onClick:todayClaim},
        icon(claimed?'check':'gift',23),claimed?'Получено сегодня':enabled?'Забрать награду':'Награда пока недоступна'),
      e('button',{type:'button',className:'reward-secondary-action',onClick:()=>goto('mining')},
        icon('lightning',21),'Перейти к Mining',icon('chevron-right',18))),
    e('p',{className:'reward-explainer'},'GM можно добывать через Mining уже сейчас. Daily Reward заработает после согласования размера награды и правил серии.'));
 }
 function Splash() { return React.createElement("div", { className: "splash-view" },
        React.createElement("div", { className: "splash-glow" }),
        React.createElement("div", { className: "splash-logo" },
            React.createElement("img", { src: BRAND + 'gm-lettermark-metallic-transparent.png', alt: "GM TOKEN" })),
        React.createElement("h1", null, "GM TOKEN"),
        React.createElement("p", null, "Earn \u00B7 Hold \u00B7 Grow"),
        React.createElement("button", { className: "splash-start", onClick: () => goto('home') }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435")); }
    function Mining() { const rate = !demo && liveState ? liveState.mining.rate_cents_day / 100 : gmRate(wallet); return React.createElement(React.Fragment, null,
        top('Mining', true, 'info'),
        React.createElement("div", { className: "inferred-label" }, "\u0418\u0433\u0440\u043E\u0432\u043E\u0439 \u0440\u0430\u0437\u0434\u0435\u043B \u00B7 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u044F \u0434\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0430 \u043A \u044D\u0441\u043A\u0438\u0437\u0430\u043C"),
        React.createElement("div", { className: "mining-hero pearl-card" },
            React.createElement("div", { className: "mining-orb" }, icon('lightning', 100, true)),
            React.createElement("small", null, "\u0414\u043E\u0431\u044B\u0447\u0430 GM"),
            React.createElement("h1", null,
                nf(rate),
                " ",
                React.createElement("span", null, "GM / \u0441\u0443\u0442\u043A\u0438")),
            React.createElement("p", null,
                "Lv.",
                wallet.level,
                " \u00B7 Power +",
                powerBonus(wallet.level),
                "% \u00B7 Boost +",
                holdingBonus(wallet.vault),
                "%")),
        React.createElement("div", { className: "mining-store pearl-card" },
            React.createElement("div", { className: "flex-between" },
                React.createElement("b", null, "Storage"),
                React.createElement("span", null,
                    nf(wallet.storage),
                    " GM")),
            React.createElement("div", { className: "progress" },
                React.createElement("div", { style: { width: (Math.min(100, wallet.storage / (rate * storageHours(wallet.level) / 24) * 100)) + '%' } })),
            React.createElement("small", null,
                "\u0412\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C: ",
                storageHours(wallet.level),
                " \u0447\u0430\u0441\u043E\u0432 \u0434\u043E\u0431\u044B\u0447\u0438. \u0412 \u0440\u0430\u0431\u043E\u0447\u0435\u043C \u0440\u0435\u0436\u0438\u043C\u0435 \u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F \u0440\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u0443\u044E\u0442\u0441\u044F \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435.")),
        React.createElement(GButton, { theme: theme, onClick: miningClaim, icon: "lightning" }, "Claim GM"),
        React.createElement("div", { className: "feature-grid" }, [['lightning', 'Power', '+' + powerBonus(wallet.level) + '%'], ['clock', 'Storage', storageHours(wallet.level) + ' ч'], ['trending-up', 'Efficiency', wallet.level >= 9 ? '50%' : wallet.level >= 7 ? '40%' : wallet.level >= 5 ? '30%' : wallet.level >= 3 ? '20%' : '0%']].map(([i, t, v]) => React.createElement("div", { className: "feature-card pearl-card", key: t },
            icon(i, 28),
            React.createElement("small", null, t),
            React.createElement("b", null, v)))),
        React.createElement("p", { className: "disclaimer" }, "Mining Pool \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D 45 \u043C\u043B\u043D GM \u0438 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u043C \u0431\u044E\u0434\u0436\u0435\u0442\u043E\u043C. \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0435 \u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C.")); }
    
 function Vault(){
  const e=React.createElement;
  return e(React.Fragment,null,
    top('Holding (Vault)',true,'database'),
    e('div',{className:'vault-hero pearl-card'},
       e('div',{className:'vault-orb'},icon('database',100,true)),
       e('small',null,'GM в Holding'),e('h1',null,nf(wallet.vault),' GM'),
       e('p',null,'Награда зависит от утверждённых правил и остатка фонда')),
    e('div',{className:'vault-stats'},
       e('div',{className:'pearl-card'},e('small',null,'Mining Boost'),e('b',null,'+',holdingBonus(wallet.vault),'%')),
       e('div',{className:'pearl-card'},e('small',null,'Комиссия вывода'),e('b',null,'5% GM'))),
    e('div',{className:'form-surface pearl-card vault-form'},
       e('label',{htmlFor:'vault-amount'},'Сумма для операции, GM'),
       e('input',{id:'vault-amount',inputMode:'decimal',placeholder:'0.00',value:vaultAmount,onChange:event=>setVaultAmount(event.target.value)}),
       e('div',{className:'vault-available'},e('span',null,'Доступно в кошельке: ',nf(wallet.gm),' GM'),
         e('span',null,'В Holding: ',nf(wallet.vault),' GM')),
       e('div',{className:'twin-buttons vault-actions'},
         e('button',{type:'button',className:'vault-action vault-deposit',onClick:depositVault},
           icon('deposit',24),e('span',null,'Пополнить')),
         e('button',{type:'button',className:'vault-action vault-withdraw',onClick:withdrawVault},
           icon('withdraw',24),e('span',null,'Вывести')))),
    e('p',{className:'disclaimer'},'Вывод — один раз в UTC-сутки, комиссия 5%. Награды зависят от состояния фонда и включённых правил. Это виртуальная игровая валюта.'),
    e('div',{className:'vault-pending pearl-card'},
       e('div',{className:'split-line'},e('span',null,'Награды к получению'),e('b',null,nf((liveState?.holding?.pending_cents||0)/100),' GM')),
       e(GButton,{theme,disabled:!(liveState?.holding?.pending_cents),onClick:()=>gameAction('/api/vault/claim'),icon:'gift'},'Claim Rewards')));
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
    function Boxes() { return React.createElement(React.Fragment, null,
        top('GM Boxes', true, 'gift'),
        React.createElement("div", { className: "shop-banner pearl-card" },
            icon('gift', 65, true),
            React.createElement("div", null,
                React.createElement("h2", null, "\u041A\u043E\u0440\u043E\u0431\u043A\u0438 \u0437\u0430 POINTS"),
                React.createElement("p", null, "POINTS \u0432\u044B\u0434\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0437\u0430 \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 \u0441\u0434\u0435\u043B\u043A\u0438 GM/CR"))),
        React.createElement("div", { className: "vault-stats" },
            React.createElement("div", { className: "pearl-card" },
                React.createElement("small", null, "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E POINTS"),
                React.createElement("b", null, liveState?.points?.points || 0)),
            React.createElement("div", { className: "pearl-card" },
                React.createElement("small", null, "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u0437\u0430\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043E"),
                React.createElement("b", null,
                    liveState?.points?.daily_points || 0,
                    "/1000"))),
        [['bronze', 'Bronze', 300], ['silver', 'Silver', 750], ['gold', 'Gold', 1500]].map(([k, n, c]) => React.createElement("div", { className: "form-surface pearl-card", key: k },
            React.createElement("div", { className: "split-line" },
                React.createElement("b", null, n),
                React.createElement("span", null,
                    c,
                    " POINTS")),
            React.createElement(GButton, { theme: theme, disabled: demo || !liveState?.config?.boxes_enabled, onClick: () => gameAction('/api/boxes/open', { kind: k }) }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C"))),
        React.createElement("p", { className: "disclaimer" }, "\u0420\u0430\u0437\u043C\u0435\u0440 \u043D\u0430\u0433\u0440\u0430\u0434 \u043F\u043E\u043A\u0430 \u043D\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D \u0434\u0432\u0443\u043C\u044F \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430\u043C\u0438. \u0421\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u0432\u044B\u0434\u0430\u0451\u0442 \u043D\u0435\u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0435 GM.")); }
    function Referrals() { return React.createElement(React.Fragment, null,
        top('Referral Program', true, 'friends'),
        React.createElement("div", { className: "referral-hero pearl-card" },
            icon('friends', 80, true),
            React.createElement("h2", null, "\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0430\u0439 \u0434\u0440\u0443\u0437\u0435\u0439"),
            React.createElement("p", null, "25% \u043E\u0442 \u0444\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043D\u044B\u0445 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0451\u043D\u043D\u044B\u043C\u0438 Holding Rewards")),
        React.createElement("div", { className: "invite-link pearl-card" },
            React.createElement("small", null, "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430"),
            React.createElement("div", null,
                React.createElement("code", null, 't.me/gm_token_test_bot?startapp=ref_' + String(webapp?.initDataUnsafe?.user?.id || '')),
                React.createElement("button", { onClick: () => { navigator.clipboard?.writeText('https://t.me/gm_token_test_bot?startapp=ref_' + String(webapp?.initDataUnsafe?.user?.id || '')); flash('Реферальная ссылка скопирована'); } }, icon('copy', 21)))),
        React.createElement("div", { className: "stats-grid" },
            React.createElement("div", { className: "stat-card" },
                React.createElement("b", null, liveReferrals?.referred?.length || 0),
                React.createElement("small", null,
                    "\u0414\u0440\u0443\u0437\u0435\u0439 ",
                    '')),
            React.createElement("div", { className: "stat-card" },
                React.createElement("b", null, nf((liveReferrals?.received_gm_cents || 0) / 100)),
                React.createElement("small", null,
                    "\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u043E GM ",
                    ''))),
        React.createElement("p", { className: "disclaimer" }, "\u0412 \u0440\u0430\u0431\u043E\u0447\u0435\u043C \u0440\u0435\u0436\u0438\u043C\u0435 \u0441\u0441\u044B\u043B\u043A\u0430 \u0432\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u0432\u0430\u0448 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0439 Telegram ID. \u0412\u043E\u0437\u043D\u0430\u0433\u0440\u0430\u0436\u0434\u0435\u043D\u0438\u0435 \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0437\u0430 \u0444\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043D\u044B\u0439 Holding Claim \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0451\u043D\u043D\u043E\u0433\u043E.")); }
    function History() { return React.createElement(React.Fragment, null,
        top('Transaction History', true, 'clock'),
        !serverHistory.length && React.createElement("div", { className: "empty-state" },
            icon('clock', 62, true),
            React.createElement("h3", null, "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0439 \u043F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u0430"),
            React.createElement("button", { onClick: loadHistory }, "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430")),
        serverHistory.map((x) => React.createElement("div", { key: x.id, className: "pearl-card form-surface" },
            React.createElement("b", null, x.kind),
            React.createElement("small", null, new Date(x.at * 1000).toLocaleString('ru-RU')),
            React.createElement("p", null, x.info)))); }
    function Achievements() { const items = liveAchievements; return React.createElement(React.Fragment, null,
        top('Achievements', true, 'trophy'),
        React.createElement("div", { className: "achievement-list" }, items.map((t) => React.createElement("div", { className: "earn-item pearl-card", key: t.id },
            icon(t.icon || 'trophy', 45, true),
            React.createElement("span", null,
                React.createElement("b", null, t.title || t.id),
                React.createElement("small", null,
                    t.description || '',
                    !demo ? ` · ${t.xp || 0} XP` : '')),
            !demo && React.createElement("button", { disabled: t.claimed || !t.available, onClick: async () => { const x = await gameAction('/api/achievements/claim', { id: t.id }); if (x)
                    await refreshLive(); } }, t.claimed ? 'Получено' : t.available ? 'Получить' : 'Не выполнено')))),
        !items.length && React.createElement("p", { className: "disclaimer" }, "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F \u0435\u0449\u0451 \u043D\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u044B \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430\u043C\u0438. \u0421\u043A\u0440\u044B\u0442\u044B\u0435 \u043D\u0430\u0433\u0440\u0430\u0434\u044B \u043D\u0435 \u043D\u0430\u0447\u0438\u0441\u043B\u044F\u044E\u0442\u0441\u044F.")); }
    function Settings() { return React.createElement(React.Fragment, null,
        top('Settings', true, 'settings'),
        React.createElement("div", { className: "settings-card pearl-card" },
            React.createElement("b", null, "\u0422\u0435\u043C\u0430 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u044F"),
            React.createElement("p", null, "\u041A\u0430\u0436\u0434\u0430\u044F \u0442\u0435\u043C\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0435 PNG-\u0438\u043A\u043E\u043D\u043A\u0438 \u0438 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0444\u0430\u043A\u0442\u0443\u0440\u044B."),
            React.createElement("div", { className: "setting-theme" },
                React.createElement("button", { className: theme === 'light' ? 'on' : '', onClick: () => setTheme('light') }, "Light \u00B7 \u0441\u0432\u0435\u0442\u043B\u0430\u044F"),
                React.createElement("button", { className: theme === 'dark' ? 'on' : '', onClick: () => setTheme('dark') }, "Dark \u00B7 \u0442\u0451\u043C\u043D\u0430\u044F"))),
        React.createElement("button", { className: "earn-item pearl-card", onClick: () => flash('Уведомления управляются настройками Telegram') },
            icon('notifications', 33),
            React.createElement("span", null,
                React.createElement("b", null, "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F"),
                React.createElement("small", null, "Telegram \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u044F\u0435\u0442 \u043E \u0432\u0430\u0436\u043D\u044B\u0445 \u0441\u043E\u0431\u044B\u0442\u0438\u044F\u0445")),
            icon('chevron-right', 18)),
        React.createElement("p", { className: "disclaimer" }, "Telegram Mini App: \u0431\u0435\u0437 \u0434\u0443\u0431\u043B\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0441\u0442\u0430\u0442\u0443\u0441-\u0431\u0430\u0440\u0430, \u0441 \u0443\u0447\u0451\u0442\u043E\u043C safe-area.")); }
    function Support() {
        const arr = supportTickets;
        return React.createElement(React.Fragment, null,
            top('Support Center', true, 'info'),
            React.createElement("div", { className: "support-heading pearl-card" },
                icon('shield-check', 40, true),
                React.createElement("div", null,
                    React.createElement("b", null, "GM Auto Support"),
                    React.createElement("small", null, "\u041F\u0440\u0438\u0451\u043C \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0439 24/7; \u0434\u0432\u0435 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u043F\u043E\u043F\u044B\u0442\u043A\u0438 \u0434\u043E \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0438 \u043C\u043E\u0434\u0435\u0440\u0430\u0442\u043E\u0440\u0443. \u0410\u043F\u0435\u043B\u043B\u044F\u0446\u0438\u0438 \u2014 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0443 \u0441\u0440\u0430\u0437\u0443."))),
            React.createElement("div", { className: "form-surface pearl-card" },
                React.createElement("label", null, "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F"),
                React.createElement("select", { value: supportCategory, onChange: (e) => setSupportCategory(e.target.value) }, ['Общий вопрос', 'Mining', 'Holding', 'Биржа GM/CR', 'Баланс GM/CR', 'Апелляция', 'Рефералы'].map(x => React.createElement("option", { key: x }, x))),
                React.createElement("label", null, "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B"),
                React.createElement("textarea", { rows: 5, value: supportText, onChange: (e) => setSupportText(e.target.value), placeholder: "\u041E\u043F\u0438\u0448\u0438 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u044E \u043C\u0438\u043D\u0438\u043C\u0443\u043C \u0432 10 \u0441\u0438\u043C\u0432\u043E\u043B\u0430\u0445" }),
                React.createElement(GButton, { theme: theme, onClick: createTicket },
                    "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0442\u0438\u043A\u0435\u0442 ",
                    '')),
            React.createElement("div", { className: "flex-between" },
                React.createElement("h3", { className: "section-title" }, "\u041E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u044F"),
                React.createElement("button", { className: "small-button", onClick: loadTickets }, "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C")),
            arr.length ? arr.map((t) => React.createElement("div", { className: "support-ticket pearl-card", key: t.id },
                React.createElement("b", null,
                    "#",
                    String(t.id).slice(0, 8),
                    " \u00B7 ",
                    t.category),
                React.createElement("span", null, clean(t.body || t.text)),
                React.createElement("small", null,
                    t.status,
                    " \u00B7 \u0441\u0435\u0440\u0432\u0435\u0440\u043D\u044B\u0439 \u0442\u0438\u043A\u0435\u0442 \u00B7 ",
                    t.priority || 'P3'),
                !demo && t.user_id === String(webapp?.initDataUnsafe?.user?.id || '') && t.status !== 'closed' && React.createElement("button", { className: "small-button", onClick: () => ticketAction(t.id, 'auto') },
                    "\u0410\u0432\u0442\u043E\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 (",
                    t.auto_attempts || 0,
                    "/2)"),
                !demo && ['owner', 'coowner', 'moderator'].includes(liveRole) && t.status === 'open' && React.createElement("button", { className: "small-button", onClick: () => ticketAction(t.id, 'claim') }, "\u0412\u0437\u044F\u0442\u044C \u0432 \u0440\u0430\u0431\u043E\u0442\u0443"),
                !demo && ['owner', 'coowner', 'moderator'].includes(liveRole) && t.status === 'in_review' && React.createElement(React.Fragment, null,
                    React.createElement("input", { placeholder: "\u041E\u0442\u0432\u0435\u0442 \u0438\u0433\u0440\u043E\u043A\u0443", value: staffReply, onChange: (e) => setStaffReply(e.target.value) }),
                    React.createElement("button", { className: "small-button", onClick: () => ticketAction(t.id, 'reply', { body: staffReply }) }, "\u041E\u0442\u0432\u0435\u0442\u0438\u0442\u044C"),
                    React.createElement("button", { className: "small-button", onClick: () => ticketAction(t.id, 'resolve') }, "\u0420\u0435\u0448\u0435\u043D\u043E")),
                !demo && t.user_id === String(webapp?.initDataUnsafe?.user?.id || '') && ['resolved', 'closed'].includes(t.status) && React.createElement("button", { className: "small-button", onClick: () => ticketAction(t.id, 'reopen') }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E"))) : React.createElement("p", { className: "disclaimer" }, "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0439. \u0412 \u0440\u0430\u0431\u043E\u0447\u0435\u0439 \u0432\u0435\u0440\u0441\u0438\u0438 \u043C\u043E\u0436\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043E\u0447\u0435\u0440\u0435\u0434\u044C \u043A\u043D\u043E\u043F\u043A\u043E\u0439 \u0432\u044B\u0448\u0435."));
    }

 function AdminTestGrants(){
  const e=React.createElement;
  return e('section',{className:'test-grants form-surface pearl-card','aria-label':'Тестовые начисления GM и CR'},
   e('div',{className:'test-grants-heading'},icon('coins',40,true),
    e('div',null,e('strong',null,'Тестовые начисления'),e('small',null,'GM/CR для проверки Trading · только Owner / Co-Owner'))),
   e('p',{className:'test-grants-note'},'Средства переводятся из Treasury (GM) или Shop Reserve (CR), а не создаются заново. Каждое начисление проверяется 2FA и записывается в журнал.'),
   e('label',null,'Кому начислить'),
   e('div',{className:'test-grants-options',role:'group','aria-label':'Получатель'},
    [['self','Себе'],['other-owner','Совладельцу'],['id','Игроку']].map(([id,title])=>
     e('button',{type:'button',className:testRecipient===id?'selected':'',key:id,onClick:()=>setTestRecipient(id),'aria-pressed':testRecipient===id},title))),
   testRecipient==='id'?e('input',{value:testUserId,placeholder:'Telegram ID зарегистрированного игрока',inputMode:'numeric',onChange:event=>setTestUserId(event.target.value),'aria-label':'Telegram ID игрока'}):null,
   e('label',null,'Игровая валюта'),
   e('div',{className:'test-grants-options',role:'group','aria-label':'Валюта'},
    ['GM','CR'].map(currency=>e('button',{key:currency,type:'button',className:testCurrency===currency?'selected':'',onClick:()=>{setTestCurrency(currency);setTestAmount(currency==='GM'?'1000':'10000')},'aria-pressed':testCurrency===currency},
      icon(currency==='GM'?'gm-coin-orbit':'coins',23),currency))),
   e('label',null,'Сумма '+testCurrency),
   e('input',{value:testAmount,inputMode:'decimal',placeholder:'Например, 1000',onChange:event=>setTestAmount(event.target.value),'aria-label':'Сумма тестового начисления'}),
   e('div',{className:'test-grants-presets'},
    (testCurrency==='GM'?['1000','5000','10000']:['10000','50000','100000']).map(n=>
     e('button',{key:n,type:'button',onClick:()=>setTestAmount(n)},n))),
   e('small',{className:'test-grants-limit'},testCurrency==='GM'?'До 10 000 GM за операцию и 50 000 GM в UTC-день на игрока.':'До 100 000 CR за операцию и 500 000 CR в UTC-день на игрока.'),
   e('label',null,'Зачем выдаём'),
   e('textarea',{rows:2,value:testReason,onChange:event=>setTestReason(event.target.value),'aria-label':'Причина начисления'}),
   e('label',null,'Код 2FA владельца'),
   e('input',{value:testCode,inputMode:'numeric',type:'text',autoComplete:'one-time-code',maxLength:6,placeholder:'6 цифр из приложения 2FA',onChange:event=>setTestCode(event.target.value),'aria-label':'Код TOTP'}),
   e(GButton,{theme,disabled:demo||testBusy||!testAmount||testCode.length!==6,onClick:testGrant,icon:'shield-check'},
     testBusy?'Проверяем начисление...':'Выдать тестовые '+testCurrency),
   e('p',{className:'test-grants-footer'},'Другой совладелец или игрок должен хотя бы один раз открыть GM TOKEN. При необходимости между начислениями дождись нового кода 2FA.')
  );
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
    function More() { return React.createElement(React.Fragment, null,
        top('Все разделы', true, 'more'),
        React.createElement("div", { className: "more-grid" }, [['lightning', 'Mining', 'mining'], ['coins', 'Holding Vault', 'vault'], ['swap', 'GM Shop', 'shop'], ['gift', 'GM Boxes', 'boxes'], ['candlesticks', 'Биржа GM/CR', 'trade'], ['gift', 'Daily Reward', 'reward'], ['tasks', 'Задания', 'tasks'], ['trophy', 'Рейтинг', 'leaderboard'], ['friends', 'Рефералы', 'referrals'], ['clock', 'История', 'history'], ['shield-check', 'Support', 'support'], ['settings', 'Settings', 'settings'], ['crown', 'Admin', 'admin']].filter(([i, t, s]) => s !== 'admin' || ['owner', 'coowner'].includes(liveRole)).map(([i, t, s]) => React.createElement("button", { className: "earn-item pearl-card", key: t, onClick: () => goto(s) },
            icon(i, 37, true),
            React.createElement("span", null,
                React.createElement("b", null, t)),
            icon('chevron-right', 18))))); }
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
      const e = React.createElement;
      return e("main", {className: 'application auth-page theme-' + theme},
        e("div", {className: "auth-ambient", "aria-hidden": "true"}),
        e("section", {className: "auth-gate pearl-card", "aria-labelledby": "auth-title"},
          e("div", {className: "auth-brand"},
            e(Brand, {theme, size:78}),
            e("div", {className:"auth-brand-copy"}, e("span",null,"TELEGRAM MINI APP"),e("h1",{id:"auth-title"},"GM TOKEN"))),
          e("div", {className:"auth-divider"}),
          e("div", {className:"auth-status",role:"status"},e("span",{className:"auth-status-dot","aria-hidden":"true"}),e("div",null,e("strong",null,"Требуется вход через Telegram"),e("p",null,backendStatus))),
          e("a", {className:"auth-cta",href:"https://t.me/gm_token_test_bot",onClick:openBot},
            e("span",{className:"auth-cta-icon"},e(Icon,{name:"telegram",theme,size:29})),
            e("span",{className:"auth-cta-copy"},e("strong",null,"Открыть чат бота"),e("small",null,"@gm_token_test_bot")),
            e(Icon,{name:"chevron-right",theme,size:22})),
          e("div",{className:"auth-theme-row"},e("span",null,"Оформление"),
            e("div",{className:"auth-theme-toggle",role:"group","aria-label":"Выбор темы"},
              e("button",{type:"button",className:theme==='light'?'active':'',"aria-pressed":theme==='light',onClick:()=>setTheme('light')},e(Icon,{name:"diamond",theme,size:17}),"Светлая"),
              e("button",{type:"button",className:theme==='dark'?'active':'',"aria-pressed":theme==='dark',onClick:()=>setTheme('dark')},e(Icon,{name:"gm-coin-orbit",theme,size:17}),"Тёмная"))),
          e("div",{className:"auth-privacy"},e(Icon,{name:"shield-check",theme,size:22}),e("span",null,"Игровые данные появятся только после защищённого входа. Демобалансов здесь нет."))
        ));
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
        case 'mining':
            view = Mining();
            break;
        case 'vault':
            view = Vault();
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
    return React.createElement("div", { className: 'application theme-' + theme + (webapp?.initData ? ' is-telegram' : '') },
        React.createElement("aside", { className: "desktop-toolbar" },
            React.createElement("div", { className: "toolbar-logo" },
                React.createElement(Brand, { theme: theme, size: 42 }),
                React.createElement("span", null,
                    React.createElement("b", null, "GM TOKEN"),
                    React.createElement("small", null, "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u044D\u0441\u043A\u0438\u0437\u044B \u00B7 \u0438\u043D\u0442\u0435\u0440\u0430\u043A\u0442\u0438\u0432\u043D\u0430\u044F \u0441\u0431\u043E\u0440\u043A\u0430"))),
            React.createElement("div", { className: "toolbar-tabs" },
                React.createElement("button", { onClick: () => setTheme('light'), className: isLight ? 'chosen' : '' }, "Light"),
                React.createElement("button", { onClick: () => setTheme('dark'), className: !isLight ? 'chosen' : '' }, "Dark")),
            React.createElement("div", { className: "toolbar-links" }, ['home', 'trade', 'earn', 'tasks', 'leaderboard', 'profile', 'mining', 'vault', 'shop', 'support', 'admin'].map(s => React.createElement("button", { key: s, className: screen === s ? 'chosen' : '', onClick: () => goto(s) }, s))),
            React.createElement("p", null, "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0435 PNG \u00B7 54 \u0438\u043A\u043E\u043D\u043A\u0438 \u00D7 4 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430 \u00B7 \u0431\u0435\u0437 \u043F\u043E\u0434\u043C\u0435\u043D\u044B \u0441\u0442\u043E\u0440\u043E\u043D\u043D\u0438\u043C\u0438 \u043F\u0438\u043A\u0442\u043E\u0433\u0440\u0430\u043C\u043C\u0430\u043C\u0438")),
        React.createElement("div", { className: "device-stage" },
            React.createElement("div", { className: "phone-frame" },
                React.createElement("div", { className: 'phone-scroll ' + ((screen === 'splash') ? 'no-scroll' : '') }, view),
                !['reward', 'splash'].includes(screen) && bottom(),
                React.createElement("div", { className: "home-indicator" })),
            React.createElement("div", { className: "underphone" },
                React.createElement("span", { className: "demo-pill" }, 'Серверная авторизация · виртуальные GM/CR'),
                React.createElement("button", { onClick: () => goto('splash') }, "\u0417\u0430\u0441\u0442\u0430\u0432\u043A\u0430"),
                React.createElement("button", { onClick: () => goto('home') }, "Home"),
                React.createElement("button", { onClick: () => setTheme(isLight ? 'dark' : 'light') }, "\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u0442\u0435\u043C\u0443")),
            React.createElement("small", { className: "status-note" }, backendStatus)),
        toast && React.createElement("div", { className: "toast-message", role: "status", onClick: () => setToast('') },
            toast,
            React.createElement("button", { onClick: () => setToast('') }, "\u00D7")),
        modal && React.createElement("div", { className: "overlay", onClick: () => setModal('') },
            React.createElement("div", { className: "modal-box", onClick: (e) => e.stopPropagation() },
                React.createElement("b", null, modal === 'tradeForm' ? (side === 'buy' ? 'Buy GM' : 'Sell GM') : 'Подтверждение ордера'),
                modal === 'tradeForm' ? React.createElement(React.Fragment, null,
                    React.createElement("p", null,
                        "\u0412\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0435 GM/CR \u00B7 ",
                        liveTicker?.premarket ? 'PREMARKET · только Limit' : 'торговля открыта'),
                    React.createElement("label", null, "\u0422\u0438\u043F \u043E\u0440\u0434\u0435\u0440\u0430"),
                    React.createElement("select", { value: orderType, onChange: (e) => setOrderType(e.target.value) },
                        React.createElement("option", { value: "limit" }, "Limit"),
                        React.createElement("option", { value: "market", disabled: liveTicker?.premarket }, "Market (3% \u0437\u0430\u0449\u0438\u0442\u0430; \u043F\u043E\u0441\u043B\u0435 \u0430\u0443\u043A\u0446\u0438\u043E\u043D\u0430)")),
                    React.createElement("label", null, "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E GM"),
                    React.createElement("input", { inputMode: "decimal", value: amount, onChange: (e) => setAmount(e.target.value) }),
                    orderType === 'limit' && React.createElement(React.Fragment, null,
                        React.createElement("label", null, "\u0426\u0435\u043D\u0430 CR \u0437\u0430 1 GM"),
                        React.createElement("input", { inputMode: "decimal", placeholder: "\u0412\u0432\u0435\u0434\u0438 \u0441\u0432\u043E\u044E \u0446\u0435\u043D\u0443 CR/GM", value: orderPrice, onChange: (e) => setOrderPrice(e.target.value) }),
                        React.createElement("label", null, "\u0421\u0440\u043E\u043A \u043E\u0440\u0434\u0435\u0440\u0430"),
                        React.createElement("select", { value: orderDuration, onChange: (e) => setOrderDuration(e.target.value) }, ['1h', '6h', '12h', '24h', '3d', '7d', 'GTC'].map(x => React.createElement("option", { key: x }, x)))),
                    React.createElement("div", { className: "amount-presets" }, ['25', '50', '75', '100'].map(x => React.createElement("button", { key: x, onClick: () => setAmount(x) }, x))),
                    React.createElement("button", { className: "modal-action", onClick: tradePreview }, "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0440\u0430\u0441\u0447\u0451\u0442")) : React.createElement(React.Fragment, null,
                    React.createElement("p", null, modalText),
                    React.createElement("button", { className: "modal-action", onClick: submitOrder }, 'Подтвердить и отправить заявку')),
                React.createElement("button", { className: "modal-close", onClick: () => setModal('') }, "\u0417\u0430\u043A\u0440\u044B\u0442\u044C"))));
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
