// 一般不用改这个文件。
import { Engine } from './core/Engine';
import { subscribeGameState } from './game/GameState';
import { loadGameFromLocal, saveGameNow, scheduleSaveGame } from './game/saveLocal';
import { modules } from './modules/Registry';

subscribeGameState(() => scheduleSaveGame());
loadGameFromLocal();

window.addEventListener('beforeunload', () => saveGameNow());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGameNow();
});

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app');

const engine = new Engine(modules);
engine.start(root);
