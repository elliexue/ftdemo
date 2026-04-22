/**
 * 在本机执行：npm run download-assets
 * 将免费示例模型下载到 public/assets/（需能访问外网）
 */
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/assets');

/** 仅开发机联网时使用；游戏运行时不会自动下载。打包请带上已下载的 public/assets/*.glb */
const fileEntries = [
  {
    name: 'soldier.glb',
    urls: [
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb',
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Soldier.glb',
      'https://threejs.org/examples/models/gltf/Soldier.glb',
    ],
  },
  {
    name: 'duck.glb',
    urls: [
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
    ],
  },
  {
    name: 'lantern.glb',
    urls: [
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Lantern/glTF-Binary/Lantern.glb',
    ],
  },
];

/**
 * 始终读完 body，避免部分环境下 fetch 未消费响应导致进程退出时 libuv 断言。
 */
async function fetchOkBuffer(url) {
  const res = await fetch(url, { redirect: 'follow' });
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.url = url;
    throw err;
  }
  return buf;
}

async function downloadFirstWorking(name, urls) {
  const dest = path.join(outDir, name);
  let lastErr;
  for (const url of urls) {
    try {
      process.stdout.write(`下载 ${name} ... `);
      const buf = await fetchOkBuffer(url);
      await writeFile(dest, buf);
      console.log(`${(buf.length / 1024).toFixed(1)} KB`);
      return;
    } catch (e) {
      lastErr = e;
      console.log(`失败 (${e.message})`);
    }
  }
  throw new Error(`${name}: 全部镜像不可用 — ${lastErr?.message ?? 'unknown'}`);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  for (const { name, urls } of fileEntries) {
    await downloadFirstWorking(name, urls);
  }
  console.log('完成。将 public\\assets 随项目拷贝即可离线使用；无需在别人电脑上再执行本脚本。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
