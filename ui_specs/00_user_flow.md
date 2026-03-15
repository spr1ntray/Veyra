# Veyra — User Flow (MVP Sprint 1)

## Общий игровой цикл

```
[LoadingScreen]
      |
      | (первый вход за день?)
      |--- ДА --> [DailyLoginPopup] --> [WorldMap]
      |--- НЕТ -> [WorldMap]
      |
[WorldMap]
      |
      |--- клик "Тренировочная площадка" --> [BattleScreen]
      |         |
      |         | (выбор заклинания x3 раунда)
      |         v
      |    [BattleResultScreen]
      |         |--- "Продолжить" (остались бои) --> [BattleScreen]
      |         |--- "Продолжить" (бои исчерпаны) --> [WorldMap]
      |         |--- (выпал предмет) --> [ItemDropOverlay] --> [BattleResultScreen]
      |         |--- (level up) --> [LevelUpPopup] --> [BattleResultScreen]
      |
      |--- клик "Инвентарь" (нижняя панель) --> [InventoryScreen]
      |         |
      |         |--- клик на предмет --> [ItemTooltipOverlay]
      |         |         |--- "Экипировать" --> [InventoryScreen] (обновлённый)
      |         |         |--- клик вне --> [InventoryScreen]
      |         |
      |         |--- клик "Карта" (нижняя панель) --> [WorldMap]
      |
      |--- клик "Персонаж" (нижняя панель) --> [InventoryScreen] (открыт на силуэте)
      |
      |--- клик на закрытую локацию --> [LockedLocationTooltip] (inline, без перехода)
```

## Состояния сессии

```
Первый запуск:
  LoadingScreen (анимация 2–3 сек)
    --> DailyLoginPopup (авто-показ)
      --> WorldMap

Повторный вход (тот же день):
  LoadingScreen (анимация 1 сек)
    --> WorldMap

Повторный вход (новый день):
  LoadingScreen (анимация 1 сек)
    --> DailyLoginPopup
      --> WorldMap
```

## Экраны проекта

| # | ID экрана | Тип | Файл |
|---|-----------|-----|------|
| 1 | LoadingScreen | Полный экран | 01_loading_screen.md |
| 2 | DailyLoginPopup | Модальное окно | 02_daily_login_popup.md |
| 3 | WorldMap | Полный экран (основной хаб) | 03_world_map.md |
| 4 | BattleScreen | Полный экран | 04_battle_screen.md |
| 5 | BattleResultScreen | Полный экран | 05_battle_result_screen.md |
| 6 | InventoryScreen | Полный экран | 06_inventory_screen.md |
| 7 | LevelUpPopup | Модальное окно (поверх любого экрана) | 07_level_up_popup.md |
