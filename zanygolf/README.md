# Zany Golf — desktop web adaptation

Play: https://oldgames.hervef.chatgpt.site/zanygolf/

An original Canvas 2D recreation inspired by the variety of Zany Golf (1988), built for a desktop browser with mouse and keyboard. It does not run the original Apple IIgs program or reproduce its exact layouts, physics, graphics, music or stroke-elimination rules. No game disk, original artwork or original audio is included.

## Play

- Click near the ball, drag backwards and release. Distance sets power; the dotted arrow shows direction. Escape or right click cancels aiming.
- Hold Space to lift the burger, activate fans, steer the ball toward the pointer while on the magic carpet, or activate the anthill bumpers.
- Left/right arrows activate the pinball flippers. The bonus paddle follows the pointer.
- P pauses, M toggles synthesized effects, F requests fullscreen. Losing window focus or hiding the tab pauses the simulation.
- Nine courses form a round. Finish in 39 strokes or fewer to unlock the tenth course. There is no stroke-elimination limit.
- Practice lets you choose any of the nine main courses without overwriting the campaign save.

The round is saved automatically in `oldgames:zanygolf:save:v1` in localStorage, at shots, transitions, page hiding, and periodically. The manual Save button reports storage failures. The welcome screen offers Resume for a valid save. Saves remain browser- and origin-specific.

## Implementation

- `src/levels.js`: original course layouts and French instructions.
- `src/physics.js`: independent simulation at 120 Hz, bounded impulses, circle/rectangle collisions, drag, timers, targets, special mechanics and serialization.
- `src/render.js`: vector diorama renderer and reversible isometric projection.
- `src/main.js`: desktop input, dialogs, scoring, local saves and Web Audio effects.
- `src/index.html`, `src/style.css`, `src/icon.svg`: game shell and interface.
- `preview.mjs`: exports a scene from the real renderer as catalogue SVG artwork.
- `tests/`: physics, rendering and DOM-double interaction tests.

From the repository root, run `npm ci`, `npm run build`, `npm run check`, then `npm test`. The build copies this game's assets to `dist/zanygolf/`. Regenerate catalogue artwork with `node zanygolf/preview.mjs`.

## Validation

15 automated checks cover projection and pointer mapping, power and stroke counting, high-speed collisions, rising-wall overlap, pause, burger access, fan/carpet effects, flippers, Energy targets and portal, score progression and bonus, cup capture on every hole, practice, saves and corrupt-state rejection, finite rendering, and the UI start/shoot/cancel/pause/save flow using a DOM double.

The preview illustration was inspected from the same renderer. A real browser playthrough, audible playback and fullscreen acceptance have **not** been verified in this managed environment because the supported browser QA tool is unavailable. Tests establish mechanical behavior, not exact fidelity to the historical game or difficulty balance across a full human playthrough.

Reference: https://archive.org/details/a2gs_Zany_golf_1988_Electronic_Arts
