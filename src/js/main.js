/**
 * main.js — точка входа игры
 * Навигация между экранами, обработка результатов боя,
 * управление локациями и popup-ами.
 */

import { loadState, getState, saveState } from './state.js';
import { initBattle, getFightsRemaining, setOnBattleEnd } from './combat.js';
import { initGrimoire, bindGrimoireEvents } from './grimoire.js';
import { renderHomeScreen, initEquipmentZones } from './inventory.js';
import { initMapScreen } from './map.js';
import { checkAndShowDailyLogin, showDailyLoginPopup, hideDailyLoginPopup, handleClaimDaily } from './dailylogin.js';
import {
  showScreen, updateHUD, showNotification,
  initStarBackground, showPopupResult, hidePopupResult,
  showPopupLevelUp, hidePopupLevelUp, renderHudBuffs
} from './ui.js';
import { openShop, bindShopEvents } from './shop.js';

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
  if (levelEl) levelEl.textContent = `Lv. ${state.level}`;
  if (goldEl)  goldEl.textContent  = `🪙 ${state.gold}`;

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

  // Клик на спрайт торговца (один раз, флаг не нужен — handler задаётся один раз здесь)
  document.getElementById('merchant-sprite')?.addEventListener('click', openShop);

  bindEvents();
}

/**
 * Переход от экрана загрузки к игре
 */
function startGame() {
  updateHUD();

  initMapScreen({
    onGoToSquare: () => goToLocation('square'),
    onGoToHome:   () => goToLocation('home')
  });

  initEquipmentZones();
  goToLocation('square');

  setTimeout(checkAndShowDailyLogin, 700);
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
 * Колбек результата боя — вызывается из combat.js
 */
function handleBattleEnd(result) {
  updateHUD();
  updateLocationHUD();
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

  // Level Up
  document.getElementById('btn-levelup-close')?.addEventListener('click', hidePopupLevelUp);

  // Просмотр локации (popup совместимость)
  document.getElementById('btn-close-location')?.addEventListener('click', () => {
    document.getElementById('popup-location')?.classList.remove('visible');
  });

  // Боевой экран
  document.getElementById('btn-combat-back')?.addEventListener('click', () => {
    goToLocation('square');
  });

  // Закрытие popup по клику на оверлей
  document.querySelectorAll('.popup-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('visible');
    });
  });

  // Клавиатура
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.popup-overlay.visible').forEach(p => {
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
