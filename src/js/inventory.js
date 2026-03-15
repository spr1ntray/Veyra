/**
 * inventory.js — экран дома, экипировка и статы персонажа
 * Рендерит wizard-экран: кликабельные зоны экипировки,
 * правую панель со статами и выпадающие списки выбора предметов.
 */

import { getState, ITEMS_DATA, equipItem, getBonusPower, getStats } from './state.js';
import { updateHUD, showNotification } from './ui.js';

// Иконки слотов
const SLOT_ICONS = {
  staff: '🪄',
  hat:   '🎩',
  cloak: '🧣'
};

// Названия слотов
const SLOT_NAMES = {
  staff: 'Staff',
  hat:   'Hat',
  cloak: 'Cloak'
};

// Цвета редкостей
const RARITY_COLORS = {
  starter:   '#6b6b6b',
  common:    '#e8e0d0',
  uncommon:  '#2ecc71',
  rare:      '#4a90d9',
  epic:      '#9b59b6',
  legendary: '#f39c12'
};

/**
 * Главная функция отрисовки экрана дома.
 * Вызывается при каждом переходе на screen-home.
 */
export function renderHomeScreen() {
  renderStatsPanel();
  renderEquipmentList();
  initEquipmentZones();
}

/**
 * Обновляет правую панель: имя, уровень, прогресс-бары статов, золото.
 */
function renderStatsPanel() {
  const state = getState();
  const stats = getStats();

  // Имя и уровень
  const nameEl  = document.getElementById('home-char-name');
  const levelEl = document.getElementById('home-char-level');
  if (nameEl)  nameEl.textContent  = state.name;
  if (levelEl) levelEl.textContent = `Level ${state.level}`;

  // Прогресс-бар силы
  const strengthBar = document.getElementById('stat-strength-bar');
  const strengthVal = document.getElementById('stat-strength-val');
  if (strengthBar) {
    const pct = Math.min(100, Math.round((stats.strength / stats.maxStrength) * 100));
    strengthBar.style.width = `${pct}%`;
  }
  if (strengthVal) strengthVal.textContent = stats.strength;

  // Прогресс-бар интеллекта
  const intBar = document.getElementById('stat-int-bar');
  const intVal = document.getElementById('stat-int-val');
  if (intBar) {
    const pct = Math.min(100, Math.round((stats.intelligence / stats.maxIntelligence) * 100));
    intBar.style.width = `${pct}%`;
  }
  if (intVal) intVal.textContent = stats.intelligence;

  // Золото
  const goldEl = document.getElementById('home-gold');
  if (goldEl) goldEl.textContent = `🪙 ${state.gold}`;
}

/**
 * Рендерит список текущего снаряжения в правой панели.
 */
function renderEquipmentList() {
  const container = document.getElementById('home-equip-list');
  if (!container) return;

  const state = getState();
  container.innerHTML = '';

  for (const slot of ['staff', 'hat', 'cloak']) {
    const itemId = state.equipment[slot];
    const item   = ITEMS_DATA[itemId];

    const row = document.createElement('div');
    row.className = 'home-equip-row';

    const slotLabel = document.createElement('span');
    slotLabel.className = 'home-equip-slot';
    slotLabel.textContent = SLOT_NAMES[slot] + ':';

    const itemName = document.createElement('span');
    itemName.className = 'home-equip-name';
    itemName.textContent = item ? item.name : 'Empty';
    if (item) itemName.style.color = RARITY_COLORS[item.rarity];

    row.appendChild(slotLabel);
    row.appendChild(itemName);
    container.appendChild(row);
  }
}

/**
 * Инициализирует кликабельные зоны на маге.
 * При клике на зону — закрывает другие дропдауны, открывает свой.
 * При клике вне — закрывает все.
 */
export function initEquipmentZones() {
  const slots = ['hat', 'staff', 'cloak'];

  slots.forEach(slot => {
    const zone     = document.getElementById(`zone-${slot}`);
    const dropdown = document.getElementById(`dropdown-${slot}`);
    if (!zone || !dropdown) return;

    // Клик по зоне: переключаем дропдаун
    zone.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('visible');

      // Закрываем все дропдауны
      closeAllDropdowns();

      // Если был закрыт — открываем и рендерим
      if (!isOpen) {
        populateDropdown(slot, dropdown, zone);
        dropdown.classList.add('visible');
      }
    });
  });

  // Клик вне зон — закрыть все дропдауны
  document.addEventListener('click', closeAllDropdowns);
}

/**
 * Закрывает все выпадающие списки экипировки.
 */
function closeAllDropdowns() {
  document.querySelectorAll('.equip-dropdown').forEach(d => {
    d.classList.remove('visible');
  });
}

