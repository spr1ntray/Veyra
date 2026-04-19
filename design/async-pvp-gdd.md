# Veyra — Async PvP: Shadow Duels GDD

> **Автор**: Game Designer Agent
> **Дата**: 2026-04-19
> **Статус**: DRAFT v1 — pending PM review
> **Платформа**: PC browser (HTML5/CSS/Vanilla JS, localStorage) → Abstract Network (L2) на пост-MVP
> **Зависит от**: mage-classes.md, combat-class-mechanics.md, sigil-resonance.md, passive-skill-tree.md, grimoire-autocast.md
> **Назначение**: Спецификация асинхронного PvP-режима (snapshot-бой против реального игрока, который в этом бою не участвует)

---

## 1. Vision & Нарратив

### Название режима

**Shadow Duels** (в городе — «Shade Arena», в UI-меню — просто `Competitive`). Лор-термин: **The Pale Mirror** — «Бледное Зеркало».

### Fluff text (экран входа)

> *Архонты Колвика не терпят кровопролития между магами. Но они знают: гордыня требует поединка. Бледное Зеркало — ритуал, выдранный из последних страниц Pre-Shattering кодексов: ты сражаешься с призраком чужой души, слепком, отлитым в момент их последней молитвы. Они не узнают о твоей победе. Они не будут скорбеть о своём поражении. Но их имя будет высечено рядом с твоим на Обелиске, и этого достаточно.*

### Design pillars

1. **Честный соревновательный слой** поверх auto-battle — рейтинг отражает качество билда, а не удачу с матчмейкингом.
2. **Нулевое трение для «оппонента»** — B никогда не ждёт, не подтверждает, не видит нотификаций. Его единственное участие — факт существования в матчмейкинг-пуле.
3. **Counter-pick как gameplay** — ключевая причина для Sigil Resonance существовать. PvP обязан показывать оппонента до боя.
4. **Web3-ready** — архитектура данных совместима с миграцией на Abstract Network (L2) без ломки контента.

---

## 2. Snapshot персонажа

### 2.1. Что такое snapshot

`PlayerSnapshot` — это **самодостаточная, детерминированная запись** всех боевых характеристик мага на момент её создания. Сниапшот обязан быть достаточным для того, чтобы клиент А в одиночку прогнал весь бой без единого запроса на сервер за «свежими» данными.

### 2.2. Схема PlayerSnapshot (финальный MVP-набор полей)

```
PlayerSnapshot {
  // Идентификация
  snapshotId:        string (UUID, stable),
  playerId:          string (wallet address или account id),
  displayName:       string,
  createdAt:         int64 (unix ms),
  version:           int   (schema version; стартуем с 1),

  // Прогрессия
  level:             int,
  classType:         'pyromancer'|'stormcaller'|'tidecaster'|'geomancer'|null,
  attributes:        { strength: int, intelligence: int },

  // Вычисляемые стат-поля (замораживаются в снапшот!)
  maxHP:             int,
  baseATK:           int,
  baseMagicPower:    int,
  critChance:        float,
  critMultiplier:    float,

  // Экипировка (только equipped — не весь инвентарь)
  equipment: {
    staff:  itemId|null,
    hat:    itemId|null,
    cloak:  itemId|null
  },

  // Боевая ротация
  grimoire:          [spellId|null × 5],

  // Пассивы
  passivesUnlocked:  [nodeId × N],   // ID разблокированных нод Sigil Tree

  // Resonance (если фича доступна игроку)
  resonancePreset:   { slot1, slot2, slot3 }  // nullable

  // Опционально (для UI/лора, не для боя)
  avatarHash:        string,          // для будущих NFT-скинов
  seasonsPlayed:     int,
  pvpTitle:          string|null      // "Duelist", "Archon", etc.
}
```

**Что НЕ кладётся в snapshot**: инвентарь (только equipped), золото, квесты, дневные кд, расходники, баффы. PvP играется в **«стерильном» состоянии** — никаких mana_elixir, crystal_fortune, shadow_dust. Расходники — PvE-only.

### 2.3. Когда снапшот создаётся/обновляется

