# Veyra — Action RPG Pivot GDD

> **Автор**: Game Designer Agent
> **Дата**: 2026-04-19
> **Статус**: DRAFT v1 — pending PM review
> **Платформа**: PC browser (HTML5/CSS/Vanilla JS)
> **Pivot**: от autocast idle-боя к 2D top-down pixel art Action RPG (Diablo-like)
> **Референсы**: Diablo 2/3 Rifts, Titan Quest, Path of Exile, Escape from Tarkov (extraction), Hades (run loop)

---

## 1. Vision & Pillars

### Core fantasy

Ты — маг, пробивающийся вглубь разломов Veyra за реликвиями. Каждый спуск — это **2-5 минут напряжения**: либо вынес лут через портал, либо пожадничал и потерял всё. Знакомая diablo-like боёвка на ЛКМ-движении + auto-cast скиллов даёт низкий порог входа, а extraction-механика делает каждую секунду драматичной.

### Design pillars

1. **Short & spicy run** — 2-5 минут/ран, быстрый loop, идеальный для session-based + Abstract leaderboard.
2. **Risk-reward extraction** — игрок сам решает, когда выйти: чем глубже, тем больше лута и Veyra Points, но смерть стирает весь ран-лут.
3. **Auto-cast с ручным override** — классическая diablo-магия, но без микроменеджмента каждой кнопки. Скиллы стреляют сами, игрок отвечает за позицию и выбор ultimate-момента.
4. **Карманная морковка между ранами** — Sigil Tree, Boss Crystals, equipment — прогрессия меты сохраняется, что бы ни случилось с ран-лутом.
5. **Читаемость 2D pixel art** — top-down 32×32 тайлы, 4 стихии читаются по цвету, смерть видна за долю секунды.

### Почему pivot

Старая autocast idle-механика имеет два смертельных недостатка для Abstract leaderboard: (1) нет input-skill, результаты детерминированы, лидерборд превращается в лоторею билда; (2) нет drama, каждый бой одинаков. Action RPG loop с extraction решает оба: позиционирование — input-skill, решение «extract or push» — drama.

---

## 2. Combat Mechanics

### 2.1. Movement: Click-to-Move

- **ЛКМ на земле** → персонаж идёт по pathfinding-маршруту к точке.
- **ЛКМ на враге** → персонаж идёт в aggro range и начинает автоатаку/auto-cast.
- **ЛКМ на интерактиве (сундук, портал)** → идёт и взаимодействует.
- **Удержание ЛКМ** → continuous movement (курсор тянет мага).
- **Hotkey `S` (stand ground)** → остановка на месте, auto-cast продолжается.
- **Hotkey `Space` (dash)** → рывок на 4 тайла в направлении курсора. CD 4 секунды. Неуязвимость 0.3 сек в кадре рывка.

**Сетка vs free coords**: **свободные координаты** с grid-friendly снапом под pathfinding. Тайловая сетка 32×32 используется для генерации карт и препятствий, но движение персонажа — пиксель-точное (как в Diablo 2). Это критично для dash и для проджектайлов (попадание/промах).

**Скорость**:
- Базовая ходьба: **4.0 тайлов/сек** (128 px/s).
- Во время каста: **скорость = 0** (рут на время cast time). Есть исключения — см. §2.5 про каст-во-время-движения.
- Dash: мгновенный переход на 4 тайла.

### 2.2. Auto-Cast система

**Ядро**: игрок ПЕРЕД входом в данж собирает гримуар из **5 скиллов** (как в текущей системе). В бою:

1. **Aggro detection** — каждый тик (20 раз/сек) персонаж сканирует круг **радиусом 8 тайлов** вокруг себя. Если видит врага в линии зрения (no obstacles) — входит в **combat state**.
2. **Skill selection** — в combat state каждые 100 мс ищет первый готовый скилл по порядку: **slot 1 → 2 → 3 → 4 → 5**. Первый скилл, у которого CD=0 и есть валидная цель в range — кастуется.
3. **Cast execution** — во время каст-тайма персонаж рутован (кроме instant-скиллов). По завершению — CD запускается.
4. **Interrupt rules**:
   - Игрок кликает для движения → прерывает cast (но не instant-скиллы); CD **сбрасывается не тратится** (скилл готов снова, никакого штрафа).
   - Игрок жмёт hotkey 1-5 → см. §2.3 override.
   - Персонаж получает оглушение → cast прерван, но скилл ставится на **2-секундный CD штрафа** (Diablo-стандарт).

