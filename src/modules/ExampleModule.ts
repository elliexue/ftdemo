import * as THREE from 'three';
import type { IModule } from './IModule';

// 示例：旋转方块，点击变色。不需要时可从 Registry 里删掉这一模块。
export class ExampleModule implements IModule {
  readonly name = 'ExampleModule';

  private mesh: THREE.Mesh | null = null;

  init(scene: THREE.Scene): void {
    const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf0a030, roughness: 0.35, metalness: 0.2 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.set(-3, 0.6, -2);
    this.mesh.name = 'ExampleClickTarget';
    scene.add(this.mesh);
  }

  update(delta: number): void {
    if (!this.mesh) return;
    this.mesh.rotation.y += delta * 0.6;
  }

  onPointerDown(hits: THREE.Intersection[], _event: PointerEvent): void {
    const intersection = hits.find((h) => h.object === this.mesh);
    if (intersection) {
      const mat = this.mesh?.material;
      if (mat && 'color' in mat && mat.color instanceof THREE.Color) {
        mat.color.setHSL(Math.random(), 0.65, 0.55);
      }
    }
  }
}
