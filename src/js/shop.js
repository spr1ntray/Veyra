/**
 * shop.js — магазин торговца Morthis Dray
 * Содержит диалоги, триггерную логику реплик и рендер товаров
 */
import { getState, saveState, ITEMS_DATA, buyItem } from './state.js';
import { updateHUD, showNotification } from './ui.js';

// Предметы в ассортименте магазина
const SHOP_ITEMS = ['mana_elixir', 'crystal_shard', 'iron_flask', 'shadow_dust'];

// Скидка за выполнение квеста (10% на расходники)
const QUEST_DISCOUNT = 0.10;

// ===== ДИАЛОГИ MORTHIS DRAY =====

/**
 * Полный набор реплик торговца, сгруппированных по триггерам.
 * Структура: { triggerId: [строки...] }
 */
const MERCHANT_DIALOGUE = {

  // Случайные приветствия при открытии магазина
  shop_open_random: [
    "Still breathing. That puts you ahead of my last three regulars.",
    "Everything you see here is battle-tested. The testers didn't all make it, but that's beside the point.",
    "Business is good when the world is bad. You're keeping me comfortable.",
    "Don't touch what you can't afford. That includes the flask.",
    "I restocked last night. Didn't sleep, but the shelves look better than I do.",
    "What can I say — death is steady work, and I'm the man between you and it.",
    "Looking to spend or looking to browse? One of those I charge extra for."
  ],

  // Первый визит
  first_visit: [
    "New face. Good. The old ones keep coming back and that's starting to feel like a bad sign."
  ],

  // Мало золота при открытии (< 30)
  shop_open_gold_under_30: [
    "Looking is free. Touching is not. Buying is currently theoretical for you."
  ],

  // Реплики после выбора класса (пробуждение) — общая
  post_awakening: [
    "You've chosen your path. Good. Mages who stay undecided tend to stay dead."
  ],

  // Реплики после пробуждения — специфичные по классу
  post_awakening_pyromancer: [
    "A Pyromancer. I'll keep flammables behind the counter from now on."
  ],
  post_awakening_stormcaller: [
    "Stormcaller. Don't cast anything near the glassware."
  ],
  post_awakening_tidecaster: [
    "A Tidecaster. Patient type. You'll outlive most of your enemies — and most of your friends."
  ],
  post_awakening_geomancer: [
    "Geomancer. Slow, hard to kill, and eventually wins by exhausting everyone around it. Reminds me of my business model."
  ],

  // Ветеран (уровень 5+)
  player_veteran: [
    "Still here. I'm not surprised anymore. That's the closest thing I have to a compliment."
  ],

  // Квест — предложение
  quest_offer: [
    "You look like someone who handles problems for coin. I have a problem. It's on the road east of here, wearing bone armor, and it's sitting on something that belongs to me. Bring me proof it's dealt with — I'll make the price worth the walk."
  ],

  // Квест — подсказка (второй визит пока квест активен)
  quest_hint: [
    "The warrior at the front of the patrol. Has a cracked helmet. There should be an iron ring somewhere on what's left of him. I'd like it back. The rest of Colwick I've made my peace with."
  ],

  // Квест — завершение
  quest_complete: [
    "There it is. Good. ...That'll be twenty-five years of business in a ring. Take what I promised you — I'd rather not look at either of you right now."
  ],

  // Реакция на покупку — Mana Elixir
  buy_mana_elixir: [
    "Brewed it myself. Don't ask what's in it. Do ask what happens if you drink two.",
    "Three combats of amplified spellwork. Use it on something that deserves it.",
    "Smells terrible. Works perfectly. In my experience that's true of most useful things."
  ],

  // Реакция на покупку — Crystal Shard
  buy_crystal_shard: [
    "Buying money with money. There's a philosophy in there somewhere.",
    "Five fights, extra gold each time. Assuming you survive five fights.",
    "The shard draws fortune like a magnet draws iron. Don't ask how. I didn't."
  ],

  // Реакция на покупку — Iron Flask
  buy_iron_flask: [
    "Forty extra HP. Not glamorous. Glamour doesn't stop a sword.",
    "My most sensible seller. Nobody ever died wishing they had less HP.",
    "Good choice. You've got the right kind of cowardice — the kind that keeps you alive."
  ],

  // Реакция на покупку — Shadow Dust
  buy_shadow_dust: [
    "Double experience for two fights. I don't know what's in it. I know what it costs to get it. That's enough.",
    "You'll level fast. Whether fast is good depends on what's waiting at the next level."
  ],

  // Реакция на покупку — Common экипировка
  buy_common_equipment: [
    "Solid. Nothing special about it, and that's a virtue — nothing special will break it either.",
    "Reliable. I've seen flashier gear split in half on the first good hit."
  ],

  // Реакция на покупку — Uncommon экипировка
  buy_uncommon_equipment: [
    "Moving up in the world. Or sideways. Hard to tell until you're already there.",
    "Good piece. Previous owner left it in perfect condition. I'm sure they're fine.",
    "A step above apprentice-grade. There's more air between you and catastrophe now."
  ],

  // Реакция на покупку — Rare экипировка
  buy_rare_equipment: [
    "I had to pry that off someone who didn't want to let go. They weren't in a position to argue.",
    "Rare. Not rare like it's hard to find — rare like it costs what it costs and you pay it.",
    "Smart. This kind of investment tends to pay itself back. Tends to."
  ],

  // Реакция на покупку — Epic экипировка
  buy_epic_equipment: [
    "That is not something I expected to move today. Or this year.",
    "I'll tell you what I know about that piece: not much. What I know about its price: everything.",
    "You either know exactly what you're doing, or you have no idea. Both types tend to buy these."
  ],

  // Провал покупки — не хватает золота
  purchase_failed_no_gold: [
    "Pockets empty, ambitions full. You're not my first.",
    "That's more gold than you have. Go win some fights. I'll wait — I always wait."
  ]
};

