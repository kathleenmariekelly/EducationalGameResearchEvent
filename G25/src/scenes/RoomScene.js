// RoomScene.js
//
// THE CORE MECHANIC (tree edition). Loot is a two-level weighted tree:
//   dropRate(item) = catShare(category) * itemShare(item within category)
// where catShare = catWeight / sum(all category weights) and
//       itemShare = itemWeight / sum(item weights in that category).
//
// The player assigns raw WEIGHTS at BOTH levels (min 1) and watches each
// leaf's real drop rate update live against the NPC's target percentages.
// Total absolute deviation from targets becomes damage to the explorer.
//
// The lesson the player is meant to feel: a weight isn't a percentage, and
// a leaf's rate flows through two multiplied levels — so a low target means
// a small share at the category level AND at the item level.

import { buildRun, TIERS } from "../scenarios.js";

export default class RoomScene extends Phaser.Scene {
  constructor() {
    super("RoomScene");
  }

  init(data) {
    this.state = data;
  }

  create() {
    if (this.state.roomIndex === 0) {
      this.registry.set("run", buildRun());
    }
    const run = this.registry.get("run");
    this.room = run[this.state.roomIndex];

    // Working weights: catW[cat] and itemW[cat][item], all start at 10.
    this.catW = {};
    this.itemW = {};
    this.room.categories.forEach((cat) => {
      this.catW[cat.name] = 10;
      this.itemW[cat.name] = {};
      cat.items.forEach((it) => (this.itemW[cat.name][it.name] = 10));
    });

    // After room 3, the live drop-rate meter goes dark: the player must set
    // weights from understanding, not by watching the bar. They only learn
    // how they did in the post-commit feedback.
    this.hideReadouts = this.state.roomIndex >= 3;
    // Reset per room — the scene instance is reused across rooms, so this must
    // start false each time or a prior room's reveal would leak forward.
    this.revealed = false;

    this.renderPanel();
  }

  // ---- tree math ----------------------------------------------------------
  sumCat() {
    return this.room.categories.reduce((s, c) => s + this.catW[c.name], 0);
  }
  catShare(cat) {
    return this.catW[cat] / this.sumCat();
  }
  sumItems(cat) {
    return Object.values(this.itemW[cat]).reduce((s, w) => s + w, 0);
  }
  itemShare(cat, item) {
    return this.itemW[cat][item] / this.sumItems(cat);
  }
  effectivePct(cat, item) {
    return this.catShare(cat) * this.itemShare(cat, item) * 100;
  }
  totalError() {
    return this.room.targets.reduce(
      (s, t) => s + Math.abs(this.effectivePct(t.category, t.item) - t.pct),
      0
    );
  }

