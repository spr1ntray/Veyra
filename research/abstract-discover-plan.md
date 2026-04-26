# Abstract Discover — план попадания

**Дата:** 2026-04-26
**Исследователь:** Researcher Agent
**Контекст:** Veyra (vanilla JS RPG, GitHub Pages), цель — листинг на portal.abs.xyz/discover
**Связанные документы:** `research/abstract-network-research.md` (2026-04-19), `design/adr-abstract-migration.md`

---

## TL;DR

Discover = два уровня: **(1) Explore All Apps** — открытый каталог с upvote, **(2) Spotlight** — кураторский (отбирает Cube Inc., оператор Portal). Нет listing fee, нет обязательного аудита, нет KYC. Для Explore достаточно: рабочий dApp на Abstract mainnet (chainId 2741), AGW-логин, сабмит через Cube builders Notion (`cubeinc.notion.site/25adeecd6f6e80e5b744dc8d0a77132e`) или контакт в Discord/X. Минимальный бюджет — **~$5–25**: газ за деплой 1 контракта (~$1–5 на ZKsync VM), домен опционален (GitHub Pages OK), всё остальное бесплатно. Спот в Spotlight зарабатывается качеством UX, дизайном и активностью — деньгами не покупается. Сроки от подачи до листинга: оценочно **1–4 недели**.

---

## Цель

Появиться на `portal.abs.xyz/discover` сначала в **Explore All Apps** (категория Gaming), затем накопить upvote/usage и попасть в **Spotlight**.

---

## Шаги (по порядку)

### Шаг 1. Подготовить minimum viable on-chain хвост (1–3 дня)

Чисто статичный сайт без on-chain, скорее всего, не пройдёт ревью — Portal позиционируется как "Abstract-powered apps". Минимум, что нужно показать:

- Один смарт-контракт на Abstract mainnet (chainId **2741**, RPC `https://api.mainnet.abs.xyz`).
- AGW-логин через `@abstract-foundation/agw-client` (vanilla JS совместимо, см. предыдущий ресёрч).
- Любая on-chain запись (например, `VeyraLeaderboard.sol` — запись результата `tower run`).

**Action items для тебя:**
- Сначала всё на **testnet** (chainId 11124) — бесплатно через faucet `docs.abs.xyz/tooling/faucets`.
- После прогона — деплой на mainnet.
- **Стоимость:** $0 на testnet; ~$1–5 за деплой одного контракта на mainnet (Abstract fee ~$0.001/tx, деплой контракта = десятки тысяч gas units, итого центы–доллары).
- **Время:** 1–3 дня (контракт + клиент-интеграция уже спроектированы в ADR).
- **Риск:** низкий. ⚠️ Не забудь `zksolc` вместо `solc` (см. предыдущий ресёрч).

### Шаг 2. Подготовить публичный URL и метаданные (0.5 дня)

GitHub Pages подходит — Cube не требует кастомного домена. Но проверь:

- **HTTPS обязателен** (GitHub Pages даёт по умолчанию).
- **Mobile-friendly** (даже если игра PC-only, лендинг должен открываться на телефоне для ревьюера).
- **Иконка 512×512 PNG** (логотип Veyra).
- **Скриншоты** 1280×720 минимум, 3–5 штук.
- **Короткое описание** (1–2 предложения) и длинное (200–400 слов).
- **Категория:** Gaming.
- **Социалка:** хотя бы X (Twitter) аккаунт игры — Cube смотрит на social presence как сигнал серьёзности проекта.

**Стоимость:** $0 (или $10–15/год за свой домен через Namecheap/Cloudflare, опционально).
**Время:** несколько часов.

### Шаг 3. Submit через Cube builders hub (1 день active + ожидание)

Главный канал, найден на abs.xyz: **`https://cubeinc.notion.site/25adeecd6f6e80e5b744dc8d0a77132e`** (CTA "Build on Abstract" на главной).

⚠️ Notion-страница не индексируется через HTTP-fetch, точные поля анкеты не вытащить дистанционно — **открой её в браузере и заполни форму вручную**. Ожидаемые поля: app name, URL, описание, контракт-адрес, контакт, X/Discord, скриншоты.

**Параллельно** (задвоение каналов повышает шанс):

