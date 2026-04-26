# Custom Map Drop Zone

Put your map JSON here as `active.json` to override procedural generation.

The game fetches `assets/maps/active.json` at run start. If the file exists and parses correctly, it is used instead of the procedurally generated cave. If it returns 404 or fails validation, the game falls back to procedural generation silently.

Format: schema v1 (see `src/js/dungeon/map_format.js`).

To generate a valid map file, open `map-editor.html` and click **Save as active.json**.
