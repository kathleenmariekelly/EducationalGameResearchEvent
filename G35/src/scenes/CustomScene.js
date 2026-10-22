// CustomScene.js
//
// Custom level maker. The player types an input string and a list of token
// rules (one per line: `LABEL  regex  [skip]`). The rules are entered in the
// INTENDED priority order — that order defines the level's target token
// stream. When played, the chips are shuffled so the solver has to rebuild
// the ordering. Custom levels are stored SEPARATELY from campaign progress,
// in their own localStorage key and their own export/import file.

import {
  loadCustomLevels, saveCustomLevels, exportCustomToFile, importCustomFromFile,
} from "../save.js";

const MONO = "'Courier New', monospace";
const PALETTE = [0xef7d57, 0x41a6f6, 0xffcd75, 0xa7f070, 0x38b764, 0x73eff7, 0xb13e53, 0xc0cbdc, 0x8b8fb5];

const FORM_HTML = `
<div style="width:430px;font-family:'Courier New',monospace;color:#e8eaf6;">
  <div style="font-size:12px;color:#7a80a0;margin-bottom:3px;">INPUT STRING</div>
  <input id="cs-input" type="text" value="a <= 10"
    style="width:100%;box-sizing:border-box;background:#11121f;color:#fff;border:2px solid #3a3f5c;padding:6px;font-family:inherit;font-size:15px;" />
  <div style="font-size:12px;color:#7a80a0;margin:8px 0 3px;">RULES &mdash; one per line: <span style="color:#ffcd75;">LABEL  regex  [skip]</span></div>
  <textarea id="cs-rules" rows="8" spellcheck="false"
    style="width:100%;box-sizing:border-box;background:#11121f;color:#fff;border:2px solid #3a3f5c;padding:6px;font-family:inherit;font-size:14px;resize:none;">LE <=
LT <
IDENT [A-Za-z_]\\w*
NUM [0-9]+
WS \\s+ skip</textarea>
  <div style="font-size:12px;color:#7a80a0;margin:8px 0 3px;">LEVEL NAME</div>
  <input id="cs-name" type="text" value="My level"
    style="width:100%;box-sizing:border-box;background:#11121f;color:#fff;border:2px solid #3a3f5c;padding:6px;font-family:inherit;font-size:14px;" />
  <div style="margin-top:10px;">
    <button id="cs-test"  style="font-family:inherit;font-size:13px;padding:6px 10px;background:#41a6f6;border:2px solid #11121f;cursor:pointer;">TEST</button>
    <button id="cs-save"  style="font-family:inherit;font-size:13px;padding:6px 10px;background:#a7f070;border:2px solid #11121f;cursor:pointer;">SAVE LEVEL</button>
  </div>
  <div id="cs-msg" style="font-size:12px;margin-top:8px;min-height:32px;color:#a7f070;"></div>
</div>`;

export default class CustomScene extends Phaser.Scene {
  constructor() {
    super("CustomScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#1a1c2c");
    this.levels = loadCustomLevels();

    this.add.text(400, 30, "CUSTOM LEVEL MAKER", { fontFamily: MONO, fontSize: "26px", color: "#ffcd75" }).setOrigin(0.5);

    // Mode toggle: EDITOR (this scene) vs PLAYER (regular level layout in
    // MainScene, playing the level currently in the form).
    this.modeToggle(300, 58, "EDITOR", true, null);
    this.modeToggle(500, 58, "PLAYER \u25B6", false, () => {
      try {
        this.scene.start("MainScene", { custom: this.buildLevel() });
      } catch (e) {
        this.setMsg("\u2717 " + e.message, true);
      }
    });

    // DOM editor form on the left.
    const div = document.createElement("div");
    div.innerHTML = FORM_HTML;
    this.formEl = this.add.dom(238, 300, div);
    this.q("cs-test").addEventListener("click", () => this.onTest());
    this.q("cs-save").addEventListener("click", () => this.onSave());

    // Saved-levels list on the right.
    this.add.text(475, 78, "SAVED CUSTOM LEVELS", { fontFamily: MONO, fontSize: "13px", color: "#7a80a0" });
    this.listGroup = this.add.container(0, 0);
    this.drawList();

    // File + nav controls.
    this.makeButton(150, 560, "SAVE FILE", 0x41a6f6, () => { exportCustomToFile(this.levels); this.setMsg("saved tokensmith_custom_levels.json"); });
    this.makeButton(320, 560, "LOAD FILE", 0x41a6f6, async () => {
      try { this.levels = await importCustomFromFile(); this.drawList(); this.setMsg("custom levels loaded"); }
      catch { this.setMsg("load cancelled / invalid file", true); }
    });
    this.makeButton(560, 560, "\u25C0 LEVELS", 0x8b8fb5, () => this.scene.start("LevelSelectScene"));

    this.events.once("shutdown", () => { if (this.formEl) this.formEl.destroy(); });
  }

  q(id) {
    return this.formEl.node.querySelector("#" + id);
  }

