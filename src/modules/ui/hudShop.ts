
import { gameState, notifyGameState, pushLog } from '../../game/GameState';
import type { SeedId } from '../garden/types';
import { SEED_CONFIG } from '../garden/types';

/**
 * 商店（买种、卖花）。改价格与规则只动本文件。
 */
export function buySeed(seed: SeedId): void {
  const price = SEED_CONFIG[seed].seedPrice;
  if (gameState.gold < price) {
    pushLog('金币不足，先去收获或卖花。');
    return;
  }
  gameState.gold -= price;
  gameState.seeds[seed] += 1;
  pushLog(`购买：${SEED_CONFIG[seed].label} 种子（-${price} 金币）。`);
  notifyGameState();
}

export function sellAllFlowersFromInventory(): void {
  if (gameState.flowers.length === 0) {
    pushLog('背包里没有花可卖。');
    return;
  }
  let total = 0;
  for (const f of gameState.flowers) {
    const rareBonus = f.rare ? 8 : 0;
    total += SEED_CONFIG[f.seedId].sellBase + f.quality * 3 + rareBonus;
  }
  gameState.flowers = [];
  gameState.gold += total;
  pushLog(`卖花收入 +${total} 金币。`);
  notifyGameState();
}

export function sellAllBouquetsFromInventory(): void {
  if (gameState.bouquets.length === 0) {
    pushLog('背包里没有花束可卖。');
    return;
  }
  const total = gameState.bouquets.reduce((sum, b) => sum + b.value, 0);
  gameState.bouquets = [];
  gameState.gold += total;
  pushLog(`卖花束收入 +${total} 金币。`);
  notifyGameState();
}

export function sellAllInventoryForGold(): void {
  const flowerTotal = gameState.flowers.reduce(
    (sum, f) => sum + SEED_CONFIG[f.seedId].sellBase + f.quality * 3 + (f.rare ? 8 : 0),
    0,
  );
  const bouquetTotal = gameState.bouquets.reduce((sum, b) => sum + b.value, 0);
  const total = flowerTotal + bouquetTotal;
  if (total <= 0) {
    pushLog('背包里没有可出售的花朵或花束。');
    return;
  }
  gameState.flowers = [];
  gameState.bouquets = [];
  gameState.gold += total;
  pushLog(`卖出背包花朵/花束，收入 +${total} 金币。`);
  notifyGameState();
}
