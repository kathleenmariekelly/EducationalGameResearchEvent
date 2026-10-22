// Generates all procedural textures/animations once, then goes to the title.
import { generateAllTextures } from "../art.js";

export default class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }
  create() {
    generateAllTextures(this);
    this.scene.start("TitleScene");
  }
}
