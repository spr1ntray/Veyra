# ADR-action-rpg-engine: 2D top-down action RPG engine (pivot от autocast к Diablo-like)

**Дата**: 2026-04-19
**Статус**: Proposed
**Deciders**: Tech Architect
**Область**: Veyra (ПК браузер, vanilla HTML5/JS/CSS, GitHub Pages, localStorage, без бэкенда)
**Связанные ADR**: `adr-abstract-migration.md` (seeded RNG / детерминизм — обязательный контракт этого движка)

---

## 1. Context

До сегодняшнего дня Veyra — пошагово-автокастовая RPG: бой считается в `combat.js` по таймерам `setTimeout` + анимации через абсолютно позиционированные `<img>` на статической сцене (`#screen-combat`). Игрок только наблюдает. Это решение вытягивало ~2400 строк одной JS-логики и не расширяется в сторону AAA-ощущения игры.

Пользователь решил развернуть проект в **2D top-down pixel art action RPG** в духе Diablo: игрок кликом бежит по тайловой карте, активно использует 1-5 скиллов, вокруг десятки мобов, лут, биомы, extraction portal. Это **не эволюция combat.js, а новый движок** — render loop на `<canvas>`, entities с физикой и AI, tilemap, проекции, партиклы.

Ограничения, которые нельзя двигать:
1. **Платформа**: только ПК браузер. GitHub Pages = статика, без бэкенда.
2. **Стек**: vanilla JS, без сборщика. Добавление зависимостей допускается, но только как ES-модуль через `<script type="module">` либо как single-file drop-in.
3. **Детерминизм**: `adr-abstract-migration.md` требует seeded RNG и reproducible симуляции — это блокер для PvP-верификации на Abstract L2. Новый движок изначально пишется с этим контрактом.
4. **Не ломать существующий UI**: Inventory, Shop, Sigil Tree, Grimoire, Map, Daily Login, HUD локации — остаются без изменений. Новый action-combat заменяет **только** экран `#screen-combat`.
5. **Данные**: `ITEMS_DATA`, `SPELLS_DATA`, `ENEMIES_DATA`, сохранения игрока, Sigil Tree, equipment, gold — 100% остаются. `combat.js` — удаляется целиком.

Цель: vertical slice — **один биом, одна комната 20×15 тайлов, один класс, один скилл (Fireball), 5-10 мобов, extraction portal**. Должно работать 60 fps при 200+ одновременных сущностях на canvas в Chrome/Safari/Firefox.

---

## 2. Decision

### 2.1. Общий подход

Строим **canvas 2D-движок на vanilla JS** с тремя обязательными слоями:
1. **Engine** (`src/js/engine/*`) — движок, переиспользуемый между биомами: render, tilemap, entities, AI, pathfinding, input, sprites, audio, RNG.
2. **Dungeon** (`src/js/dungeon/*`) — игровая сцена: инициализация комнаты, спаун мобов, extraction, loot pickup, биомы.
3. **Bridge к существующему state** (`src/js/combat_bridge.js`) — единственная точка связи нового движка со старым `state.js`, `inventory.js`, `grimoire.js`, `ui.js`. Движок не знает про localStorage. Bridge конвертирует результат рана в state-апдейт.

**WebGL/PixiJS отклоняем** (см. §5 — Considered Alternatives). Canvas 2D тянет 800 sprite на MacBook Air M1, при условии object pooling + spatial grid + offscreen atlas. Если упрёмся — мигрируем слой `render.js` на Pixi без изменения остального кода (render интерфейс узкий).

### 2.2. Детерминизм и fixed timestep

**Fixed 60 Hz update + variable render.** Классическая схема (Glenn Fiedler "Fix Your Timestep"):

```js
const DT = 1/60;          // 16.666 мс — единственный шаг симуляции
let accumulator = 0;
function loop(ts) {
  const frame = Math.min((ts - lastTs)/1000, 0.25); // clamp против spiral of death
  accumulator += frame;
  while (accumulator >= DT) {
    input.snapshot();
    world.update(DT);     // вся игра-логика: AI, физика, projectiles, DoTs
    accumulator -= DT;
    world.tick++;         // монотонный тик — используется как часть RNG seed
  }
  render.draw(world, accumulator / DT); // интерполяция только визуала
  requestAnimationFrame(loop);
}
```

