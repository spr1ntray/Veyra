/**
 * inventory.js — экран инвентаря
 * Левая часть: вешалка с экипировкой (40%)
 * Правая часть: сетка предметов 5×7 (60%)
 */

import { getState, ITEMS_DATA, equipItem, getStats, useConsumable, getActiveBuffs, discardItem, xpForLevel } from './state.js';
import { updateHUD, showNotification } from './ui.js';

// Emoji для слотов
const SLOT_EMOJI = { staff: '🪄', hat: '🎩', cloak: '🧣', consumable: '🧪' };

// Цвета редкостей
const RARITY_COLORS = {
  starter:   '#666',
  common:    '#aaa',
  uncommon:  '#2ecc71',
  rare:      '#4a90d9',
  epic:      '#9b59b6',
  legendary: '#f39c12'
};

// Текущий выбранный предмет (для tooltip)
let _selectedItemId = null;

// Текущая страница сетки (0-based)
let _currentPage = 0;

// Текущий активный фильтр слота ('hat' | 'cloak' | 'staff' | null)
let _activeFilter = null;

// AbortController for grid container event listeners (prevents leaks on re-render)
let _gridAbortController = null;

// Динамический PAGE_SIZE (вычисляется из доступной высоты)
const GRID_COLS = 5;
let _dynamicRows = 4; // fallback
let _resizeObserver = null;

/**
 * Вычисляет сколько строк помещается в .inv-right контейнер.
 * Учитывает заголовок "Items", пагинацию и padding.
 */
function calcDynamicRows() {
  const rightPanel = document.querySelector('.inv-right');
  if (!rightPanel) return 4;

  const grid = document.getElementById('inv-grid');
  if (!grid) return 4;

  // Получаем доступную высоту всего правого контейнера
  const panelHeight = rightPanel.clientHeight;

  // Вычитаем высоту элементов кроме сетки:
  // - заголовок секции "Items" (~30px)
  // - пагинация (~40px)
  // - padding сверху и снизу из CSS (21px + 21px)
  const sectionLabel = rightPanel.querySelector('.inv-section-label');
  const pagination = document.getElementById('inv-pagination');

  const labelH = sectionLabel ? sectionLabel.offsetHeight + parseFloat(getComputedStyle(sectionLabel).marginBottom || 0) : 30;
  const paginationH = 44; // фиксированная резервация для пагинации
  const paddingTop = parseFloat(getComputedStyle(rightPanel).paddingTop) || 21;
  const paddingBottom = parseFloat(getComputedStyle(rightPanel).paddingBottom) || 21;

  const availableHeight = panelHeight - labelH - paginationH - paddingTop - paddingBottom;

  // Размер ячейки: ширина сетки / 5 (квадрат через aspect-ratio: 1)
  const gridWidth = grid.clientWidth || rightPanel.clientWidth - parseFloat(getComputedStyle(rightPanel).paddingLeft || 0) - parseFloat(getComputedStyle(rightPanel).paddingRight || 0);
  const gap = 10; // gap из CSS (единый для row и column)
  const cellSize = (gridWidth - (GRID_COLS - 1) * gap) / GRID_COLS;

  if (cellSize <= 0) return 4;

  const rows = Math.floor((availableHeight + gap) / (cellSize + gap));
  // Safety cap: max 10 rows to prevent PAGE_SIZE from growing too large
  return Math.min(Math.max(1, rows), 10);
}

/**
 * Инициализирует ResizeObserver для пересчёта сетки при изменении размера окна.
 */
function initResizeObserver() {
  if (_resizeObserver) return; // уже инициализирован

  const rightPanel = document.querySelector('.inv-right');
  if (!rightPanel) return;

  const onResize = () => {
    const newRows = calcDynamicRows();
    if (newRows !== _dynamicRows) {
      _dynamicRows = newRows;
      _currentPage = 0; // сброс страницы при смене размера
      renderGrid();
    }
  };

  if (typeof ResizeObserver !== 'undefined') {
    _resizeObserver = new ResizeObserver(onResize);
    _resizeObserver.observe(rightPanel);
  } else {
    // Fallback for browsers without ResizeObserver
    _resizeObserver = 'fallback'; // prevent re-init
    window.addEventListener('resize', onResize);
  }
}

/**
 * Рендерит весь экран инвентаря.
 * Вызывается при каждом переходе на screen-home.
 */
export function renderHomeScreen() {
  renderHanger();
  renderCharBlock();
  initHangerFilter();

  // Первичный расчёт строк, затем рендер сетки
  _dynamicRows = calcDynamicRows();
  renderGrid();

  initResizeObserver();
  hideTooltip();
}

