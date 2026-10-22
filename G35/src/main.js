import MenuScene from "./scenes/MenuScene.js";
import LevelSelectScene from "./scenes/LevelSelectScene.js";
import SettingsScene from "./scenes/SettingsScene.js";
import CustomScene from "./scenes/CustomScene.js";
import MainScene from "./scenes/MainScene.js";

// Minimal Phaser 3 bootstrap. Resize WIDTH/HEIGHT as needed for your game,
// but keep the rest as-is — it's plumbing, not design.
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  backgroundColor: "#1d1f24",
  dom: { createContainer: true },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [MenuScene, LevelSelectScene, SettingsScene, CustomScene, MainScene],
};

new Phaser.Game(config);
