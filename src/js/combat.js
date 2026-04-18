/**
 * combat.js — Grimoire Autocast боевая система
 * Маг автоматически кастует заклинания из гримуара по кругу.
 * Враг атакует мага по таймеру. Игрок только наблюдает.
 */

import {
  getState, saveState, getBonusPower, getStats,
  addXP, addGold, addItemToInventory,
  rollItemDrop, checkDailyReset, tickBuffs, getActiveBuffs,
  getElementalModifier,
  SPELLS_DATA, ENEMIES_DATA
} from './state.js';

import { showNotification } from './ui.js';

// BUG-005: import aggregatePassiveBonuses directly to avoid window._passiveNodesMap race condition
import { aggregatePassiveBonuses } from './passives.js';

// Экспортируем данные для обратной совместимости с main.js
export { SPELLS_DATA as SPELLS };

// Константы
const FIGHTS_LIMIT   = 5;
const CAST_GAP       = 400;   // мс пауза между кастами (увеличено для читаемости анимаций)
const INTRO_DELAY    = 800;   // мс задержка перед первым кастом
const FAST_FORWARD_TICK_CAP = 60000; // предотвращает бесконечный цикл при simulateBattle

// Модульный таймер анимации мага — единая переменная предотвращает гонку таймеров
let _animTimer = null;

/**
 * Wrapper вокруг setTimeout для поддержки режима _fastForward.
 * В обычном бою ведёт себя как setTimeout.
 * При _fastForward — вызывает fn() синхронно немедленно и возвращает null.
 * Каждый вызов в _fastForward-режиме инкрементирует _simTicks;
 * при достижении FAST_FORWARD_TICK_CAP принудительно завершает бой, чтобы защититься
 * от бесконечной рекурсии (например, если обе стороны бессмертны из-за данных).
 */
function _schedule(fn, delay) {
  if (battleState._fastForward) {
    battleState._simTicks = (battleState._simTicks || 0) + 1;
    if (battleState._simTicks > FAST_FORWARD_TICK_CAP) {
      // Аварийный выход: слишком долго — принудительно завершаем победой/поражением
      if (battleState.active) {
        const forcedResult = battleState.enemyHP <= battleState.mageHP ? 'win' : 'loss';
        endBattle(forcedResult);
      }
      return null;
    }
    fn();
    return null;
  }
  return setTimeout(fn, delay);
}

// Состояние текущего боя
let battleState = {
  active: false,
  mageHP: 100,
  mageMaxHP: 100,
  shieldHP: 0,          // HP щита (Mana Shield / Stone Skin / etc)
  enemyId: null,
  enemyHP: 0,
  enemyMaxHP: 0,
  enemySlowPercent: 0,  // текущее замедление атаки (Frost)
  enemySlowExpireAt: 0, // timestamp когда slow истекает
  voidDebuffActive: false,
  voidDebuffExpireAt: 0,
  focusCharged: false,  // следующее атак. заклинание x2
  dotStacks: [],        // массив активных DoT-стаков [{ticksLeft, interval, nextTickAt}]
  grimoire: [],         // заполненные слоты (только не-null)
  currentSlotIndex: 0,  // текущий индекс в ротации
  elapsedTime: 0,       // секунд прошло
  castTimeout: null,    // setTimeout для следующего каста
  enemyAttackTimeout: null,
  timerInterval: null,  // setInterval для секундного таймера
  dotInterval: null,    // setInterval для DoT тиков

  // === Class passive tracking ===
  emberStacks: 0,                // Pyromancer: current Ember count (0-5)
  emberDamageAccumulated: 0,     // Pyromancer: total damage during current stack cycle
  lastEmberTickTimestamps: {},   // Pyromancer: per-DoT-source ember tick tracking
  staticCharges: 0,              // Stormcaller: current Static count (0-10)
  riptideTriggered: false,       // Tidecaster: has Riptide fired this fight?
  // Geomancer Bedrock: passive modifier, no state needed

  // === New combat effects ===
  evasionActive: false,          // Stormcaller Zephyr: dodge active?
  evasionExpireAt: 0,
  evasionChance: 0,              // 0.0-1.0
  evasionCounterPercent: 0,      // counter-attack damage percent
  hasteRemaining: 0,             // Stormcaller Tailwind: spells remaining with haste
  hastePercent: 0,               // how much faster
  scorchWindowExpireAt: 0,       // Pyromancer Flame Wave: Scorch free cast window
  chillActive: false,            // Tidecaster Frozen Tomb: enemy attack speed -70%
  chillExpireAt: 0,
  petrifyActive: false,          // Geomancer Petrify: enemy stunned
  petrifyExpireAt: 0,
  petrifyAmpActive: false,       // +25% damage amp after petrify
  petrifyAmpExpireAt: 0,
  reflectActive: false,          // Geomancer Tectonic Shift reflect
  reflectPercent: 0,
  reflectExpireAt: 0,
  livingBombs: [],               // Pyromancer: [{detonateAt, damage, intMult, elementalMod}]

  // === Fast-forward (Skip Fight) ===
  _fastForward: false,           // true → _schedule() вызывает fn() синхронно
  _simTicks: 0                   // счётчик тиков fast-forward (hard cap: FAST_FORWARD_TICK_CAP)
};

// Колбек окончания боя
let _onBattleEnd = null;

// Флаги текущего контекста боя
let _isTowerCombat = false;   // если true — бой в башне (flee скрыт, награды не начисляются)
let _towerCarryHP  = null;    // HP мага при переносе между этажами (null = полное HP)
let _towerCarryShield = 0;    // Щит мага при переносе между этажами

/**
 * Устанавливает колбек окончания боя (вызывается из main.js)
 */
export function setOnBattleEnd(callback) {
  _onBattleEnd = callback;
}

/**
 * Перезапускает webp-анимацию: сброс src форсирует перемотку к первому кадру.
 * Необходимо вызывать каждый раз при показе attack/hurt/death.
 */
function restartWebpAnim(imgEl) {
  if (!imgEl) return;
  const src = imgEl.src;
  imgEl.src = '';
  imgEl.src = src;
}

/**
 * Показывает нужную анимацию мага, скрывая остальные.
 * Очищает предыдущий _animTimer перед установкой нового,
 * чтобы исключить гонку таймеров возврата в idle.
 *
 * @param {'idle'|'attack'|'hurt'|'death'} anim
 * @param {number} [returnToIdleMs] — если задано, через этот промежуток вернуть idle
 */
function showMageAnim(anim, returnToIdleMs) {
  // В режиме fast-forward анимации не нужны
  if (battleState._fastForward) return;

  // Очищаем любой ожидающий таймер возврата в idle
  if (_animTimer !== null) {
    clearTimeout(_animTimer);
    _animTimer = null;
  }

  const map = {
    idle:   'mage-anim-idle',
    attack: 'mage-anim-attack',
    hurt:   'mage-anim-hurt',
    death:  'mage-anim-death',
  };

  // Скрываем все, показываем нужный
  Object.entries(map).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (key === anim) {
      el.classList.remove('mage-sprite-hidden');
      restartWebpAnim(el); // перезапускаем анимацию с первого кадра
    } else {
      el.classList.add('mage-sprite-hidden');
    }
  });

  // Запланировать возврат в idle если нужно
  if (returnToIdleMs && anim !== 'idle' && anim !== 'death') {
    _animTimer = setTimeout(() => {
      _animTimer = null;
      showMageAnim('idle');
    }, returnToIdleMs);
  }
}

/**
 * Возвращает максимальное HP мага по формуле:
 * 100 + (level - 1) * 15 + floor(BonusPower * 0.5)
 * Пассивные бонусы maxHpPercent умножают результат.
 * Экспортируется для использования в tower.js (избегаем дублирования формулы).
 */
export function calcMageMaxHP() {
  const state = getState();
  const bp = getBonusPower();
  let base = 100 + (state.level - 1) * 15 + Math.floor(bp * 0.5);
  if (state.buffs?.iron_flask_buff?.active) base += 40;

  // Apply passive maxHpPercent bonuses from unlocked nodes
  const nodeMap = (typeof window !== 'undefined' && window._passiveNodesMap) || null;
  const unlocked = (state.passives && state.passives.unlocked) || [];
  if (nodeMap && unlocked.length > 0) {
    let hpMult = 1.0;
    for (const id of unlocked) {
      const node = nodeMap[id];
      if (node && node.effect.maxHpPercent) hpMult += node.effect.maxHpPercent;
    }
    base = Math.floor(base * hpMult);
  }

  return base;
}

/**
 * Возвращает Intelligence по формуле: 5 + (level-1)*3 + BonusPower
 */
function getIntelligence() {
  const state = getState();
  const bp = getBonusPower();
  return 5 + (state.level - 1) * 3 + bp;
}

/**
 * Случайное целое число [min, max] включительно
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Инициализирует бой с конкретным врагом.
 * Вызывается из main.js после экрана гримуара.
 *
 * @param {string} enemyId
 * @param {object} [options]
 * @param {boolean} [options.isTowerCombat=false] — бой в башне (flee скрыт, rewards через tower.js)
 * @param {number|null} [options.carryHP=null]    — перенесённое HP (null = начать с макс)
 * @param {number} [options.carryShield=0]        — перенесённый щит
 */
export function initBattle(enemyId, options = {}) {
  checkDailyReset();

  // Очищаем таймеры предыдущего боя во избежание двойного срабатывания
  clearTimeout(battleState.castTimeout);
  clearTimeout(battleState.enemyAttackTimeout);
  clearInterval(battleState.timerInterval);
  clearInterval(battleState.dotInterval);

  const state = getState();
  const enemy = ENEMIES_DATA[enemyId];
  if (!enemy) return false;

  // Фильтруем null из гримуара, затем — слоты несовместимые с классом.
  // Если classType === null (игрок < уровня Awakening), считаем все спеллы валидными,
  // чтобы не блокировать бои до первого выбора класса.
  const rawSlots = state.grimoire.filter(id => id !== null);
  if (rawSlots.length < 3) return false;

  const compatibleSlots = rawSlots.filter(id => {
    const sp = SPELLS_DATA[id];
    if (!sp) return false;
    if (state.classType === null) return true;
    return sp.classRestriction === null || sp.classRestriction === undefined || sp.classRestriction === state.classType;
  });

  // Если все слоты несовместимы — всё равно запускаем бой c rawSlots, чтобы игрок
  // не оказался в состоянии "тыкнул бой, ничего не происходит". scheduleNextCast
  // сам пропустит невалидные касты и честно завершит бой как loss с уведомлением.
  const activeSlots = compatibleSlots.length > 0 ? compatibleSlots : rawSlots;
  if (compatibleSlots.length === 0) {
    showNotification('Grimoire has no spells matching your class. Open Grimoire and reassign.', 'warning');
  }

  // Сохраняем контекст башни
  _isTowerCombat   = options.isTowerCombat === true;
  _towerCarryHP    = options.carryHP    ?? null;
  _towerCarryShield = options.carryShield ?? 0;

  const mageMaxHP = calcMageMaxHP();
  // Начальное HP: либо перенесённое (не превышает макс), либо полное
  const startHP     = _towerCarryHP !== null ? Math.min(_towerCarryHP, mageMaxHP) : mageMaxHP;
  const startShield = _isTowerCombat ? _towerCarryShield : 0;

  // Скрываем / показываем кнопку flee в зависимости от контекста
  const backBtn = document.getElementById('btn-combat-back');
  if (backBtn) backBtn.style.display = _isTowerCombat ? 'none' : '';

  // Skip Fight: доступен везде — в обычном бою, в башне, в тренировке
  const skipBtn = document.getElementById('btn-skip-fight');
  if (skipBtn) {
    skipBtn.style.display = '';
    skipBtn.disabled = false;
    const newSkip = skipBtn.cloneNode(true);
    skipBtn.replaceWith(newSkip);
    newSkip.addEventListener('click', () => {
      if (!battleState.active || battleState._fastForward) return;
      newSkip.disabled = true;
      const ov = document.getElementById('resolving-overlay');
      if (ov) ov.classList.remove('hidden');
      setTimeout(() => {
        simulateBattle();
        if (ov) ov.classList.add('hidden');
      }, 400);
    });
  }

  // Сброс состояния боя
  battleState = {
    active: true,
    mageHP: startHP,
    mageMaxHP,
    shieldHP: startShield,
    enemyId,
    enemyHP: enemy.hp,
    enemyMaxHP: enemy.hp,
    enemySlowPercent: 0,
    enemySlowExpireAt: 0,
    voidDebuffActive: false,
    voidDebuffExpireAt: 0,
    focusCharged: false,
    dotStacks: [],
    grimoire: activeSlots,
    currentSlotIndex: 0,
    elapsedTime: 0,
    castTimeout: null,
    enemyAttackTimeout: null,
    timerInterval: null,
    dotInterval: null,

    // Class passive tracking
    emberStacks: 0,
    emberDamageAccumulated: 0,
    lastEmberTickTimestamps: {},
    staticCharges: 0,
    riptideTriggered: false,

    // Pyromancer proc passives
    infernalMomentumStacks: 0,  // +5% per fire cast, max 25% (5 stacks)
    igniteDoTDealt: {},         // { dotId: totalDmgDealt } for Backdraft explosion

    // New combat effects
    evasionActive: false,
    evasionExpireAt: 0,
    evasionChance: 0,
    evasionCounterPercent: 0,
    hasteRemaining: 0,
    hastePercent: 0,
    scorchWindowExpireAt: 0,
    chillActive: false,
    chillExpireAt: 0,
    petrifyActive: false,
    petrifyExpireAt: 0,
    petrifyAmpActive: false,
    petrifyAmpExpireAt: 0,
    reflectActive: false,
    reflectPercent: 0,
    reflectExpireAt: 0,
    livingBombs: [],

    // === Passive skill tree procs ===
    _secondWindUsed: false,  // U7: resets each fight
    _phoenixUsed: false,     // P-K2: resets each fight

    // === Fast-forward (Skip Fight) ===
    _fastForward: false,
    _simTicks: 0
  };

  // Сброс спрайтов мага: показываем idle, скрываем остальные, сбрасываем таймер
  showMageAnim('idle');

  renderBattleUI(enemy);
  startBattleLoop(enemy);
  return true;
}