/**
 * Возвращает случайный элемент из массива
 * @param {string[]} arr
 * @returns {string}
 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Определяет реплику при открытии магазина по приоритету триггеров.
 * Возвращает строку реплики.
 * @returns {string}
 */
function getOpeningLine() {
  const state = getState();
  const flags = state.merchantFlags;
  const quest = state.questSeveredFinger;

  // --- Первый визит ---
  if (flags.firstVisit) {
    return pick(MERCHANT_DIALOGUE.first_visit);
  }

  // --- Завершение квеста: игрок принёс кольцо и награда ещё не выдана ---
  if (quest.status === 'active' && !quest.rewardClaimed && (state.inventory.skeleton_iron_ring || 0) >= 1) {
    return pick(MERCHANT_DIALOGUE.quest_complete);
  }

  // --- Квест активен — подсказка при повторном визите ---
  if (quest.status === 'active') {
    return pick(MERCHANT_DIALOGUE.quest_hint);
  }

  // --- Ветеран (lv5+), показывается один раз ---
  if (state.level >= 5 && !flags.seenVeteran) {
    return pick(MERCHANT_DIALOGUE.player_veteran);
  }

  // --- После пробуждения — специфичная реплика по классу ---
  if (state.classType && !flags.seenAwakening) {
    const classKey = `post_awakening_${state.classType}`;
    if (MERCHANT_DIALOGUE[classKey]) {
      return pick(MERCHANT_DIALOGUE[classKey]);
    }
    return pick(MERCHANT_DIALOGUE.post_awakening);
  }

  // --- Предложение квеста (level >= 2 и квест ещё не начат) ---
  if (state.level >= 2 && quest.status === 'not_started') {
    return pick(MERCHANT_DIALOGUE.quest_offer);
  }

  // --- Мало золота ---
  if (state.gold < 30) {
    return pick(MERCHANT_DIALOGUE.shop_open_gold_under_30);
  }

  // --- Случайное приветствие ---
  return pick(MERCHANT_DIALOGUE.shop_open_random);
}

/**
 * Обновляет флаги merchantFlags после открытия магазина.
 * Вызывается ПОСЛЕ getOpeningLine — чтобы реплики триггерились корректно.
 */
