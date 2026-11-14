# Oldgames

**Oldgames brings classic games to modern browsers, making them easy to discover and play with keyboard controls, full-screen views, and local saves. The project preserves the character of each game while adapting its interface for the web, and keeps the source code, provenance, and validation notes available for continued development.**

**Live website: https://oldgames.hervef.chatgpt.site**

Source repository: https://github.com/hervef13300/oldgames

## Games

| Game                                                                                 | Web implementation                                                                              | Controls                                                                                              |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [Castle Wolfenstein](https://oldgames.hervef.chatgpt.site/games/castle-wolfenstein/) | The Apple II program running in apple2js, with a browser interface                              | Arrow keys or ZQSD to move; O/K/;/comma to aim; Space to shoot; E to search; T for grenades; U to use |
| [Choplifter](https://oldgames.hervef.chatgpt.site/games/choplifter/)                 | Browser port of the project's Android 0.4 adaptation, with original project graphics and sounds | Arrow keys or ZQSD to fly; J/K/L to face left/front/right; Space to fire; P to pause; M for sound     |

The games are designed for desktop, with keyboard controls and mouse aiming in Zany Golf. Castle Wolfenstein starts with Enter, then K. Choplifter offers Classic and Assisted modes; press Enter to take off. Controls and instructions are displayed on each game's page.

Choplifter is an adaptation, not Apple II emulation. Its simulation was ported from [hervef13300/choplifter](https://github.com/hervef13300/choplifter), revision `f4616c47e4eadc4e6c85638710bc2bb6c384f9f0`. JavaScript floating-point calculations can differ slightly from Java floats. Source references are retained in `games/choplifter/source-references/`.

Zany Golf uses smooth Three.js/WebGL 2 rendering with antialiasing, soft shadows and animated models. It provides nine original courses and an unlockable bonus, a practice mode and automatic local saving. It is a web recreation inspired by the 1988 game, not emulation. Play at https://oldgames.hervef.chatgpt.site/zanygolf/. Controls: click the course to aim, hold Space to charge and release to fire; E for special actions, left/right arrows for flippers, P/M/F for pause/sound/fullscreen. See [its README](zanygolf/README.md) for implementation details and fidelity limits.

## Build and verify

Requires Node.js 20 or newer.

```sh
npm ci
npm run build
npm run check
npm test
```

`dist/` is the static website output. Serve it through a local HTTP server when testing; ES modules and saved games require a proper web origin.

## Project layout

- `public/`: Oldgames catalogue, search, favourites, styles and artwork.
- `games/castle-wolfenstein/`: Castle Wolfenstein sources (`src/`), emulator dependencies and licenses (`vendor/`), disk provenance and startup regression tests (`tests/`).
- `games/choplifter/`: Choplifter sources and audio (`src/`), original Java references (`source-references/`), simulation tests (`tests/`) and preview generator (`scripts/`).
- `zanygolf/`: desktop 3D mini-golf sources, physics/interface/scene tests and GLB preview exporter; published at `/zanygolf/`.
- `scripts/`: shared website build and asset checks.
- `dist/games/`: generated playable games, each in its own subfolder.
- `.openai/hosting.json`: existing ChatGPT Sites project identity and static hosting configuration; no credentials.

The public ChatGPT Site uses its own managed source repository. This GitHub repository mirrors the web project for review and continued development. Pushing to GitHub alone does not deploy to ChatGPT Sites.

## Saves and privacy

Favourites use localStorage. Castle Wolfenstein saves use IndexedDB; Choplifter and Zany Golf each use a separate localStorage key. Saves stay in the same browser and origin. They do not sync to Android or other devices and are lost if site data is cleared. No game account is required by the application.

## Validation and limitations

Twenty-one Zany Golf checks cover physics, mechanisms, progression, serialization, click/slider/fire controls, Three.js camera picking, scene geometry and shaped boundaries. Real browser interaction, audio and fullscreen still need manual verification. The catalogue artwork is an offline Blender render of the game models.

The build and static checks verify routes, assets, sound files, unique HTML IDs, absence of virtual joysticks and the Castle Wolfenstein disk checksum. Castle Wolfenstein regression checks exercise blocked gamepad access, unavailable browser storage, resuming a background save, and booting the original disk into a new keyboard game. These run the actual bundled emulator with a mocked Canvas and browser APIs. Twelve Choplifter simulation/rendering checks cover group progression, capacity, damage, combat, pause, serialization, a rescue round trip without teleportation and all 64 rescues across four rotations.

Browser interaction and audio playback for this Sites integration still need manual verification: the managed Sites preview tool was unavailable in the development environment. The Choplifter catalogue illustration is generated by the web renderer from a prepared scene, not a recorded complete playthrough.

See [THIRD_PARTY.md](THIRD_PARTY.md) for source and asset provenance. Historical game software is not declared public domain by this project.