- Зайди в Abstract **Discord** (ссылка с docs.abs.xyz / abs.xyz footer) → канал `#dev-support` или `#showcase`. Опубликуй проект, упомяни что подал в Cube.
- Tag `@AbstractChain` в X с демо-ссылкой и скринами. DevRel (Jarrod Watts и др.) часто реагируют на качественные проекты.
- Если есть знакомства с другими Abstract-проектами — попроси их upvote / репост. Discover сортируется по engagement.

**Стоимость:** $0.
**Время:** 2–4 часа сабмит + 1–4 недели ревью (нет публичного SLA).
**Риск:** ⚠️ Игра без on-chain ценности (только косметический leaderboard) может получить низкий приоритет.

### Шаг 4. Накопить engagement signal (постоянно)

Spotlight = upvotes + interaction (по официальному disclaimer на `portal.abs.xyz/portal-disclaimer`). Что повышает шанс:

- **Upvotes на Discover** — каждый upvote это on-chain транзакция. Попроси early players коннектнуть AGW и проголосовать.
- **Daily/Weekly active wallets** — сколько уникальных AGW взаимодействуют с твоим контрактом. Cube это видит через эксплорер.
- **X-присутствие** — регулярные посты, GIF-демки, обновления.
- **Cross-promotion** с другими Abstract-играми (LOL Land, Pudgy World, Roach Racing — см. предыдущий ресёрч).

**Стоимость:** $0 (только время).

### Шаг 5. (Опц.) Подать в Abstract XP partnership (2–4 недели)

Чтобы игроки получали Abstract XP за активность в Veyra, контракт должен попасть в whitelist Portal (это отдельный процесс, не равный Discover-листингу). Запрашивается через тот же Cube-канал. ⚠️ Требования не публичны — на 2026-04 это discretionary решение Cube team. Скорее всего просят: реальную аудиторию, on-chain активность, не-spam контракт.

**Стоимость:** $0.
**Время:** недели–месяцы.
**Риск:** на старте маловероятно — XP whitelist даётся проектам с traction.

---

## Минимально необходимая интеграция в код

| Требование | Обязательно? | Источник |
|---|---|---|
| Деплой ≥1 контракта на Abstract mainnet (chainId 2741) | ✅ практически да (для серьёзного ревью) | Логика Cube — Portal про "Abstract-powered apps" |
| AGW-логин (`@abstract-foundation/agw-client`) | ✅ да | Стандарт экосистемы; без него — не "Abstract app" |
| Paymaster (gasless) | ⚠️ желательно | Сильный UX-сигнал для Spotlight ("ease of use") |
| Session keys | ⚠️ желательно для игры | Без них каждое действие → попап подписи |
| Свой домен | ❌ не обязательно | GitHub Pages OK |
| Аудит контрактов | ❌ не обязательно для Discover | Cube явно пишет: "not a security audit" |
| KYC команды | ❌ не обязательно | Не упоминается нигде |
| Listing fee | ❌ нет | Cube явно пишет: "no payments accepted" |

---

## Стоимость суммарно (low-budget путь)

| Статья | Цена |
|---|---|
| Тестнет (отладка контрактов, AGW, session keys) | **$0** (faucet) |
| Деплой 1 контракта на mainnet (Abstract ~$0.001/tx, деплой ~10k–50k gas units) | **~$1–5** |
| Депозит в paymaster (опц., чтобы спонсировать газ игроков) | **$5–20** старт (по факту использования) |
| Домен | **$0** (GitHub Pages) или $10–15/год |
| Аудит | **$0** (skip — Cube не требует) |
| Listing fee | **$0** |
| **TOTAL минимум** | **$1–5** |
| **TOTAL комфорт (с paymaster + домен)** | **$15–40** |

Это уровень "пицца на двоих", не "новый MacBook". Главная инвестиция — **время**, не деньги.

---

## Дешёвые альтернативы / lifehacks

