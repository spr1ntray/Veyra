/**
 * main.js — точка входа игры
 * Навигация между экранами, обработка результатов боя,
 * управление локациями и popup-ами.
 */

import { loadState, getState, saveState } from './state.js';
import { initDevPanel } from './devpanel.js';
import { initBattle, getFightsRemaining, setOnBattleEnd } from './combat.js';
import { initGrimoire, bindGrimoireEvents, updateHudClassBadge } from './grimoire.js';
import { renderHomeScreen, initEquipmentZones } from './inventory.js';
import { initMapScreen } from './map.js';
import { checkAndShowDailyLogin, showDailyLoginPopup, hideDailyLoginPopup, handleClaimDaily } from './dailylogin.js';
import {
  showScreen, updateHUD, showNotification,
  initStarBackground, showPopupResult, hidePopupResult,
  showPopupLevelUp, hidePopupLevelUp, renderHudBuffs
} from './ui.js';
import { openShop, bindShopEvents } from './shop.js';
import { initTower, openTowerScreen, onFloorWon, onFloorLost, restoreTowerSummary } from './tower.js';
import { initPassivesScreen, renderPassivesScreen, bindPassivesEvents } from './passives_ui.js';

// Текущая локация (используется для восстановления экрана после боя)
let currentLocation = 'square';

// Текущий активный экран (для горячих клавиш)
let activeScreen = 'screen-loading';

// Враг выбранный для текущего боя
let pendingEnemyId = 'training_dummy';

/**
 * Обёртка над showScreen — отслеживает текущий активный экран
 */
function navigateTo(screenId) {
  activeScreen = screenId;
  showScreen(screenId);
}

/**
 * Переход к локации по id.
 */
function goToLocation(locationId) {
  currentLocation = locationId;

  // Скрываем спрайт торговца при любом переходе — покажем ниже если нужно
  const merchantEl = document.getElementById('merchant-sprite');
  if (merchantEl) merchantEl.style.display = 'none';

  if (locationId === 'home') {
    navigateTo('screen-home');
    renderHomeScreen();
    return;
  }

  const backgrounds = {
    square: 'assets/generated/pixel/Town-Square-Background.png'
  };

  const bgEl = document.getElementById('location-bg');
  if (bgEl && backgrounds[locationId]) {
    bgEl.style.backgroundImage = `url('${backgrounds[locationId]}')`;
    bgEl.style.backgroundPosition = 'center 10%';
  }

  navigateTo('screen-location');
  updateLocationHUD();
  updateLocationActions(locationId);

  // Показываем спрайт торговца только на площади
  if (locationId === 'square' && merchantEl) {
    merchantEl.style.display = 'block';
  }
}

/**
 * Обновляет HUD внутри экрана локации
 */
function updateLocationHUD() {
  const state = getState();

  const nameEl  = document.getElementById('loc-hud-name');
  const levelEl = document.getElementById('loc-hud-level');
  const goldEl  = document.getElementById('loc-hud-gold');

  if (nameEl)  nameEl.textContent  = state.name;
  if (levelEl) levelEl.textContent = `${state.level}`;
  if (goldEl)  goldEl.textContent  = `◈ ${state.gold}`;

  renderHudBuffs();
}

/**
 * Обновляет кнопки действий внизу экрана локации
 */
function updateLocationActions(locationId) {
  const actionsEl = document.getElementById('location-actions');
  if (!actionsEl) return;
  actionsEl.innerHTML = '';

  if (locationId === 'square') {
    // Кнопка Training — открывает экран гримуара
    const btn = document.createElement('button');
    btn.className = 'location-action-btn';
    const trainingImg = document.createElement('img');
    trainingImg.src = 'assets/generated/pixel/training_icon.png';
    trainingImg.width = 28;
    trainingImg.height = 28;
    trainingImg.style.cssText = 'image-rendering:pixelated;vertical-align:middle;margin-right:6px';
    btn.appendChild(trainingImg);
    btn.appendChild(document.createTextNode('Training'));
    btn.addEventListener('click', () => enterGrimoireScreen('training_dummy'));
    actionsEl.appendChild(btn);

    // Кнопка Shop — открывает магазин торговца
    const shopBtn = document.createElement('button');
    shopBtn.className = 'location-action-btn';
    shopBtn.textContent = '🛒 Shop';
    shopBtn.addEventListener('click', openShop);
    actionsEl.appendChild(shopBtn);
  }
}

/**
 * Инициализация игры при загрузке страницы
 */
function init() {
  // Dev panel — инициализируется до всего остального,
  // доступна только при вводе пароля (Ctrl+Shift+D)
  initDevPanel();

  initStarBackground();

  const state = loadState();
  state.timestamps.lastLogin = Date.now();
  saveState();

  navigateTo('screen-loading');
  updateLoadingScreen();

  // Регистрируем колбек окончания боя
  setOnBattleEnd(handleBattleEnd);

  // Привязываем события экрана гримуара (один раз)
  bindGrimoireEvents();

  // Привязываем события магазина (один раз)
  bindShopEvents();

  // Инициализируем систему башни (один раз)
  initTower({ onExitToMap: () => goToLocation('square') });

  // Инициализируем экран пассивных навыков (один раз)
  initPassivesScreen({ onBack: () => goToLocation('home') });
  bindPassivesEvents();

  // Привязываем события Awakening popup (один раз)
  bindAwakeningEvents();

  // Клик на спрайт торговца (один раз, флаг не нужен — handler задаётся один раз здесь)
  document.getElementById('merchant-sprite')?.addEventListener('click', openShop);

  bindEvents();
}