  // ---- UI -----------------------------------------------------------------
  renderPanel() {
    const { width } = this.scale;

    const catBlocks = this.room.categories
      .map((cat) => {
        const itemRows = cat.items
          .map((it) => {
            const color = TIERS[it.tier].color;
            const targetLabel =
              it.target != null
                ? `<span class="target">goal ${it.target}%</span>`
                : `<span class="target distractor">no goal</span>`;
            return `
            <div class="item-row tree">
              <span class="item-name" style="color:${color}">${it.name}</span>
              <span class="tier-badge" style="border-color:${color};color:${color}">${it.tier}</span>
              <input type="range" min="1" max="60" value="10" class="islider"
                     data-cat="${cat.name}" data-item="${it.name}" />
              <span class="wnum" data-wnum="${cat.name}\u241f${it.name}">10</span>
              <span class="within" data-within="${cat.name}\u241f${it.name}">0%</span>
              <span class="actual" data-eff="${cat.name}\u241f${it.name}">0%</span>
              ${targetLabel}
            </div>`;
          })
          .join("");
        return `
        <div class="cat-block">
          <div class="cat-head">
            <span class="cat-name">${cat.name}</span>
            <input type="range" min="1" max="60" value="10" class="cslider"
                   data-cat="${cat.name}" />
            <span class="wnum cat-wnum" data-cwnum="${cat.name}">10</span>
            <span class="cat-share">picks this slot <b data-cshare="${cat.name}">0%</b></span>
          </div>
          ${itemRows}
        </div>`;
      })
      .join("");

    const html = `
      <div class="panel room-panel">
        <div class="room-head">
          <div>
            <div class="room-title">${this.room.title}
              <span class="room-count">Room ${this.state.roomIndex + 1} / 6</span>
            </div>
            <div class="room-flavor">${this.room.flavor}</div>
          </div>
          <div class="hp-box">
            <div class="hp-label">${this.state.npc}</div>
            <div class="hp-bar"><div class="hp-fill" id="hpFill"></div></div>
            <div class="hp-num" id="hpNum">${this.state.hp}/${this.state.maxHp} HP</div>
          </div>
        </div>

        <div class="request">${this.room.request}</div>
        <div class="tree-hint">${
          this.hideReadouts
            ? "&#9888; Deep dungeon: per-item drop rates are hidden until you commit. Slot chances still show \u2014 reason out the item weights, then send them in."
            : "Drop rate = <b>slot chance</b> &times; <b>item chance within slot</b>"
        }</div>

        ${catBlocks}

        <div class="summary">
          <span>Total error: <b id="totErr">0</b> pts</span>
          <span>Projected damage: <b id="projDmg" class="dmg">0</b></span>
        </div>

        <button id="confirmBtn">Send ${this.state.npc} in &raquo;</button>
        <div id="result" class="result hidden"></div>
      </div>`;

    this.dom = this.add.dom(width / 2, 16).createFromHTML(html).setOrigin(0.5, 0);

    this.dom.node.querySelectorAll(".cslider").forEach((sl) => {
      sl.addEventListener("input", (e) => {
        this.catW[e.target.dataset.cat] = parseInt(e.target.value, 10);
        this.refresh();
      });
    });
    this.dom.node.querySelectorAll(".islider").forEach((sl) => {
      sl.addEventListener("input", (e) => {
        this.itemW[e.target.dataset.cat][e.target.dataset.item] =
          parseInt(e.target.value, 10);
        this.refresh();
      });
    });

    this.dom.getChildByID("confirmBtn").addEventListener("click", () => this.resolveRoom());

    const hpPct = Math.max(0, (this.state.hp / this.state.maxHp) * 100);
    this.dom.getChildByID("hpFill").style.width = `${hpPct}%`;

    this.refresh();
  }

  projectedDamage(err) {
    return Math.max(0, Math.round((err - this.room.tolerance) * 1.4));
  }

  refresh() {
    // In deep rooms we hide only the per-ITEM drop numbers until the player
    // commits. Slot (category) shares stay visible the whole time.
    const hideItems = this.hideReadouts && !this.revealed;
    this.room.categories.forEach((cat) => {
      // Raw weight numbers are always visible — they're what the player controls.
      this.dom.node.querySelector(`[data-cwnum="${cat.name}"]`).textContent =
        this.catW[cat.name];
      this.dom.node.querySelector(`[data-cshare="${cat.name}"]`).textContent =
        `${(this.catShare(cat.name) * 100).toFixed(0)}%`;
      cat.items.forEach((it) => {
        const key = `${cat.name}\u241f${it.name}`;
        this.dom.node.querySelector(`[data-wnum="${key}"]`).textContent =
          this.itemW[cat.name][it.name];
        this.dom.node.querySelector(`[data-within="${key}"]`).textContent =
          hideItems ? "" : `${(this.itemShare(cat.name, it.name) * 100).toFixed(0)}% of slot`;
        const effEl = this.dom.node.querySelector(`[data-eff="${key}"]`);
        if (hideItems) {
          effEl.textContent = "??";
          effEl.classList.remove("good", "close", "bad");
        } else {
          const eff = this.effectivePct(cat.name, it.name);
          effEl.textContent = `${eff.toFixed(1)}%`;
          if (it.target != null) {
            const off = Math.abs(eff - it.target);
            effEl.classList.toggle("good", off <= 2);
            effEl.classList.toggle("close", off > 2 && off <= 5);
            effEl.classList.toggle("bad", off > 5);
          }
        }
      });
    });
    if (hideItems) {
      this.dom.getChildByID("totErr").textContent = "??";
      this.dom.getChildByID("projDmg").textContent = "??";
    } else {
      const err = this.totalError();
      this.dom.getChildByID("totErr").textContent = err.toFixed(1);
      this.dom.getChildByID("projDmg").textContent = this.projectedDamage(err);
    }
  }

