
import * as THREE from 'three';
import type { PlotRuntime, SeedId } from './types';
import { SEED_CONFIG } from './types';

export type GardenPlotVisualHandles = { root: THREE.Group; plant: THREE.Group };

/**
 * 茎 + 按种子切换花冠几何（迁移包逻辑：单头 mesh + HEAD_GEOMETRIES），浇水/施肥提示与粒子由 userData 驱动。
 */
export const HEAD_GEOMETRIES: Record<SeedId, THREE.BufferGeometry> = {
  tulip: new THREE.ConeGeometry(0.34, 0.62, 7),
  rose: new THREE.SphereGeometry(0.36, 16, 12),
  sunflower: new THREE.CylinderGeometry(0.34, 0.42, 0.22, 18),
  hibiscus: new THREE.TorusKnotGeometry(0.2, 0.07, 64, 10, 2, 3),
  cherry_blossom: new THREE.DodecahedronGeometry(0.34, 0),
  daisy: new THREE.OctahedronGeometry(0.34, 0),
  lotus: new THREE.ConeGeometry(0.44, 0.46, 6),
  hyacinth: new THREE.CapsuleGeometry(0.24, 0.4, 4, 8),
  white_flower: new THREE.IcosahedronGeometry(0.34, 1),
  rosette: new THREE.TorusGeometry(0.3, 0.12, 10, 20),
};