- **При первом входе в PvP**: клиент строит PlayerSnapshot текущего состояния и загружает на сервер (v1 — off-chain API; v2 — on-chain через Abstract).
- **Автообновление**: при изменении equipment, grimoire, classType, level, passivesUnlocked, resonancePreset. Rate-limit: не чаще 1 апдейта в 30 секунд (защита от race-condition спама).
- **Immutable история**: каждый снапшот — новая строка в журнале. Для матча используется **самый свежий** на момент матчмейкинга. Это даёт естественную совместимость с on-chain: каждая версия — отдельный tx/event.

### 2.4. Детерминизм боя

Снапшот + сид RNG + тот же билд combat.js = идентичный результат. Для этого:

- В `battleState` добавляется `rngSeed` (32-бит). Все `Math.random()` в combat-симуляции заменяются на детерминистский PRNG (mulberry32) от сида.
- Сид генерирует сервер (v1) либо выводится из block hash (v2, on-chain).
- Клиент А отправляет на сервер: `{matchId, seed, yourSnapshotId, opponentSnapshotId, resultHash, winnerPlayerId, durationTicks}`. Сервер может пересимулировать матч и сверить результат при спорах/anti-cheat семплинге.

---

## 3. AI-поведение чужого снапшота

### 3.1. Базовое правило

Бой Veyra — чистый autocast по кругу (`grimoire[0] → [1] → ... → [4] → [0]`). **AI оппонента — это буквально тот же autocast-исполнитель**, запущенный от имени снапшота B. Никакого дополнительного «ИИ поведения» писать не надо.

Это ключевая дизайн-экономия: ротация **уже является билдом**. Игрок B сам спроектировал её, переставляя слоты в гримуаре. Клонировать именно её — честно и точно отражает «как B играл бы на самом деле».

### 3.2. Обработка edge-cases в ротации

| Ситуация | Решение |
|---|---|
| Спелл B требует условия (Scorch: «+50% если Ignite есть») | Применяется по факту; если условие не выполнено — спелл кастуется без бонуса. |
| Healing Rain, когда HP > 50% | Кастуется впустую (по ротации) — это **осознанный билд-выбор игрока B**, не баг AI. |
| Focus перед маленьким спеллом | Аналогично — ротация определяет, что Focus усилит следующий каст. |
| Пустой слот в гримуаре B | Пропускается, переход к следующему. |
| Все 5 слотов пусты | Снапшот отклоняется на стадии создания (валидация: minGrimoireSpells ≥ 1). |

### 3.3. Resonance для оппонента

- Если у B установлен `resonancePreset` — он применяется автоматически на стороне A для симуляции B (и он виден в pre-battle UI!).
- B **не может** сменить resonance «в ответ» на конкретного A — это и есть суть async-режима. B настроил пресет однажды; все, кто получает B как оппонента, дерутся против этого пресета.

### 3.4. Будущее: profile-based AI (v2+)

Для pre-made AI-ботов (фейк-оппоненты в малозаселённом пуле) можно сгенерировать синтетические PlayerSnapshot с типовыми ротациями. Те же правила autocast — 100% переиспользование кода.

---

## 4. Матчмейкинг

### 4.1. Правила отбора (MVP)

Пул кандидатов: все снапшоты с `level >= playerLevel - 3 && level <= playerLevel + 3` **И** `|mmr - playerMmr| <= 150`. Если пул < 5 кандидатов — окно MMR расширяется на +50 каждые 3 секунды поиска (до ±400). Таймаут поиска: 15 сек; если никого — подставляется синтетический снапшот («Echo of the Pale Mirror», loot = половина награды).

### 4.2. Защита от бот-ферм (альт-киллер)

Риск очевиден: игрок создаёт 10 слабых альтов, кормит ими свой главный аккаунт. Меры:

