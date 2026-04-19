# Abstract Network — ресёрч для миграции Veyra

**Дата:** 2026-04-19
**Исследователь:** Researcher Agent
**Статус:** практический отчёт перед принятием решения о миграции

---

## TL;DR (Ключевые выводы)

- **Abstract = ZK L2 от Igloo Inc (Pudgy Penguins), mainnet с января 2025**, работает на **ZKsync VM / EraVM**. EVM-совместимость — на уровне Solidity, **не bytecode**. Стандартные OpenZeppelin ERC-20/ERC-721 деплоятся, но нужен `zksolc` вместо `solc`.
- **Abstract XP — off-chain**, начисляются Abstract Portal за активность в dApps. Распределением управляет core team; каждое приложение не "чеканит" XP само — оно попадает в whitelist, и тогда взаимодействия с его контрактами начинают учитываться. Связь с будущим токеном подтверждена, TGE даты нет (на апрель 2026).
- **AGW (Abstract Global Wallet)** — нативный smart-contract wallet, логин через email / social / passkey. Поддерживает **paymaster (gasless)** и **session keys** — идеально для браузерной игры: пользователь подписывает одну сессию, дальше играет без попапов.
- **SDK первично React (`@abstract-foundation/agw-react` + `agw-client` на базе wagmi/viem).** Для vanilla JS — использовать только `agw-client` (viem-based). Готового "pure vanilla" примера от Abstract нет — будет адаптация.
- **Testnet есть** (chainId 11124, `https://api.testnet.abs.xyz`, explorer `sepolia.abscan.org`). Можно полностью отлаживать контракты и AGW до mainnet.
- **Для SPA без бэкенда возможна архитектура:** wallet + клиент + on-chain контракты (лидерборд, достижения, NFT-награды). **НО** анти-чит и секреты игровой логики без сервера сделать нельзя — клиент виден игроку.

---

## Детальный анализ

### 1. Abstract XP / поинты

- **Источник:** Abstract Portal (portal.abs.xyz) — центральный хаб экосистемы. Пользователь коннектит AGW, и Portal трекает его активность в whitelisted dApps.
- **Формат:** off-chain, учёт в базе Abstract. On-chain видны только сами транзакции, XP как счётчик — вне цепи.
- **Кто распределяет:** Abstract core team. Приложения подают заявку на включение в "Discover" и получают квоту XP за взаимодействия. Своих "поинтов внутри dApp" core team начисляет не напрямую — это дело самой игры, и потом уже эта метрика может конвертироваться в XP через интеграцию с Portal.
- **Бусты:** держатели Pudgy Penguins / Lil Pudgy / 88,888+ $PENGU получают XP multiplier.
- **Badges:** Lightning (daily/event), Weekly, Secret — квесты от Portal, выполняющиеся через взаимодействие с конкретными dApps.
- ⚠️ **Важно для Veyra:** нельзя "нарисовать" XP клиентом. Чтобы игра давала XP игрокам, нужно (а) попасть в Abstract Discover, (б) эмитить on-chain события, которые Portal будет учитывать. Без этого XP-экономика внутри игры = чисто наш внутренний счётчик.

### 2. Abstract Global Wallet (AGW)

- **Auth:** email / social / passkey через native account abstraction. Никаких seed phrases на старте.
- **Архитектура:** smart contract wallet, деплоится при первой транзакции, **первый деплой оплачивает paymaster** — у пользователя может быть 0 ETH.
- **SDK:**
  - `@abstract-foundation/agw-react` — React hooks (`useLoginWithAbstract`, `useAbstractClient`), построен на wagmi.
  - `@abstract-foundation/agw-client` — низкоуровневый клиент на viem. **Это то, что нужно для vanilla JS Veyra.**
- **Gasless:** добавляется одно поле `paymaster` в транзакцию — и за газ платит разработчик приложения (нужен депозит в paymaster-контракт).
- **Session keys** ✅ — killer-feature для игры:
  - Пользователь один раз подписывает "на N часов разрешаю signer X выполнять actions Y/Z до лимита L".
  - Дальше клиент сам подписывает транзакции от имени session key — **без попапов**.
  - На mainnet session keys проходят security review и попадают в Policy Registry.
