import { Game } from './engine.js';
import { TitleScene } from './scenes.js';
import { Sfx, Music } from './audio.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

// WebAudio needs a user gesture to start; unlock on first interaction.
const unlock = () => { Sfx.unlock(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// Press M to toggle all audio.
let muted = false;
window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    muted = !muted;
    Sfx.setEnabled(!muted);
    if (muted) Music.stop(); else Music.start();
  }
});

game.start(new TitleScene(game));
