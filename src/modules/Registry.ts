import type { IModule } from './IModule';
import { ArrangementModuleV2 } from './arrangement/ArrangementModuleV2';
import { GardenModuleV2 } from './garden/GardenModuleV2';
import { ArrangementHudModule } from './ui/ArrangementHudModule';
import { BottomSeedDockModule } from './ui/BottomSeedDockModule';
import { UiModuleV2 } from './ui/UiModuleV2';

// 最后合并时只改这里：多一个 import + 数组里多一行 new。
// 示例模块 ExampleModule.ts 仍保留在目录中，需要时可加回数组。
export const modules: IModule[] = [
  new GardenModuleV2(),
  new ArrangementModuleV2(),
  new ArrangementHudModule(),
  new UiModuleV2(),
  new BottomSeedDockModule(),
];