/**
 * Инициализирует клики по кружкам вешалки для фильтрации сетки.
 * CSS handles hover/active label visibility — JS only toggles is-active-filter class.
 */
function initHangerFilter() {
  ['hat', 'cloak', 'staff'].forEach(slot => {
    const el = document.getElementById(`hanger-slot-${slot}`);
    if (!el) return;

    // Клонируем элемент чтобы убрать старые listeners перед каждым байндом
    const newEl = el.cloneNode(true);
    el.parentNode.replaceChild(newEl, el);

    newEl.addEventListener('click', () => {
      _activeFilter = (_activeFilter === slot) ? null : slot;
      _currentPage = 0; // Reset page when filter changes

      // Toggle is-active-filter class on all circles
      ['hat', 'cloak', 'staff'].forEach(s => {
        const circleEl = document.getElementById(`hanger-slot-${s}`);
        if (circleEl) circleEl.classList.toggle('is-active-filter', s === _activeFilter);
      });

      renderGrid();
    });
  });
}

/**
 * Обновляет вешалку — показывает текущую экипировку.
 */
function renderHanger() {
  const state = getState();

  for (const slot of ['hat', 'cloak', 'staff']) {
    const itemId = state.equipment[slot];
    const item   = ITEMS_DATA[itemId];

    const emojiEl = document.getElementById(`hanger-${slot}-emoji`);
    if (emojiEl) emojiEl.textContent = SLOT_EMOJI[slot];
  }
}

/**
 * Обновляет блок персонажа (имя, уровень, статы, золото).
 */
function renderCharBlock() {
  const state = getState();
  const stats = getStats();

  const nameEl  = document.getElementById('inv-char-name');
  const levelEl = document.getElementById('inv-char-level');
  const goldEl  = document.getElementById('inv-gold');

  if (nameEl)  nameEl.textContent  = state.name;
  if (levelEl) levelEl.textContent = `Level ${state.level}`;
  if (goldEl)  goldEl.textContent  = `🪙 ${state.gold}`;

  // XP progress bar
  const xpNeeded = xpForLevel(state.level);
  const xpPercent = xpNeeded > 0 ? Math.min(100, Math.round((state.xp / xpNeeded) * 100)) : 0;
  const xpBar = document.getElementById('inv-xp-bar');
  const xpText = document.getElementById('inv-xp-text');
  if (xpBar) xpBar.style.width = `${xpPercent}%`;
  if (xpText) xpText.textContent = `${state.xp} / ${xpNeeded} XP`;

  const strBar = document.getElementById('inv-str-bar');
  const strVal = document.getElementById('inv-str-val');
  if (strBar) strBar.style.width = `${Math.min(100, Math.round((stats.strength / stats.maxStrength) * 100))}%`;
  if (strVal) strVal.textContent = stats.strength;

  const intBar = document.getElementById('inv-int-bar');
  const intVal = document.getElementById('inv-int-val');
  if (intBar) intBar.style.width = `${Math.min(100, Math.round((stats.intelligence / stats.maxIntelligence) * 100))}%`;
  if (intVal) intVal.textContent = stats.intelligence;

  // Render active buffs
  renderInvBuffs();
}

/**
 * Рендерит сетку предметов с пагинацией.
 * Страница 4×4 = 16 ячеек. Переключение через кнопки под сеткой.
 */
function renderGrid() {
  const container = document.getElementById('inv-grid');
  if (!container) return;
  container.innerHTML = '';

  // Обновляем метку активного фильтра над сеткой
  const filterLabelEl = document.getElementById('inv-filter-label');
  if (filterLabelEl) {
    filterLabelEl.textContent = _activeFilter ? `· ${_activeFilter}` : '';
  }

  const state = getState();

  // Собираем предметы, которые есть у игрока (count > 0)
  const ownedItems = Object.entries(state.inventory)
    .filter(([id, count]) => count > 0 && ITEMS_DATA[id])
    .map(([id, count]) => ({ id, count, item: ITEMS_DATA[id] }));

  // Применяем фильтр по слоту если выбран
  const filteredItems = _activeFilter
    ? ownedItems.filter(({ item }) => item.slot === _activeFilter)
    : ownedItems;

  // Фиксированный размер страницы: 5 колонок × 6 строк = 30 ячеек
  const PAGE_SIZE = 30;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  // Сбрасываем страницу если вышла за пределы (например при смене фильтра)
  if (_currentPage >= totalPages) _currentPage = 0;

  // Срез предметов текущей страницы — только реальные предметы, без пустых ячеек
  const pageItems = filteredItems.slice(_currentPage * PAGE_SIZE, _currentPage * PAGE_SIZE + PAGE_SIZE);

  for (const entry of pageItems) {
    container.appendChild(createCell(entry, state));
  }

  // Abort previous container listeners to prevent leaks on re-render
  if (_gridAbortController) _gridAbortController.abort();
  _gridAbortController = new AbortController();

  // Обработчик клика вне ячеек — скрываем tooltip
  container.addEventListener('click', (e) => {
    if (!e.target.closest('.inv-cell.has-item')) {
      hideTooltip();
    }
  }, { signal: _gridAbortController.signal });

  // Рендерим кнопки пагинации
  renderPagination(totalPages);
}

