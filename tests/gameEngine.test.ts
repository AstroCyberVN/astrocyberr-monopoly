import { describe, it, expect } from 'vitest';
import { BOARD_TILES, BOARD_SIZE, CHARACTER_CONFIGS } from '../src/core/boardData';
import { GameEngine } from '../src/core/gameEngine';
import { chooseBotAction } from '../src/core/botAI';

describe('AstroCyberr Monopoly v4.0 — Real Monopoly 40-Tile Config, Rent Reason Confirmation & Direct Bankruptcy', () => {
  it('defines exactly 40 perimeter tiles based on real Monopoly structure with outward-facing rotation angles', () => {
    expect(BOARD_SIZE).toBe(40);
    expect(BOARD_TILES).toHaveLength(40);

    expect(BOARD_TILES[0].type).toBe('START');
    expect(BOARD_TILES[4].type).toBe('ROYAL_TAX');
    expect(BOARD_TILES[10].type).toBe('DESERTED_ISLAND');
    expect(BOARD_TILES[20].type).toBe('FESTIVAL');
    expect(BOARD_TILES[30].type).toBe('END_PORTAL');
    expect(BOARD_TILES[33].type).toBe('NETHER_PORTAL');

    expect(BOARD_TILES[5].outwardRotationY).toBeCloseTo(0);
    expect(BOARD_TILES[15].outwardRotationY).toBeCloseTo(-Math.PI / 2);
    expect(BOARD_TILES[25].outwardRotationY).toBeCloseTo(Math.PI);
    expect(BOARD_TILES[35].outwardRotationY).toBeCloseTo(Math.PI / 2);

    const properties = BOARD_TILES.filter((t) => t.type === 'PROPERTY');
    expect(properties.length).toBe(23);
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

  it('detects Doubles roll (d1 === d2) and grants extra turn bonus', () => {
    const engine = new GameEngine('SOLO_VS_AI', 1);
    const rollDouble = engine.rollDice([4, 4]);
    expect(rollDouble.isDoubles).toBe(true);
    expect(rollDouble.total).toBe(8);

    const rollNormal = engine.rollDice([3, 5]);
    expect(rollNormal.isDoubles).toBe(false);
    expect(rollNormal.total).toBe(8);
  });

  it('auto-liquidates owned properties at 75% value to save a player from tax bankruptcy', () => {
    const engine = new GameEngine('PASS_AND_PLAY', 2);
    const [p0] = engine.getPlayers();
    p0.gold = 450;
    // Buy Tile 39 (Boardwalk price $400 -> 75% resale value = $300)
    engine.buyProperty(p0.id, 39);
    expect(p0.gold).toBe(50);

    // Land on Luxury Tax #36 (-$100) -> gold drops to -$50 -> triggers auto-liquidation of Tile 39
    p0.position = 36;
    engine.resolveTileLanding(p0.id);

    expect(p0.bankrupt).toBe(false);
    expect(p0.gold).toBeGreaterThan(0);
    expect(engine.getTileState(39).ownerId).toBeNull();
  });

  it('supports buying a property, upgrading to Level 4, and calculating Monopoly set + Festival rent', () => {
    const engine = new GameEngine('PASS_AND_PLAY', 2);
    const [p0, p1] = engine.getPlayers();
    p0.gold = 3000;

    // Plains set in real Monopoly layout is Tiles #1 and #3
    engine.buyProperty(p0.id, 1);
    const singleRent = engine.calculateRent(1);

    engine.buyProperty(p0.id, 3);
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
    bot.position = 6;

    const decision = chooseBotAction(engine, bot.id);
    expect(decision.type).toBe('BUY_PROPERTY');
    expect(decision.tileIndex).toBe(6);
  });

  it('supports Nether Portal (Tile 33) x8 Overworld dimension warp and deferred Rent Confirmation + Direct Bankruptcy', () => {
    const engine = new GameEngine('PASS_AND_PLAY', 2);
    const [p0, p1] = engine.getPlayers();

    // 1. Test Nether Portal (Tile 33): 2 Nether steps = 16 Overworld steps -> (33 + 16) % 40 = 9
    p0.position = 33;
    const beforeWarpGold = p0.gold;
    const warp = engine.warpThroughNetherPortal(p0.id, 2);
    expect(warp.netherDie).toBe(2);
    expect(warp.overworldSteps).toBe(16);
    expect(warp.targetTileIndex).toBe(9);
    expect(warp.passedStart).toBe(true);
    expect(p0.gold).toBe(beforeWarpGold + 120 + 200);

    // 2. Test Deferred Rent Confirmation (Space) when player can afford rent
    engine.buyProperty(p0.id, 9);
    p1.position = 9;
    const p1Before = p1.gold;
    const rentPreview = engine.resolveTileLanding(p1.id, { deferRentPayment: true });
    expect(rentPreview.action).toBe('PAID_RENT');
    expect(rentPreview.canAffordRent).toBe(true);
    expect(rentPreview.rentReason).toContain('Quảng Trường Tháp Đồng Hồ');
    // Gold is NOT deducted until executeConfirmedRentPayment is called!
    expect(p1.gold).toBe(p1Before);

    const confirmed = engine.executeConfirmedRentPayment(p1.id, 9);
    expect(confirmed.bankrupt).toBe(false);
    expect(p1.gold).toBe(p1Before - confirmed.paidAmount);

    // 3. Test Direct Bankruptcy Elimination when player cannot afford rent
    p1.gold = 10; // Rent on Tile #9 is $40, p1 only has $10
    const bankruptPreview = engine.resolveTileLanding(p1.id, { deferRentPayment: true });
    expect(bankruptPreview.canAffordRent).toBe(false);

    const bankruptExec = engine.executeConfirmedRentPayment(p1.id, 9);
    expect(bankruptExec.bankrupt).toBe(true);
    expect(p1.bankrupt).toBe(true);
    expect(p1.gold).toBe(0);
  });
});
