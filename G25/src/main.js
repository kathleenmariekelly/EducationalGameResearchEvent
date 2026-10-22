import StartScene from "./scenes/StartScene.js";
import RoomScene from "./scenes/RoomScene.js";
import ForgeScene from "./scenes/ForgeScene.js";
import ScoreScene from "./scenes/ScoreScene.js";

// Loot Tuner: an educational game about weighted loot tables.
// Learning objective: the player will be able to adjust raw item WEIGHTS
// to hit target DROP-RATE PERCENTAGES, understanding that a weight is not
// a percentage (drop rate = weight / sum of all weights).
//
// DOM container is enabled because the core mechanic is a form of sliders
// and live-updating readouts, which are cleanest as HTML elements.
const config = {
  type: Phaser.AUTO,
  width: 980,
  height: 1400,
  parent: "game-container",
  backgroundColor: "#14161a",
  dom: { createContainer: true },
  scene: [StartScene, RoomScene, ForgeScene, ScoreScene],
};

new Phaser.Game(config);
