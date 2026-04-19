# ADR-abstract-migration: Архитектурная подготовка к Abstract Network (L2 Ethereum)

**Дата**: 2026-04-19
**Статус**: Proposed
**Deciders**: Tech Architect
**Область**: Veyra (браузерная dark fantasy RPG, vanilla HTML5/JS/CSS, localStorage, GitHub Pages)

---

## 1. Context

Veyra сегодня: чистый клиент (один `index.html`, ES-модули в `src/js`, state в localStorage под ключом `veyra_player`, без бэкенда). Всё доверие — у клиента: бой считается в `combat.js` через `Math.random()`, лут, XP и золото начисляются синхронно из `state.js`. Для single-player это нормально, но целевое расширение включает PvP (async, Elo) и Mage Tower-лидерборд, а проект планируется интегрировать с **Abstract Network (L2 Ethereum, AGW — Abstract Global Wallet)** — для on-chain идентичности, верифицируемых рейтингов и (позже) on-chain активов.

Цель этого ADR — подготовить архитектуру к миграции **без блокировки текущего геймплея** и без деплоя в mainnet до того, как будут протестированы PvP-сценарии.

Ключевые ограничения:
- GitHub Pages = статический хостинг, нельзя держать server-side state напрямую.
- Vanilla JS, без сборщика (нужно решение, не требующее webpack/vite).
- Клиентская боёвка сейчас НЕ детерминирована — использует `Math.random()`.
- Версия сейва (`state.version = 4`) — уже есть механика миграций.

---

## 2. Decision

Вводим **трёхслойную абстракцию доступа к данным** с feature-flag переключением между режимами, при этом текущий localStorage-режим остаётся рабочим режимом по умолчанию до полного тестирования on-chain слоя.

### 2.1. Целевая архитектура (TO-BE)

```
┌─────────────────────────────────────────────────────┐
│  UI LAYER (оставить как есть)                       │
│  index.html, css/, ui.js, map.js, inventory.js,     │
│  grimoire.js, shop.js, dailylogin.js, tower.js,     │
│  passives_ui.js — ЧИСТО КЛИЕНТСКИЕ, DOM-only        │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│  GAME LOGIC (клиент, но детерминированный)          │
│  combat.js (требует рефакторинга: seeded RNG),      │
│  state.js (расщепить: данные vs. персистентность)   │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│  STORAGE PROVIDER (новая абстракция)                │
│  Интерфейс: load(), save(), commit(), sign()        │
│  Реализации:                                        │
│   • LocalStorageProvider (dev / offline fallback)   │
│   • MockChainProvider     (локальное PvP-тестирование)│
│   • AbstractTestnetProvider (тестовая сеть)         │
│   • AbstractMainnetProvider (prod)                  │
└─────────┬─────────────────────────┬─────────────────┘
          │                         │
┌─────────▼────────┐  ┌─────────────▼──────────────────┐
│  WALLET GATEWAY  │  │ OFF-CHAIN INDEXER (опц., этап 4)│
│  AGW adapter,    │  │ edge function или Supabase:     │
│  session keys    │  │ leaderboard cache, matchmaking  │
└─────────┬────────┘  └─────────────┬──────────────────┘
          │                         │
┌─────────▼─────────────────────────▼─────────────────┐
│  ON-CHAIN (Abstract L2)                             │
│  VeyraLeaderboard.sol, VeyraSnapshot.sol,           │
│  VeyraBattleCommit.sol (commit-reveal anti-cheat)   │
└─────────────────────────────────────────────────────┘
```

**Ключевая идея**: ни один файл UI не импортирует `localStorage` напрямую. Весь доступ идёт через `StorageProvider`, который инжектится на старте из `config.js` по значению feature-флага.

### 2.2. Feature-флаги (в `src/js/config.js`, новый файл)

```js
// Псевдокод контракта, не имплементация
export const CONFIG = {
  STORAGE_MODE: 'local' | 'mock-chain' | 'testnet' | 'mainnet',
  ABSTRACT_ENABLED: false,         // главный killswitch
  PVP_ENABLED: false,
  DETERMINISTIC_COMBAT: false,     // включает seeded RNG
  MOCK_PEERS: ['alice', 'bob'],    // для MockChainProvider
  TESTNET_RPC: 'https://api.testnet.abs.xyz',
  CONTRACT_ADDRESSES: { leaderboard: '0x...', snapshot: '0x...' },
};
```

Флаги читаются из `window.VEYRA_CONFIG` (инлайн в `index.html` per-environment) — без сборщика.

---

## 3. Data Boundary — что где живёт

