/**
 * tower.js — The Spire of Colwick
 * Управляет ранами башни: попытки, прогрессия этажей, carryover HP,
 * начисление наград только за новые этажи.
 *
 * Архитектура:
 *  - initTower()        — показывает screen-tower, сбрасывает дневной счётчик если нужно
 *  - startTowerRun()    — начинает новую попытку, переходит к гримуару этажа 1
 *  - _startFloor(n)     — запускает grimoire → combat для этажа n
 *  - onFloorWon(result) — вызывается из handleBattleEnd когда выиграли этаж
 *  - onFloorLost()      — вызывается из handleBattleEnd когда проиграли/timeout
 *  - exitTower()        — игрок нажал "Exit Tower" на inter-floor экране
 *  - claimRewards()     — начисляет gold+XP и переходит на карту
 */

import { getState, saveState, addGold, addXP, addItemToInventory, ENEMIES_DATA } from './state.js';
import { initBattle, calcMageMaxHP } from './combat.js';
import { initGrimoire } from './grimoire.js';
import { showScreen, showNotification } from './ui.js';

// ===== КОНСТАНТЫ =====

const MAX_ATTEMPTS_PER_DAY = 3;

/**
 * Данные врагов башни по этажу (1-indexed).
 * Ссылаются на id в ENEMIES_DATA из state.js.
 */
const TOWER_FLOORS = [
  { floor: 1,  enemyId: 'spire_sentinel',    gold: 8,   xp: 15,  sprite: 'assets/generated/pixel/Spire_Sentinel.png',   element: '🪨', elementLabel: 'Earth' },
  { floor: 2,  enemyId: 'ember_wraith',       gold: 12,  xp: 20,  sprite: 'assets/generated/pixel/Ember_Wraith.png',      element: '🔥', elementLabel: 'Fire'  },
  { floor: 3,  enemyId: 'storm_gargoyle',     gold: 15,  xp: 25,  sprite: 'assets/generated/pixel/Storm_Gargoyle.png',    element: '💨', elementLabel: 'Air'   },
  { floor: 4,  enemyId: 'frost_warden',       gold: 20,  xp: 35,  sprite: 'assets/generated/pixel/Frost_Warden.png',      element: '🧊', elementLabel: 'Water' },
  { floor: 5,  enemyId: 'bone_colossus',      gold: 25,  xp: 45,  sprite: 'assets/generated/pixel/Bone_Colossus.png',     element: '🪨', elementLabel: 'Earth' },
  { floor: 6,  enemyId: 'phantom_duelist',    gold: 30,  xp: 55,  sprite: 'assets/generated/pixel/Phantom_Duelist.png',   element: '💨', elementLabel: 'Air'   },
  { floor: 7,  enemyId: 'abyssal_tide',       gold: 40,  xp: 70,  sprite: null,                                                          element: '🌊', elementLabel: 'Water' },
  { floor: 8,  enemyId: 'infernal_knight',    gold: 50,  xp: 85,  sprite: 'assets/generated/pixel/Infernal_Knight.png',                   element: '🔥', elementLabel: 'Fire'  },
  { floor: 9,  enemyId: 'void_sentinel',      gold: 60,  xp: 100, sprite: 'assets/generated/pixel/Void_Sentinel.png',                    element: '🌑', elementLabel: 'Void'  },
  { floor: 10, enemyId: 'archon_of_colwick',  gold: 100, xp: 150, sprite: 'assets/generated/pixel/Archon_of_Colwick.png',                element: '👁️', elementLabel: 'Void'  }
];

const FULL_CLEAR_BONUS_GOLD = 360;
const FULL_CLEAR_BONUS_XP   = 600;
const FIRST_CLEAR_BONUS_GOLD = 500;
const FIRST_CLEAR_LEGENDARY  = 'staff_of_archon';

// Колбек навигации — устанавливается через initTower()
let _onExitToMap = null; // () => void — возврат на карту

// ===== ПУБЛИЧНЫЕ ФУНКЦИИ =====

/**
 * Инициализирует систему башни.
 * Вызывается один раз из main.js при инициализации игры.
 *
 * @param {object} callbacks
 * @param {function} callbacks.onExitToMap — вызывается при выходе из башни на карту
 */
