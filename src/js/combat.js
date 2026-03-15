/**
 * combat.js — боевая система
 * Управляет состоянием боя, анимациями, расчётом урона
 * Вызывает колбеки onBattleEnd для передачи результата в main.js
 */

import {
  getState, saveState, getBonusPower,
  addXP, addGold, addItemToInventory,
  rollItemDrop, checkDailyReset
} from './state.js';

// Данные заклинаний
export const SPELLS = {
  arcane_bolt: {
    id: 'arcane_bolt',
    name: 'Чародейский разряд',
    minDmg: 25, maxDmg: 35,
    color: '#4a90d9',
    glowColor: 'rgba(74, 144, 217, 0.6)',
    emoji: '⚡',
    animClass: 'spell-arcane'
  },
  verdant_flame: {
    id: 'verdant_flame',
    name: 'Зелёное пламя',
    minDmg: 20, maxDmg: 60,
    color: '#2ecc71',
    glowColor: 'rgba(46, 204, 113, 0.6)',
    emoji: '🔥',
    animClass: 'spell-verdant'
  },
  shadow_strike: {
    id: 'shadow_strike',
    name: 'Теневой удар',
    minDmg: 30, maxDmg: 40,
    color: '#9b59b6',
    glowColor: 'rgba(155, 89, 182, 0.6)',
    emoji: '🌑',
    animClass: 'spell-shadow'
  }
};

// Константы боя
const DUMMY_MAX_HP = 100;
const ROUNDS_TOTAL = 3;
const FIGHTS_LIMIT = 5;

// Состояние текущего боя
let battleState = {
  active: false,
  round: 1,
  dummyHP: DUMMY_MAX_HP,
  totalDamage: 0,
  roundsHistory: []
};

// Колбек вызывается по окончании боя с результатами
let _onBattleEnd = null;

/**
 * Устанавливает колбек окончания боя (вызывается из main.js)
 */
export function setOnBattleEnd(callback) {
  _onBattleEnd = callback;
}

/**
 * Инициализирует новый бой
 * Возвращает false если лимит боёв исчерпан
 */
export function initBattle() {
  checkDailyReset();
  const state = getState();

  if (state.combat.fightsToday >= FIGHTS_LIMIT) {
    return false;
  }

  // Сбрасываем состояние боя
  battleState = {
    active: true,
    round: 1,
    dummyHP: DUMMY_MAX_HP,
    totalDamage: 0,
    roundsHistory: []
  };

  renderBattleUI();
  return true;
}

/**
 * Случайное целое число [min, max] включительно
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Вычисляет финальный урон: base * (1 + bonusPower/100)
 */
function calcDamage(spell) {
  const bonusPower = getBonusPower();
  const base = randInt(spell.minDmg, spell.maxDmg);
  return Math.floor(base * (1 + bonusPower / 100));
}

/**
 * Игрок выбирает заклинание — основная функция раунда
 */
export async function castSpell(spellId) {
  if (!battleState.active || battleState.round > ROUNDS_TOTAL) return;

  const spell = SPELLS[spellId];
  if (!spell) return;

  // Блокируем кнопки на время анимации
  setSpellButtonsDisabled(true);

  const damage = calcDamage(spell);
  battleState.dummyHP -= damage;
  battleState.totalDamage += damage;
  battleState.roundsHistory.push({ spell, damage, round: battleState.round });

  // Анимация заклинания
  await playSpellAnimation(spell, damage);

  // Обновляем HP бар
  updateDummyHP();

  // Лог
  addCombatLog(spell, damage, battleState.round);

  battleState.round++;

  if (battleState.round > ROUNDS_TOTAL) {
    // Все раунды сыграны — завершаем бой
    await endBattle();
  } else {
    // Следующий раунд
    updateRoundDisplay();
    setSpellButtonsDisabled(false);
  }
}

/**
 * Завершает бой, начисляет награды, вызывает колбек
 */
async function endBattle() {
  battleState.active = false;
  const state = getState();
  const won = battleState.dummyHP <= 0;

  // Фиксируем бой в статистике
  state.combat.fightsToday++;
  state.combat.lastFightDate = new Date().toDateString();

  let goldEarned = 0;
  let xpEarned = 0;
  let droppedItem = null;
  let bonusTriggered = false;

  if (won) {
    state.combat.consecutiveWins++;
    goldEarned = randInt(10, 15);
    xpEarned = 20;

    // 3% шанс дропа Common-предмета
    if (Math.random() < 0.03) {
      droppedItem = rollItemDrop();
      addItemToInventory(droppedItem);
    }

    // Бонус 5 побед за день: проверяем после 5го боя если все победы
    if (state.combat.fightsToday === FIGHTS_LIMIT && state.combat.consecutiveWins >= FIGHTS_LIMIT) {
      bonusTriggered = true;
      goldEarned += 25;
      xpEarned += 50;
    }
  } else {
    // При поражении — сбрасываем серию побед
    state.combat.consecutiveWins = 0;
    goldEarned = randInt(5, 7);
    xpEarned = 10;
  }

  saveState();

  // Начисляем золото и опыт
  addGold(goldEarned);
  const levelUps = addXP(xpEarned);

  // Небольшая пауза перед показом результата
  await delay(600);

  // Вызываем колбек из main.js с результатами
  if (_onBattleEnd) {
    _onBattleEnd({
      won,
      damage: battleState.totalDamage,
      dummyHP: Math.max(0, battleState.dummyHP),
      goldEarned,
      xpEarned,
      droppedItem,
      bonusTriggered,
      fightsLeft: FIGHTS_LIMIT - state.combat.fightsToday,
      rounds: battleState.roundsHistory,
      levelUps
    });
  }
}

