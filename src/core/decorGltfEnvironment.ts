import * as THREE from 'three';
import { loadModel } from '../config/assetPaths';
import { enableModelShadows, normalizeModelHeight } from './modelUtils';

/**
 * 远景装饰：仅灯笼（示例）。不再放置鹦鹉；需要树/鸟请换自己的 glb 或改 SceneDecor 程序化树。
 */
export async function loadGltfDecor(scene: THREE.Scene, _groundSize: number): Promise<void> {
  scene.userData.decorMixers = [] as THREE.AnimationMixer[];

  try {
    const gltf = await loadModel('lantern');
    const lantern = gltf.scene.clone(true);
    enableModelShadows(lantern);
    normalizeModelHeight(lantern, 2.4);
    lantern.position.set(11, 0, -9);
    lantern.rotation.y = 0.55;
    scene.add(lantern);
  } catch {
    /* 无文件或加载失败 */
  }
}
