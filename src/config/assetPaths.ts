import { loadSceneResource, type LoadedScene } from '../core/AssetLoader';

/**
 * Kenney 包在 public/assets/custom/Models/OBJ format/（OBJ+MTL）。
 * 玩家 / 邻园护卫：人形 Soldier（`npm run download-assets` → `soldier.glb`，Idle/Run）。
 * plant / lantern：`useCustom` 时先试 custom，失败再 bundled。
 */
const KENNEY_OBJ = 'assets/custom/Models/OBJ format';

export const assetPathsConfig = {
  player: {
    bundled: 'assets/robot-expressive.glb',
  },
  plant: {
    useCustom: true,
    custom: `${KENNEY_OBJ}/animal-parrot.obj`,
    bundled: 'assets/duck.glb',
  },
  lantern: {
    useCustom: true,
    custom: `${KENNEY_OBJ}/building-type-a.obj`,
    bundled: 'assets/lantern.glb',
  },
} as const;

export type ModelSlot = keyof typeof assetPathsConfig;

export async function loadModel(slot: ModelSlot): Promise<LoadedScene> {
  if (slot === 'player') {
    return loadSceneResource(assetPathsConfig.player.bundled);
  }

  const c = assetPathsConfig[slot];
  if (c.useCustom) {
    try {
      return await loadSceneResource(c.custom);
    } catch (err) {
      console.warn('[assets] 自定义模型加载失败，已回退默认:', c.custom, err);
    }
  }
  return loadSceneResource(c.bundled);
}
