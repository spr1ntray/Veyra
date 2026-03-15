/**
 * ui.js — общие UI компоненты
 * HUD, навигация между экранами, popup-ы, уведомления
 */

import { getState, xpForLevel, ITEMS_DATA } from './state.js';

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
  if (levelEl) levelEl.textContent = `Ур. ${state.level}`;

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
      xpText.textContent = 'МАКС';
    } else {
      xpText.textContent = `${state.xp} / ${xpNeeded} XP`;
    }
  }
}

/**
 * Показывает popup результата боя
 */
export function showPopupResult(data) {
  const popup = document.getElementById('popup-result');
  if (!popup) return;

  const titleEl = document.getElementById('result-title');
  const statusEl = document.getElementById('result-status');
  const statsEl = document.getElementById('result-stats');

  if (titleEl) {
    titleEl.textContent = data.won ? '⚔️ Победа!' : '💀 Поражение';
    titleEl.style.color = data.won ? '#c9a84c' : '#e74c3c';
  }

  if (statusEl) {
    statusEl.textContent = data.won
      ? `Манекен сломан! Нанесено ${data.totalDamage || data.damage} урона.`
      : `Манекен устоял. Осталось HP: ${data.dummyHP}`;
  }

  if (statsEl) {
    let html = `
      <div class="result-stat">
        <span class="stat-icon">🪙</span>
        <span class="stat-label">Золото:</span>
        <span class="stat-value">+${data.goldEarned}</span>
      </div>
      <div class="result-stat">
        <span class="stat-icon">✨</span>
        <span class="stat-label">Опыт:</span>
        <span class="stat-value">+${data.xpEarned}</span>
      </div>
    `;

    if (data.droppedItem) {
      const item = ITEMS_DATA[data.droppedItem];
      html += `
        <div class="result-stat result-drop">
          <span class="stat-icon">🎁</span>
          <span class="stat-label">Дроп:</span>
          <span class="stat-value">${item ? item.name : data.droppedItem}</span>
        </div>
      `;
    }

    if (data.bonusTriggered) {
      html += `
        <div class="result-stat result-bonus">
          <span class="stat-icon">🏆</span>
          <span class="stat-label">Бонус 5 побед!</span>
          <span class="stat-value">+25🪙 +50✨</span>
        </div>
      `;
    }

    html += `
      <div class="result-fights-left">
        Боёв осталось сегодня: ${data.fightsLeft}
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
    let rewardText = `+${goldReward} 🪙 золота`;

    // Особые награды на определённых уровнях
    if (newLevel === 5) rewardText += '\n⚡ Звание "Адепт" получено!';
    if (newLevel === 10) rewardText += '\n👑 Звание "Маг Veyra" получено!';
    if (newLevel === 4 || newLevel === 7) rewardText += '\n🎁 Сундук тренировки!';

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
}