export function initTower(callbacks) {
  _onExitToMap = callbacks.onExitToMap;
  _bindTowerEvents();
}

/**
 * Открывает экран входа в башню (screen-tower).
 * Вызывается из main.js когда игрок кликает на маркер башни на карте.
 */
export function openTowerScreen() {
  _checkDailyReset();
  _renderTowerScreen();
  showScreen('screen-tower');
}

/**
 * Восстанавливает экран summary из сохранённого currentRun.
 * Вызывается из main.js при старте игры если игрок закрыл вкладку
 * до нажатия "Claim Rewards" — иначе накопленные награды потеряются.
 *
 * @returns {boolean} true если summary было показано, false если нечего восстанавливать
 */
export function restoreTowerSummary() {
  const state = getState();
  const run = state.tower?.currentRun;

  // Жёсткая проверка: показываем summary только если run — валидный объект
  // с реальными данными прохождения. Пустой объект {} или повреждённые данные
  // не должны блокировать запуск игры.
  if (!run || typeof run.floorsCleared !== 'number' || run.floorsCleared <= 0) {
    // Очищаем невалидный currentRun чтобы не блокировать повторно
    if (run && (typeof run.floorsCleared !== 'number' || run.floorsCleared <= 0)) {
      state.tower.currentRun = null;
      saveState();
    }
    return false;
  }

  const isFullClear = run.floorsCleared >= TOWER_FLOORS.length;
  _renderSummaryScreen(run.floorsCleared, run.goldEarned, run.xpEarned, isFullClear);
  showScreen('screen-tower-summary');
  return true;
}

/**
 * Начинает новую попытку — тратит одну попытку и стартует этаж 1.
 */
export function startTowerRun() {
  const state = getState();
  _checkDailyReset();

  if (state.tower.attemptsToday >= MAX_ATTEMPTS_PER_DAY) {
    showNotification('No attempts remaining. Come back tomorrow.', 'warning');
    return;
  }

  // Тратим попытку
  state.tower.attemptsToday++;
  state.tower.lastAttemptDate = new Date().toDateString();

  // Инициализируем текущий ран
  state.tower.currentRun = {
    currentFloor: 1,   // следующий этаж для боя
    floorsCleared: 0,  // сколько уже пройдено в этом ране
    goldEarned: 0,
    xpEarned: 0,
    mageHP: null,      // null = начать с полного HP
    shieldHP: 0
  };
  saveState();

  _startFloor(1);
}

/**
 * Вызывается из main.js (handleBattleEnd) при победе в башенном бою.
 * Обновляет carryover HP, начисляет награды за новый этаж (выше рекорда),
 * показывает inter-floor экран.
 *
 * @param {object} result — объект из endBattle ({mageHPLeft, shieldHPLeft, ...})
 */
export function onFloorWon(result) {
  const state = getState();
  const run = state.tower.currentRun;
  if (!run) return;

  const floorNum = run.currentFloor;
  const floorData = TOWER_FLOORS[floorNum - 1];

  // Обновляем carryover
  run.mageHP  = result.mageHPLeft;
  run.shieldHP = result.shieldHPLeft || 0;
  run.floorsCleared = floorNum;

  // Начисляем награды только если этот этаж выше bestFloorToday (anti-farm)
  if (floorNum > state.tower.bestFloorToday) {
    run.goldEarned += floorData.gold;
    run.xpEarned   += floorData.xp;
    state.tower.bestFloorToday = floorNum;
  }

  // Обновляем рекорд за всё время
  if (floorNum > state.tower.allTimeBest) {
    state.tower.allTimeBest = floorNum;
  }

  saveState();

  // Если это последний этаж — показываем итог, иначе inter-floor экран
  if (floorNum >= TOWER_FLOORS.length) {
    _handleFullClear();
  } else {
    _renderInterFloorScreen(floorNum);
    showScreen('screen-tower-floor');
  }
}

/**
 * Вызывается из main.js когда игрок проиграл или бой завершился timeout.
 * Завершает ран и показывает summary.
 */
