# ADR — Tile rework, collision, anim stability, custom-map pipeline

**Date**: 2026-04-26
**Status**: Proposed
**Deciders**: Tech Architect (для PM → coder)

## Context
Pivot-движок (Vanilla JS + Canvas 2D) использует `TILE_SIZE = 12px` при спрайтах тайлов 32×32 (апскейл 2.67×). Это создаёт три проблемы: (1) застревание игрока в "ячейках" — radius=7 при tile=12 даёт <2px зазор в коридорах; (2) частые waypoint-флипы на мелкой сетке → анимация мигает E↔W, N/S почти не достигается; (3) визуально игрок видит "сетку 12px поверх 32px-тайла", PM воспринимает это как ячейки. Параллельно нужен мост map-editor → game (PM рисует карты сам).

---

## Decision 1 — TILE_SIZE = 32

Перейти с 12 на **32px**. 1:1 со спрайтом, AABB-aligned, A* меньше зигзагов, корпус игрока влезает с честным зазором.

**Why**: устраняет первопричину застревания и флипа анимации одной правкой константы. Видимая область 1280/32 × 720/32 = **40×22 тайла** — это норма для action RPG обзора (Diablo 1 = ~40×30). Текущие процедурные карты используют tile-coords (cols/rows), не пиксели — формулы не ломаются.

**Cost**: ~80–120 строк правок.
- `src/js/engine/config.js:15` — константа.
- Процедурные карты: уменьшить `MIN_W/MAX_W/MIN_H/MAX_H` в `tilemap.js:201-203` примерно в 2.5× (стало: MIN_W=8, MAX_W=13, MIN_H=6, MAX_H=10), `PAD=2`, `BORDER=2`, `EDGE=1`, `corridor W = 2`.
- `dungeon.js`: world-size в тайлах поменять (cols/rows ~ /2.5).
- `render.js`: убрать ручной апскейл (drawImage без scale теперь = 1:1).
- `pathfinding.js`: алгоритм не меняется; пересчёт стоимости в новых тайлах.

**Risks**: процедурные комнаты могут стать «тесными» — компенсируется уменьшением минимального размера и ручной проверкой на 3–5 сидах. Спрайты enemy/loot/decor могут оказаться визуально крупными — заранее зафиксировать `radius` в тайл-юнитах (см. Decision 2).

---

## Decision 2 — Collision: AABB 24×24 (0.75 tile), no diagonals sampling

Заменить 9-point circle на **AABB-vs-tile** swept-axis (X/Y split, как сейчас, но через прямоугольник).

**Числа**:
- Player AABB: **24×24px** (0.75 × tile). Фиксируется как `PLAYER_HALF = 12`.
- Enemy AABB: **20×20px** для обычных, **28×28px** для elite.
- Diagonal slide: текущий split-axis резолв сохраняется — двигаем X, проверяем; затем Y, проверяем. AABB vs grid даёт honest slide вдоль стен без corner-clip.
- Inset 1px на проверке (как сейчас) против sticking.

**Why**: при tile=32 и AABB=24 у игрока **4px зазор** в коридоре 1-tile (32-24=8/2). В 2-tile коридоре — 20px. Никаких "застрял у пустой клетки". Circle 9-point проще проектируется на уровне идеи, но дороже (9 hash-lookup vs 4 угла) и допускает sub-tile прохождение через диагональные щели — нежелательно для action.

**Где теряем**: тонкие диагональные проходы в 1 тайл невозможны, но мы их и не строим (corridor width = 2 tiles min). Round corner-feel пропадает — но для топ-даун action это плюс (предсказуемость).

**Cost**: ~40–60 строк в `tilemap.js` — заменить `_circleBlockedAt` на `_aabbBlockedAt(cx, cy, halfW, halfH)`, `resolveMove` принимает halfW/halfH вместо radius. Обновить вызовы в `player.js`, `enemy.js` (передают свой half-size).

**Risks**: enemy.js использует `radius` для combat hit-detection (отдельная история от collision) — **оставить radius для боя**, добавить `collisionHalf` для движения. Если этого не разделить — задаваемые балансом hit-радиусы поедут.

---

## Decision 3 — Anim direction: убрать threshold, оставить как есть