**Почему фиксированный шаг**: только так бой воспроизводится детерминированно при одинаковом seed + одинаковой входной последовательности. Variable step → jitter в AI, projectile hit, DoT интервалах → реплей не сойдётся → Abstract on-chain verify сломается.

**Spritesheet-анимация — кадр-по-кадру**, без интерполяции (требование 7). 60 мс/кадр = ~16.7 FPS анимации, и это значение пересчитывается в тиках симуляции, не в мс: `framesPerStep = round(animFrameMs / (DT*1000))` — так анимация остаётся синхронной с логикой.

**RNG**: единый `mulberry32(seed)` из `engine/rng.js`, seed = `hash(runId + tick)`. Никаких `Math.random()`. Линтер в CI (простой grep-hook) блокирует коммит с `Math.random` в `src/js/engine/` и `src/js/dungeon/`.

### 2.3. Entity model — простые классы + композиция, не ECS

Для vertical slice ECS-фреймворк избыточен. Простая иерархия:

```
Entity (абстракт): id, pos{x,y}, vel{x,y}, radius, alive, sprite, z
 ├─ Actor extends Entity: hp, hpMax, team, state (FSM), onDeath()
 │    ├─ Player extends Actor: skills[], cooldowns{}, moveTarget, path[]
 │    └─ Enemy  extends Actor: ai (AIComponent), attackRange, aggroRange
 ├─ Projectile extends Entity: owner, dmg, lifetime, onHit(target)
 └─ Pickup extends Entity: kind, itemId
```

**Поведение — через композицию, не наследование**: AI, collider, sprite — отдельные объекты, подвешенные на actor. Это даст чистую миграцию на ECS (bitECS/miniplex) позже, без переписывания игры.

FSM статусов (`idle | moving | casting | hurt | dead`) — тонкий объект с `state, enterTs, transitionTo(newState)`; переходы жёстко проверяются, чтобы `casting` не прерывался движением по ошибке.

### 2.4. Tilemap и коллизии

- **Tile size**: **32×32 px**. Почему не 48: (а) большинство free pixel-art tilesets делается в 16/32/64, 48 редок; (б) 32 даёт 25×17 тайлов в 800×540 viewport с масштабом ×1, и 40×22 в 1280×720 — достаточно места для действия; (в) кратно степени двойки = дружелюбно к GPU текстурным кэшам на случай миграции в WebGL.
- **Хранение**: `tilemap = { w, h, layers: { floor: Uint8Array, wall: Uint8Array, deco: Uint8Array } }`. Uint8Array в ~15 раз компактнее массива объектов и не даёт GC-шума при копировании.
- **Wall collision**: `resolveMoveAgainstTiles(pos, vel, radius)` — проверка 4-8 соседних тайлов + pushback по нормали. Никакой физики-движка. Для комнаты 20×15 это <60 проверок/тик на сущность.
- **Entity-entity collision**: **circle vs circle**, разрешение через uniform spatial grid (`SpatialHash` cell = 64 px). O(n) вместо O(n²).
- **Sorting**: после обновления — сортировка по `y` (top-down depth). Для 200 сущностей `Array.sort` не горлышко, но держим в `world.renderList` и сортируем один раз за кадр.

### 2.5. Pathfinding

Двухуровневая стратегия:
- **Игрок (click-to-move)**: **A* на тайловой сетке**, 4-соседа, manhattan heuristic. Для 50×50 грид и обычного пустого подземелья — <2 мс на путь, вызывается редко (только при новом клике). Реализация `engine/pathfinding.js`, ~80 строк. Результат — массив waypoints `[{x,y}]` в пиксельных координатах, персонаж движется по сегментам.
- **Мобы**: **Line-of-sight check + greedy steering** (идти в сторону игрока, если LOS чист; иначе — A* с кэшем на 0.5 с). Полный A* на каждого моба каждый тик — ~50× дороже. LOS через DDA-traversal (5-15 тайлов, <0.02 мс).

Когда 50 мобов, 40 из них — в LOS (streaming, greedy), 10 — за стеной (A* раз в 500 мс). Это даёт целевой бюджет < 2 мс/кадр на AI.

### 2.6. Player auto-cast FSM

Требование 3: игрок — "автокастер с ручным override". FSM:

