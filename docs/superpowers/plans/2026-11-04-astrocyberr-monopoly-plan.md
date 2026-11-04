# AstroCyberr Monopoly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `astrocyberr-monopoly`, a 3D Voxel Minecraft Chibi Monopoly game with a 28-tile floating island board, 4 Chibi characters with unique step animations (`Steve`, `Alex`, `Creeper`, `Enderman`), 3D physics dice, dynamic cinema camera, zero-asset 8-bit WebAudio synth, Blockbench `.bbmodel` exports, and 1–4 player modes (Bot AI, Pass & Play, Online Room).

**Architecture:** Modular TypeScript architecture separating deterministic game rules & AI (`src/core/`), Three.js 3D scene & animations (`src/scene/`), WebAudio procedural synthesis (`src/audio/`), and reactive HUD & multiplayer sync (`src/ui/`, `src/net/`). All game logic is 100% unit-tested via `vitest` before connecting to the 3D renderer.

**Tech Stack:** `TypeScript 5`, `Vite 6`, `Three.js`, `GSAP`, `canvas-confetti`, `Vitest`, `WebAudio API`, `Blockbench (.bbmodel)`

**Spec:** `docs/superpowers/specs/2026-11-04-astrocyberr-monopoly-design.md`

## Global Constraints

- **Board size**: Exactly `28` perimeter tiles (`indices 0..27`) arranged on an `8x8` outer square ring (`4` corners at `0, 7, 14, 21` + `24` edge tiles).
- **Tile composition**: `1` Start (`+200` Gold), `16` Property tiles across `8` color groups (`4` building levels: Fence -> Cottage -> Villa -> Crown Castle), `4` Minecart Railroads (`3, 10, 17, 24`), `3` Chest/Chance tiles (`5, 12, 19`), `1` Deserted Island (`7` - skip 1 turn), `1` Festival (`14` - `2x` rent multiplier), `1` The End Portal (`21` - teleport to any tile), `1` Royal Tax (`26` - `120` Gold).
- **Character locomotion**:
  - `steve` & `alex`: Parabolic hop + opposite limb swing + landing squash-and-stretch + white dust particles.
  - `enderman`: Instant teleport per step + purple portal particles (`#a855f7` / `#d8b4fe`).
  - `creeper`: Swell & flash fuse + TNT explosion particles + respawn bounce on the next tile.
- **Zero external audio assets**: All SFX and background melodies must be synthesized in real time via `window.AudioContext`.

## Review Focus

- Passing Tile `0` (`START`) via normal dice roll OR via `END_PORTAL` forward movement awards `+200` Gold accurately without double-crediting when landing directly on Tile `0`.
- Landing on `DESERTED_ISLAND` (`7`) sets `skipTurns = 1`, and on the player's next turn decrements `skipTurns` to `0` and advances turn without rolling dice.
- Upgrading a property beyond Level `4` (`Crown Castle`) or buying/upgrading with insufficient Gold is rejected cleanly without mutating state.
- Owning both properties of the same color group (`Monopoly Set`) applies the `1.5x` base rent multiplier (and combines multiplicatively with `2x` Festival multiplier when active).
- Bankruptcy check transfers or frees owned properties when a player's Gold drops below `0` after mandatory rent/tax and triggers Victory when only `1` solvent player remains.

---

### Task 1: Project Scaffolding & Native Blockbench Models (`.bbmodel`)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- Create: `scripts/generate_blockbench_models.mjs`
- Create: `blockbench-models/steve_chibi.bbmodel`, `blockbench-models/alex_chibi.bbmodel`, `blockbench-models/creeper_chibi.bbmodel`, `blockbench-models/enderman_chibi.bbmodel`, `blockbench-models/buildings_voxel.bbmodel`

**Interfaces:**
- Produces: Configured Vite + Vitest + Three.js workspace and valid Blockbench v4.10 `.bbmodel` JSON files.

- [ ] **Step 1: Create `package.json`, `tsconfig.json`, `vite.config.ts`, and `index.html`**
- [ ] **Step 2: Install dependencies (`npm install`)**
- [ ] **Step 3: Generate `.bbmodel` files via `node scripts/generate_blockbench_models.mjs` and verify JSON validity**

