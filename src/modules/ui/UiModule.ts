
import * as THREE from 'three';
import { gameState, notifyGameState, subscribeGameState } from '../../game/GameState';
import {
  arrangementPreviewLabel,
  clearArrangementSlots,
  finishArrangementCraft,
} from '../arrangement/arrangementLogic';
import { resetGameToDefault } from '../../game/saveLocal';
import { weatherLabel } from '../garden/GardenWeather';
import { SEED_CONFIG, SEED_IDS, type SeedId } from '../garden/types';
import { STEAL_SUCCESS_RATE } from '../social/socialSteal';
import { buySeed, sellAllInventoryForGold } from './hudShop';
import type { IModule } from '../IModule';

/** 鍟嗗簵/閫夌鍥炬爣锛堜笉渚濊禆 public 涓?svg 鏄惁瀛樺湪锛?*/
const SEED_EMOJI: Record<SeedId, string> = {
  tulip: '馃尫',
  rose: '馃尮',
  sunflower: '馃尰',
  hibiscus: '馃尯',
  cherry_blossom: '馃尭',
  daisy: '馃尲',
  lotus: '馃',
  hyacinth: '馃拹',
  white_flower: '鉂€',
  rosette: '🌺',
};

function seedHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * 鐣岄潰鎬绘帶銆傛敼甯冨眬/鏍峰紡涓昏鍔ㄦ湰鏂囦欢锛涘晢搴楅€昏緫鍦?hudShop.ts锛涙彃鑺遍€昏緫鍦?arrangement/
 */
export class UiModule implements IModule {
  readonly name = 'UiModule';

  private root: HTMLDivElement | null = null;
  private shopOpen = false;
  private uiClickBound = false;
  private shelfOffset = 0;
  private toastTimer: number | null = null;

  init(_scene: THREE.Scene): void {
    this.mount();
    subscribeGameState(() => this.refresh());
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('game:toast', this.onGameToast as EventListener);
    this.refresh();
  }

  update(_delta: number): void {}

