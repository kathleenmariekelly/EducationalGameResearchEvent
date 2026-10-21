import TitleScene from "./scenes/TitleScene.js";
import TutorialScene from "./scenes/TutorialScene.js";
import OverworldScene from "./scenes/OverworldScene.js";
import PuzzleScene from "./scenes/PuzzleScene.js";
import CompleteScene from "./scenes/CompleteScene.js";

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: "game-container",
    width: 960,
    height: 640,
  },
  backgroundColor: "#5a9e4b",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [TitleScene, TutorialScene, OverworldScene, PuzzleScene, CompleteScene],
};

new Phaser.Game(config);
