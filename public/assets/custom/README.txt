【自定义资源目录】



你已放入的 Kenney 包路径示例：

  Models\OBJ format\*.obj + 同目录 .mtl + Textures\colormap.png



当前工程已配置（见 src\config\assetPaths.ts）：

  角色：固定 public\assets\soldier.glb（与 custom 无关；需 npm run download-assets 或手动放入）

  田里占位：animal-parrot.obj

  远景：building-type-a.obj



加载逻辑：

  - 支持 .fbx（AssetLoader 保留，人物槽当前不用）

  - 支持 .obj（自动配 .mtl / Textures）

  - 支持 .glb / .gltf（根目录默认示例）

  - plant / lantern：useCustom 为 true 时失败会自动回退到 public\assets\ 下的 glb



换田里 / 远景模型：改 assetPaths.ts 里的 custom 文件名，或把 useCustom 设为 false 仅用默认 glb。

换人物：改 Engine 与 assetPaths 中 player 的 bundled 路径（当前为 soldier.glb）。

