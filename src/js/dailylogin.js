/**
 * dailylogin.js — система ежедневных наград
 * Рендеринг popup Daily Login, выдача наград
 */

import { getState, canClaimDailyLogin, claimDailyLogin, DAILY_REWARDS, ITEMS_DATA } from './state.js';
import { updateHUD, showNotification } from './ui.js';

/**
 * Проверяет нужно ли показать Daily Login и показывает если да
 * Вызывается при загрузке игры
 */
export function checkAndShowDailyLogin() {
  if (canClaimDailyLogin()) {
    showDailyLoginPopup();
  }
}

/**
 * Рендерит и показывает popup Daily Login
 */
export function showDailyLoginPopup() {
  renderDailyLoginGrid();
  const popup = document.getElementById('popup-daily');
  if (popup) {
    popup.classList.add('visible');
  }
}

/**
 * Скрывает popup Daily Login
 */
export function hideDailyLoginPopup() {
  const popup = document.getElementById('popup-daily');
  if (popup) {
    popup.classList.remove('visible');
  }
}

/**
 * Рендерит сетку 7 дней Daily Login
 */
function renderDailyLoginGrid() {
  const grid = document.getElementById('daily-grid');
  if (!grid) return;

  const state = getState();
  // currentDay уже указывает на следующий день для получения
  // Но нам нужен текущий день (который сейчас активен)
  const activeDayIndex = (state.dailyLogin.currentDay - 1) % 7; // индекс от 0
  const claimed = !canClaimDailyLogin(); // уже заклаймили сегодня

  grid.innerHTML = '';

  DAILY_REWARDS.forEach((reward, index) => {
    const dayEl = document.createElement('div');
    dayEl.className = 'daily-day';

    // Определяем статус дня
    let status = 'future'; // будущие дни
    if (index < activeDayIndex) status = 'past'; // прошедшие
    if (index === activeDayIndex) status = claimed ? 'claimed' : 'active'; // текущий

    dayEl.classList.add(`day-${status}`);

    const icon = getDayIcon(reward);
    const label = getDayLabel(reward);

    dayEl.innerHTML = `
      <div class="day-number">День ${reward.day}</div>
      <div class="day-icon">${icon}</div>
      <div class="day-label">${label}</div>
      ${status === 'claimed' ? '<div class="day-check">✓</div>' : ''}
      ${status === 'active' ? '<div class="day-active-badge">Сегодня</div>' : ''}
    `;

    grid.appendChild(dayEl);
  });
}

/**
 * Возвращает иконку для награды дня
 */
function getDayIcon(reward) {
  if (reward.item === 'chest') return '🎁';
  if (reward.item === 'mana_elixir') return '🧪';
  if (reward.item === 'crystal_shard') return '💎';
  return '🪙';
}

/**
 * Возвращает текстовое описание награды дня
 */
function getDayLabel(reward) {
  if (reward.item === 'chest') return 'Сундук';
  let label = '';
  if (reward.gold > 0) label += `${reward.gold}g`;
  if (reward.item) {
    const item = ITEMS_DATA[reward.item];
    if (item) label += ` + ${item.name}`;
  }
  return label;
}

/**
 * Обрабатывает клик кнопки "Забрать"
 */
export function handleClaimDaily() {
  const state = getState();
  const alreadyClaimed = !canClaimDailyLogin();

  if (alreadyClaimed) {
    showNotification('Уже получено сегодня. Возвращайся завтра!', 'info');
    hideDailyLoginPopup();
    return;
  }

  const result = claimDailyLogin();
  if (!result) return;

  // Показываем анимацию получения награды
  showClaimAnimation(result);

  // Обновляем HUD
  updateHUD();

  // Перерендериваем сетку чтобы показать отмеченный день
  setTimeout(() => {
    renderDailyLoginGrid();
    // Скрываем popup через небольшую задержку
    setTimeout(hideDailyLoginPopup, 1500);
  }, 800);
}

/**
 * Анимация получения награды
 */
function showClaimAnimation(result) {
  const rewardEl = document.getElementById('daily-reward-display');
  if (!rewardEl) return;

  let rewardText = '';
  if (result.gold > 0) rewardText += `+${result.gold} 🪙 `;
  if (result.itemReceived) {
    const item = ITEMS_DATA[result.itemReceived];
    if (item) rewardText += `+ ${item.name}`;
  }

  rewardEl.textContent = rewardText || 'Награда получена!';
  rewardEl.classList.add('reward-animate');
  setTimeout(() => rewardEl.classList.remove('reward-animate'), 1000);
}
