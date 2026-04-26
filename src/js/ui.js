/**
 * ui.js — общие UI компоненты
 * HUD, навигация между экранами, popup-ы, уведомления
 */

import { getState, xpForLevel, ITEMS_DATA, getActiveBuffs } from './state.js';

// Текущий активный экран
let currentScreen = 'screen-loading';

/**
 * Переключает видимый экран
 */
export function showScreen(screenId) {
  // Скрываем все экраны
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.remove('active');
  });

  // Показываем нужный
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    currentScreen = screenId;
  }

  // Trigger fade-in animation
  if (target) {
    target.classList.remove('screen-enter');
    void target.offsetWidth; // reflow
    target.classList.add('screen-enter');
  }

  // HUD и нижняя навигация удалены из DOM —
  // каждый экран содержит свои элементы управления встроенно
}

/**
 * Обновляет HUD (верхняя панель)
 */
export function updateHUD() {
  const state = getState();

  // Имя и уровень
  const nameEl = document.getElementById('hud-name');
  if (nameEl) nameEl.textContent = state.name;

  const levelEl = document.getElementById('hud-level');
  if (levelEl) levelEl.textContent = `Lv. ${state.level}`;

  // Золото
  const goldEl = document.getElementById('hud-gold');
  if (goldEl) goldEl.textContent = state.gold;

  // XP бар
  const xpNeeded = state.level < 10 ? xpForLevel(state.level) : xpForLevel(10);
  const xpPercent = Math.min(100, (state.xp / xpNeeded) * 100);

  const xpBar = document.getElementById('hud-xp-bar');
  if (xpBar) xpBar.style.width = `${xpPercent}%`;

  const xpText = document.getElementById('hud-xp-text');
  if (xpText) {
    if (state.level >= 10) {
      xpText.textContent = 'MAX';
    } else {
      xpText.textContent = `${state.xp} / ${xpNeeded} XP`;
    }
  }

  // Also render HUD buff pills
  renderHudBuffs();
}

/**
 * Renders active buff pills in the location HUD bar.
 */
export function renderHudBuffs() {
  const container = document.getElementById('hud-buffs');
  if (!container) return;
  container.innerHTML = '';

  const buffs = getActiveBuffs();
  for (const buff of buffs) {
    const pill = document.createElement('div');
    pill.className = 'hud-buff-pill';
    pill.style.borderColor = buff.color;
    // Convert hex to rgba
    const r = parseInt(buff.color.slice(1, 3), 16);
    const g = parseInt(buff.color.slice(3, 5), 16);
    const b = parseInt(buff.color.slice(5, 7), 16);
    pill.style.background = `rgba(${r}, ${g}, ${b}, 0.2)`;
    // Render pixel icon if available, fall back to symbol for unknown buffs
    if (buff.iconPath) {
      pill.innerHTML = `<img src="${buff.iconPath}" class="buff-pill-icon" alt="${buff.label}">` +
        `<span class="buff-pill-counter">${buff.combatsLeft}</span>`;
    } else {
      pill.style.color = buff.color;
      pill.textContent = buff.symbol;
    }
    pill.title = `${buff.label} — ${buff.combatsLeft} combats left`;
    container.appendChild(pill);
  }
}

/**
 * Показывает popup результата боя
 */
export function showPopupResult(data) {
  const popup = document.getElementById('popup-result');
  if (!popup) return;

  const titleEl  = document.getElementById('result-title');
  const statusEl = document.getElementById('result-status');
  const statsEl  = document.getElementById('result-stats');

  // Определяем заголовок и статус по result
  const result = data.result || (data.won ? 'win' : 'loss');

  if (titleEl) {
    if (result === 'win') {
      titleEl.textContent = 'Victory!';
      titleEl.style.color = '#c9a84c';
    } else if (result === 'timeout') {
      titleEl.textContent = 'Time Out';
      titleEl.style.color = '#f39c12';
    } else {
      titleEl.textContent = 'Defeat';
      titleEl.style.color = '#e74c3c';
    }
  }

  if (statusEl) {
    if (result === 'win') {
      statusEl.textContent = `${data.enemyName || 'Enemy'} defeated!`;
    } else if (result === 'timeout') {
      statusEl.textContent = `Time expired. ${data.enemyName || 'Enemy'} HP left: ${data.enemyHPLeft || 0}`;
    } else {
      statusEl.textContent = `Your mage was defeated.`;
    }
  }

  if (statsEl) {
    let html = `
      <div class="result-stat">
        <span class="stat-icon"><img src="assets/generated/pixel/coin_icon.png" class="coin-inline" alt=""></span>
        <span class="stat-label">Gold:</span>
        <span class="stat-value">+${data.goldEarned}</span>
      </div>
      <div class="result-stat">
        <span class="stat-icon">✨</span>
        <span class="stat-label">XP:</span>
        <span class="stat-value">+${data.xpEarned}</span>
      </div>
    `;

    if (data.droppedItem) {
      const item = ITEMS_DATA[data.droppedItem];
      html += `
        <div class="result-stat result-drop">
          <span class="stat-icon">🎁</span>
          <span class="stat-label">Drop:</span>
          <span class="stat-value">${item ? item.name : data.droppedItem}</span>
        </div>
      `;
    }

    if (data.bonusTriggered) {
      html += `
        <div class="result-stat result-bonus">
          <span class="stat-icon">🏆</span>
          <span class="stat-label">5-win bonus!</span>
          <span class="stat-value">+25 <img src="assets/generated/pixel/coin_icon.png" class="coin-inline" alt=""> +50✨</span>
        </div>
      `;
    }

    if (data.elapsedTime !== undefined) {
      html += `<div class="result-stat"><span class="stat-label">Duration:</span><span class="stat-value">${data.elapsedTime}s</span></div>`;
    }

    html += `
      <div class="result-fights-left">
        Battles left today: ${data.fightsLeft}
      </div>
    `;

    statsEl.innerHTML = html;
  }

  popup.classList.add('visible');
}

