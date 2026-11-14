# Zany Golf — smooth 3D desktop edition

Play: https://oldgames.hervef.chatgpt.site/zanygolf/

A real-time Three.js/WebGL 2 recreation inspired by Zany Golf (1988). The flat Canvas renderer has been replaced by smooth 3D models, physically based materials, antialiasing, soft shadows, animated mechanisms, shaped courses and raised terrain. Nine courses and one unlockable bonus. This is a recreation with original models and layouts, not the original Apple IIgs executable or an exact historical port.

## Controls

1. Click anywhere on the terrain to choose the direction. There is no need to grab the ball or drag backwards.
2. Adjust the power slider (5–100%), or use the mouse wheel over the course.
3. Click **Tirer**, or press **Enter**. Clicking to aim never fires a shot.

Escape or right click clears aiming. **Space** temporarily activates the mechanism; the **Action** button toggles it. Left/right arrows operate flippers. P pauses, M toggles synthesized sound, F requests fullscreen. Leaving the window or hiding the tab pauses the game.

Complete nine holes in 39 strokes or fewer to unlock the bonus. Practice selects any main course without replacing the campaign save. There is no stroke-elimination limit.

Saves use `oldgames:zanygolf:save:v1` in localStorage. Previous saves remain compatible; balls outside a newly shaped course are recovered onto its nearest boundary. Saves remain browser- and origin-specific.

## Architecture

- `src/world3d.js`: models, materials, mesh batching, shadows, animations, orthographic camera, responsive viewport and raycast picking.
- `src/terrain.js`: shared outlines, elevation fields, boundary collision and save recovery.
- `src/aim.js`: explicit shot direction and independently adjustable power.
- `src/physics.js`: deterministic 120 Hz simulation, collisions, mechanisms, scoring and serialization.
- `src/levels.js`: level rules and French guidance.
- `src/main.js`: UI, input, saving, audio and WebGL failure handling.
- `preview.mjs`: exports the actual game scene to GLB.
- `render-preview.py`: optional Blender offline rendering for artwork review.

From the repository root: `npm ci`, `npm run build`, `npm run check`, `npm test`. Three.js is bundled locally into `dist/zanygolf/main.js`; no runtime CDN is needed. Its MIT license is included in the published game folder.

Static objects are grouped by material: each course has fewer than 150 mesh objects. Pixel ratio is capped at 2. WebGL 2 / hardware acceleration is required, with an explicit recovery message if initialization fails.

## Validation and limits

18 automated checks cover shots, collisions, mechanisms, scoring, saving, corrupt saves, click/slider/fire UI flow, real camera ray picking on all ten courses at three viewport ratios, finite geometry, bounded draw calls, shaped boundaries and a complete first-hole shot from the real tee.

UI checks use a DOM double with only the GPU boundary substituted. Camera/raycast and scene tests use Three.js. Offline Blender renders of the actual models were inspected for framing and style. They are **not browser screenshots**: exact WebGL appearance, device frame rate, sound and fullscreen still need a real browser check because the supported browser QA tool is unavailable in this environment.

## Visual references

- User reference: https://archive.org/details/a2gs_Zany_golf_1988_Electronic_Arts
- IIgs screenshots: https://www.whatisthe2gs.apple2.org.za/zany-golf.html
- Course screenshots: https://www.oldgames.sk/en/game/zany-golf/screenshots/
- Gameplay footage inspected through extracted frames: https://archive.org/details/rosss-game-dungeon-zany-golf

No historical screenshots, sprites, disks or original music are embedded. Catalogue artwork is an offline render of the game models with equivalent offline lighting.