  // Coaching that points at whichever level of the tree is off.
  buildFeedback() {
    const lines = [];
    this.room.targets.forEach((t) => {
      const eff = this.effectivePct(t.category, t.item);
      const off = eff - t.pct;
      if (Math.abs(off) <= 2) return;
      const catPct = (this.catShare(t.category) * 100).toFixed(0);
      const withinPct = (this.itemShare(t.category, t.item) * 100).toFixed(0);
      const dir = off > 0 ? "too high" : "too low";
      lines.push(
        `<b>${t.item}</b> is at ${eff.toFixed(1)}% (goal ${t.pct}%) \u2014 ${dir}. ` +
        `The <i>${t.category}</i> slot rolls ${catPct}% of the time, and it's ` +
        `${withinPct}% within that slot, so ${catPct}% \u00d7 ${withinPct}% ` +
        `\u2248 ${eff.toFixed(1)}%. Adjust the slot weight, the item weight, or both.`
      );
    });
    return lines;
  }

  resolveRoom() {
    // Reveal the real drop numbers now that the guess is locked in.
    this.revealed = true;
    this.refresh();
    const err = this.totalError();
    const feedback = this.buildFeedback();
    const fbHtml = feedback.length
      ? `<ul class="feedback">${feedback.map((l) => `<li>${l}</li>`).join("")}</ul>`
      : `<div class="feedback perfect">Every requested item landed within 2% of its goal. Textbook tree balancing.</div>`;

    const dmg = this.projectedDamage(err);
    const hp = this.state.hp - dmg;
    const accuracy = Math.max(0, 100 - err);
    const newScore = this.state.score + Math.round(accuracy);

    const resEl = this.dom.getChildByID("result");
    this.dom.getChildByID("confirmBtn").disabled = true;

    if (hp <= 0) {
      resEl.innerHTML = `
        <div class="res-title dead">${this.state.npc} fell in ${this.room.title}.</div>
        <div>Took <b>${dmg}</b> damage &mdash; the loot tree was ${err.toFixed(1)} pts off.</div>
        ${fbHtml}
        <button id="endBtn">See the scoreboard &raquo;</button>`;
      resEl.classList.remove("hidden");
      this.dom.getChildByID("endBtn").addEventListener("click", () => {
        this.scene.start("ScoreScene", {
          ...this.state, hp: 0, score: newScore, survived: false,
          roomsCleared: this.state.roomIndex,
        });
      });
      return;
    }

    const last = this.state.roomIndex === 5;
    // Finishing the run banks a bonus for every HP the explorer had left,
    // so precise play (less damage taken) is rewarded, not just survival.
    const HP_BONUS_PER = 5;
    const hpBonus = last ? hp * HP_BONUS_PER : 0;
    const finalScore = newScore + hpBonus;
    resEl.innerHTML = `
      <div class="res-title">${accuracy >= 90 ? "Perfectly stocked!" : "Room cleared."}</div>
      <div>Off by <b>${err.toFixed(1)}</b> pts &rarr; <b>${dmg}</b> damage.
           ${this.state.npc} has <b>${hp}</b> HP left. +${Math.round(accuracy)} score.</div>
      ${last ? `<div class="hp-bonus">Survival bonus: <b>${hp} HP &times; ${HP_BONUS_PER} = +${hpBonus}</b></div>` : ""}
      ${fbHtml}
      <button id="nextBtn">${last ? "Enter the Forge &raquo;" : "Descend deeper &raquo;"}</button>`;
    resEl.classList.remove("hidden");

    this.dom.getChildByID("nextBtn").addEventListener("click", () => {
      if (last) {
        // Survived all six tuning rooms — now prove it in code.
        this.scene.start("ForgeScene", {
          ...this.state, hp, score: finalScore, puzzleIndex: 0,
        });
      } else {
        this.scene.start("RoomScene", {
          ...this.state, hp, score: newScore, roomIndex: this.state.roomIndex + 1,
        });
      }
    });
  }
}