/**
 * Переход от экрана загрузки к игре
 */
function startGame() {
  updateHUD();
  // Инициализируем badge класса при загрузке (если класс уже был выбран ранее)
  updateHudClassBadge();

  initMapScreen({
    onGoToSquare: () => goToLocation('square'),
    onGoToHome:   () => goToLocation('home'),
    onGoToTower:  () => openTowerScreen()
  });

  initEquipmentZones();

  // BUG-001: если игрок закрыл вкладку после прохождения этажей не забрав награды —
  // currentRun остался в state. Восстанавливаем summary чтобы награды не потерялись.
  if (restoreTowerSummary()) {
    // Summary показан — не переходим на карту, ждём пока игрок нажмёт Claim
    return;
  }

  goToLocation('square');

  setTimeout(checkAndShowDailyLogin, 700);

  // Check if player needs to choose a class (level 3+ but no classType)
  checkAwakening();
}

/**
 * Открывает экран гримуара для выбранного врага
 */
function enterGrimoireScreen(enemyId) {
  const remaining = getFightsRemaining();
  if (remaining <= 0) {
    showNotification('No battles left for today. Come back tomorrow!', 'warning');
    return;
  }

  pendingEnemyId = enemyId;

  // Инициализируем экран гримуара
  initGrimoire(
    enemyId,
    // Колбек "Begin Battle"
    (eid) => {
      navigateTo('screen-combat');
      const started = initBattle(eid);
      if (!started) {
        showNotification('Cannot start battle!', 'warning');
        goToLocation('square');
      }
    },
    // Колбек "Back"
    () => goToLocation('square')
  );

  navigateTo('screen-grimoire');
}

/**
 * Колбек результата боя — вызывается из combat.js.
 * Если это башенный бой — маршрутизируем в tower.js,
 * иначе обрабатываем как обычный бой.
 */
function handleBattleEnd(result) {
  updateHUD();
  updateLocationHUD();

  // === Башенный бой ===
  if (result.isTowerCombat) {
    if (result.won) {
      onFloorWon(result);
    } else {
      onFloorLost();
    }
    return;
  }

  // === Обычный бой ===
  showPopupResult(result);

  if (result.expiredBuffs && result.expiredBuffs.length > 0) {
    for (const buffName of result.expiredBuffs) {
      showNotification(`${buffName} expired`, 'info');
    }
  }

  if (result.levelUps && result.levelUps.length > 0) {
    setTimeout(() => {
      showPopupLevelUp(result.levelUps[result.levelUps.length - 1]);
    }, 2200);
    // Awakening check is deferred to level-up popup close callback (see bindEvents)
  } else {
    // No level-up: check awakening directly
    checkAwakening();
  }
}

/**
 * Обновляет загрузочный экран
 */
function updateLoadingScreen() {
  const state = getState();
  const isRegistered = state.name && state.name !== 'Unnamed Wizard';

  const userBlock     = document.getElementById('loading-user-block');
  const registerBlock = document.getElementById('loading-register-block');
  const nameDisplay   = document.getElementById('hero-name-display');

  if (isRegistered) {
    if (userBlock)     userBlock.style.display     = 'flex';
    if (registerBlock) registerBlock.style.display = 'none';
    if (nameDisplay)   nameDisplay.textContent     = state.name;
  } else {
    if (userBlock)     userBlock.style.display     = 'none';
    if (registerBlock) registerBlock.style.display = 'block';
  }
}

// ===== AWAKENING POPUP (Class Selection at Level 3) =====

let _awakeningSelected = null;
let _awakeningShowing = false;

/**
 * Shows the Awakening popup for class selection.
 * Cannot be closed without choosing a class.
 */
function showAwakeningPopup() {
  if (_awakeningShowing) return; // Guard: prevent double invocation

  const popup = document.getElementById('popup-awakening');
  if (!popup) return;

  _awakeningShowing = true;
  _awakeningSelected = null;
  const btn = document.getElementById('btn-awaken');
  if (btn) btn.disabled = true;

  // Clear previous selection
  popup.querySelectorAll('.awakening-card').forEach(c => c.classList.remove('selected'));

  popup.classList.add('visible');
}

/**
 * Binds Awakening popup events (called once from init).
 */
