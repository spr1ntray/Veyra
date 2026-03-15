/**
 * state.js — управление состоянием игры, localStorage
 * Единственный источник истины для всех данных персонажа
 */

// Ключ для localStorage
const STORAGE_KEY = 'veyra_player';

// Данные всех предметов игры
export const ITEMS_DATA = {
  // Стартовые предметы (BonusPower: 0, нельзя снять)
  starter_staff: {
    id: 'starter_staff', name: 'Ученический посох',
    slot: 'staff', bonus: 0, rarity: 'starter',
    desc: 'Первый посох каждого мага', canUnequip: false
  },
  starter_hat: {
    id: 'starter_hat', name: 'Потрёпанная шляпа',
    slot: 'hat', bonus: 0, rarity: 'starter',
    desc: 'Видавшая виды, но всё ещё держится', canUnequip: false
  },
  starter_cloak: {
    id: 'starter_cloak', name: 'Выцветшая накидка',
    slot: 'cloak', bonus: 0, rarity: 'starter',
    desc: 'Цвет давно потерял яркость', canUnequip: false
  },

  // Common предметы (белый цвет)
  oak_staff: {
    id: 'oak_staff', name: 'Дубовый посох',
    slot: 'staff', bonus: 3, rarity: 'common',
    desc: 'Крепкий и надёжный', canUnequip: true
  },
  amethyst_staff: {
    id: 'amethyst_staff', name: 'Посох с аметистом',
    slot: 'staff', bonus: 5, rarity: 'common',
    desc: 'Фиолетовый камень слабо мерцает', canUnequip: true
  },
  swampfire_staff: {
    id: 'swampfire_staff', name: 'Посох болотного огня',
    slot: 'staff', bonus: 7, rarity: 'common',
    desc: 'Навершие тлеет зелёным', canUnequip: true
  },
  novice_hat: {
    id: 'novice_hat', name: 'Шляпа послушника',
    slot: 'hat', bonus: 3, rarity: 'common',
    desc: 'Простая, но целая', canUnequip: true
  },
  stargazer_hat: {
    id: 'stargazer_hat', name: 'Шляпа звездочёта',
    slot: 'hat', bonus: 5, rarity: 'common',
    desc: 'Вышитые звёзды на полях', canUnequip: true
  },
  nightwind_hat: {
    id: 'nightwind_hat', name: 'Шляпа ночного ветра',
    slot: 'hat', bonus: 7, rarity: 'common',
    desc: 'Лёгкая, будто сшита из тумана', canUnequip: true
  },
  road_cloak: {
    id: 'road_cloak', name: 'Дорожная накидка',
    slot: 'cloak', bonus: 3, rarity: 'common',
    desc: 'Пахнет дымом костра', canUnequip: true
  },
  forestguard_cloak: {
    id: 'forestguard_cloak', name: 'Накидка лесного стража',
    slot: 'cloak', bonus: 5, rarity: 'common',
    desc: 'Тёмно-зелёная, с капюшоном', canUnequip: true
  },
  dusk_cloak: {
    id: 'dusk_cloak', name: 'Накидка сумерек',
    slot: 'cloak', bonus: 7, rarity: 'common',
    desc: 'Фиолетовые отблески на ткани', canUnequip: true
  },

  // Расходники-заглушки
  mana_elixir: {
    id: 'mana_elixir', name: 'Эликсир маны',
    slot: 'consumable', bonus: 0, rarity: 'common',
    desc: 'Пригодится позже...', canUnequip: false
  },
  crystal_shard: {
    id: 'crystal_shard', name: 'Осколок кристалла',
    slot: 'consumable', bonus: 0, rarity: 'common',
    desc: 'Мерцает внутренним светом. Ценность неизвестна.', canUnequip: false
  }
};

// Пулы предметов по слотам для случайного дропа
export const ITEM_POOLS = {
  staff: ['oak_staff', 'amethyst_staff', 'swampfire_staff'],
  hat: ['novice_hat', 'stargazer_hat', 'nightwind_hat'],
  cloak: ['road_cloak', 'forestguard_cloak', 'dusk_cloak']
};

// Дефолтное состояние нового игрока
function getDefaultState() {
  const now = Date.now();
  return {
    version: 1,
    name: 'Безымянный маг',
    level: 1,
    xp: 0,
    gold: 0,
    equipment: {
      staff: 'starter_staff',
      hat: 'starter_hat',
      cloak: 'starter_cloak'
    },
    inventory: {
      oak_staff: 0, amethyst_staff: 0, swampfire_staff: 0,
      novice_hat: 0, stargazer_hat: 0, nightwind_hat: 0,
      road_cloak: 0, forestguard_cloak: 0, dusk_cloak: 0,
      mana_elixir: 0, crystal_shard: 0
    },
    dailyLogin: {
      currentDay: 1,
      lastClaimTimestamp: 0,
      cyclesCompleted: 0
    },
    combat: {
      fightsToday: 0,
      lastFightDate: '',
      consecutiveWins: 0
    },
    timestamps: {
      firstLogin: now,
      lastLogin: now
    }
  };
}

// Текущее состояние в памяти
let _state = null;

/**
 * Загружает состояние из localStorage или создаёт новое
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Мерджим с дефолтом для совместимости версий
      _state = Object.assign(getDefaultState(), parsed);
    } else {
      _state = getDefaultState();
    }
  } catch (e) {
    console.error('Ошибка загрузки состояния:', e);
    _state = getDefaultState();
  }
  return _state;
}

/**
 * Сохраняет текущее состояние в localStorage
 */
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch (e) {
    console.error('Ошибка сохранения состояния:', e);
  }
}

/**
 * Возвращает текущее состояние
 */
export function getState() {
  if (!_state) loadState();
  return _state;
}