  private mount(): void {
    const el = document.createElement('div');
    el.id = 'game-hud';
    el.innerHTML = `
      <style>
        #game-hud {
          position: fixed;
          left: 10px;
          top: 10px;
          z-index: 50;
          width: min(400px, 92vw);
          font: 13px/1.4 system-ui, sans-serif;
          color: #e6edf3;
          pointer-events: none;
        }
        #hud-scroll {
          max-height: calc(100vh - 20px);
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 6px;
          pointer-events: auto;
          scrollbar-gutter: stable;
        }
        #hud-scroll::-webkit-scrollbar {
          width: 6px;
        }
        #hud-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
          border-radius: 4px;
        }
        #game-hud .panel {
          pointer-events: auto;
          background: rgba(15, 20, 28, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 6px;
        }
        #game-hud h3 {
          margin: 0 0 6px;
          font-size: 13px;
          font-weight: 600;
          color: #8fb6ff;
        }
        #game-hud button {
          margin: 2px 4px 2px 0;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: #1f2630;
          color: #e6edf3;
          cursor: pointer;
        }
        #game-hud button:hover {
          background: #2a3340;
        }
        #game-hud .row {
          margin: 4px 0;
        }
        #game-hud .hint {
          font-size: 12px;
          opacity: 0.78;
        }
        #game-hud .log {
          max-height: 88px;
          overflow: auto;
          font-size: 11px;
          opacity: 0.9;
          white-space: pre-wrap;
        }
        #game-hud details.hud-details {
          margin-top: 6px;
          font-size: 11px;
          line-height: 1.45;
        }
        #game-hud details.hud-details summary {
          cursor: pointer;
          color: #f0c46a;
          font-weight: 600;
          list-style: none;
        }
        #game-hud details.hud-details summary::-webkit-details-marker {
          display: none;
        }
        #game-hud .shop-card-visual {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        #game-hud .shop-emoji {
          font-size: 26px;
          line-height: 1;
        }
        #game-hud .shop-swatch {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          border: 2px solid rgba(255, 255, 255, 0.22);
          flex-shrink: 0;
        }
        #game-hud .shop-entry {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        #game-hud .shop-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        #game-hud #hud-shop-modal {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(520px, 94vw);
          z-index: 60;
          pointer-events: auto;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
        }
        #game-hud .shop-shelf {
          flex: 1 1 auto;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          touch-action: none;
          user-select: none;
          cursor: grab;
          padding-bottom: 6px;
        }
        #game-hud .shop-shelf.dragging {
          cursor: grabbing;
        }
        #game-hud .shop-shelf-track {
          display: flex;
          gap: 10px;
          will-change: transform;
        }
        #game-hud .shop-shelf-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
        }
        #game-hud .shelf-nav {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          padding: 0;
          line-height: 1;
          font-size: 16px;
        }
        #game-hud .shop-card {
          flex: 0 0 158px;
          min-width: 158px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.04);
          scroll-snap-align: start;
        }
        #game-hud .shop-card h4 {
          margin: 0 0 6px;
          font-size: 13px;
          color: #f2dc91;
        }
        #game-hud .shop-price {
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 6px;
        }
        #game-hud .seed-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        #game-hud .arrange-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        #game-hud .arrange-card {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
        }
        #game-hud .arrange-card img {
          width: 18px;
          height: 18px;
          object-fit: contain;
        }
        #game-hud .arrange-card.active {
          border-color: #6bb9ff;
          background: #244261;
        }
        #game-hud .seed-chip.active {
          border-color: #6bb9ff;
          background: #244261;
        }
        #game-hud .inventory-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }
        #game-hud .inv-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 6px;
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 12px;
        }
        #game-hud .inv-item img {
          width: 16px;
          height: 16px;
          object-fit: contain;
          flex-shrink: 0;
        }
        #game-hud .inv-emoji {
          width: 16px;
          text-align: center;
          flex-shrink: 0;
        }
        #game-hud .inventory-flow {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        #hud-center-toast {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 90;
          background: rgba(10, 18, 30, 0.92);
          border: 1px solid rgba(130, 210, 255, 0.65);
          color: #ecf6ff;
          border-radius: 12px;
          padding: 12px 18px;
          font-size: 18px;
          font-weight: 700;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        #hud-center-toast.show {
          opacity: 1;
        }
      </style>
      <div id="hud-scroll">
        <div class="panel" id="hud-status"></div>
        <div class="panel" id="hud-inventory"></div>
        <div class="panel" id="hud-shop-entry"></div>
        <div class="panel" id="hud-shop-modal"></div>
        <div class="panel" id="hud-garden"></div>
        <div class="panel" id="hud-arrange"></div>
        <div class="panel" id="hud-log"></div>
      </div>
      <div id="hud-center-toast"></div>
    `;
    document.body.appendChild(el);
    this.root = el;
    this.wireButtons();
  }

