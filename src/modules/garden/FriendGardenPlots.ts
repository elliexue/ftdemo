import * as THREE from 'three';
import { createGardenPlotPlantGroup } from './gardenPlantMeshes';

export const FRIEND_GARDEN_PLOT_USERDATA = 'friendGardenPlot' as const;

export interface FriendGardenPlotHandles {
  root: THREE.Group;
  plant: THREE.Group;
}

export function getFriendGardenPlotIndex(object: THREE.Object3D): number | null {
  let o: THREE.Object3D | null = object;
  while (o) {
    if (o.userData?.kind === FRIEND_GARDEN_PLOT_USERDATA && typeof o.userData.index === 'number') {
      return o.userData.index as number;
    }
    o = o.parent;
  }
  return null;
}

/**
 * 邻人花园（场景西侧），与自家田数据分离，用 friendPlots 驱动。
 */
export function createFriendGardenPlots(scene: THREE.Scene): FriendGardenPlotHandles[] {
  const handles: FriendGardenPlotHandles[] = [];
  const positions: [number, number, number][] = [
    [-22.5, 0, -2],
    [-19.5, 0, -2],
    [-16.5, 0, -2],
    [-13.5, 0, -2],
  ];

  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x5a3d52,
    roughness: 0.94,
    metalness: 0,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x7a5840,
    roughness: 0.82,
    metalness: 0.06,
  });
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x3d6b48,
    roughness: 0.55,
    metalness: 0.02,
  });
  const budMat = new THREE.MeshStandardMaterial({
    color: 0x8fdf7a,
    roughness: 0.4,
    metalness: 0.05,
    flatShading: true,
  });

  positions.forEach((pos, index) => {
    const root = new THREE.Group();
    root.position.set(pos[0], pos[1], pos[2]);
    root.userData.kind = FRIEND_GARDEN_PLOT_USERDATA;
    root.userData.index = index;

    const soil = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.12, 2.05), soilMat);
    soil.position.y = 0.06;
    soil.receiveShadow = true;
    soil.castShadow = true;
    root.add(soil);

    const rimT = 0.08;
    const rimL = 2.28;
    const rimH = 0.22;
    const mkRim = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), woodMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      root.add(m);
    };
    mkRim(rimL, rimH, rimT, 0, rimH * 0.5, 1.1);
    mkRim(rimL, rimH, rimT, 0, rimH * 0.5, -1.1);
    mkRim(rimT, rimH, rimL, 1.1, rimH * 0.5, 0);
    mkRim(rimT, rimH, rimL, -1.1, rimH * 0.5, 0);

    const plant = createGardenPlotPlantGroup(stemMat, budMat, 'FriendPlantStem');
    root.add(plant);
    scene.add(root);
    handles.push({ root, plant });
  });

  return handles;
}
