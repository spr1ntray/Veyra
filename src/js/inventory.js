/**
 * inventory.js — управление инвентарём и экипировкой
 * Рендеринг экрана инвентаря, экипировка предметов
 */

import { getState, ITEMS_DATA, equipItem, getBonusPower } from './state.js';
import { updateHUD, showNotification } from './ui.js';

// Иконки слотов
const SLOT_ICONS = {
  staff: '🪄',
  hat: '🎩',
  cloak: '🧣'
};

// Названия слотов на русском
const SLOT_NAMES = {
  staff: 'Посох',
  hat: 'Шляпа',
  cloak: 'Накидка'
};

// Цвета редкостей
const RARITY_COLORS = {
  starter: '#6b6b6b',
  common: '#e8e0d0',
  uncommon: '#2ecc71',
  rare: '#4a90d9',
  epic: '#9b59b6',
  legendary: '#f39c12'
};

/**
 * Рендерит полный экран инвентаря
 */
export function renderInventory() {
  renderEquipmentSlots();
  renderInventoryItems();
  renderBonusPowerDisplay();
}

/**
 * Рендерит слоты экипировки (3 слота)
 */
function renderEquipmentSlots() {
  const container = document.getElementById('equipment-slots');
  if (!container) return;

  const state = getState();
  container.innerHTML = '';

  for (const slot of ['staff', 'hat', 'cloak']) {
    const equippedId = state.equipment[slot];
    const item = ITEMS_DATA[equippedId];

    const slotEl = document.createElement('div');
    slotEl.className = 'equipment-slot';

    slotEl.innerHTML = `
      <div class="slot-icon">${SLOT_ICONS[slot]}</div>
      <div class="slot-info">
        <div class="slot-label">${SLOT_NAMES[slot]}</div>
        <div class="slot-item-name" style="color: ${item ? RARITY_COLORS[item.rarity] : '#6b6b6b'}">
          ${item ? item.name : 'Пусто'}
        </div>
        ${item && item.bonus > 0 ? `<div class="slot-bonus">+${item.bonus} Сила</div>` : ''}
        ${item ? `<div class="slot-desc">${item.desc}</div>` : ''}
      </div>
    `;

    container.appendChild(slotEl);
  }
}

/**
 * Рендерит список предметов в инвентаре
 */
function renderInventoryItems() {
  const container = document.getElementById('inventory-items');
  if (!container) return;

  const state = getState();
  container.innerHTML = '';

  // Фильтруем предметы которые есть у игрока
  const ownedItems = Object.entries(state.inventory)
    .filter(([id, count]) => count > 0)
    .map(([id, count]) => ({ id, count, data: ITEMS_DATA[id] }))
    .filter(item => item.data);

  if (ownedItems.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'inventory-empty';
    emptyEl.textContent = 'Инвентарь пуст. Выиграй бой чтобы получить предметы!';
    container.appendChild(emptyEl);
    return;
  }

  ownedItems.forEach(({ id, count, data }) => {
    const itemEl = createInventoryItemElement(id, count, data, state);
    container.appendChild(itemEl);
  });
}

/**
 * Создаёт DOM-элемент для предмета в инвентаре
 */
function createInventoryItemElement(id, count, data, state) {
  const el = document.createElement('div');
  el.className = 'inventory-item';
  el.dataset.itemId = id;

  // Проверяем экипирован ли предмет
  const isEquipped = state.equipment[data.slot] === id;

  // Можно ли экипировать (не расходник)
  const canEquip = data.slot !== 'consumable' && !isEquipped;

  el.style.borderColor = RARITY_COLORS[data.rarity];

  el.innerHTML = `
    <div class="item-header">
      <span class="item-name" style="color: ${RARITY_COLORS[data.rarity]}">${data.name}</span>
      <span class="item-count">x${count}</span>
    </div>
    <div class="item-slot">${data.slot !== 'consumable' ? SLOT_NAMES[data.slot] : 'Расходник'}</div>
    <div class="item-desc">${data.desc}</div>
    ${data.bonus > 0 ? `<div class="item-bonus">+${data.bonus} Бонус силы</div>` : ''}
    ${isEquipped ? '<div class="item-equipped-badge">Надето</div>' : ''}
    ${canEquip ? `<button class="item-equip-btn" onclick="window.equipItemFromUI('${id}')">Надеть</button>` : ''}
  `;

  return el;
}

/**
 * Глобальная функция для экипировки из HTML onclick
 */
window.equipItemFromUI = function(itemId) {
  const success = equipItem(itemId);
  if (success) {
    const item = ITEMS_DATA[itemId];
    showNotification(`Надет: ${item.name}`, 'success');
    renderInventory();
    updateHUD();
  }
};

/**
 * Обновляет отображение суммарного BonusPower
 */
function renderBonusPowerDisplay() {
  const el = document.getElementById('total-bonus-power');
  if (!el) return;

  const bonus = getBonusPower();
  el.textContent = `Суммарная сила: +${bonus}`;

  // Подсвечиваем если есть бонусы
  el.style.color = bonus > 0 ? '#c9a84c' : '#8a7a6a';
}
