
import * as THREE from 'three';
import { gameState } from '../../game/GameState';
import { tryBlessFriendBloomPlot, tryBlessFriendGrowingPlot } from '../social/socialBless';
import { tryStealFriendFlower } from '../social/socialSteal';
import { initFriendGarden } from '../social/socialMock';
import { tickFriendGardenRegrowth } from '../social/friendGardenSpawn';
import { FriendGardenChaser } from '../social/friendGardenChaser';
import { tryFertilizePlot } from './GardenFertilizing';
import { tickGardenGrowth } from './GardenGrowth';
import { tickGardenWeather } from './GardenWeather';
import { tryHarvestPlotV2 as tryHarvestPlot } from './GardenHarvestV2';
import { tryPlantSeed } from './GardenPlanting';
import { tryWaterPlot } from './GardenWatering';
import { createGardenPlots, getGardenPlotIndex, type GardenPlotHandles } from './GardenPlots';
import { createFriendGardenPlots, getFriendGardenPlotIndex, type FriendGardenPlotHandles } from './FriendGardenPlots';
import { syncGardenPlotVisuals } from './GardenVisuals';
import { GardenPlotEffects } from './gardenPlotEffects';
import type { IModule } from '../IModule';

function resolvePlotFromHits(
  hits: THREE.Intersection[],
): { plotIndex: number; isFriendPlot: boolean } | null {
  for (const h of hits) {
    const fi = getFriendGardenPlotIndex(h.object);
    if (fi !== null) return { plotIndex: fi, isFriendPlot: true };
    const si = getGardenPlotIndex(h.object);
    if (si !== null) return { plotIndex: si, isFriendPlot: false };
  }
  return null;
}

/**
 * 花园总控：射线命中**最近**的自家或邻园地块即可操作（无需切换「拜访」模式）。
 */
export class GardenModule implements IModule {
  readonly name = 'GardenModule';

  private selfHandles: GardenPlotHandles[] = [];
  private friendHandles: FriendGardenPlotHandles[] = [];
  private player: THREE.Object3D | null = null;
  private scene: THREE.Scene | null = null;
  private readonly chaser = new FriendGardenChaser();
  private plotFx: GardenPlotEffects | null = null;
  private plotFxFriend: GardenPlotEffects | null = null;

  init(scene: THREE.Scene): void {
    this.scene = scene;
    initFriendGarden();
    this.selfHandles = createGardenPlots(scene);
    this.friendHandles = createFriendGardenPlots(scene);
    this.plotFx = new GardenPlotEffects(this.selfHandles, scene);
    this.plotFxFriend = new GardenPlotEffects(this.friendHandles, scene);
    this.chaser.init(scene);
    void this.chaser.loadSoldierModel();
    this.player = scene.getObjectByName('Player') ?? null;
  }

  update(delta: number): void {
    if (!this.player && this.selfHandles.length > 0) {
      const anyRoot = this.selfHandles[0]!.root.parent;
      this.player = anyRoot?.getObjectByName('Player') ?? null;
    }
    tickGardenWeather(delta);
    tickGardenGrowth(delta, gameState.plots);
    tickGardenGrowth(delta, gameState.friendPlots);
    tickFriendGardenRegrowth(delta);
    if (this.scene) {
      this.chaser.update(this.scene, delta, performance.now() * 0.001);
    }
    this.plotFx?.update(delta);
    this.plotFxFriend?.update(delta);
    syncGardenPlotVisuals(this.selfHandles, gameState.plots, this.player?.position);
    syncGardenPlotVisuals(this.friendHandles, gameState.friendPlots, this.player?.position);
  }

  onPointerDown(hits: THREE.Intersection[], event: PointerEvent): void {
    const resolved = resolvePlotFromHits(hits);
    if (!resolved) return;

    const friendRightBless = event.button === 2 && resolved.isFriendPlot;
    if (event.button !== 0 && !friendRightBless) return;

    const { plotIndex, isFriendPlot } = resolved;

    if (isFriendPlot) {
      const plot = gameState.friendPlots[plotIndex];
      if (!plot) return;

      if (plot.stage === 4) {
        if (friendRightBless) {
          if (tryBlessFriendBloomPlot(plot, plotIndex)) {
            this.chaser.noteFriendGardenTouched();
            if (plot.seedId) this.plotFxFriend?.triggerBless(plotIndex, plot.seedId);
          }
        } else if (tryStealFriendFlower(plot, plotIndex)) {
          this.chaser.noteFriendGardenTouched();
        }
        return;
      }
      if (plot.stage > 0 && plot.stage < 4) {
        const sid = plot.seedId;
        if (tryBlessFriendGrowingPlot(plot, plotIndex)) {
          this.chaser.noteFriendGardenTouched();
          if (sid) this.plotFxFriend?.triggerBless(plotIndex, sid);
        }
      }
      return;
    }

    const plot = gameState.plots[plotIndex];
    if (!plot) return;

    if (plot.stage === 0) {
      if (tryPlantSeed(plot, plotIndex, gameState.selectedSeed)) {
        this.plotFx?.triggerPlant(plotIndex);
      }
      return;
    }
    if (plot.stage === 1 || plot.stage === 2) {
      if (tryWaterPlot(plot, plotIndex)) {
        this.plotFx?.triggerWater(plotIndex);
      }
      return;
    }
    if (plot.stage === 3) {
      if (tryFertilizePlot(plot, plotIndex)) {
        this.plotFx?.triggerFertilize(plotIndex);
      }
      return;
    }
    const harvestSeed = plot.seedId;
    if (harvestSeed && tryHarvestPlot(plot, plotIndex)) {
      this.plotFx?.triggerHarvest(plotIndex, harvestSeed);
    }
  }
}
