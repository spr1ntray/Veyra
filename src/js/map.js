/**
 * map.js — экран карты мира
 * Показывает map.png на весь экран с кликабельными хотспотами.
 * Grid-система удалена, вся навигация через хотспоты поверх картинки.
 */

// Колбеки навигации, устанавливаются при инициализации
let _onGoToSquare = null;
let _onGoToHome = null;

/**
 * Инициализирует экран карты — привязывает клики на хотспоты.
 * Вызывается один раз из main.js при старте игры.
 *
 * @param {Object} callbacks
 * @param {Function} callbacks.onGoToSquare - переход на площадь
 * @param {Function} callbacks.onGoToHome   - переход в дом
 */
export function initMapScreen(callbacks) {
  _onGoToSquare = callbacks.onGoToSquare;
  _onGoToHome   = callbacks.onGoToHome;

  // Хотспот площади
  const hotspotSquare = document.getElementById('hotspot-square');
  if (hotspotSquare) {
    hotspotSquare.addEventListener('click', () => {
      if (_onGoToSquare) _onGoToSquare();
    });
  }

  // Хотспот дома
  const hotspotHome = document.getElementById('hotspot-home');
  if (hotspotHome) {
    hotspotHome.addEventListener('click', () => {
      if (_onGoToHome) _onGoToHome();
    });
  }
}

/**
 * Заглушка для совместимости — initMap больше не нужен,
 * но оставлен чтобы старые вызовы не ломали игру.
 */
export function initMap(callbacks) {
  // Пустая заглушка — логика перенесена в initMapScreen
}

/**
 * Заглушка для совместимости — refreshMapBadges больше не обновляет grid.
 * Метод оставлен, вызывается из main.js после боёв.
 */
export function refreshMapBadges() {
  // Нечего обновлять — карта статичная картинка
}