1. **Anti-self-match по wallet**: запрет матчей с снапшотами того же `playerId` (на Abstract это тривиально — wallet address).
2. **IP / device fingerprint cooldown (off-chain v1)**: снапшоты с одного fingerprint в одну и ту же неделю не матчатся друг с другом. Не идеал, но поднимает порог трения.
3. **Soulbound gating (v2)**: для вхождения в PvP-пул нужен on-chain soulbound token «Awakened Duelist». Токен выдаётся за завершение PvE-milestone (например, clear tower 1st time + level 15). Альт-фарм требует повторного PvE-прохождения — экономически невыгоден.
4. **Матч против слабого оппонента даёт нелинейно меньше рейтинга**: при разнице MMR > 200 — winner получает ≤ 4 MMR и loser теряет ≤ 2. При разнице > 400 — 0 MMR для обоих. Elo-формула с компрессией.
5. **Decay на неиграющих**: снапшот > 14 дней без обновления выпадает из активного пула (остаётся для истории). Альты придётся «поддерживать свежими».
6. **Rate-limit на создание снапшотов с одного IP**: не более 3 новых playerId/неделю.

### 4.3. Элементальный matcher (soft rule)

Когда в пуле достаточно кандидатов — приоритезировать **разнообразие классов**. Не матчить 5 Pyro подряд, если в пуле есть другие классы в том же MMR-bracket. Это повышает ценность Sigil Resonance counter-pick.

---

## 5. Анти-чит

### 5.1. Модель угроз

Бой на клиенте A. Возможные атаки:

- **A1**: A «подкручивает» свой снапшот (level, attributes, equipment) на клиенте перед отправкой.
- **A2**: A подделывает результат матча (`winnerId = A` даже если B должен был выиграть).
- **A3**: A спамит матчи, чтобы быстро фармить рейтинг.
- **A4**: A вручную редактирует логику combat.js в DevTools ради чит-урона.

### 5.2. Защиты

**Серверная валидация снапшота (A1)**:
- Все вычисляемые поля (maxHP, baseATK, magicPower) пересчитываются сервером из level + attributes + equipment. При несовпадении — снапшот отклоняется.
- Формулы прогрессии hard-coded на сервере; на v2 — в смарт-контракте.

**Детерминистская пересимуляция матча (A2, A4)**:
- Сервер хранит `rngSeed` матча. При флаге `suspicious` (см. ниже) — запускает boxed-симуляцию (headless JS в Node/Deno) с теми же снапшотами и сидом. Если результат ≠ заявленному — матч аннулируется, A получает `-15 MMR` + 24h cooldown + flag.
- **Семплинг**: 5% всех матчей пересимулируется всегда. 100% матчей топ-100 игроков пересимулируется. Матчи, где winner поднялся > 50 MMR за час, пересимулируются 100%.

**Rate limits (A3)**: см. §6.

**Экономический disincentive (A4)**: максимум 30 MMR/день (см. §6). Даже если A читерит — капнет быстро, а шанс попасть под семплинг = 100% при подозрительной скорости.

### 5.3. Что НЕ делаем в MVP

- Полный anti-cheat на клиенте (code obfuscation, integrity checks) — инфинити-гонка, теряем время.
- Proof-of-play zero-knowledge — красиво, но overkill на v1. Оставляем как v3+ research.

---

## 6. Частота и cooldown

### 6.1. Дневная энергия

- **10 PvP-боёв в день** (reset в 00:00 UTC).
- Первые 5 боёв — полная награда; боя 6–10 — половина MMR-движения (но полный gold/sigils).
- Лимит защищает от «сел на день, накрутил рейтинг».

### 6.2. Cooldown между боями

- **60 секунд** между матчами. Защита от спам-атак и от использования «пересоздал снапшот, перематчился» для микро-адаптации.

### 6.3. Sigil Resonance и PvP

- Resonance-пресет разрешён в PvP (и является главным counter-pick инструментом).
- Стоимость Sigils остаётся в PvE, но в PvP **снижается в 2 раза** (1/6/12 вместо 5/12/25). Обоснование: в PvP игрок платит уже дважды — слот гримуара и MMR-риск. Делать resonance дорогим тут — выключать главную фичу.

---

## 7. Награды и рейтинг

### 7.1. Elo/MMR формула

Стандартный Elo с K=32 и компрессией на разрыв > 200. Стартовый рейтинг: 1000. Тиры:

| Тир | MMR | Лор-название |
|---|---|---|
| Unranked | 0–999 | — |
| Novice | 1000–1199 | Apprentice |
| Adept | 1200–1499 | Adept of the Pale Mirror |
| Duelist | 1500–1799 | Duelist |
| Archon | 1800–2099 | Archon of Colwick |
| Mythweaver | 2100+ | Mythweaver |

### 7.2. За победу

- **MMR**: по Elo.
- **Gold**: `20 + floor(opponentLevel × 1.5)`. Не PvE-уровень, но стабильный доход.
- **Sigils**: 1 (базово) + 1 bonus за победу над соперником выше по MMR.
- **PvP Shards (новая валюта)**: 3 (win) / 1 (loss, consolation). Тратятся на косметику (см. §7.4).

### 7.3. За поражение

- MMR по Elo (всегда минус).
- Gold: `10 + floor(opponentLevel × 0.5)` (compensation).
- 1 PvP Shard.

### 7.4. Награды сезона

**Сезон = 28 дней**. В конце сезона:

| Финальный тир | Награда |
|---|---|
| Novice | 50 gold, 2 Sigils |
| Adept | 150 gold, 5 Sigils, cosmetic frame «Pale Apprentice» |
| Duelist | 500 gold, 15 Sigils, cosmetic cloak skin «Shade-Woven» |
| Archon | 2000 gold, 40 Sigils, cosmetic staff skin «Obelisk Rod» + title |
| Mythweaver | 5000 gold, 100 Sigils, unique animated banner + NFT (v2+) |

**Косметика — эксклюзив сезона** (не продаётся и не выпадает в PvE). Это главный пряник лидерборда.

### 7.5. Season reset

- Все MMR сходятся к 1000 по формуле `newMmr = 1000 + floor((oldMmr - 1000) × 0.5)`. Постоянный прогресс — но Archon-игроки не сохраняют весь отрыв.
- PvP Shards не сбрасываются.
- Лидерборд обнуляется; топ-100 прошлого сезона отображается в «Hall of Mirrors».

### 7.6. Лидерборд

- Отдельная вкладка в PvP-экране. Показывает: rank, displayName, class (icon), MMR, tier, last-active.
- Кликом на игрока — показывается его публичный снапшот (без playerId/wallet в MVP) и опция «Challenge» (матчится именно с ним, если MMR-diff допустимый).

---

## 8. MVP scope

### 8.1. Что входит в v1.0

1. **Entry point**: кнопка `Shade Arena` в Town Square или в новом «Arena» хотспоте на карте.
2. **Snapshot API (off-chain)**: REST-эндпоинты `POST /snapshot`, `GET /match/find`, `POST /match/result`, `GET /leaderboard`. Хостинг — любой cheap backend (Cloudflare Workers + KV, либо Supabase). Данные — JSON.
3. **Detereministic combat engine**: рефакторинг `combat.js` под PRNG-сид (mulberry32), отделение «чистой» симуляции от DOM-рендера (уже частично сделано через Skip Fight).
4. **Resonance Altar в PvP**: тот же UI, что и в PvE, + показ пресета оппонента.
5. **PvP HUD**: pre-battle screen с оппонентом (аватар, класс, MMR, resonance-пресет, top-3 spells гримуара).
6. **Elo + энергия + cooldown**: как описано выше.
7. **Лидерборд top-100** (просто таблица).
8. **Сезон v1** длиной 28 дней, стартует с релиза фичи.
9. **Награды**: MMR, gold, Sigils, PvP Shards. Одна базовая косметика за тир Duelist+.
10. **Anti-cheat**: серверная валидация снапшота + 5% пересимуляция + каппинг MMR/день.

### 8.2. Что откладываем (v1.1+)

- On-chain миграция снапшотов на Abstract.
- Soulbound Awakened Duelist token.
- Challenge «конкретного игрока» из лидерборда.
- Профессиональный лидерборд-UI (фильтры по классу, поиск по имени).
- Множественные сезонные косметики.
- Реплеи матчей (сервер хранит `{seed, snapshots}` — достаточно для replay, но UI откладывается).
- AI-боты для пустого пула (MVP решает через «Echo of the Pale Mirror» с половинной наградой).

