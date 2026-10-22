import MainScene from "./scenes/MainScene.js";

// Minimal Phaser 3 bootstrap. Resize WIDTH/HEIGHT as needed for your game,
// but keep the rest as-is — it's plumbing, not design.
const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 760,
  parent: "game-container",
  backgroundColor: "#1d1f24",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [MainScene],
};

new Phaser.Game(config);