**Приоритет скиллов по умолчанию**: по порядку слотов (1 → 5). Это значит игрок сам расставляет важные скиллы в начале: buff'ы и основной DPS в 1-2, utility в 3-4, ultimate в 5.

**Таргетинг auto-cast**: по умолчанию **nearest enemy in range** для проджектайлов и self-target для buff'ов. Ground-target скиллы (Meteor, Blizzard) кастуются **в точку ближайшего кластера врагов** (простой k-means по позициям).

### 2.3. Manual Override

Игрок может в любой момент форсировать каст скилла 1-5:

- **Hotkey `1-5`** → форсирует каст скилла в соответствующем слоте.
- **Таргет**: если курсор над врагом — таргет враг; если над землёй — ground-target в точку курсора; если self-cast (buff) — мгновенно на мага.
- **Если скилл на CD** → проигрывается звук «not ready» + красная вспышка иконки в хотбаре. Никакого штрафа.
- **Если скилл готов** → каст запускается, игнорируя auto-cast логику на время каста.

**Holding override** (опциональный advanced): удержание hotkey заставляет мага спамить скилл каждый раз, как CD истекает (для основного DPS-скилла). Включается в настройках, по умолчанию off.

### 2.4. Таргетинг типов скиллов

| Тип | Поведение auto-cast | Override-поведение | Примеры |
|---|---|---|---|
| **Projectile** | Nearest enemy в range, fire-and-forget | Таргет под курсором | Fireball, Rock Shard, Lightning Bolt |
| **Ground-target AoE** | Центр кластера ближайших врагов | Под курсором | Meteor, Blizzard, Cataclysm |
| **Line AoE** | Направление = nearest enemy | Направление = курсор | Flame Wave, Chain Lightning |
| **Self-cast buff** | Мгновенно на себя, если условие выполнено (HP<50% и т.п.) | На себя | Focus, Mana Shield, Stone Skin, Tailwind |
| **Nova (AoE around self)** | При N врагах в ближнем радиусе (≤3 тайла) | Мгновенно на себя | Tremor, Static Nova |
| **Beam / chained** | Nearest enemy → ближайшие цепи | Начальная цель под курсором | Chain Lightning, Tempest |

**Условия self-cast buff'ов**:
- **Mana Shield** — кастуется, если HP < 70% и нет активного щита.
- **Focus** — перед готовым Pyroblast/Inferno/Cataclysm (если в гримуаре).
- **Tailwind** — когда есть 2+ врагов в range (максимизация буста).
- **Stone Skin** — HP < 85% или если нет щита.

Это **умное условие-триггер auto-cast**, не оставляющее игрока беспомощным, но не спамящее buff'ы в пустоту.

### 2.5. Cast Time & Cooldowns

В новой системе у каждого скилла **два параметра**:

- **Cast time** — время анимации каста (маг рутован).
- **Cooldown** — время перезарядки после каста.

**Ориентиры балансировки (5-слотовый гримуар)**:

| Категория | Cast time | CD | Роль |
|---|---|---|---|
| **Primary DPS** (основной) | 0.3-0.6s | **1.0-1.5s** | Spam-скилл, заполняет 60-70% времени |
| **Secondary** (комбо/filler) | 0.5-0.8s | **3-5s** | Синергия с primary |
| **Utility / CC** | 0.5-1.0s | **6-10s** | Slow, freeze, shield, buff |
| **Power** | 1.0-1.5s | **10-15s** | Большой удар, ground-target |
| **Ultimate** | 1.5-2.5s | **25-35s** | Fight-winner |

**Instant-скиллы** (cast time < 0.2s) — не рутуют мага, кастуются на ходу. Typical: Dash-абилки, instant-buff'ы, некоторые basic-атаки. Баланс-защита: instant-скиллы имеют базовый CD минимум 3 секунды, чтобы не превращать игру в бездумный спам.

### 2.6. Адаптация существующих 30+ спеллов (примеры)

