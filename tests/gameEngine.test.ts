import { describe, it, expect } from 'vitest';
import { BOARD_TILES, CHARACTER_CONFIGS } from '../src/core/boardData';
import { GameEngine } from '../src/core/gameEngine';
import { chooseBotAction } from '../src/core/botAI';

describe('AstroCyberr Monopoly — 28-Tile Floating Island & Game Engine', () => {
  it('defines exactly 28 perimeter tiles matching the user specification', () => {
    expect(BOARD_TILES).toHaveLength(28);

    const byType = BOARD_TILES.reduce<Record<string, number>>((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {});

    expect(byType.START).toBe(1);
    expect(byType.PROPERTY).toBe(16);
    expect(byType.CHEST).toBe(3);
    expect(byType.DESERTED_ISLAND).toBe(1);
    expect(byType.FESTIVAL).toBe(1);
    expect(byType.END_PORTAL).toBe(1);
    expect(byType.ROYAL_TAX).toBe(1);
    expect(byType.RAILROAD).toBe(4);

    // 8 color groups, 2 properties per group
    const colorGroups = new Set(
      BOARD_TILES.filter((t) => t.type === 'PROPERTY').map((t) => t.colorGroup)
    );
    expect(colorGroups.size).toBe(8);
  });

  it('defines 4 Chibi Minecraft characters with distinct locomotion effects', () => {
    expect(CHARACTER_CONFIGS.map((c) => c.id)).toEqual([
      'steve',
      'alex',
      'creeper',
      'enderman'
    ]);
    expect(CHARACTER_CONFIGS.find((c) => c.id === 'steve')?.locomotion).toBe('PARABOLA_HOP');
    expect(CHARACTER_CONFIGS.find((c) => c.id === 'alex')?.locomotion).toBe('PARABOLA_HOP');
    expect(CHARACTER_CONFIGS.find((c) => c.id === 'creeper')?.locomotion).toBe('TNT_EXPLOSION');
    expect(CHARACTER_CONFIGS.find((c) => c.id === 'enderman')?.locomotion).toBe('ENDER_TELEPORT');
  });

  it('awards +200 Gold when passing or landing on Tile 0 (Start)', () => {
    const engine = new GameEngine('SOLO_VS_AI', 1);
    const p0 = engine.getCurrentPlayer();
    const initialGold = p0.gold;

    p0.position = 26;
    // Step 1: 26 -> 27
    const step1 = engine.stepPlayerOneTile(p0.id);
    expect(step1.newPosition).toBe(27);
    expect(step1.passedStart).toBe(false);
    expect(p0.gold).toBe(initialGold);

    // Step 2: 27 -> 0 (Crosses Start -> +200 Gold)
    const step2 = engine.stepPlayerOneTile(p0.id);
    expect(step2.newPosition).toBe(0);
    expect(step2.passedStart).toBe(true);
    expect(p0.gold).toBe(initialGold + 200);
  });

  it('supports buying a property (Level 1 Wooden Fence) and upgrading up to Level 4 (Crown Castle)', () => {
    const engine = new GameEngine('SOLO_VS_AI', 1);
    const p0 = engine.getCurrentPlayer();
    p0.gold = 2000;
    p0.position = 1; // Property tile

    const buyRes = engine.buyProperty(p0.id, 1);
    expect(buyRes.ok).toBe(true);
    expect(engine.getTileState(1).ownerId).toBe(p0.id);
    expect(engine.getTileState(1).level).toBe(1); // Level 1: Cọc rào gỗ

    // Upgrade to Level 2 (Nhà gỗ Minecraft) -> Level 3 (Biệt thự 2 tầng) -> Level 4 (Lâu đài vương miện)
    expect(engine.upgradeProperty(p0.id, 1).newLevel).toBe(2);
    expect(engine.upgradeProperty(p0.id, 1).newLevel).toBe(3);
    expect(engine.upgradeProperty(p0.id, 1).newLevel).toBe(4);

    // Cannot upgrade past Level 4
    expect(engine.upgradeProperty(p0.id, 1).ok).toBe(false);
  });

  it('calculates rent with Monopoly Color Set bonus (1.5x) and Festival multiplier (2x)', () => {
    const engine = new GameEngine('PASS_AND_PLAY', 2);
    const [p0, p1] = engine.getPlayers();
    p0.gold = 2000;

    // Tile 1 and Tile 2 belong to PLAINS color group
    engine.buyProperty(p0.id, 1);
    const singleRent = engine.calculateRent(1);
    expect(singleRent).toBeGreaterThan(0);

    // Buy second property in same group -> 1.5x set bonus
    engine.buyProperty(p0.id, 2);
    const setRent = engine.calculateRent(1);
    expect(setRent).toBe(Math.round(singleRent * 1.5));

    // Apply Festival x2 on Tile 1
    engine.applyFestivalBoost(p0.id, 1);
    const festivalRent = engine.calculateRent(1);
    expect(festivalRent).toBe(setRent * 2);

    // P1 lands on Tile 1 and pays rent to P0
    const p1Before = p1.gold;
    const p0Before = p0.gold;
    p1.position = 1;
    const resolution = engine.resolveTileLanding(p1.id);
    expect(resolution.action).toBe('PAID_RENT');
    expect(p1.gold).toBe(p1Before - festivalRent);
    expect(p0.gold).toBe(p0Before + festivalRent);
  });

  it('enforces Deserted Island (Tile 7) skip-1-turn and The End Portal (Tile 21) teleportation', () => {
    const engine = new GameEngine('SOLO_VS_AI', 1);
    const p0 = engine.getCurrentPlayer();

    // Land on Deserted Island (Tile 7)
    p0.position = 7;
    const islandRes = engine.resolveTileLanding(p0.id);
    expect(islandRes.action).toBe('SKIP_TURN_SET');
    expect(p0.skipTurns).toBe(1);

    // Teleport from End Portal (Tile 21) to Tile 2 (passes Start 0 -> +200 Gold)
    p0.position = 21;
    const goldBefore = p0.gold;
    const teleRes = engine.teleportFromEndPortal(p0.id, 2);
    expect(teleRes.ok).toBe(true);
    expect(p0.position).toBe(2);
    expect(teleRes.passedStart).toBe(true);
    expect(p0.gold).toBe(goldBefore + 200);
  });

  it('Smart Bot AI makes strategic buy, upgrade, and portal decisions', () => {
    const engine = new GameEngine('SOLO_VS_AI', 1);
    const bot = engine.getPlayers()[1]; // Bot player
    bot.gold = 800;
    bot.position = 4; // Unowned Oak Forest property

    const decision = chooseBotAction(engine, bot.id);
    expect(decision.type).toBe('BUY_PROPERTY');
    expect(decision.tileIndex).toBe(4);
  });
});
