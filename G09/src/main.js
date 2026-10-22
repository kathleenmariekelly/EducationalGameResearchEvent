import BootScene from "./scenes/BootScene.js";
import TitleScene from "./scenes/TitleScene.js";
import ModeScene from "./scenes/ModeScene.js";
import SelectScene from "./scenes/SelectScene.js";
import GameScene from "./scenes/GameScene.js";
import { SCREEN_W, SCREEN_H } from "./config.js";

const config = {
  type: Phaser.AUTO,
  width: SCREEN_W,
  height: SCREEN_H,
  parent: "game-container",
  backgroundColor: "#0c0e16",
  pixelArt: false,
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [BootScene, TitleScene, ModeScene, SelectScene, GameScene],
};

new Phaser.Game(config);
