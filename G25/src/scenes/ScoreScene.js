// ScoreScene.js
// Run summary + a local high-score board keyed on player + NPC name.
const STORE_KEY = "lootTunerScores";

function loadScores() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}
function saveScore(entry) {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 10);
  localStorage.setItem(STORE_KEY, JSON.stringify(top));
  return top;
}

export default class ScoreScene extends Phaser.Scene {
  constructor() {
    super("ScoreScene");
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { width } = this.scale;
    const r = this.result;

    const entry = {
      player: r.player,
      npc: r.npc,
      score: r.score,
      roomsCleared: r.roomsCleared,
      survived: r.survived,
      forged: !!r.forged,
      when: Date.now(),
    };
    const top = saveScore(entry);

    this.add.text(width / 2, 70, r.survived ? "HOARD CLAIMED" : "RUN ENDED", {
      fontFamily: "Georgia, serif", fontSize: "44px",
      color: r.survived ? "#ffb02e" : "#ff6b6b",
    }).setOrigin(0.5);

    let summary;
    if (!r.survived) {
      summary = `${r.npc} made it through ${r.roomsCleared} of 6 rooms.`;
    } else if (r.forged) {
      summary = `${r.npc} cleared all 6 rooms and forged the loot engine.`;
    } else if (r.forgeFailed) {
      summary = `${r.npc} cleared all 6 rooms, but the loot engine got the better of them in the Forge.`;
    } else {
      summary = `${r.npc} cleared all 6 rooms with ${r.hp} HP to spare.`;
    }

    const rowsHtml = top.map((s, i) => {
      const mine = s.when === entry.when;
      return `<tr class="${mine ? "mine" : ""}">
        <td>${i + 1}</td><td>${s.player}</td><td>${s.npc}</td>
        <td>${s.roomsCleared}/6</td><td>${s.score}</td></tr>`;
    }).join("");

    const html = `
      <div class="panel score-panel">
        <p class="summary-line">${summary}</p>
        <p class="score-big">Final score: <b>${r.score}</b></p>
        <table class="board">
          <thead><tr><th>#</th><th>Player</th><th>Explorer</th><th>Depth</th><th>Score</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <button id="againBtn">Play again &raquo;</button>
      </div>`;

    const dom = this.add.dom(width / 2, 420).createFromHTML(html);
    dom.getChildByID("againBtn").addEventListener("click", () => {
      this.registry.remove("run");
      this.scene.start("StartScene");
    });
  }
}