- **UX для Veyra:** одно "Login" → одно "Start playing" (session approval) → дальше все взаимодействия (клейм награды, запись результата в лидерборд) без подтверждений.

### 3. Смарт-контракты

| Аспект | Значение |
|---|---|
| VM | ZKsync VM (EraVM) |
| Solidity | 0.8.x поддерживается |
| Компилятор | `zksolc` (zkSync fork), не стандартный `solc` |
| Деплой | Hardhat + `@matterlabs/hardhat-zksync` или Foundry-zksync |
| ERC-20 / ERC-721 | Работают, но нужен `zksolc`. OpenZeppelin совместим. |
| Precompiles | Отличаются от Ethereum (см. docs.abs.xyz/how-abstract-works/evm-differences) |
| Gas | ETH как gas token |
| AA | Нативная: любой контракт может быть "аккаунтом" |
| Paymaster | Нативный, стандартизован на уровне протокола |

⚠️ **Gotcha:** bytecode-level инструменты (типа инлайн-ассемблера с опкодами Ethereum) могут ломаться. Но для типовых ERC-контрактов — прозрачно.

### 4. Примеры игр на Abstract

| Игра | Что даёт игрокам | On-chain / Off-chain |
|---|---|---|
| **Pudgy World** | Бесплатный браузерный MMO-лайт, квесты, мини-игры. Даёт Portal XP за активность. | Гибрид: прогресс off-chain, NFT-pengu on-chain. |
| **LOL Land (YGG Play)** | Board game, points → $YGG токены. Premium mode — платные ролы. | Points off-chain у YGG, выплаты и NFT on-chain. |
| **Myriad Markets** | Prediction market, бейдж "Myriad Master" за ставку. | Ставки on-chain, бейдж — Portal XP off-chain. |
| **Roach Racing Club** | Гонки + NFT тараканов. | NFT on-chain, игра off-chain. |

**Паттерн:** игровая логика — клиент+сервер, on-chain только: (1) NFT, (2) токеновые выплаты, (3) события-маркеры для Portal XP.

### 5. Testnet

- **Chain ID:** 11124
- **RPC:** `https://api.testnet.abs.xyz`
- **WS:** `wss://api.testnet.abs.xyz/ws`
- **Explorer:** `https://sepolia.abscan.org/`
- **Faucet:** `docs.abs.xyz/tooling/faucets` — можно получить testnet ETH напрямую или бриджнуть Sepolia ETH.
- **AGW на testnet:** работает, можно полноценно тестить логин, session keys, paymaster.
- ✅ **Вывод:** лидерборд и все контракты можно полностью отладить перед mainnet без копейки затрат.

### 6. Ограничения для SPA без бэкенда

**Что можно чисто на клиенте + on-chain:**
- Логин через AGW (никаких серверов).
- Чтение состояния игрока из контрактов (баланс NFT, прогресс, лидерборд).
- Запись результатов, покупка, крафт — транзакции от session key.
- Лидерборд как on-chain контракт — любой может читать через RPC.

**Где нужен сервер (или нельзя обойтись без него):**
- ⚠️ **Анти-чит:** если игровая логика целиком в JS клиенте, игрок может отправить в контракт любой "score". Решение — (а) принять (оставить клиентским, ценность только косметическая), (б) серверная валидация с подписью ("этот результат честный"), (в) on-chain симуляция ключевых действий (дорого).
- ⚠️ **Секреты контента:** дроп-таблицы, seed боссов, скрытые механики — в JS видны в devtools. Либо шифровать/обфусцировать, либо держать на сервере.
- **Индексация/аналитика:** лидерборд с сортировкой по тысячам игроков через RPC — медленно. Нужен The Graph / Goldsky / Ponder (можно бессерверно как сервис).
- **Push/асинхронные события:** без сервера — только пуллинг RPC.

**Рекомендуемая архитектура для Veyra (hostless):**
- Клиент (GitHub Pages) + AGW + session keys.
- Контракты: `VeyraLeaderboard`, `VeyraAchievements` (ERC-721 soulbound), `VeyraItems` (ERC-1155 опционально).
- Индексация: Goldsky subgraph (бесплатный тариф) для быстрого чтения лидерборда.
- Косметические скоры — клиентские; **только финальные метрики** (прохождение босса, уровень) пишутся on-chain.