/**
 * Запускает игровой цикл боя
 */
function startBattleLoop(enemy) {
  // Таймер отсчёта боя (раз в секунду)
  battleState.timerInterval = setInterval(() => {
    if (!battleState.active) return;
    battleState.elapsedTime++;

    // Проверяем истечение баффов на враге
    const now = Date.now();
    if (battleState.enemySlowPercent > 0 && now >= battleState.enemySlowExpireAt) {
      battleState.enemySlowPercent = 0;
      addCombatLog('Enemy slow expired.', '#888');
    }
    if (battleState.voidDebuffActive && now >= battleState.voidDebuffExpireAt) {
      battleState.voidDebuffActive = false;
      addCombatLog('Void debuff expired.', '#888');
    }
    // Evasion expiry
    if (battleState.evasionActive && now >= battleState.evasionExpireAt) {
      battleState.evasionActive = false;
      battleState.evasionChance = 0;
      addCombatLog('Evasion expired.', '#888');
    }
    // Chill expiry (Frozen Tomb) -- transition to post-chill slow
    if (battleState.chillActive && now >= battleState.chillExpireAt) {
      battleState.chillActive = false;
      addCombatLog('Chill expired.', '#888');
    }
    // Petrify expiry -- transition to damage amp
    if (battleState.petrifyActive && now >= battleState.petrifyExpireAt) {
      battleState.petrifyActive = false;
      addCombatLog('Petrify stun expired.', '#888');
    }
    // Petrify damage amp expiry
    if (battleState.petrifyAmpActive && now >= battleState.petrifyAmpExpireAt) {
      battleState.petrifyAmpActive = false;
      addCombatLog('Petrify vulnerability expired.', '#888');
    }
    // Reflect expiry
    if (battleState.reflectActive && now >= battleState.reflectExpireAt) {
      battleState.reflectActive = false;
      battleState.reflectPercent = 0;
      addCombatLog('Damage reflect expired.', '#888');
    }
    // Living Bombs detonation
    for (let i = battleState.livingBombs.length - 1; i >= 0; i--) {
      const bomb = battleState.livingBombs[i];
      if (now >= bomb.detonateAt) {
        const detonationDmg = Math.floor(bomb.damage * bomb.intMult * bomb.elementalMod);
        battleState.enemyHP -= detonationDmg;
        addCombatLog(`Living Bomb detonates for ${detonationDmg}!`, '#e74c3c');
        showDamageNumber(detonationDmg, '#e74c3c');
        battleState.livingBombs.splice(i, 1);
        updateEnemyHP();
        if (battleState.enemyHP <= 0) { endBattle('win'); return; }
      }
    }

    updateEnemyStatusRow();
    // Таймер обратного отсчёта удалён — бой длится до смерти одного из участников
  }, 1000);

  // DoT тики (каждые 500мс проверяем стаки)
  battleState.dotInterval = setInterval(() => {
    if (!battleState.active || battleState.dotStacks.length === 0) return;
    processDotTicks();
  }, 500);

  // Первый каст с задержкой вступления
  battleState.castTimeout = setTimeout(() => {
    if (battleState.active) scheduleNextCast();
  }, INTRO_DELAY);

  // Первая атака врага (если атакует)
  if (enemy.attack > 0 && enemy.attackInterval > 0) {
    scheduleEnemyAttack(enemy);
  }
}

/**
 * Планирует следующий каст из гримуара
 * @param {number} skipCount — сколько слотов подряд пропущено (защита от бесконечной рекурсии)
 */
function scheduleNextCast(skipCount = 0) {
  if (!battleState.active) return;

  const totalSlots = battleState.grimoire.length;

  const spellId = battleState.grimoire[battleState.currentSlotIndex];
  const spell = SPELLS_DATA[spellId];
  if (!spell) {
    // Пустой слот — пропускаем
    advanceGrimoire();
    // Если все слоты пусты — не зацикливаемся
    if (skipCount + 1 >= totalSlots) {
      addCombatLog('No spells in loadout!', '#888');
      showNotification('Grimoire had no compatible spells — battle forfeited.', 'warning');
      endBattle('loss');
      return;
    }
    scheduleNextCast(skipCount + 1);
    return;
  }

  // Проверка ограничения класса: если заклинание недоступно — показываем сообщение и пропускаем.
  // При classType === null все спеллы уже отфильтрованы как валидные в initBattle,
  // эта ветка — страховка на edge cases.
  const state = getState();
  if (spell.classRestriction !== null && spell.classRestriction !== undefined && state.classType !== null && spell.classRestriction !== state.classType) {
    // Капитализируем название класса для сообщения
    const className = spell.classRestriction.charAt(0).toUpperCase() + spell.classRestriction.slice(1);
    advanceGrimoire();

    // Если все слоты несовместимы — честное поражение, не ложная победа
    if (skipCount + 1 >= totalSlots) {
      addCombatLog('No compatible spells in loadout!', '#888');
      showNotification('Grimoire had no compatible spells — battle forfeited.', 'warning');
      endBattle('loss');
      return;
    }

    addCombatLog(`${spell.name}: Requires ${className}`, '#888');
    // Небольшая пауза чтобы лог не спамил при нескольких несовместимых слотах подряд
    battleState.castTimeout = _schedule(() => {
      if (battleState.active) scheduleNextCast(skipCount + 1);
    }, CAST_GAP);
    return;
  }

  // Обновляем трекер — подсвечиваем текущий слот (пропускаем DOM при fast-forward)
  if (!battleState._fastForward) updateGrimoireTracker();

  // Calculate effective cast time (haste, scorch window)
  // Глобальный множитель +35% даёт анимации время воспроизвестись до следующего каста
  const CAST_TIME_SCALE = 1.35;
  let effectiveCastTime = spell.castTime * CAST_TIME_SCALE;

  // Scorch free-cast window (Flame Wave effect)
  if (spell.id === 'scorch' && Date.now() < battleState.scorchWindowExpireAt) {
    effectiveCastTime = 0.1; // near-instant
    addCombatLog('Scorch: free cast (Flame Wave window)!', spell.color);
  }

  // Haste (Tailwind / Thunderstorm proc)
  if (battleState.hasteRemaining > 0 && effectiveCastTime > 0.1) {
    effectiveCastTime *= (1 - battleState.hastePercent);
    battleState.hasteRemaining--;
    if (battleState.hasteRemaining <= 0) {
      battleState.hastePercent = 0;
    }
  }

  // Выполняем каст через castTime заклинания
  battleState.castTimeout = _schedule(async () => {
    if (!battleState.active) return;
    // Guard: если успел стартовать Skip Fight пока таймер был в полёте — отдаём управление simulateBattle
    if (battleState._fastForward) return;
    await performCast(spell);
    if (battleState.active) {
      advanceGrimoire();
      // Пауза между кастами перед следующим
      battleState.castTimeout = _schedule(() => {
        if (battleState.active) scheduleNextCast();
      }, CAST_GAP);
    }
  }, effectiveCastTime * 1000);
}

/**
 * Сдвигает индекс гримуара к следующему слоту
 */
function advanceGrimoire() {
  battleState.currentSlotIndex = (battleState.currentSlotIndex + 1) % battleState.grimoire.length;
}

/**
 * Выполняет каст заклинания — поддерживает все классовые эффекты и пассивки
 */