```
IDLE ──(enemy in aggroRange?)──► ACQUIRE_TARGET
ACQUIRE_TARGET ──(nearest enemy selected)──► EVALUATE_SKILLS
EVALUATE_SKILLS ──(skill off CD & in range?)──► CAST(skill)
EVALUATE_SKILLS ──(no skill ready)──► PURSUE (move closer)
CAST ──(castTime elapsed)──► projectile spawned → IDLE
IDLE/PURSUE ──(RMB/1-5 pressed)──► OVERRIDE: CAST(chosen skill)
IDLE/PURSUE ──(LMB click ground)──► SET_PATH, state=MOVING
```

Приоритет скиллов = порядок в гримуаре (слоты 1→5). Первый готовый — кастуется. **Override** (нажатие 1-5 или ПКМ на врага) прерывает auto-cast логику на один каст. ЛКМ по земле всегда = move, ЛКМ по врагу = move + attack (persistent target).

### 2.7. Моб AI

MVP FSM на моба:
```
SPAWN → IDLE ──(player in aggroRange)──► CHASE
CHASE ──(in attackRange)──► ATTACK (melee или ranged по типу)
CHASE ──(player out of aggroRange*1.5)──► LEASH back to spawn
ATTACK ──(cooldown)──► CHASE
hp<=0 → DEAD (play anim, drop loot, remove after anim)
```

Поведение инжектится данными из `ENEMIES_DATA` (плюс новые поля `aggroRange, attackRange, moveSpeed, attackType: 'melee'|'ranged', projectileId?`). Никакого поведения-хардкода в классе `Enemy`.

### 2.8. Projectiles & particles

- **Projectile pool**: заранее аллоцированная кольцевая арена на 256 слотов. Никаких `new Projectile()` в hot path. Объект умерший — помечается `alive=false`, его слот переиспользуется.
- **Particle pool**: отдельный пул на 512 слотов. Партикл — это `{x,y,vx,vy,life,lifeMax,color,size}`, никакой логики, только integrate + draw. MVP эффекты: impact flash (5 partciles), death burst (15), cast trail (3/frame).
- **On-hit callback**: projectile хранит reference на функцию (`(target, projectile, world) => {...}`), вызывается при пересечении. Позволяет описать spell в данных, не плодя классов.

### 2.9. Audio

MVP: 3 SFX (cast, hit, death) через WebAudio. Один `AudioContext`, для каждого SFX — декодированный `AudioBuffer`, играется через `createBufferSource` (до 16 одновременных звуков, старые вытесняются по приоритету). Ленивая инициализация AudioContext **после первого пользовательского клика** (политика браузеров).

### 2.10. Что остаётся и что удаляется

| Файл | Судьба |
|---|---|
| `state.js` | Остаётся. Вырезаем `combat.js`-специфичные helpers (их нет — state чист). Данные ITEMS/SPELLS/ENEMIES остаются. Добавляем `currentRun` (в памяти, не persist). |
| `ui.js`, `main.js`, `inventory.js`, `shop.js`, `grimoire.js`, `passives.js`, `passives_canvas.js`, `passives_ui.js`, `map.js`, `dailylogin.js`, `devpanel.js` | Остаются без изменений. |
| `combat.js` | **Удаляется целиком** после переключения с экрана `screen-combat` на новый `screen-action-combat`. Пока не удалён — держим в legacy-папке `src/js/legacy/combat.legacy.js` на 1-2 недели. |
| `tower.js` | Остаётся, но будет адаптирован отдельным этапом (не в этом ADR). 10 биомов = 10 настроек `DungeonConfig` позже. |
| `src/css/combat.css` | Вырезать/переименовать в `action-combat.css`; старый стиль экрана больше не нужен. |
| `index.html` | Добавляем блок `#screen-action-combat` с единственным `<canvas id="game-canvas">`. Старый `#screen-combat` удаляем после стабилизации. |

### 2.11. Run state (persistence boundary)

Новый объект `currentRun` — **только в памяти модуля, не в localStorage**:
```
currentRun = {
  runId: 'uuid',
  rngSeed: uint32,
  biomeId: 'crypt_1',
  startedAtTick: int,
  loot: [{itemId, qty}],
  xpEarned: int, goldEarned: int,
  stats: { kills, dmgDealt, dmgTaken, timeMs }
}
```
При **extraction**: `currentRun.loot` и awards переезжают в `state.inventory/xp/gold` через `commitRun()` в `combat_bridge.js`, затем `saveState()`. При **death**: `currentRun` выбрасывается, прогресс в `state` не меняется. Это закрывает чит-сценарий "закрыл вкладку перед смертью".

