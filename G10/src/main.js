import MainScene from "./scenes/MainScene.js";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  backgroundColor: "#1d1f24",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [MainScene],
};

// Wait for the stylistic web fonts to load before booting Phaser, so
// the first frame already uses them. Falls back after a short timeout.
function boot() {
  new Phaser.Game(config);
}

if (document.fonts && document.fonts.ready) {
  Promise.race([
    document.fonts.ready,
    new Promise((r) => setTimeout(r, 1500)),
  ]).then(boot);
} else {
  boot();
}