Текущие спеллы существуют как «cast time» в turn-based combat. Конверсия: cast time остаётся ≈ прежней, добавляется индивидуальный CD и **taргет-тип**.

| Старый спелл | Тип в action-RPG | Cast time | CD | Комментарий |
|---|---|---|---|---|
| **Fireball** | Projectile | 0.5s | 1.2s | Primary DPS Pyromancer'а. Scorch был 1.0s — теперь Fireball его замещает. |
| **Ignite** | Projectile, DoT on-hit | 0.4s | 4.0s | Стакается до 3; каждый стак = 8 dmg/s × 4 сек. Спам Fireball автоматически рефрешит Ignite. |
| **Flame Wave** | Line AoE (5 тайлов) | 0.8s | 6.0s | Идеально для толпы мобов. Аплай Ignite на всех. |
| **Meteor** (бывший Pyroblast ультимейт) | Ground-target AoE, 3-тайловый радиус | 1.2s | 14s | Задержка падения 0.8s (игроки учатся предиктить). |
| **Cataclysm** | Ground-target AoE DoT, 4-тайловый радиус | 2.0s | 30s | Ultimate. DoT 15 dmg/s × 5 сек. |
| **Frost Spike** | Projectile + slow 40% | 0.5s | 2.5s | Tidecaster primary. |
| **Blizzard** | Ground-target AoE DoT | 1.0s | 12s | Медленный тик, сильный slow. |
| **Drain Life** | Projectile, lifesteal 50% | 0.6s | 4.0s | Tidecaster sustain. |
| **Chain Lightning** | Beam, 2 прыжка | 0.7s | 5.0s | Stormcaller primary AoE. |
| **Tempest** | Beam, 3 hits за 1.5s | 1.0s | 18s | Ultimate Stormcaller. |
| **Rock Shard** | Projectile, heavy hitbox | 0.5s | 1.5s | Geomancer primary. |
| **Stone Skin** | Self-cast shield (200 HP absorb) | 0.3s | 12s | Auto-trigger HP < 85%. |
| **Tectonic Shift** | Self-cast mega-shield + reflect | 1.5s | 35s | Ultimate Geomancer. |

**Правило конверсии**: Universal-спеллы (Arcane Bolt, Focus, Mana Shield, Arcane Barrage) остаются для всех классов как доступные опции в гримуаре. Sigil Tree-пассивки работают в realtime (см. §4).

---

## 3. Dungeon Structure & Extraction Loop

### 3.1. Ран-структура

**Один ран = 3-5 биомов** (финальный скейл 5, для MVP — 3). Каждый биом — **отдельная карта 40×40 тайлов**, процедурно собранная из pre-made tile rooms (rooms-and-corridors алгоритм).

Биомы соединены **one-way порталом**: из биома N → в биом N+1. Назад нельзя (анти-farm-spam).

### 3.2. Компоненты одного биома

| Элемент | Описание | Количество |
|---|---|---|
| **Mob spawns** | Кучи мобов, 2-4 на карту | 8-15 мобов/биом |
| **Elite enemies** | Сильнее, золотой ореол, дропают rare лут | 1-2/биом |
| **Mini-boss** | Уникальный спрайт, фикс-локация | 0 в биомах 1-2, **1 в биомах 3-4** |
| **Final boss** | Эпичный босс всего данжа | **Только в последнем биоме (5)** |
| **Chests** | Open-on-click, 70% gold / 30% item | 2-3/биом |
| **Gold piles** | Pickup on walk | 5-10/биом |
| **Exit Portal** (extraction) | Всегда виден на mini-map, золотое свечение | **1/биом** |
| **Deep Portal** (next biome) | В дальнем углу биома, кроваво-красный | **1/биом, кроме финального** |

### 3.3. Прогрессия сложности

| Биом | Уровень мобов | HP множитель | Damage множитель | Лут | Элит/босс |
|---|---|---|---|---|---|
| **1 — Ruins** | lv5-10 | 1.0x | 1.0x | Common/Uncommon | 1 elite |
| **2 — Catacombs** | lv10-18 | 1.8x | 1.4x | Uncommon/Rare | 2 elites |
| **3 — Ashen Vault** | lv18-28 | 3.0x | 1.9x | Rare | 2 elites + **mini-boss** |
| **4 — Shattered Hall** | lv28-40 | 5.0x | 2.5x | Rare/Epic | 2 elites + **mini-boss** |
| **5 — Veyra's Maw** | lv40-50 | 8.0x | 3.5x | Epic/Legendary | **Final boss** |