---

## 3. Considered Alternatives

| Вариант | Оценка | Вердикт |
|---|---|---|
| **PixiJS (WebGL)** | ~200-300 KB, быстрее на 1000+ спрайтов, встроенные фильтры. Но: сборка не требуется (есть `pixi.min.js` drop-in), однако лишняя зависимость, чужое API, и для 200 спрайтов canvas 2D не узкое место. | Отклонён **на MVP**. Держим как план B, если профайлер покажет `< 55 fps`. |
| **Kontra.js** (~13 KB) | Минималистичный 2D helper: quadtree, sprite, tileEngine. Полезный, но забирает контроль над render loop и camera. Собственный DSL. | Отклонён. Проще написать 400 строк своего, чем подстраиваться под чужие абстракции. |
| **Phaser 3** (~1 MB) | Полноценный фреймворк. Решает 90% задач "из коробки". Но: вес, крутая кривая, GitHub Pages + ES-модули без сборщика — боль. Теряем vanilla-идентичность проекта. | Отклонён. |
| **ECS-микро (bitECS ~10 KB)** | Лучший performance для 1000+ entities. Но vertical slice = 50-200 entities, и нам нужно быстро получить рабочий MVP. | Отклонён **на MVP**. Внутреннее API движка спроектировано под миграцию в ECS без переписывания dungeon-кода. |
| **Variable timestep** | Проще в реализации. Но ломает детерминизм — дисквалифицировано ограничением `adr-abstract-migration.md`. | Отклонён. |
| **A* для всех мобов** | Самый "правильный" pathfinding. Но на 50 мобах × 60 тиков/сек = 3000 путей/сек — переедает CPU. | Отклонён в пользу hybrid (LOS + greedy + кэш). |

---

## 4. Consequences

**Становится легче:**
- Добавить новый биом = написать `DungeonConfig` (layout, mob spawn table, biome tileset). Без правок движка.
- Добавить новый скилл = добавить запись в `SPELLS_DATA` + callback `onHit` в `src/js/dungeon/skills/`. Engine не знает про конкретные спеллы.
- Интегрировать с Abstract (seeded RNG уже внутри): достаточно commit run-seed + input-log + финальный hash для on-chain verify.
- Портировать на ECS позже — потому что composition > inheritance и engine-layer узкий.

**Становится сложнее:**
- Debug tools нужны свои: HUD с tick-counter, entity count, FPS, collision-grid overlay, path-overlay — иначе слепота при балансировке. Заложить в `engine/debug.js` сразу.
- Профилирование с sprite pool — рендер становится менее прозрачным (`Chrome Performance` покажет один большой call-stack). Нужны user timing marks.
- Анимация через фиксированные кадры делает движение визуально "ступенчатым" при слабом FPS. Требует тюнинга `framesPerStep` на каждый спрайт.

**Trade-offs:**
- Teряем "рыхлость" старой системы: новый движок — жёстче структурирован, коду нужен coder, понимающий game loop. Но без этого 60 fps не получить.
- В первые 2 недели старый `combat.js` в `legacy/` — разработчик может путаться. Компенсируется `README` в папке и `eslint-ignore`.

---

## 5. Технические риски и митигация

