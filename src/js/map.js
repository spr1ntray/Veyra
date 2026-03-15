/**
 * map.js — карта мира
 * Рендеринг изометрической карты с локациями
 */

import { getFightsRemaining } from './combat.js';

// Данные всех локаций
const LOCATIONS = [
  {
    id: 'training_ground',
    name: 'Тренировочная\nплощадка',
    nameShort: 'Тренировочная площадка',
    icon: '⚔️',
    unlocked: true,
    action: 'combat',
    description: 'Место для оттачивания боевых навыков. Здесь ты сможешь испытать свои заклинания.',
    col: 1, row: 2
  },
  {
    id: 'town_square',
    name: 'Городская\nплощадь',
    nameShort: 'Городская площадь',
    icon: '🏛️',
    unlocked: true,
    action: 'town',
    description: 'Центр города. Здесь можно управлять снаряжением и ежедневными наградами.',
    col: 2, row: 1
  },
  {
    id: 'twilight_market',
    name: 'Сумеречный\nрынок',
    nameShort: 'Сумеречный рынок',
    icon: '🏪',
    unlocked: false,
    description: 'Таинственный базар где торгуют редкими артефактами.',
    col: 3, row: 2
  },
  {
    id: 'drowned_castle',
    name: 'Замок\nУтопленников',
    nameShort: 'Замок Утопленников',
    icon: '🏰',
    unlocked: false,
    description: 'Мрачные развалины, затопленные тёмными водами.',
    col: 1, row: 0
  },
  {
    id: 'rotten_thicket',
    name: 'Гнилая\nчаща',
    nameShort: 'Гнилая чаща',
    icon: '🌿',
    unlocked: false,
    description: 'Тёмный лес с ядовитыми растениями и древними секретами.',
    col: 0, row: 1
  },
  {
    id: 'hermit_tower',
    name: 'Башня\nотшельника',
    nameShort: 'Башня отшельника',
    icon: '🗼',
    unlocked: false,
    description: 'Высокая башня мага-отшельника, хранителя древних знаний.',
    col: 3, row: 0
  },
  {
    id: 'moon_village',
    name: 'Лунная\nдеревня',
    nameShort: 'Лунная деревня',
    icon: '🌙',
    unlocked: false,
    description: 'Маленькая деревня под вечным лунным светом.',
    col: 0, row: 3
  },
  {
    id: 'star_valley',
    name: 'Звёздная\nдолина',
    nameShort: 'Звёздная долина',
    icon: '⭐',
    unlocked: false,
    description: 'Долина где звёзды опускаются ближе к земле.',
    col: 2, row: 3
  },
  {
    id: 'black_knight_peak',
    name: 'Пик Чёрного\nрыцаря',
    nameShort: 'Пик Чёрного рыцаря',
    icon: '🗡️',
    unlocked: false,
    description: 'Вершина горы где обитает легендарный Чёрный рыцарь.',
    col: 4, row: 1
  }
];

// Колбек для открытия боевого экрана
let onEnterCombat = null;
let onEnterTown = null;

/**
 * Инициализирует карту
 */
export function initMap(callbacks) {
  onEnterCombat = callbacks.onEnterCombat;
  onEnterTown = callbacks.onEnterTown;
  renderMap();
}

/**
 * Рендерит карту мира
 */
export function renderMap() {
  const container = document.getElementById('map-grid');
  if (!container) return;

  container.innerHTML = '';

  LOCATIONS.forEach(loc => {
    const locEl = createLocationElement(loc);
    container.appendChild(locEl);
  });
}

/**
 * Создаёт DOM-элемент локации
 */
function createLocationElement(loc) {
  const el = document.createElement('div');
  el.className = `map-location ${loc.unlocked ? 'location-unlocked' : 'location-locked'}`;
  el.dataset.locationId = loc.id;

  // Позиционируем в сетке
  el.style.gridColumn = loc.col + 1;
  el.style.gridRow = loc.row + 1;

  if (loc.unlocked) {
    // Открытая локация
    let badge = '';
    if (loc.id === 'training_ground') {
      const remaining = getFightsRemaining();
      badge = `<div class="location-badge ${remaining <= 0 ? 'badge-empty' : 'badge-active'}">${remaining > 0 ? remaining + ' боёв' : 'Лимит'}</div>`;
    }
    if (loc.id === 'town_square') {
      badge = '<div class="location-badge badge-info">Хаб</div>';
    }

    el.innerHTML = `
      <div class="location-icon">${loc.icon}</div>
      <div class="location-name">${loc.nameShort}</div>
      ${badge}
      <div class="location-tooltip">${loc.description}</div>
    `;

    el.addEventListener('click', () => handleLocationClick(loc));
  } else {
    // Закрытая локация — туман
    el.innerHTML = `
      <div class="location-fog"></div>
      <div class="location-icon locked">${loc.icon}</div>
      <div class="location-name locked">${loc.nameShort}</div>
      <div class="location-locked-label">🔒 Скоро...</div>
      <div class="location-tooltip">${loc.description}</div>
    `;
  }

  return el;
}

/**
 * Обрабатывает клик по локации
 */
function handleLocationClick(loc) {
  if (!loc.unlocked) return;

  switch (loc.action) {
    case 'combat':
      if (onEnterCombat) onEnterCombat();
      break;
    case 'town':
      showLocationPopup(loc);
      break;
  }
}

/**
 * Показывает popup с изображением локации
 */
function showLocationPopup(loc) {
  const popup = document.getElementById('popup-location');
  const img = document.getElementById('location-view-img');
  const name = document.getElementById('location-view-name');
  const desc = document.getElementById('location-view-desc');
  if (!popup) return;

  name.textContent = loc.nameShort;
  desc.textContent = loc.description;

  // Картинки по локациям
  const locationImages = {
    town_square: 'from_user/sqare.png'
  };
  const imgSrc = locationImages[loc.id];
  if (imgSrc) {
    img.src = imgSrc;
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }

  popup.classList.add('visible');
}

/**
 * Обновляет отображение карты (например после боя)
 */
export function refreshMapBadges() {
  renderMap();
}