**Dynamic scaling**: HP/damage множители — от уровня биома, не от уровня игрока. Это значит биом 5 всегда вызов для игрока любого уровня (pvp-like pacing). Игрок lv50 в биоме 1 vaporизует мобов — это ок, в биоме 5 его испытание.

### 3.4. Extraction механика

**Exit Portal** активен сразу при входе в биом. Клик на портал → popup:

```
┌──────────────────────────────────┐
│  EXTRACT FROM BIOME 3?           │
│                                  │
│  Loot to claim: 12 items, 450g   │
│  Veyra Points: +180              │
│                                  │
│  [ EXTRACT ]  [ STAY ]           │
└──────────────────────────────────┘
```

- **Extract** → весь лут конвертируется в инвентарь + gold + VP. Возврат в город.
- **Stay** → возврат на карту, можно продолжать фармить текущий биом или идти в Deep Portal.

**Deep Portal** — клик → popup-warning:

```
┌──────────────────────────────────┐
│  DESCEND TO BIOME 4?             │
│                                  │
│  DANGER: If you die before the   │
│  next exit, you lose ALL run     │
│  loot collected so far.          │
│                                  │
│  Current run loot: 12 items/450g │
│  Biome 4 difficulty: HARD        │
│                                  │
│  [ DESCEND ]  [ BACK ]           │
└──────────────────────────────────┘
```

**Death penalty**: весь run-loot (предметы + gold + VP, накопленные в ране) стирается. **Возврат в город с пустыми руками**. Сохраняется только мета-прогресс (§6).

### 3.5. Run Timer & Death Wave (Abstract pressure)

Проблема без таймера: игрок может камперить, восстанавливать HP между боями, тянуть ран бесконечно.

**Решение — Death Wave**:

- Через **8 минут** с начала рана появляется уведомление `Death Wave incoming in 60s`.
- Через **9 минут** — на карту спавнится «призрак-преследователь» (1 враг, движется быстро, урон огромный, ignores walls).
- Смысл: если игрок жадничает за пределами 8 минут, его выгоняют принудительно. Это держит ран в пределах 2-5 мин активного фарма + 1-2 мин на поздний пуш.

Для MVP можно взять более простой таймер: **hard timeout 10 минут → форс-extraction** (с предупреждением на 8 мин). Death Wave как полноценный механик — v1.1.

### 3.6. Leaderboard Metric: Extraction Depth Score

**Veyra Points формула** (начисляются при extract, не при смерти):

```
VP = biomeDepth² × 100  +  timeBonus  +  bossBonus  +  noHitBonus
```

Где:
- **biomeDepth²** — биом 1 = 100, биом 2 = 400, биом 3 = 900, биом 4 = 1600, биом 5 = 2500. Квадратичный рост **создаёт сильный стимул рисковать глубже**.
- **timeBonus** — `max(0, 300 - runSeconds) × 2`. Быстрый ран (<5 мин) даёт 100-600 бонуса, медленный — 0.
- **bossBonus** — +500 за first-kill mini-boss/biome boss в сессии.
- **noHitBonus** — +200 за биом, пройденный без получения урона (игрокам-мастерам).

**MVP metric** (для первого лидерборда выбираем 2-3):
1. **Extraction Depth** (biomeDepth² × 100) — основная метрика.
2. **Speed** (timeBonus) — вторичная.
3. **(optional) Boss kill** — достижение.

`noHit` откладываем в v1.1 — требует точной реализации hit-detection и UI отслеживания.

---

## 4. Интеграция существующих систем

### 4.1. Sigil Tree (пассивное дерево)

Все 80 нод из `passive-skill-tree.md` остаются. Адаптация под realtime:

| Нода (пример) | Старая семантика | Новая семантика |
|---|---|---|
| `+15% crit chance` | Per cast, random | Per cast, random — без изменений |
| `+10% HP` | Стат | Стат, applied to max HP — без изменений |
| `Second Wind` | При HP<30% — x2 damage 1 тик | При HP<30% — x2 damage всех спеллов на 5 сек, CD 60s |
| `Phoenix Protocol` | Возрождение 1 раз/бой | **Возрождение 1 раз/run** (критично для extraction!) |
| `Ignite Resonance` | DoT +20% | DoT +20% — без изменений |