/**
 * Рендерит кнопки пагинации под сеткой.
 * Скрывает блок если страница одна.
 */
function renderPagination(totalPages) {
  const paginationEl = document.getElementById('inv-pagination');
  if (!paginationEl) return;
  paginationEl.innerHTML = '';

  // Скрываем пагинацию если страница единственная
  if (totalPages <= 1) {
    paginationEl.style.display = 'none';
    return;
  }
  paginationEl.style.display = 'flex';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'inv-page-btn';
  prevBtn.textContent = '← Prev';
  prevBtn.disabled = _currentPage === 0;
  prevBtn.addEventListener('click', () => {
    if (_currentPage > 0) {
      _currentPage--;
      renderGrid();
    }
  });

  const counter = document.createElement('span');
  counter.className = 'inv-page-counter';
  counter.textContent = `${_currentPage + 1} / ${totalPages}`;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'inv-page-btn';
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = _currentPage >= totalPages - 1;
  nextBtn.addEventListener('click', () => {
    if (_currentPage < totalPages - 1) {
      _currentPage++;
      renderGrid();
    }
  });

  paginationEl.appendChild(prevBtn);
  paginationEl.appendChild(counter);
  paginationEl.appendChild(nextBtn);
}

/**
 * Создаёт одну ячейку сетки.
 */
function createCell(entry, state) {
  const cell = document.createElement('div');
  cell.className = 'inv-cell';

  if (!entry) {
    // Пустая ячейка — визуально обозначена пунктирной рамкой
    const inner = document.createElement('div');
    inner.className = 'cell-empty-inner';
    cell.appendChild(inner);
    return cell;
  }

  const { id, count, item } = entry;
  const isEquipped = Object.values(state.equipment).includes(id);

  cell.classList.add('has-item');
  if (isEquipped) cell.classList.add('is-equipped');

  // Подсветка фона ячейки по редкости предмета
  const rarityBg = {
    starter:   'rgba(100,100,100,0.15)',
    common:    'rgba(150,150,150,0.12)',
    uncommon:  'rgba(46,204,113,0.12)',
    rare:      'rgba(74,144,217,0.15)',
    epic:      'rgba(155,89,182,0.18)',
    legendary: 'rgba(243,156,18,0.20)'
  };
  cell.style.backgroundColor = rarityBg[item.rarity] || rarityBg.common;

  // Иконка предмета: PNG если есть поле img, иначе emoji-заглушка
  const emojiEl = document.createElement('div');
  emojiEl.className = 'cell-emoji';
  if (item.img) {
    const img = document.createElement('img');
    img.src = item.img;
    img.style.cssText = 'width:80%;height:80%;image-rendering:pixelated;object-fit:contain;display:block;margin:auto';
    emojiEl.appendChild(img);
  } else {
    emojiEl.textContent = SLOT_EMOJI[item.slot] || '📦';
  }
  cell.appendChild(emojiEl);

  // Количество (если > 1)
  if (count > 1) {
    const countEl = document.createElement('div');
    countEl.className = 'cell-count';
    countEl.textContent = `×${count}`;
    cell.appendChild(countEl);
  }

  // Полоска редкости снизу
  const rarityBar = document.createElement('div');
  rarityBar.className = `cell-rarity-bar rarity-${item.rarity}`;
  cell.appendChild(rarityBar);

  // Клик — показываем tooltip
  cell.addEventListener('click', (e) => {
    e.stopPropagation();
    showTooltip(id, isEquipped, cell);
  });

  return cell;
}

/**
 * Показывает tooltip с кнопкой экипировки.
 */
