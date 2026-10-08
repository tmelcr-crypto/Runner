# Block Runner

Top-down GTA 1 style crime sandbox in neon 3D. Vanilla JS + three.js r128 (loaded from cdnjs). No build step.

Run it: serve the folder (`python3 -m http.server`) and open `http://localhost:8000`, or open `index.html` directly.

## Layout

`index.html` loads the scripts in order. They are plain scripts that share globals, so keep the order.

| File | Contents |
|---|---|
| `js/01-config.js` | constants, helpers, `$()` |
| `js/02-audio.js` | synthesized Web Audio |
| `js/03-input.js` | keyboard, mouse, touch, shifter |
| `js/04-world.js` | 12x12 grid city, collision, raycast, edge layout (wall or lake per side) |
| `js/05-entities.js` | entity and effect data |
| `js/06-gameplay.js` | state, wanted level, combat, enter/exit vehicles |
| `js/07-vehicles-traffic-police.js` | car physics, traffic and police AI |
| `js/08-pedestrians-pickups-spawning.js` | pedestrians, officers, pickups, spawning |
| `js/09-render-core-buildings.js` | three.js setup, facade atlases, building meshes |
| `js/10-render-city-edges.js` | beach and lake or building rows at the city edge |
| `js/11-render-dynamic-meshes.js` | cars, people, pickups |
| `js/12-render-effects.js` | particles, tracers, decals, skid marks, score pops |
| `js/13-render-frame.js` | per-frame render |
| `js/14-hud-minimap.js` | HUD and minimap |
| `js/15-game-flow-loop.js` | menu, play, dying, game over, main loop |
| `js/16-octagrid-map-preview.js` | loads an Octagrid export and shows it in 3D (look only) |
| `js/main.js` | starts the game; must load last |

## Octagrid preview

*Load city file* on the start card reads an `octagrid-city` JSON export from the Octagrid city builder and shows it with the full building detail. It is a preview only: traffic, pedestrians, police and collisions still assume the fixed 12x12 grid, so the imported map is not playable yet.
Not yet used by the preview: `bounds`, `edges` (city limit and edge style).

## Next steps

1. Make the game playable on imported maps (road graph for traffic and police, building collision from polygons).
2. Honor `bounds` and `edges` from the export.
3. Convert the scripts to ES modules once the globals are untangled.