**Принцип**: stat-based ноды не меняются (урон, HP, crit). Триггерные ноды (Second Wind, Phoenix Protocol) получают новую realtime-семантику + CD в секундах вместо «раз в бой».

**Phoenix Protocol — killer-feature для extraction**: игрок умирает → встаёт с 30% HP на том же месте. Это даёт **вторую жизнь на ран**, критичный инструмент анти-тильта. Расположить как late-game Sigil Tree keystone.

### 4.2. Sigil Resonance

**Сохраняется 1:1** из `sigil-resonance.md`. Резонанс выбирается **ПЕРЕД входом в данж** (на Resonance Altar в городе, до спуска). Работает на весь ран, не сбрасывается между биомами.

- Моно-сет (3×Fire) = +36% fire dmg / -24% fire taken — действует во всех 5 биомах рана.
- Sigils списываются один раз при Seal the Pact.
- Если игрок умирает — Sigils не возвращаются (риск-цена).

**Дизайн-нюанс**: поскольку данж содержит разные стихии (биом 1 Ruins = Earth, биом 3 Ashen Vault = Fire, биом 5 final = mixed), **моно-сет больше не универсально силён** — игрок должен выбрать, под какой глубокий биом готовится. Это новый стратегический слой, отсутствовавший в оригинальной autocast-версии.

### 4.3. Equipment

- **Сохраняется 1:1** (посох/шляпа/плащ + 3 новых слота: boots/ring/amulet — опционально в v1.1).
- **Лут из данжа МОЖЕТ заменять текущую экипировку** — игрок подбирает item → в инвентаре сам решает экипировать или нет.
- **Item-comparison tooltip** при pickup: «Ring of Frost (+15 INT, +5% slow) — Current: Copper Ring (+8 INT). DIFF: +7 INT, +5% slow».

### 4.4. Gold

- **Сохраняется между ранами** (в т.ч. при смерти — gold на счёте игрока, не run-loot).
- **Gold, собранный в ране = run-loot** (теряется при смерти до extract).
- **Извлечённый gold → счёт игрока** (safe).
- Тратится в городе: Shop (расходники), Respec (смена класса), Sigil Tree (upgrade nodes), Crystal Exchange (v1.1).

### 4.5. Veyra Points (лидерборд)

Начисляются **только при успешном extract**. При смерти = 0. Это усиливает важность extraction-решения — мёртвые герои на лидерборде не попадают.

**MVP метрики (финальный выбор)**:
1. **Depth Score** (biomeDepth² × 100) — primary
2. **Speed Bonus** (max(0, 300-s) × 2) — secondary
3. **First Boss Kill** (+500 once per session) — tertiary

---

## 5. Meta-Progression (Roguelite)

### 5.1. Что сохраняется между ранами (permanent)

| Ресурс | Получение | Использование |
|---|---|---|
| **Level + XP** | Убийство мобов (даже при смерти — XP от убитых до смерти idling? **NO: XP тоже теряется как run-loot**) | Unlock новых Sigil Tree нод, attribute points |
| **Class** | Выбор на lv3 Awakening | Определяет гримуар-пул |
| **Sigil Tree** (80 нод) | Sigils тратятся на unlock | Permanent stat/trigger bonuses |
| **Sigils (ресурс)** | **Не как run-loot — приходит из left-up? NO**: пересмотрено — см. §5.3 | Unlock node / Resonance |
| **Equipment** | Извлечено из данжа (ran) | Экипировка в inventory |
| **Gold (на счёте)** | Извлечён из ранa | Шоп, респек, upgrades |
| **Boss Crystals** (NEW) | Убийство mini/final boss + extract | Unlocks biomes, skins, leaderboard cosmetics |

### 5.2. Что теряется при смерти в ране (run-loot)

