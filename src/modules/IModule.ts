import type * as THREE from 'three';

// 每个玩法文件写一个 class，实现下面三个（点击没有就不用写 onPointerDown）。
export interface IModule {
  readonly name?: string;
  init(scene: THREE.Scene): void;
  update(delta: number): void;
  /** 一次点击产生的全部命中（从近到远），避免被地面挡住地块 */
  onPointerDown?(hits: THREE.Intersection[], event: PointerEvent): void;
}