function showTooltip(itemId, isEquipped, cellEl) {
  const item = ITEMS_DATA[itemId];
  if (!item) return;

  _selectedItemId = itemId;

  const tooltip      = document.getElementById('inv-tooltip');
  const nameEl       = document.getElementById('tooltip-name');
  const typeEl       = document.getElementById('tooltip-type');
  const bonusEl      = document.getElementById('tooltip-bonus');
  const equipBtn     = document.getElementById('tooltip-equip-btn');
  const useBtn       = document.getElementById('tooltip-use-btn');
  const discardBtn   = document.getElementById('tooltip-discard-btn');

  if (nameEl)  nameEl.textContent  = item.name;
  if (nameEl)  nameEl.style.color  = RARITY_COLORS[item.rarity];
  if (typeEl)  typeEl.textContent  = `${item.slot} · ${item.rarity}`;
  if (bonusEl) bonusEl.textContent = item.bonus > 0 ? `+${item.bonus} power` : item.desc;

  const isConsumable = item.slot === 'consumable';

  // Equip button — hidden for consumables
  if (equipBtn) {
    if (isConsumable) {
      equipBtn.style.display = 'none';
    } else {
      equipBtn.style.display = '';
      if (isEquipped) {
        equipBtn.textContent = 'Equipped';
        equipBtn.disabled = true;
        equipBtn.style.opacity = '0.4';
      } else {
        equipBtn.textContent = 'Equip';
        equipBtn.disabled = false;
        equipBtn.style.opacity = '1';
      }
    }
  }

  // Use button — shown only for consumables
  if (useBtn) {
    if (isConsumable) {
      useBtn.style.display = '';
      useBtn.disabled = false;
      useBtn.style.opacity = '1';
    } else {
      useBtn.style.display = 'none';
    }
  }

  // Discard button — скрыт для экипированных предметов и расходников; для кольца квеста заблокирован
  if (discardBtn) {
    if (isEquipped || isConsumable) {
      discardBtn.style.display = 'none';
    } else {
      discardBtn.style.display = '';
      const questLocked = itemId === 'skeleton_iron_ring' &&
        getState().questSeveredFinger?.status === 'active';
      discardBtn.disabled = questLocked;
      discardBtn.style.opacity = questLocked ? '0.4' : '1';
      discardBtn.title = questLocked ? 'Bound to active quest' : '';
    }
  }

  if (tooltip) tooltip.classList.add('visible');
}

function hideTooltip() {
  const tooltip = document.getElementById('inv-tooltip');
  if (tooltip) tooltip.classList.remove('visible');
  _selectedItemId = null;
}

/**
 * Инициализирует кнопку экипировки в tooltip.
 * Вызывается один раз из main.js.
 */
export function initEquipmentZones() {
  const equipBtn = document.getElementById('tooltip-equip-btn');
  if (equipBtn) {
    equipBtn.addEventListener('click', () => {
      if (!_selectedItemId) return;
      const success = equipItem(_selectedItemId);
      if (success) {
        const item = ITEMS_DATA[_selectedItemId];
        showNotification(`Equipped: ${item.name}`, 'success');
        updateHUD();
        renderHomeScreen();
      }
    });
  }

  // Use button for consumables
  const useBtn = document.getElementById('tooltip-use-btn');
  if (useBtn) {
    useBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!_selectedItemId) return;
      const result = useConsumable(_selectedItemId);
      if (result && result.success) {
        hideTooltip();
        showNotification(`✨ ${result.buffLabel} activated! ${ITEMS_DATA[_selectedItemId]?.desc || ''}`, 'success');
        updateHUD();
        renderHomeScreen();
      } else {
        showNotification('Cannot use this item', 'warning');
      }
    });
  }

  // Кнопка выброса предмета
  const discardBtn = document.getElementById('tooltip-discard-btn');
  if (discardBtn) {
    discardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!_selectedItemId) return;
      const result = discardItem(_selectedItemId);
      if (result.success) {
        const item = ITEMS_DATA[_selectedItemId];
        hideTooltip();
        showNotification(`Discarded: ${item?.name || _selectedItemId}`, 'info');
        updateHUD();
        renderHomeScreen();
      } else if (result.reason === 'quest_locked') {
        // Кольцо квеста — заблокировано
        showNotification('Bound to active quest — cannot discard.', 'warning');
      }
    });
  }

  // Закрытие tooltip по Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTooltip();
  });
}

/**
 * Renders active buff pills in inventory char block.
 */
function renderInvBuffs() {
  const container = document.getElementById('inv-buffs');
  if (!container) return;
  container.innerHTML = '';

  const buffs = getActiveBuffs();
  if (buffs.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'flex';

  for (const buff of buffs) {
    const pill = document.createElement('div');
    pill.className = 'buff-pill-inv';
    pill.style.borderColor = buff.color;
    // Convert hex to rgba for background
    pill.style.background = hexToRgba(buff.color, 0.15);
    pill.innerHTML = `<span class="buff-pill-label" style="color:${buff.color}">${buff.symbol}</span>` +
      `<span class="buff-pill-text">${buff.label}</span>` +
      `<span class="buff-pill-count">${buff.combatsLeft}</span>`;
    container.appendChild(pill);
  }
}

/**
 * Converts hex color (#rrggbb) to rgba string.
 */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Оставлен для совместимости
export function renderInventory() { renderHomeScreen(); }
