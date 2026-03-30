/**
 * combat.js — Grimoire Autocast боевая система
 * Маг автоматически кастует заклинания из гримуара по кругу.
 * Враг атакует мага по таймеру. Игрок только наблюдает.
 */

import {
  getState, saveState, getBonusPower, getStats,
  addXP, addGold, addItemToInventory,
  rollItemDrop, checkDailyReset, tickBuffs, getActiveBuffs,
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
  shieldHP: 0,          // HP щита (Mana Shield)
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
  dotInterval: null     // setInterval для DoT тиков
};

// Колбек окончания боя
let _onBattleEnd = null;

/**
 * Устанавливает колбек окончания боя (вызывается из main.js)
 */
export function setOnBattleEnd(callback) {
  _onBattleEnd = callback;
}

/**
 * Возвращает максимальное HP мага по формуле:
 * 100 + (level - 1) * 15 + floor(BonusPower * 0.5)
 */
function calcMageMaxHP() {
  const state = getState();
  const bp = getBonusPower();
  let base = 100 + (state.level - 1) * 15 + Math.floor(bp * 0.5);
  if (state.buffs?.iron_flask_buff?.active) base += 40;
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
 */
export function initBattle(enemyId) {
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

  const mageMaxHP = calcMageMaxHP();

  // Сброс состояния боя
  battleState = {
    active: true,
    mageHP: mageMaxHP,
    mageMaxHP,
    shieldHP: 0,
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
    dotInterval: null
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
      updateEnemyStatusRow();
    }

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

  // Обновляем трекер — подсвечиваем текущий слот
  updateGrimoireTracker();

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
  }, spell.castTime * 1000);
}

/**
 * Сдвигает индекс гримуара к следующему слоту
 */
function advanceGrimoire() {
  battleState.currentSlotIndex = (battleState.currentSlotIndex + 1) % battleState.grimoire.length;
}

/**
 * Выполняет каст заклинания
 */