function bindAwakeningEvents() {
  const popup = document.getElementById('popup-awakening');
  if (!popup) return;

  const cards = popup.querySelectorAll('.awakening-card');
  const btn = document.getElementById('btn-awaken');

  // Card selection
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      _awakeningSelected = card.dataset.class;
      if (btn) btn.disabled = false;
    });
  });

  // Awaken button
  if (btn) {
    btn.addEventListener('click', () => {
      if (!_awakeningSelected) return;

      const state = getState();
      state.classType = _awakeningSelected;
      saveState();

      popup.classList.remove('visible');
      _awakeningShowing = false;
      showNotification(`You have awakened as a ${_awakeningSelected.charAt(0).toUpperCase() + _awakeningSelected.slice(1)}!`, 'success');
      updateHUD();
      updateLocationHUD();
      // Обновляем бейдж класса в HUD сразу после выбора
      updateHudClassBadge();
    });
  }

  // Block closing without selection: override overlay click and Escape for this popup
  popup.addEventListener('click', (e) => {
    // Only allow closing via the Awaken button — block overlay click dismiss
    if (e.target === popup) {
      e.stopPropagation();
      showNotification('You must choose a class to continue.', 'warning');
    }
  }, true); // capture phase to prevent bubbling to generic overlay handler
}

/**
 * Checks if Awakening should trigger (level >= 3, classType === null).
 * Called after battle results and level-up.
 */
function checkAwakening() {
  const state = getState();
  if (state.level >= 3 && !state.classType) {
    showAwakeningPopup();
  }
}

/**
 * Привязывает все обработчики событий
 */
function bindEvents() {
  // Загрузочный экран
  document.getElementById('btn-start')?.addEventListener('click', startGame);

  document.getElementById('btn-confirm-name')?.addEventListener('click', () => {
    const input = document.getElementById('hero-name-input');
    if (!input) return;
    const newName = input.value.trim();
    if (newName.length >= 2 && newName.length <= 20) {
      const state = getState();
      state.name = newName;
      saveState();
      updateLoadingScreen();
      updateHUD();
      showNotification(`Name saved: ${newName}`, 'success');
    } else {
      showNotification('Name: 2 to 20 characters', 'warning');
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    const state = getState();
    state.name = 'Unnamed Wizard';
    saveState();
    updateLoadingScreen();
  });

  document.getElementById('hero-name-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-confirm-name')?.click();
  });

  // Экран локации
  document.getElementById('btn-open-inventory')?.addEventListener('click', () => {
    navigateTo('screen-home');
    renderHomeScreen();
  });

  document.getElementById('btn-loc-map')?.addEventListener('click', () => {
    navigateTo('screen-map');
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  });

  document.getElementById('btn-loc-daily')?.addEventListener('click', showDailyLoginPopup);

  // Карта
  document.getElementById('btn-map-back')?.addEventListener('click', () => {
    goToLocation(currentLocation);
  });

  // Дом / инвентарь
  document.getElementById('btn-home-back')?.addEventListener('click', () => {
    navigateTo('screen-map');
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  });

  // Пассивные навыки (кнопка Ley Loom в инвентаре)
  document.getElementById('btn-open-passives')?.addEventListener('click', () => {
    navigateTo('screen-passives');
    renderPassivesScreen();
  });

  // Daily Login
  document.getElementById('btn-claim-daily')?.addEventListener('click', () => {
    handleClaimDaily();
    updateLocationHUD();
  });
  document.getElementById('btn-close-daily')?.addEventListener('click', hideDailyLoginPopup);

  // Результат боя
  document.getElementById('btn-result-back')?.addEventListener('click', () => {
    hidePopupResult();
    goToLocation('square');
  });

  document.getElementById('btn-result-replay')?.addEventListener('click', () => {
    hidePopupResult();
    if (getFightsRemaining() > 0) {
      enterGrimoireScreen(pendingEnemyId);
    } else {
      showNotification('No more battles today!', 'warning');
      goToLocation('square');
    }
  });

  // Level Up — on close, check if Awakening should trigger
  document.getElementById('btn-levelup-close')?.addEventListener('click', () => {
    hidePopupLevelUp();
    checkAwakening();
  });

  // Просмотр локации (popup совместимость)
  document.getElementById('btn-close-location')?.addEventListener('click', () => {
    document.getElementById('popup-location')?.classList.remove('visible');
  });

  // Боевой экран
  document.getElementById('btn-combat-back')?.addEventListener('click', () => {
    goToLocation('square');
  });

  // Закрытие popup по клику на оверлей (except Awakening — must choose a class)
  document.querySelectorAll('.popup-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && overlay.id !== 'popup-awakening') {
        overlay.classList.remove('visible');
      }
    });
  });

  // Dev panel actions — позволяет devpanel.js обновлять HUD без прямого импорта
  window.addEventListener('devpanel:action', (e) => {
    const { action } = e.detail || {};
    if (action === 'updateHUD') {
      updateHUD();
      updateLocationHUD();
      updateHudClassBadge();
    }
  });

  // Клавиатура
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.popup-overlay.visible').forEach(p => {
        // Don't allow Escape to close Awakening popup — must choose a class
        if (p.id === 'popup-awakening') return;
        p.classList.remove('visible');
      });
    }
  });
}

// Запуск при готовности DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