function updateMerchantFlagsOnOpen() {
  const state = getState();
  const flags = state.merchantFlags;
  const quest = state.questSeveredFinger;

  // Увеличиваем счётчик визитов
  flags.visitCount = (flags.visitCount || 0) + 1;

  // Снимаем флаг первого визита (он уже был показан в getOpeningLine)
  if (flags.firstVisit) {
    flags.firstVisit = false;
  }

  // Отмечаем просмотр реплики ветерана (была показана в getOpeningLine)
  if (state.level >= 5 && !flags.seenVeteran) {
    flags.seenVeteran = true;
  }

  // Отмечаем просмотр реплики пробуждения (была показана в getOpeningLine)
  if (state.classType && !flags.seenAwakening) {
    flags.seenAwakening = true;
  }

  // Запускаем квест: предложение было показано в getOpeningLine при not_started.
  // Активируем на следующий визит — если уровень >= 2 и предложение уже было (firstVisit = false)
  if (state.level >= 2 && quest.status === 'not_started' && !flags.firstVisit) {
    // Квест активируется ПОСЛЕ первого показа quest_offer (visitCount уже >= 2)
    if (flags.visitCount >= 2) {
      quest.status = 'active';
    }
  }

  // Завершаем квест если игрок принёс кольцо и награда ещё не выдавалась
  if (quest.status === 'active' && !quest.rewardClaimed && (state.inventory.skeleton_iron_ring || 0) >= 1) {
    quest.status = 'completed';
    quest.rewardClaimed = true;  // защита от повторного триггера quest_complete
    // Выдаём награду: 120 золота и скидку на расходники
    state.gold += 120;
    flags.questDiscount = true;
    // Забираем кольцо у игрока
    state.inventory.skeleton_iron_ring = 0;
  }

  saveState();
}

/**
 * Возвращает реплику при покупке конкретного предмета.
 * @param {string} itemId
 * @returns {string}
 */
function getPurchaseLine(itemId) {
  // Специфичные расходники
  const specific = `buy_${itemId}`;
  if (MERCHANT_DIALOGUE[specific]) {
    return pick(MERCHANT_DIALOGUE[specific]);
  }

  // Экипировка — по редкости
  const item = ITEMS_DATA[itemId];
  if (item) {
    const rarityMap = {
      common:   'buy_common_equipment',
      uncommon: 'buy_uncommon_equipment',
      rare:     'buy_rare_equipment',
      epic:     'buy_epic_equipment'
    };
    const key = rarityMap[item.rarity];
    if (key && MERCHANT_DIALOGUE[key]) {
      return pick(MERCHANT_DIALOGUE[key]);
    }
  }

  return '';
}

/**
 * Отображает реплику торговца в попапе магазина.
 * @param {string} line
 */
function setMerchantLine(line) {
  const el = document.getElementById('shop-merchant-line');
  if (!el) return;
  el.style.opacity = '0';
  // Плавное появление через один кадр
  requestAnimationFrame(() => {
    el.textContent = line ? `"${line}"` : '';
    el.style.opacity = '1';
  });
}

/**
 * Открывает попап магазина
 */
export function openShop() {
  // Сначала получаем реплику — до изменения флагов, чтобы триггеры сработали правильно
  const line = getOpeningLine();

  // Затем обновляем флаги (сбрасываем одноразовые, выдаём награды квеста)
  updateMerchantFlagsOnOpen();

  renderShop();
  setMerchantLine(line);

  document.getElementById('popup-shop')?.classList.add('visible');
}

/**
 * Закрывает попап магазина
 */
export function closeShop() {
  document.getElementById('popup-shop')?.classList.remove('visible');
}

/**
 * Рендерит содержимое магазина — список товаров и золото игрока
 */
