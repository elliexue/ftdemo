// 一般不用改这个文件。
import { Engine } from './core/Engine';
import { subscribeGameState } from './game/GameState';
import { loadGame, saveGameNow, scheduleSaveGame } from './game/saveLocal';
import { modules } from './modules/Registry';

subscribeGameState(() => scheduleSaveGame());
window.addEventListener('beforeunload', () => saveGameNow());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGameNow();
});

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app');

async function bootstrap(): Promise<void> {
  await loadGame();
  const engine = new Engine(modules);
  engine.start(root as HTMLElement);
}

void bootstrap();