| # | Риск | Вероятность | Импакт | Митигация |
|---|---|---|---|---|
| R1 | **Canvas 2D не тянет 200+ sprites на Safari iOS-derived MBP M1** | Средняя | Высокий | (а) off-screen texture atlas + `drawImage(atlas, sx,sy,sw,sh,...)` — один источник; (б) `ctx.imageSmoothingEnabled=false` для пикселарта; (в) layered canvas (static tilemap на нижнем, entities — на верхнем), тайлы перерисовываются только при смене камеры. План B: миграция `render.js` на Pixi (узкий интерфейс, 1-2 дня работы). |
| R2 | **A* на JS медленнее, чем ожидали** | Низкая | Средний | Открытый сет на binary heap (не массив!), closed set — `Uint8Array` по индексу тайла. Для 50×50 грид <1 мс. Fallback — greedy steering без A* для мобов (уже в плане). |
| R3 | **Рассинхрон анимации и симуляции** (player выглядит идущим, но стоит) | Средняя | Низкий | Правило: состояние спрайта — функция `Actor.state`, не сторонняя переменная. Анимация-кадр пересчитывается из `world.tick`. Тест: `snapshot(world)` → `10000 ticks` → `snapshot(world)` должен быть детерминирован. |
| R4 | **Memory: sprite sheets раздувают initial load** | Средняя | Средний | MVP-бюджет: **≤ 3 MB** всех sprite-sheets. Character atlas 512×512 ≈ 400 KB webp. 5 enemy × 256×256 ≈ 5×150 KB. Tileset 512×512 ≈ 200 KB. Total ~1.5 MB. Запускаем `Promise.all(preload)` до первого `gameLoop`. |
| R5 | **Click-to-move path теряется при быстром клике** | Средняя | Низкий | `input.latestCommand` — один-в-один slot, новый клик сносит старый. Player.onCommandChange прерывает текущее движение. |
| R6 | **Non-determinism от `performance.now()`** | Высокая без внимания | Критичный (блок для PvP) | ВСЕ tick-зависимые решения используют `world.tick`, НЕ `performance.now()`. `performance.now()` допустим ТОЛЬКО в render.js и input.js. Lint-правило. |
| R7 | **GC-паузы при 800+ объектах** | Средняя | Средний | Object pooling (projectiles, particles, damage numbers). Zero-allocation в `update()` — все временные vec2 — один shared scratch object. |
| R8 | **Safari lags при большом кол-ве `drawImage`** | Средняя | Средний | Бенчмарк сразу на MVP-ветке на M1 Safari. Если 60 fps не держим на 200 sprite — включаем layered canvas + dirty rect для tilemap. |
| R9 | **Старый UI (HUD/Inventory/Shop) ломается из-за смены экрана** | Низкая | Высокий | Новый экран — полноэкранный `<canvas>` ВНУТРИ `.screen.screen-action-combat`, старые экраны не трогаются. Bridge-функции `enterCombat(enemyList, biomeId)` / `exitCombat(result)` — единственный контракт. |
| R10 | **Коллизии застревают в углах** | Средняя | Низкий | Pushback по нормали + sub-step (2 итерации resolve за тик). Тест: actor диаметром 24 в проходе 32 — должен проскальзывать. |

---

## 6. Module structure

```
src/js/
├── engine/                 # переиспользуемый движок (biome-agnostic)
│   ├── config.js           # DT, WORLD_SIZE, пулы, дебаг-флаги
│   ├── rng.js              # mulberry32, hash
│   ├── input.js            # mouse/keyboard → InputSnapshot
│   ├── world.js            # World: tick, entities[], spatialHash
│   ├── render.js           # canvas context, camera, layers, draw(world,alpha)
│   ├── tilemap.js          # Tilemap class, LoS, tile collisions, indexing
│   ├── pathfinding.js      # A* (binary heap), LoS traversal (DDA)
│   ├── spatial_hash.js     # uniform grid 64px для broad-phase
│   ├── collision.js        # circle-circle, circle-tile, resolve
│   ├── entities.js         # Entity / Actor base + FSM helper
│   ├── ai.js               # AIComponent интерфейс + примитивы (chase, leash, attack)
│   ├── sprites.js          # SpriteSheet, Animation (frame-timed по tick)
│   ├── particles.js        # ParticlePool
│   ├── audio.js            # AudioContext + SFX player
│   ├── pools.js            # generic ObjectPool
│   └── debug.js            # overlays, FPS, entity count, grid viz
│
├── dungeon/                # конкретная сцена
│   ├── dungeon.js          # Dungeon: setup, update, teardown; держит World
│   ├── biomes.js           # BIOME_CONFIGS[biomeId] = { tileset, layout, spawnTable, loot }
│   ├── spawner.js          # enemy spawn waves
│   ├── player.js           # Player actor + auto-cast FSM + override
│   ├── enemy.js            # Enemy actor + AI wiring из ENEMIES_DATA
│   ├── projectile.js       # Projectile pool + on-hit callbacks
│   ├── skills/
│   │   ├── index.js        # registry: skillId → onCast/onHit callbacks
│   │   └── fireball.js     # MVP skill
│   ├── loot.js             # drop table, Pickup entity
│   ├── extraction.js       # portal entity, confirm-popup trigger
│   └── hud.js              # HP bar, skill slots, cooldowns — DOM overlay над canvas
│
├── combat_bridge.js        # НОВЫЙ: enterCombat(enemyList,biomeId) / exitCombat(result)
│                           # + commitRun() — пишет xp/gold/loot в state.js
│
├── state.js                # БЕЗ ИЗМЕНЕНИЙ (кроме добавления currentRun ссылки)
├── main.js                 # правка: вместо initBattle → enterCombat
├── ui.js                   # БЕЗ ИЗМЕНЕНИЙ
├── inventory.js / shop.js / grimoire.js / passives*.js / map.js / dailylogin.js / devpanel.js / tower.js
│                           # БЕЗ ИЗМЕНЕНИЙ
└── legacy/
    └── combat.legacy.js    # ВРЕМЕННО: старый combat.js на 1-2 недели, затем удалить
```

