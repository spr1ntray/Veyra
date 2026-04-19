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
  const claimedToday = !canClaimDailyLogin();
  // nextDayIndex — индекс (0-6) дня, который нужно заклаймить следующим
  const nextDayIndex = (state.dailyLogin.currentDay - 1) % 7;

  // Обновляем кнопку "Забрать"
  const claimBtn = document.getElementById('btn-claim-daily');
  if (claimBtn) {
    claimBtn.disabled = claimedToday;
    claimBtn.textContent = claimedToday ? '✓ Already claimed' : '✦ Claim';
    claimBtn.style.opacity = claimedToday ? '0.5' : '1';
  }

  grid.innerHTML = '';

  DAILY_REWARDS.forEach((reward, index) => {
    const dayEl = document.createElement('div');
    dayEl.className = 'daily-day';

    let status;
    if (claimedToday) {
      // Сегодня уже получено: прошедшие дни — past, следующий — next (завтра), остальные — future
      if (index < nextDayIndex) status = 'past';
      else if (index === nextDayIndex) status = 'next';
      else status = 'future';
    } else {
      // Можно получить сейчас
      if (index < nextDayIndex) status = 'past';
      else if (index === nextDayIndex) status = 'active';
      else status = 'future';
    }

    dayEl.classList.add(`day-${status}`);

    const icon = getDayIcon(reward);
    const label = getDayLabel(reward);

    dayEl.innerHTML = `
      <div class="day-number">Day ${reward.day}</div>
      <div class="day-icon">${icon}</div>
      <div class="day-label">${label}</div>
      ${status === 'past' ? '<div class="day-check">✓</div>' : ''}
      ${status === 'active' ? '<div class="day-active-badge">Today</div>' : ''}
      ${status === 'next' ? '<div class="day-active-badge day-tomorrow-badge">Tomorrow</div>' : ''}
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
  if (reward.item === 'chest') return 'Chest';
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
    showNotification('Already claimed today. Come back tomorrow!', 'info');
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
  const coinImg = '<img src="assets/generated/pixel/coin_icon.png" class="coin-inline" alt="">';
  if (result.gold > 0) rewardText += `+${result.gold} ${coinImg} `;
  if (result.itemReceived) {
    const item = ITEMS_DATA[result.itemReceived];
    if (item) rewardText += `+ ${item.name}`;
  }

  rewardEl.innerHTML = rewardText || 'Reward received!';
  rewardEl.classList.add('reward-animate');
  setTimeout(() => rewardEl.classList.remove('reward-animate'), 1000);
}
