/**
 * shop.js — магазин торговца
 */
import { getState, ITEMS_DATA, buyItem } from './state.js';
import { updateHUD, showNotification } from './ui.js';

// Предметы в ассортименте магазина
const SHOP_ITEMS = ['mana_elixir', 'crystal_shard', 'iron_flask', 'shadow_dust'];

/**
 * Открывает попап магазина
 */
export function openShop() {
  renderShop();
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

  for (const itemId of SHOP_ITEMS) {
    const item = ITEMS_DATA[itemId];
    if (!item) continue;

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

    // Цена
    const priceEl = document.createElement('div');
    priceEl.className = 'shop-item-price';
    priceEl.textContent = `🪙 ${item.price}`;

    // Кнопка покупки — задизейблена если не хватает золота
    const buyBtn = document.createElement('button');
    buyBtn.className = 'shop-buy-btn';
    buyBtn.textContent = 'Buy';
    buyBtn.disabled = state.gold < item.price;
    buyBtn.addEventListener('click', () => {
      const result = buyItem(itemId);
      if (result.success) {
        showNotification(`Bought: ${item.name}`, 'success');
        updateHUD();
        renderShop(); // обновить золото и состояние кнопок
      } else if (result.reason === 'no_gold') {
        showNotification('Not enough gold!', 'warning');
      }
    });

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

/**
 * Инициализирует кнопку закрытия магазина
 */
export function bindShopEvents() {
  document.getElementById('btn-close-shop')?.addEventListener('click', closeShop);
}
