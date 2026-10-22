// Player STATE (stats, perks, abilities). The visual sprite lives in GameScene;
// this object holds everything perks mutate.
import {
  PLAYER_BASE_RANGE,
} from "./config.js";
import { CHARACTERS } from "./data/characters.js";

export class PlayerState {
  constructor(charKey) {
    const base = CHARACTERS[charKey];
    this.charKey = charKey;
    this.name = base.name;

    this.speed = base.speed;
    this.maxHp = base.hp;
    this.hp = base.hp;
    this.damage = base.damage;
    this.fireRate = base.fireRate;
    this.range = PLAYER_BASE_RANGE;
    this.projectiles = 1;
    this.pierce = 0;
    this.regen = 0;
    this.lifesteal = 0;
    this.crit = 0;
    this.damageReduction = 0;
    this.spread = false;
    this.revives = 0;
    this.drones = 0;
    this.slowAura = 0;

    this.abilities = {};       // name -> {cooldown,timer,active,duration,activeT}
    this.perksTaken = new Set();
    this.hurtFlash = 0;
  }

  unlockAbility(name) {
    if (name === "shield") {
      this.abilities.shield = { cooldown: 8, timer: 0, active: false, duration: 2, activeT: 0 };
    } else if (name === "parry") {
      this.abilities.parry = { cooldown: 6, timer: 0, active: false, duration: 0.4, activeT: 0 };
    }
  }

  applyPerk(perk) {
    perk.apply(this);
    this.perksTaken.add(perk.key);
  }

  get shielded() {
    const s = this.abilities.shield, p = this.abilities.parry;
    return (s && s.active) || (p && p.active);
  }

  // Returns true if the ability actually triggered (was ready).
  triggerAbility(name) {
    const ab = this.abilities[name];
    if (!ab || ab.timer > 0) return false;
    ab.timer = ab.cooldown;
    ab.active = true;
    ab.activeT = ab.duration;
    return true;
  }

  takeDamage(amount) {
    if (this.shielded) return;
    amount *= (1 - this.damageReduction);
    this.hp -= amount;
    this.hurtFlash = 0.15;
    if (this.hp <= 0 && this.revives > 0) {
      this.revives -= 1;
      this.hp = this.maxHp * 0.4;
    }
  }

  healFromDamage(dmg) {
    if (this.lifesteal) this.hp = Math.min(this.maxHp, this.hp + dmg * this.lifesteal);
  }

  updateTimers(dt) {
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.regen && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    }
    for (const ab of Object.values(this.abilities)) {
      ab.timer = Math.max(0, ab.timer - dt);
      if (ab.active) {
        ab.activeT -= dt;
        if (ab.activeT <= 0) ab.active = false;
      }
    }
  }
}