### Основной game loop (псевдокод)

```js
// engine/world.js
class World {
  constructor(seed, tilemap) {
    this.tick = 0;
    this.rng = mulberry32(seed);
    this.entities = [];
    this.hash = new SpatialHash(64);
    this.tilemap = tilemap;
    this.events = [];
  }
  update(dt) {                 // dt всегда = 1/60
    this.input = input.snapshot();           // input (mouse/keys)
    ai.updateAll(this);                      // player auto-cast + enemy AI
    physics.step(this, dt);                  // apply vel, tile collide, entity collide
    projectiles.update(this, dt);            // move, check hits, apply dmg
    particles.update(this, dt);
    this.entities.forEach(e => e.update(dt, this));
    cullDead(this);
    this.tick++;
  }
}

// entry
function loop(ts) {
  accum += Math.min((ts - lastTs)/1000, 0.25);
  while (accum >= DT) { world.update(DT); accum -= DT; }
  render.draw(world, accum/DT);
  requestAnimationFrame(loop);
}
```

---

## 7. Data contracts (для coder)

### 7.1. Entity base (pseudocode)

```js
class Entity {
  id; x; y; vx=0; vy=0; radius; z=0;
  alive=true; sprite; anim;
  update(dt, world) {}
  onDestroy(world) {}
}

class Actor extends Entity {
  team; hp; hpMax; state='idle';
  stateEnterTick=0;
  transitionTo(newState, world) { /* validate, set, reset anim */ }
}

class Player extends Actor {
  skills = [];          // SkillSlot[]
  cooldowns = {};       // skillId → tickUnlocked
  moveTarget = null;    // {x,y} или null
  path = [];            // waypoints
  forcedTarget = null;  // RMB click target
  autoCastEnabled = true;
}

class Enemy extends Actor {
  aggroRange; attackRange; moveSpeed;
  attackType;           // 'melee'|'ranged'
  projectileId;         // если ranged
  aiState = 'idle';
}

class Projectile {
  alive; x; y; vx; vy; radius; lifetime; ttl;
  ownerId; dmg; onHit;  // (target, self, world) => void
  elementType;
}
```

### 7.2. BiomeConfig

```js
{
  id: 'crypt_1',
  tileset: 'assets/tilesets/crypt_32.png',   // atlas 32x32 tiles
  tileSize: 32,
  layout: Uint8Array(20*15),                  // flat tile indices
  wallMask: Uint8Array(20*15),                // 0/1
  spawn: { x: 2, y: 7 },                      // player spawn tile
  extractionPortal: { x: 18, y: 7 },
  mobSpawns: [                                // starting mobs
    { enemyId: 'skeleton_warrior', x: 10, y: 5 },
    { enemyId: 'skeleton_warrior', x: 12, y: 8 }
  ],
  waves: [],                                  // пусто на MVP
  lootTable: ['oak_staff', 'novice_hat'],     // поверх глобального state.rollItemDrop
}
```

### 7.3. Skill descriptor

```js
{
  id: 'fireball',
  castTime: 0.8,           // секунды
  cooldown: 1.5,
  range: 300,              // px
  onCast: (player, world, targetPos) => {
    const p = projectilePool.spawn({
      x: player.x, y: player.y,
      vx: dir.x*400, vy: dir.y*400,
      radius: 6, ttl: 0.75, dmg: 30,
      ownerId: player.id,
      onHit: (target, self, world) => {
        target.hp -= self.dmg;
        particles.burst(self.x, self.y, 'impact_fire');
        audio.play('sfx_hit');
      }
    });
  }
}
```

### 7.4. Run result → bridge

