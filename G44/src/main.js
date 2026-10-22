import MainScene from "./scenes/MainScene.js";

const config = {
  type: Phaser.AUTO,
  width: 1080,
  height: 700,
  parent: "game-container",
  backgroundColor: "#0d1117",
  scene: [MainScene],
};

new Phaser.Game(config);