/**
 * Заполняет выпадающий список предметами доступного слота.
 * Показывает: текущий экипированный + предметы с count > 0 в инвентаре.
 *
 * @param {string} slot - 'hat' | 'staff' | 'cloak'
 * @param {HTMLElement} dropdown
 * @param {HTMLElement} zone - зона на маге для позиционирования
 */
function populateDropdown(slot, dropdown, zone) {
  const state = getState();
  dropdown.innerHTML = '';

  // Заголовок
  const title = document.createElement('div');
  title.className = 'dropdown-title';
  title.textContent = `Choose: ${SLOT_NAMES[slot]}`;
  dropdown.appendChild(title);

  // Собираем список: текущий экипированный + предметы слота в инвентаре
  const equippedId = state.equipment[slot];

  // Группа всех предметов этого слота (стартовые + те что есть в инвентаре)
  const slotItems = Object.values(ITEMS_DATA).filter(item => {
    if (item.slot !== slot) return false;
    if (item.id === equippedId) return true; // всегда показываем экипированный
    // Показываем только если есть в инвентаре
    return (state.inventory[item.id] || 0) > 0;
  });

  if (slotItems.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dropdown-item';
    empty.style.color = 'var(--color-text-muted)';
    empty.textContent = 'No items available';
    dropdown.appendChild(empty);
  } else {
    slotItems.forEach(item => {
      const isEquipped = equippedId === item.id;
      const count = state.inventory[item.id] || 0;

      const itemEl = document.createElement('div');
      itemEl.className = `dropdown-item${isEquipped ? ' is-equipped' : ''}`;

      // Название с бонусом
      const nameSpan = document.createElement('span');
      nameSpan.style.color = RARITY_COLORS[item.rarity];
      nameSpan.textContent = item.name;
      if (!isEquipped && count > 0) {
        nameSpan.textContent += ` [x${count}]`;
      }

      itemEl.appendChild(nameSpan);

      // Бонус силы
      if (item.bonus > 0) {
        const bonusSpan = document.createElement('span');
        bonusSpan.className = 'dropdown-item-bonus';
        bonusSpan.textContent = `+${item.bonus}`;
        itemEl.appendChild(bonusSpan);
      }

      // Клик на предмет — экипируем и закрываем
      if (!isEquipped) {
        itemEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const success = equipItem(item.id);
          if (success) {
            showNotification(`Equipped: ${item.name}`, 'success');
            closeAllDropdowns();
            // Перерисовываем панель статов и список снаряжения
            renderStatsPanel();
            renderEquipmentList();
            updateHUD();
          }
        });
      } else {
        // Уже надето — не кликабельно
        itemEl.style.cursor = 'default';
        itemEl.title = 'Already equipped';
      }

      dropdown.appendChild(itemEl);
    });
  }

  // Позиционируем дропдаун рядом с зоной (справа от неё или у правой панели)
  positionDropdown(dropdown, zone);
}

/**
 * Позиционирует выпадающий список относительно зоны клика.
 * Старается показать список правее зоны, ближе к правой панели статов.
 *
 * @param {HTMLElement} dropdown
 * @param {HTMLElement} zone
 */
function positionDropdown(dropdown, zone) {
  const zoneRect   = zone.getBoundingClientRect();
  const screenW    = window.innerWidth;
  const screenH    = window.innerHeight;

  // Дропдаун — абсолютный внутри #screen-home,
  // поэтому координаты берём относительно #screen-home
  const homeEl     = document.getElementById('screen-home');
  const homeRect   = homeEl ? homeEl.getBoundingClientRect() : { left: 0, top: 0 };

  // Целевая позиция: правее зоны, вертикально по центру
  let left = zoneRect.right - homeRect.left + 12;
  let top  = zoneRect.top  - homeRect.top  + (zoneRect.height / 2) - 60;

  // Проверяем выход за правый край (правая панель занимает 30%)
  const panelLeft = screenW * 0.7;
  if (left + 240 > panelLeft - 8) {
    // Смещаем левее зоны
    left = zoneRect.left - homeRect.left - 252;
  }

  // Не выходим за нижний край
  if (top + 200 > screenH - homeRect.top) {
    top = screenH - homeRect.top - 208;
  }
  // Не выходим за верхний
  if (top < 8) top = 8;

  dropdown.style.left = `${Math.max(8, left)}px`;
  dropdown.style.top  = `${top}px`;
}

/**
 * Устаревшая функция — оставлена для совместимости с возможными внешними вызовами.
 * Используй renderHomeScreen() вместо неё.
 */
export function renderInventory() {
  // Перенаправляем на новый рендер домашнего экрана
  renderHomeScreen();
}
