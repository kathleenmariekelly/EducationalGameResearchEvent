// generate.js
//
// Procedural population generation (client-side, NO API calls). Guarantees
// exactly ONE culprit who satisfies every clue. Handles all condition types
// (=, comparisons, BETWEEN, IN/NOT IN, LIKE/NOT LIKE) and two-table JOIN
// cases (a suspects table + a related table like sightings / camera_logs),
// where some suspects have NO matching record so INNER vs LEFT join differ.

const FIRST = [
  "Ada", "Boris", "Cleo", "Dev", "Elsa", "Finn", "Gia", "Hugo", "Isla", "Jax",
  "Kira", "Leo", "Mara", "Nils", "Otis", "Pia", "Quinn", "Remy", "Sana", "Theo",
  "Uma", "Vera", "Wes", "Xander", "Yara", "Zane", "Cara", "Ike", "Jo", "Nia",
  "Gus", "Dot", "Sy", "Bea", "Cal", "Lux", "Rhea", "Sam", "Owen", "Tara",
  "Priya", "Marco", "Lena", "Kip", "Mona", "Rex", "Vin", "Nora", "Emil", "Rosa",
];
const LAST = [
  "Vaughn", "Kane", "Marsh", "Okoro", "Ferro", "Sen", "Diaz", "Lin", "Blake", "Cole",
  "Kapoor", "Aro", "Voss", "Rowan", "Quill", "Bram", "Sol", "Nunez", "Toms", "Park",
  "Hale", "Ford", "Ray", "Cray", "Behr", "Nash", "Reed", "Vane", "Adler", "Pell",
  "Lund", "Mott", "Cho", "Deep", "Gray", "Fenn", "Wren", "Boyd", "Frost", "Hart",
];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// LIKE pattern (% = any run, _ = any single char) -> anchored RegExp
export function likeToRegex(pattern) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = escaped.replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp("^" + body + "$", "i");
}

const eqCI = (a, b) =>
  typeof a === "string" && typeof b === "string" ? a.toLowerCase() === b.toLowerCase() : a === b;

export function satisfies(value, cond) {
  if (value === null || value === undefined) return false; // NULL never matches
  let res;
  switch (cond.op) {
    case "=": res = eqCI(value, cond.value); break;
    case "!=": res = !eqCI(value, cond.value); break;
    case ">": res = value > cond.value; break;
    case "<": res = value < cond.value; break;
    case ">=": res = value >= cond.value; break;
    case "<=": res = value <= cond.value; break;
    case "BETWEEN": res = value >= cond.low && value <= cond.high; break;
    case "IN": res = cond.values.some((v) => eqCI(value, v)); break;
    case "LIKE": res = likeToRegex(String(cond.value)).test(String(value)); break;
    default: res = false;
  }
  return cond.negate ? !res : res;
}

function randomValue(domain) {
  if (domain.type === "int") return randInt(domain.min, domain.max);
  return pick(domain.values); // enum | string
}

// A domain value that FAILS the condition (keeps distractors from being a
// second full match). Random-sample the domain; fall back if unlucky.
function failingValue(cond, domain) {
  for (let i = 0; i < 600; i++) {
    const v = randomValue(domain);
    if (!satisfies(v, cond)) return v;
  }
  return randomValue(domain);
}

function uniqueNames(n) {
  const set = new Set();
  while (set.size < n) set.add(`${pick(FIRST)} ${pick(LAST)}`);
  return [...set];
}

// ---- single-table (easy / medium) ----
export function generatePopulation(template, size) {
  const dataCols = template.columns.filter((c) => c.domain);
  const clues = template.clues;
  const names = uniqueNames(size);
  const rows = [];

  const culprit = { id: 1, name: names[0] };
  for (const col of dataCols)
    culprit[col.key] = template.culprit[col.key] !== undefined ? template.culprit[col.key] : randomValue(col.domain);
  rows.push(culprit);

  for (let i = 1; i < size; i++) {
    const row = { id: i + 1, name: names[i] };
    for (const col of dataCols) row[col.key] = randomValue(col.domain);
    if (clues.every((cl) => satisfies(row[cl.cond.column], cl.cond))) {
      const clue = pick(clues);
      const col = dataCols.find((c) => c.key === clue.cond.column);
      row[clue.cond.column] = failingValue(clue.cond, col.domain);
    }
    rows.push(row);
  }
  shuffleInPlace(rows);
  return { rows, culpritId: 1 };
}

// ---- two-table JOIN (hard) ----
// Produces already-joined rows: one row per suspect. Suspects with a related
// record carry the B columns and matched=true; those without carry NULL B
// columns and matched=false (kept by LEFT join, dropped by INNER join).
export function generateJoined(template, size) {
  const colsA = template.columns.filter((c) => c.src === "A" && c.domain);
  const colsB = template.columns.filter((c) => c.src === "B" && c.domain);
  const clues = template.clues;
  const names = uniqueNames(size);
  const rows = [];

  const fillB = (row, clued) => {
    for (const col of colsB) row[col.key] = clued && clued[col.key] !== undefined ? clued[col.key] : randomValue(col.domain);
    row.matched = true;
  };
  const nullB = (row) => {
    for (const col of colsB) row[col.key] = null;
    row.matched = false;
  };

  // culprit — always has a matching record
  const culprit = { id: 1, name: names[0], matched: true };
  for (const col of colsA)
    culprit[col.key] = template.culpritA[col.key] !== undefined ? template.culpritA[col.key] : randomValue(col.domain);
  fillB(culprit, template.culpritB);
  rows.push(culprit);

  for (let i = 1; i < size; i++) {
    const row = { id: i + 1, name: names[i] };
    for (const col of colsA) row[col.key] = randomValue(col.domain);
    if (Math.random() < template.sightingRate) fillB(row, null);
    else nullB(row);
    // repair: no distractor may satisfy every clue
    if (row.matched && clues.every((cl) => satisfies(row[cl.cond.column], cl.cond))) {
      const clue = pick(clues);
      const col = template.columns.find((c) => c.key === clue.cond.column && c.domain);
      row[clue.cond.column] = failingValue(clue.cond, col.domain);
    }
    rows.push(row);
  }
  shuffleInPlace(rows);
  return { rows, culpritId: 1 };
}

function shuffleInPlace(rows) {
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
}