/**
 * Задержка
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Проигрывает визуальную анимацию заклинания
 */
async function playSpellAnimation(spell, damage) {
  const mageEl = document.getElementById('combat-mage');
  const dummyEl = document.getElementById('combat-dummy');
  const projectileEl = document.getElementById('spell-projectile');

  if (!mageEl || !dummyEl || !projectileEl) return;

  // Маг начинает каст
  mageEl.classList.add('mage-casting');

  await delay(150);

  // Настраиваем снаряд
  projectileEl.className = 'spell-projectile';
  projectileEl.style.display = 'flex';
  projectileEl.style.background = spell.color;
  projectileEl.style.boxShadow = `0 0 20px ${spell.glowColor}, 0 0 40px ${spell.glowColor}`;
  projectileEl.textContent = spell.emoji;

  // Запускаем анимацию движения снаряда
  void projectileEl.offsetWidth; // принудительный reflow для перезапуска анимации
  projectileEl.classList.add(spell.animClass);

  await delay(600);

  // Попадание
  projectileEl.style.display = 'none';
  dummyEl.classList.add('dummy-hit');

  // Цифра урона
  showDamageNumber(damage, spell.color);

  await delay(400);

  dummyEl.classList.remove('dummy-hit');
  mageEl.classList.remove('mage-casting');
}

/**
 * Показывает всплывающую цифру урона
 */
function showDamageNumber(damage, color) {
  const dummyEl = document.getElementById('combat-dummy');
  if (!dummyEl) return;

  const dmgEl = document.createElement('div');
  dmgEl.className = 'damage-number';
  dmgEl.textContent = `-${damage}`;
  dmgEl.style.color = color;
  dmgEl.style.textShadow = `0 0 10px ${color}`;

  dummyEl.appendChild(dmgEl);
  setTimeout(() => dmgEl.remove(), 1200);
}

/**
 * Обновляет HP бар манекена
 */
function updateDummyHP() {
  const hpBar = document.getElementById('dummy-hp-bar');
  const hpText = document.getElementById('dummy-hp-text');

  const currentHP = Math.max(0, battleState.dummyHP);
  const percent = (currentHP / DUMMY_MAX_HP) * 100;

  if (hpBar) {
    hpBar.style.width = `${percent}%`;
    if (percent > 60) {
      hpBar.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
    } else if (percent > 30) {
      hpBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
    } else {
      hpBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
    }
  }

  if (hpText) {
    hpText.textContent = `${currentHP} / ${DUMMY_MAX_HP}`;
  }
}

/**
 * Добавляет строку в лог боя
 */
function addCombatLog(spell, damage, round) {
  const logEl = document.getElementById('combat-log');
  if (!logEl) return;

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-round">Раунд ${round}</span>
    <span class="log-spell" style="color: ${spell.color}">${spell.emoji} ${spell.name}</span>
    <span class="log-damage">-${damage}</span>
  `;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

/**
 * Обновляет счётчик раундов
 */
function updateRoundDisplay() {
  const el = document.getElementById('combat-round');
  if (el) {
    el.textContent = `Раунд ${battleState.round} / ${ROUNDS_TOTAL}`;
  }
}

/**
 * Блокирует/разблокирует кнопки заклинаний
 */
function setSpellButtonsDisabled(disabled) {
  document.querySelectorAll('.spell-btn').forEach(btn => {
    btn.disabled = disabled;
  });
}

/**
 * Рендерит начальное состояние боевого UI
 */
function renderBattleUI() {
  // Сброс HP манекена
  const hpBar = document.getElementById('dummy-hp-bar');
  const hpText = document.getElementById('dummy-hp-text');
  if (hpBar) {
    hpBar.style.width = '100%';
    hpBar.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
  }
  if (hpText) hpText.textContent = `${DUMMY_MAX_HP} / ${DUMMY_MAX_HP}`;

  // Сброс раунда
  updateRoundDisplay();

  // Очистка лога
  const logEl = document.getElementById('combat-log');
  if (logEl) logEl.innerHTML = '';

  // Разблокировка кнопок
  setSpellButtonsDisabled(false);

  // Счётчик боёв
  const state = getState();
  const fightCountEl = document.getElementById('fights-remaining');
  if (fightCountEl) {
    const remaining = FIGHTS_LIMIT - state.combat.fightsToday;
    fightCountEl.textContent = `Боёв сегодня: ${remaining} / ${FIGHTS_LIMIT}`;
  }
}

/**
 * Возвращает количество боёв оставшихся сегодня
 */
export function getFightsRemaining() {
  checkDailyReset();
  const state = getState();
  return Math.max(0, FIGHTS_LIMIT - state.combat.fightsToday);
}
