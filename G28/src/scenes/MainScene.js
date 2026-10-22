// MainScene.js
//
// This is where the core mechanic lives. Per the design scaffold, this
// prototype should demonstrate ONE mechanic — but played across several
// rounds/instances with real variation between them, not just once.
// A player who plays through once should have seen enough variation to
// have actually learned something, not just watched a single fixed demo.
//
// Structure content as a data pool (e.g. a `scenarios` array below or in
// a separate src/scenarios.js) and have the game select/cycle through it
// at runtime — no API calls needed while playing, so this stays safe to
// publish as a static site with nothing sensitive embedded in it.
//
// Concept this game is about: Narrow suspects to one by building SQL WHERE filters from clues
// (Fill in / replace this comment with the specific learning objective
// and mechanic-concept relationship agreed on in Phase 1/2 of the
// scaffold, so it's documented alongside the code.)

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    // Load any images/spritesheets/audio here.
    // this.load.image("player", "assets/player.png");
  }

  create() {
    // Placeholder content so the scene renders something on first run.
    // Replace with the actual mechanic, structured as multiple varied
    // rounds rather than a single static instance.
    this.add
      .text(400, 260, "sql-detective", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 320, "Implement the core mechanic here \u2014 aim for several varied rounds.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#9aa0a8",
      })
      .setOrigin(0.5);
  }

  update(time, delta) {
    // Per-frame game logic goes here.
  }
}