| Поле state                         | Where | Reasoning |
|------------------------------------|-------|-----------|
| `name`, `level`, `xp`, `gold`      | **(a) local** + опц. snapshot on-chain при PvP | Single-player прогрессия — ценности вне игрока не несёт. On-chain snapshot нужен только как “фотография” для матча. |
| `equipment`, `inventory`           | **(a) local** на этапах 1–4; **(c) on-chain** только если появятся NFT-предметы | Переводить в NFT — отдельный ADR. Сейчас это ненужный газ. |
| `grimoire` (5 слотов)              | **(a) local** + **(b) signed snapshot** для PvP | Клиент отправляет подписанный snapshot перед матчем; оппонент видит тот же набор. |
| `passives` (Sigil Tree, 80 нод)    | **(a) local** + **(b) signed snapshot** для PvP | Аналогично — часть “билда”, фиксируется на момент боя. |
| `classType`, `attributes`          | **(b) signed snapshot** для PvP | Влияет на боёвку, должно быть неизменно в рамках матча. |
| `dailyLogin`, `buffs`, `timestamps`| **(a) local** | Эфемерно, персональное, нет смысла в on-chain. |
| `tower.floorProgress`              | **(a) local** + **(c) on-chain** для Top-N лидерборда | Только зарегистрированный результат (высший этаж + время) уходит в контракт. |
| **PvP battle result**              | **(c) on-chain commit-reveal** | Антифрод: оба игрока коммитят hash(snapshot+seed), затем раскрывают. Клиент запускает ту же детерминированную симуляцию. Контракт валидирует хэш и записывает итог в Elo. |
| **Elo rating / leaderboard rank**  | **(c) on-chain** (read-heavy → off-chain indexer для UI) | Единственная авторитативная истина. |
| `merchantFlags`, `questSeveredFinger` | **(a) local** | PvE-прогрессия. |

Правило: **всё, что влияет на ranking или обменивается между игроками — (b) или (c). Всё прочее — (a).**

---

## 4. Стратегия тестирования БЕЗ mainnet

Цель: протестировать весь PvP-pipeline на 2–3 реальных тестерах до оплаты какого-либо gas в mainnet.

### Этап A — `STORAGE_MODE='local'` (текущее состояние, baseline)
Ничего не меняется, игра работает как сейчас. Нужно для регрессии.

### Этап B — `STORAGE_MODE='mock-chain'` (локальное мультиплеер-тестирование)
`MockChainProvider` эмулирует on-chain операции поверх **одного общего localStorage-пространства под ключом `veyra_mockchain`**, а snapshot отдельного игрока — под `veyra_player_${profileId}`. Переключение профиля — через URL-параметр `?profile=alice`. Это даёт:
- Один браузер, разные профили (через query-param или dev-panel).
- Разные окна в режиме инкогнито/разные браузеры — каждый подцепляется через **BroadcastChannel API** к общему mock-chain (работает в пределах одного origin, т.е. GitHub Pages домена).
- Commit-reveal, Elo, leaderboard — всё эмулируется JS-классом, но **через те же интерфейсы**, что будут у реального контракта.

**Критично**: API `MockChainProvider` = API `AbstractTestnetProvider` = API `AbstractMainnetProvider`. Разница только в реализации.

### Этап C — `STORAGE_MODE='testnet'` (Abstract Testnet, 2–3 тестера)
Подключение к реальному testnet RPC, бесплатные транзакции. Можно пригласить внешних тестеров по ссылке. AGW даёт session keys — подпись не нужна на каждое действие.

### Этап D — мультипрофильная локальная симуляция
Работает в **любом** из режимов A/B/C: dev-panel (`devpanel.js` уже есть) добавляет switcher профилей и кнопку “simulate PvP vs profile X”. Инкогнито-окно даёт отдельный localStorage, но один тот же mock-chain через BroadcastChannel.

### Матрица режимов

| Что тестируется             | Local | Mock-chain | Testnet | Mainnet |
|-----------------------------|:-----:|:----------:|:-------:|:-------:|
| Одиночный PvE               | +     | +          | +       | +       |
| UI PvP-экрана               | mock  | +          | +       | +       |
| Commit-reveal flow          | —     | +          | +       | +       |
| Elo расчёт                  | —     | +          | +       | +       |
| Газовые лимиты / сбои сети  | —     | —          | +       | +       |
| Wallet UX (AGW)             | —     | stub       | +       | +       |

Вывод: mock-chain покрывает ~80% логики без внешних зависимостей, testnet — оставшиеся 20%.

---

## 5. Roadmap миграции (каждый этап не ломает игру)

