import { gameState, notifyGameState, pushLog } from '../../game/GameState';
import type { SeedId } from '../garden/types';
import { SEED_CONFIG } from '../garden/types';

export function takeFlowerFromInventoryV2(seedId: SeedId): boolean {
  const idx = gameState.flowers.findIndex((f) => f.seedId === seedId);
  if (idx < 0) {
    pushLog('背包里没有这种花。');
    return false;
  }
  const emptySlot = gameState.arrangementSlots.findIndex((s) => s === null);
  if (emptySlot < 0) {
    pushLog('插花槽已满（3格），请先开始插花或清空槽位。');
    return false;
  }
  gameState.flowers.splice(idx, 1);
  gameState.arrangementSlots[emptySlot] = seedId;
  notifyGameState();
  return true;
}

export function clearArrangementSlotsV2(): void {
  gameState.arrangementSlots = [null, null, null];
  gameState.selectedArrangementSeed = null;
  notifyGameState();
}

export function finishArrangementCraftV2(): boolean {
  const slots = gameState.arrangementSlots.filter((s): s is SeedId => s !== null);
  if (slots.length < 3) {
    pushLog('需要先放满3朵花，才能开始插花。');
    return false;
  }
  const sorted = [...slots].sort();
  const bouquetPrefix = sorted
    .map((s) => {
      const name = SEED_CONFIG[s].label;
      return name.length > 0 ? name[0] : '';
    })
    .join('');
  const label = bouquetPrefix ? `${bouquetPrefix}花束` : '花束';
  const unique = new Set(sorted).size;
  const value = Math.round(sorted.reduce((sum, s) => sum + SEED_CONFIG[s].sellBase, 0) * 1.35 + unique * 8);
  const bouquet = {
    id: `bouquet_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    label,
    seeds: sorted,
    value,
  };
  gameState.bouquets.push(bouquet);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game:arrangement-finish', { detail: { seeds: sorted } }));
    window.dispatchEvent(new CustomEvent('game:toast', { detail: { message: `插花成功：${bouquet.label}`, kind: 'arrangement' } }));
  }
  pushLog(`完成插花合成：${bouquet.label}（价值 ${value} 金币），已放入花束背包。`);
  window.setTimeout(() => clearArrangementSlotsV2(), 1600);
  notifyGameState();
  return true;
}

export function arrangementPreviewLabelV2(): string {
  return gameState.arrangementSlots
    .map((s, i) => (s ? `${i + 1}.${SEED_CONFIG[s].label}` : `${i + 1}.空`))
    .join(' / ');
}
