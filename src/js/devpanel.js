/**
 * devpanel.js — скрытая панель разработчика для тестирования игры
 *
 * Активация: Ctrl+Shift+D
 * Доступ защищён паролем — вводится один раз за сессию и хранится в sessionStorage.
 * Пароль намеренно не хранится в исходнике в явном виде — используется простая проверка.
 */

import { getState, saveState, ITEMS_DATA } from './state.js';

// Ключ sessionStorage для хранения факта аутентификации
const SESSION_KEY = 'vdev_auth';

// Пароль сравнивается через простую функцию — не хранится голым строком на виду
function _checkPassword(input) {
  return input === ['veyra', 'dev', '2026'].join('_');
}

// Ссылки на DOM-элементы панели (создаются один раз)
let _panel = null;
let _visible = false;

/**
 * Инициализирует dev-панель — вызывается один раз при загрузке модуля.
 * Сам DOM создаётся здесь, но панель остаётся скрытой до ввода пароля.
 */
export function initDevPanel() {
  _buildPanel();
  document.addEventListener('keydown', _onKeyDown);
}

/**
 * Обработчик глобального keydown — проверяет комбинацию Ctrl+Shift+D.
 */
function _onKeyDown(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    _toggle();
  }
}

/**
 * Переключает видимость панели.
 * При первом открытии за сессию запрашивает пароль.
 */
function _toggle() {
  if (_visible) {
    _hide();
    return;
  }

  // Проверяем аутентификацию за текущую сессию
  if (!sessionStorage.getItem(SESSION_KEY)) {
    const input = window.prompt('Dev panel password:');
    if (!_checkPassword(input)) {
      // Неверный пароль — тихо игнорируем, не даём никаких подсказок
      return;
    }
    sessionStorage.setItem(SESSION_KEY, '1');
  }

  _show();
}

function _show() {
  if (!_panel) return;
  _panel.style.display = 'block';
  _visible = true;
  _refreshState();
}

function _hide() {
  if (!_panel) return;
  _panel.style.display = 'none';
  _visible = false;
}

/**
 * Создаёт DOM-структуру панели и добавляет в body.
 * Панель не видна до явного вызова _show().
 */