После Decision 1+2 проблема исчезает сама. Текущая логика в `player.js:68-78` (брать dir из moveTarget с dead-zone 6px) уже корректна — флипы возникали из-за того, что A* на 12px-сетке выдавал короткие waypoint-сегменты, а moveTarget каждый раз обновлялся на следующий waypoint.

**Recipe** (минимум):
- Оставить `dirIndex` из `moveTarget`, не из `vx/vy`.
- Поднять dead-zone с 6px → **0.4 × tile** (т.е. 13px при tile=32) — корректное масштабирование.
- Sticky direction **не нужен**, low-pass **не нужен**. Если после рефакторинга всё ещё видно «дрожание» на финальном тайле — добавить условие "не менять dirIndex если path.length===0 и dist<halfTile".

**Cost**: 5 строк в `player.js`.

**Risks**: минимальные. Если PM захочет 8 направлений (NE/NW/SE/SW) позже — текущая 4-dir схема легко расширяется заменой блока if-else на atan2-bucket.

---

## Decision 4 — Map JSON contract v1

```json
{
  "schemaVersion": 1,
  "name": "crypt-of-echoes",
  "cols": 40,
  "rows": 24,
  "tileSize": 32,
  "biome": "stone",
  "walls": "<base64 Uint8 length cols*rows, 0|1>",
  "floorVariants": "<base64 Uint8 length cols*rows, 0..3, optional>",
  "floorTypes":    "<base64 Uint8 length cols*rows, 0..3, optional>",
  "markers": [
    { "type": "start",  "c": 3,  "r": 5 },
    { "type": "exit",   "c": 36, "r": 18 },
    { "type": "enemy",  "c": 12, "r": 8,  "kind": "zombie",  "elite": false },
    { "type": "enemy",  "c": 22, "r": 14, "kind": "zombie",  "elite": true  },
    { "type": "loot",   "c": 9,  "r": 11, "kind": "gold",    "amount": 50  },
    { "type": "decor",  "c": 18, "r": 10, "sprite": "barrel" }
  ]
}
```

**Решения по полям**:
- **Версия обязательна** (`schemaVersion: 1`). Importer бросает ошибку если `> 1`; для `< 1` (legacy editor v0) — миграция inline в importer.
- **Биом — в JSON** (`biome`: `"stone" | "earth" | "water" | "dark"`). Floor variants и types — **опциональные**: если отсутствуют, importer генерирует их сам через тот же seeded RNG, что в `buildCaveTilemap` (выделить в общий `paintBiome(tilemap, biome, rng)`).
- **walls — base64 Uint8** (а не plain array): карта 40×24=960 байт в JSON-arr ~5KB, в base64 ~1.3KB. localStorage квота 5–10MB → не критично, но base64 удобнее для будущего IndexedDB/URL share.
- **markers — массив объектов** с `type`+`c`+`r`+опциональными полями. Любой неизвестный type → warn в консоль, skip (forward-compat).
- **start/exit обязательны**: importer валидирует и кидает ошибку если нет.
- **Backward compat с editor v0**: если входящий JSON без `schemaVersion`, использовать поля {cols, rows, walls: array, markers} как сейчас, конвертировать walls → base64, проставить `schemaVersion: 0 → 1` миграцию. Хранить мигрированные карты обратно в localStorage с новым ключом `veyra:maps:v1:<name>`.

**Cost**: новый файл `src/js/dungeon/map_format.js` (~120 строк): `serialize(tilemap, markers, meta)`, `deserialize(json) → {tilemap, markers, meta}`, `migrate(json) → json`. + правка editor для записи v1.

**Risks**:
- (a) PM-рисованные карты могут быть «недостижимы» (start отрезан от exit) — добавить BFS-валидацию в importer, при провале возвращать `{ok:false, errors:[...]}`.
- (b) Размер карты vs viewport — если PM нарисует 200×200, A* может тормозить. Лимиты: **min 16×12, max 80×60** в editor; importer reject вне диапазона.
- (c) Биом-генерация на рантайме = разный визуал между запусками. Решение: seed биома хранить в JSON (`biomeSeed: <int>`), генерировать детерминированно.

---

## Decision 5 — Editor ↔ Game bridge