function renderShop() {
  const state = getState();
  const listEl = document.getElementById('shop-items-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  // Создаём (или находим) lore-tooltip элемент
  ensureLoreTooltip();

  // Применяем скидку квеста (10% на расходники)
  const hasDiscount = state.merchantFlags?.questDiscount === true;

  for (const itemId of SHOP_ITEMS) {
    const item = ITEMS_DATA[itemId];
    if (!item) continue;

    // Рассчитываем финальную цену с учётом скидки
    const basePrice = item.price;
    const finalPrice = hasDiscount ? Math.floor(basePrice * (1 - QUEST_DISCOUNT)) : basePrice;

    const row = document.createElement('div');
    row.className = 'shop-item-row';

    // Иконка товара
    const iconEl = document.createElement('div');
    iconEl.className = 'shop-item-icon';
    if (item.img) {
      const img = document.createElement('img');
      img.src = item.img;
      img.style.cssText = 'width:56px;height:56px;image-rendering:pixelated;object-fit:contain';
      iconEl.appendChild(img);
    } else {
      iconEl.textContent = '🧪';
    }

    // Название и описание
    const infoEl = document.createElement('div');
    infoEl.className = 'shop-item-info';
    infoEl.innerHTML = `<div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div>`;

    // Цена (со скидкой — зачёркнутая базовая и новая)
    const priceEl = document.createElement('div');
    priceEl.className = 'shop-item-price';
    if (hasDiscount) {
      priceEl.innerHTML = `<span style="text-decoration:line-through;opacity:0.5">🪙 ${basePrice}</span><br>🪙 ${finalPrice}`;
    } else {
      priceEl.textContent = `🪙 ${finalPrice}`;
    }

    // Кнопка покупки — задизейблена если не хватает золота
    const buyBtn = document.createElement('button');
    buyBtn.className = 'shop-buy-btn';
    buyBtn.textContent = 'Buy';
    buyBtn.disabled = state.gold < finalPrice;
    buyBtn.addEventListener('click', () => {
      // buyItem из state.js использует item.price, поэтому патчим временно если есть скидка
      const result = buyItem(itemId, finalPrice);
      if (result.success) {
        const purchaseLine = getPurchaseLine(itemId);
        if (purchaseLine) {
          // Реплика торговца в нотификации
          showNotification(`"${purchaseLine}"`, 'lore');
        } else {
          showNotification(`Bought: ${item.name}`, 'success');
        }
        updateHUD();
        renderShop(); // обновить золото и состояние кнопок
      } else if (result.reason === 'no_gold') {
        const failLine = pick(MERCHANT_DIALOGUE.purchase_failed_no_gold);
        showNotification(`"${failLine}"`, 'warning');
      }
    });

    // Hover tooltip с lore-описанием предмета
    if (item.lore || item.desc) {
      row.addEventListener('mouseenter', (e) => {
        showLoreTooltip(item, row);
      });
      row.addEventListener('mouseleave', () => {
        hideLoreTooltip();
      });
    }

    row.appendChild(iconEl);
    row.appendChild(infoEl);
    row.appendChild(priceEl);
    row.appendChild(buyBtn);
    listEl.appendChild(row);
  }

  // Обновляем золото в шапке попапа
  const goldEl = document.getElementById('shop-gold-display');
  if (goldEl) goldEl.textContent = `🪙 ${state.gold}`;
}

// ===== LORE TOOLTIP =====

/**
 * Создаёт DOM-элемент для lore-tooltip если его ещё нет.
 */
function ensureLoreTooltip() {
  if (document.getElementById('shop-lore-tooltip')) return;
  const tooltip = document.createElement('div');
  tooltip.id = 'shop-lore-tooltip';
  tooltip.className = 'shop-lore-tooltip';
  tooltip.innerHTML = `
    <div class="shop-lore-name" id="shop-lore-name"></div>
    <div class="shop-lore-text" id="shop-lore-text"></div>
  `;
  // Добавляем в popup-shop чтобы позиционировался внутри попапа
  const popup = document.getElementById('popup-shop');
  if (popup) {
    popup.appendChild(tooltip);
  } else {
    document.body.appendChild(tooltip);
  }
}

/**
 * Показывает lore-tooltip рядом с товарной строкой.
 * @param {object} item — объект из ITEMS_DATA
 * @param {HTMLElement} rowEl — строка товара (.shop-item-row)
 */
function showLoreTooltip(item, rowEl) {
  const tooltip = document.getElementById('shop-lore-tooltip');
  if (!tooltip) return;

  const nameEl = document.getElementById('shop-lore-name');
  const textEl = document.getElementById('shop-lore-text');

  if (nameEl) {
    nameEl.textContent = item.name;
  }
  if (textEl) {
    textEl.textContent = item.lore || item.desc || '';
  }

  // Позиционируем tooltip справа от popup-box
  const popupBox = rowEl.closest('.shop-popup-box');
  if (popupBox) {
    const boxRect = popupBox.getBoundingClientRect();
    const rowRect = rowEl.getBoundingClientRect();
    const popupRect = tooltip.closest('#popup-shop')?.getBoundingClientRect() || { left: 0, top: 0 };

    // Показываем справа от popup-box, вертикально по центру строки
    tooltip.style.left = `${boxRect.right - popupRect.left + 12}px`;
    tooltip.style.top = `${rowRect.top - popupRect.top + rowRect.height / 2}px`;
    tooltip.style.transform = 'translateY(-50%)';
  }

  tooltip.classList.add('visible');
}

/**
 * Скрывает lore-tooltip.
 */
function hideLoreTooltip() {
  const tooltip = document.getElementById('shop-lore-tooltip');
  if (tooltip) tooltip.classList.remove('visible');
}

/**
 * Инициализирует кнопку закрытия магазина
 */
export function bindShopEvents() {
  document.getElementById('btn-close-shop')?.addEventListener('click', () => {
    hideLoreTooltip();
    closeShop();
  });
}
