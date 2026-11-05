import { describe, it, expect } from 'vitest';
import { BOARD_TILES, BOARD_SIZE, CHARACTER_CONFIGS, getTileAnalytics } from '../src/core/boardData';
import { GameEngine } from '../src/core/gameEngine';
import { chooseBotAction } from '../src/core/botAI';
import { escapeHtml, sanitizeColorHex, validateRulesConfig } from '../src/utils/security';
import { gameEventBus } from '../src/core/EventBus';

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

  it('enforces Vietnamese Monopoly Thăm Tù (Tile 10) vs Đi Thẳng Vào Tù (Tile 30) and programmatic portal teleportation', () => {
    const engine = new GameEngine('SOLO_VS_AI', 1);
    const p0 = engine.getCurrentPlayer();

    // Walking onto #10 is Just Visiting (Thăm Tù) — no turn lost and not inJail!
    p0.position = 10;
    const visitRes = engine.resolveTileLanding(p0.id);
    expect(visitRes.action).toBe('JUST_VISITING_JAIL');
    expect(p0.inJail).toBe(false);
    expect(p0.skipTurns).toBe(0);

    // Walking onto #30 sends player directly to #10 Jail (Ở Tù)!
    p0.position = 30;
    const arrestRes = engine.resolveTileLanding(p0.id);
    expect(arrestRes.action).toBe('SENT_TO_JAIL');
    expect(p0.position).toBe(10);
    expect(p0.inJail).toBe(true);

    // Programmatic portal helper still works
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
    expect(rentPreview.rentReason).toContain('Thị Nghè');
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

    // 6. 3 Consecutive Doubles -> Sent to #10 Jail (Ở Tù)
    engine.rollDice([2, 2]);
    engine.rollDice([3, 3]);
    const thirdDouble = engine.rollDice([6, 6]);
    expect(thirdDouble.sentToJailByTripleDoubles).toBe(true);
    expect(p0.position).toBe(10);
    expect(p0.inJail).toBe(true);
  });

  it('implements Vietnamese Monopoly (Cờ Tỷ Phú Bản Việt Nam) tiles, Khí Vận & Cơ Hội decks, and 3 Jail Escape methods', () => {
    const engine = new GameEngine('PASS_AND_PLAY', 4);
    const [p0, p1, p2, p3] = engine.getPlayers();

    // 1. Verify classic Vietnamese landmarks on the 40-tile board
    expect(engine.getTileConfig(1).name).toBe('Phú Lâm');
    expect(engine.getTileConfig(3).name).toBe('Nhà Bè');
    expect(engine.getTileConfig(5).name).toBe('Bến Xe Miền Tây');
    expect(engine.getTileConfig(13).name).toBe('Bến Thành');
    expect(engine.getTileConfig(18).name).toBe('Chợ Lớn');
    expect(engine.getTileConfig(26).name).toBe('Vũng Tàu');
    expect(engine.getTileConfig(32).name).toBe('Phố Đi Bộ Nguyễn Huệ');
    expect(engine.getTileConfig(34).name).toBe('Đường Đồng Khởi');
    expect(engine.getTileConfig(39).name).toContain('Dinh Độc Lập');

    // 2. Test Khí Vận card "Mừng Sinh Nhật" (collect $25 from each of the 3 other players = +$75)
    p0.position = 2;
    const p0BeforeBirthday = p0.gold;
    const p1BeforeBirthday = p1.gold;
    const birthdayRes = engine.resolveTileLanding(p0.id, { forcedCardId: 'kv_birthday' });
    expect(birthdayRes.action).toBe('CHEST_DRAWN');
    expect(p0.gold).toBe(p0BeforeBirthday + 75);
    expect(p1.gold).toBe(p1BeforeBirthday - 25);
    expect(p2.gold).toBe(p1BeforeBirthday - 25);
    expect(p3.gold).toBe(p1BeforeBirthday - 25);

    // 3. Test Cơ Hội card "Tiến Lên 3 Bước" (+3 steps), "Lùi Lại 3 Bước" (-3 steps), and "Hội Nghị Dinh Độc Lập" (#39)
    p0.position = 7;
    const fwdRes = engine.resolveTileLanding(p0.id, { forcedCardId: 'ch_forward_3' });
    expect(p0.position).toBe(10);
    expect(fwdRes.movedFromTile).toBe(7);
    expect(fwdRes.movedToTile).toBe(10);
    expect(fwdRes.moveDirection).toBe('FORWARD');

    p0.position = 22;
    const backRes = engine.resolveTileLanding(p0.id, { forcedCardId: 'ch_back_3' });
    expect(p0.position).toBe(19);
    expect(backRes.movedFromTile).toBe(22);
    expect(backRes.movedToTile).toBe(19);
    expect(backRes.moveDirection).toBe('BACKWARD');

    p0.position = 17;
    const dinhRes = engine.resolveTileLanding(p0.id, { forcedCardId: 'kv_dinh_doc_lap' });
    expect(p0.position).toBe(39);
    expect(dinhRes.movedFromTile).toBe(17);
    expect(dinhRes.movedToTile).toBe(39);
    expect(dinhRes.moveDirection).toBe('FORWARD');

    // 4. Test "Thẻ Ra Tù Miễn Phí" & "Đi Thẳng Vào Tù" + 3 Jail Escape Methods
    p0.position = 17;
    engine.resolveTileLanding(p0.id, { forcedCardId: 'kv_jail_free' });
    expect(p0.jailFreeCards).toBe(1);

    p0.position = 36;
    const jailCardRes = engine.resolveTileLanding(p0.id, { forcedCardId: 'ch_go_to_jail' });
    expect(p0.position).toBe(10);
    expect(p0.inJail).toBe(true);
    expect(jailCardRes.sentToJailByCard).toBe(true);
    expect(jailCardRes.movedFromTile).toBe(36);
    expect(jailCardRes.movedToTile).toBe(10);

    // Escape Method A: Use Free Jail Card
    const cardEscape = engine.useJailFreeCard(p0.id);
    expect(cardEscape.ok).toBe(true);
    expect(p0.inJail).toBe(false);
    expect(p0.jailFreeCards).toBe(0);

    // Escape Method B: Pay $50 Bail
    engine.sendPlayerToJail(p0.id, 'Test nộp phạt');
    const goldBeforeFine = p0.gold;
    const fineEscape = engine.payJailFine(p0.id, 50);
    expect(fineEscape.ok).toBe(true);
    expect(p0.inJail).toBe(false);
    expect(p0.gold).toBe(goldBeforeFine - 50);

    // Escape Method C: Roll Doubles in Jail
    engine.sendPlayerToJail(p0.id, 'Test đổ đôi');
    const rollEscape = engine.attemptRollDoublesInJail(p0.id, [4, 4]);
    expect(rollEscape.escaped).toBe(true);
    expect(rollEscape.total).toBe(8);
    expect(p0.inJail).toBe(false);
  });

  it('implements v5.0 Full Architectural Rebirth: Primary Character Selection, Steve Discount Consistency, Creeper +15% Buyout Surcharge, Enderman Teleport/Jail Passive, Festival 3-Round TTL, P2P Trading & Security Utils', () => {
    // 1. Primary Human Character Selection places chosen character at p1
    const engine = new GameEngine('SOLO_VS_AI', 1);
    engine.initGame('SOLO_VS_AI', 1, 1500, 'enderman');
    const [p1, p2, p3, p4] = engine.getPlayers();
    expect(p1.characterId).toBe('enderman');
    expect(new Set([p1.characterId, p2.characterId, p3.characterId, p4.characterId]).size).toBe(4);

    // 2. Enderman Passive (+$50) triggers on #30 End Portal -> Jail, Jail Escape, and Chest Card movement
    p1.position = 30;
    const beforeArrest = p1.gold;
    engine.resolveTileLanding(p1.id);
    expect(p1.inJail).toBe(true);
    expect(p1.gold).toBe(beforeArrest + 50);

    const beforeEscape = p1.gold;
    engine.payJailFine(p1.id, 50);
    expect(p1.inJail).toBe(false);
    // Paid $50 bail, gained +$50 Enderman passive -> net 0!
    expect(p1.gold).toBe(beforeEscape);

    p1.position = 7;
    const beforeChestTeleport = p1.gold;
    engine.resolveTileLanding(p1.id, { forcedCardId: 'ch_forward_3' });
    expect(p1.position).toBe(10);
    expect(p1.gold).toBe(beforeChestTeleport + 50);

    // 3. Steve -15% upgrade discount consistency in getMortgageValue & getLiquidationValue
    const stevePlayer = engine.getPlayers().find((p) => p.characterId === 'steve')!;
    stevePlayer.gold = 3000;
    engine.buyProperty(stevePlayer.id, 1); // Price $60, UpgradeCost $50 -> Steve pays $43
    engine.buyProperty(stevePlayer.id, 3);
    engine.upgradeProperty(stevePlayer.id, 1); // Level 2: invested $60 + $43 = $103
    expect(engine.getMortgageValue(1)).toBe(Math.round(103 * 0.5));
    expect(engine.getLiquidationValue(1)).toBe(Math.round(103 * 0.75));

    // 4. Creeper +15% TNT Hazard Surcharge on Hostile Buyout
    const creeperPlayer = engine.getPlayers().find((p) => p.characterId === 'creeper')!;
    creeperPlayer.gold = 2000;
    engine.buyProperty(creeperPlayer.id, 6); // Price $100
    const creeperBuyoutCost = engine.getBuyoutCost(6);
    // Base buyout = $100 * 1.6 = $160; Creeper +15% surcharge = Math.round(160 * 1.15) = $184
    expect(creeperBuyoutCost).toBe(Math.round(100 * 1.6 * 1.15));

    // 5. Festival 3-Round TTL ticks down in nextTurn() and resets multiplier
    engine.applyFestivalBoost(stevePlayer.id, 1);
    expect(engine.getTileState(1).festivalMultiplier).toBe(2);
    expect(engine.getTileState(1).festivalTurnsLeft).toBe(3);

    // Advance 3 full rounds (4 players * 3 rounds = 12 nextTurn calls)
    for (let i = 0; i < 12; i++) {
      engine.nextTurn();
    }
    expect(engine.getTileState(1).festivalTurnsLeft).toBe(0);
    expect(engine.getTileState(1).festivalMultiplier).toBe(1);

    // 6. Player-to-Player / Player-to-Bot Property Trading & Net Worth calculation
    const netWorthBefore = engine.calculatePlayerNetWorth(creeperPlayer.id);
    expect(netWorthBefore).toBeGreaterThan(creeperPlayer.gold);

    const tradeEvents: string[] = [];
    const unsub = gameEventBus.on('PROPERTY_TRADED', (ev) => {
      tradeEvents.push(`${ev.proposerId}->${ev.targetOwnerId}@${ev.tileIndex}`);
    });
    const tradeRes = engine.proposePropertyTrade(stevePlayer.id, 6, 130); // Offer $130 for $100 Tile #6 (>= 1.15x threshold for Bot)
    unsub();
    expect(tradeRes.ok).toBe(true);
    expect(tradeRes.accepted).toBe(true);
    expect(engine.getTileState(6).ownerId).toBe(stevePlayer.id);
    expect(tradeEvents.length).toBe(1);

    // 7. Security & Analytics helpers
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(sanitizeColorHex('#10b981')).toBe('#10b981');
    expect(sanitizeColorHex('javascript:alert(1)', '#000000')).toBe('#000000');
    const validatedRules = validateRulesConfig(
      { startingGold: 999999, hostileBuyoutMultiplierPct: 10 },
      {
        startingGold: 1500,
        passStartReward: 200,
        jailFineAmount: 50,
        mortgageRatePct: 50,
        unmortgageRatePct: 55,
        liquidationRatePct: 75,
        monopolyBonusPct: 150,
        hostileBuyoutMultiplierPct: 160,
        netherWarpGoldBonus: 120,
        festivalNoPropertyGoldBonus: 80,
        steveUpgradeDiscountPct: 15,
        alexStartBonus: 40,
        creeperTaxDiscountPct: 20,
        endermanPortalBonus: 50
      }
    );
    expect(validatedRules.startingGold).toBe(50000); // Clamped max
    expect(validatedRules.hostileBuyoutMultiplierPct).toBe(100); // Clamped min

    const analytics = getTileAnalytics(39);
    expect(analytics.markovProbabilityPct).toBeGreaterThan(2);
    expect(analytics.baseRoiPct).toBeGreaterThan(0);
  });
});