---

## Sources

- [Abstract Docs — AGW overview](https://docs.abs.xyz/abstract-global-wallet/overview)
- [Abstract Docs — Connect to Abstract](https://docs.abs.xyz/connect-to-abstract) — chain IDs, RPC
- [Abstract Docs — EVM Differences](https://docs.abs.xyz/how-abstract-works/evm-differences/overview)
- [Abstract Docs — Session Keys](https://docs.abs.xyz/abstract-global-wallet/session-keys/overview)
- [Abstract Docs — Faucets](https://docs.abs.xyz/tooling/faucets)
- [GitHub — Abstract-Foundation/agw-sdk](https://github.com/Abstract-Foundation/agw-sdk)
- [GitHub — agw-contracts](https://github.com/Abstract-Foundation/agw-contracts)
- [npm — @abstract-foundation/agw-client](https://www.npmjs.com/package/@abstract-foundation/agw-client)
- [ChainList — Abstract 11124 (testnet)](https://chainlist.org/chain/11124)
- [Decrypt — 9 Biggest Games on Abstract](https://decrypt.co/302624/9-biggest-games-ethereum-layer-2-abstract)
- [Decrypt — Abstract Launches XP](https://decrypt.co/302978/ethreum-l2-abstract-launches-xp-rewards)
- [CoinGecko — How to earn Abstract XP](https://www.coingecko.com/learn/how-to-interact-with-the-abstract-ecosystem-and-earn-xp)
- [MEXC Blog — Abstract Airdrop 2026](https://blog.mexc.com/abstract-chain-airdrop-2026-how-to-farm-xp-badges-and-pudgy-penguin-boosts/)
- [NFTPlazas — Abstract Chain guide](https://nftplazas.com/abstract-chain-guide/)
- [PlayToEarn — YGG Play / LOL Land](https://playtoearn.com/news/ygg-launches-web3-game-publishing-unit-ygg-play-and-lol-land-on-abstract-chain)
- [Jarrod Watts (Abstract DevRel) on AGW](https://x.com/jarrodWattsDev/status/1852013902072066159)

---

## Рекомендация

**Abstract — хороший матч для Veyra**, если приоритеты: (а) минимальный онбординг через email/passkey, (б) gasless UX, (в) попадание в trend-волну consumer crypto / Pudgy-аудиторию.

**Что оставить клиентским (GitHub Pages, vanilla JS):**
- Весь геймплей, рендеринг, бои, анимации, инвентарь, прогрессия.
- AGW-логин через `@abstract-foundation/agw-client` (viem-based, без React).
- Session key approval на старте сессии.

**Что вынести в смарт-контракты (on-chain):**
- Лидерборд (запись результатов уровней/боссов).
- Достижения как soulbound ERC-721 или ERC-1155.
- NFT-предметы, если будут.
- Ивент-эмиты для Portal XP (когда подадим заявку в Discover).

**Что потребует сервера (или компромисса):**
- Анти-чит для лидерборда — либо подписанные серверные валидации, либо смириться, что топы будут с читерами (как в большинстве браузерных игр раньше).
- Быстрая индексация рейтинга — через Goldsky/The Graph (managed, не свой сервер).

**Следующие шаги (рекомендую именно в таком порядке, но решение за тобой):**
1. Прогнать hello-world: написать `VeyraLeaderboard.sol`, задеплоить в testnet (chainId 11124), написать vanilla-JS клиент с `agw-client`, проверить session keys end-to-end.
2. Только после живого PoC на testnet — принимать решение о mainnet.
3. Параллельно подать заявку в Abstract Discover — ревью занимает время, лучше начать заранее.

⚠️ **Красный флаг:** Veyra в vanilla JS без бэкенда — Abstract **технически поддерживает** эту архитектуру, но SDK-экосистема явно React-first. Vanilla JS путь рабочий, но community-примеров меньше — будь готов копаться в `agw-client` исходниках самостоятельно.