export function onFloorLost() {
  const state = getState();
  const run = state.tower.currentRun;
  if (!run) return;

  // Ран окончен
  _finishRun();
}

/**
 * Игрок нажал "Exit Tower" на inter-floor экране — добровольный выход.
 * Начисляет накопленные награды.
 */
export function exitTower() {
  _finishRun();
}

/**
 * Игрок нажимает "Claim Rewards" на экране summary.
 * Начисляет gold + XP и уходит на карту.
 */
export function claimRewards() {
  const state = getState();
  const run = state.tower.currentRun;
  if (!run) {
    if (_onExitToMap) _onExitToMap();
    return;
  }

  let gold = run.goldEarned;
  let xp   = run.xpEarned;
  const fullClear = run.floorsCleared >= TOWER_FLOORS.length;

  // Бонус за полный клир (10 этажей)
  if (fullClear) {
    gold += FULL_CLEAR_BONUS_GOLD;
    xp   += FULL_CLEAR_BONUS_XP;

    // Первый полный клир — легендарная награда
    if (!state.tower.firstClearDone) {
      state.tower.firstClearDone = true;
      gold += FIRST_CLEAR_BONUS_GOLD;
      addItemToInventory(FIRST_CLEAR_LEGENDARY);
      showNotification('First Clear! Staff of the Archon added to inventory.', 'success');
    }
  }

  addGold(gold);
  const levelUps = addXP(xp);

  state.tower.currentRun = null;
  saveState();

  if (levelUps && levelUps.length > 0) {
    // Импортируем showPopupLevelUp lazily чтобы избежать циклических зависимостей
    import('./ui.js').then(({ showPopupLevelUp }) => {
      showPopupLevelUp(levelUps[levelUps.length - 1]);
    });
  }

  if (_onExitToMap) _onExitToMap();
}

// ===== ПРИВАТНЫЕ ФУНКЦИИ =====

/**
 * Сбрасывает дневные счётчики если наступил новый день.
 */
function _checkDailyReset() {
  const state = getState();
  const today = new Date().toDateString();
  if (state.tower.lastAttemptDate !== today) {
    state.tower.attemptsToday = 0;
    state.tower.bestFloorToday = 0;
    state.tower.lastAttemptDate = today;
    // currentRun не сбрасываем — если игрок был в середине рана, ран остаётся
    saveState();
  }
}

/**
 * Запускает гримуар → бой для указанного этажа.
 * HP/shield передаются через options для carryover.
 *
 * @param {number} floorNum — 1-indexed
 */
function _startFloor(floorNum) {
  const state = getState();
  const run = state.tower.currentRun;
  const floorData = TOWER_FLOORS[floorNum - 1];

  run.currentFloor = floorNum;
  saveState();

  // BUG-004: Проверяем наличие данных врага перед стартом.
  // Если enemyId не зарегистрирован в ENEMIES_DATA, initBattle вернёт false,
  // а сообщение "fill at least 3 grimoire slots" введёт игрока в заблуждение.
  if (!ENEMIES_DATA[floorData.enemyId]) {
    showNotification(`Floor ${floorNum} enemy data missing (${floorData.enemyId}). Please report this bug.`, 'warning');
    _finishRun();
    return;
  }

  // Открываем гримуар с врагом башни
  initGrimoire(
    floorData.enemyId,
    // Колбек "Begin Battle"
    (enemyId) => {
      showScreen('screen-combat');
      const started = initBattle(enemyId, {
        isTowerCombat: true,
        carryHP:    run.mageHP,    // null на первом этаже = полное HP
        carryShield: run.shieldHP
      });
      if (!started) {
        showNotification('Cannot start battle — fill at least 3 grimoire slots!', 'warning');
        showScreen('screen-grimoire');
      }
    },
    // Колбек "Back" — возврат из гримуара без старта
    () => {
      // Возвращаемся на экран входа в башню
      // Попытка уже потрачена, показываем summary с нулями
      _finishRun();
    }
  );

  showScreen('screen-grimoire');
}

/**
 * Обрабатывает полный клир башни (10/10 этажей).
 */
