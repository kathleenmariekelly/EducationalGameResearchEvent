// 20 perks / abilities. Each `apply(p)` mutates the player stats object.
// Two perks unlock cooldown abilities (shield, parry).
import { COL } from "../config.js";

const pct = (base, p) => base * (1 + p);

export const PERKS = [
  { key: "overclock", name: "Overclock", color: COL.cyan, stackable: true,
    desc: "+15% movement speed.",
    apply: (p) => { p.speed = pct(p.speed, 0.15); } },
  { key: "cache_boost", name: "Cache Boost", color: COL.green, stackable: true,
    desc: "+20% attack speed.",
    apply: (p) => { p.fireRate *= 0.83; } },
  { key: "bit_shift", name: "Bit Shift", color: COL.orange, stackable: true,
    desc: "+25% projectile damage.",
    apply: (p) => { p.damage = pct(p.damage, 0.25); } },
  { key: "extra_core", name: "Extra Core", color: COL.primary, stackable: true,
    desc: "+1 projectile per attack.",
    apply: (p) => { p.projectiles += 1; } },
  { key: "memory_expansion", name: "Memory Expansion", color: COL.purple, stackable: true,
    desc: "+30 max HP and heal to full.",
    apply: (p) => { p.maxHp += 30; p.hp = p.maxHp; } },
  { key: "garbage_collector", name: "Garbage Collector", color: COL.green, stackable: true,
    desc: "Regenerate +1.5 HP per second.",
    apply: (p) => { p.regen += 1.5; } },
  { key: "pointer_pierce", name: "Pointer Pierce", color: COL.yellow, stackable: true,
    desc: "Projectiles pierce +1 extra enemy.",
    apply: (p) => { p.pierce += 1; } },
  { key: "kernel_shield", name: "Kernel Shield", color: COL.cyan, stackable: false,
    desc: "Unlock SHIELD [E]: brief invulnerability. 8s cooldown.",
    apply: (p) => { p.unlockAbility("shield"); } },
  { key: "parry_protocol", name: "Parry Protocol", color: COL.red, stackable: false,
    desc: "Unlock PARRY [Q]: reflect & stun nearby enemies. 6s cooldown.",
    apply: (p) => { p.unlockAbility("parry"); } },
  { key: "lifesteal_loop", name: "Lifesteal Loop", color: COL.red, stackable: true,
    desc: "Heal for 12% of damage you deal.",
    apply: (p) => { p.lifesteal += 0.12; } },
  { key: "critical_section", name: "Critical Section", color: COL.yellow, stackable: true,
    desc: "+15% chance to deal double damage.",
    apply: (p) => { p.crit = Math.min(0.9, p.crit + 0.15); } },
  { key: "wide_bus", name: "Wide Bus", color: COL.primary, stackable: true,
    desc: "+25% attack range.",
    apply: (p) => { p.range = pct(p.range, 0.25); } },
  { key: "turbo_boot", name: "Turbo Boot", color: COL.cyan, stackable: true,
    desc: "+10% move speed and +10% attack speed.",
    apply: (p) => { p.speed = pct(p.speed, 0.10); p.fireRate *= 0.9; } },
  { key: "thread_pool", name: "Thread Pool", color: COL.primary, stackable: false,
    desc: "+2 projectiles but -10% damage each.",
    apply: (p) => { p.projectiles += 2; p.damage *= 0.9; } },
  { key: "firewall", name: "Firewall", color: COL.orange, stackable: true,
    desc: "Take 20% less incoming damage.",
    apply: (p) => { p.damageReduction = Math.min(0.8, p.damageReduction + 0.20); } },
  { key: "hyperthreading", name: "Hyperthreading", color: COL.purple, stackable: false,
    desc: "Attacks fire in a wider spread.",
    apply: (p) => { p.spread = true; } },
  { key: "swap_space", name: "Swap Space", color: COL.green, stackable: false,
    desc: "Survive one fatal hit, reviving at 40% HP.",
    apply: (p) => { p.revives += 1; } },
  { key: "daemon_drone", name: "Daemon Drone", color: COL.cyan, stackable: true,
    desc: "Spawn an orbiting drone that damages enemies.",
    apply: (p) => { p.drones += 1; } },
  { key: "nice_value", name: "Nice Value", color: COL.purple, stackable: true,
    desc: "Nearby enemies are slowed by 18%.",
    apply: (p) => { p.slowAura = Math.min(0.7, p.slowAura + 0.18); } },
  { key: "root_access", name: "Root Access", color: COL.yellow, stackable: true,
    desc: "+8% damage, speed, and attack speed.",
    apply: (p) => { p.damage = pct(p.damage, 0.08); p.speed = pct(p.speed, 0.08); p.fireRate *= 0.92; } },
];

export function eligiblePerks(player) {
  return PERKS.filter((perk) => perk.stackable || !player.perksTaken.has(perk.key));
}

// Fisher-Yates sample of k distinct perks.
export function samplePerks(player, k) {
  const pool = eligiblePerks(player).slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(k, pool.length));
}