export function syncGardenPlotVisuals(
  handles: GardenPlotVisualHandles[],
  plots: PlotRuntime[],
  playerPos?: THREE.Vector3,
): void {
  const stageStemH = [0, 0.22, 0.45, 0.72, 0.88];
  const stageHeadS = [0, 0.22, 0.38, 0.58, 0.95];
  const t = performance.now() * 0.001;

  for (let i = 0; i < handles.length; i++) {
    const { plant } = handles[i];
    const plot = plots[i];
    const stem = plant.userData.stem as THREE.Mesh | undefined;
    const head = plant.userData.head as THREE.Mesh | undefined;
    const waterHint = plant.userData.waterHint as THREE.Mesh | undefined;
    const fertilizerHint = plant.userData.fertilizerHint as THREE.Mesh | undefined;
    const waterFx = plant.userData.waterFx as THREE.Group | undefined;
    const fertilizerFx = plant.userData.fertilizerFx as THREE.Group | undefined;
    const giantAura = plant.userData.giantAura as THREE.Group | undefined;
    const actionPrompt = plant.userData.actionPrompt as THREE.Sprite | undefined;
    if (!stem || !head) continue;

    if (!plot || plot.stage === 0) {
      plant.visible = false;
      continue;
    }

    plant.visible = true;
    stem.visible = true;
    head.visible = true;

    const flowerColor = plot.seedId ? SEED_CONFIG[plot.seedId].color : 0x7ecf6b;

    if (plot.seedId) {
      const nextGeometry = HEAD_GEOMETRIES[plot.seedId];
      const appliedSeed = head.userData.appliedSeed as SeedId | undefined;
      if (nextGeometry && appliedSeed !== plot.seedId) {
        head.geometry = nextGeometry;
        head.userData.appliedSeed = plot.seedId;
      }
    }

    const headMat = head.material as THREE.MeshStandardMaterial;
    if (plot.rareVariant) {
      headMat.color.setHex(0xffd966);
      headMat.emissive.setHex(0xffb020);
      headMat.emissiveIntensity = plot.stage >= 4 ? 0.32 : 0.16;
    } else {
      headMat.color.setHex(flowerColor);
      headMat.emissive.setHex(flowerColor);
      headMat.emissiveIntensity = plot.stage >= 4 ? 0.12 : 0.04;
    }

    const sh = stageStemH[plot.stage] ?? 0.5;
    const hs = stageHeadS[plot.stage] ?? 0.5;

    stem.scale.set(1, sh / 0.85, 1);
    stem.position.y = (sh * 0.85) * 0.5 + 0.02;

    head.scale.setScalar(hs);
    head.position.y = sh * 0.85 + hs * 0.35 + 0.02;

    if (plot.giantBloom && plot.stage >= 4) {
      stem.scale.set(1.15, (sh / 0.85) * 1.18, 1.15);
      head.scale.setScalar(hs * 1.95);
      head.position.y = sh * 0.85 + hs * 0.58 + 0.08;
    }

    if (waterHint) {
      const needWater = plot.stage === 2 && plot.needsWater;
      waterHint.visible = needWater;
      if (needWater) {
        waterHint.position.y = head.position.y + 0.34 + Math.sin(t * 6 + i * 0.7) * 0.06;
        waterHint.rotation.y += 0.03;
      }
    }

    if (fertilizerHint) {
      const needFertilizer = plot.stage === 3 && plot.needsFertilizer && plot.fertilizerCooldown <= 0;
      fertilizerHint.visible = needFertilizer;
      if (needFertilizer) {
        fertilizerHint.position.y = head.position.y + 0.38 + Math.sin(t * 5 + i * 0.9) * 0.05;
        fertilizerHint.rotation.x += 0.035;
        fertilizerHint.rotation.y += 0.02;
      }
    }

    if (waterFx) {
      const active = plot.waterFxTime > 0;
      waterFx.visible = active;
      if (active) {
        const p = Math.min(1, plot.waterFxTime / 0.9);
        const spread = 0.56 + (1 - p) * 0.62;
        let idx = 0;
        for (const child of waterFx.children) {
          const drop = child as THREE.Mesh;
          const phase = (drop.userData.phase as number) ?? 0;
          const radius = (drop.userData.radius as number) ?? 0.2;
          const a = phase + t * 5 + idx * 0.3;
          drop.position.x = Math.cos(a) * (radius + spread * 0.3);
          drop.position.z = Math.sin(a) * (radius + spread * 0.3);
          drop.position.y = 0.32 + Math.sin(t * 9 + phase) * 0.12 + p * 0.64;
          const mat = drop.material as THREE.MeshStandardMaterial;
          mat.opacity = 0.2 + p * 0.8;
          idx++;
        }
      }
    }

    if (fertilizerFx) {
      const active = plot.fertilizerFxTime > 0;
      fertilizerFx.visible = active;
      if (active) {
        const p = Math.min(1, plot.fertilizerFxTime / 1.1);
        fertilizerFx.rotation.y += 0.05;
        let idx = 0;
        for (const child of fertilizerFx.children) {
          const pellet = child as THREE.Mesh;
          const phase = (pellet.userData.phase as number) ?? 0;
          const radius = (pellet.userData.radius as number) ?? 0.2;
          const a = phase + t * 2.8;
          pellet.position.x = Math.cos(a) * radius;
          pellet.position.z = Math.sin(a) * radius;
          pellet.position.y = 0.16 + Math.sin(t * 6 + phase * 2) * 0.08 + (1 - p) * 0.5;
          const mat = pellet.material as THREE.MeshStandardMaterial;
          mat.opacity = 0.25 + p * 0.7;
          idx++;
        }
      }
    }

    if (giantAura) {
      const active = plot.giantBloom;
      giantAura.visible = active;
      if (active) {
        giantAura.position.y = head.position.y + 0.78;
        giantAura.rotation.y += 0.02;
        const ringA = giantAura.children[0] as THREE.Mesh | undefined;
        const ringB = giantAura.children[1] as THREE.Mesh | undefined;
        if (ringA) {
          ringA.scale.setScalar(1.08 + Math.sin(t * 2 + i * 0.3) * 0.16);
          const matA = ringA.material as THREE.MeshStandardMaterial;
          matA.opacity = 0.58 + (Math.sin(t * 4 + i * 0.2) + 1) * 0.16;
        }
        if (ringB) {
          ringB.scale.setScalar(1.06 + Math.cos(t * 2.4 + i * 0.4) * 0.18);
          const matB = ringB.material as THREE.MeshStandardMaterial;
          matB.opacity = 0.46 + (Math.cos(t * 3.5 + i * 0.5) + 1) * 0.14;
        }
      }
    }

    if (actionPrompt) {
      const needWater = plot.stage === 2 && plot.needsWater;
      const needFertilizer = plot.stage === 3 && plot.needsFertilizer && plot.fertilizerCooldown <= 0;
      const needsAction = needWater || needFertilizer;

      const promptText = needWater ? '需要浇水' : needFertilizer ? '需要施肥' : '';
      const waitText = needFertilizer && plot.fertilizerCooldown > 0 ? `等待施肥 ${plot.fertilizerCooldown.toFixed(1)}s` : '';
      const near =
        needsAction && playerPos
          ? Math.hypot(playerPos.x - plant.parent!.position.x, playerPos.z - plant.parent!.position.z) < 4.2
          : false;
      actionPrompt.visible = Boolean(near);
      if (near) {
        actionPrompt.position.y = head.position.y + 1.02 + Math.sin(t * 4 + i * 0.5) * 0.04;

        const displayText = waitText || promptText;
        const cached = actionPrompt.userData.promptText as string | undefined;
        if (cached !== displayText) {
          const canvas = actionPrompt.userData.canvas as HTMLCanvasElement;
          const ctx = actionPrompt.userData.ctx as CanvasRenderingContext2D | null;
          const texture = actionPrompt.userData.texture as THREE.CanvasTexture;
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(6, 12, 24, 0.78)';
            ctx.strokeStyle = waitText
              ? 'rgba(189, 203, 222, 0.9)'
              : needWater
                ? 'rgba(111, 215, 255, 0.95)'
                : 'rgba(242, 184, 74, 0.95)';
            ctx.lineWidth = 5;
            const w = canvas.width;
            const h = canvas.height;
            const r = 24;
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.lineTo(w - r, 0);
            ctx.quadraticCurveTo(w, 0, w, r);
            ctx.lineTo(w, h - r);
            ctx.quadraticCurveTo(w, h, w - r, h);
            ctx.lineTo(r, h);
            ctx.quadraticCurveTo(0, h, 0, h - r);
            ctx.lineTo(0, r);
            ctx.quadraticCurveTo(0, 0, r, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#f2f6ff';
            ctx.font = 'bold 34px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(displayText, w * 0.5, h * 0.5 + 2);
            texture.needsUpdate = true;
          }
          actionPrompt.userData.promptText = displayText;
        }
      }
    }
  }
}

/** 插花台三格：与花田同一套花冠几何与配色（缩小单株摆件）。 */
export function createArrangementSlotFlower(seedId: SeedId): THREE.Group {
  const g = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x3f7a4a,
    roughness: 0.55,
    metalness: 0.02,
  });
  const flowerHex = SEED_CONFIG[seedId].color;
  const headMat = new THREE.MeshStandardMaterial({
    color: flowerHex,
    emissive: flowerHex,
    emissiveIntensity: 0.12,
    roughness: 0.42,
    metalness: 0.05,
    flatShading: true,
  });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 8), stemMat);
  stem.position.y = 0.25;
  stem.castShadow = true;
  stem.receiveShadow = true;
  const head = new THREE.Mesh(HEAD_GEOMETRIES[seedId].clone(), headMat);
  head.position.y = 0.54;
  head.scale.setScalar(0.88);
  head.castShadow = true;
  head.receiveShadow = true;
  g.add(stem, head);
  g.scale.setScalar(0.62);
  return g;
}
