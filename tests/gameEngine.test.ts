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
    expect(BOARD_TILES[38].type).toBe('ROYAL_TAX');

    expect(BOARD_TILES[5].outwardRotationY).toBeCloseTo(0);
    expect(BOARD_TILES[15].outwardRotationY).toBeCloseTo(-Math.PI / 2);
    expect(BOARD_TILES[25].outwardRotationY).toBeCloseTo(Math.PI);
    expect(BOARD_TILES[35].outwardRotationY).toBeCloseTo(Math.PI / 2);

    const properties = BOARD_TILES.filter((t) => t.type === 'PROPERTY');
    expect(properties.length).toBe(22);
    const railroads = BOARD_TILES.filter((t) => t.type === 'RAILROAD');
    expect(railroads.length).toBe(4);
    const utilities = BOARD_TILES.filter((t) => t.type === 'UTILITY');
    expect(utilities.length).toBe(2);
    const chests = BOARD_TILES.filter((t) => t.type === 'CHEST');
    expect(chests.length).toBe(6);
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

    // Land on Luxury Tax #38 (-$100) -> gold drops to -$50 -> triggers auto-liquidation of Tile 39
    p0.position = 38;
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

  it('supports Chibi Passive Skills (FEAT-03), Hostile Takeover (FEAT-01), and Emergency Liquidation (FEAT-02)', () => {
    const engine = new GameEngine('PASS_AND_PLAY', 4);
    const [steve, alex, creeper, enderman] = engine.getPlayers();

    // 1. Steve (-15% upgrade cost) & Alex (+$240 on Start pass)
    engine.buyProperty(steve.id, 1);
    const baseUpCost = engine.getTileConfig(1).upgradeCost ?? 50;
    expect(engine.getEffectiveUpgradeCost(steve.id, 1)).toBe(Math.round(baseUpCost * 0.85));

    alex.position = 39;
    const alexBefore = alex.gold;
    engine.stepPlayerOneTile(alex.id);
    expect(alex.gold).toBe(alexBefore + 240);

    // 2. Creeper (-20% Royal Tax) & Enderman (+$50 portal crystal bonus)
    expect(engine.getEffectiveTaxAmount(creeper.id, 200)).toBe(160);
    const enderBefore = enderman.gold;
    engine.teleportFromEndPortal(enderman.id, 5);
    expect(enderman.gold).toBe(enderBefore + 50);

    // 3. Hostile Takeover (FEAT-01) on Steve's Tile #1 by Alex
    const buyoutCost = engine.getBuyoutCost(1);
    expect(buyoutCost).toBeGreaterThan(0);
    const takeover = engine.buyoutOpponentProperty(alex.id, 1);
    expect(takeover.ok).toBe(true);
    expect(engine.getTileState(1).ownerId).toBe(alex.id);

    // 4. Emergency Liquidation (FEAT-02) of Alex's Tile #1 at 75% value
    const liqList = engine.getPlayerLiquidatableProperties(alex.id);
    expect(liqList.some((item) => item.tileIndex === 1)).toBe(true);
    const sold = engine.liquidateProperty(alex.id, 1);
    expect(sold.ok).toBe(true);
    expect(engine.getTileState(1).ownerId).toBeNull();
  });

  it('enforces Wikipedia Monopoly rules: 4 Railroads ($25/$50/$100/$200), 2 Utilities (4x/10x dice), Even Building, Mortgage (50%/55%), Auction, and 3x Doubles to Jail', () => {
    const engine = new GameEngine('PASS_AND_PLAY', 2);
    const [p0, p1] = engine.getPlayers();
    p0.gold = 3000;

    // 1. 4 Railroads rent progression: $25 -> $50 -> $100 -> $200
    engine.buyProperty(p0.id, 5);
    expect(engine.calculateRent(5)).toBe(25);
    engine.buyProperty(p0.id, 15);
    expect(engine.calculateRent(5)).toBe(50);
    engine.buyProperty(p0.id, 25);
    expect(engine.calculateRent(5)).toBe(100);
    engine.buyProperty(p0.id, 35);
    expect(engine.calculateRent(5)).toBe(200);

    // 2. 2 Utilities rent: 4x dice (1 owned) and 10x dice (2 owned)
    engine.rollDice([3, 5]); // total = 8
    engine.buyProperty(p0.id, 12);
    expect(engine.calculateRent(12)).toBe(8 * 4);
    engine.buyProperty(p0.id, 28);
    expect(engine.calculateRent(12)).toBe(8 * 10);

    // 3. Even Building rule on Brown set (#1 and #3)
    engine.buyProperty(p0.id, 1);
    engine.buyProperty(p0.id, 3);
    expect(engine.upgradeProperty(p0.id, 1).ok).toBe(true); // #1 is now Level 2, #3 is Level 1
    // Cannot upgrade #1 to Level 3 while #3 is still Level 1!
    expect(engine.upgradeProperty(p0.id, 1).ok).toBe(false);
    expect(engine.upgradeProperty(p0.id, 3).ok).toBe(true); // #3 is now Level 2
    expect(engine.upgradeProperty(p0.id, 1).ok).toBe(true); // Now #1 can reach Level 3!

    // 4. Mortgage (50%) & Unmortgage (55%)
    const mortRes = engine.mortgageProperty(p0.id, 5); // Railroad #5 ($200 -> +$100)
    expect(mortRes.ok).toBe(true);
    expect(mortRes.mortgageValue).toBe(100);
    expect(engine.calculateRent(5)).toBe(0);
    const unmortRes = engine.unmortgageProperty(p0.id, 5); // -$110
    expect(unmortRes.ok).toBe(true);
    expect(unmortRes.unmortgageCost).toBe(110);

    // 5. Public Auction on unowned Tile #6
    const aucRes = engine.runPropertyAuction(6, { [p1.id]: 95 });
    expect(aucRes.winnerId).toBe(p1.id);
    expect(aucRes.winningBid).toBe(95);
    expect(engine.getTileState(6).ownerId).toBe(p1.id);

    // 6. 3 Consecutive Doubles -> Sent to #10 Jail
    engine.rollDice([2, 2]);
    engine.rollDice([3, 3]);
    const thirdDouble = engine.rollDice([6, 6]);
    expect(thirdDouble.sentToJailByTripleDoubles).toBe(true);
    expect(p0.position).toBe(10);
    expect(p0.skipTurns).toBe(1);
  });
});
