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

// Экспортируем данные для обратной совместимости с main.js
export { SPELLS_DATA as SPELLS };

// Константы
const BATTLE_TIMEOUT = 60;    // секунд до ничьей
const FIGHTS_LIMIT   = 5;
const CAST_GAP       = 300;   // мс пауза между кастами
const INTRO_DELAY    = 800;   // мс задержка перед первым кастом

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
  livingBombs: []                // Pyromancer: [{detonateAt, damage, intMult, elementalMod}]
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

  // Фильтруем null из гримуара
  const activeSlots = state.grimoire.filter(id => id !== null);
  if (activeSlots.length < 3) return false;

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
    _secondWindUsed: false  // U7: resets each fight
  };

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
    updateTimerDisplay();

    // Timeout — ничья
    if (battleState.elapsedTime >= BATTLE_TIMEOUT) {
      endBattle('timeout');
    }
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
 */
function scheduleNextCast() {
  if (!battleState.active) return;

  const spellId = battleState.grimoire[battleState.currentSlotIndex];
  const spell = SPELLS_DATA[spellId];
  if (!spell) {
    // Пустой слот — пропускаем
    advanceGrimoire();
    scheduleNextCast();
    return;
  }

  // Проверка ограничения класса: если заклинание недоступно — показываем сообщение и пропускаем
  const state = getState();
  if (spell.classRestriction !== null && spell.classRestriction !== undefined && spell.classRestriction !== state.classType) {
    // Капитализируем название класса для сообщения
    const className = spell.classRestriction.charAt(0).toUpperCase() + spell.classRestriction.slice(1);
    addCombatLog(`${spell.name}: Requires ${className}`, '#888');
    advanceGrimoire();
    // Небольшая пауза чтобы лог не спамил при нескольких нессовместимых слотах подряд
    battleState.castTimeout = setTimeout(() => {
      if (battleState.active) scheduleNextCast();
    }, CAST_GAP);
    return;
  }

  // Обновляем трекер — подсвечиваем текущий слот
  updateGrimoireTracker();

  // Calculate effective cast time (haste, scorch window)
  let effectiveCastTime = spell.castTime;

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
  battleState.castTimeout = setTimeout(async () => {
    if (!battleState.active) return;
    await performCast(spell);
    if (battleState.active) {
      advanceGrimoire();
      // Пауза между кастами перед следующим
      battleState.castTimeout = setTimeout(() => {
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

  // Helper: calculate standard damage
  const calcDmg = (base, useSchool = true, useFocus = true, useBuff = true) => {
    return Math.floor(base * intMult * (useSchool ? schoolMod : 1.0) * elementalMod * debuffMod * petrifyAmpMod * (useFocus ? focusMod : 1.0) * (useBuff ? buffMod : 1.0) * executionerMod);
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
    if (battleState.dotStacks.length < effect.maxStacks) {
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
      addCombatLog(`${spell.name}: ${directDmg} dmg + DoT stack (${battleState.dotStacks.length}/${effect.maxStacks})`, spell.color);
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

      stack.ticksLeft--;
      stack.nextTickAt = now + stack.interval;

      if (stack.ticksLeft <= 0) {
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

  battleState.enemyAttackTimeout = setTimeout(() => {
    if (!battleState.active) return;
    performEnemyAttack(enemy);
    scheduleEnemyAttack(enemy);
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

  // Визуальный удар по магу
  const mageEl = document.getElementById('combat-mage');
  if (mageEl) {
    mageEl.classList.add('mage-hit');
    setTimeout(() => mageEl.classList.remove('mage-hit'), 400);
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
    endBattle('loss');
  }
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

  const state = getState();
  const enemy = ENEMIES_DATA[battleState.enemyId];

  // === Бой в башне: обычная боевая бухгалтерия не применяется ===
  // Счётчики, буффы и награды управляются через tower.js
  if (_isTowerCombat) {
    saveState();
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
          expiredBuffs: [],
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
 * Задержка
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Анимация Focus (маг заряжается)
 */
async function playFocusAnimation() {
  const mageEl = document.getElementById('combat-mage');
  if (!mageEl) return;

  mageEl.classList.add('mage-focusing');
  const idleImg = document.getElementById('mage-img-idle');
  const defendVid = document.getElementById('mage-video-defend');
  if (idleImg) idleImg.classList.add('mage-sprite-hidden');
  if (defendVid) { defendVid.classList.remove('mage-sprite-hidden'); defendVid.currentTime = 0; defendVid.play(); }

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
  if (defendVid) defendVid.classList.add('mage-sprite-hidden');
  if (idleImg) idleImg.classList.remove('mage-sprite-hidden');
}

/**
 * Анимация Mana Shield
 */
async function playShieldAnimation(shieldVal) {
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
 * Анимация полёта снаряда заклинания
 */
async function playSpellAnimation(spell, damage) {
  const mageEl = document.getElementById('combat-mage');
  const enemyEl = document.getElementById('combat-enemy');
  const projectileEl = document.getElementById('spell-projectile');

  if (!mageEl || !enemyEl || !projectileEl) return;

  // Маг начинает каст
  mageEl.classList.add('mage-casting');
  const idleImg = document.getElementById('mage-img-idle');
  const attackVid = document.getElementById('mage-video-attack');
  if (idleImg) idleImg.classList.add('mage-sprite-hidden');
  if (attackVid) { attackVid.classList.remove('mage-sprite-hidden'); attackVid.currentTime = 0; attackVid.play(); }

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

  if (attackVid) attackVid.classList.add('mage-sprite-hidden');
  if (idleImg) idleImg.classList.remove('mage-sprite-hidden');
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
 * Всплывающая цифра урона
 */
function showDamageNumber(damage, color) {
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
 * Обновляет HP бар и текст мага
 */
function updateMageHP() {
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
 * Обновляет HP бар и текст врага
 */
function updateEnemyHP() {
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
 * Обновляет строку статусов врага (slow, DoT, debuff)
 */
function updateEnemyStatusRow() {
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

/**
 * Обновляет отображение таймера
 */
function updateTimerDisplay() {
  const el = document.getElementById('combat-timer');
  if (!el) return;
  const remaining = Math.max(0, BATTLE_TIMEOUT - battleState.elapsedTime);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  el.classList.toggle('timer-critical', remaining <= 10);
}

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
      slot.innerHTML = `
        <div class="tracker-slot-icon" style="border-color:${spell.color};box-shadow:0 0 8px ${spell.glowColor}">
          <span style="color:${spell.color}">${getSpellEmoji(spell.school)}</span>
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
