// scenarios.js
//
// Content pool for Loot Tuner (TREE edition). Loot is a two-level weighted
// tree: first the roll picks a CATEGORY (equipment slot), then it picks an
// ITEM within that category. So a specific item's real drop rate is a
// PRODUCT of two weighted picks:
//
//   dropRate(item) = catWeight(cat)  / sum(all category weights)
//                  * itemWeight(item) / sum(item weights in that category)
//
// The lesson deepens from the flat version: a weight still isn't a
// percentage, AND now a leaf's rate flows through TWO levels. Raising a
// category's weight lifts every item under it; raising one item's weight
// steals share only from its siblings. To hit a low target (e.g. 3% on a
// Legendary two-hander) the player has to reason about both levels at once.
//
// Constraints that create the tension:
//   - Every weight (category and item) must be >= 1.
//   - The NPC's targets are leaf percentages; the player controls raw weights
//     at both levels.
//
// Variety (shuffling + target jitter) is generated here at build time and
// selected while playing — no API calls, safe to publish as static files.

export const TIERS = {
  Common:    { color: "#b8c0cc" },
  Magical:   { color: "#4fa3ff" },
  Rare:      { color: "#c07bff" },
  Legendary: { color: "#ffb02e" },
};

// Available equipment slots (categories):
// Chest Armor, Helm, Gloves, Boots, One-Handed Weapon, Shield, Two-Handed Weapon.
//
// Each room draws on a subset. targets reference { category, item, pct } leaves.
export const ROOMS = [
  {
    id: "mossy-crypt",
    title: "Mossy Crypt",
    flavor: "Kael needs a chest piece, but the roll picks a slot first, then an item.",
    request: "\"Get me a Worn Chestplate about 30% of the time.\"",
    categories: [
      { name: "Chest Armor", items: [
        { name: "Worn Chestplate", tier: "Common" },
        { name: "Padded Vest", tier: "Common" },
      ]},
      { name: "One-Handed Weapon", items: [
        { name: "Rusty Dagger", tier: "Common" },
        { name: "Bent Shortsword", tier: "Common" },
      ]},
    ],
    targets: [{ category: "Chest Armor", item: "Worn Chestplate", pct: 30 }],
    tolerance: 10,
  },
  {
    id: "goblin-warren",
    title: "Goblin Warren",
    flavor: "Two slots, two goals. Balancing the category split starts to matter.",
    request: "\"A Rusty Sword near 20%, and Leather Boots around 15%.\"",
    categories: [
      { name: "One-Handed Weapon", items: [
        { name: "Rusty Sword", tier: "Common" },
        { name: "Goblin Cleaver", tier: "Common" },
      ]},
      { name: "Boots", items: [
        { name: "Leather Boots", tier: "Common" },
        { name: "Torn Sandals", tier: "Common" },
      ]},
    ],
    targets: [
      { category: "One-Handed Weapon", item: "Rusty Sword", pct: 20 },
      { category: "Boots", item: "Leather Boots", pct: 15 },
    ],
    tolerance: 10,
  },
  {
    id: "frost-hollow",
    title: "Frost Hollow",
    flavor: "Three slots now. A Magical item means threading two levels for a small number.",
    request: "\"Magical Gauntlets at 12%, a Frost Helm near 18%, Ice Boots around 20%.\"",
    categories: [
      { name: "Gloves", items: [
        { name: "Magical Gauntlets", tier: "Magical" },
        { name: "Frayed Mitts", tier: "Common" },
      ]},
      { name: "Helm", items: [
        { name: "Frost Helm", tier: "Magical" },
        { name: "Fur Cap", tier: "Common" },
      ]},
      { name: "Boots", items: [
        { name: "Ice Boots", tier: "Magical" },
        { name: "Snowshoes", tier: "Common" },
      ]},
    ],
    targets: [
      { category: "Gloves", item: "Magical Gauntlets", pct: 12 },
      { category: "Helm", item: "Frost Helm", pct: 18 },
      { category: "Boots", item: "Ice Boots", pct: 20 },
    ],
    tolerance: 9,
  },
  {
    id: "sunken-vault",
    title: "Sunken Vault",
    flavor: "Bigger item pools per slot dilute each leaf. Rare targets get slippery.",
    request: "\"A Rare Shield at 7%, a Magical Ring-Helm at 14%, and a Gold Bar near 22%.\"",
    categories: [
      { name: "Shield", items: [
        { name: "Rare Shield", tier: "Rare" },
        { name: "Cracked Buckler", tier: "Common" },
        { name: "Barnacle Guard", tier: "Common" },
      ]},
      { name: "Helm", items: [
        { name: "Magical Ring-Helm", tier: "Magical" },
        { name: "Diving Cap", tier: "Common" },
      ]},
      { name: "Chest Armor", items: [
        { name: "Gold Bar", tier: "Common" },
        { name: "Damp Tunic", tier: "Common" },
        { name: "Kelp Wrap", tier: "Common" },
      ]},
    ],
    targets: [
      { category: "Shield", item: "Rare Shield", pct: 7 },
      { category: "Helm", item: "Magical Ring-Helm", pct: 14 },
      { category: "Chest Armor", item: "Gold Bar", pct: 22 },
    ],
    tolerance: 8,
  },
  {
    id: "dragon-antechamber",
    title: "Dragon's Antechamber",
    flavor: "A Legendary two-hander at 3% means a small category share AND a small leaf share.",
    request: "\"Legendary Greatsword at just 3%, a Rare Aegis at 8%, Magical Boots at 16%.\"",
    categories: [
      { name: "Two-Handed Weapon", items: [
        { name: "Legendary Greatsword", tier: "Legendary" },
        { name: "Iron Maul", tier: "Common" },
        { name: "Charred Pike", tier: "Common" },
      ]},
      { name: "Shield", items: [
        { name: "Rare Aegis", tier: "Rare" },
        { name: "Scale Guard", tier: "Common" },
      ]},
      { name: "Boots", items: [
        { name: "Magical Boots", tier: "Magical" },
        { name: "Ash-Worn Greaves", tier: "Common" },
      ]},
    ],
    targets: [
      { category: "Two-Handed Weapon", item: "Legendary Greatsword", pct: 3 },
      { category: "Shield", item: "Rare Aegis", pct: 8 },
      { category: "Boots", item: "Magical Boots", pct: 16 },
    ],
    tolerance: 7,
  },
  {
    id: "throne-of-ash",
    title: "Throne of Ash",
    flavor: "Four slots, four goals, tight tolerance. The whole tree has to be in balance.",
    request: "\"Legendary Crown at 2%, Rare Cloak-Chest at 6%, Magical Tome-Gloves at 11%, Ash Blade at 18%.\"",
    categories: [
      { name: "Helm", items: [
        { name: "Legendary Crown", tier: "Legendary" },
        { name: "Soot Coif", tier: "Common" },
      ]},
      { name: "Chest Armor", items: [
        { name: "Rare Cloak-Chest", tier: "Rare" },
        { name: "Cinder Plate", tier: "Common" },
        { name: "Ember Vest", tier: "Common" },
      ]},
      { name: "Gloves", items: [
        { name: "Magical Tome-Gloves", tier: "Magical" },
        { name: "Charred Grips", tier: "Common" },
      ]},
      { name: "One-Handed Weapon", items: [
        { name: "Ash Blade", tier: "Common" },
        { name: "Molten Dirk", tier: "Common" },
      ]},
    ],
    targets: [
      { category: "Helm", item: "Legendary Crown", pct: 2 },
      { category: "Chest Armor", item: "Rare Cloak-Chest", pct: 6 },
      { category: "Gloves", item: "Magical Tome-Gloves", pct: 11 },
      { category: "One-Handed Weapon", item: "Ash Blade", pct: 18 },
    ],
    tolerance: 6,
  },
];

// Fisher–Yates shuffle (returns a new array).
export function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a fresh run: same escalating rooms, but category order, item order,
// and target percentages are varied so each playthrough differs.
export function buildRun() {
  return ROOMS.map((room) => {
    const jitter = (pct) => Math.max(1, pct + Math.round(Math.random() * 4 - 2));
    const targets = room.targets.map((t) => ({ ...t, pct: jitter(t.pct) }));
    const targetKey = (c, i) => `${c}\u241f${i}`;
    const targetMap = Object.fromEntries(
      targets.map((t) => [targetKey(t.category, t.item), t.pct])
    );
    const categories = shuffled(room.categories).map((cat) => ({
      name: cat.name,
      items: shuffled(cat.items).map((it) => ({
        ...it,
        target: targetMap[targetKey(cat.name, it.name)] ?? null,
      })),
    }));
    return { ...room, categories, targets };
  });
}
