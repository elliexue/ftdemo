
import * as THREE from 'three';
import { createGardenPlotPlantGroup } from './gardenPlantMeshes';

export const GARDEN_PLOT_USERDATA = 'gardenPlot' as const;

export interface GardenPlotHandles {
  root: THREE.Group;
  /** 包含茎 + 花冠，由 GardenVisuals 驱动 */
  plant: THREE.Group;
}

export function getGardenPlotIndex(object: THREE.Object3D): number | null {
  let o: THREE.Object3D | null = object;
  while (o) {
    if (o.userData?.kind === GARDEN_PLOT_USERDATA && typeof o.userData.index === 'number') {
      return o.userData.index as number;
    }
    o = o.parent;
  }
  return null;
}

/**
 * 地块摆放、木框、土壤。改场景布局只动本文件。
 */
export function createGardenPlots(scene: THREE.Scene): GardenPlotHandles[] {
  const handles: GardenPlotHandles[] = [];
  const positions: [number, number, number][] = [];
  const cols = 5;
  const rows = 4;
  const spacing = 3;
  const startX = -((cols - 1) * spacing) / 2;
  const startZ = -8;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push([startX + c * spacing, 0, startZ + r * spacing]);
    }
  }

  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x4a3528,
    roughness: 0.96,
    metalness: 0,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8f6a45,
    roughness: 0.82,
    metalness: 0.05,
  });
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x3f7a4a,
    roughness: 0.55,
    metalness: 0.02,
  });
  const budMat = new THREE.MeshStandardMaterial({
    color: 0x7ecf6b,
    roughness: 0.4,
    metalness: 0.05,
    flatShading: true,
  });

  positions.forEach((pos, index) => {
    const root = new THREE.Group();
    root.position.set(pos[0], pos[1], pos[2]);
    root.userData.kind = GARDEN_PLOT_USERDATA;
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

    const plant = createGardenPlotPlantGroup(stemMat, budMat, 'PlantStem');

    root.add(plant);
    scene.add(root);
    handles.push({ root, plant });
  });

  return handles;
}