/**
 * Вычисляет суммарный BonusPower из экипировки
 */
export function getBonusPower() {
  const state = getState();
  let total = 0;
  for (const slot of ['staff', 'hat', 'cloak']) {
    const itemId = state.equipment[slot];
    if (itemId && ITEMS_DATA[itemId]) {
      total += ITEMS_DATA[itemId].bonus || 0;
    }
  }
  return total;
}

/**
 * Формула XP до следующего уровня
 */
export function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.3));
}

/**
 * Добавляет XP и проверяет повышение уровня
 * Возвращает массив уровней которые были получены
 */
export function addXP(amount) {
  const state = getState();
  state.xp += amount;
  const levelUps = [];

  // Проверяем повышение уровня (максимум 10)
  while (state.level < 10) {
    const needed = xpForLevel(state.level);
    if (state.xp >= needed) {
      state.xp -= needed;
      state.level++;
      levelUps.push(state.level);

      // Награда за уровень
      const goldReward = 5 * state.level;
      state.gold += goldReward;
    } else {
      break;
    }
  }

  saveState();
  return levelUps;
}

/**
 * Добавляет золото
 */
export function addGold(amount) {
  const state = getState();
  state.gold += amount;
  saveState();
}

/**
 * Добавляет предмет в инвентарь
 */
export function addItemToInventory(itemId) {
  const state = getState();
  if (state.inventory.hasOwnProperty(itemId)) {
    state.inventory[itemId]++;
    saveState();
    return true;
  }
  return false;
}

/**
 * Экипирует предмет из инвентаря
 * Возвращает true если успешно
 */
export function equipItem(itemId) {
  const state = getState();
  const item = ITEMS_DATA[itemId];
  if (!item || item.slot === 'consumable') return false;

  // Проверяем наличие в инвентаре
  if (!state.inventory.hasOwnProperty(itemId) || state.inventory[itemId] <= 0) return false;

  const slot = item.slot;
  const currentEquipped = state.equipment[slot];

  // Снимаем текущий предмет если он не стартовый
  if (currentEquipped && ITEMS_DATA[currentEquipped] && ITEMS_DATA[currentEquipped].canUnequip) {
    state.inventory[currentEquipped] = (state.inventory[currentEquipped] || 0) + 1;
  }

  // Экипируем новый предмет
  state.equipment[slot] = itemId;
  state.inventory[itemId]--;

  saveState();
  return true;
}

/**
 * Сбрасывает счётчик боёв если наступил новый день
 */
export function checkDailyReset() {
  const state = getState();
  const today = new Date().toDateString();

  if (state.combat.lastFightDate !== today) {
    state.combat.fightsToday = 0;
    state.combat.lastFightDate = today;
    state.combat.consecutiveWins = 0;
    saveState();
  }
}

/**
 * Проверяет можно ли сегодня заклаймить Daily Login
 */
export function canClaimDailyLogin() {
  const state = getState();
  const lastClaim = state.dailyLogin.lastClaimTimestamp;
  if (lastClaim === 0) return true;

  const lastDate = new Date(lastClaim).toDateString();
  const today = new Date().toDateString();
  return lastDate !== today;
}

/**
 * Данные наград Daily Login (7 дней)
 */
export const DAILY_REWARDS = [
  { day: 1, gold: 10, item: null, label: '10 золота' },
  { day: 2, gold: 20, item: null, label: '20 золота' },
  { day: 3, gold: 30, item: 'mana_elixir', label: '30 золота + Эликсир маны' },
  { day: 4, gold: 50, item: null, label: '50 золота' },
  { day: 5, gold: 40, item: 'crystal_shard', label: '40 золота + Осколок кристалла' },
  { day: 6, gold: 75, item: null, label: '75 золота' },
  { day: 7, gold: 0, item: 'chest', label: 'Сундук тренировки' }
];

/**
 * Выдаёт награду Daily Login
 * Возвращает объект с данными о награде
 */
export function claimDailyLogin() {
  const state = getState();
  if (!canClaimDailyLogin()) return null;

  const dayIndex = (state.dailyLogin.currentDay - 1) % 7;
  const reward = DAILY_REWARDS[dayIndex];

  // Начисляем золото
  if (reward.gold > 0) {
    state.gold += reward.gold;
  }

  let itemReceived = null;

  // Обрабатываем предмет-награду
  if (reward.item === 'chest') {
    // Случайный Common предмет из любого слота
    itemReceived = getRandomCommonItem();
    if (itemReceived) {
      state.inventory[itemReceived] = (state.inventory[itemReceived] || 0) + 1;
    }
  } else if (reward.item) {
    state.inventory[reward.item] = (state.inventory[reward.item] || 0) + 1;
    itemReceived = reward.item;
  }

  // Обновляем данные Daily Login
  state.dailyLogin.lastClaimTimestamp = Date.now();
  if (state.dailyLogin.currentDay >= 7) {
    state.dailyLogin.currentDay = 1;
    state.dailyLogin.cyclesCompleted++;
  } else {
    state.dailyLogin.currentDay++;
  }

  state.timestamps.lastLogin = Date.now();
  saveState();

  return { reward, itemReceived, gold: reward.gold };
}

/**
 * Возвращает случайный Common предмет из всех слотов
 */
export function getRandomCommonItem() {
  const allItems = [...ITEM_POOLS.staff, ...ITEM_POOLS.hat, ...ITEM_POOLS.cloak];
  return allItems[Math.floor(Math.random() * allItems.length)];
}

/**
 * Возвращает случайный дроп-предмет по слоту
 */
export function rollItemDrop() {
  const slots = ['staff', 'hat', 'cloak'];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const pool = ITEM_POOLS[slot];
  return pool[Math.floor(Math.random() * pool.length)];
}