  modeToggle(x, y, label, active, onClick) {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 150, 30, active ? 0xffcd75 : 0x24283b).setStrokeStyle(2, 0xffcd75);
    const t = this.add.text(0, 0, label, { fontFamily: MONO, fontSize: "13px", color: active ? "#11121f" : "#ffcd75" }).setOrigin(0.5);
    c.add([bg, t]);
    if (!active && onClick) {
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerup", onClick);
      bg.on("pointerover", () => bg.setFillStyle(0x2f3450));
      bg.on("pointerout", () => bg.setFillStyle(0x24283b));
    }
    return c;
  }

  setMsg(text, bad) {
    const el = this.q("cs-msg");
    el.style.color = bad ? "#ef7d57" : "#a7f070";
    el.textContent = text;
  }

  // Parse the textarea into rule objects, coloring them from the palette.
  parseRules() {
    const lines = this.q("cs-rules").value.split("\n").map((l) => l.trim()).filter(Boolean);
    const rules = [];
    const seen = new Set();
    lines.forEach((line, i) => {
      let rest = line;
      let skip = false;
      if (/\sskip$/.test(rest)) { skip = true; rest = rest.replace(/\sskip$/, "").trim(); }
      const sp = rest.indexOf(" ");
      if (sp < 0) throw new Error(`line ${i + 1}: need LABEL then regex`);
      const label = rest.slice(0, sp).trim();
      const pattern = rest.slice(sp + 1).trim();
      if (!label || !pattern) throw new Error(`line ${i + 1}: need LABEL then regex`);
      try { new RegExp(pattern, "y"); } catch { throw new Error(`line ${i + 1}: bad regex /${pattern}/`); }
      let id = label.toLowerCase();
      while (seen.has(id)) id += "_";
      seen.add(id);
      rules.push({ id, label, color: PALETTE[i % PALETTE.length], pattern, skip });
    });
    if (rules.length < 2) throw new Error("add at least 2 rules");
    return rules;
  }

  // Tokenize with rules in the given order (creator's order defines target).
  tokenize(input, rules) {
    const out = [];
    let pos = 0;
    while (pos < input.length) {
      let matched = false;
      for (const r of rules) {
        const re = new RegExp(r.pattern, "y");
        re.lastIndex = pos;
        const m = re.exec(input);
        if (m && m[0].length > 0) {
          if (!r.skip) out.push({ type: r.label, value: m[0] });
          pos += m[0].length;
          matched = true;
          break;
        }
      }
      if (!matched) return { tokens: out, stuckAt: pos };
    }
    return { tokens: out, stuckAt: -1 };
  }

  buildLevel() {
    const input = this.q("cs-input").value;
    if (!input.length) throw new Error("input string is empty");
    const rules = this.parseRules();
    const { tokens, stuckAt } = this.tokenize(input, rules);
    if (stuckAt >= 0) throw new Error(`your rules get STUCK at '${input[stuckAt]}' \u2014 fix them first`);
    // Shuffle for the initial (wrong) order; ensure it differs when possible.
    const ids = rules.map((r) => r.id);
    let initialOrder = Phaser.Utils.Array.Shuffle(ids.slice());
    if (rules.length > 1 && initialOrder.join() === ids.join()) initialOrder = ids.slice().reverse();
    return {
      name: this.q("cs-name").value.trim() || "Untitled",
      input, rules,
      target: tokens.map((t) => ({ type: t.type, value: t.value })),
      initialOrder,
    };
  }

  onTest() {
    try {
      const lvl = this.buildLevel();
      this.setMsg("\u2713 tokenizes to: " + lvl.target.map((t) => `${t.type}:${t.value}`).join("  "));
    } catch (e) {
      this.setMsg("\u2717 " + e.message, true);
    }
  }

  onSave() {
    try {
      const lvl = this.buildLevel();
      this.levels.push(lvl);
      saveCustomLevels(this.levels);
      this.drawList();
      this.setMsg(`saved "${lvl.name}" (${this.levels.length} total)`);
    } catch (e) {
      this.setMsg("\u2717 " + e.message, true);
    }
  }

  drawList() {
    this.listGroup.removeAll(true);
    if (!this.levels.length) {
      this.listGroup.add(this.add.text(475, 110, "(none yet \u2014 TEST then SAVE LEVEL)", { fontFamily: MONO, fontSize: "12px", color: "#555a78" }));
      return;
    }
    this.levels.slice(0, 8).forEach((lvl, i) => {
      const y = 108 + i * 46;
      const bg = this.add.rectangle(475, y, 300, 40, 0x24283b).setOrigin(0, 0).setStrokeStyle(2, 0x3a3f5c);
      this.listGroup.add(bg);
      this.listGroup.add(this.add.text(485, y + 6, lvl.name.slice(0, 22), { fontFamily: MONO, fontSize: "13px", color: "#fff" }));
      this.listGroup.add(this.add.text(485, y + 22, `"${lvl.input}"`.slice(0, 26), { fontFamily: MONO, fontSize: "11px", color: "#9aa0c0" }));
      this.smallBtn(690, y + 4, "PLAY", 0xa7f070, () => this.scene.start("MainScene", { custom: lvl }));
      this.smallBtn(690, y + 22, "DEL", 0xef7d57, () => { this.levels.splice(i, 1); saveCustomLevels(this.levels); this.drawList(); });
    });
  }

  smallBtn(x, y, label, color, onClick) {
    const bg = this.add.rectangle(x, y, 64, 16, color).setOrigin(0, 0).setStrokeStyle(1, 0x11121f);
    const t = this.add.text(x + 32, y + 8, label, { fontFamily: MONO, fontSize: "10px", color: "#11121f" }).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", onClick);
    this.listGroup.add([bg, t]);
  }

  makeButton(x, y, label, color, onClick) {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 150, 40, color).setStrokeStyle(3, 0x11121f);
    const t = this.add.text(0, 0, label, { fontFamily: MONO, fontSize: "14px", color: "#11121f" }).setOrigin(0.5);
    c.add([bg, t]);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", onClick);
    bg.on("pointerover", () => bg.setFillStyle(0xffcd75));
    bg.on("pointerout", () => bg.setFillStyle(color));
    return c;
  }
}