| Ресурс | Комментарий |
|---|---|
| **Run XP** (всё, что накоплено в ране) | Противоречиво: альтернатива — XP безопасен. **Решение**: 50% накопленного XP теряется, 50% сохраняется. Это смягчает тильт от 4-биомной смерти. |
| **Run Gold** (всё, что поднято в ране) | Стирается полностью. |
| **Run Items** (подобранные) | Стирается полностью. |
| **Run Consumables use** | Бафф-эффекты сброшены (расходник уже потрачен, не возвращается). |
| **Sigils (активированный резонанс)** | Sigils спалены безвозвратно. |

### 5.3. Sigils — economics

Источники Sigils (пересматривается под new loop):
- **+2 Sigils за уровень игрока** (вместо +1).
- **+1 Sigil за extract из биома 3+** (incentive для глубины).
- **+3 Sigils за mini-boss kill + extract**.
- **+10 Sigils за final boss kill** (редкое событие, крупная награда).
- **Квесты/ежедневки** — фиксированные дропы.

Общий флоу: lv40 игрок имеет ~150 Sigils на руках, из которых ~80 вложены в дерево, ~70 ликвидны — хватает на 3-4 полных резонанса подряд.

### 5.4. Boss Crystals (NEW meta-progression)

**Новая коллекционная валюта** для roguelite-cycle.

- **Получение**: drop от mini-boss (1 crystal), final boss (3 crystals). **Только при extract** (дроп теряется при смерти).
- **Типы**: 4 стихии × 2 редкости = 8 уникальных кристаллов. (Fire Shard, Fire Heart, Earth Shard, Earth Heart, и т.д.)
- **Применение**:
  - **5 shards любой стихии** → unlock нового биомного варианта (Ruins → Ashen Ruins: та же структура, больше fire-мобов, +20% VP).
  - **3 hearts одной стихии** → unlock класс-скина (Pyromancer в обсидиановой броне).
  - **10 любых кристаллов** → leaderboard-cosmetic (титул, рамка аватара).

Это **карманная морковка**: каждый удачный глубокий ран даёт ощутимую permanent-награду, даже если следующий ран провалился.

---

## 6. MVP Scope — Vertical Slice

**Цель**: один играбельный скрин, демонстрирующий весь core loop за 2-3 минуты.

### 6.1. Контент

| Компонент | Scope |
|---|---|
| **Биомы** | **1** (Ruins — каменистый, серо-коричневый, факелы) |
| **Карта** | 1 pre-made карта 40×40 тайлов (не процедурная, для MVP) |
| **Класс** | **1** — Pyromancer |
| **Скиллы** | **3** — Fireball (primary), Flame Wave (secondary), Meteor (ultimate) |
| **Мобы** | **3 типа**: melee Zombie (slow, 40 HP, 8 dmg), ranged Skeleton Archer (stationary, 25 HP, 12 dmg, range 6), fast Wolf (fast movement, 20 HP, 6 dmg melee) |
| **Elite** | 1 на карту (Elite Zombie: 150 HP, 15 dmg, gold aura) |
| **Mob count** | 10-12 мобов на карту |
| **Chests** | 2 на карту |
| **Exit Portal** | 1 (золотое свечение, на краю карты) |
| **Deep Portal** | **НЕ в MVP** (только 1 биом, extraction — единственный вариант) |
| **Лут** | Gold piles (5), 3 items (Rusty Staff, Cloth Hat, Worn Cloak) |

### 6.2. UI / HUD

| Элемент | Описание |
|---|---|
| **HP bar** | Слева сверху, красный, число "450/500" |
| **Mana bar** | **НЕТ маны в MVP** — cooldowns управляют темпом. Мана добавляется в v1.1 если нужен дополнительный resource-management. |
| **Hotbar 5 слотов** | Снизу по центру, иконки скиллов + CD-индикатор (radial progress), hotkey `1-5` подписаны |
| **Mini-map** | Справа сверху, показывает Exit Portal (золотой) и мобов (красные точки) |
| **Extraction popup** | По клику на Exit Portal (см. §3.4) |
| **Damage numbers** | Floating над мобами (yellow normal, orange crit) |
| **Run timer** | Top center, `02:34` — отсчёт в minutes:seconds |
| **Gold + VP** | Top right: `450g | VP preview: +100` |
| **Resonance indicator** | Top left под HP bar: 3 маленькие печати (если активирован) |

### 6.3. Core loop в MVP (2-3 мин)

