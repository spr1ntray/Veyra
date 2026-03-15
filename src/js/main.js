/**
 * main.js — точка входа игры
 * Инициализация всех модулей, навигация между экранами,
 * обработка результатов боя и popup-ов
 */

import { loadState, getState, saveState } from './state.js';
import { initBattle, castSpell, getFightsRemaining, SPELLS, setOnBattleEnd } from './combat.js';
import { renderInventory } from './inventory.js';
import { initMap, refreshMapBadges } from './map.js';
import { checkAndShowDailyLogin, showDailyLoginPopup, hideDailyLoginPopup, handleClaimDaily } from './dailylogin.js';
import {
  showScreen, updateHUD, showNotification,
  initStarBackground, showPopupResult, hidePopupResult,
  showPopupLevelUp, hidePopupLevelUp
} from './ui.js';

// Отслеживание текущего активного экрана (для hotkeys)
let activeScreen = 'screen-loading';

/**
 * Обёртка над showScreen — отслеживает текущий экран
 */
function navigateTo(screenId) {
  activeScreen = screenId;
  showScreen(screenId);
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
 * Переход от экрана загрузки к игре
 */
function startGame() {
  navigateTo('screen-map');
  updateHUD();

  // Инициализируем карту с колбеками навигации
  initMap({
    onEnterCombat: enterCombatScreen,
    onEnterTown: () => showNotification('Городская площадь — используй меню внизу экрана', 'info')
  });

  // Popup Daily Login с задержкой для плавности
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
    navigateTo('screen-map');
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
  // Обновляем HUD с новыми данными (золото, xp)
  updateHUD();

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
    btn.dataset.key = index + 1; // горячая клавиша

    btn.style.setProperty('--spell-color', spell.color);
    btn.style.setProperty('--spell-glow', spell.glowColor);

    btn.innerHTML = `
      <span class="spell-emoji">${spell.emoji}</span>
      <div class="spell-info">
        <div class="spell-name">${spell.name}</div>
        <div class="spell-stats">${spell.minDmg}–${spell.maxDmg} урона</div>
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

  // Нижняя навигация
  document.getElementById('nav-map')?.addEventListener('click', () => {
    navigateTo('screen-map');
    refreshMapBadges();
  });

  document.getElementById('nav-inventory')?.addEventListener('click', () => {
    navigateTo('screen-inventory');
    renderInventory();
  });

  document.getElementById('nav-daily')?.addEventListener('click', showDailyLoginPopup);

  // Daily Login popup
  document.getElementById('btn-claim-daily')?.addEventListener('click', handleClaimDaily);
  document.getElementById('btn-close-daily')?.addEventListener('click', hideDailyLoginPopup);

  // Результат боя
  document.getElementById('btn-result-back')?.addEventListener('click', () => {
    hidePopupResult();
    navigateTo('screen-map');
    refreshMapBadges();
  });

  document.getElementById('btn-result-replay')?.addEventListener('click', () => {
    hidePopupResult();
    if (getFightsRemaining() > 0) {
      enterCombatScreen();
    } else {
      showNotification('На сегодня боёв больше нет!', 'warning');
      navigateTo('screen-map');
      refreshMapBadges();
    }
  });

  // Level Up
  document.getElementById('btn-levelup-close')?.addEventListener('click', hidePopupLevelUp);

  // Возврат с боевого экрана
  document.getElementById('btn-combat-back')?.addEventListener('click', () => {
    navigateTo('screen-map');
    refreshMapBadges();
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