function _buildPanel() {
  const panel = document.createElement('div');
  panel.id = 'dev-panel';
  panel.style.cssText = `
    display: none;
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 99999;
    width: 280px;
    background: rgba(10, 10, 20, 0.92);
    border: 1px solid rgba(120, 120, 200, 0.4);
    border-radius: 6px;
    padding: 12px;
    font-family: monospace;
    font-size: 12px;
    color: #c8c8e8;
    box-shadow: 0 4px 24px rgba(0,0,0,0.7);
    user-select: none;
  `;

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid rgba(120,120,200,0.3);padding-bottom:6px">
      <span style="color:#9090cc;font-weight:bold;letter-spacing:1px">DEV PANEL</span>
      <button id="devpanel-close" style="${_btnStyle('#333','#aaa')}">✕</button>
    </div>

    <!-- Статус -->
    <div id="devpanel-status" style="margin-bottom:10px;color:#888;font-size:11px"></div>

    <!-- Смена класса -->
    <div class="devpanel-section">
      <div class="devpanel-label">Class</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="devpanel-class-btn" data-class="pyromancer" style="${_btnStyle('#5a1a0a','#e87a5a')}">Pyro</button>
        <button class="devpanel-class-btn" data-class="stormcaller" style="${_btnStyle('#0a1a4a','#5a9ae8')}">Storm</button>
        <button class="devpanel-class-btn" data-class="tidecaster" style="${_btnStyle('#0a3a2a','#3ac8a0')}">Tide</button>
        <button class="devpanel-class-btn" data-class="geomancer" style="${_btnStyle('#3a2a0a','#c88a3a')}">Geo</button>
      </div>
    </div>

    <!-- Уровень -->
    <div class="devpanel-section">
      <div class="devpanel-label">Level (1–50)</div>
      <div style="display:flex;gap:6px;align-items:center">
        <input id="devpanel-level-input" type="number" min="1" max="50" value="1"
          style="width:60px;background:#1a1a2e;border:1px solid #444;color:#c8c8e8;padding:3px 6px;border-radius:4px;font-family:monospace;font-size:12px">
        <button id="devpanel-level-set" style="${_btnStyle('#1a2a1a','#7acc7a')}">Set</button>
      </div>
    </div>

    <!-- Золото -->
    <div class="devpanel-section">
      <div class="devpanel-label">Gold</div>
      <div style="display:flex;gap:6px;align-items:center">
        <input id="devpanel-gold-input" type="number" min="0" value="0"
          style="width:80px;background:#1a1a2e;border:1px solid #444;color:#c8c8e8;padding:3px 6px;border-radius:4px;font-family:monospace;font-size:12px">
        <button id="devpanel-gold-set" style="${_btnStyle('#1a2a1a','#7acc7a')}">Set Gold</button>
      </div>
    </div>

    <!-- Ley Threads -->
    <div class="devpanel-section">
      <div class="devpanel-label">Ley Threads</div>
      <button id="devpanel-threads-add" style="${_btnStyle('#1a1a3a','#9090e8')}">+10 Threads</button>
    </div>

    <!-- Башня -->
    <div class="devpanel-section">
      <div class="devpanel-label">Tower</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button id="devpanel-tower-reset" style="${_btnStyle('#2a1a0a','#cc8844')}">Reset Tower</button>
        <button id="devpanel-tower-attempts" style="${_btnStyle('#2a1a0a','#cc8844')}">Max Attempts</button>
      </div>
    </div>

    <!-- Инвентарь -->
    <div class="devpanel-section">
      <div class="devpanel-label">Inventory</div>
      <button id="devpanel-give-items" style="${_btnStyle('#1a2a2a','#44aaaa')}">Give All Items</button>
    </div>

    <!-- Сейв -->
    <div class="devpanel-section" style="border-top:1px solid rgba(120,120,200,0.2);margin-top:8px;padding-top:8px">
      <div class="devpanel-label">Save</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button id="devpanel-save" style="${_btnStyle('#0a2a0a','#44cc44')}">Save State</button>
        <button id="devpanel-clear" style="${_btnStyle('#2a0a0a','#cc4444')}">Clear Save</button>
      </div>
    </div>
  `;

  // Инжектируем минимальный общий стиль секций
  const style = document.createElement('style');
  style.textContent = `
    #dev-panel .devpanel-section { margin-bottom: 9px; }
    #dev-panel .devpanel-label   { color: #6868aa; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
  `;
  document.head.appendChild(style);

  document.body.appendChild(panel);
  _panel = panel;

  _bindPanelEvents();
}

/**
 * Возвращает CSS-строку для кнопки с нужными цветами.
 */
function _btnStyle(bg, color) {
  return `background:${bg};color:${color};border:1px solid ${color}44;border-radius:4px;padding:3px 9px;font-family:monospace;font-size:11px;cursor:pointer;`;
}

/**
 * Привязывает события ко всем элементам управления панели.
 */
function _bindPanelEvents() {
  // Кнопка закрытия
  _panel.querySelector('#devpanel-close').addEventListener('click', _hide);

  // Смена класса
  _panel.querySelectorAll('.devpanel-class-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const state = getState();
      state.classType = btn.dataset.class;
      saveState();
      _notify(`Class set: ${state.classType}`);
      _refreshState();
      // Обновляем HUD если функция доступна глобально
      _tryCallGlobal('updateHUD');
    });
  });

  // Уровень
  _panel.querySelector('#devpanel-level-set').addEventListener('click', () => {
    const input = _panel.querySelector('#devpanel-level-input');
    const lvl = Math.max(1, Math.min(50, parseInt(input.value, 10) || 1));
    const state = getState();
    state.level = lvl;
    // XP сбрасываем до 0 (начало уровня)
    state.xp = 0;
    // Выдаём соответствующее количество attribute points
    state.attributePoints = Math.max(0, lvl - 1);
    saveState();
    _notify(`Level set: ${lvl}`);
    _refreshState();
    _tryCallGlobal('updateHUD');
  });

  // Золото
  _panel.querySelector('#devpanel-gold-set').addEventListener('click', () => {
    const input = _panel.querySelector('#devpanel-gold-input');
    const gold = Math.max(0, parseInt(input.value, 10) || 0);
    const state = getState();
    state.gold = gold;
    saveState();
    _notify(`Gold set: ${gold}`);
    _refreshState();
    _tryCallGlobal('updateHUD');
  });

  // Ley Threads
  _panel.querySelector('#devpanel-threads-add').addEventListener('click', () => {
    const state = getState();
    if (!state.passives) {
      state.passives = { leyThreads: 0, leyThreadsTotal: 0, unlocked: [], respecCount: 0 };
    }
    state.passives.leyThreads += 10;
    state.passives.leyThreadsTotal += 10;
    saveState();
    _notify(`+10 Ley Threads (now ${state.passives.leyThreads})`);
    _refreshState();
  });

  // Башня — полный сброс
  _panel.querySelector('#devpanel-tower-reset').addEventListener('click', () => {
    const state = getState();
    state.tower.attemptsToday = 0;
    state.tower.bestFloorToday = 0;
    state.tower.currentRun = null;
    saveState();
    _notify('Tower reset');
    _refreshState();
  });

  // Башня — сбросить использованные попытки
  _panel.querySelector('#devpanel-tower-attempts').addEventListener('click', () => {
    const state = getState();
    state.tower.attemptsToday = 0;
    saveState();
    _notify('Tower attempts restored');
    _refreshState();
  });

  // Инвентарь — выдать все предметы
  _panel.querySelector('#devpanel-give-items').addEventListener('click', () => {
    const state = getState();
    for (const itemId of Object.keys(ITEMS_DATA)) {
      if (state.inventory[itemId] !== undefined) {
        state.inventory[itemId] += 3;
      } else {
        state.inventory[itemId] = 3;
      }
    }
    saveState();
    _notify('All items +3');
    _refreshState();
  });

  // Сохранить
  _panel.querySelector('#devpanel-save').addEventListener('click', () => {
    saveState();
    _notify('State saved');
  });

  // Очистить сейв
  _panel.querySelector('#devpanel-clear').addEventListener('click', () => {
    if (!window.confirm('Clear all save data and reload?')) return;
    localStorage.clear();
    window.location.reload();
  });
}

/**
 * Обновляет строку статуса с текущими значениями state.
 */
function _refreshState() {
  const statusEl = _panel && _panel.querySelector('#devpanel-status');
  if (!statusEl) return;

  const state = getState();
  const threads = state.passives ? state.passives.leyThreads : 0;
  const towerAttempts = state.tower ? state.tower.attemptsToday : 0;

  statusEl.textContent =
    `Lv.${state.level} | ${state.classType || 'no class'} | ${state.gold}g | ` +
    `${threads} threads | Tower: ${towerAttempts}/3`;

  // Синхронизируем input-поля с текущим state
  const lvlInput = _panel.querySelector('#devpanel-level-input');
  if (lvlInput) lvlInput.value = state.level;

  const goldInput = _panel.querySelector('#devpanel-gold-input');
  if (goldInput) goldInput.value = state.gold;
}

/**
 * Показывает уведомление внутри самой панели (временная строка).
 */
function _notify(msg) {
  const statusEl = _panel && _panel.querySelector('#devpanel-status');
  if (!statusEl) return;

  statusEl.style.color = '#88e888';
  statusEl.textContent = `OK: ${msg}`;

  // Через 2 секунды возвращаем обычный статус
  setTimeout(_refreshState, 2000);
}

/**
 * Безопасно пытается вызвать глобальную функцию игры (например updateHUD).
 * Используем window потому что main.js экспортирует в ES-модуле, но некоторые
 * обновления удобнее делать через глобальный диспатч события.
 */
function _tryCallGlobal(fnName) {
  // Вместо прямого вызова функции — диспатчим кастомное событие,
  // на которое может подписаться main.js при желании.
  window.dispatchEvent(new CustomEvent('devpanel:action', { detail: { action: fnName } }));
}