/**
 * Скрывает popup результата боя
 */
export function hidePopupResult() {
  const popup = document.getElementById('popup-result');
  if (popup) popup.classList.remove('visible');
}

/**
 * Показывает popup Level Up
 */
export function showPopupLevelUp(newLevel) {
  const popup = document.getElementById('popup-levelup');
  if (!popup) return;

  const levelEl = document.getElementById('levelup-number');
  if (levelEl) levelEl.textContent = newLevel;

  const rewardEl = document.getElementById('levelup-reward');
  if (rewardEl) {
    const goldReward = 5 * newLevel;
    let rewardText = `+${goldReward} gold`;
    rewardText += '\n+1 Attribute Point';

    // Особые награды на определённых уровнях
    if (newLevel === 3) rewardText += '\n🔮 Class Awakening available!';
    if (newLevel === 5) rewardText += '\n⚡ Title "Adept" unlocked!';
    if (newLevel === 10) rewardText += '\n👑 Title "Mage of Veyra" unlocked!';
    if (newLevel === 4 || newLevel === 7) rewardText += '\n🎁 Training Chest!';

    rewardEl.textContent = rewardText;
  }

  popup.classList.add('visible');

  // Запускаем частицы
  spawnLevelUpParticles();
}

/**
 * Скрывает popup Level Up
 */
export function hidePopupLevelUp() {
  const popup = document.getElementById('popup-levelup');
  if (popup) popup.classList.remove('visible');
}

/**
 * Генерирует частицы анимации Level Up
 */
function spawnLevelUpParticles() {
  const popup = document.getElementById('popup-levelup');
  if (!popup) return;

  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const particle = document.createElement('div');
      particle.className = 'levelup-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDuration = (0.5 + Math.random()) + 's';
      particle.style.animationDelay = Math.random() * 0.5 + 's';
      particle.textContent = ['⭐', '✨', '🌟', '💫'][Math.floor(Math.random() * 4)];
      popup.appendChild(particle);
      setTimeout(() => particle.remove(), 2000);
    }, i * 50);
  }
}

/**
 * Показывает временное уведомление
 */
export function showNotification(message, type = 'info') {
  const container = document.getElementById('notifications');
  if (!container) return;

  const notif = document.createElement('div');
  notif.className = `notification notif-${type}`;
  notif.textContent = message;

  container.appendChild(notif);

  // Анимация появления
  requestAnimationFrame(() => notif.classList.add('notif-show'));

  // Удаляем через 3 секунды
  setTimeout(() => {
    notif.classList.remove('notif-show');
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

/**
 * Инициализирует звёздный фон
 */
export function initStarBackground() {
  const starsEl = document.getElementById('stars-bg');
  if (!starsEl) return;

  // Генерируем 80 звёзд
  for (let i = 0; i < 80; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 3 + 's';
    star.style.animationDuration = (2 + Math.random() * 2) + 's';

    // Разные размеры звёзд
    const size = Math.random() < 0.2 ? 3 : (Math.random() < 0.5 ? 2 : 1);
    star.style.width = size + 'px';
    star.style.height = size + 'px';

    starsEl.appendChild(star);
  }

  // Generate 10 ember particles for atmosphere
  for (let i = 0; i < 10; i++) {
    const ember = document.createElement('div');
    ember.className = 'ember-particle';
    ember.style.left = Math.random() * 100 + '%';
    ember.style.animationDelay = (Math.random() * 6) + 's';
    ember.style.animationDuration = (4 + Math.random() * 4) + 's';
    starsEl.appendChild(ember);
  }
}
