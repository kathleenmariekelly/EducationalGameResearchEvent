// scenarios.js
//
// Content pool for Function Factory. Each round is a client ORDER (a target
// item), a RAW item that arrives on the belt, and the TOOLS available this
// round. Tools change round to round so the player keeps making a real
// decision instead of memorizing one answer.
//
// The pedagogical heart of the game lives in `TOOLS` below: every tool's
// `fn` is an actual JavaScript function value. The player never calls it.
// They HAND it to an employee (a receiver), and the employee calls it later,
// once per item, when the belt runs. That is exactly what a function pointer
// / callback is: a function passed as a value to something that decides when
// to invoke it.

// --- The tools. Each `fn` is a pure function: (item) => item -------------
// Once an item is wrapped, nothing else can change it (it's sealed in a box),
// which is what makes ORDER matter for the Wrap tool.
export const TOOLS = {
  paintRed: {
    id: "paintRed",
    label: "PaintRed",
    hint: "colors the item red (red + blue = purple)",
    fn: (item) => {
      if (item.wrapped) return item;
      let color = item.color;
      if (color === "blue") color = "purple";
      else if (color !== "purple") color = "red";
      return { ...item, color };
    },
  },
  paintBlue: {
    id: "paintBlue",
    label: "PaintBlue",
    hint: "colors the item blue (red + blue = purple)",
    fn: (item) => {
      if (item.wrapped) return item;
      let color = item.color;
      if (color === "red") color = "purple";
      else if (color !== "purple") color = "blue";
      return { ...item, color };
    },
  },
  cutStar: {
    id: "cutStar",
    label: "CutToStar",
    hint: "reshapes the item into a star",
    fn: (item) => (item.wrapped ? item : { ...item, shape: "star" }),
  },
  cutCircle: {
    id: "cutCircle",
    label: "CutToCircle",
    hint: "reshapes the item into a circle",
    fn: (item) => (item.wrapped ? item : { ...item, shape: "circle" }),
  },
  cutSquare: {
    id: "cutSquare",
    label: "CutToSquare",
    hint: "reshapes the item into a square",
    fn: (item) => (item.wrapped ? item : { ...item, shape: "square" }),
  },
  polish: {
    id: "polish",
    label: "Polish",
    hint: "gives the item a polished finish",
    fn: (item) => (item.wrapped ? item : { ...item, finish: "polished" }),
  },
  wrap: {
    id: "wrap",
    label: "Wrap",
    hint: "seals the item in a box — nothing after this can change it!",
    fn: (item) => ({ ...item, wrapped: true }),
  },
};

// Convenience for describing items in plain English on the order card.
export function describe(item) {
  const parts = [];
  if (item.wrapped) return "a wrapped " + colorWord(item) + shapeWord(item);
  if (item.finish === "polished") parts.push("polished");
  parts.push(colorWord(item).trim());
  parts.push(item.shape);
  return "a " + parts.join(" ");
}
function colorWord(item) {
  return item.color === "gray" ? "" : item.color + " ";
}
function shapeWord(item) {
  return item.shape;
}

// --- The rounds ----------------------------------------------------------
// `stations` = how many employees are on the line this round.
// `tools`    = ids of the tools available to hand out this round.
// `raw`      = the item that arrives on the belt.
// `target`   = the finished product the client ordered.
// `lesson`   = the point this round is designed to make (shown on success).
export const SCENARIOS = [
  {
    title: "Order #1 — warm up",
    stations: 3,
    tools: ["paintRed", "paintBlue", "polish"],
    raw: { shape: "circle", color: "gray", finish: "rough", wrapped: false },
    target: { shape: "circle", color: "red", finish: "rough", wrapped: false },
    lesson:
      "You handed PaintRed to an employee. THEY called it on the item — you never did. That's a function passed as a value.",
  },
  {
    title: "Order #2 — two steps",
    stations: 3,
    tools: ["paintBlue", "polish", "paintRed"],
    raw: { shape: "circle", color: "gray", finish: "rough", wrapped: false },
    target: { shape: "circle", color: "blue", finish: "polished", wrapped: false },
    lesson:
      "Two employees, two different functions, applied in turn. Passing functions lets you compose behavior from small pieces.",
  },
  {
    title: "Order #3 — reshape and finish",
    stations: 3,
    tools: ["cutStar", "paintBlue", "polish", "paintRed"],
    raw: { shape: "circle", color: "gray", finish: "rough", wrapped: false },
    target: { shape: "star", color: "blue", finish: "polished", wrapped: false },
    lesson:
      "Same conveyor, totally different result — only the functions you handed out changed. The receiver's behavior is decided by the function it's given.",
  },
  {
    title: "Order #4 — order matters",
    stations: 3,
    tools: ["cutStar", "paintRed", "wrap"],
    raw: { shape: "circle", color: "gray", finish: "rough", wrapped: false },
    target: { shape: "star", color: "red", finish: "rough", wrapped: true },
    lesson:
      "Wrap had to go LAST — once sealed, later functions did nothing. The order you compose functions in changes the outcome.",
  },
  {
    title: "Order #5 — no purple tool!",
    stations: 4,
    tools: ["paintRed", "paintBlue", "cutStar", "polish"],
    raw: { shape: "circle", color: "gray", finish: "rough", wrapped: false },
    target: { shape: "star", color: "purple", finish: "polished", wrapped: false },
    lesson:
      "There was no 'PaintPurple'. You built it by composing PaintRed then PaintBlue. Small functions combine into behavior you weren't handed directly.",
  },
  {
    title: "Order #6 — full custom build",
    stations: 4,
    tools: ["cutSquare", "paintRed", "paintBlue", "polish", "wrap"],
    raw: { shape: "circle", color: "gray", finish: "rough", wrapped: false },
    target: { shape: "square", color: "purple", finish: "rough", wrapped: true },
    lesson:
      "You chose which functions to hand out, and in what order. That choice — not the belt — defined the product. That's the whole idea.",
  },
];
