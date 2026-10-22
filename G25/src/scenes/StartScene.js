// StartScene.js
// Player names themselves and their NPC explorer, then the run begins.
const STORE_KEY = "lootTunerScores";

function loadScores() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}

export default class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  create() {
    const { width } = this.scale;

    this.add.text(width / 2, 90, "LOOT TUNER", {
      fontFamily: "Georgia, serif", fontSize: "52px", color: "#ffb02e",
    }).setOrigin(0.5);

    this.add.text(width / 2, 140, "Balance the loot table. Keep your explorer alive.", {
      fontFamily: "system-ui, sans-serif", fontSize: "18px", color: "#9aa0a8",
    }).setOrigin(0.5);

    const html = `
      <div class="panel start-panel">
        <p class="brief">
          Each dungeon room, your explorer asks for certain items at certain
          <b>drop-rate percentages</b>. You only control raw <b>weights</b>.
          A drop rate is <code>weight &divide; total of all weights</code> &mdash;
          so a weight of 20 is <i>not</i> 20%. Get close, or your explorer
          takes damage.
        </p>
        <label>Your name
          <input id="playerName" maxlength="16" placeholder="e.g. Ada" />
        </label>
        <label>Name your explorer
          <input id="npcName" maxlength="16" placeholder="e.g. Kael" />
        </label>
        <button id="startBtn">Enter the Dungeon &raquo;</button>
        <div id="startErr" class="err"></div>
        ${this.highScoresHtml()}
      </div>`;

    const dom = this.add.dom(width / 2, 470).createFromHTML(html);

    const start = () => {
      const player = dom.getChildByID("playerName").value.trim();
      const npc = dom.getChildByID("npcName").value.trim();
      if (!player || !npc) {
        dom.getChildByID("startErr").textContent = "Both names are required.";
        return;
      }
      this.scene.start("RoomScene", {
        player, npc, roomIndex: 0, hp: 100, maxHp: 100, score: 0,
      });
    };

    dom.getChildByID("startBtn").addEventListener("click", start);
    dom.addListener("keydown");
    dom.on("keydown", (e) => { if (e.key === "Enter") start(); });
  }

  highScoresHtml() {
    const top = loadScores().slice(0, 5);
    if (!top.length) {
      return `<div class="home-board empty">No runs yet &mdash; be the first on the board.</div>`;
    }
    const rows = top.map((s, i) => `
      <tr><td>${i + 1}</td><td>${s.player}</td><td>${s.npc}</td>
          <td>${s.roomsCleared}/6${s.forged ? " +F" : ""}</td><td>${s.score}</td></tr>`).join("");
    return `
      <div class="home-board">
        <div class="home-board-title">High Scores</div>
        <table class="board">
          <thead><tr><th>#</th><th>Player</th><th>Explorer</th><th>Depth</th><th>Score</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }
}
