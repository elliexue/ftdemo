import * as THREE from 'three';

/**
 * 茎 + 花冠占位 + 浇水/施肥提示与特效，供 GardenPlots 与 FriendGardenPlots 共用。
 */
function makeActionPromptSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 96;
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  // Match the neighbor steal/bless 3D button size.
  sprite.scale.set(1.35, 0.54, 1);
  sprite.userData.canvas = canvas;
  sprite.userData.ctx = canvas.getContext('2d');
  sprite.userData.texture = texture;
  sprite.userData.promptText = '';
  return sprite;
}

export function createGardenPlotPlantGroup(
  stemMat: THREE.Material,
  budMat: THREE.MeshStandardMaterial,
  stemName = 'PlantStem',
): THREE.Group {
  const plant = new THREE.Group();
  plant.position.y = 0.12;
  plant.visible = false;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.85, 8), stemMat);
  stem.position.y = 0.42;
  stem.castShadow = true;
  stem.name = stemName;

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), budMat.clone());
  head.position.y = 0.92;
  head.castShadow = true;
  head.name = 'PlantHead';

  const waterHint = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.14, 0),
    new THREE.MeshStandardMaterial({
      color: 0x59c8ff,
      emissive: 0x2b8fc0,
      emissiveIntensity: 0.7,
      roughness: 0.3,
      metalness: 0.05,
    }),
  );
  waterHint.name = 'WaterHint';
  waterHint.position.y = 1.26;
  waterHint.visible = false;
  waterHint.castShadow = true;

  const fertilizerHint = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    new THREE.MeshStandardMaterial({
      color: 0xf2b84a,
      emissive: 0xb37515,
      emissiveIntensity: 0.65,
      roughness: 0.35,
      metalness: 0.08,
    }),
  );
  fertilizerHint.name = 'FertilizerHint';
  fertilizerHint.position.y = 1.24;
  fertilizerHint.visible = false;
  fertilizerHint.castShadow = true;

  const waterFx = new THREE.Group();
  waterFx.name = 'WaterFx';
  for (let k = 0; k < 14; k++) {
    const drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 12, 9),
      new THREE.MeshStandardMaterial({
        color: 0x6fd7ff,
        emissive: 0x3aa2d0,
        emissiveIntensity: 1.25,
        transparent: true,
        opacity: 0.9,
      }),
    );
    drop.userData.phase = (k / 14) * Math.PI * 2;
    drop.userData.radius = 0.34 + (k % 4) * 0.12;
    waterFx.add(drop);
  }
  waterFx.position.y = 0.92;
  waterFx.visible = false;

  const fertilizerFx = new THREE.Group();
  fertilizerFx.name = 'FertilizerFx';
  for (let k = 0; k < 16; k++) {
    const pellet = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.082 + (k % 3) * 0.018, 0),
      new THREE.MeshStandardMaterial({
        color: k % 2 === 0 ? 0x7b5a34 : 0x9a7a47,
        emissive: 0x4a341a,
        emissiveIntensity: 0.75,
        transparent: true,
        opacity: 0.9,
      }),
    );
    pellet.userData.phase = (k / 16) * Math.PI * 2;
    pellet.userData.radius = 0.32 + (k % 4) * 0.12;
    fertilizerFx.add(pellet);
  }
  fertilizerFx.position.y = 0.95;
  fertilizerFx.visible = false;

  const giantAura = new THREE.Group();
  giantAura.name = 'GiantAura';
  const auraRingA = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.05, 12, 64),
    new THREE.MeshStandardMaterial({
      color: 0xffd36b,
      emissive: 0xffb42a,
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: 0.75,
    }),
  );
  auraRingA.rotation.x = Math.PI / 2;
  const auraRingB = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.045, 12, 56),
    new THREE.MeshStandardMaterial({
      color: 0xfff1b3,
      emissive: 0xffca5c,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.7,
    }),
  );
  auraRingB.rotation.z = Math.PI / 2;
  auraRingB.position.y = 0.28;
  giantAura.add(auraRingA, auraRingB);
  giantAura.position.y = 1.65;
  giantAura.visible = false;

  const actionPrompt = makeActionPromptSprite();
  actionPrompt.name = 'ActionPrompt';
  actionPrompt.position.set(0, 1.7, 0);
  actionPrompt.visible = false;

  plant.add(stem, head, waterHint, fertilizerHint, waterFx, fertilizerFx, giantAura, actionPrompt);
  plant.userData.stem = stem;
  plant.userData.head = head;
  plant.userData.waterHint = waterHint;
  plant.userData.fertilizerHint = fertilizerHint;
  plant.userData.waterFx = waterFx;
  plant.userData.fertilizerFx = fertilizerFx;
  plant.userData.giantAura = giantAura;
  plant.userData.actionPrompt = actionPrompt;

  return plant;
}