function _handleFullClear() {
  const state = getState();
  const run = state.tower.currentRun;
  // Бонусы начислятся в claimRewards(), здесь только показываем summary
  _renderSummaryScreen(run.floorsCleared, run.goldEarned, run.xpEarned, true);
  showScreen('screen-tower-summary');
}

/**
 * Завершает ран (поражение или добровольный выход) и показывает summary.
 */
function _finishRun() {
  const state = getState();
  const run = state.tower.currentRun;
  if (!run) {
    if (_onExitToMap) _onExitToMap();
    return;
  }
  _renderSummaryScreen(run.floorsCleared, run.goldEarned, run.xpEarned, false);
  showScreen('screen-tower-summary');
}

// ===== РЕНДЕР UI =====

// Путь к фоновому изображению башни (файл содержит em-dash — задаём через JS)
const TOWER_BG_URL = "assets/generated/pixel/Tower_Entrance\u2014Full_Background.png";

/**
 * Устанавливает фоновое изображение на все bg-элементы башни.
 * Вызывается один раз при первом рендере.
 */
function _applyTowerBackground() {
  const bgUrl = `url('${TOWER_BG_URL}')`;
  document.querySelectorAll('.tower-entrance-bg, .tower-floor-bg, .tower-summary-bg').forEach(el => {
    el.style.backgroundImage = bgUrl;
  });
}

/**
 * Рендерит screen-tower: список этажей, счётчики, кнопку.
 */
function _renderTowerScreen() {
  _applyTowerBackground();
  const state = getState();
  _checkDailyReset();

  const attemptsLeft = MAX_ATTEMPTS_PER_DAY - state.tower.attemptsToday;
  const best = state.tower.bestFloorToday;

  // Счётчики
  const attemptsEl = document.getElementById('tower-attempts-display');
  if (attemptsEl) attemptsEl.textContent = `Attempts: ${state.tower.attemptsToday} / ${MAX_ATTEMPTS_PER_DAY}`;

  const bestEl = document.getElementById('tower-best-display');
  if (bestEl) bestEl.textContent = best > 0 ? `Best today: Floor ${best}` : 'Best today: —';

  // Кнопка входа
  const enterBtn = document.getElementById('btn-tower-enter');
  if (enterBtn) {
    enterBtn.disabled = attemptsLeft <= 0;
    enterBtn.textContent = attemptsLeft > 0
      ? `Enter the Spire (${attemptsLeft} left)`
      : 'No Attempts Left';
  }

  // Список этажей
  const listEl = document.getElementById('tower-floor-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  TOWER_FLOORS.forEach(floorData => {
    const li = document.createElement('div');
    li.className = 'tower-floor-item';

    let statusClass = 'floor-locked';
    let statusText  = 'Locked';

    if (floorData.floor <= best) {
      statusClass = 'floor-cleared';
      statusText  = 'Cleared';
    } else if (floorData.floor === best + 1) {
      statusClass = 'floor-current';
      statusText  = 'Current';
    }

    li.classList.add(statusClass);
    li.innerHTML = `
      <span class="tower-floor-num">Floor ${floorData.floor}</span>
      <span class="tower-floor-element">${floorData.element}</span>
      <span class="tower-floor-name">${_getEnemyName(floorData.enemyId)}</span>
      <span class="tower-floor-reward">+${floorData.gold}g / +${floorData.xp}xp</span>
      <span class="tower-floor-status ${statusClass}">${statusText}</span>
    `;
    listEl.appendChild(li);
  });
}

/**
 * Рендерит screen-tower-floor (inter-floor).
 *
 * @param {number} clearedFloor — только что пройденный этаж
 */
