import * as THREE from 'three';
import { gameState, subscribeGameState } from '../../game/GameState';
import { SEED_CONFIG, SEED_IDS, type SeedId } from '../garden/types';
import type { IModule } from '../IModule';

const SEED_EMOJI: Record<SeedId, string> = {
  tulip: '🌷',
  rose: '🌹',
  sunflower: '🌻',
  hibiscus: '🌺',
  cherry_blossom: '🌸',
  daisy: '🌼',
  lotus: '🪷',
  hyacinth: '🪻',
  white_flower: '💮',
  rosette: '🏵',
};

export class BottomSeedDockModule implements IModule {
  readonly name = 'BottomSeedDockModule';

  private root: HTMLDivElement | null = null;

  init(_scene: THREE.Scene): void {
    const el = document.createElement('div');
    el.id = 'seed-dock-v2';
    el.innerHTML = `
      <style>
        #seed-dock-v2 { position: fixed; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 85; width: min(1120px, calc(100vw - 24px)); pointer-events: auto; background: rgba(15, 20, 28, 0.92); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 8px 10px; box-shadow: 0 10px 22px rgba(0,0,0,.35); }
        #seed-dock-v2 .dock-title { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #8fb6ff; }
        #seed-dock-v2 .seed-row { display: flex; gap: 8px; overflow-x: auto; white-space: nowrap; scrollbar-width: thin; }
        #seed-dock-v2 .chip { flex: 0 0 auto; margin: 0; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.14); background: #1f2630; color: #e6edf3; cursor: pointer; }
        #seed-dock-v2 .chip.active { border-color: #6bb9ff; background: #244261; }
      </style>
      <div class="dock-title">选择种植的种子</div>
      <div class="seed-row"></div>
    `;
    document.body.appendChild(el);
    this.root = el;

    this.root.addEventListener('pointerdown', (e) => {
      const target = (e.target as Element | null)?.closest('[data-seed]') as HTMLElement | null;
      if (!target) return;
      const seed = target.dataset.seed as SeedId | undefined;
      if (!seed) return;
      gameState.selectedSeed = seed;
      this.refresh();
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('keydown', this.onKeyDown);
    subscribeGameState(() => this.refresh());
    this.refresh();
  }

  update(_delta: number): void {}

  private onKeyDown = (e: KeyboardEvent): void => {
    const digitOrder = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'] as const;
    const di = digitOrder.indexOf(e.code as (typeof digitOrder)[number]);
    if (di >= 0 && di < SEED_IDS.length) this.refresh();
  };

  private refresh(): void {
    const row = this.root?.querySelector('.seed-row');
    if (!(row instanceof HTMLElement)) return;
    row.innerHTML = SEED_IDS.map((seedId) => {
      const active = gameState.selectedSeed === seedId ? 'active' : '';
      const cfg = SEED_CONFIG[seedId];
      return `<button class="chip ${active}" data-seed="${seedId}">${SEED_EMOJI[seedId]} ${cfg.label} x${gameState.seeds[seedId]}</button>`;
    }).join('');
  }
}