async function performCast(spell) {
  if (!battleState.active) return;

  const effect = spell.effect;

  // === UTILITY спеллы (без урона) ===

  if (spell.school === 'utility' && spell.id === 'focus') {
    // Focus — следующий атакующий каст x2
    if (battleState.focusCharged) {
      addCombatLog('Focus already active — wasted!', spell.color);
    } else {
      battleState.focusCharged = true;
      addCombatLog('Focus activated — next spell x2.0', spell.color);
      await playFocusAnimation();
    }
    return;
  }

  if (spell.id === 'mana_shield') {
    // Создаём или перезаписываем щит
    const int = getIntelligence();
    const shieldVal = Math.floor(40 + int * 0.8);
    battleState.shieldHP = shieldVal;
    addCombatLog(`Mana Shield: +${shieldVal} HP shield`, spell.color);
    await playShieldAnimation(shieldVal);
    updateMageHP();
    return;
  }

  // === АТАКУЮЩИЕ ЗАКЛИНАНИЯ ===

  const enemy = ENEMIES_DATA[battleState.enemyId];
  const int = getIntelligence();

  // INT_multiplier
  const intMult = 1 + (int - 5) / 100;

  // school_modifier из данных врага
  const schoolMod = enemy.resistances[spell.school] || 1.0;

  // debuff_modifier (Void Eruption)
  const debuffMod = battleState.voidDebuffActive ? 1.15 : 1.0;

  // focus_modifier
  let focusMod = 1.0;
  let wasFocused = false;
  if (battleState.focusCharged) {
    focusMod = 2.0;
    battleState.focusCharged = false;
    wasFocused = true;
  }

  // buff_modifier (Mana Surge)
  const state = getState();
  const buffMod = (state.buffs.mana_surge && state.buffs.mana_surge.active) ? 1.25 : 1.0;

  // Для Arcane Barrage — 3 попадания
  if (spell.id === 'arcane_barrage') {
    let totalDmg = 0;
    for (let i = 0; i < 3; i++) {
      const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
      const dmg = Math.floor(base * intMult * schoolMod * debuffMod * (i === 0 ? focusMod : 1.0) * buffMod);
      totalDmg += dmg;
      battleState.enemyHP -= dmg;
    }
    showDamageNumber(totalDmg, spell.color);
    const focusLabel = wasFocused ? ' (x2 Focus on first hit!)' : '';
    addCombatLog(`${spell.name} hits for ${totalDmg} (3 missiles)${focusLabel}`, spell.color);
    await playSpellAnimation(spell, totalDmg);
    updateEnemyHP();
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // DoT: Ignite
  if (effect && effect.type === 'dot') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const directDmg = Math.floor(base * intMult * schoolMod * debuffMod * focusMod * buffMod);
    battleState.enemyHP -= directDmg;

    // Добавляем стак DoT (максимум 3)
    if (battleState.dotStacks.length < effect.maxStacks) {
      battleState.dotStacks.push({
        ticksLeft: effect.ticks,
        interval: effect.interval * 1000,
        nextTickAt: Date.now() + effect.interval * 1000,
        dmgPerTick: effect.tickDmg,
        intMult,
        schoolMod,
        color: spell.color
      });
      addCombatLog(`${spell.name}: ${directDmg} dmg + DoT stack (${battleState.dotStacks.length}/${effect.maxStacks})`, spell.color);
    } else {
      addCombatLog(`${spell.name}: ${directDmg} dmg (DoT stacks maxed)`, spell.color);
    }
    await playSpellAnimation(spell, directDmg);
    updateEnemyHP();
    updateEnemyStatusRow();
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // Slow: Frost Spike / Blizzard
  if (effect && effect.type === 'slow') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = Math.floor(base * intMult * schoolMod * debuffMod * focusMod * buffMod);
    battleState.enemyHP -= dmg;

    battleState.enemySlowPercent = effect.slowPercent;
    battleState.enemySlowExpireAt = Date.now() + effect.duration * 1000;

    const slowPct = Math.floor(effect.slowPercent * 100);
    const focusLabel = wasFocused ? ' (x2 Focus!)' : '';
    addCombatLog(`${spell.name}: ${dmg} dmg + -${slowPct}% attack speed${focusLabel}`, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    updateEnemyStatusRow();
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // Void debuff
  if (effect && effect.type === 'debuff' && effect.debuffType === 'void') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = Math.floor(base * intMult * schoolMod * debuffMod * focusMod * buffMod);
    battleState.enemyHP -= dmg;

    battleState.voidDebuffActive = true;
    battleState.voidDebuffExpireAt = Date.now() + effect.duration * 1000;

    const focusLabel = wasFocused ? ' (x2 Focus!)' : '';
    addCombatLog(`${spell.name}: ${dmg} dmg + Void Debuff +15%${focusLabel}`, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    updateEnemyStatusRow();
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // Lifesteal: Shadow Bolt / Drain Life
  if (effect && effect.type === 'lifesteal') {
    const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
    const dmg = Math.floor(base * intMult * schoolMod * debuffMod * focusMod * buffMod);
    battleState.enemyHP -= dmg;

    // Лайфстил — хилит мага (не больше недостающего HP, не хилит щит)
    const missingHP = battleState.mageMaxHP - battleState.mageHP;
    const heal = Math.min(missingHP, Math.floor(dmg * effect.percent));
    if (heal > 0) {
      battleState.mageHP += heal;
    }

    const healPct = Math.floor(effect.percent * 100);
    const focusLabel = wasFocused ? ' (x2 Focus!)' : '';
    addCombatLog(`${spell.name}: ${dmg} dmg + healed ${heal} HP (${healPct}% lifesteal)${focusLabel}`, spell.color);
    await playSpellAnimation(spell, dmg);
    updateEnemyHP();
    updateMageHP();
    if (battleState.enemyHP <= 0) { endBattle('win'); return; }
    return;
  }

  // Базовый урон (Arcane Bolt, Fireball, Inferno и др.)
  const base = randInt(spell.baseDmg.min, spell.baseDmg.max);
  const dmg = Math.floor(base * intMult * schoolMod * debuffMod * focusMod * buffMod);
  battleState.enemyHP -= dmg;

  // Школьный модификатор в логе
  let schoolNote = '';
  if (schoolMod > 1.0) schoolNote = ' — WEAKNESS!';
  else if (schoolMod < 1.0) schoolNote = ' — RESIST';
  const focusLabel = wasFocused ? ' (x2 Focus!)' : '';

  addCombatLog(`${spell.name}: ${dmg} dmg${schoolNote}${focusLabel}`, spell.color);
  await playSpellAnimation(spell, dmg);
  updateEnemyHP();
  if (battleState.enemyHP <= 0) { endBattle('win'); }
}

/**
 * Обрабатывает тики активных DoT-стаков
 */
function processDotTicks() {
  if (!battleState.active) return;
  const now = Date.now();
  let changed = false;

  for (let i = battleState.dotStacks.length - 1; i >= 0; i--) {
    const stack = battleState.dotStacks[i];
    if (now >= stack.nextTickAt) {
      // Наносим тик урона
      const tickDmg = Math.floor(stack.dmgPerTick * stack.intMult * stack.schoolMod);
      battleState.enemyHP -= tickDmg;
      changed = true;
      addCombatLog(`DoT tick: ${tickDmg} fire damage`, stack.color);
      showDamageNumber(tickDmg, stack.color);

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

  // Интервал с учётом замедления
  const effectiveInterval = battleState.enemySlowPercent > 0
    ? enemy.attackInterval / (1 - battleState.enemySlowPercent)
    : enemy.attackInterval;

  battleState.enemyAttackTimeout = setTimeout(() => {
    if (!battleState.active) return;
    performEnemyAttack(enemy);
    scheduleEnemyAttack(enemy);
  }, effectiveInterval * 1000);
}

/**
 * Враг атакует мага
 */
function performEnemyAttack(enemy) {
  if (!battleState.active) return;

  let dmg = enemy.attack;

  // Щит поглощает урон первым
  if (battleState.shieldHP > 0) {
    const absorbed = Math.min(battleState.shieldHP, dmg);
    battleState.shieldHP -= absorbed;
    dmg -= absorbed;
    addCombatLog(
      `Enemy attacks for ${enemy.attack} — Shield absorbs ${absorbed} (shield: ${battleState.shieldHP})`,
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

    // 5% шанс дропа предмета
    if (Math.random() < 0.05) {
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
        goldEarned,
        xpEarned,
        droppedItem,
        fightsLeft: FIGHTS_LIMIT - state.combat.fightsToday,
        levelUps,
        expiredBuffs,
        enemyName: enemy.name,
        enemyHPLeft: Math.max(0, battleState.enemyHP),
        mageHPLeft: Math.max(0, battleState.mageHP),
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
  showDamageNumber(damage, spell.color);

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