1. **Hackathons / ETHGlobal events.** Abstract спонсирует категории на ETHGlobal (см. их X). Победа в треке = visibility в экосистеме + потенциальный direct intro в Cube. Бесплатно для участника.
2. **Pudgy Penguins boost.** Игроки с PENGU/PPG NFT получают XP-мультипликаторы — если позиционировать игру как Pengu-friendly (например, использовать PENGU как косметику), можно получить органический buzz в этом коммьюнити. ⚠️ Не fake — Pudgy-комьюнити чувствует pandering.
3. **Streamer outreach.** Через `creators.abs.xyz` стримеры подают заявки на Abstract Live. Если игра подходит для стрима — можно списаться с уже верифицированными стримерами и предложить early access.
4. **Cross-promo с другими играми.** YGG Play, Roach Racing, Pudgy World — все в Abstract ecosystem. Twitter-collab или совместные ивенты дают взаимный engagement signal.
5. **Open-source как сигнал.** GitHub репо (даже если код выложен с MIT/CC-license) — плюс к доверию ревьюера.
6. **Без аудита, но с README "Known limitations".** Честность про текущее состояние > попытки замаскировать MVP под прод.

---

## Что НЕ нужно делать (мифы)

- ❌ **Платить за листинг.** Cube явно пишет "no payments accepted for featured placement". Любой, кто предложит "ускорить ревью за деньги" — скам.
- ❌ **Заказывать аудит контракта ради Discover.** Не требуется. (Аудит нужен, если у тебя on-chain активы пользователей на десятки тысяч $.)
- ❌ **Покупать кастомный домен на старте.** GitHub Pages принимается.
- ❌ **Регистрировать LLC/юрлицо.** Discover-листинг не требует юридической формализации.
- ❌ **Делать ВСЁ on-chain.** Достаточно одного контракта (leaderboard / score commit). Геймплей — клиент.
- ❌ **Ждать TGE / airdrop, чтобы стартовать.** Раньше включился — больше истории активности к моменту распределения.
- ❌ **Полагаться только на Notion-форму.** Дублируй через Discord + X. Тихие проекты теряются.

---

## Источники

- [Abstract Portal — Overview (docs.abs.xyz)](https://docs.abs.xyz/portal/overview)
- [Portal Disclaimer (curation policy)](https://portal.abs.xyz/portal-disclaimer) — главный документ про критерии Spotlight, оператор Cube Inc.
- [Build on Abstract — Cube builders hub (Notion)](https://cubeinc.notion.site/25adeecd6f6e80e5b744dc8d0a77132e) — основной submission канал
- [Connect to Abstract — RPC, chainIds](https://docs.abs.xyz/connect-to-abstract)
- [Gas Fees on Abstract](https://docs.abs.xyz/how-abstract-works/evm-differences/gas-fees) — fixed cost ~$0.001/tx
- [tpan.substack — 7 components of Abstract Portal](https://tpan.substack.com/p/362-breaking-down-the-7-components) — best public breakdown of Portal structure
- [Abstract Block Explorer (mainnet)](https://abscan.org/)
- [Faucets для testnet](https://docs.abs.xyz/tooling/faucets)
- [Creators / Streamers program](https://creators.abs.xyz) (редирект в Portal)
- Предыдущий ресёрч: `/Users/sprintray/claude_soft/Veyra/research/abstract-network-research.md`

---

## Recommendation

**Двухфазный план для Veyra:**

**Фаза 1 (1–2 недели, $1–5):** деплой `VeyraLeaderboard` на testnet → AGW-логин в vanilla JS → отладка → деплой на mainnet → submit в Cube Notion + Discord + X. Цель — попасть в Explore All Apps. Это реалистично и дёшево.

**Фаза 2 (1–6 месяцев, $0):** наращивать MAW (monthly active wallets), upvotes, social engagement. Без traction Spotlight не выдают, и это правильно — нет смысла бороться за Spotlight с MVP, который никто не играет.

**Если приоритет — скорость:** не вешай весь геймплей на on-chain. Один leaderboard-контракт + AGW-логин + красивый лендинг = достаточно для подачи. Расширишь on-chain механику (NFT, achievements, prestige) уже после первого листинга и обратной связи от Cube.

⚠️ **Что может пойти не так:** (а) Notion-форма меняет поля без анонса — будь готов к перезаполнению; (б) ревью может затянуться без объяснений (нет публичного SLA); (в) Spotlight subjective и без traction не светит. Закладывай 1–2 месяца буфера.
