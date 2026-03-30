/**
 * grimoire.js — экран сборки гримуара
 * Позволяет расставить заклинания в 5 слотов перед боем.
 * После выбора врага игрок нажимает Begin Battle.
 */

import { getState, SPELLS_DATA, ENEMIES_DATA, getUnlockedSpells, saveGrimoire, getBonusPower } from './state.js';

// Выбранный враг
let selectedEnemyId = null;

// Текущие слоты гримуара [spellId | null, ...]
let slots = [null, null, null, null, null];

// Выбранное в пуле заклинание (для клик-режима)
let selectedPoolSpellId = null;

// Колбек — вызывается при нажатии Begin Battle
let _onBeginBattle = null;
// Колбек — назад
let _onBack = null;

/**
 * Инициализирует экран гримуара
 * @param {string} enemyId — id выбранного врага
 * @param {function} onBeginBattle — колбек с enemyId
 * @param {function} onBack — колбек назад
 */
export function initGrimoire(enemyId, onBeginBattle, onBack) {
  selectedEnemyId = enemyId;
  _onBeginBattle = onBeginBattle;
  _onBack = onBack;

  // Загружаем сохранённый гримуар
  const state = getState();
  slots = Array.isArray(state.grimoire) ? [...state.grimoire] : [null, null, null, null, null];
  // Убеждаемся что длина всегда 5
  while (slots.length < 5) slots.push(null);
  slots = slots.slice(0, 5);

  selectedPoolSpellId = null;

  renderGrimoireScreen();
}

/**
 * Рендерит весь экран гримуара
 */
function renderGrimoireScreen() {
  renderEnemyBadge();
  renderEnemyCard();
  renderSlots();
  renderSpellPool();
  updateDpsPreview();
  updateBeginButton();
}

/**
 * Рендерит бейдж врага в хедере (имя + слабость)
 */
function renderEnemyBadge() {
  const badge = document.getElementById('grimoire-enemy-badge');
  if (!badge) return;
  const enemy = ENEMIES_DATA[selectedEnemyId];
  if (!enemy) { badge.textContent = ''; return; }
  badge.innerHTML = `<span class="enemy-badge-name">${enemy.name}</span>`;
}

/**
 * Рендерит карточку врага внизу
 */
function renderEnemyCard() {
  const card = document.getElementById('grimoire-enemy-card');
  if (!card) return;
  const enemy = ENEMIES_DATA[selectedEnemyId];
  if (!enemy) { card.innerHTML = ''; return; }

  // Формируем список резистов и слабостей
  const resistList = Object.entries(enemy.resistances)
    .filter(([school, mod]) => mod < 1.0)
    .map(([school]) => `<span class="enemy-resist-tag">${school}</span>`)
    .join('');

  const weakList = Object.entries(enemy.resistances)
    .filter(([school, mod]) => mod > 1.0)
    .map(([school]) => `<span class="enemy-weak-tag">${school}</span>`)
    .join('');

  card.innerHTML = `
    <div class="enemy-card-inner">
      <div class="enemy-card-name">${enemy.name}</div>
      <div class="enemy-card-stats">
        <span class="enemy-card-stat">HP: ${enemy.hp}</span>
        ${enemy.attack > 0 ? `<span class="enemy-card-stat">Atk: ${enemy.attack} / ${enemy.attackInterval}s</span>` : '<span class="enemy-card-stat">Passive</span>'}
        ${weakList ? `<span class="enemy-card-label">Weak:</span> ${weakList}` : ''}
        ${resistList ? `<span class="enemy-card-label">Resist:</span> ${resistList}` : ''}
      </div>
    </div>
  `;
}

/**
 * Рендерит 5 слотов гримуара
 */