```js
exitCombat({
  outcome: 'extracted' | 'died' | 'aborted',
  runId,
  loot: [{itemId, qty}],
  xpEarned,
  goldEarned,
  stats: { kills, dmgDealt, dmgTaken, timeMs }
})
// Bridge → commitRun() → state.addXP/addGold/addItemToInventory → saveState
```

### 7.5. Public engine API (для coder, финально)

```js
// dungeon/dungeon.js
export function startDungeon(biomeId, seed?) { ... }
export function stopDungeon(outcome) { ... }

// combat_bridge.js
export function enterCombat(biomeId, opts)  { ... }   // called from main.js
export function setOnRunEnd(callback)       { ... }
```

---

## 8. Рекомендации по библиотекам

**Рекомендация: начинать без зависимостей.** Писать свой canvas 2D на ~800-1200 строк engine-кода. Обоснования:
1. Полный контроль над render loop — критично для fixed timestep и детерминизма.
2. Zero build-toolchain — совместимо с GitHub Pages и текущим стеком.
3. Если встретим стену производительности — миграция точечная (engine/render.js → Pixi), остальное не трогается.

**Единственное исключение**, которое допустим на MVP: **`mulberry32` (13 строк, скопировать, не импортировать).** Никаких npm-зависимостей.

**Если позже потребуется**:
- PixiJS — только для рендера, если canvas 2D не тянет (R1 на Safari / slower machines).
- bitECS — если зоопарк мобов > 20 разных AI + 500 сущностей одновременно.
- howler.js — если WebAudio станет больно, когда добавим музыку и 10+ SFX.

Мобильных портов не планируется (пользователь подтвердил: ПК-only), что снимает необходимость в touch-input абстракциях и mobile gesture libs.

---

## 9. Implementation Notes for Coder

### 9.1. Vertical slice roadmap (делать строго по порядку)

1. **Setup scene:** добавить `<div id="screen-action-combat"><canvas id="game-canvas" width="1280" height="720"></canvas></div>` в `index.html`. Стили — полноэкранный canvas, `image-rendering: pixelated`.
2. **engine/config.js + engine/world.js + engine/rng.js** — fixed timestep loop крутится вхолостую, в canvas рисуется чёрный фон + FPS счётчик.
3. **engine/tilemap.js + engine/render.js** — захардкодить одну комнату 20×15, нарисовать тайлы цветными квадратами (`#8a6b3d` floor, `#3a2d1f` wall). Без текстур.
4. **engine/entities.js + dungeon/player.js** — спавн игрока (цветной круг 24 px) в центре. Клавиши WASD двигают тестово.
5. **engine/input.js + engine/pathfinding.js** — click-to-move. A* на текущей комнате. Персонаж идёт по waypoints.
6. **engine/collision.js + engine/spatial_hash.js** — tile collision (стены), circle-circle против dummy entity.
7. **dungeon/enemy.js + engine/ai.js** — один моб (красный круг), chase FSM. LOS check. Player дохнет от столкновения (placeholder damage).
8. **dungeon/skills/fireball.js + dungeon/projectile.js** — ЛКМ по врагу или `1` кастует fireball. Projectile летит, на hit — damage + particle. Враг умирает.
9. **dungeon/hud.js** — DOM overlay: HP bar, 5 skill slots с cooldown. НЕ внутри canvas.
10. **dungeon/extraction.js** — портал (жёлтый квадрат) в комнате. Игрок встал → confirm popup → exitCombat('extracted').
11. **combat_bridge.js** — `enterCombat('crypt_1')` вызывается из main.js по нажатию "Training". `exitCombat` пишет stats в state.
12. **engine/sprites.js + engine/particles.js + engine/audio.js** — заменяем placeholders на реальные спрайт-листы персонажа, добавляем impact particles, 3 SFX.
13. **engine/debug.js** — overlay с FPS, entity count, grid, paths (F3 включает). Обязательно до финализации.
14. **Bench**: 200 мобов в одной комнате — замерить fps в Chrome/Safari/Firefox на M1. Если < 55 fps — эскалировать на Architect (PixiJS или layered canvas).

### 9.2. Гольден-правила

- **Никогда** не вызывай `Math.random()` вне `engine/rng.js`. Использовать `world.rng()`.
- **Никогда** не читай `performance.now()` в `world.update()` или в любом AI/physics коде. Только `world.tick`.
- **Никогда** не создавай `new Projectile()` / `new Particle()` в hot path. Только через пулы.
- **Никогда** не импортируй DOM/UI-модули в `engine/*`. Engine не знает про DOM (кроме canvas ctx в `render.js`).
- **Всегда** добавляй новое поле моба/скилла в данные (`ENEMIES_DATA`, skill registry), не в логику движка.