async function performCast(spell) {
  if (!battleState.active) return;

  const effect = spell.effect;
  const state = getState();
  const enemy = ENEMIES_DATA[battleState.enemyId];
  const int = getIntelligence();
  const intMult = 1 + (int - 5) / 100;
  const schoolMod = enemy.resistances[spell.school] || 1.0;
  const elementalMod = getElementalModifier(state.classType, enemy.elementType);
  const debuffMod = battleState.voidDebuffActive ? 1.15 : 1.0;
  const petrifyAmpMod = battleState.petrifyAmpActive ? 1.25 : 1.0;
  const buffMod = (state.buffs.mana_surge && state.buffs.mana_surge.active) ? 1.25 : 1.0;

  let focusMod = 1.0;
  let wasFocused = false;
  if (battleState.focusCharged) {
    focusMod = 2.0;
    battleState.focusCharged = false;
    wasFocused = true;
  }

  // U8 Executioner: +15% damage vs enemies below 25% HP
  let executionerMod = 1.0;
  const passiveUnlocked = (state.passives && state.passives.unlocked) || [];
  if (passiveUnlocked.includes('U8')) {
    const nodeMap = (typeof window !== 'undefined' && window._passiveNodesMap) || null;
    const u8Node = nodeMap && nodeMap['U8'];
    const execBonus = u8Node ? (u8Node.effect.executioner || 0.15) : 0.15;
    if (battleState.enemyHP < battleState.enemyMaxHP * 0.25) {
      executionerMod = 1 + execBonus;
    }
  }

  // --- Pyromancer proc passives ---
  const pBonuses = aggregatePassiveBonuses(passiveUnlocked);

  // P11 Infernal Momentum: +5% per consecutive fire cast (max 25%), resets on non-fire
  let infernalMod = 1.0;
  if (pBonuses.infernalMomentum && state.classType === 'pyromancer') {
    if (spell.school === 'fire') {
      infernalMod = 1 + battleState.infernalMomentumStacks * 0.05;
      // Stack will be incremented AFTER damage (in triggerPassives)
    } else {
      // Non-fire spell — reset stacks
      if (battleState.infernalMomentumStacks > 0) {
        addCombatLog('Infernal Momentum reset', '#e67e22');
      }
      battleState.infernalMomentumStacks = 0;
    }
  }

  // P13 Meltdown: +20% fire damage vs enemies below 30% HP
  let meltdownMod = 1.0;
  if (pBonuses.meltdown > 0 && state.classType === 'pyromancer' && spell.school === 'fire') {
    if (battleState.enemyHP < battleState.enemyMaxHP * 0.30) {
      meltdownMod = 1 + pBonuses.meltdown;
    }
  }

  // Helper: calculate standard damage
  const calcDmg = (base, useSchool = true, useFocus = true, useBuff = true) => {
    return Math.floor(base * intMult * (useSchool ? schoolMod : 1.0) * elementalMod * debuffMod * petrifyAmpMod * (useFocus ? focusMod : 1.0) * (useBuff ? buffMod : 1.0) * executionerMod * infernalMod * meltdownMod);
  };

  // Helper: apply damage and check win
  const applyDamage = (dmg) => {
    battleState.enemyHP -= dmg;
    updateEnemyHP();
    return battleState.enemyHP <= 0;
  };

  // Helper: trigger class passives after a spell deals damage
  const triggerPassives = (damageDealt, spell) => {
    if (spell.passiveTrigger === false) return;

    // Pyromancer — Combustion
    if (state.classType === 'pyromancer') {
      const extraEmber = spell.effect?.extraEmberStacks || 1;
      battleState.emberStacks += extraEmber;
      battleState.emberDamageAccumulated += damageDealt;

      if (battleState.emberStacks >= 5) {
        const bonusDmg = Math.floor(battleState.emberDamageAccumulated * 0.15);
        battleState.enemyHP -= bonusDmg;
        addCombatLog(`Combustion detonates for ${bonusDmg} bonus damage!`, '#ff6600');
        showDamageNumber(bonusDmg, '#ff6600');
        battleState.emberStacks = 0;
        battleState.emberDamageAccumulated = 0;
        updateEnemyHP();
        if (battleState.enemyHP <= 0) { endBattle('win'); }
      }

      // P11 Infernal Momentum: increment stacks after fire cast (max 5 = 25%)
      const pBonus = aggregatePassiveBonuses(state.passives?.unlocked || []);
      if (pBonus.infernalMomentum && spell.school === 'fire') {
        battleState.infernalMomentumStacks = Math.min(battleState.infernalMomentumStacks + 1, 5);
        addCombatLog(`Infernal Momentum: +${battleState.infernalMomentumStacks * 5}%`, '#ff6600');
      }
    }

    // Stormcaller — Static Charge
    if (state.classType === 'stormcaller') {
      const extraCharges = spell.effect?.extraCharges || 0;
      battleState.staticCharges += 1 + extraCharges;

      if (battleState.staticCharges >= 10) {
        const thunderDmg = 5 * state.level;
        battleState.enemyHP -= thunderDmg;
        addCombatLog(`Thunderstorm! ${thunderDmg} bonus damage!`, '#00bfff');
        showDamageNumber(thunderDmg, '#00bfff');
        // Bonus: next spell 50% faster
        battleState.hasteRemaining = Math.max(battleState.hasteRemaining, 1);
        battleState.hastePercent = Math.max(battleState.hastePercent, 0.50);
        battleState.staticCharges = 0;
        updateEnemyHP();
        if (battleState.enemyHP <= 0) { endBattle('win'); }
      }
    }
  };

  // === FOCUS (utility, no damage) ===
  if (spell.id === 'focus') {
    if (battleState.focusCharged) {
      // Undo the focus consumption above since we re-set it
      addCombatLog('Focus already active — wasted!', spell.color);
    } else {
      battleState.focusCharged = true;
      addCombatLog('Focus activated — next spell x2.0', spell.color);
      await playFocusAnimation();
    }
    // Restore focusMod since focus doesn't consume itself
    if (wasFocused) { battleState.focusCharged = true; }
    return;
  }

  // === MANA SHIELD (utility, no damage) ===
  if (spell.id === 'mana_shield') {
    const shieldVal = Math.floor(40 + int * 0.8);
    battleState.shieldHP = Math.min(battleState.shieldHP + shieldVal, battleState.mageMaxHP);
    addCombatLog(`Mana Shield: +${shieldVal} HP shield`, spell.color);
    await playShieldAnimation(shieldVal);
    updateMageHP();
    // Restore focus if was charged (shield doesn't consume focus)
    if (wasFocused) { battleState.focusCharged = true; }
    return;
  }

  // === TAILWIND (Stormcaller, no damage) ===
  if (effect && effect.type === 'haste') {
    battleState.hasteRemaining = effect.hasteSpells;
    battleState.hastePercent = effect.hastePercent;
    addCombatLog(`${spell.name}: next ${effect.hasteSpells} spells cast ${Math.floor(effect.hastePercent * 100)}% faster`, spell.color);
    if (wasFocused) { battleState.focusCharged = true; }
    return;
  }

  // === HEALING RAIN (Tidecaster, no damage) ===
  if (effect && effect.type === 'heal') {
    let healAmount = effect.baseHeal + Math.floor(battleState.mageMaxHP * effect.maxHpPercent);
    // Emergency heal: x2 if HP < threshold
    if (battleState.mageHP < battleState.mageMaxHP * effect.emergencyThreshold) {
      healAmount = Math.floor(healAmount * effect.emergencyMultiplier);
      addCombatLog(`${spell.name}: EMERGENCY heal ${healAmount} HP!`, '#1abc9c');
    } else {
      addCombatLog(`${spell.name}: healed ${healAmount} HP`, '#1abc9c');
    }
    battleState.mageHP = Math.min(battleState.mageHP + healAmount, battleState.mageMaxHP);
    updateMageHP();
    if (wasFocused) { battleState.focusCharged = true; }
    triggerPassives(0, spell); // passiveTrigger true but 0 damage -- still counts as cast for Static Charge
    return;
  }

  // === STONE SKIN (Geomancer, shield, no damage) ===
  if (effect && effect.type === 'class_shield') {
    const shieldVal = effect.baseShield + Math.floor(battleState.mageMaxHP * effect.maxHpPercent);
    battleState.shieldHP = Math.min(battleState.shieldHP + shieldVal, battleState.mageMaxHP);
    addCombatLog(`${spell.name}: +${shieldVal} shield (total: ${battleState.shieldHP})`, spell.color);
    await playShieldAnimation(shieldVal);
    updateMageHP();
    if (wasFocused) { battleState.focusCharged = true; }
    triggerPassives(0, spell);
    return;
  }

  // === FORTIFY (Geomancer, shield manipulation) ===
  if (effect && effect.type === 'fortify') {
    if (battleState.shieldHP > 0) {
      battleState.shieldHP = Math.min(battleState.shieldHP * 2, battleState.mageMaxHP);
      addCombatLog(`${spell.name}: shield doubled to ${battleState.shieldHP}!`, spell.color);
    } else {
      battleState.shieldHP = Math.min(effect.fallbackShield, battleState.mageMaxHP);
      addCombatLog(`${spell.name}: created ${battleState.shieldHP} shield`, spell.color);
    }
    await playShieldAnimation(battleState.shieldHP);
    updateMageHP();
    if (wasFocused) { battleState.focusCharged = true; }
    triggerPassives(0, spell);
    return;
  }

  // === ZEPHYR (Stormcaller, low damage + evasion) ===
  if (effect && effect.type === 'evasion') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = calcDmg(base);
    if (applyDamage(dmg)) {
      showDamageNumber(dmg, spell.color);
      await playSpellAnimation(spell, dmg);
      endBattle('win'); return;
    }
    battleState.evasionActive = true;
    battleState.evasionChance = effect.dodgeChance;
    battleState.evasionCounterPercent = effect.counterDmgPercent;
    battleState.evasionExpireAt = Date.now() + effect.duration * 1000;
    addCombatLog(`${spell.name}: ${dmg} dmg + ${Math.floor(effect.dodgeChance * 100)}% dodge for ${effect.duration}s`, spell.color);
    showDamageNumber(dmg, spell.color);
    await playSpellAnimation(spell, dmg);
    triggerPassives(dmg, spell);
    return;
  }

  // === ARCANE BARRAGE (multishot) ===
  if (spell.id === 'arcane_barrage') {
    let totalDmg = 0;
    for (let i = 0; i < 3; i++) {
      // Не бьём мёртвого врага — останавливаем серию если HP уже <= 0
      if (battleState.enemyHP <= 0) break;
      const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
      const dmg = calcDmg(base, true, i === 0);
      totalDmg += dmg;
      battleState.enemyHP -= dmg;
    }
    showDamageNumber(totalDmg, spell.color);
    const focusLabel = wasFocused ? ' (x2 Focus on first hit!)' : '';
    addCombatLog(`${spell.name} hits for ${totalDmg} (3 missiles)${focusLabel}`, spell.color);
    await playSpellAnimation(spell, totalDmg);
    updateEnemyHP();
    triggerPassives(totalDmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === CHAIN LIGHTNING (Stormcaller) ===
  if (effect && effect.type === 'chain') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const hit1 = calcDmg(base);
    const hit2 = Math.floor(hit1 * effect.decayPercent);
    const hit3 = Math.floor(hit1 * effect.decayPercent * effect.decayPercent);
    const totalDmg = hit1 + hit2 + hit3;
    battleState.enemyHP -= totalDmg;
    showDamageNumber(totalDmg, spell.color);
    addCombatLog(`${spell.name}: ${hit1} + ${hit2} + ${hit3} = ${totalDmg} chain damage`, spell.color);
    await playSpellAnimation(spell, totalDmg);
    updateEnemyHP();
    triggerPassives(totalDmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === TEMPEST (Stormcaller, multi-hit + static per hit) ===
  if (effect && effect.type === 'multi_hit_static') {
    let totalDmg = 0;
    const perHitMin = Math.floor(spell.baseDmg.min / effect.hits);
    const perHitMax = Math.floor(spell.baseDmg.max / effect.hits);
    for (let i = 0; i < effect.hits; i++) {
      const base = randInt(perHitMin, perHitMax);
      const hitDmg = calcDmg(base, true, i === 0);
      totalDmg += hitDmg;
      battleState.enemyHP -= hitDmg;
      // Each hit generates Static charge
      if (state.classType === 'stormcaller') {
        battleState.staticCharges += effect.extraStaticPerHit;
      }
    }
    showDamageNumber(totalDmg, spell.color);
    addCombatLog(`${spell.name}: ${totalDmg} dmg (${effect.hits} hits)${wasFocused ? ' (x2 Focus on first!)' : ''}`, spell.color);
    await playSpellAnimation(spell, totalDmg);
    updateEnemyHP();
    // Check Thunderstorm after adding charges
    if (state.classType === 'stormcaller' && battleState.staticCharges >= 10) {
      const thunderDmg = 5 * state.level;
      battleState.enemyHP -= thunderDmg;
      addCombatLog(`Thunderstorm! ${thunderDmg} bonus damage!`, '#00bfff');
      showDamageNumber(thunderDmg, '#00bfff');
      battleState.hasteRemaining = Math.max(battleState.hasteRemaining, 1);
      battleState.hastePercent = Math.max(battleState.hastePercent, 0.50);
      battleState.staticCharges = 0;
      updateEnemyHP();
    }
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === LIGHTNING BOLT (Stormcaller, double strike chance) ===
  if (effect && effect.type === 'double_strike') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    let dmg = calcDmg(base);
    let totalDmg = dmg;
    let doubleStrike = false;
    if (Math.random() < effect.procChance) {
      const base2 = randInt(spell.baseDmg.min, spell.baseDmg.max);
      const dmg2 = calcDmg(base2, true, false); // no focus on second
      totalDmg += dmg2;
      doubleStrike = true;
    }
    battleState.enemyHP -= totalDmg;
    showDamageNumber(totalDmg, spell.color);
    addCombatLog(`${spell.name}: ${totalDmg} dmg${doubleStrike ? ' (DOUBLE STRIKE!)' : ''}${wasFocused ? ' (x2 Focus!)' : ''}`, spell.color);
    await playSpellAnimation(spell, totalDmg);
    updateEnemyHP();
    triggerPassives(totalDmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === DOT spells (Ignite, Cataclysm) ===
  if (effect && effect.type === 'dot') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const directDmg = calcDmg(base);
    battleState.enemyHP -= directDmg;

    const dotSourceId = spell.id + '_' + Date.now();
    // P12 Living Furnace: increase Ignite max stacks (3 -> 5)
    let effectiveMaxStacks = effect.maxStacks;
    if (spell.id === 'ignite' && state.classType === 'pyromancer') {
      const furnaceStacks = pBonuses.igniteMaxStacks;
      if (furnaceStacks > 0) effectiveMaxStacks = furnaceStacks;
    }
    if (battleState.dotStacks.length < effectiveMaxStacks) {
      battleState.dotStacks.push({
        ticksLeft: effect.ticks,
        interval: effect.interval * 1000,
        nextTickAt: Date.now() + effect.interval * 1000,
        dmgPerTick: effect.tickDmg,
        intMult,
        schoolMod,
        elementalMod,
        color: spell.color,
        sourceId: dotSourceId,
        spellId: spell.id
      });
      addCombatLog(`${spell.name}: ${directDmg} dmg + DoT stack (${battleState.dotStacks.length}/${effectiveMaxStacks})`, spell.color);
    } else {
      addCombatLog(`${spell.name}: ${directDmg} dmg (DoT stacks maxed)`, spell.color);
    }
    showDamageNumber(directDmg, spell.color);
    await playSpellAnimation(spell, directDmg);
    updateEnemyHP();
    updateEnemyStatusRow();
    triggerPassives(directDmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === PERSISTENT DOT (Ball Lightning) ===
  if (effect && effect.type === 'persistent_dot') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const directDmg = calcDmg(base);
    battleState.enemyHP -= directDmg;

    const ticks = Math.floor(effect.duration / effect.tickInterval);
    const dotSourceId = spell.id + '_' + Date.now();
    battleState.dotStacks.push({
      ticksLeft: ticks,
      interval: effect.tickInterval * 1000,
      nextTickAt: Date.now() + effect.tickInterval * 1000,
      dmgPerTick: effect.tickDmg,
      intMult,
      schoolMod: 1.0,
      elementalMod,
      color: spell.color,
      sourceId: dotSourceId,
      spellId: spell.id
    });
    addCombatLog(`${spell.name}: ${directDmg} dmg + persistent DoT (${effect.tickDmg}/tick for ${effect.duration}s)`, spell.color);
    showDamageNumber(directDmg, spell.color);
    await playSpellAnimation(spell, directDmg);
    updateEnemyHP();
    updateEnemyStatusRow();
    triggerPassives(directDmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === SLOW spells (Frost Spike, Blizzard, Tidal Wave, Cyclone) ===
  if (effect && effect.type === 'slow') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = calcDmg(base);
    battleState.enemyHP -= dmg;
    battleState.enemySlowPercent = effect.slowPercent;
    battleState.enemySlowExpireAt = Date.now() + effect.duration * 1000;
    const focusLabel = wasFocused ? ' (x2 Focus!)' : '';
    addCombatLog(`${spell.name}: ${dmg} dmg + -${Math.floor(effect.slowPercent * 100)}% attack speed${focusLabel}`, spell.color);
    showDamageNumber(dmg, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    updateEnemyStatusRow();
    triggerPassives(dmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === VOID DEBUFF ===
  if (effect && effect.type === 'debuff' && effect.debuffType === 'void') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = calcDmg(base);
    battleState.enemyHP -= dmg;
    battleState.voidDebuffActive = true;
    battleState.voidDebuffExpireAt = Date.now() + effect.duration * 1000;
    const focusLabel = wasFocused ? ' (x2 Focus!)' : '';
    addCombatLog(`${spell.name}: ${dmg} dmg + Void Debuff +15%${focusLabel}`, spell.color);
    showDamageNumber(dmg, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    updateEnemyStatusRow();
    triggerPassives(dmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === LIFESTEAL (Shadow Bolt, Drain Life, Maelstrom) ===
  if (effect && (effect.type === 'lifesteal' || effect.type === 'maelstrom')) {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = calcDmg(base);
    battleState.enemyHP -= dmg;
    const lsPercent = effect.type === 'maelstrom' ? effect.lifestealPercent : effect.percent;
    const missingHP = battleState.mageMaxHP - battleState.mageHP;
    const heal = Math.min(missingHP, Math.floor(dmg * lsPercent));
    if (heal > 0) battleState.mageHP += heal;
    // Maelstrom also applies slow
    if (effect.type === 'maelstrom' && effect.slow) {
      battleState.enemySlowPercent = effect.slow.slowPercent;
      battleState.enemySlowExpireAt = Date.now() + effect.slow.duration * 1000;
    }
    const focusLabel = wasFocused ? ' (x2 Focus!)' : '';
    addCombatLog(`${spell.name}: ${dmg} dmg + healed ${heal} HP${effect.type === 'maelstrom' ? ' + slow' : ''}${focusLabel}`, spell.color);
    showDamageNumber(dmg, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    updateMageHP();
    updateEnemyStatusRow();
    triggerPassives(dmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === CONDITIONAL BONUS (Scorch, Tsunami, Tremor) ===
  if (effect && effect.type === 'conditional_bonus') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    let dmg = calcDmg(base);
    let conditionMet = false;
    if (effect.condition === 'target_has_ignite' && battleState.dotStacks.some(d => d.spellId === 'ignite' || d.spellId === 'cataclysm')) {
      dmg = Math.floor(dmg * (1 + effect.bonusDmgPercent));
      conditionMet = true;
    }
    if (effect.condition === 'target_is_slowed' && battleState.enemySlowPercent > 0) {
      dmg = Math.floor(dmg * (1 + effect.bonusDmgPercent));
      conditionMet = true;
    }
    if (effect.condition === 'mage_has_shield' && battleState.shieldHP > 0) {
      dmg = Math.floor(dmg * (1 + effect.bonusDmgPercent));
      conditionMet = true;
    }
    battleState.enemyHP -= dmg;
    // Some conditional spells also apply slow (Tsunami, Tremor)
    if (effect.slow) {
      battleState.enemySlowPercent = effect.slow.slowPercent;
      battleState.enemySlowExpireAt = Date.now() + effect.slow.duration * 1000;
    }
    const focusLabel = wasFocused ? ' (x2 Focus!)' : '';
    const condLabel = conditionMet ? ' (BONUS!)' : '';
    addCombatLog(`${spell.name}: ${dmg} dmg${condLabel}${focusLabel}`, spell.color);
    showDamageNumber(dmg, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    updateEnemyStatusRow();
    triggerPassives(dmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === DELAYED DETONATION (Living Bomb) ===
  if (effect && effect.type === 'delayed_detonation') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const directDmg = calcDmg(base);
    battleState.enemyHP -= directDmg;
    // Schedule detonation -- detonation ignores focusMod and buffMod and schoolMod
    battleState.livingBombs.push({
      detonateAt: Date.now() + effect.delay * 1000,
      damage: effect.detonationDmg,
      intMult,
      elementalMod
    });
    addCombatLog(`${spell.name}: ${directDmg} dmg + bomb planted (${effect.delay}s)`, spell.color);
    showDamageNumber(directDmg, spell.color);
    await playSpellAnimation(spell, directDmg);
    updateEnemyHP();
    triggerPassives(directDmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === IGNITE APPLY (Flame Wave) ===
  if (effect && effect.type === 'ignite_apply') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = calcDmg(base);
    battleState.enemyHP -= dmg;
    // Apply Ignite stack
    const igniteSpell = SPELLS_DATA['ignite'];
    if (igniteSpell && battleState.dotStacks.filter(d => d.spellId === 'ignite').length < 3) {
      battleState.dotStacks.push({
        ticksLeft: 3,
        interval: 1500,
        nextTickAt: Date.now() + 1500,
        dmgPerTick: 8,
        intMult,
        schoolMod,
        elementalMod,
        color: '#e67e22',
        sourceId: 'flame_wave_ignite_' + Date.now(),
        spellId: 'ignite'
      });
    }
    // Set scorch window
    battleState.scorchWindowExpireAt = Date.now() + effect.scorchWindow * 1000;
    addCombatLog(`${spell.name}: ${dmg} dmg + Ignite + Scorch window ${effect.scorchWindow}s`, spell.color);
    showDamageNumber(dmg, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    updateEnemyStatusRow();
    triggerPassives(dmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === EMBER BONUS (Pyroblast -- standard damage, extra ember stacks handled by triggerPassives) ===
  if (effect && effect.type === 'ember_bonus') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = calcDmg(base);
    battleState.enemyHP -= dmg;
    const focusLabel = wasFocused ? ' (x2 Focus!)' : '';
    addCombatLog(`${spell.name}: ${dmg} dmg${focusLabel}`, spell.color);
    showDamageNumber(dmg, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    triggerPassives(dmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === EXTRA STATIC (Gust -- standard damage + extra static handled by triggerPassives) ===
  if (effect && effect.type === 'extra_static') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = calcDmg(base);
    battleState.enemyHP -= dmg;
    addCombatLog(`${spell.name}: ${dmg} dmg${wasFocused ? ' (x2 Focus!)' : ''}`, spell.color);
    showDamageNumber(dmg, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    triggerPassives(dmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === CHILL (Frozen Tomb) ===
  if (effect && effect.type === 'chill') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = calcDmg(base);
    battleState.enemyHP -= dmg;
    // Apply chill: -70% attack speed for 2s
    battleState.chillActive = true;
    battleState.chillExpireAt = Date.now() + effect.chillDuration * 1000;
    // Post-chill slow
    battleState.enemySlowPercent = effect.postChillSlow.slowPercent;
    battleState.enemySlowExpireAt = Date.now() + (effect.chillDuration + effect.postChillSlow.duration) * 1000;
    addCombatLog(`${spell.name}: ${dmg} dmg + -70% attack speed ${effect.chillDuration}s`, spell.color);
    showDamageNumber(dmg, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    updateEnemyStatusRow();
    triggerPassives(dmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === SHIELD SCALING (Avalanche) ===
  if (effect && effect.type === 'shield_scaling') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    let dmg = calcDmg(base);
    const bonusDmg = Math.floor(battleState.shieldHP * effect.shieldDmgPercent);
    dmg += bonusDmg;
    battleState.enemyHP -= dmg;
    addCombatLog(`${spell.name}: ${dmg} dmg (${bonusDmg} from shield)${wasFocused ? ' (x2 Focus!)' : ''}`, spell.color);
    showDamageNumber(dmg, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    triggerPassives(dmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === PETRIFY (Geomancer) ===
  if (effect && effect.type === 'petrify') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = calcDmg(base);
    battleState.enemyHP -= dmg;
    battleState.petrifyActive = true;
    battleState.petrifyExpireAt = Date.now() + effect.stunDuration * 1000;
    battleState.petrifyAmpActive = true;
    battleState.petrifyAmpExpireAt = Date.now() + (effect.stunDuration + effect.damageAmpDuration) * 1000;
    addCombatLog(`${spell.name}: ${dmg} dmg + stun ${effect.stunDuration}s + +25% vulnerability`, spell.color);
    showDamageNumber(dmg, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    updateEnemyStatusRow();
    triggerPassives(dmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === MEGA SHIELD (Tectonic Shift) ===
  if (effect && effect.type === 'mega_shield') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = calcDmg(base);
    battleState.enemyHP -= dmg;
    const shieldVal = Math.min(effect.baseShield + Math.floor(battleState.mageMaxHP * effect.maxHpPercent), battleState.mageMaxHP);
    battleState.shieldHP = Math.min(battleState.shieldHP + shieldVal, battleState.mageMaxHP);
    battleState.reflectActive = true;
    battleState.reflectPercent = effect.reflectPercent;
    battleState.reflectExpireAt = Date.now() + effect.reflectDuration * 1000;
    addCombatLog(`${spell.name}: ${dmg} dmg + ${shieldVal} shield + ${Math.floor(effect.reflectPercent * 100)}% reflect`, spell.color);
    showDamageNumber(dmg, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    updateMageHP();
    triggerPassives(dmg, spell);
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // === DEFAULT: Basic damage (Arcane Bolt, Fireball, Inferno, Rock Shard, Earthen Spike, etc.) ===
  const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
  const dmg = calcDmg(base);
  battleState.enemyHP -= dmg;

  let schoolNote = '';
  if (schoolMod > 1.0) schoolNote = ' — WEAKNESS!';
  else if (schoolMod < 1.0) schoolNote = ' — RESIST';
  const focusLabel = wasFocused ? ' (x2 Focus!)' : '';

  addCombatLog(`${spell.name}: ${dmg} dmg${schoolNote}${focusLabel}`, spell.color);
  showDamageNumber(dmg, spell.color);
  await playSpellAnimation(spell, dmg);
  updateEnemyHP();
  triggerPassives(dmg, spell);
  if (battleState.enemyHP <= 0) { endBattle('win'); }
}

/**
 * Обрабатывает тики активных DoT-стаков
 */
function processDotTicks() {
  if (!battleState.active) return;
  const now = Date.now();
  let changed = false;
  const state = getState();

  for (let i = battleState.dotStacks.length - 1; i >= 0; i--) {
    const stack = battleState.dotStacks[i];
    if (now >= stack.nextTickAt) {
      // Наносим тик урона
      const tickDmg = Math.floor(stack.dmgPerTick * stack.intMult * stack.schoolMod * (stack.elementalMod || 1.0));
      battleState.enemyHP -= tickDmg;
      changed = true;
      addCombatLog(`DoT tick: ${tickDmg} damage`, stack.color);
      showDamageNumber(tickDmg, stack.color);

      // Pyromancer Ember from DoT: max 1 Ember per second per unique DoT source
      if (state.classType === 'pyromancer') {
        const sourceId = stack.sourceId || stack.spellId || 'unknown';
        const lastTs = battleState.lastEmberTickTimestamps[sourceId] || 0;
        if (now - lastTs >= 1000) {
          battleState.emberStacks += 1;
          battleState.emberDamageAccumulated += tickDmg;
          battleState.lastEmberTickTimestamps[sourceId] = now;

          if (battleState.emberStacks >= 5) {
            const bonusDmg = Math.floor(battleState.emberDamageAccumulated * 0.15);
            battleState.enemyHP -= bonusDmg;
            addCombatLog(`Combustion detonates for ${bonusDmg} bonus damage!`, '#ff6600');
            showDamageNumber(bonusDmg, '#ff6600');
            battleState.emberStacks = 0;
            battleState.emberDamageAccumulated = 0;
          }
        }
      }

      // Track total DoT damage for Backdraft
      if (!stack._totalDmgDealt) stack._totalDmgDealt = 0;
      stack._totalDmgDealt += tickDmg;

      stack.ticksLeft--;
      stack.nextTickAt = now + stack.interval;

      if (stack.ticksLeft <= 0) {
        // P14 Backdraft: when Ignite expires, explode for 50% of total DoT dealt
        if (state.classType === 'pyromancer' && (stack.spellId === 'ignite' || stack.spellId === 'cataclysm')) {
          const pBonus = aggregatePassiveBonuses(state.passives?.unlocked || []);
          if (pBonus.backdraft > 0) {
            const backdraftDmg = Math.floor(stack._totalDmgDealt * pBonus.backdraft);
            if (backdraftDmg > 0) {
              battleState.enemyHP -= backdraftDmg;
              addCombatLog(`Backdraft explosion: ${backdraftDmg} damage!`, '#ff4500');
              showDamageNumber(backdraftDmg, '#ff4500');
            }
          }
        }
        battleState.dotStacks.splice(i, 1);
      }

      if (battleState.enemyHP <= 0) {
        endBattle('win');
        return;
      }
    }
  }

  if (changed) {
    updateEnemyHP();
    updateEnemyStatusRow();
  }
}

/**
 * Планирует атаку врага
 */
function scheduleEnemyAttack(enemy) {
  if (!battleState.active) return;

  // Интервал с учётом замедления (slow) и заморозки (chill -70% скорости атаки)
  let effectiveInterval = enemy.attackInterval;
  if (battleState.chillActive) {
    // Frozen Tomb: -70% скорости атаки = интервал увеличивается в ~3.33 раза
    effectiveInterval = enemy.attackInterval / (1 - 0.70);
  } else if (battleState.enemySlowPercent > 0) {
    effectiveInterval = enemy.attackInterval / (1 - battleState.enemySlowPercent);
  }
  // Минимум 0.8с — гарантирует паузу между событиями для корректного воспроизведения анимаций
  effectiveInterval = Math.max(effectiveInterval, 0.8);

  battleState.enemyAttackTimeout = _schedule(() => {
    if (!battleState.active) return;
    performEnemyAttack(enemy);
    if (battleState.active) scheduleEnemyAttack(enemy);
  }, effectiveInterval * 1000);
}

/**
 * Враг атакует мага -- с поддержкой Evasion, Bedrock, Riptide, Chill, Petrify, Reflect
 */
function performEnemyAttack(enemy) {
  if (!battleState.active) return;

  // Petrify: enemy is stunned, skip attack
  if (battleState.petrifyActive) {
    addCombatLog('Enemy is petrified — cannot attack!', '#e67e22');
    return;
  }

  // Evasion check (Zephyr)
  if (battleState.evasionActive && Math.random() < battleState.evasionChance) {
    const avoidedDmg = enemy.attack;
    addCombatLog(`Dodge! Avoided ${avoidedDmg} damage`, '#3498db');
    // Counter-attack: 50% of avoided damage
    if (battleState.evasionCounterPercent > 0) {
      const counterDmg = Math.floor(avoidedDmg * battleState.evasionCounterPercent);
      battleState.enemyHP -= counterDmg;
      addCombatLog(`Counter-attack: ${counterDmg} damage!`, '#3498db');
      showDamageNumber(counterDmg, '#3498db');
      updateEnemyHP();
      if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    }
    return;
  }

  let dmg = enemy.attack;
  const state = getState();

  // Geomancer Bedrock: 15% DR when shield is active
  if (state.classType === 'geomancer' && battleState.shieldHP > 0) {
    dmg = Math.floor(dmg * 0.85);
  }

  // BUG-001: Apply passive damage reduction from unlocked nodes (U5: +5% DR, T10: +8% DR, etc.)
  // Uses direct import of aggregatePassiveBonuses to avoid window._passiveNodesMap race condition (BUG-005)
  const passiveDR = aggregatePassiveBonuses(state.passives?.unlocked || []).damageReduction || 0;
  if (passiveDR > 0) {
    dmg = Math.floor(dmg * (1 - passiveDR));
  }

  // Щит поглощает урон первым
  let shieldAbsorbed = 0;
  const prevShieldHP = battleState.shieldHP;
  if (battleState.shieldHP > 0) {
    shieldAbsorbed = Math.min(battleState.shieldHP, dmg);
    battleState.shieldHP -= shieldAbsorbed;
    dmg -= shieldAbsorbed;

    // Geomancer Bedrock: reflect 10% of absorbed damage
    if (state.classType === 'geomancer' && shieldAbsorbed > 0) {
      const reflectDmg = Math.floor(shieldAbsorbed * 0.10);
      if (reflectDmg > 0) {
        battleState.enemyHP -= reflectDmg;
        addCombatLog(`Bedrock reflects ${reflectDmg} damage!`, '#e67e22');
        showDamageNumber(reflectDmg, '#e67e22');
        updateEnemyHP();
        if (battleState.enemyHP <= 0) { endBattle('win'); return; }
      }
    }

    // Tectonic Shift reflect (separate from Bedrock)
    if (battleState.reflectActive && shieldAbsorbed > 0) {
      const reflectDmg = Math.floor(shieldAbsorbed * battleState.reflectPercent);
      if (reflectDmg > 0) {
        battleState.enemyHP -= reflectDmg;
        addCombatLog(`Shield reflects ${reflectDmg} damage!`, '#e67e22');
        showDamageNumber(reflectDmg, '#e67e22');
        updateEnemyHP();
        if (battleState.enemyHP <= 0) { endBattle('win'); return; }
      }
    }

    // U6 Mana Overflow: when shield is completely destroyed, deal 30% of destroyed shield as arcane damage
    const passiveIds = (state.passives && state.passives.unlocked) || [];
    if (passiveIds.includes('U6') && prevShieldHP > 0 && battleState.shieldHP <= 0) {
      const nodeMap = (typeof window !== 'undefined' && window._passiveNodesMap) || null;
      const u6Node = nodeMap && nodeMap['U6'];
      const burstPct = u6Node ? (u6Node.effect.shieldBurstDamage || 0.30) : 0.30;
      const burstDmg = Math.floor(prevShieldHP * burstPct);
      if (burstDmg > 0) {
        battleState.enemyHP -= burstDmg;
        addCombatLog(`Mana Overflow! Shield burst: ${burstDmg} arcane damage!`, '#c9a84c');
        showDamageNumber(burstDmg, '#c9a84c');
        updateEnemyHP();
        if (battleState.enemyHP <= 0) { endBattle('win'); return; }
      }
    }

    addCombatLog(
      `Enemy attacks for ${enemy.attack} — Shield absorbs ${shieldAbsorbed} (shield: ${battleState.shieldHP})`,
      '#c9a84c'
    );
    updateMageHP();
    if (dmg <= 0) return;
  } else {
    addCombatLog(`Enemy attacks for ${dmg}`, '#e74c3c');
  }

  battleState.mageHP -= dmg;

  // Визуальный удар по магу — только в обычном режиме
  if (!battleState._fastForward) {
    const mageEl = document.getElementById('combat-mage');
    if (mageEl) {
      mageEl.classList.add('mage-hit');
      setTimeout(() => mageEl.classList.remove('mage-hit'), 400);
    }
    // Спрайт: hurt-анимация, через 700ms возврат в idle (через showMageAnim чтобы избежать гонки)
    showMageAnim('hurt', 700);
  }

  updateMageHP();

  // Tidecaster Riptide: авто-хил при падении HP ниже 40%, один раз за бой
  if (state.classType === 'tidecaster' && !battleState.riptideTriggered && battleState.mageHP > 0
      && battleState.mageHP < battleState.mageMaxHP * 0.40) {
    const healAmount = Math.floor(battleState.mageMaxHP * 0.20); // 20% maxHP по спецификации
    battleState.mageHP = Math.min(battleState.mageHP + healAmount, battleState.mageMaxHP);
    battleState.riptideTriggered = true;
    // Apply Drenched (slow)
    battleState.enemySlowPercent = 0.30;
    battleState.enemySlowExpireAt = Date.now() + 5000;
    addCombatLog(`Riptide! Healed ${healAmount} HP + enemy Drenched (-30% speed, 5s)`, '#1abc9c');
    updateMageHP();
    updateEnemyStatusRow();
  }

  // U7 Second Wind: once per battle, when HP drops below 15%, heal 20% max HP
  const passiveIdsForWind = (state.passives && state.passives.unlocked) || [];
  if (
    passiveIdsForWind.includes('U7') &&
    !battleState._secondWindUsed &&
    battleState.mageHP > 0 &&
    battleState.mageHP < battleState.mageMaxHP * 0.15
  ) {
    const swHeal = Math.floor(battleState.mageMaxHP * 0.20);
    battleState.mageHP = Math.min(battleState.mageHP + swHeal, battleState.mageMaxHP);
    battleState._secondWindUsed = true;
    addCombatLog(`Second Wind! Healed ${swHeal} HP!`, '#f0c86a');
    updateMageHP();
  }

  if (battleState.mageHP <= 0) {
    // BUG-003: Phoenix Protocol (P-K2) — once per fight, resurrect with 30% HP instead of dying
    const passiveIds = (state.passives && state.passives.unlocked) || [];
    if (passiveIds.includes('P-K2') && !battleState._phoenixUsed) {
      const reviveHP = Math.floor(battleState.mageMaxHP * 0.30);
      battleState.mageHP = reviveHP;
      battleState._phoenixUsed = true;
      addCombatLog('Phoenix Protocol activated! Revived with 30% HP!', '#e67e22');
      updateMageHP();
      // Flash the mage element to signal the resurrection (только в обычном режиме)
      if (!battleState._fastForward) {
        const mageEl = document.getElementById('combat-mage');
        if (mageEl) {
          mageEl.classList.add('mage-hit');
          setTimeout(() => mageEl.classList.remove('mage-hit'), 600);
        }
      }
    } else {
      endBattle('loss');
    }
  }
}

/**
 * Мгновенный просчёт исхода боя без UI-анимаций (Skip Fight).
 *
 * Стратегия: симулируем бой через "виртуальное время" — чередуем каст мага
 * и атаки врага в порядке их временных меток (priority queue по nextAt).
 * Все механики применяются (DoT, shield, passives, cooldowns).
 * Анимационные функции уже защищены флагом _fastForward → no-op.
 */
function simulateBattle() {
  if (!battleState.active) return;

  battleState._fastForward = true;
  battleState._simTicks = 0;

  // Отменяем все pending-таймеры
  if (battleState.castTimeout)        { clearTimeout(battleState.castTimeout);        battleState.castTimeout = null; }
  if (battleState.enemyAttackTimeout) { clearTimeout(battleState.enemyAttackTimeout); battleState.enemyAttackTimeout = null; }
  if (battleState.timerInterval)      { clearInterval(battleState.timerInterval);      battleState.timerInterval = null; }
  if (battleState.dotInterval)        { clearInterval(battleState.dotInterval);        battleState.dotInterval = null; }

  const enemy = ENEMIES_DATA[battleState.enemyId];
  if (!enemy) { endBattle('loss'); return; }

  // Применяем все оставшиеся DoT-тики (весь урон за оставшиеся тики)
  for (const stack of battleState.dotStacks) {
    if (!battleState.active) break;
    while (stack.ticksLeft > 0) {
      const tickDmg = Math.floor(stack.dmgPerTick * stack.intMult * stack.schoolMod * (stack.elementalMod || 1.0));
      battleState.enemyHP -= tickDmg;
      stack.ticksLeft--;
      if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    }
  }
  battleState.dotStacks = [];

  // Принудительно детонируем Living Bombs
  for (const bomb of battleState.livingBombs) {
    if (!battleState.active) break;
    const detonationDmg = Math.floor(bomb.damage * bomb.intMult * bomb.elementalMod);
    battleState.enemyHP -= detonationDmg;
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
  }
  battleState.livingBombs = [];
  if (!battleState.active) return;

  // Виртуальная временна́я шкала (в мс): чередуем каст мага и атаки врага
  // Первый каст — сейчас (INTRO_DELAY уже прошёл); первая атака — через attackInterval
  let mageNextAt   = 0;
  let enemyNextAt  = enemy.attack > 0 ? Math.round(enemy.attackInterval * 1000) : Infinity;

  // Симуляция через простой цикл по виртуальному времени
  while (battleState.active && battleState._simTicks < FAST_FORWARD_TICK_CAP) {
    battleState._simTicks++;

    // Определяем следующее событие: кто ходит раньше
    if (mageNextAt <= enemyNextAt) {
      // Ход мага: выполняем один полный каст (без await — performCastSync)
      const spellId = battleState.grimoire[battleState.currentSlotIndex];
      const spell   = SPELLS_DATA[spellId];

      if (!spell) {
        // Пустой/несовместимый слот — пропускаем
        advanceGrimoire();
        // castTime минимальный
        mageNextAt += CAST_GAP;
        continue;
      }

      // Эффективное время каста (haste, scorch)
      let castMs = Math.round(spell.castTime * 1.35 * 1000);
      if (spell.id === 'scorch') castMs = 100;
      if (battleState.hasteRemaining > 0) {
        castMs = Math.round(castMs * (1 - battleState.hastePercent));
        battleState.hasteRemaining--;
        if (battleState.hasteRemaining <= 0) battleState.hastePercent = 0;
      }

      // Синхронный каст — performCast() async но delay() → Promise.resolve() → no-await needed
      // Используем прямой вызов (результат Promise игнорируем — все побочные эффекты
      // происходят синхронно до первого реального await в нормальном режиме;
      // в fast-forward delay() = Promise.resolve() поэтому body выполняется как microtask.
      // Вместо этого дублируем минимальную логику урона синхронно.
      _applySpellSync(spell);

      advanceGrimoire();
      mageNextAt += castMs + CAST_GAP;
    } else {
      // Ход врага
      performEnemyAttack(enemy);
      // Следующая атака через effectiveInterval с учётом slow/chill
      let atkInterval = enemy.attackInterval;
      if (battleState.chillActive)           atkInterval = enemy.attackInterval / (1 - 0.70);
      else if (battleState.enemySlowPercent) atkInterval = enemy.attackInterval / (1 - battleState.enemySlowPercent);
      atkInterval = Math.max(atkInterval, 0.8);
      enemyNextAt += Math.round(atkInterval * 1000);
    }
  }

  // Если бой всё ещё активен (тик-кап) — определяем победителя по оставшемуся HP
  if (battleState.active) {
    const result = battleState.enemyHP <= 0 ? 'win'
                 : battleState.mageHP  <= 0 ? 'loss'
                 : battleState.enemyHP < battleState.mageHP ? 'win' : 'loss';
    endBattle(result);
  }
}

/**
 * Синхронная версия логики каста для simulateBattle (fast-forward).
 * Применяет тот же урон что и performCast(), без async/await и DOM-обновлений.
 * Поддерживает все типы эффектов.
 */
function _applySpellSync(spell) {
  if (!battleState.active) return;

  const effect  = spell.effect;
  const state   = getState();
  const enemy   = ENEMIES_DATA[battleState.enemyId];
  const int     = getIntelligence();
  const intMult = 1 + (int - 5) / 100;
  const schoolMod    = enemy.resistances[spell.school] || 1.0;
  const elementalMod = getElementalModifier(state.classType, enemy.elementType);
  const debuffMod    = battleState.voidDebuffActive ? 1.15 : 1.0;
  const petrifyAmpMod = battleState.petrifyAmpActive ? 1.25 : 1.0;
  const buffMod      = (state.buffs.mana_surge && state.buffs.mana_surge.active) ? 1.25 : 1.0;
  const passiveUnlocked = (state.passives && state.passives.unlocked) || [];
  const pBonuses = aggregatePassiveBonuses(passiveUnlocked);

  let focusMod  = 1.0;
  let wasFocused = false;
  if (battleState.focusCharged) { focusMod = 2.0; battleState.focusCharged = false; wasFocused = true; }

  // Executioner (+15% vs <25% HP)
  let executionerMod = 1.0;
  if (passiveUnlocked.includes('U8')) {
    const nodeMap = (typeof window !== 'undefined' && window._passiveNodesMap) || null;
    const u8Node = nodeMap && nodeMap['U8'];
    const execBonus = u8Node ? (u8Node.effect.executioner || 0.15) : 0.15;
    if (battleState.enemyHP < battleState.enemyMaxHP * 0.25) executionerMod = 1 + execBonus;
  }

  // Infernal Momentum
  let infernalMod = 1.0;
  if (pBonuses.infernalMomentum && state.classType === 'pyromancer') {
    if (spell.school === 'fire') {
      infernalMod = 1 + battleState.infernalMomentumStacks * 0.05;
    } else {
      battleState.infernalMomentumStacks = 0;
    }
  }

  // Meltdown
  let meltdownMod = 1.0;
  if (pBonuses.meltdown > 0 && state.classType === 'pyromancer' && spell.school === 'fire') {
    if (battleState.enemyHP < battleState.enemyMaxHP * 0.30) meltdownMod = 1 + pBonuses.meltdown;
  }

  const calcDmg = (base, useSchool = true, useFocus = true, useBuff = true) =>
    Math.floor(base * intMult * (useSchool ? schoolMod : 1.0) * elementalMod * debuffMod * petrifyAmpMod * (useFocus ? focusMod : 1.0) * (useBuff ? buffMod : 1.0) * executionerMod * infernalMod * meltdownMod);

  const applyEnemyDmg = (dmg) => {
    battleState.enemyHP -= dmg;
    if (battleState.enemyHP <= 0) { endBattle('win'); return true; }
    return false;
  };

  const triggerPassivesSync = (damageDealt, sp) => {
    if (sp.passiveTrigger === false) return;
    if (state.classType === 'pyromancer') {
      const extra = sp.effect?.extraEmberStacks || 1;
      battleState.emberStacks += extra;
      battleState.emberDamageAccumulated += damageDealt;
      if (battleState.emberStacks >= 5) {
        const bonusDmg = Math.floor(battleState.emberDamageAccumulated * 0.15);
        battleState.emberStacks = 0;
        battleState.emberDamageAccumulated = 0;
        if (applyEnemyDmg(bonusDmg)) return;
      }
      if (pBonuses.infernalMomentum && sp.school === 'fire') {
        battleState.infernalMomentumStacks = Math.min(battleState.infernalMomentumStacks + 1, 5);
      }
    }
    if (state.classType === 'stormcaller') {
      const extra = sp.effect?.extraCharges || 0;
      battleState.staticCharges += 1 + extra;
      if (battleState.staticCharges >= 10) {
        const thunderDmg = 5 * state.level;
        battleState.staticCharges = 0;
        battleState.hasteRemaining = Math.max(battleState.hasteRemaining, 1);
        battleState.hastePercent   = Math.max(battleState.hastePercent, 0.50);
        if (applyEnemyDmg(thunderDmg)) return;
      }
    }
  };

  // === Utility spells ===
  if (spell.id === 'focus') {
    battleState.focusCharged = true;
    if (wasFocused) battleState.focusCharged = true; // already set
    return;
  }
  if (spell.id === 'mana_shield') {
    const shieldVal = Math.floor(40 + int * 0.8);
    battleState.shieldHP = Math.min(battleState.shieldHP + shieldVal, battleState.mageMaxHP);
    if (wasFocused) battleState.focusCharged = true;
    return;
  }
  if (effect && effect.type === 'haste') {
    battleState.hasteRemaining = effect.hasteSpells;
    battleState.hastePercent   = effect.hastePercent;
    if (wasFocused) battleState.focusCharged = true;
    return;
  }
  if (effect && effect.type === 'heal') {
    let healAmt = effect.baseHeal + Math.floor(battleState.mageMaxHP * effect.maxHpPercent);
    if (battleState.mageHP < battleState.mageMaxHP * effect.emergencyThreshold) healAmt = Math.floor(healAmt * effect.emergencyMultiplier);
    battleState.mageHP = Math.min(battleState.mageHP + healAmt, battleState.mageMaxHP);
    if (wasFocused) battleState.focusCharged = true;
    triggerPassivesSync(0, spell);
    return;
  }
  if (effect && effect.type === 'class_shield') {
    const sv = effect.baseShield + Math.floor(battleState.mageMaxHP * effect.maxHpPercent);
    battleState.shieldHP = Math.min(battleState.shieldHP + sv, battleState.mageMaxHP);
    if (wasFocused) battleState.focusCharged = true;
    triggerPassivesSync(0, spell);
    return;
  }
  if (effect && effect.type === 'fortify') {
    if (battleState.shieldHP > 0) battleState.shieldHP = Math.min(battleState.shieldHP * 2, battleState.mageMaxHP);
    else battleState.shieldHP = Math.min(effect.fallbackShield, battleState.mageMaxHP);
    if (wasFocused) battleState.focusCharged = true;
    triggerPassivesSync(0, spell);
    return;
  }

  // === Damage spells ===
  if (effect && effect.type === 'evasion') {
    const dmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    battleState.evasionActive        = true;
    battleState.evasionChance        = effect.dodgeChance;
    battleState.evasionCounterPercent = effect.counterDmgPercent;
    battleState.evasionExpireAt      = Date.now() + effect.duration * 1000;
    if (applyEnemyDmg(dmg)) return;
    triggerPassivesSync(dmg, spell);
    return;
  }
  if (spell.id === 'arcane_barrage') {
    let total = 0;
    for (let i = 0; i < 3; i++) {
      if (battleState.enemyHP <= 0) break;
      const d = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max), true, i === 0);
      total += d; battleState.enemyHP -= d;
    }
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    triggerPassivesSync(total, spell);
    return;
  }
  if (effect && effect.type === 'chain') {
    const h1 = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    const h2 = Math.floor(h1 * effect.decayPercent);
    const h3 = Math.floor(h1 * effect.decayPercent * effect.decayPercent);
    if (applyEnemyDmg(h1 + h2 + h3)) return;
    triggerPassivesSync(h1 + h2 + h3, spell);
    return;
  }
  if (effect && effect.type === 'multi_hit_static') {
    let total = 0;
    const perMin = Math.floor(spell.baseDmg.min / effect.hits);
    const perMax = Math.floor(spell.baseDmg.max / effect.hits);
    for (let i = 0; i < effect.hits; i++) {
      const d = calcDmg(randInt(perMin, perMax), true, i === 0);
      total += d; battleState.enemyHP -= d;
      if (state.classType === 'stormcaller') battleState.staticCharges += effect.extraStaticPerHit;
    }
    if (state.classType === 'stormcaller' && battleState.staticCharges >= 10) {
      const td = 5 * state.level;
      battleState.staticCharges = 0;
      battleState.hasteRemaining = Math.max(battleState.hasteRemaining, 1);
      battleState.hastePercent   = Math.max(battleState.hastePercent, 0.50);
      battleState.enemyHP -= td;
    }
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }
  if (effect && effect.type === 'double_strike') {
    let total = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    if (Math.random() < effect.procChance) total += calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max), true, false);
    if (applyEnemyDmg(total)) return;
    triggerPassivesSync(total, spell);
    return;
  }
  if (effect && effect.type === 'dot') {
    const directDmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    if (applyEnemyDmg(directDmg)) return;
    let effectiveMaxStacks = effect.maxStacks;
    if (spell.id === 'ignite' && state.classType === 'pyromancer' && pBonuses.igniteMaxStacks > 0) effectiveMaxStacks = pBonuses.igniteMaxStacks;
    if (battleState.dotStacks.length < effectiveMaxStacks) {
      // In fast-forward we apply all remaining dot damage immediately (flush each new stack)
      const totalDotDmg = Math.floor(effect.ticks * Math.floor(effect.tickDmg * intMult * schoolMod * (elementalMod || 1.0)));
      if (applyEnemyDmg(totalDotDmg)) return;
    }
    triggerPassivesSync(directDmg, spell);
    return;
  }
  if (effect && effect.type === 'persistent_dot') {
    const directDmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    if (applyEnemyDmg(directDmg)) return;
    const ticks = Math.floor(effect.duration / effect.tickInterval);
    const totalDotDmg = Math.floor(ticks * Math.floor(effect.tickDmg * intMult * (elementalMod || 1.0)));
    if (applyEnemyDmg(totalDotDmg)) return;
    triggerPassivesSync(directDmg, spell);
    return;
  }
  if (effect && effect.type === 'slow') {
    const dmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    battleState.enemySlowPercent  = effect.slowPercent;
    battleState.enemySlowExpireAt = Date.now() + effect.duration * 1000;
    if (applyEnemyDmg(dmg)) return;
    triggerPassivesSync(dmg, spell);
    return;
  }
  if (effect && effect.type === 'debuff' && effect.debuffType === 'void') {
    const dmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    battleState.voidDebuffActive   = true;
    battleState.voidDebuffExpireAt = Date.now() + effect.duration * 1000;
    if (applyEnemyDmg(dmg)) return;
    triggerPassivesSync(dmg, spell);
    return;
  }
  if (effect && (effect.type === 'lifesteal' || effect.type === 'maelstrom')) {
    const dmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    const lsPct = effect.type === 'maelstrom' ? effect.lifestealPercent : effect.percent;
    const heal  = Math.min(battleState.mageMaxHP - battleState.mageHP, Math.floor(dmg * lsPct));
    if (heal > 0) battleState.mageHP += heal;
    if (effect.type === 'maelstrom' && effect.slow) {
      battleState.enemySlowPercent  = effect.slow.slowPercent;
      battleState.enemySlowExpireAt = Date.now() + effect.slow.duration * 1000;
    }
    if (applyEnemyDmg(dmg)) return;
    triggerPassivesSync(dmg, spell);
    return;
  }
  if (effect && effect.type === 'conditional_bonus') {
    let dmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    if (effect.condition === 'target_has_ignite' && battleState.dotStacks.some(d => d.spellId === 'ignite' || d.spellId === 'cataclysm')) dmg = Math.floor(dmg * (1 + effect.bonusDmgPercent));
    if (effect.condition === 'target_is_slowed'  && battleState.enemySlowPercent > 0)  dmg = Math.floor(dmg * (1 + effect.bonusDmgPercent));
    if (effect.condition === 'mage_has_shield'   && battleState.shieldHP > 0)           dmg = Math.floor(dmg * (1 + effect.bonusDmgPercent));
    if (effect.slow) { battleState.enemySlowPercent = effect.slow.slowPercent; battleState.enemySlowExpireAt = Date.now() + effect.slow.duration * 1000; }
    if (applyEnemyDmg(dmg)) return;
    triggerPassivesSync(dmg, spell);
    return;
  }
  if (effect && effect.type === 'delayed_detonation') {
    const directDmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    if (applyEnemyDmg(directDmg)) return;
    // Детонируем немедленно (задержки нет в fast-forward)
    const detonationDmg = Math.floor(effect.detonationDmg * intMult * elementalMod);
    if (applyEnemyDmg(detonationDmg)) return;
    triggerPassivesSync(directDmg, spell);
    return;
  }
  if (effect && effect.type === 'ignite_apply') {
    const dmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    // Применяем Ignite DoT сразу
    const igniteDotDmg = Math.floor(3 * Math.floor(8 * intMult * schoolMod * (elementalMod || 1.0)));
    battleState.scorchWindowExpireAt = Date.now() + effect.scorchWindow * 1000;
    if (applyEnemyDmg(dmg)) return;
    if (applyEnemyDmg(igniteDotDmg)) return;
    triggerPassivesSync(dmg, spell);
    return;
  }
  if (effect && effect.type === 'ember_bonus') {
    const dmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    if (applyEnemyDmg(dmg)) return;
    triggerPassivesSync(dmg, spell);
    return;
  }
  if (effect && effect.type === 'extra_static') {
    const dmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    if (applyEnemyDmg(dmg)) return;
    triggerPassivesSync(dmg, spell);
    return;
  }
  if (effect && effect.type === 'chill') {
    const dmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    battleState.chillActive        = true;
    battleState.chillExpireAt      = Date.now() + effect.chillDuration * 1000;
    battleState.enemySlowPercent   = effect.postChillSlow.slowPercent;
    battleState.enemySlowExpireAt  = Date.now() + (effect.chillDuration + effect.postChillSlow.duration) * 1000;
    if (applyEnemyDmg(dmg)) return;
    triggerPassivesSync(dmg, spell);
    return;
  }
  if (effect && effect.type === 'shield_scaling') {
    const base    = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    const bonusDmg = Math.floor(battleState.shieldHP * effect.shieldDmgPercent);
    if (applyEnemyDmg(base + bonusDmg)) return;
    triggerPassivesSync(base + bonusDmg, spell);
    return;
  }
  if (effect && effect.type === 'petrify') {
    const dmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    battleState.petrifyActive    = true;
    battleState.petrifyExpireAt  = Date.now() + effect.stunDuration * 1000;
    battleState.petrifyAmpActive = true;
    battleState.petrifyAmpExpireAt = Date.now() + (effect.stunDuration + effect.damageAmpDuration) * 1000;
    if (applyEnemyDmg(dmg)) return;
    triggerPassivesSync(dmg, spell);
    return;
  }
  if (effect && effect.type === 'mega_shield') {
    const dmg      = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
    const shieldVal = Math.min(effect.baseShield + Math.floor(battleState.mageMaxHP * effect.maxHpPercent), battleState.mageMaxHP);
    battleState.shieldHP       = Math.min(battleState.shieldHP + shieldVal, battleState.mageMaxHP);
    battleState.reflectActive  = true;
    battleState.reflectPercent = effect.reflectPercent;
    battleState.reflectExpireAt = Date.now() + effect.reflectDuration * 1000;
    if (applyEnemyDmg(dmg)) return;
    triggerPassivesSync(dmg, spell);
    return;
  }

  // Default: basic damage
  const dmg = calcDmg(randInt(spell.baseDmg.min, spell.baseDmg.max));
  if (applyEnemyDmg(dmg)) return;
  triggerPassivesSync(dmg, spell);
}

/**
 * Завершает бой с указанным результатом
 */
function endBattle(result) {
  if (!battleState.active) return;
  battleState.active = false;

  // Остановка всех таймеров
  clearTimeout(battleState.castTimeout);
  clearTimeout(battleState.enemyAttackTimeout);
  clearInterval(battleState.timerInterval);
  clearInterval(battleState.dotInterval);

  // Спрайт смерти — показываем при поражении, idle не возвращаем
  if (result === 'loss') {
    showMageAnim('death'); // без returnToIdleMs — остаётся на смерти
  }

  const state = getState();
  const enemy = ENEMIES_DATA[battleState.enemyId];

  // === Бой в башне: обычная боевая бухгалтерия не применяется ===
  // Счётчики, буффы и награды управляются через tower.js
  if (_isTowerCombat) {
    saveState();
    // Тикаем баффы и в башенном бою — иначе длительность не уменьшается
    const expiredBuffs = tickBuffs();
    const mageHPLeft    = Math.max(0, battleState.mageHP);
    const shieldHPLeft  = Math.max(0, battleState.shieldHP);
    setTimeout(() => {
      if (_onBattleEnd) {
        _onBattleEnd({
          result,
          won: result === 'win',
          isTowerCombat: true,
          goldEarned: 0,
          xpEarned: 0,
          droppedItem: null,
          fightsLeft: FIGHTS_LIMIT - state.combat.fightsToday,
          levelUps: [],
          expiredBuffs,
          enemyName: enemy.name,
          enemyHPLeft: Math.max(0, battleState.enemyHP),
          mageHPLeft,
          shieldHPLeft,  // передаём щит для carryover следующего этажа
          elapsedTime: battleState.elapsedTime
        });
      }
    }, 600);
    return;
  }

  // === Обычный бой (не башня) ===
  state.combat.fightsToday++;
  state.combat.lastFightDate = new Date().toDateString();

  let goldEarned = 0;
  let xpEarned = 0;
  let droppedItem = null;

  if (result === 'win') {
    state.combat.consecutiveWins++;
    goldEarned = randInt(enemy.goldReward.min, enemy.goldReward.max);
    xpEarned = enemy.xpReward;

    // Shadow Dust buff — ×2 XP
    if (state.buffs?.shadow_dust_buff?.active) xpEarned *= 2;

    // Crystal Fortune buff — +15 bonus gold
    if (state.buffs.crystal_fortune && state.buffs.crystal_fortune.active) {
      goldEarned += 15;
    }

    // Passive bonuses: U2 Quick Study (+xpBonus), U3 Fortune Seeker (+goldBonus)
    const passiveIds = (state.passives && state.passives.unlocked) || [];
    const nodeMap = (typeof window !== 'undefined' && window._passiveNodesMap) || null;
    if (nodeMap && passiveIds.length > 0) {
      let xpMult = 1.0;
      let goldMult = 1.0;
      for (const id of passiveIds) {
        const node = nodeMap[id];
        if (!node) continue;
        if (node.effect.xpBonus)   xpMult   += node.effect.xpBonus;
        if (node.effect.goldBonus) goldMult  += node.effect.goldBonus;
      }
      xpEarned   = Math.floor(xpEarned   * xpMult);
      goldEarned  = Math.floor(goldEarned * goldMult);
    }

    // Квест "The Severed Finger" — дроп кольца при победе над Skeleton Warrior.
    // Проверяем ПЕРВЫМ: кольцо и обычный лут не выпадают одновременно.
    if (
      battleState.enemyId === 'skeleton_warrior' &&
      state.questSeveredFinger?.status === 'active' &&
      (state.inventory.skeleton_iron_ring || 0) === 0
    ) {
      addItemToInventory('skeleton_iron_ring');
      droppedItem = 'skeleton_iron_ring'; // показать в result-popup как дроп
    } else if (Math.random() < 0.05) {
      // 5% шанс обычного дропа предмета (только если кольцо не выпало)
      droppedItem = rollItemDrop();
      addItemToInventory(droppedItem);
    }
  } else if (result === 'loss') {
    state.combat.consecutiveWins = 0;
    goldEarned = Math.floor(randInt(enemy.goldReward.min, enemy.goldReward.max) * 0.5);
    xpEarned = Math.floor(enemy.xpReward * 0.5);
  } else {
    // timeout — ничья
    state.combat.consecutiveWins = 0;
    goldEarned = Math.floor(randInt(enemy.goldReward.min, enemy.goldReward.max) * 0.3);
    xpEarned = Math.floor(enemy.xpReward * 0.3);
  }

  saveState();
  const expiredBuffs = tickBuffs();
  addGold(goldEarned);
  const levelUps = addXP(xpEarned);

  setTimeout(() => {
    if (_onBattleEnd) {
      _onBattleEnd({
        result,        // 'win' | 'loss' | 'timeout'
        won: result === 'win',
        isTowerCombat: false,
        goldEarned,
        xpEarned,
        droppedItem,
        fightsLeft: FIGHTS_LIMIT - state.combat.fightsToday,
        levelUps,
        expiredBuffs,
        enemyName: enemy.name,
        enemyHPLeft: Math.max(0, battleState.enemyHP),
        mageHPLeft: Math.max(0, battleState.mageHP),
        shieldHPLeft: 0,
        elapsedTime: battleState.elapsedTime
      });
    }
  }, 600);
}

// ===== АНИМАЦИИ =====

/**
 * Задержка — в режиме _fastForward резолвится мгновенно
 */
function delay(ms) {
  if (battleState._fastForward) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Анимация Focus (маг заряжается) — no-op при fast-forward
 */
async function playFocusAnimation() {
  if (battleState._fastForward) return;
  const mageEl = document.getElementById('combat-mage');
  if (!mageEl) return;

  mageEl.classList.add('mage-focusing');
  // hurt-анимация используется как «заряжающийся» спрайт (reuse)
  showMageAnim('hurt');

  // Индикатор над магом
  let indicator = document.getElementById('focus-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'focus-charged-indicator';
    indicator.id = 'focus-indicator';
    indicator.textContent = 'FOCUS x2';
    mageEl.appendChild(indicator);
  }

  await delay(900);
  mageEl.classList.remove('mage-focusing');
  showMageAnim('idle');
}

/**
 * Анимация Mana Shield — no-op при fast-forward
 */
async function playShieldAnimation(shieldVal) {
  if (battleState._fastForward) return;
  const mageEl = document.getElementById('combat-mage');
  if (!mageEl) return;

  mageEl.classList.add('mage-shielded');

  const floatEl = document.createElement('div');
  floatEl.className = 'damage-number';
  floatEl.textContent = `+${shieldVal} shield`;
  floatEl.style.color = '#c9a84c';
  floatEl.style.textShadow = '0 0 10px rgba(201,168,76,0.8)';
  mageEl.appendChild(floatEl);
  setTimeout(() => floatEl.remove(), 1200);

  await delay(700);
  mageEl.classList.remove('mage-shielded');
}

/**
 * Анимация полёта снаряда заклинания — no-op при fast-forward
 */
async function playSpellAnimation(spell, damage) {
  if (battleState._fastForward) return;
  const mageEl = document.getElementById('combat-mage');
  const enemyEl = document.getElementById('combat-enemy');
  const projectileEl = document.getElementById('spell-projectile');

  if (!mageEl || !enemyEl || !projectileEl) return;

  // Маг начинает каст — показываем attack-анимацию с перезапуском webp
  mageEl.classList.add('mage-casting');
  showMageAnim('attack');

  // Убираем Focus индикатор
  const indicator = document.getElementById('focus-indicator');
  if (indicator && !battleState.focusCharged) indicator.remove();

  await delay(150);

  // Настраиваем снаряд
  projectileEl.className = 'spell-projectile';
  projectileEl.style.display = 'flex';
  projectileEl.style.background = spell.color;
  projectileEl.style.boxShadow = `0 0 20px ${spell.glowColor}, 0 0 40px ${spell.glowColor}`;
  projectileEl.textContent = getSpellEmoji(spell.school);

  // Запускаем анимацию
  void projectileEl.offsetWidth;
  projectileEl.classList.add('spell-arcane');

  await delay(600);

  // Попадание
  projectileEl.style.display = 'none';
  enemyEl.classList.add('dummy-hit');

  await delay(350);

  enemyEl.classList.remove('dummy-hit');
  mageEl.classList.remove('mage-casting');

  // Возвращаем idle — showMageAnim сбросит любой pending _animTimer
  showMageAnim('idle');
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
 * Всплывающая цифра урона — пропускаем при fast-forward
 */
function showDamageNumber(damage, color) {
  if (battleState._fastForward) return;
  const enemyEl = document.getElementById('combat-enemy');
  if (!enemyEl) return;

  const dmgEl = document.createElement('div');
  dmgEl.className = 'damage-number';
  dmgEl.textContent = `-${damage}`;
  dmgEl.style.color = color;
  dmgEl.style.textShadow = `0 0 10px ${color}`;
  enemyEl.appendChild(dmgEl);
  setTimeout(() => dmgEl.remove(), 1200);
}

// ===== UI =====

/**
 * Рендерит начальное состояние боевого UI
 */
function renderBattleUI(enemy) {
  // Enemy
  const enemyImg = document.getElementById('enemy-img');
  if (enemyImg) {
    enemyImg.src = enemy.img || 'assets/generated/training_dummy.png';
    enemyImg.alt = enemy.name;
  }
  const enemyLabel = document.getElementById('enemy-label');
  if (enemyLabel) enemyLabel.textContent = enemy.name;

  // HP bars
  updateMageHP();
  updateEnemyHP();
  updateEnemyStatusRow();

  // Grimoire Tracker
  renderGrimoireTracker();

  // Лог
  const logEl = document.getElementById('combat-log');
  if (logEl) logEl.innerHTML = '';

  // Таймер
  updateTimerDisplay();

  addCombatLog(`Battle started vs ${enemy.name}!`, '#c9a84c');

  // Лор-подсказка при первом бою — показываем один раз и прячем через 8 сек
  showCombatLoreHintIfFirst();
}

/**
 * Показывает лор-подсказку при первом бою, потом скрывает через 8 секунд
 */
function showCombatLoreHintIfFirst() {
  const HINT_KEY = 'veyra_combat_hint_shown';
  if (localStorage.getItem(HINT_KEY)) return;

  const hint = document.getElementById('combat-lore-hint');
  if (!hint) return;

  hint.style.display = 'block';
  hint.classList.remove('fading');

  // Через 8 секунд — анимация исчезновения, потом скрываем
  setTimeout(() => {
    hint.classList.add('fading');
    setTimeout(() => { hint.style.display = 'none'; }, 650);
  }, 8000);

  // Запоминаем что уже показали
  localStorage.setItem(HINT_KEY, '1');
}

/**
 * Обновляет HP бар и текст мага — пропускаем при fast-forward
 */
function updateMageHP() {
  if (battleState._fastForward) return;
  const hpBar = document.getElementById('mage-hp-bar');
  const hpText = document.getElementById('mage-hp-text');
  const hpDisplay = document.getElementById('combat-mage-hp-display');
  const shieldDisplay = document.getElementById('mage-shield-display');
  const shieldVal = document.getElementById('mage-shield-val');

  const current = Math.max(0, battleState.mageHP);
  const max = battleState.mageMaxHP;
  const percent = (current / max) * 100;

  if (hpBar) {
    hpBar.style.width = `${percent}%`;
    hpBar.classList.toggle('hp-critical', percent <= 25);
    hpBar.style.background = percent > 60
      ? 'linear-gradient(90deg, #2ecc71, #27ae60)'
      : percent > 30
        ? 'linear-gradient(90deg, #f39c12, #e67e22)'
        : 'linear-gradient(90deg, #e74c3c, #c0392b)';
  }
  if (hpText) hpText.textContent = `${current} / ${max}`;
  if (hpDisplay) hpDisplay.textContent = `HP: ${current} / ${max}`;

  // Щит
  if (shieldDisplay) {
    shieldDisplay.style.display = battleState.shieldHP > 0 ? 'block' : 'none';
  }
  if (shieldVal) shieldVal.textContent = battleState.shieldHP;
}

/**
 * Обновляет HP бар и текст врага — пропускаем при fast-forward
 */
function updateEnemyHP() {
  if (battleState._fastForward) return;
  const hpBar = document.getElementById('enemy-hp-bar');
  const hpText = document.getElementById('enemy-hp-text');

  const current = Math.max(0, battleState.enemyHP);
  const max = battleState.enemyMaxHP;
  const percent = (current / max) * 100;

  if (hpBar) {
    hpBar.style.width = `${percent}%`;
    hpBar.classList.toggle('hp-critical', percent <= 25);
    hpBar.style.background = percent > 60
      ? 'linear-gradient(90deg, #2ecc71, #27ae60)'
      : percent > 30
        ? 'linear-gradient(90deg, #f39c12, #e67e22)'
        : 'linear-gradient(90deg, #e74c3c, #c0392b)';
  }
  if (hpText) hpText.textContent = `${current} / ${max}`;
}

/**
 * Обновляет строку статусов врага (slow, DoT, debuff) — пропускаем при fast-forward
 */
function updateEnemyStatusRow() {
  if (battleState._fastForward) return;
  const row = document.getElementById('enemy-status-row');
  if (!row) return;
  row.innerHTML = '';

  if (battleState.enemySlowPercent > 0) {
    const tag = document.createElement('span');
    tag.className = 'enemy-status-tag enemy-slow';
    tag.textContent = `-${Math.floor(battleState.enemySlowPercent * 100)}% slow`;
    row.appendChild(tag);
  }
  if (battleState.dotStacks.length > 0) {
    const tag = document.createElement('span');
    tag.className = 'enemy-status-tag enemy-dot';
    tag.textContent = `DoT x${battleState.dotStacks.length}`;
    row.appendChild(tag);
  }
  if (battleState.voidDebuffActive) {
    const tag = document.createElement('span');
    tag.className = 'enemy-status-tag enemy-void';
    tag.textContent = '+15% dmg';
    row.appendChild(tag);
  }
}

/**
 * Добавляет строку в лог боя
 */
function addCombatLog(text, color = '#c9a84c') {
  const logEl = document.getElementById('combat-log');
  if (!logEl) return;

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.style.color = color;
  entry.textContent = `> ${text}`;

  logEl.appendChild(entry);

  // Оставляем максимум 20 записей для производительности
  while (logEl.children.length > 20) {
    logEl.removeChild(logEl.firstChild);
  }
  logEl.scrollTop = logEl.scrollHeight;
}

// updateTimerDisplay удалён — бой теперь без таймера обратного отсчёта

/**
 * Рендерит Grimoire Tracker в боевом экране
 */
function renderGrimoireTracker() {
  const tracker = document.getElementById('grimoire-tracker');
  if (!tracker) return;
  tracker.innerHTML = '';

  battleState.grimoire.forEach((spellId, index) => {
    const spell = SPELLS_DATA[spellId];
    const slot = document.createElement('div');
    slot.className = 'tracker-slot';
    slot.id = `tracker-slot-${index}`;
    slot.dataset.index = index;

    if (spell) {
      slot.style.setProperty('--spell-color', spell.color);
      // Use PNG icon if available, otherwise fall back to emoji
      const iconContent = spell.img
        ? `<img src="${spell.img}" alt="${spell.name}" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated">`
        : `<span style="color:${spell.color}">${spell.emoji || getSpellEmoji(spell.school)}</span>`;
      slot.innerHTML = `
        <div class="tracker-slot-icon" style="border-color:${spell.color};box-shadow:0 0 8px ${spell.glowColor}">
          ${iconContent}
        </div>
        <div class="tracker-slot-name" style="color:${spell.color}">${spell.name}</div>
      `;
    }
    tracker.appendChild(slot);
  });
}

/**
 * Подсвечивает текущий активный слот в Grimoire Tracker
 */
function updateGrimoireTracker() {
  const slots = document.querySelectorAll('.tracker-slot');
  slots.forEach((slot, i) => {
    slot.classList.toggle('tracker-slot-active', i === battleState.currentSlotIndex);
    slot.classList.toggle('tracker-slot-next', i === (battleState.currentSlotIndex + 1) % battleState.grimoire.length);
  });
}

/**
 * Возвращает оставшееся количество боёв
 */
export function getFightsRemaining() {
  return 999; // TODO: вернуть лимит для production
}