1. Город → click "Enter Ruins" → (опц.) Resonance Altar → спуск.
2. Биом 1 (Ruins) — игрок фармит 10-12 мобов, 1 elite, 2 chests, собирает 2-3 item и 100-300 gold.
3. Решение: extract (+100-300 VP) или... (в MVP только extract, deep portal добавляем в v1.1).
4. Возврат в город → лут в инвентарь, VP на leaderboard.
5. Respawn доступен мгновенно (new run).

### 6.4. Out-of-scope для MVP

- Биомы 2-5 (процедурная генерация, новые тайлсеты).
- Deep Portal + extraction-risk trade-off (требует минимум 2 биома).
- Classes Stormcaller / Tidecaster / Geomancer (только Pyro в MVP).
- Спеллы кроме 3 Pyro-скиллов.
- Death Wave.
- Boss Crystals.
- PvP ladder.
- Respec.

### 6.5. Success criteria

MVP считается готовым, когда:
- Игрок может начать ран, убить 10 мобов, открыть 1 сундук, подобрать item, экстрактиться, увидеть VP на лидерборде.
- Auto-cast работает — Fireball спамится без нажатий игрока.
- Manual override работает — hotkey `3` форсит Meteor.
- Dash (Space) работает.
- Click-to-move и pathfinding работают (маг обходит стены).
- Смерть → `Game Over`-экран → возврат в город с нулевым run-loot.

---

## 7. Open Questions & TBD

1. **Mana или нет?** В MVP — нет (CD управляют темпом). Если в v1.1 боёвка ощущается «бездумным спамом» — добавить ману как soft-cap.
2. **Процедурная генерация карт** — когда включать? Предложение: MVP = 1 pre-made, v1.1 = 3 pre-made на биом, v1.2 = процедурка через rooms-corridors.
3. **Run XP penalty при смерти** — 50% или 100%? Требует playtest.
4. **Скорость движения** — 4.0 тайлов/сек ощущается правильно? Сравнить с Diablo 2 (≈ 6-8 в late-game).
5. **Aggro range 8 тайлов** — баланс под MVP карту 40×40? Возможно 6 тайлов меньше хаос.
6. **Cast time во время бега** — у всех ли скиллов рут? Pyroclasm-школа vs Stormcaller (воздушник кастует на бегу). Предложение v1.1: Stormcaller класс-пассивка «каст на ходу для спеллов < 0.8s».
7. **Deep Portal в биоме с мини-боссом** — активен сразу или только после убийства мини-босса? Предложение: **только после убийства** (иначе игрок может проскочить и обнулить смысл mini-boss).

---

## 8. Next Steps

### Architect (следующий шаг)
1. Data model pivot: удалить turn-based combat state, добавить realtime entity model (player position, mob positions, projectile list, damage events).
2. Спроектировать pathfinding (A* по тайловой сетке 40×40).
3. Спроектировать collision detection (AABB для мобов/проджектайлов).
4. Рефактор combat.js под main game loop (requestAnimationFrame, 60 fps).

### Coder (после Architect)
1. Имплементация движения click-to-move.
2. Auto-cast tick (20 Hz) + cooldown system.
3. Рендер карты + мобов + projectiles (Canvas 2D).
4. UI hotbar + mini-map + extraction popup.

### Art Director (параллельно)
1. **Tile set Ruins** — 20-30 уникальных тайлов 32×32 (пол, стены, декор, факелы, сундуки).
2. **Character sprite** — Pyromancer 4-directional walk + cast animation (32×32, 4 кадра walk × 4 direction).
3. **Mob sprites** — Zombie, Skeleton Archer, Wolf, Elite Zombie.
4. **Skill effects** — Fireball projectile, Flame Wave burn, Meteor explosion (sprite sheets).
5. **UI** — HUD frame, hotbar slots, mini-map frame, extraction popup.

### Game Designer (я, follow-up)
1. После playtest MVP — калибровать CD, damage, HP values.
2. Расписать биомы 2-5 детально (тайлсеты, mob rosters, boss mechanics).
3. Задизайнить mini-boss и final boss fight-mechanics.
4. Balance-pass: Sigil Tree ноды под realtime.

---

*Документ создан: 2026-04-19*
*Статус: DRAFT v1 — ждёт PM review → Architect handoff*
*Следующий апдейт: после ревью или первой MVP playtest-сессии*