### 9.3. Open questions для coder — решить с архитектором до старта

1. **Viewport scaling**: 1280×720 фиксированный canvas с CSS-масштабом, или динамический resize? Предложение: фиксированный + CSS fit (`object-fit` на wrapper), чтобы не пересчитывать pathfinding при resize.
2. **Грид 20×15 жёстко или loader JSON?** На MVP — хардкод массива в `biomes.js`. Редактор уровней — позже.
3. **Камера**: на MVP одна комната целиком в viewport (камера не нужна). Когда комната станет больше viewport — добавить `Camera` в `render.js`.
4. **HUD — DOM поверх canvas или рисовать в canvas?** Рекомендация: **DOM** (`position: absolute` над canvas). CSS + фичи браузера (outlines, z-index, шрифты) бесплатны. Урон floating numbers — тоже DOM с `position: absolute` либо в canvas — решить при реализации.
5. **Sprite formats**: webp vs png. Есть `character_idle.webp` — продолжаем webp. На Safari работает.

### 9.4. Definition of Done для vertical slice

- [ ] Персонаж ходит по комнате 20×15 клавишей/кликом, упирается в стены.
- [ ] Один моб видит игрока в aggro, бежит, наносит damage в melee.
- [ ] Fireball кастится по `1` или ПКМ, летит, убивает моба, срабатывает particle + SFX.
- [ ] HUD показывает HP и CD скиллов, обновляется в реальном времени.
- [ ] Extraction portal возвращает в `screen-map` с commit-ом loot в state.
- [ ] 60 fps на Chrome + Safari на MacBook M1 при 50 мобах на сцене.
- [ ] Unit-тест (либо JS-assert в devpanel): запуск `world.update()` 1000 раз с фиксированным seed → hash состояния детерминирован.

---

## 10. Migration plan (минимальный)

1. **Неделя 1**: engine core + placeholder rendering. Старый combat.js остаётся рабочим.
2. **Неделя 2**: dungeon layer, skills, extraction. Флажок `FEATURE_ACTION_COMBAT` в config.js — переключатель старый/новый combat.
3. **Неделя 3**: реальные спрайты, аудио, HUD, debug overlay. Bench + QA. Переключить дефолт флажка на новый.
4. **Неделя 4**: удалить `combat.js`, старый `#screen-combat`, `combat.css`. Архив — в git history.
5. **Позже**: адаптировать `tower.js` как набор BiomeConfigs под новый движок.

---

## 11. Summary

**Ключевые архитектурные решения:**
1. Canvas 2D + vanilla JS (без Pixi/Phaser), ~800-1200 строк engine-кода.
2. **Fixed 60 Hz update + variable render** — обязательно для детерминизма (PvP verify на Abstract).
3. Простые классы + композиция (не ECS). Узкий engine-интерфейс позволяет мигрировать в ECS/WebGL позже.
4. **Tile size 32×32**, tilemap как `Uint8Array`. Circle-vs-circle entity collisions через spatial hash.
5. Hybrid pathfinding: **A* для игрока** (редко, при клике), **LOS+greedy+кэш-A\*** для мобов.
6. **Object pools** для projectiles/particles — zero allocation в hot path.
7. `currentRun` — в памяти, не в localStorage (анти-чит). Commit в state только при extraction.
8. Бридж-модуль — **единственный контакт** engine с существующим UI/state. Inventory/Shop/Sigil Tree не трогаются.

**Recommended libs**: нет. Только 13-строчный `mulberry32` inline. PixiJS — план B, не MVP.

**Top pitfalls для coder:**
- `Math.random()` / `performance.now()` в game logic = ломает детерминизм. Линтер обязателен.
- Создание объектов в `update()` = GC hitch. Всегда пулы + shared scratch vec2.
- LOS-check без A* у мобов — моб застрянет за углом. Fallback A* по таймеру 500 мс обязателен.
- `imageSmoothingEnabled=true` (default) размыливает пикселарт. Выставить `false` на старте и каждой смене контекста.
- Анимация по `performance.now()` вместо `world.tick` — рассинхрон после fast-forward / pause.