### 8.3. Abstract Network migration path (v2)

Ключевое: MVP-архитектура **уже совместима**. Что меняется при миграции:

- `playerId` → `wallet_address`.
- `snapshotId` → `tx_hash` / `event_id`.
- `POST /snapshot` → emit `SnapshotUpdated` event on-chain (и IPFS-хеш для payload).
- `rngSeed` → вывод из `blockhash(matchBlock)`.
- Награды (PvP Shards, cosmetic NFT) → ERC-1155 / 721.
- Anti-cheat: пересимуляция через on-chain verifier-контракт (long-term).

Все поля `PlayerSnapshot` (§2.2) проектируются так, чтобы быть serializable в JSON ≤ 4KB — это вписывается в обычный IPFS pin и дёшево для on-chain хранения хеша.

---

## 9. Risks & Open Questions

| # | Риск | Митигация |
|---|---|---|
| R1 | Пустой PvP-пул на старте — новичок не находит оппонента | «Echo of the Pale Mirror» — синтетический снапшот + AI-боты в v1.1 |
| R2 | Mirror-матчи (Pyro vs Pyro) без резонанса — рандом | Resonance counter-pick — встроенный skill-layer; см. sigil-resonance.md §5 |
| R3 | Non-deterministic baggage в combat.js (timing, DOM) | Выделить pure-simulate функцию; все RNG через mulberry32(seed) |
| R4 | Сервер v1 станет bottleneck при росте | Cloudflare Workers + KV масштабируется линейно до 10K DAU почти бесплатно |
| R5 | Альт-фарм до внедрения soulbound | MMR-cap на разнице + rate-limit на создание аккаунтов + fingerprint cooldown |

### Открытые вопросы

1. Показывать ли `displayName` оппонента, или анонимизировать до «Shade #1234»? Анонимизация снижает токсичность, но лидерборд без имён скучен.
2. Разрешить ли `pick-a-fight` против конкретного лидерборд-игрока — это «вызов» (skill-based) или «таргетинг» (токсичный)?
3. Сезонные косметики: cloak/staff skin vs animated frame — что дешевле отрисовать и что игроки ценят больше? Требует art-director review.
4. Нужна ли placement-серия (10 боёв на калибровку MMR) на старте сезона? Классический esports-паттерн.

---

## 10. Next Steps

### Architect

1. Data model: `PlayerSnapshot` schema + `MatchRecord` schema.
2. Детерминистский PRNG в combat.js (mulberry32, seed injection).
3. Отделение «pure simulation» от DOM-рендера — pure function `simulateMatch(snapshotA, snapshotB, seed) -> MatchResult`.
4. API contract (OpenAPI): `/snapshot`, `/match/find`, `/match/result`, `/leaderboard`.

### Backend / DevOps

1. Cloudflare Workers + KV (либо Supabase) — проектирование storage.
2. Серверная validate-функция для PlayerSnapshot (пересчёт maxHP/baseATK).
3. Worker для 5% семплинг-пересимуляции.
4. Deploy dev endpoint до любой UI-работы.

### UI/UX

1. Экран `Shade Arena` (entry, лидерборд, энергия, history).
2. Pre-battle opponent reveal (аватар, класс, MMR, resonance-пресет).
3. Post-battle result popup + MMR diff animation.
4. Сезонный прогресс-бар + rewards preview.

### Art Director

1. Arena hotspot art (карта Veyra).
2. Иконки тиров (6 штук).
3. Эксклюзивные сезонные косметики — 2-3 комплекта (staff skin, cloak skin, frame).

### Game Designer (follow-up)

1. Playtest Elo-формулы на симуляции 1000 матчей — убедиться, что capped MMR и компрессия работают.
2. Калибровка дневной энергии (10 боёв? 12?) после первого playtest.
3. Детальный копирайт для Shade Arena (flavour tooltips, quotes архонтов).

---

*Документ создан: 2026-04-19*
*Статус: DRAFT v1 — ждёт PM review → Architect handoff*
*Следующий апдейт: после ревью и согласования схемы PlayerSnapshot*
