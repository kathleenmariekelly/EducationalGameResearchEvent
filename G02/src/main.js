import MainScene from "./scenes/MainScene.js";

// Cache Quest — an educational game about CPU cache behavior.
const config = {
  type: Phaser.AUTO,
  width: 1000,
  height: 720,
  parent: "game-container",
  backgroundColor: "#12141a",
  scene: [MainScene],
};

new Phaser.Game(config);
