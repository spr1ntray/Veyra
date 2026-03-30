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

  window.addEventListener('resize', positionMapMarkers);
}

/**
 * Вызывать при каждом показе карты (после того как экран стал visible).
 */
export function showMapScreen() {
  positionMapMarkers();
}

/**
 * Вычисляет экранные координаты маркеров с учётом background-size: cover.
 * Изображение карты: 711×400 px. Маркеры задаются в долях от размера изображения.
 */
function positionMapMarkers() {
  const screenEl = document.getElementById('screen-map');
  if (!screenEl) return;

  const W = screenEl.offsetWidth;
  const H = screenEl.offsetHeight;

  // Натуральные размеры изображения карты
  const imgW = 711, imgH = 400;

  // cover: единый масштаб = max(scaleX, scaleY)
  const scale = Math.max(W / imgW, H / imgH);
  const renderedW = imgW * scale;
  const renderedH = imgH * scale;

  // Смещение при центрировании (cover может обрезать края)
  const offX = (renderedW - W) / 2;
  const offY = (renderedH - H) / 2;

  const markers = [
    { id: 'hotspot-square', ix: 0.505, iy: 0.507 },
    { id: 'hotspot-home',   ix: 0.577, iy: 0.785 }
  ];

  markers.forEach(({ id, ix, iy }) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Координаты левого верхнего угла маркера (центрирование через margin в CSS)
    el.style.left = (ix * renderedW - offX) + 'px';
    el.style.top  = (iy * renderedH - offY) + 'px';
  });
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