function renderSlots() {
  const container = document.getElementById('grimoire-slots');
  if (!container) return;
  container.innerHTML = '';

  const labels = ['I', 'II', 'III', 'IV', 'V'];

  slots.forEach((spellId, index) => {
    const spell = spellId ? SPELLS_DATA[spellId] : null;
    const slot = document.createElement('div');
    slot.className = 'grimoire-slot' + (spell ? ' grimoire-slot-filled' : ' grimoire-slot-empty');
    slot.dataset.index = index;

    if (spell) {
      slot.style.setProperty('--spell-color', spell.color);
      slot.innerHTML = `
        <div class="grimoire-slot-num">${labels[index]}</div>
        <div class="grimoire-slot-icon" style="border-color:${spell.color};box-shadow:0 0 10px ${spell.glowColor}">
          <span style="color:${spell.color};font-size:1.4em">${getSpellEmoji(spell.school)}</span>
        </div>
        <div class="grimoire-slot-spell-name" style="color:${spell.color}">${spell.name}</div>
        <div class="grimoire-slot-time">${spell.castTime}s</div>
      `;
    } else {
      slot.innerHTML = `
        <div class="grimoire-slot-num">${labels[index]}</div>
        <div class="grimoire-slot-icon grimoire-slot-icon-empty">+</div>
        <div class="grimoire-slot-empty-label">empty</div>
      `;
    }

    // Drag & drop — источник если заполнен
    if (spell) {
      slot.draggable = true;
      slot.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('source', 'slot');
        e.dataTransfer.setData('slotIndex', index);
        e.dataTransfer.setData('spellId', spellId);
        slot.classList.add('dragging');
      });
      slot.addEventListener('dragend', () => slot.classList.remove('dragging'));
    }

    // Drop target (принимает из пула и из другого слота)
    slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drag-over'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      const source = e.dataTransfer.getData('source');
      if (source === 'pool') {
        const draggedSpellId = e.dataTransfer.getData('spellId');
        slots[index] = draggedSpellId;
      } else if (source === 'slot') {
        const fromIndex = parseInt(e.dataTransfer.getData('slotIndex'));
        const fromSpellId = e.dataTransfer.getData('spellId');
        // Swap
        const tmp = slots[index];
        slots[index] = fromSpellId;
        slots[fromIndex] = tmp;
      }
      onSlotsChanged();
    });

    // Клик: если слот заполнен — убираем заклинание; если пуст и есть выбранное — ставим
    slot.addEventListener('click', () => {
      if (spell) {
        // Убираем заклинание обратно в пул
        slots[index] = null;
        onSlotsChanged();
      } else if (selectedPoolSpellId) {
        // Ставим выбранное заклинание
        slots[index] = selectedPoolSpellId;
        selectedPoolSpellId = null;
        onSlotsChanged();
      }
    });

    container.appendChild(slot);
  });
}

/**
 * Рендерит пул доступных заклинаний (правая страница), сгруппированных по школам
 */
function renderSpellPool() {
  const pool = document.getElementById('grimoire-spell-pool');
  if (!pool) return;
  pool.innerHTML = '';

  const unlocked = getUnlockedSpells();

  // Группируем по школам
  const schools = ['arcane', 'fire', 'shadow', 'frost', 'utility'];
  const schoolColors = {
    arcane: '#4a90d9',
    fire: '#e74c3c',
    shadow: '#8e44ad',
    frost: '#3498db',
    utility: '#c9a84c'
  };
  const schoolNames = {
    arcane: 'Arcane',
    fire: 'Fire',
    shadow: 'Shadow',
    frost: 'Frost',
    utility: 'Utility'
  };

  schools.forEach(school => {
    const schoolSpells = unlocked.filter(s => s.school === school);
    if (schoolSpells.length === 0) return;

    const group = document.createElement('div');
    group.className = 'spell-pool-group';

    const label = document.createElement('div');
    label.className = 'spell-pool-school-label';
    label.style.color = schoolColors[school];
    label.textContent = schoolNames[school];
    group.appendChild(label);

    const row = document.createElement('div');
    row.className = 'spell-pool-row';

    schoolSpells.forEach(spell => {
      const card = document.createElement('div');
      card.className = 'spell-pool-card';
      card.dataset.spellId = spell.id;
      if (selectedPoolSpellId === spell.id) card.classList.add('spell-pool-card-selected');

      card.style.setProperty('--spell-color', spell.color);
      card.innerHTML = `
        <div class="pool-card-icon" style="border-color:${spell.color};box-shadow:0 0 8px ${spell.glowColor}">
          <span style="color:${spell.color}">${getSpellEmoji(spell.school)}</span>
        </div>
        <div class="pool-card-name" style="color:${spell.color}">${spell.name}</div>
        <div class="pool-card-stats">
          ${spell.baseDmg.max > 0 ? `${spell.baseDmg.min}–${spell.baseDmg.max}` : 'Utility'}
          · ${spell.castTime}s
        </div>
      `;

      // Tooltip при hover
      card.title = `${spell.name}\n${spell.description}\nCast: ${spell.castTime}s`;

      // Drag из пула
      card.draggable = true;
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('source', 'pool');
        e.dataTransfer.setData('spellId', spell.id);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));

      // Одиночный клик — выбираем заклинание (потом клик по слоту)
      card.addEventListener('click', () => {
        if (selectedPoolSpellId === spell.id) {
          selectedPoolSpellId = null;
        } else {
          selectedPoolSpellId = spell.id;
        }
        renderSpellPool();
      });

      // Двойной клик — ставим в первый свободный слот
      card.addEventListener('dblclick', () => {
        const emptyIndex = slots.findIndex(s => s === null);
        if (emptyIndex !== -1) {
          slots[emptyIndex] = spell.id;
          selectedPoolSpellId = null;
          onSlotsChanged();
        }
      });

      row.appendChild(card);
    });

    group.appendChild(row);
    pool.appendChild(group);
  });
}

