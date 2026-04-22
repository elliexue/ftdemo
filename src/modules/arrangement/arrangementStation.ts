import * as THREE from 'three';

/** 射线命中插花台任意部分时识别 */
export const ARRANGEMENT_STATION_USERDATA = 'arrangementStation' as const;
export const ARRANGEMENT_SWITCH_USERDATA = 'arrangementSwitch' as const;

export interface ArrangementStationHandles {
  root: THREE.Group;
  /** 三个展台上的挂点（动物父节点） */
  slotAnchors: THREE.Group[];
}

/** 插花区地面中心（与 `createArrangementStation` 中 root 位置一致） */
export const ARRANGEMENT_STATION_CENTER_XZ = { x: 12.5, z: 6.2 };
/** 进入此距离（水平）内显示插花 HUD */
export const ARRANGEMENT_HUD_PROXIMITY = 5.2;

/**
 * 小镇「串门插花角」：圆毯 + 三展台，与种田地块拉开距离。
 */
export function createArrangementStation(scene: THREE.Scene): ArrangementStationHandles {
  const root = new THREE.Group();
  root.position.set(ARRANGEMENT_STATION_CENTER_XZ.x, 0, ARRANGEMENT_STATION_CENTER_XZ.z);
  root.userData.kind = ARRANGEMENT_STATION_USERDATA;

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 0.18, 42),
    new THREE.MeshStandardMaterial({ color: 0x6f5442, roughness: 0.86, metalness: 0.03 }),
  );
  floor.position.y = 0.09;
  floor.castShadow = true;
  floor.receiveShadow = true;
  root.add(floor);

  const lowWall = new THREE.Mesh(
    new THREE.TorusGeometry(2.25, 0.26, 12, 58),
    new THREE.MeshStandardMaterial({ color: 0xd6c1a2, roughness: 0.5, metalness: 0.08 }),
  );
  lowWall.rotation.x = Math.PI / 2;
  lowWall.position.y = 0.34;
  lowWall.castShadow = true;
  root.add(lowWall);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.75, 0.08, 10, 52),
    new THREE.MeshStandardMaterial({ color: 0x8f6b4e, roughness: 0.7, metalness: 0.05 }),
  );
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 0.16;
  innerRing.castShadow = true;
  root.add(innerRing);

  const slotAnchors: THREE.Group[] = [];
  const angles = [-Math.PI * 0.78, -Math.PI * 0.5, -Math.PI * 0.22];
  for (let i = 0; i < 3; i++) {
    const a = angles[i]!;
    const r = 1.3;
    const plinth = new THREE.Group();
    plinth.position.set(Math.cos(a) * r, 0, Math.sin(a) * r + 0.35);
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.4, 0.32, 18),
      new THREE.MeshStandardMaterial({ color: 0xeadfcd, roughness: 0.45, metalness: 0.05 }),
    );
    ped.position.y = 0.26;
    ped.castShadow = true;
    ped.receiveShadow = true;
    ped.userData.arrangementSlotIndex = i;
    plinth.add(ped);
    /** 台柱顶约 y=0.26，锚点略抬高，避免与台面 z-fight */
    const anchor = new THREE.Group();
    anchor.position.set(0, 0.46, 0);
    plinth.add(anchor);
    root.add(plinth);
    slotAnchors.push(anchor);
  }

  for (let i = 0; i < 8; i++) {
    const deco = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 10),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xefcf8e : 0xb4d8a4, roughness: 0.4, metalness: 0.06 }),
    );
    const a = (i / 8) * Math.PI * 2;
    deco.position.set(Math.cos(a) * 2.35, 0.34, Math.sin(a) * 2.35 + 0.25);
    deco.castShadow = true;
    root.add(deco);
  }

  const switchBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.2, 0.16, 16),
    new THREE.MeshStandardMaterial({ color: 0x3f4d66, roughness: 0.4, metalness: 0.22 }),
  );
  switchBase.position.set(0, 0.24, 1.95);
  switchBase.castShadow = true;
  switchBase.userData.kind = ARRANGEMENT_SWITCH_USERDATA;
  root.add(switchBase);

  const switchCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0x68beff, emissive: 0x245a88, emissiveIntensity: 0.4 }),
  );
  switchCap.position.set(0, 0.38, 1.95);
  switchCap.castShadow = true;
  switchCap.userData.kind = ARRANGEMENT_SWITCH_USERDATA;
  root.add(switchCap);

  const switchHitArea = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 10, 10),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
  );
  switchHitArea.position.set(0, 0.38, 1.95);
  switchHitArea.userData.kind = ARRANGEMENT_SWITCH_USERDATA;
  root.add(switchHitArea);

  scene.add(root);
  return { root, slotAnchors };
}

export function hitArrangementStation(object: THREE.Object3D): boolean {
  let o: THREE.Object3D | null = object;
  while (o) {
    if (o.userData?.kind === ARRANGEMENT_STATION_USERDATA) return true;
    o = o.parent;
  }
  return false;
}

export function hitArrangementSwitch(object: THREE.Object3D): boolean {
  let o: THREE.Object3D | null = object;
  while (o) {
    if (o.userData?.kind === ARRANGEMENT_SWITCH_USERDATA) return true;
    o = o.parent;
  }
  return false;
}
