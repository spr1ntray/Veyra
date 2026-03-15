/**
 * main.js — точка входа игры
 * Навигация между экранами, обработка результатов боя,
 * управление локациями и popup-ами.
 */

import { loadState, getState, saveState } from './state.js';
import { initBattle, castSpell, getFightsRemaining, SPELLS, setOnBattleEnd } from './combat.js';
import { renderHomeScreen, initEquipmentZones } from './inventory.js';
import { initMapScreen, refreshMapBadges } from './map.js';
import { checkAndShowDailyLogin, showDailyLoginPopup, hideDailyLoginPopup, handleClaimDaily } from './dailylogin.js';
import {
  showScreen, updateHUD, showNotification,
  initStarBackground, showPopupResult, hidePopupResult,
  showPopupLevelUp, hidePopupLevelUp
} from './ui.js';

// Текущая локация (используется для восстановления экрана после боя)
let currentLocation = 'square';

// Текущий активный экран (для горячих клавиш)
let activeScreen = 'screen-loading';

/**
 * Обёртка над showScreen — отслеживает текущий активный экран
 */
function navigateTo(screenId) {
  activeScreen = screenId;
  showScreen(screenId);
}

/**
 * Переход к локации по id.
 * Устанавливает фон и показывает нужный экран.
 *
 * @param {string} locationId - 'square' | 'home'
 */
function goToLocation(locationId) {
  currentLocation = locationId;

  // Дом — отдельный экран с персонажем мага
  if (locationId === 'home') {
    navigateTo('screen-home');
    renderHomeScreen();
    return;
  }

  // Все остальные локации — экран с полноэкранным фоном
  const backgrounds = {
    square: 'from_user/sqare.png'
  };

  // Устанавливаем фон текущей локации
  const bgEl = document.getElementById('location-bg');
  if (bgEl && backgrounds[locationId]) {
    bgEl.style.backgroundImage = `url('${backgrounds[locationId]}')`;
  }

  navigateTo('screen-location');
  updateLocationHUD();
  updateLocationActions(locationId);
}

/**
 * Обновляет HUD внутри экрана локации (имя, уровень, золото).
 */
function updateLocationHUD() {
  const state = getState();

  const nameEl  = document.getElementById('loc-hud-name');
  const levelEl = document.getElementById('loc-hud-level');
  const goldEl  = document.getElementById('loc-hud-gold');

  if (nameEl)  nameEl.textContent  = state.name;
  if (levelEl) levelEl.textContent = `Ур. ${state.level}`;
  if (goldEl)  goldEl.textContent  = `🪙 ${state.gold}`;
}

/**
 * Обновляет кнопки действий внизу экрана локации в зависимости от текущей локации.
 *
 * @param {string} locationId
 */
function updateLocationActions(locationId) {
  const actionsEl = document.getElementById('location-actions');
  if (!actionsEl) return;
  actionsEl.innerHTML = '';

  if (locationId === 'square') {
    // На площади — кнопка тренировки
    const btn = document.createElement('button');
    btn.className = 'location-action-btn';
    btn.textContent = '⚔️ Тренировка';
    btn.addEventListener('click', enterCombatScreen);
    actionsEl.appendChild(btn);
  }
}

/**
 * Инициализация игры при загрузке страницы
 */
function init() {
  // Звёздный фон
  initStarBackground();

  // Загружаем/создаём сохранение
  const state = loadState();
  state.timestamps.lastLogin = Date.now();
  saveState();

  // Показываем экран загрузки
  navigateTo('screen-loading');

  // Имя на экране загрузки
  const heroNameEl = document.getElementById('hero-name-display');
  if (heroNameEl) heroNameEl.textContent = state.name;

  // Регистрируем колбек окончания боя
  setOnBattleEnd(handleBattleEnd);

  // Генерируем кнопки заклинаний в DOM
  initSpellButtons();

  // Все обработчики событий
  bindEvents();
}

/**
 * Переход от экрана загрузки к игре.
 * После загрузки игрок попадает на Площадь.
 */
function startGame() {
  updateHUD();

  // Инициализируем хотспоты карты
  initMapScreen({
    onGoToSquare: () => goToLocation('square'),
    onGoToHome:   () => goToLocation('home')
  });

  // Инициализируем зоны экипировки (один раз при старте)
  initEquipmentZones();

  // Сразу переходим на площадь
  goToLocation('square');

  // Daily Login popup с задержкой для плавности
  setTimeout(checkAndShowDailyLogin, 700);
}

/**
 * Вход на боевой экран
 */
function enterCombatScreen() {
  const remaining = getFightsRemaining();
  if (remaining <= 0) {
    showNotification('Боёв на сегодня больше нет. Возвращайся завтра!', 'warning');
    return;
  }

  navigateTo('screen-combat');
  updateFightsCounter();

  const started = initBattle();
  if (!started) {
    showNotification('Лимит боёв исчерпан!', 'warning');
    goToLocation('square');
  }
}

/**
 * Обновляет счётчик боёв в хедере боевого экрана
 */
function updateFightsCounter() {
  const el = document.getElementById('fights-remaining');
  if (!el) return;
  const remaining = getFightsRemaining();
  el.textContent = `Боёв сегодня: ${remaining} / 5`;
}