  private wireButtons(): void {
    if (this.uiClickBound) return;
    this.uiClickBound = true;
    this.root?.addEventListener('pointerdown', (e) => {
      const baseEl = e.target instanceof Element ? e.target : null;
      if (!baseEl) return;
      const actionTarget = baseEl.closest('[data-action]') as HTMLElement | null;
      if (!actionTarget) return;
      const action = actionTarget.dataset.action;
      const seed = actionTarget.dataset.seed as SeedId | undefined;

      e.preventDefault();
      e.stopPropagation();

      if (action === 'open-shop') {
        this.shopOpen = true;
        this.refresh();
      }
      if (action === 'close-shop') {
        this.shopOpen = false;
        this.refresh();
      }
      if (action === 'buy' && seed) buySeed(seed);
      if (action === 'sell') sellAllInventoryForGold();
      if (action === 'shelf-left') {
        this.nudgeShelf(-220);
      }
      if (action === 'shelf-right') {
        this.nudgeShelf(220);
      }
      if (action === 'pick-seed' && seed) {
        gameState.selectedSeed = seed;
        notifyGameState();
      }
      if (action === 'pick-arrange-flower' && seed) {
        gameState.selectedArrangementSeed = gameState.selectedArrangementSeed === seed ? null : seed;
        notifyGameState();
      }

      if (action === 'clear-save') {
        if (window.confirm('纭畾娓呴櫎鏈湴瀛樻。骞舵仮澶嶉粯璁ゅ紑灞€锛燂紙閭诲洯鐢颁細閲嶇疆涓烘ā鎷熸暟鎹級')) {
          resetGameToDefault();
        }
      }

      if (action === 'arrange-finish') finishArrangementCraft();
      if (action === 'arrange-clear') clearArrangementSlots();
    });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'KeyB') {
      this.shopOpen = !this.shopOpen;
      this.refresh();
    }
    const digitOrder = [
      'Digit1',
      'Digit2',
      'Digit3',
      'Digit4',
      'Digit5',
      'Digit6',
      'Digit7',
      'Digit8',
      'Digit9',
      'Digit0',
    ] as const;
    const di = digitOrder.indexOf(e.code as (typeof digitOrder)[number]);
    if (di >= 0 && di < SEED_IDS.length) {
      gameState.selectedSeed = SEED_IDS[di]!;
      this.refresh();
    }
  };

  private onGameToast = (event: Event): void => {
    const ce = event as CustomEvent<{ message?: string }>;
    const message = ce.detail?.message;
    if (!message) return;
    this.showCenterToast(message, 1500);
  };

  private showCenterToast(message: string, durationMs: number): void {
    if (!this.root) return;
    const toast = this.root.querySelector('#hud-center-toast');
    if (!(toast instanceof HTMLElement)) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      toast.classList.remove('show');
      this.toastTimer = null;
    }, durationMs);
  }

  private refresh(): void {
    if (!this.root) return;

    const status = this.root.querySelector('#hud-status');
    const inventory = this.root.querySelector('#hud-inventory');
    const shopEntry = this.root.querySelector('#hud-shop-entry');
    const shopModal = this.root.querySelector('#hud-shop-modal');
    const garden = this.root.querySelector('#hud-garden');
    const arrange = this.root.querySelector('#hud-arrange');
    const log = this.root.querySelector('#hud-log');
    if (!status || !inventory || !shopEntry || !shopModal || !garden || !arrange || !log) return;

    const sel = SEED_CONFIG[gameState.selectedSeed].label;
    const seedIds = Object.keys(SEED_CONFIG) as SeedId[];

    const shelfItems = seedIds
      .map((seedId) => {
        const cfg = SEED_CONFIG[seedId];
        const em = SEED_EMOJI[seedId];
        return `
          <div class="shop-card">
            <div class="shop-card-visual">
              <span class="shop-emoji" title="${cfg.label}">${em}</span>
              <span class="shop-swatch" style="background:${seedHex(cfg.color)}" title="鑺辫壊"></span>
            </div>
            <h4>${cfg.label}</h4>
            <div class="shop-price">绉嶅瓙 ${cfg.seedPrice} 閲?路 鑺?${cfg.sellBase} 閲?/div>
            <button data-action="buy" data-seed="${seedId}">璐拱</button>
          </div>
        `;
      })
      .join('');

    const seedInventory = seedIds
      .map((seedId) => `${SEED_CONFIG[seedId].label} 脳${gameState.seeds[seedId]}`)
      .join('銆€');

    const seedPicker = seedIds
      .map((seedId) => {
        const cfg = SEED_CONFIG[seedId];
        const active = gameState.selectedSeed === seedId ? 'active' : '';
        return `<button class="seed-chip ${active}" data-action="pick-seed" data-seed="${seedId}">${SEED_EMOJI[seedId]} ${cfg.label} 脳${gameState.seeds[seedId]}</button>`;
      })
      .join('');

    const flowerCountMap: Record<SeedId, number> = Object.fromEntries(seedIds.map((id) => [id, 0])) as Record<
      SeedId,
      number
    >;
    for (const f of gameState.flowers) flowerCountMap[f.seedId] += 1;
    const seedInventoryCards = seedIds
      .map(
        (seedId) =>
          `<div class="inv-item"><img src="${SEED_CONFIG[seedId].icon}" alt="${SEED_CONFIG[seedId].label}" /><span>${SEED_CONFIG[seedId].label} 绉嶅瓙 x${gameState.seeds[seedId]}</span></div>`,
      )
      .join('');
    const flowerInventoryCards =
      seedIds
        .filter((seedId) => flowerCountMap[seedId] > 0)
        .map(
          (seedId) =>
            `<div class="inv-item"><img src="${SEED_CONFIG[seedId].icon}" alt="${SEED_CONFIG[seedId].label}" /><span>${SEED_CONFIG[seedId].label} 椴滆姳 x${flowerCountMap[seedId]}</span></div>`,
        )
        .join('') || '<div class="hint">椴滆姳搴撳瓨涓虹┖</div>';

    const bouquetCountByLabel = new Map<string, number>();
    for (const b of gameState.bouquets) bouquetCountByLabel.set(b.label, (bouquetCountByLabel.get(b.label) ?? 0) + 1);
    const bouquetInventoryCards =
      Array.from(bouquetCountByLabel.entries())
        .map(
          ([label, count]) =>
            `<span class="inv-item"><span class="inv-emoji">馃拹</span><span>${label} x${count}</span></span>`,
        )
        .join('') || '<div class="hint">鑺辨潫搴撳瓨涓虹┖</div>';

    let flowerInventoryButtons = seedIds
      .filter((seedId) => gameState.flowers.some((f) => f.seedId === seedId))
      .map((seedId) => {
        const count = gameState.flowers.filter((f) => f.seedId === seedId).length;
        return `<button data-action="pick-arrange-flower" data-seed="${seedId}">鏀惧叆${SEED_CONFIG[seedId].label}锛?{count}锛?/button>`;
      })
      .join('');

    const arrangementPickerHtml = seedIds
      .filter((seedId) => gameState.flowers.some((f) => f.seedId === seedId))
      .map((seedId) => {
        const count = gameState.flowers.filter((f) => f.seedId === seedId).length;
        const active = gameState.selectedArrangementSeed === seedId ? 'active' : '';
        return `
          <button class="arrange-card ${active}" data-action="pick-arrange-flower" data-seed="${seedId}" type="button">
            <img src="${SEED_CONFIG[seedId].icon}" alt="${SEED_CONFIG[seedId].label}" />
            <span>${SEED_CONFIG[seedId].label} x${count}</span>
          </button>
        `;
      })
      .join('');
    flowerInventoryButtons =
      arrangementPickerHtml || '<span class="hint">鑳屽寘鏆傛棤鍙彃鑺辫姳鏈碉紝鍏堝幓鏀惰幏涓€浜涜姳銆?/span>';

    const weatherStr = weatherLabel(gameState.weather);
    const seedHotkeys = SEED_IDS.map((id, i) => `${i === 9 ? '0' : i + 1}=${SEED_CONFIG[id].label}`).join(' 路 ');
    const stealPct = Math.round(STEAL_SUCCESS_RATE * 100);
    const neighborHint = `
      <details class="hud-details">
        <summary>瑗夸晶閭诲洯锛氬伔鑺?/ 绁濈锛堢偣寮€璇存槑锛?/summary>
        <div class="hint" style="margin-top:6px;opacity:0.92">
          璧板埌<strong>瑗夸晶绱湪妗嗙敯</strong>锛岀敤灏勭嚎<strong>鐐瑰埌閭诲洯鍦板潡</strong>鍗冲彲鎿嶄綔锛堟棤闇€鎸夐挳鍒囨崲锛夈€?          <strong>鐩涜姳宸﹂敭</strong>鍋疯姳锛屾垚鍔熺巼绾?<strong>${stealPct}%</strong>锛涙垚鍔熻繘鑳屽寘锛堢█鏈夊湴鍧楃殑鑺卞甫銆岀█鏈夈€嶅崠浠峰姞鎴愶級锛屽け璐ユ湁鎻愮ず銆?          <strong>鎴愯触閮戒細婵€鎬?/strong>閭诲洯涓讳汉璧舵潵瀹堝洯锛涜璐磋繎浼氫紶閫佸洖鍑虹敓鐐广€?          <strong>鍙抽敭绁濈</strong>锛堢敓闀挎湡銆佺洓鑺辨湡锛涚洓鑺遍噾甯佹洿澶氾級锛涚偣鍒伴偦鍥敯鏃跺彸閿笉杞瑙掞紝鐐圭┖鍦板啀鍙抽敭鍙浆瑙嗚銆?        </div>
      </details>`;

    status.innerHTML = `
      <h3>鐘舵€?/h3>
      <div class="row hint">WASD 路 Space 路 婊氳疆缂╂斁 路 鍙抽敭/涓敭鎷栬瑙掞紙鐐瑰埌閭诲洯鐢板垯鍙抽敭=绁濈锛壜?宸﹂敭鐐圭敯</div>
      <div class="row">閲戝竵锛?b>${gameState.gold}</b> 路 澶╂皵 <b>${weatherStr}</b></div>
      <div class="row hint">鍦板浘锛?b>涓ぎ</b>鑷鐢?路 <b>瑗夸晶</b>閭诲洯锛岃蛋杩囧幓鐐瑰嚮鍗冲彲</div>
      <div class="row">閫変腑锛?b>${sel}</b> 路 鏁板瓧閿?<span class="hint">${seedHotkeys}</span> 路 <b>B</b> 鍟嗗簵</div>
      <div class="row hint">搴撳瓨 ${seedInventory}</div>
      <div class="row">鑳屽寘鑺?<b>${gameState.flowers.length}</b> 鏈?/div>
      <div class="row">鑺辨潫鑳屽寘 <b>${gameState.bouquets.length}</b> 鏉燂紙鍙湪鍟嗗簵鍑哄敭锛?/div>
      ${neighborHint}
    `;

    status.innerHTML = `
      <h3>鐘舵€?/h3>
      <div class="row hint">WASD 绉诲姩 / Space 璺宠穬 / 鍙抽敭鎴栦腑閿嫋鎷借瑙?/ 婊氳疆缂╂斁</div>
      <div class="row">閲戝竵锛?b>${gameState.gold}</b> 锝?澶╂皵锛?b>${weatherStr}</b></div>
      <div class="row hint">鍦板浘锛氫腑澶槸鑷鑺辩敯锛岃タ渚ф槸閭诲眳鑺辩敯</div>
      <div class="row">褰撳墠閫夌锛?b>${sel}</b> 锝?蹇嵎閿細<span class="hint">${seedHotkeys}</span> 锝?<b>B</b> 鍟嗗簵</div>
      ${neighborHint}
    `;
    inventory.innerHTML = `
      <h3>鑳屽寘搴撳瓨</h3>
      <div class="row hint">绉嶅瓙搴撳瓨</div>
      <div class="inventory-grid">${seedInventoryCards}</div>
      <div class="row hint" style="margin-top:6px;">椴滆姳搴撳瓨</div>
      <div class="inventory-grid">${flowerInventoryCards}</div>
      <div class="row" style="margin-top:6px;">
        <span class="inv-item"><span class="inv-emoji">馃拹</span><span>鑺辨潫 x${gameState.bouquets.length}</span></span>
      </div>
    `;

    inventory.innerHTML = `
      <h3>鑳屽寘搴撳瓨</h3>
      <div class="row hint">绉嶅瓙搴撳瓨</div>
      <div class="inventory-grid">${seedInventoryCards}</div>
      <div class="row hint" style="margin-top:6px;">椴滆姳搴撳瓨</div>
      <div class="inventory-grid">${flowerInventoryCards}</div>
      <div class="row hint" style="margin-top:6px;">鑺辨潫搴撳瓨</div>
      <div class="inventory-flow">${bouquetInventoryCards}</div>
    `;

    shopEntry.innerHTML = `
      <div class="shop-entry">
        <div class="hint">涓婚〉鍏ュ彛锛氬墠寰€鍟嗗簵璐拱鑺辩锛涙竻闄ゅ瓨妗ｆ仮澶嶉粯璁ゅ紑灞€</div>
        <div>
          <button data-action="open-shop" type="button">鎵撳紑鍟嗗簵</button>
          <button data-action="clear-save" type="button">娓呴櫎鏈湴瀛樻。</button>
        </div>
      </div>
    `;

    shopModal.innerHTML = this.shopOpen
      ? `
      <div class="shop-modal-head">
        <h3>鍟嗗簵璐ф灦锛?0 绉嶈姳绉嶏級</h3>
        <button data-action="close-shop" type="button">鍏抽棴</button>
      </div>
      <div class="row hint">寮圭獥宸插眳涓€傚乏鍙虫粦鍔ㄨ揣鏋讹紝鏌ョ湅涓嶅悓鑺辨湹鍞环骞惰喘涔般€?/div>
      <div class="shop-shelf-wrap">
        <button class="shelf-nav" data-action="shelf-left" type="button">鈥?/button>
        <div class="shop-shelf">
          <div class="shop-shelf-track">${shelfItems}</div>
        </div>
        <button class="shelf-nav" data-action="shelf-right" type="button">鈥?/button>
      </div>
      <div class="row">
        <button data-action="sell">鍗栨帀鑳屽寘閲屽叏閮ㄨ姳鏈?/button>
      </div>
    `
      : '';
    (shopModal as HTMLElement).style.display = this.shopOpen ? 'block' : 'none';
    if (this.shopOpen) {
      const shelf = shopModal.querySelector('.shop-shelf');
      const track = shopModal.querySelector('.shop-shelf-track');
      if (shelf instanceof HTMLElement && track instanceof HTMLElement) {
        this.syncShelfOffset(shelf, track);
        this.bindShelfDrag(shelf, track);
      }
    }

    garden.innerHTML = `
      <h3>绉嶆</h3>
      <div class="hint row">鑷锛氭挱绉?鈫?鐢熼暱婊¤繘绗?闃舵 鈫?娴囨按 鈫?绛夊喎鍗村悗鏂借偉 鈫?鎴愮啛鏀惰幏锛堣繎鐢版湁娴囨按/鏂借偉鎻愮ず锛夈€?/div>
      <div class="row seed-picker">${seedPicker}</div>
    `;

    arrange.innerHTML = `
      <h3>插花</h3>
      <div class="row hint">${arrangementPreviewLabel()}</div>
      <div class="row hint">花束背包：${gameState.bouquets.length} 束（可在商店出售）</div>
      <div class="row arrange-picker">
        ${flowerInventoryButtons || '<span class="hint">背包暂无可插花花朵，先去收获一些花。</span>'}
      </div>
      <div class="row">
        <button data-action="arrange-finish">开始插花</button>
        <button data-action="arrange-clear">清空槽位</button>
      </div>
    `;

    log.innerHTML = `<h3>浜嬩欢</h3><div class="log">${gameState.logLines.join('\n')}</div>`;
  }


  private nudgeShelf(delta: number): void {
    if (!this.root) return;
    const shelf = this.root.querySelector('.shop-shelf');
    const track = this.root.querySelector('.shop-shelf-track');
    if (!(shelf instanceof HTMLElement) || !(track instanceof HTMLElement)) return;
    this.shelfOffset += delta;
    this.syncShelfOffset(shelf, track);
  }

  private syncShelfOffset(shelf: HTMLElement, track: HTMLElement): void {
    const maxOffset = Math.max(0, track.scrollWidth - shelf.clientWidth);
    this.shelfOffset = Math.max(0, Math.min(maxOffset, this.shelfOffset));
    track.style.transform = `translateX(${-this.shelfOffset}px)`;
  }

  private bindShelfDrag(shelf: HTMLElement, track: HTMLElement): void {
    if (shelf.dataset.dragBound === '1') return;
    shelf.dataset.dragBound = '1';

    let dragging = false;
    let pointerId = -1;
    let startX = 0;
    let startOffset = 0;
    let moved = false;

    const startDrag = (clientX: number, id: number): void => {
      dragging = true;
      pointerId = id;
      startX = clientX;
      startOffset = this.shelfOffset;
      moved = false;
      shelf.classList.add('dragging');
    };

    const moveDrag = (clientX: number): void => {
      if (!dragging) return;
      const dx = clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      this.shelfOffset = startOffset - dx;
      this.syncShelfOffset(shelf, track);
    };

    const endDrag = (): void => {
      if (!dragging) return;
      dragging = false;
      pointerId = -1;
      shelf.classList.remove('dragging');
    };

    shelf.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button,[data-action]')) return;
      startDrag(e.clientX, e.pointerId);
      shelf.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    });
    shelf.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      moveDrag(e.clientX);
      e.preventDefault();
    });
    shelf.addEventListener('pointerup', (e) => {
      if (e.pointerId !== pointerId) return;
      if (shelf.hasPointerCapture(e.pointerId)) shelf.releasePointerCapture(e.pointerId);
      endDrag();
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
    shelf.addEventListener('pointercancel', (e) => {
      if (e.pointerId !== pointerId) return;
      if (shelf.hasPointerCapture(e.pointerId)) shelf.releasePointerCapture(e.pointerId);
      endDrag();
    });

    shelf.addEventListener(
      'wheel',
      (e) => {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        this.shelfOffset += delta;
        this.syncShelfOffset(shelf, track);
        e.preventDefault();
      },
      { passive: false },
    );
  }
}