---

### Task 2: Deterministic 28-Tile Board Data, Monopoly Game Engine & Smart Bot AI (TDD)

**Files:**
- Test: `tests/gameEngine.test.ts`
- Create: `src/core/boardData.ts`
- Create: `src/core/gameEngine.ts`
- Create: `src/core/botAI.ts`

**Interfaces:**
- Produces:
  - `BOARD_TILES: TileConfig[]` (length `28`)
  - `GameEngine` class (`rollDice()`, `stepPlayerOneTile()`, `resolveCurrentTile()`, `buyProperty()`, `upgradeProperty()`, `applyFestivalBoost()`, `teleportFromEndPortal()`, `nextTurn()`)
  - `chooseBotAction(engine: GameEngine): BotDecision`

- [ ] **Step 1: Write failing unit tests in `tests/gameEngine.test.ts` covering all 28 tiles, passing Start `+200G`, 4-level building upgrades, Monopoly set bonus, Festival `2x`, Deserted Island skip turn, End Portal teleport, and Bot AI decisions**
- [ ] **Step 2: Run `npx vitest run` to verify RED state**
- [ ] **Step 3: Implement `src/core/boardData.ts`, `src/core/gameEngine.ts`, and `src/core/botAI.ts`**
- [ ] **Step 4: Run `npx vitest run` to verify GREEN state (`100%` passing)**

---

### Task 3: Zero-Asset 8-Bit WebAudio Synthesizer (`SoundManager`)

**Files:**
- Create: `src/audio/SoundManager.ts`

**Interfaces:**
- Produces: `SoundManager` singleton with `playDiceThrow()`, `playDiceBounce()`, `playStepBoing()`, `playEndermanTeleport()`, `playCreeperFuseAndBoom()`, `playCoinChime()`, `playBuildPop()`, `playTaxBuzz()`, `playPortalWarp()`, `playVictoryFanfare()`, `toggleMute()`, `toggleBgm()`.

- [ ] **Step 1: Implement `src/audio/SoundManager.ts` using WebAudio oscillators, noise buffers, and gain envelopes**

---

### Task 4: 3D Floating Voxel Island, 4-Tier Pop-Up Buildings, Chibi Characters & Unique Step Particles

**Files:**
- Create: `src/scene/ParticleSystem3D.ts`
- Create: `src/scene/ChibiCharacters3D.ts`
- Create: `src/scene/IslandBoard3D.ts`
- Create: `src/scene/Dice3D.ts`
- Create: `src/scene/CameraDirector.ts`

**Interfaces:**
- Consumes: `BOARD_TILES`, `CharacterId` (`'steve' | 'alex' | 'creeper' | 'enderman'`), `SoundManager`
- Produces: Complete 3D Voxel scene with safe WebGL2 initialization, animated water, trees, 28 interactive tiles, 4-stage bouncy building meshes, 3D dice physics animation, dynamic camera tracking, and character-specific step animations (`hop`, `enderman_teleport`, `creeper_explosion`).

- [ ] **Step 1: Implement `ParticleSystem3D.ts`, `ChibiCharacters3D.ts`, `IslandBoard3D.ts`, `Dice3D.ts`, and `CameraDirector.ts`**

---

### Task 5: Cute Pixel/Bento HUD, Floating Action Cards, Multiplayer Sync & Live Verification

**Files:**
- Create: `src/net/RoomSync.ts`
- Create: `src/styles/main.css`
- Create: `src/main.ts`

**Interfaces:**
- Consumes: `GameEngine`, `chooseBotAction`, `IslandBoard3D`, `ChibiCharacters3D`, `Dice3D`, `CameraDirector`, `SoundManager`
- Produces: Complete playable application on `http://localhost:5173`.

- [ ] **Step 1: Implement `RoomSync.ts`, `main.css`, and `main.ts`**
- [ ] **Step 2: Run `npx vitest run` and `npm run build` to verify zero TypeScript/build errors**
- [ ] **Step 3: Open `cmd` running `npm run dev` and verify with `agent-desktop`**