1. **Refactor storage** (1–2 дня). Извлечь интерфейс `StorageProvider` из `state.js`. Все `localStorage.*` идут через него. Реализован только `LocalStorageProvider`. `ABSTRACT_ENABLED=false`. Регрессия: игра работает идентично.
2. **Seeded combat** (1 день). Заменить `Math.random()` в `combat.js` на `rng(seed)` (например, mulberry32). Seed в PvE — `Date.now()`, в PvP — согласованный обеими сторонами. Флаг `DETERMINISTIC_COMBAT`.
3. **MockChainProvider + PvP UI** (3–5 дней). Реализовать commit-reveal, матчмейкинг через BroadcastChannel, Elo-расчёт в JS. `STORAGE_MODE='mock-chain'`. Тестируем в инкогнито-окнах.
4. **Wallet gateway + AGW stub** (2 дня). Абстракция `WalletProvider`, пока возвращает mock-адрес вида `mock:alice`. Готовим switch на AGW.
5. **Контракты на Testnet** (1–2 недели вместе с Solidity-разработчиком, **нужен researcher agent по Abstract SDK**). Деплой `VeyraLeaderboard`, `VeyraBattleCommit`. `AbstractTestnetProvider` реализует тот же интерфейс.
6. **Off-chain indexer** (опц., если leaderboard-чтение окажется дорогим). Supabase / Cloudflare Worker читает события контракта и отдаёт кеш.
7. **Mainnet launch**. Смена `STORAGE_MODE='mainnet'`, аудит контрактов.

---

## 6. Technical Risks

1. **Недетерминированная боёвка не верифицируема on-chain** — текущий `combat.js` полон `Math.random()`. Оппонент не может воспроизвести результат. **Mitigation**: этап 2 roadmap (seeded RNG) — блокер для PvP.
2. **Снапшот билда можно подделать на клиенте** — игрок может отредактировать localStorage перед коммитом. **Mitigation**: commit-reveal фиксирует хэш билда ПЕРЕД боем; контракт проверяет, что раскрытый билд соответствует зафиксированному хэшу. Плюс optional server-side rate-limit на экстремальные stat-значения.
3. **GitHub Pages не позволяет хранить секреты** (RPC-ключи, индексер-токены). **Mitigation**: использовать публичные RPC Abstract; off-chain indexer вынести на Cloudflare Worker с CORS.
4. **AGW / Abstract SDK может требовать bundler** — vanilla-подход может сломаться. **Mitigation**: перед этапом 4 researcher agent должен проверить ESM-совместимость AGW. Fallback — подключение через `<script type="module">` с esm.sh CDN.
5. **Миграция сейвов** — пользователи с `version=4` должны корректно переехать на систему с `StorageProvider`. **Mitigation**: механика миграций в `loadState()` уже есть; добавить `version=5` который просто ре-шейпит данные и продолжает работать.

---

## 7. API Contracts (стабы для разработчика)

```ts
// src/js/storage/types.d.ts (концепт, TS-нотация для ясности)
interface StorageProvider {
  load(): Promise<PlayerState>;
  save(state: PlayerState): Promise<void>;
  // PvP
  commitBattle(snapshotHash: string, seed: string): Promise<TxRef>;
  revealBattle(snapshot: PlayerSnapshot, seed: string, result: BattleResult): Promise<TxRef>;
  getLeaderboard(top: number): Promise<LeaderEntry[]>;
  getElo(address: Address): Promise<number>;
  subscribeMatches(cb: (match: MatchProposal) => void): Unsubscribe;
}

interface WalletProvider {
  connect(): Promise<Address>;
  sign(payload: string): Promise<Signature>;
  getAddress(): Address | null;
  isConnected(): boolean;
}

interface PlayerSnapshot {
  address: Address;
  classType: string;
  level: number;
  attributes: { strength: number; intelligence: number };
  equipment: { staff: ItemId; hat: ItemId; cloak: ItemId };
  grimoire: SpellId[];   // 5 slots
  passives: NodeId[];
  version: number;
}

interface BattleResult {
  winner: Address;
  turns: number;
  seed: string;
  snapshotHashA: string;
  snapshotHashB: string;
}
```

---

## 8. Implementation Notes for Coder

- **Не трогай UI-модули** на этапе 1. Только `state.js` → расщепить на `state/data.js` (константы) + `state/store.js` (persistence через StorageProvider).
- **Все места записи в state** (в `state.js` 17 вызовов `saveState()`) должны остаться с теми же сигнатурами — меняется только реализация внутри.
- **Детерминизм боя — отдельный PR** после storage-рефакторинга. Любая новая механика в `combat.js` с этого момента должна использовать `rng()` из контекста, а не `Math.random()`.
- **MockChainProvider** удобно держать в `src/js/storage/mock-chain.js`; commit-reveal reducer — там же.
- **Не подключай AGW SDK до этапа 4.** Сначала убедись, что `WalletProvider` stub проходит все игровые потоки.
- **Gotcha**: BroadcastChannel не работает между window и iframe с другим origin и между вкладками в Safari с отключённым cross-site tracking. Для тестинга требовать Chrome.
- **Research-gap**: перед этапом 4 нужен researcher agent по темам (a) Abstract SDK ESM/CDN совместимость, (b) AGW session keys lifecycle, (c) газовые лимиты на Abstract L2 для commit-reveal паттерна.

---