**Архитектура**:
1. **Editor → Game**: shared `localStorage` ключ `veyra:loadMap` (single-slot, перезаписывается). Editor записывает JSON v1, в game-entrypoint перед запуском dungeon проверяется ключ; если есть — `importCustomMap()` и удаление ключа после загрузки (одноразовое использование, чтобы reload не зацикливал).
2. **importCustomMap** живёт в **новом файле** `src/js/dungeon/custom_map.js` — изолирует логику от процедурной генерации, вызывает `map_format.deserialize()`, валидирует, возвращает `{tilemap, spawns: {start, exit, enemies[], loot[], decor[]}}`. `dungeon.js` получает либо результат `buildCaveTilemap` либо `importCustomMap` через флаг.
3. **UI выбора**: в lobby/menu (entry в dungeon) — кнопка **"Load Custom Map"** рядом с "Start Run". Открывает list карт из `localStorage` с ключами `veyra:maps:v1:*`. Клик → ставит `veyra:loadMap` → запускает run. Если карт нет — кнопка disabled с тултипом "Create one in Map Editor".
4. **Editor: "Send to Game" кнопка** в map-editor.html — пишет в `veyra:loadMap` и `window.open('/index.html')` (или просто redirect). Альтернатива — URL-param `?map=<name>` (читаем из localStorage по имени) — лучше для shareability, оставляем на v2.
5. **Sprite-preview в редакторе — НЕ нужно** на этом этапе. Editor рисует solid-color cells (wall=#222, floor=#888, маркеры цветными точками). Причина: добавить sprite-rendering = ещё 1 день работы, ROI низкий пока контракт не стабилизирован. Превью добавляем после того, как PM нарисует 3–5 рабочих карт и убедится в pipeline.

**Cost**:
- `src/js/dungeon/custom_map.js` — новый, ~80 строк.
- `dungeon.js` — ветка "if customMap → importCustomMap else buildCaveTilemap", ~20 строк.
- `main.js` / lobby — кнопка "Load Custom Map" + список карт, ~40 строк + CSS.
- `map-editor.html` — кнопка "Send to Game" + write to localStorage, ~30 строк.

**Risks**:
- (a) localStorage shared key race при двух открытых вкладках — игнорируем (single-user dev tool).
- (b) Если игрок умирает/выходит и стартует новую run, custom map уже стёрта (одноразовый ключ) — для повторного прохождения PM жмёт "Load" снова. Альтернатива — флаг "sticky" (карта остаётся пока не выбрана другая) — решает PM на стадии playtest.

---

## Implementation Notes for Coder

**Порядок работ (строго):**
1. **Decision 1+2 в одном коммите** — менять tile size без collision-рефакторинга = временная регрессия. Сначала ввести AABB API в tilemap.js, обновить вызовы в player/enemy с radius→halfSize, потом сменить TILE_SIZE = 32, потом отскейлить процедурные параметры. Запустить, проверить что cave/room генерируются и игрок ходит без застреваний.
2. **Decision 3** — отдельный коммит, тривиальная правка. Проверить все 4 направления визуально на одной игровой сессии.
3. **Decision 4** — `map_format.js` + миграция existing localStorage editor saves. Юнит-проверка: serialize → deserialize → equal.
4. **Decision 5** — `custom_map.js` + UI. Acceptance: PM рисует карту в editor → жмёт "Send to Game" → попадает в run на своей карте → enemy и loot спавнятся в маркерах.

**Гочи:**
- `enemy.js` использует `radius` и для AI-target-radius, и для collision. Разделить **обязательно** — иначе балансная правка рейнджа атаки сломает hit-boxes.
- `pathfinding.js` (A*) работает в tile-coords — менять не надо. Но cost функция должна остаться euclidean/manhattan (NOT pixel-based).
- `render.js` сейчас может явно умножать на 2.67 — найти и убрать. Проверить что HUD/sprites не зависят от старого scale.
- `floorTypes`/`floorVariants` сейчас живут на инстансе Tilemap отдельными полями — при импорте custom-map проставлять их так же, чтобы render не упал на undefined.

**Открытые вопросы для PM:**
- Q1: лимиты размера карты в редакторе (16×12 .. 80×60 — ок?).
- Q2: "sticky" custom map vs одноразовый ключ — как должно быть на playtest?
- Q3: список enemy `kind` для маркеров (сейчас вижу `zombie` — будут ли другие в этом спринте?).