function _renderInterFloorScreen(clearedFloor) {
  const state = getState();
  const run = state.tower.currentRun;
  const nextFloor = clearedFloor + 1;
  const nextData  = TOWER_FLOORS[nextFloor - 1];

  // Заголовок
  const titleEl = document.getElementById('tower-floor-title');
  if (titleEl) titleEl.textContent = `Floor ${clearedFloor} Cleared!`;

  // HP мага
  const hpEl = document.getElementById('tower-floor-mage-hp');
  if (hpEl) {
    const maxHP = calcMageMaxHP();
    hpEl.textContent = `HP: ${run.mageHP} / ${maxHP}`;
  }

  // Превью следующего врага
  const previewEl = document.getElementById('tower-floor-next-preview');
  if (previewEl && nextData) {
    previewEl.innerHTML = `
      <div class="tower-next-floor-num">Floor ${nextFloor}</div>
      <div class="tower-next-enemy-element">${nextData.element}</div>
      <div class="tower-next-enemy-name">${_getEnemyName(nextData.enemyId)}</div>
      <div class="tower-next-enemy-element-label">${nextData.elementLabel}</div>
    `;
  }

  // Кнопка Continue
  const continueBtn = document.getElementById('btn-tower-continue');
  if (continueBtn) {
    continueBtn.textContent = `Continue to Floor ${nextFloor}`;
    continueBtn.onclick = () => _startFloor(nextFloor);
  }
}

/**
 * Рендерит screen-tower-summary (итог рана).
 *
 * @param {number}  floorsCleared
 * @param {number}  gold
 * @param {number}  xp
 * @param {boolean} isFullClear
 */
function _renderSummaryScreen(floorsCleared, gold, xp, isFullClear) {
  const state = getState();

  const titleEl = document.getElementById('tower-summary-title');
  if (titleEl) {
    titleEl.textContent = isFullClear
      ? 'The Spire Falls Before You!'
      : floorsCleared > 0
        ? `Reached Floor ${floorsCleared}`
        : 'The Spire Endures';
  }

  const detailEl = document.getElementById('tower-summary-detail');
  if (detailEl) {
    let bonusGold = gold;
    let bonusXP   = xp;
    if (isFullClear) {
      bonusGold += FULL_CLEAR_BONUS_GOLD;
      bonusXP   += FULL_CLEAR_BONUS_XP;
      if (!state.tower.firstClearDone) {
        bonusGold += FIRST_CLEAR_BONUS_GOLD;
      }
    }

    let html = `
      <div class="summary-floors">Floors Cleared: <strong>${floorsCleared} / ${TOWER_FLOORS.length}</strong></div>
      <div class="summary-gold">Gold: <strong>+${bonusGold}</strong></div>
      <div class="summary-xp">XP: <strong>+${bonusXP}</strong></div>
    `;
    if (isFullClear) {
      html += `<div class="summary-bonus">Full Clear Bonus: +${FULL_CLEAR_BONUS_GOLD}g / +${FULL_CLEAR_BONUS_XP}xp</div>`;
      if (!state.tower.firstClearDone) {
        html += `<div class="summary-first-clear">First Clear! +${FIRST_CLEAR_BONUS_GOLD}g + Staff of the Archon</div>`;
      }
    }
    detailEl.innerHTML = html;
  }
}

/**
 * Привязывает события кнопок башни (вызывается один раз из initTower).
 */
function _bindTowerEvents() {
  // screen-tower: Enter the Spire
  document.getElementById('btn-tower-enter')?.addEventListener('click', startTowerRun);

  // screen-tower: Back to Map
  document.getElementById('btn-tower-back')?.addEventListener('click', () => {
    if (_onExitToMap) _onExitToMap();
  });

  // screen-tower-floor: Exit Tower
  document.getElementById('btn-tower-exit')?.addEventListener('click', exitTower);

  // screen-tower-summary: Claim Rewards
  document.getElementById('btn-tower-claim')?.addEventListener('click', claimRewards);
}

/**
 * Вспомогательная: имя врага по enemyId (ищем в TOWER_FLOORS).
 */
function _getEnemyName(enemyId) {
  const names = {
    spire_sentinel:   'Spire Sentinel',
    ember_wraith:     'Ember Wraith',
    storm_gargoyle:   'Storm Gargoyle',
    frost_warden:     'Frost Warden',
    bone_colossus:    'Bone Colossus',
    phantom_duelist:  'Phantom Duelist',
    abyssal_tide:     'Abyssal Tide',
    infernal_knight:  'Infernal Knight',
    void_sentinel:    'Void Sentinel',
    archon_of_colwick:'Archon of Colwick'
  };
  return names[enemyId] || enemyId;
}

// _calcMageMaxHP удалён — используем экспортированную calcMageMaxHP из combat.js
