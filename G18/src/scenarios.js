// scenarios.js
//
// The round pool for Sort Architect. Each round is the SAME mechanic
// (compose a sort from primitive blocks, run it, see the operation cost)
// but with data chosen to expose a different lesson about scaling.
// Rounds are ordered easiest -> hardest.
//
// `budget` is the comparison count under which the round is marked
// "efficient". Correctness is required to pass; beating the budget is the
// reward that pushes the player from "it works" to "it works at what cost".
//
// Map/potion theming (potion, brewer, tease) is used by the overworld
// version; the plain DOM version simply ignores those extra fields.

export const ROUNDS = [
  {
    id: 1,
    title: "First stir (tiny)",
    difficulty: "starter",
    potion: "Dewdrop Tonic",
    brewer: "Novice Bell",
    tease: "Only three ingredients, one out of place. Perfect for your very first brew.",
    data: [2, 3, 1],
    budget: 6,
    note: "Three values. Just get them ascending — a gentle warm-up for the blocks.",
  },
  {
    id: 2,
    title: "Warm-up: a small pile",
    difficulty: "easy",
    potion: "Tonic of First Steps",
    brewer: "Apprentice Pip",
    tease: "A few stray ingredients. Order them and the tonic settles. Hard to mess up!",
    data: [5, 2, 4, 1, 3],
    budget: 12,
    note: "Just get it sorted ascending. Any correct construction passes here.",
  },
  {
    id: 3,
    title: "Already sorted",
    difficulty: "easy",
    potion: "Draught of Stillness",
    brewer: "Calm Master Odo",
    tease: "My ingredients are already in perfect order. A wise brewer barely stirs. Overstir and... boom.",
    data: [1, 2, 3, 4, 5, 6, 7, 8],
    budget: 8,
    note: "This list is already in order. A smart sort should barely do any work. Does yours?",
  },
  {
    id: 4,
    title: "Reverse order (worst case)",
    difficulty: "medium",
    potion: "Elixir Reversal",
    brewer: "Contrary Vex",
    tease: "Everything's backwards here. One quick stir won't cut it — an unfinished brew curdles.",
    data: [8, 7, 6, 5, 4, 3, 2, 1],
    budget: 40,
    note: "Everything is backwards. If your sort only makes one pass, it will NOT finish the job.",
  },
  {
    id: 5,
    title: "Mixed batch (intermediate)",
    difficulty: "intermediate",
    potion: "Muddled Mixture",
    brewer: "Tinker Sable",
    tease: "Ten ingredients, thoroughly jumbled — no shortcuts. A solid recipe should handle it without boiling over.",
    data: [7, 2, 9, 4, 1, 8, 3, 6, 10, 5],
    budget: 55,
    note: "Ten shuffled values. A correct O(n²) sort lands around 45 comparisons — stay under budget.",
  },
  {
    id: 6,
    title: "A bigger scramble",
    difficulty: "hard",
    potion: "Chaos Compound",
    brewer: "Frazzled Nim",
    tease: "Twelve wild ingredients! The more you stir, the hotter the cauldron gets. Mind the cost.",
    data: [11, 3, 15, 6, 1, 9, 14, 2, 7, 12, 4, 10],
    budget: 90,
    note: "Twelve values. Watch how fast the comparison count climbs.",
  },
  {
    id: 7,
    title: "Scale test: big & backwards",
    difficulty: "hard",
    potion: "Grand Cauldron Brew",
    brewer: "Elder Magnus",
    tease: "Sixteen ingredients, all backwards. Only an EFFICIENT recipe survives this. Inefficiency detonates.",
    data: [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    budget: 130,
    note: "Sixteen values, worst case. This is where an inefficient design really hurts.",
  },
  {
    id: 8,
    title: "The Grand Challenge",
    difficulty: "challenge",
    potion: "Dragon's Reversal",
    brewer: "Archmage Valka",
    tease: "Twenty ingredients, fully reversed. Legends say only the tightest recipe leaves the cauldron intact. Prove yourself.",
    data: [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    budget: 200,
    note: "Twenty values, worst case. A clean O(n²) sort makes ~190 comparisons — anything sloppier overheats. Efficiency is survival.",
  },
];
