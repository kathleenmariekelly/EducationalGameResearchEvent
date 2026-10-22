import MainScene from "./scenes/MainScene.js";

// Minimal Phaser 3 bootstrap. Resize WIDTH/HEIGHT as needed for your game,
// but keep the rest as-is — it's plumbing, not design.
const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 720,
  parent: "game-container",
  backgroundColor: "#15171c",
  dom: { createContainer: true },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [MainScene],
};

new Phaser.Game(config);
