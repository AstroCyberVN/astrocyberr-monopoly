import { describe, it, expect } from 'vitest';
import { BOARD_TILES, BOARD_SIZE, CHARACTER_CONFIGS } from '../src/core/boardData';
import { GameEngine } from '../src/core/gameEngine';
import { chooseBotAction } from '../src/core/botAI';

describe('AstroCyberr Monopoly v2.0 — 40-Tile Floating Island & Game Engine', () => {
  it('defines exactly 40 perimeter tiles with outward-facing rotation angles per side', () => {
    expect(BOARD_SIZE).toBe(40);
    expect(BOARD_TILES).toHaveLength(40);

    // Corners at 0, 10, 20, 30
    expect(BOARD_TILES[0].type).toBe('START');
    expect(BOARD_TILES[10].type).toBe('DESERTED_ISLAND');
    expect(BOARD_TILES[20].type).toBe('FESTIVAL');
    expect(BOARD_TILES[30].type).toBe('END_PORTAL');

    // Outward rotation check for each side so text faces the outside reader
    expect(BOARD_TILES[5].outwardRotationY).toBeCloseTo(0); // Bottom row faces +Z
    expect(BOARD_TILES[15].outwardRotationY).toBeCloseTo(-Math.PI / 2); // Left row faces -X
    expect(BOARD_TILES[25].outwardRotationY).toBeCloseTo(Math.PI); // Top row faces -Z
    expect(BOARD_TILES[35].outwardRotationY).toBeCloseTo(Math.PI / 2); // Right row faces +X

    // 8 color groups across 24 property tiles
    const properties = BOARD_TILES.filter((t) => t.type === 'PROPERTY');
    expect(properties.length).toBe(24);
    const colorGroups = new Set(properties.map((t) => t.colorGroup));
    expect(colorGroups.size).toBe(8);
  });

  it('defines 4 Chibi Minecraft characters with distinct locomotion effects', () => {
    expect(CHARACTER_CONFIGS.map((c) => c.id)).toEqual([
      'steve',
      'alex',
      'creeper',
      'enderman'
    ]);
  });

  it('awards +$200 when passing or landing on Tile 0 (Start) on a 40-tile board', () => {
    const engine = new GameEngine('SOLO_VS_AI', 1);
    const p0 = engine.getCurrentPlayer();
    const initialGold = p0.gold;

    p0.position = 38;
    const step1 = engine.stepPlayerOneTile(p0.id);
    expect(step1.newPosition).toBe(39);
    expect(step1.passedStart).toBe(false);

    const step2 = engine.stepPlayerOneTile(p0.id);
    expect(step2.newPosition).toBe(0);
    expect(step2.passedStart).toBe(true);
    expect(p0.gold).toBe(initialGold + 200);
  });

  it('supports buying a property (Level 1 Wooden Fence) and upgrading up to Level 4 (Crown Castle)', () => {
    const engine = new GameEngine('SOLO_VS_AI', 1);
    const p0 = engine.getCurrentPlayer();
    p0.gold = 2000;
    p0.position = 1;

    const buyRes = engine.buyProperty(p0.id, 1);
    expect(buyRes.ok).toBe(true);
    expect(engine.getTileState(1).ownerId).toBe(p0.id);
    expect(engine.getTileState(1).level).toBe(1);

    expect(engine.upgradeProperty(p0.id, 1).newLevel).toBe(2);
    expect(engine.upgradeProperty(p0.id, 1).newLevel).toBe(3);
    expect(engine.upgradeProperty(p0.id, 1).newLevel).toBe(4);
    expect(engine.upgradeProperty(p0.id, 1).ok).toBe(false);
  });

  it('calculates rent with Monopoly Color Set bonus (1.5x) and Festival multiplier (2x)', () => {
    const engine = new GameEngine('PASS_AND_PLAY', 2);
    const [p0, p1] = engine.getPlayers();
    p0.gold = 3000;

    // PLAINS group: tiles 1, 3, 4
    engine.buyProperty(p0.id, 1);
    const singleRent = engine.calculateRent(1);

    engine.buyProperty(p0.id, 3);
    engine.buyProperty(p0.id, 4);
    const setRent = engine.calculateRent(1);
    expect(setRent).toBe(Math.round(singleRent * 1.5));

    engine.applyFestivalBoost(p0.id, 1);
    const festivalRent = engine.calculateRent(1);
    expect(festivalRent).toBe(setRent * 2);

    p1.position = 1;
    const p1Before = p1.gold;
    const res = engine.resolveTileLanding(p1.id);
    expect(res.action).toBe('PAID_RENT');
    expect(p1.gold).toBe(p1Before - festivalRent);
  });

  it('enforces Deserted Island (Tile 10) skip-1-turn and The End Portal (Tile 30) teleportation', () => {
    const engine = new GameEngine('SOLO_VS_AI', 1);
    const p0 = engine.getCurrentPlayer();

    p0.position = 10;
    const islandRes = engine.resolveTileLanding(p0.id);
    expect(islandRes.action).toBe('SKIP_TURN_SET');
    expect(p0.skipTurns).toBe(1);

    p0.position = 30;
    const goldBefore = p0.gold;
    const teleRes = engine.teleportFromEndPortal(p0.id, 3);
    expect(teleRes.ok).toBe(true);
    expect(p0.position).toBe(3);
    expect(teleRes.passedStart).toBe(true);
    expect(p0.gold).toBe(goldBefore + 200);
  });

  it('Smart Bot AI makes strategic buy decisions on 40-tile board', () => {
    const engine = new GameEngine('SOLO_VS_AI', 1);
    const bot = engine.getPlayers()[1];
    bot.gold = 900;
    bot.position = 6; // Oak Forest property

    const decision = chooseBotAction(engine, bot.id);
    expect(decision.type).toBe('BUY_PROPERTY');
    expect(decision.tileIndex).toBe(6);
  });
});