/**
 * Колбек результата боя — вызывается из combat.js
 */
function handleBattleEnd(result) {
  // Обновляем HUD (золото, xp)
  updateHUD();
  // Обновляем HUD локации если вернёмся на location-экран
  updateLocationHUD();

  // Показываем popup результата
  showPopupResult(result);

  // Если был level up — показываем popup через паузу
  if (result.levelUps && result.levelUps.length > 0) {
    setTimeout(() => {
      showPopupLevelUp(result.levelUps[result.levelUps.length - 1]);
    }, 2200);
  }
}

/**
 * Генерирует кнопки заклинаний в боевом экране
 */
function initSpellButtons() {
  const container = document.getElementById('spell-buttons');
  if (!container) return;
  container.innerHTML = '';

  const spellList = Object.values(SPELLS);
  spellList.forEach((spell, index) => {
    const btn = document.createElement('button');
    btn.className = `spell-btn spell-btn-${spell.animClass}`;
    btn.dataset.spellId = spell.id;
    btn.dataset.key = index + 1;

    btn.style.setProperty('--spell-color', spell.color);
    btn.style.setProperty('--spell-glow', spell.glowColor);

    btn.innerHTML = `
      <span class="spell-emoji">${spell.emoji}</span>
      <div class="spell-info">
        <div class="spell-name">${spell.name}</div>
        <div class="spell-stats">${spell.type === 'defensive' ? spell.typeLabel : spell.minDmg + '–' + spell.maxDmg + ' урона'}</div>
        <div class="spell-type-label">${spell.typeLabel}</div>
      </div>
    `;

    btn.addEventListener('click', () => castSpell(spell.id));
    container.appendChild(btn);
  });
}

/**
 * Привязывает все обработчики событий
 */
function bindEvents() {
  // --- Загрузочный экран ---

  // Старт игры
  document.getElementById('btn-start')?.addEventListener('click', startGame);

  // Изменение имени персонажа
  document.getElementById('btn-confirm-name')?.addEventListener('click', () => {
    const input = document.getElementById('hero-name-input');
    if (!input) return;
    const newName = input.value.trim();
    if (newName.length >= 2 && newName.length <= 20) {
      const state = getState();
      state.name = newName;
      saveState();
      const display = document.getElementById('hero-name-display');
      if (display) display.textContent = newName;
      updateHUD();
      showNotification(`Имя сохранено: ${newName}`, 'success');
    } else {
      showNotification('Имя: от 2 до 20 символов', 'warning');
    }
  });

  // Enter в поле имени
  document.getElementById('hero-name-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-confirm-name')?.click();
    }
  });

  // --- Экран локации ---

  // Кнопка карты
  document.getElementById('btn-loc-map')?.addEventListener('click', () => {
    navigateTo('screen-map');
  });

  // Кнопка наград (daily login)
  document.getElementById('btn-loc-daily')?.addEventListener('click', showDailyLoginPopup);

  // --- Экран карты ---

  // Кнопка "Назад" на карте — возвращаемся на текущую локацию
  document.getElementById('btn-map-back')?.addEventListener('click', () => {
    goToLocation(currentLocation);
  });

  // --- Экран дома ---

  // Кнопка "Назад на карту" из дома
  document.getElementById('btn-home-back')?.addEventListener('click', () => {
    navigateTo('screen-map');
  });

  // --- Daily Login popup ---
  document.getElementById('btn-claim-daily')?.addEventListener('click', () => {
    handleClaimDaily();
    // Обновляем золото в HUD локации
    updateLocationHUD();
  });
  document.getElementById('btn-close-daily')?.addEventListener('click', hideDailyLoginPopup);

  // --- Результат боя ---
  document.getElementById('btn-result-back')?.addEventListener('click', () => {
    hidePopupResult();
    // Возвращаемся на площадь после боя
    goToLocation('square');
  });

  document.getElementById('btn-result-replay')?.addEventListener('click', () => {
    hidePopupResult();
    if (getFightsRemaining() > 0) {
      enterCombatScreen();
    } else {
      showNotification('На сегодня боёв больше нет!', 'warning');
      goToLocation('square');
    }
  });

  // --- Level Up ---
  document.getElementById('btn-levelup-close')?.addEventListener('click', hidePopupLevelUp);

  // --- Просмотр локации (popup, совместимость) ---
  document.getElementById('btn-close-location')?.addEventListener('click', () => {
    document.getElementById('popup-location')?.classList.remove('visible');
  });

  // --- Боевой экран ---
  document.getElementById('btn-combat-back')?.addEventListener('click', () => {
    goToLocation('square');
  });

  // Закрытие popup по клику на затемнённый оверлей
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

    // Цифры 1-3 — заклинания в бою
    if (activeScreen === 'screen-combat') {
      const spellKeys = Object.keys(SPELLS);
      const index = parseInt(e.key) - 1;
      if (index >= 0 && index < spellKeys.length) {
        const btn = document.querySelector(`[data-spell-id="${spellKeys[index]}"]`);
        if (btn && !btn.disabled) btn.click();
      }
    }
  });
}

// Запуск при готовности DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