/**
 * Вызывается при изменении слотов — перерисовывает и обновляет DPS превью
 */
function onSlotsChanged() {
  // Сохраняем гримуар в state
  saveGrimoire(slots);
  renderSlots();
  renderSpellPool();
  updateDpsPreview();
  updateBeginButton();
}

/**
 * Обновляет превью DPS на левой странице
 */
function updateDpsPreview() {
  const dpsEl = document.getElementById('grimoire-dps');
  const killEl = document.getElementById('grimoire-killtime');
  if (!dpsEl || !killEl) return;

  const enemy = ENEMIES_DATA[selectedEnemyId];
  if (!enemy) return;

  const filledSlots = slots.filter(id => id !== null);
  if (filledSlots.length === 0) {
    dpsEl.textContent = '—';
    killEl.textContent = '—';
    return;
  }

  const state = getState();
  const bp = getBonusPower();
  const intActual = 5 + (state.level - 1) * 3 + bp;
  const intMult = 1 + (intActual - 5) / 100;

  // Считаем средний урон за цикл гримуара
  let totalAvgDmg = 0;
  let totalCastTime = 0;

  filledSlots.forEach(spellId => {
    const spell = SPELLS_DATA[spellId];
    if (!spell || spell.baseDmg.max === 0) {
      // Utility — не наносит урон, только время
      totalCastTime += spell ? spell.castTime : 0;
      return;
    }
    const avgBase = (spell.baseDmg.min + spell.baseDmg.max) / 2;
    const schoolMod = enemy.resistances[spell.school] || 1.0;
    const avgDmg = avgBase * intMult * schoolMod;
    totalAvgDmg += avgDmg;
    totalCastTime += spell.castTime;
  });

  // Добавляем паузы между кастами
  totalCastTime += filledSlots.length * 0.3;

  const dps = totalCastTime > 0 ? (totalAvgDmg / totalCastTime) : 0;
  const killTime = dps > 0 ? (enemy.hp / dps) : Infinity;

  dpsEl.textContent = dps.toFixed(1);
  killEl.textContent = isFinite(killTime) ? `${killTime.toFixed(1)}s` : '—';
}

/**
 * Обновляет состояние кнопки Begin Battle, предупреждения и лор-подсказку
 */
function updateBeginButton() {
  const btn = document.getElementById('btn-begin-battle');
  const warning = document.getElementById('grimoire-warning');
  const emptyHint = document.getElementById('grimoire-empty-hint');

  const filled = slots.filter(id => id !== null).length;
  const hasDamageSpell = slots.some(id => {
    if (!id) return false;
    const spell = SPELLS_DATA[id];
    return spell && spell.baseDmg.max > 0;
  });

  let warningText = '';

  if (filled < 3) {
    warningText = `Fill at least 3 slots (${filled}/3)`;
  } else if (!hasDamageSpell) {
    warningText = 'Warning: No damage spells in grimoire!';
  }

  if (warning) warning.textContent = warningText;
  if (btn) {
    btn.disabled = filled < 3;
    // Tooltip когда недостаточно заклинаний — лор-стиль
    if (filled < 3) {
      btn.title = 'Not enough rituals. Fill at least three pages of the grimoire.';
    } else {
      btn.title = '';
    }
  }

  // Показываем лор-подсказку при полностью пустом гримуаре
  if (emptyHint) {
    emptyHint.style.display = filled === 0 ? 'block' : 'none';
  }
}

/**
 * Эмодзи/символ по школе заклинания
 */
function getSpellEmoji(school) {
  const map = {
    arcane: '✦',
    fire:   '🔥',
    shadow: '◈',
    frost:  '❄',
    utility: '◎'
  };
  return map[school] || '•';
}

/**
 * Привязывает обработчики кнопок экрана гримуара
 * Вызывается один раз при старте игры
 */
export function bindGrimoireEvents() {
  document.getElementById('btn-grimoire-back')?.addEventListener('click', () => {
    if (_onBack) _onBack();
  });

  document.getElementById('btn-begin-battle')?.addEventListener('click', () => {
    const filled = slots.filter(id => id !== null).length;
    if (filled < 3) return;
    if (_onBeginBattle) _onBeginBattle(selectedEnemyId);
  });
}
