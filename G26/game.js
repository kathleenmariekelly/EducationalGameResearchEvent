"use strict";

/* ============================================================
   Discrete Quest — battle logic + discrete math problem engine
   ============================================================ */

// ---------- small helpers ----------
const $ = (id) => document.getElementById(id);
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const setStr = (s) => "{" + [...s].sort((x, y) => x - y).join(", ") + "}";
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
function nCr(n, r) { if (r < 0 || r > n) return 0; return factorial(n) / (factorial(r) * factorial(n - r)); }
function nPr(n, r) { if (r < 0 || r > n) return 0; return factorial(n) / factorial(n - r); }
function isPrime(n) { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }

// Turn a numeric/string answer into 4 unique multiple-choice options.
function numChoices(correct, spread = 4) {
  const opts = new Set([correct]);
  let guard = 0;
  while (opts.size < 4 && guard++ < 100) {
    const delta = rand(1, spread) * (Math.random() < 0.5 ? -1 : 1);
    const v = correct + delta;
    if (v >= 0) opts.add(v);
  }
  while (opts.size < 4) opts.add(correct + opts.size); // fallback
  return shuffle([...opts]).map(String);
}
function strChoices(correct, distractors) {
  const set = [correct, ...distractors].filter((v, i, a) => a.indexOf(v) === i);
  return shuffle(set.slice(0, 4));
}

/* ============================================================
   PROBLEM GENERATORS
   Each returns { category, badge, text(HTML), choices[], answer }
   `difficulty` grows with player level.
   ============================================================ */

// ---- SETS ----  (spell: Arcane)
function genSets(diff) {
  const size = Math.min(4 + Math.floor(diff / 2), 8);
  const universe = Array.from({ length: 9 }, (_, i) => i + 1);
  const A = new Set(shuffle(universe).slice(0, size));
  const B = new Set(shuffle(universe).slice(0, size));

  const kind = pick(["union", "inter", "diff", "symdiff", "card", "subset", "power",
                     "complement", "member", "disjoint", "cartesian", "subsetcheck"]);
  let text, answer, choices;

  let explain;
  if (kind === "union") {
    const res = new Set([...A, ...B]);
    text = `Let A = <code>${setStr(A)}</code> and B = <code>${setStr(B)}</code>.<br>What is A ∪ B?`;
    answer = setStr(res);
    choices = strChoices(answer, [setStr(new Set([...A].filter(x => B.has(x)))), setStr(A), setStr(B)]);
    explain = `A ∪ B contains every element in <b>A or B</b> (no duplicates) → <code>${answer}</code>.`;
  } else if (kind === "inter") {
    const res = new Set([...A].filter(x => B.has(x)));
    text = `Let A = <code>${setStr(A)}</code> and B = <code>${setStr(B)}</code>.<br>What is A ∩ B?`;
    answer = setStr(res);
    choices = strChoices(answer, [setStr(new Set([...A, ...B])), setStr(A), setStr(B)]);
    explain = `A ∩ B keeps only elements in <b>both</b> sets → <code>${answer}</code>.`;
  } else if (kind === "diff") {
    const res = new Set([...A].filter(x => !B.has(x)));
    text = `Let A = <code>${setStr(A)}</code> and B = <code>${setStr(B)}</code>.<br>What is A \\ B (A minus B)?`;
    answer = setStr(res);
    choices = strChoices(answer, [setStr(new Set([...B].filter(x => !A.has(x)))), setStr(new Set([...A].filter(x => B.has(x)))), setStr(A)]);
    explain = `A \\ B keeps elements in A that are <b>not in B</b> → <code>${answer}</code>.`;
  } else if (kind === "symdiff") {
    const res = new Set([...[...A].filter(x => !B.has(x)), ...[...B].filter(x => !A.has(x))]);
    text = `Let A = <code>${setStr(A)}</code> and B = <code>${setStr(B)}</code>.<br>What is the symmetric difference A △ B?`;
    answer = setStr(res);
    choices = strChoices(answer, [setStr(new Set([...A, ...B])), setStr(new Set([...A].filter(x => B.has(x)))), setStr(new Set([...A].filter(x => !B.has(x))))]);
    explain = `A △ B = (A ∪ B) \\ (A ∩ B): elements in exactly <b>one</b> set → <code>${answer}</code>.`;
  } else if (kind === "card") {
    const res = new Set([...A, ...B]);
    const inter = new Set([...A].filter(x => B.has(x)));
    text = `Let A = <code>${setStr(A)}</code> and B = <code>${setStr(B)}</code>.<br>What is |A ∪ B| (the cardinality)?`;
    answer = String(res.size);
    choices = numChoices(res.size, 3);
    explain = `Inclusion–exclusion: |A∪B| = |A| + |B| − |A∩B| = ${A.size} + ${B.size} − ${inter.size} = <b>${answer}</b>.`;
  } else if (kind === "subset") {
    const n = rand(3, 5);
    text = `A set has ${n} elements. How many <b>subsets</b> does it have?`;
    answer = String(Math.pow(2, n));
    choices = numChoices(Math.pow(2, n), Math.pow(2, n - 1) || 2);
    explain = `A set with n elements has <code>2^n</code> subsets: 2^${n} = <b>${answer}</b>.`;
  } else if (kind === "power") { // proper subsets
    const n = rand(3, 5);
    text = `A set has ${n} elements. How many <b>proper</b> subsets does it have? (all subsets except the set itself)`;
    answer = String(Math.pow(2, n) - 1);
    choices = numChoices(Math.pow(2, n) - 1, 3);
    explain = `Total subsets 2^${n} minus the set itself: 2^${n} − 1 = <b>${answer}</b>.`;
  } else if (kind === "complement") {
    const res = new Set(universe.filter(x => !A.has(x)));
    text = `Universe U = <code>${setStr(new Set(universe))}</code>, A = <code>${setStr(A)}</code>.<br>What is the complement A' (U \\ A)?`;
    answer = setStr(res);
    choices = strChoices(answer, [setStr(A), setStr(new Set(universe)), setStr(new Set(universe.filter(x => A.has(x) || x % 2 === 0)))]);
    explain = `A' = U \\ A: every element of U not in A → <code>${answer}</code>.`;
  } else if (kind === "member") {
    const x = rand(1, 9);
    const inA = A.has(x);
    text = `Let A = <code>${setStr(A)}</code>.<br>Is <code>${x} ∈ A</code>?`;
    answer = inA ? "True" : "False";
    choices = ["True", "False"];
    explain = `${x} ${inA ? "is" : "is not"} listed in A, so the statement is <b>${answer}</b>.`;
  } else if (kind === "disjoint") {
    const common = [...A].some(x => B.has(x));
    text = `Are A = <code>${setStr(A)}</code> and B = <code>${setStr(B)}</code> <b>disjoint</b>? (no common elements)`;
    answer = common ? "No" : "Yes";
    choices = ["Yes", "No"];
    explain = common
      ? `They share ${setStr(new Set([...A].filter(x => B.has(x))))}, so <b>not</b> disjoint.`
      : `A ∩ B = {} (empty), so they are <b>disjoint</b>.`;
  } else if (kind === "cartesian") {
    const res = A.size * B.size;
    text = `Let A = <code>${setStr(A)}</code> and B = <code>${setStr(B)}</code>.<br>What is |A × B| (size of the Cartesian product)?`;
    answer = String(res);
    choices = numChoices(res, Math.max(3, Math.round(res / 3)));
    explain = `|A × B| = |A|·|B| = ${A.size}·${B.size} = <b>${res}</b>.`;
  } else { // subsetcheck
    const isSub = [...A].every(x => B.has(x));
    text = `Is A = <code>${setStr(A)}</code> a <b>subset</b> of B = <code>${setStr(B)}</code>? (A ⊆ B)`;
    answer = isSub ? "Yes" : "No";
    choices = ["Yes", "No"];
    explain = isSub
      ? `Every element of A is in B, so A ⊆ B is <b>true</b>.`
      : `${setStr(new Set([...A].filter(x => !B.has(x))))} ⊄ B, so A ⊆ B is <b>false</b>.`;
  }

  return { category: "sets", badge: "Sets", text, choices, answer, explain };
}

// ---- COMBINATORICS ----  (spell: Fire)
function genComb(diff) {
  const kind = pick(["perm", "comb", "factorial", "product", "arrange", "handshake",
                     "funcs", "bitstrings", "circular", "pigeonhole", "bitk"]);
  let text, answer, choices, explain;

  if (kind === "perm") {
    const n = rand(4, 7), r = rand(2, 3);
    const res = nPr(n, r);
    text = `In how many ways can you arrange <b>${r}</b> items chosen from <b>${n}</b> distinct items? (order matters)<br><code>P(${n}, ${r})</code>`;
    answer = String(res);
    choices = numChoices(res, Math.max(3, Math.floor(res / 4)));
    explain = `P(n,r) = n!/(n−r)! = ${n}!/${n - r}! = <b>${res}</b>. Order matters, so no division by r!.`;
  } else if (kind === "comb") {
    const n = rand(4, 8), r = rand(2, 3);
    const res = nCr(n, r);
    text = `In how many ways can you choose <b>${r}</b> items from <b>${n}</b> distinct items? (order doesn't matter)<br><code>C(${n}, ${r})</code>`;
    answer = String(res);
    choices = numChoices(res, Math.max(3, Math.floor(res / 3)));
    explain = `C(n,r) = n!/(r!(n−r)!) = ${n}!/(${r}!·${n - r}!) = <b>${res}</b>. Order doesn't matter.`;
  } else if (kind === "factorial") {
    const n = rand(3, 6);
    const res = factorial(n);
    text = `How many ways can <b>${n}</b> distinct books be arranged in a row?<br><code>${n}!</code>`;
    answer = String(res);
    choices = numChoices(res, Math.max(4, Math.floor(res / 3)));
    explain = `${n} choices, then ${n - 1}, then …: ${n}! = <b>${res}</b>.`;
  } else if (kind === "product") {
    const a = rand(2, 5), b = rand(2, 5), c = rand(2, 4);
    const res = a * b * c;
    text = `A meal has ${a} starters, ${b} mains, and ${c} desserts. How many distinct meals are possible? (rule of product)`;
    answer = String(res);
    choices = numChoices(res, 5);
    explain = `Rule of product: multiply independent choices → ${a}×${b}×${c} = <b>${res}</b>.`;
  } else if (kind === "arrange") {
    const word = pick(["LEVEL", "BOOK", "MATH", "GOOGLE"]);
    const counts = {};
    for (const ch of word) counts[ch] = (counts[ch] || 0) + 1;
    let denom = 1; const rep = []; for (const k in counts) { denom *= factorial(counts[k]); if (counts[k] > 1) rep.push(`${k}×${counts[k]}`); }
    const res = factorial(word.length) / denom;
    text = `How many distinct arrangements of the letters in <code>${word}</code> are there?`;
    answer = String(res);
    choices = numChoices(res, Math.max(5, Math.floor(res / 4)));
    explain = `${word.length}! divided by factorials of repeats (${rep.join(", ") || "none"}) = ${word.length}!/${denom} = <b>${res}</b>.`;
  } else if (kind === "handshake") {
    const n = rand(4, 8);
    const res = nCr(n, 2);
    text = `${n} people at a party each shake hands once with every other person. How many handshakes total?`;
    answer = String(res);
    choices = numChoices(res, 4);
    explain = `Each handshake is a pair: C(${n},2) = ${n}·${n - 1}/2 = <b>${res}</b>.`;
  } else if (kind === "funcs") {
    const a = rand(2, 4), b = rand(2, 4);
    const res = Math.pow(b, a);
    text = `How many functions are there from a set of size <b>${a}</b> to a set of size <b>${b}</b>?`;
    answer = String(res);
    choices = numChoices(res, Math.max(3, Math.round(res / 3)));
    explain = `Each of the ${a} inputs independently maps to any of ${b} outputs: ${b}^${a} = <b>${res}</b>.`;
  } else if (kind === "bitstrings") {
    const n = rand(3, 7);
    const res = Math.pow(2, n);
    text = `How many binary strings (bit strings) of length <b>${n}</b> are there?`;
    answer = String(res);
    choices = numChoices(res, Math.max(3, Math.round(res / 3)));
    explain = `Each of the ${n} positions is 0 or 1: 2^${n} = <b>${res}</b>.`;
  } else if (kind === "circular") {
    const n = rand(4, 6);
    const res = factorial(n - 1);
    text = `In how many ways can <b>${n}</b> people be seated around a <b>round</b> table? (rotations are the same)`;
    answer = String(res);
    choices = numChoices(res, Math.max(4, Math.round(res / 3)));
    explain = `Fix one person to remove rotations: (n−1)! = ${n - 1}! = <b>${res}</b>.`;
  } else if (kind === "bitk") {
    const n = rand(4, 7), k = rand(2, 3);
    const res = nCr(n, k);
    text = `How many binary strings of length <b>${n}</b> contain exactly <b>${k}</b> ones?`;
    answer = String(res);
    choices = numChoices(res, Math.max(3, Math.round(res / 3)));
    explain = `Choose which ${k} of the ${n} positions are 1: C(${n},${k}) = <b>${res}</b>.`;
  } else { // pigeonhole
    const k = rand(3, 6), extra = rand(1, 3), n = k * rand(2, 3) + extra;
    const res = Math.ceil(n / k);
    text = `${n} pigeons are placed into ${k} holes. By the pigeonhole principle, at least one hole must contain at least how many pigeons?`;
    answer = String(res);
    choices = numChoices(res, 2);
    explain = `At least ⌈n/k⌉ = ⌈${n}/${k}⌉ = <b>${res}</b> in some hole.`;
  }

  return { category: "comb", badge: "Combinatorics", text, choices, answer, explain };
}

// ---- NUMBER THEORY ----  (spell: Frost)
function genNum(diff) {
  const kind = pick(["gcd", "mod", "prime", "lcm", "divisors", "congruent",
                     "binary", "coprime", "multiples", "digitsum", "onebits"]);
  let text, answer, choices, explain;

  if (kind === "gcd") {
    const a = rand(12, 60), b = rand(12, 60);
    const res = gcd(a, b);
    text = `What is <code>gcd(${a}, ${b})</code>?`;
    answer = String(res);
    choices = numChoices(res, 4);
    explain = `The greatest common divisor of ${a} and ${b} (Euclid's algorithm) is <b>${res}</b>.`;
  } else if (kind === "mod") {
    const a = rand(20, 99), m = rand(3, 9);
    const res = a % m;
    text = `Compute <code>${a} mod ${m}</code>.`;
    answer = String(res);
    choices = numChoices(res, Math.max(2, m - 1));
    explain = `${a} = ${Math.floor(a / m)}×${m} + ${res}, so the remainder is <b>${res}</b>.`;
  } else if (kind === "prime") {
    const n = rand(20, 60);
    const p = isPrime(n);
    text = `Is <b>${n}</b> a prime number?`;
    answer = p ? "Yes, it's prime" : "No, it's composite";
    choices = ["Yes, it's prime", "No, it's composite"];
    let factor = 0; for (let i = 2; i * i <= n; i++) if (n % i === 0) { factor = i; break; }
    explain = p ? `${n} has no divisors other than 1 and itself → <b>prime</b>.`
               : `${n} = ${factor}×${n / factor}, so it's <b>composite</b>.`;
  } else if (kind === "lcm") {
    const a = rand(3, 12), b = rand(3, 12);
    const g = gcd(a, b);
    const res = (a * b) / g;
    text = `What is <code>lcm(${a}, ${b})</code>?`;
    answer = String(res);
    choices = numChoices(res, Math.max(4, Math.floor(res / 4)));
    explain = `lcm(a,b) = a·b/gcd(a,b) = ${a}×${b}/${g} = <b>${res}</b>.`;
  } else if (kind === "divisors") {
    const n = pick([12, 18, 24, 30, 36, 16, 20, 28]);
    const ds = []; for (let i = 1; i <= n; i++) if (n % i === 0) ds.push(i);
    text = `How many positive divisors does <b>${n}</b> have?`;
    answer = String(ds.length);
    choices = numChoices(ds.length, 3);
    explain = `Divisors of ${n}: ${ds.join(", ")} — that's <b>${ds.length}</b>.`;
  } else if (kind === "congruent") {
    const m = rand(3, 7), a = rand(10, 40);
    const res = a % m;
    text = `Find x where <code>${a} ≡ x (mod ${m})</code> and 0 ≤ x &lt; ${m}.`;
    answer = String(res);
    choices = numChoices(res, Math.max(2, m - 1));
    explain = `x is the remainder of ${a} ÷ ${m}: ${a} mod ${m} = <b>${res}</b>.`;
  } else if (kind === "binary") {
    const n = rand(5, 31);
    const res = n.toString(2);
    text = `What is <b>${n}</b> in binary (base 2)?`;
    answer = res;
    const distract = [(n + 1).toString(2), (n - 1).toString(2), (n ^ (1 << rand(0, 3))).toString(2)];
    choices = strChoices(answer, distract);
    explain = `${n} in base 2 is <code>${res}</code> (${res.split("").map((b, i) => b === "1" ? 2 ** (res.length - 1 - i) : 0).filter(Boolean).join("+")} = ${n}).`;
  } else if (kind === "coprime") {
    const a = rand(6, 30), b = rand(6, 30);
    const g = gcd(a, b);
    text = `Are <b>${a}</b> and <b>${b}</b> <b>coprime</b>? (share no common factor &gt; 1)`;
    answer = g === 1 ? "Yes" : "No";
    choices = ["Yes", "No"];
    explain = g === 1
      ? `gcd(${a}, ${b}) = 1, so they are <b>coprime</b>.`
      : `gcd(${a}, ${b}) = ${g} &gt; 1, so they are <b>not</b> coprime.`;
  } else if (kind === "multiples") {
    const d = rand(3, 9), n = rand(30, 80);
    const res = Math.floor(n / d);
    text = `How many integers from 1 to ${n} are divisible by <b>${d}</b>?`;
    answer = String(res);
    choices = numChoices(res, 3);
    explain = `⌊${n}/${d}⌋ = <b>${res}</b>.`;
  } else if (kind === "digitsum") {
    const n = rand(100, 999);
    const res = String(n).split("").reduce((s, d) => s + +d, 0);
    text = `What is the sum of the digits of <b>${n}</b>?`;
    answer = String(res);
    choices = numChoices(res, 4);
    explain = `${String(n).split("").join(" + ")} = <b>${res}</b>.`;
  } else { // onebits
    const n = rand(5, 63);
    const bin = n.toString(2);
    const res = bin.split("").filter(b => b === "1").length;
    text = `How many <b>1-bits</b> are in the binary representation of <b>${n}</b>?`;
    answer = String(res);
    choices = numChoices(res, 2);
    explain = `${n} = <code>${bin}</code> in binary, which has <b>${res}</b> one-bit(s).`;
  }

  return { category: "num", badge: "Number Theory", text, choices, answer, explain };
}

// ---- LOGIC ----  (spell: Volt)
function genLogic(diff) {
  const TF = (v) => (v ? "True" : "False");
  const kind = pick(["eval", "not", "rows", "impfalse", "contrapositive", "truecount", "converse"]);
  let text, answer, choices, explain;

  if (kind === "eval") {
    const p = Math.random() < 0.5, q = Math.random() < 0.5;
    const ops = [
      { s: "∧", f: (a, b) => a && b, n: "AND (∧) is true only when both are true" },
      { s: "∨", f: (a, b) => a || b, n: "OR (∨) is true when at least one is true" },
      { s: "→", f: (a, b) => !a || b, n: "p → q is false only when p is true and q is false" },
      { s: "↔", f: (a, b) => a === b, n: "↔ is true when both sides have the same value" },
      { s: "⊕", f: (a, b) => a !== b, n: "XOR (⊕) is true when the values differ" },
    ];
    const op = pick(ops);
    const r = op.f(p, q);
    text = `Let p = <code>${TF(p)}</code>, q = <code>${TF(q)}</code>.<br>Evaluate <code>p ${op.s} q</code>.`;
    answer = TF(r); choices = ["True", "False"];
    explain = `${op.n}: the result is <b>${TF(r)}</b>.`;
  } else if (kind === "not") {
    const p = Math.random() < 0.5, q = Math.random() < 0.5;
    const r = !(p && q);
    text = `Let p = <code>${TF(p)}</code>, q = <code>${TF(q)}</code>.<br>Evaluate <code>¬(p ∧ q)</code>.`;
    answer = TF(r); choices = ["True", "False"];
    explain = `p ∧ q = ${TF(p && q)}, so ¬(p ∧ q) = <b>${TF(r)}</b>. (De Morgan: ¬p ∨ ¬q)`;
  } else if (kind === "rows") {
    const n = rand(2, 5); const res = 2 ** n;
    text = `A truth table has <b>${n}</b> propositional variables. How many rows does it have?`;
    answer = String(res); choices = numChoices(res, Math.max(2, Math.round(res / 2)));
    explain = `Each variable doubles the rows: 2^${n} = <b>${res}</b>.`;
  } else if (kind === "impfalse") {
    text = `For which truth values is the implication <code>p → q</code> <b>false</b>?`;
    answer = "p = True, q = False";
    choices = strChoices(answer, ["p = False, q = True", "p = True, q = True", "p = False, q = False"]);
    explain = `p → q is false <b>only</b> when the hypothesis p is true but the conclusion q is false.`;
  } else if (kind === "contrapositive") {
    text = `What is the <b>contrapositive</b> of <code>p → q</code>?`;
    answer = "¬q → ¬p";
    choices = strChoices(answer, ["q → p", "¬p → ¬q", "p → ¬q"]);
    explain = `The contrapositive negates and swaps: <b>¬q → ¬p</b> (logically equivalent to p → q).`;
  } else if (kind === "converse") {
    text = `What is the <b>converse</b> of <code>p → q</code>?`;
    answer = "q → p";
    choices = strChoices(answer, ["¬q → ¬p", "¬p → ¬q", "p → ¬q"]);
    explain = `The converse swaps hypothesis and conclusion: <b>q → p</b> (not equivalent to p → q).`;
  } else { // truecount
    const ops = [
      { s: "∧", f: (a, b) => a && b, n: "AND" },
      { s: "∨", f: (a, b) => a || b, n: "OR" },
      { s: "→", f: (a, b) => !a || b, n: "implication" },
      { s: "⊕", f: (a, b) => a !== b, n: "XOR" },
    ];
    const op = pick(ops);
    let count = 0;
    for (const a of [true, false]) for (const b of [true, false]) if (op.f(a, b)) count++;
    text = `In the truth table for <code>p ${op.s} q</code> (4 rows), how many rows are <b>true</b>?`;
    answer = String(count);
    choices = ["0", "1", "2", "3", "4"].filter(v => v !== String(count));
    choices = shuffle([String(count), ...choices.slice(0, 3)]);
    explain = `${op.n} is true in <b>${count}</b> of the 4 rows.`;
  }
  return { category: "logic", badge: "Logic", text, choices, answer, explain };
}

// ---- SEQUENCES & SUMS ----  (spell: Bramble)
function genSeq(diff) {
  const kind = pick(["arith", "odd", "even", "arithnext", "geonext", "powsum",
                     "fib", "nthterm", "geomsum", "squares"]);
  let text, answer, choices, explain;

  if (kind === "arith") {
    const n = rand(5, 12); const res = n * (n + 1) / 2;
    text = `What is the sum 1 + 2 + 3 + … + ${n}?`;
    answer = String(res); choices = numChoices(res, Math.max(4, Math.round(res / 4)));
    explain = `Arithmetic series: n(n+1)/2 = ${n}·${n + 1}/2 = <b>${res}</b>.`;
  } else if (kind === "odd") {
    const n = rand(4, 9); const res = n * n;
    text = `What is the sum of the first ${n} odd numbers (1 + 3 + 5 + …)?`;
    answer = String(res); choices = numChoices(res, Math.max(4, Math.round(res / 4)));
    explain = `The sum of the first n odd numbers is n² = ${n}² = <b>${res}</b>.`;
  } else if (kind === "even") {
    const n = rand(4, 9); const res = n * (n + 1);
    text = `What is the sum of the first ${n} even numbers (2 + 4 + 6 + …)?`;
    answer = String(res); choices = numChoices(res, Math.max(4, Math.round(res / 4)));
    explain = `Sum = 2(1+2+…+n) = n(n+1) = ${n}·${n + 1} = <b>${res}</b>.`;
  } else if (kind === "arithnext") {
    const a = rand(1, 6), d = rand(2, 6);
    const seq = [a, a + d, a + 2 * d, a + 3 * d];
    const res = a + 4 * d;
    text = `What comes next? <code>${seq.join(", ")}, …</code>`;
    answer = String(res); choices = numChoices(res, d + 2);
    explain = `Arithmetic sequence, common difference ${d}: ${seq[3]} + ${d} = <b>${res}</b>.`;
  } else if (kind === "geonext") {
    const a = rand(1, 4), r = rand(2, 3);
    const seq = [a, a * r, a * r * r, a * r * r * r];
    const res = a * r ** 4;
    text = `What comes next? <code>${seq.join(", ")}, …</code>`;
    answer = String(res); choices = numChoices(res, Math.max(3, Math.round(res / 3)));
    explain = `Geometric sequence, ratio ${r}: ${seq[3]} × ${r} = <b>${res}</b>.`;
  } else if (kind === "powsum") {
    const k = rand(3, 6); const res = 2 ** (k + 1) - 1;
    const terms = Array.from({ length: k + 1 }, (_, i) => 2 ** i).join(" + ");
    text = `What is the sum ${terms}?`;
    answer = String(res); choices = numChoices(res, Math.max(4, Math.round(res / 4)));
    explain = `Geometric sum of powers of 2: 2^(k+1) − 1 = 2^${k + 1} − 1 = <b>${res}</b>.`;
  } else if (kind === "fib") {
    let a = rand(1, 3), b = a + rand(1, 3);
    const seq = [a, b];
    for (let i = 0; i < 3; i++) { const n = seq[seq.length - 1] + seq[seq.length - 2]; seq.push(n); }
    const res = seq[seq.length - 1];
    text = `Each term is the sum of the two before it. What comes next? <code>${seq.slice(0, 4).join(", ")}, …</code>`;
    answer = String(res); choices = numChoices(res, Math.max(3, Math.round(res / 4)));
    explain = `Fibonacci-style: ${seq[2]} + ${seq[3]} = <b>${res}</b>.`;
  } else if (kind === "nthterm") {
    const a = rand(2, 8), d = rand(2, 6), k = rand(5, 10);
    const res = a + (k - 1) * d;
    text = `An arithmetic sequence starts at ${a} with common difference ${d}. What is the <b>${k}th</b> term?`;
    answer = String(res); choices = numChoices(res, d + 3);
    explain = `aₖ = a + (k−1)d = ${a} + (${k}−1)·${d} = <b>${res}</b>.`;
  } else if (kind === "squares") {
    const n = rand(3, 7); const res = n * (n + 1) * (2 * n + 1) / 6;
    text = `What is the sum of the first ${n} squares? 1² + 2² + … + ${n}²`;
    answer = String(res); choices = numChoices(res, Math.max(4, Math.round(res / 3)));
    explain = `Sum of squares: n(n+1)(2n+1)/6 = ${n}·${n + 1}·${2 * n + 1}/6 = <b>${res}</b>.`;
  } else { // geomsum
    const r = rand(2, 3), n = rand(3, 5);
    const terms = Array.from({ length: n + 1 }, (_, i) => r ** i);
    const res = terms.reduce((s, v) => s + v, 0);
    text = `What is the sum ${terms.join(" + ")}?`;
    answer = String(res); choices = numChoices(res, Math.max(4, Math.round(res / 4)));
    explain = `Geometric series: (r^(n+1)−1)/(r−1) = (${r}^${n + 1}−1)/${r - 1} = <b>${res}</b>.`;
  }
  return { category: "seq", badge: "Sequences", text, choices, answer, explain };
}

// spell element -> category generator + display
const SPELLS = {
  arcane: { gen: genSets,  name: "Arcane Bolt", ico: "🔮", category: "sets" },
  fire:   { gen: genComb,  name: "Fireball",    ico: "🔥", category: "comb" },
  frost:  { gen: genNum,   name: "Frost Shard", ico: "❄️", category: "num" },
  volt:   { gen: genLogic, name: "Volt",        ico: "⚡", category: "logic" },
  vine:   { gen: genSeq,   name: "Bramble",     ico: "🌿", category: "seq" },
};

function generateProblem(spell, diff) {
  let p, guard = 0;
  do { p = SPELLS[spell].gen(diff); guard++; } while (p.text === G._lastQText && guard < 10);
  G._lastQText = p.text;
  return p;
}

/* ============================================================
   ENEMIES
   ============================================================ */
// each enemy has a weakness (Prodigy-style matchup) and a home biome
const ENEMIES = [
  { name: "Set Slime",       sprite: "🟢", hp: 28,  weak: "arcane", biome: "meadow",  drop: { name: "Slime Gel",     ico: "🫧" } },
  { name: "Leaf Sprite",     sprite: "🍃", hp: 34,  weak: "vine",   biome: "meadow",  drop: { name: "Fairy Petal",   ico: "🌸" } },
  { name: "Combo Bat",       sprite: "🦇", hp: 40,  weak: "fire",   biome: "cavern",  drop: { name: "Echo Fang",     ico: "🦷" } },
  { name: "Frost Wisp",      sprite: "🧊", hp: 46,  weak: "fire",   biome: "tundra",  drop: { name: "Frost Crystal", ico: "💠" } },
  { name: "Prime Scorpion",  sprite: "🦂", hp: 52,  weak: "frost",  biome: "desert",  drop: { name: "Venom Sting",   ico: "🧪" } },
  { name: "Venom Toad",      sprite: "🐸", hp: 58,  weak: "vine",   biome: "swamp",   drop: { name: "Toadstool",     ico: "🍄" } },
  { name: "Logic Golem",     sprite: "🗿", hp: 66,  weak: "volt",   biome: "cavern",  drop: { name: "Circuit Core",  ico: "🔩" } },
  { name: "Mirage Djinn",    sprite: "🧞", hp: 72,  weak: "volt",   biome: "desert",  drop: { name: "Genie Lamp",    ico: "🪔" } },
  { name: "Snow Yeti",       sprite: "☃️", hp: 80,  weak: "arcane", biome: "tundra",  drop: { name: "Yeti Fur",      ico: "🧥" } },
  { name: "Modular Mimic",   sprite: "🧰", hp: 88,  weak: "frost",  biome: "swamp",   drop: { name: "Golden Key",    ico: "🗝️" } },
  { name: "Prime Ghost",     sprite: "👻", hp: 96,  weak: "volt",   biome: "volcano", drop: { name: "Spirit Orb",    ico: "🔮" } },
  { name: "Graph Dragon",    sprite: "🐉", hp: 108, weak: "arcane", biome: "volcano", drop: { name: "Dragon Scale",  ico: "🛡️" } },
  { name: "Chaos Wizard",    sprite: "🧟", hp: 130, weak: "frost",  biome: "volcano", drop: { name: "Chaos Emblem",  ico: "👑" } },
];
const WEAK_LABEL = { arcane: "🔮 weak", fire: "🔥 weak", frost: "❄️ weak", volt: "⚡ weak", vine: "🌿 weak" };

// biome bosses — appear once every regular monster of that biome is cleared
const BOSSES = [
  { name: "Grove Guardian", sprite: "🦌", hp: 180, weak: "fire",   biome: "meadow",  boss: true, drop: { name: "Verdant Heart", ico: "💚" } },
  { name: "Sand Wyrm",      sprite: "🐍", hp: 210, weak: "frost",  biome: "desert",  boss: true, drop: { name: "Sun Shard",     ico: "🔆" } },
  { name: "Frost Titan",    sprite: "🐻‍❄️", hp: 240, weak: "fire", biome: "tundra", boss: true, drop: { name: "Glacier Core",  ico: "🧊" } },
  { name: "Deep Horror",    sprite: "🦑", hp: 270, weak: "volt",   biome: "cavern",  boss: true, drop: { name: "Void Gem",      ico: "🟪" } },
  { name: "Bog Serpent",    sprite: "🐊", hp: 300, weak: "vine",   biome: "swamp",   boss: true, drop: { name: "Bog Pearl",     ico: "⚪" } },
  { name: "Inferno Lord",   sprite: "👹", hp: 360, weak: "frost",  biome: "volcano", boss: true, drop: { name: "Magma Core",    ico: "🔴" } },
];

// biome definitions: background + grid colour + minimap colour + decorations
const BIOMES = {
  meadow:  { name: "Meadow",  bg: "#1c3a2e", grid: "rgba(47,107,82,0.5)",   mm: "#2f6b52", decor: ["🌳", "🌲", "🌼", "🌿"] },
  desert:  { name: "Desert",  bg: "#6b5a2f", grid: "rgba(160,140,80,0.4)",  mm: "#b89a52", decor: ["🌵", "🪨", "🦴"] },
  tundra:  { name: "Tundra",  bg: "#2f4a6b", grid: "rgba(130,170,220,0.35)", mm: "#6f9bd0", decor: ["🌲", "❄️", "🏔️"] },
  cavern:  { name: "Cavern",  bg: "#2a2440", grid: "rgba(100,90,150,0.4)",  mm: "#5a5096", decor: ["🪨", "💎", "🕸️"] },
  swamp:   { name: "Swamp",   bg: "#233a26", grid: "rgba(80,120,80,0.4)",   mm: "#4a7a4a", decor: ["🍄", "🪵", "🌿"] },
  volcano: { name: "Volcano", bg: "#4a2620", grid: "rgba(170,90,60,0.45)",  mm: "#a5503c", decor: ["🌋", "🔥", "🪨"] },
};

/* ============================================================
   GAME STATE
   ============================================================ */
const G = {
  level: 1, kills: 0, xp: 0, xpNeed: 3,
  streak: 0, bestStreak: 0,
  pMaxHp: 100, pHp: 100,
  eMaxHp: 30, eHp: 30, enemyTier: 0,
  current: null, locked: false, spell: null, enemyWeak: "arcane", pending: null,
  // overworld
  mode: "explore", px: 320, py: 160, facing: 1,
  worldEnemies: [], activeEntry: null, biomeGrid: [], decor: [], _hintKey: null,
  _lastQText: null, inventory: {}, atkBonus: 0, critBonus: 0,
  bossSpawned: {}, bossMsg: "",
  mainStage: 0, mainProg: 0, sideState: {}, _noticeBuf: [],
};

// ---------- crafting recipes ----------
// cost keys reference drop item names; result is a consumable potion or a buff
const RECIPES = [
  { name: "Minor Heal",       ico: "🧪", desc: "Restore 35 HP in battle",        cost: { "Slime Gel": 2, "Frost Crystal": 1 },                        result: { kind: "potion", heal: 35 } },
  { name: "Major Heal",       ico: "🍶", desc: "Restore 80 HP in battle",        cost: { "Yeti Fur": 1, "Toadstool": 1, "Frost Crystal": 1 },        result: { kind: "potion", heal: 80 } },
  { name: "Strength Elixir",  ico: "⚗️", desc: "+4 attack (permanent)",          cost: { "Circuit Core": 1, "Echo Fang": 1, "Venom Sting": 1 },     result: { kind: "buff", stat: "atk", amount: 4 } },
  { name: "Vitality Draught", ico: "🧫", desc: "+25 max HP & full heal",          cost: { "Dragon Scale": 1, "Spirit Orb": 1 },                      result: { kind: "buff", stat: "maxhp", amount: 25 } },
  { name: "Focus Tonic",      ico: "🎯", desc: "+0.25 critical damage (permanent)", cost: { "Genie Lamp": 1, "Fairy Petal": 1, "Golden Key": 1 },       result: { kind: "buff", stat: "crit", amount: 0.25 } },
  // ⭐ legendary recipes — need rare boss drops
  { name: "Titan Brew",       ico: "🏺", desc: "⭐ +12 attack (permanent)",        cost: { "Verdant Heart": 1, "Sun Shard": 1 },   result: { kind: "buff", stat: "atk", amount: 12 } },
  { name: "Phoenix Tonic",    ico: "🔥", desc: "⭐ Restore 200 HP in battle",     cost: { "Glacier Core": 1, "Bog Pearl": 1 },   result: { kind: "potion", heal: 200 } },
  { name: "Aegis Draught",    ico: "🛡️", desc: "⭐ +70 max HP & full heal",      cost: { "Void Gem": 1, "Magma Core": 1 },      result: { kind: "buff", stat: "maxhp", amount: 70 } },
];
// which inventory items are usable potions -> heal amount
const POTION_HEAL = { "Minor Heal": 35, "Major Heal": 80, "Phoenix Tonic": 200 };
// lookup of drop-item name -> icon (for showing recipe costs even at 0 owned)
const DROP_ICO = {};
[...ENEMIES, ...BOSSES].forEach((e) => { if (e.drop) DROP_ICO[e.drop.name] = e.drop.ico; });
const RECIPE_ICO = {};
RECIPES.forEach((r) => { RECIPE_ICO[r.name] = r.ico; });
function itemIco(name) { return RECIPE_ICO[name] || DROP_ICO[name] || "❓"; }

// ---------- quests ----------
const MAIN_STAGES = [
  { desc: "Prove your strength: slay 5 monsters",        type: "kill",     target: 5, reward: { potion: "Minor Heal", n: 2 } },
  { desc: "Awaken and defeat 3 biome bosses",           type: "boss",     target: 3, reward: { buff: { stat: "atk", amount: 5 }, label: "+5 attack" } },
  { desc: "Vanquish the Inferno Lord in the Volcano",   type: "killname", target: 1, name: "Inferno Lord", reward: { buff: { stat: "maxhp", amount: 50 }, label: "+50 max HP" } },
];
const SIDE_QUESTS = [
  { id: "meadow", biome: "meadow", title: "Meadow Cleanup",  desc: "Defeat both monsters roaming the Meadow", type: "killbiome", biome: "meadow", target: 2, reward: { potion: "Minor Heal", n: 2 } },
  { id: "venom",  biome: "desert", title: "Antivenom Brew", desc: "Collect a Venom Sting from a Scorpion",     type: "collect",   name: "Venom Sting", target: 1, reward: { buff: { stat: "atk", amount: 3 }, label: "+3 attack" } },
  { id: "frost",  biome: "tundra", title: "Frozen Cache",   desc: "Defeat the Frost Wisp and the Snow Yeti",  type: "killnames", names: ["Frost Wisp", "Snow Yeti"], target: 2, reward: { potion: "Major Heal", n: 1 } },
];

// ---------- pixel sprites ----------
// Draw an emoji into a small low-res canvas; CSS scales it up with
// image-rendering: pixelated, giving a genuinely blocky/pixel-art look.
function drawSprite(canvas, emoji) {
  const ctx = canvas.getContext("2d");
  const s = canvas.width; // internal resolution (small on purpose)
  ctx.clearRect(0, 0, s, s);
  ctx.imageSmoothingEnabled = false;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = (s - 4) + "px serif";
  ctx.fillText(emoji, s / 2, s / 2 + 1);
}

// cache of small offscreen emoji canvases for the overworld renderer
const _spriteCache = {};
function getSprite(emoji) {
  if (!_spriteCache[emoji]) {
    const c = document.createElement("canvas");
    c.width = c.height = 24; // low-res on purpose
    drawSprite(c, emoji);
    _spriteCache[emoji] = c;
  }
  return _spriteCache[emoji];
}

// ---------- overworld ----------
// The world is much larger than the visible canvas; a camera follows
// the player so the canvas is a scrolling window into the map.
const WORLD_W = 1920, WORLD_H = 1200;   // full map size
const VIEW_W = 640, VIEW_H = 320;       // canvas (viewport) size
const SPEED = 2.8, SPRITE = 44, COLLIDE = 30, TILE = 32;
const keys = {};
let camX = 0, camY = 0;

const BIOME_COLS = 3, BIOME_ROWS = 2;

function buildWorld() {
  // lay out the 6 biomes in a 3x2 grid, shuffled each game
  const types = shuffle(Object.keys(BIOMES));
  const cw = WORLD_W / BIOME_COLS, ch = WORLD_H / BIOME_ROWS;
  G.biomeGrid = [];
  let idx = 0;
  for (let r = 0; r < BIOME_ROWS; r++)
    for (let c = 0; c < BIOME_COLS; c++)
      G.biomeGrid.push({ type: types[idx++], x: c * cw, y: r * ch, w: cw, h: ch });

  G.px = WORLD_W / 2; G.py = WORLD_H / 2; G.facing = 1;
  G._hintKey = null;

  // scatter biome-themed decorations in each cell
  G.decor = [];
  for (const cell of G.biomeGrid) {
    const kinds = BIOMES[cell.type].decor;
    for (let k = 0; k < 22; k++) {
      const x = cell.x + rand(24, cell.w - 24);
      const y = cell.y + rand(24, cell.h - 24);
      if (Math.hypot(x - G.px, y - G.py) < 90) continue; // keep spawn clear
      G.decor.push({ emoji: pick(kinds), x, y, size: rand(26, 40) });
    }
  }

  G.worldEnemies = [];
  ENEMIES.forEach((def, i) => {
    const cell = G.biomeGrid.find((b) => b.type === def.biome);
    let x, y, tries = 0;
    do {
      x = cell.x + rand(50, cell.w - 50);
      y = cell.y + rand(50, cell.h - 50);
      tries++;
    } while (Math.hypot(x - G.px, y - G.py) < 170 && tries < 60);
    G.worldEnemies.push({ def, tier: i, x, y });
  });
}

function spawnBoss(biome) {
  const def = BOSSES.find((b) => b.biome === biome);
  if (!def) return;
  const cell = G.biomeGrid.find((b) => b.type === biome);
  G.worldEnemies.push({ def, tier: 14, x: cell.x + cell.w / 2, y: cell.y + cell.h / 2 });
  G.bossSpawned[biome] = true;
  pushNotice(`⚠️ The ${def.name} has awoken in the ${BIOMES[biome].name}!`);
}

function currentBiome() {
  return G.biomeGrid.find((b) => G.px >= b.x && G.px < b.x + b.w && G.py >= b.y && G.py < b.y + b.h);
}

function updateHint() {
  if (G.bossMsg) { $("worldHint").innerHTML = G.bossMsg; return; }
  const b = currentBiome();
  const left = G.worldEnemies.length;
  const bosses = G.worldEnemies.filter((e) => e.def.boss).length;
  const bossTag = bosses ? ` &middot; 👑 ${bosses} boss${bosses > 1 ? "es" : ""}!` : "";
  $("worldHint").innerHTML = left
    ? `${b ? BIOMES[b.type].name : "?"} &middot; ${left} monster${left > 1 ? "s" : ""} left${bossTag} &middot; WASD to move`
    : "The land is at peace! 🏆";
}

function updateCamera() {
  camX = Math.max(0, Math.min(WORLD_W - VIEW_W, G.px - VIEW_W / 2));
  camY = Math.max(0, Math.min(WORLD_H - VIEW_H, G.py - VIEW_H / 2));
}

function drawWorld() {
  const cv = $("world");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  updateCamera();

  // draw each visible biome cell (background + its own grid)
  for (const b of G.biomeGrid) {
    const sx = b.x - camX, sy = b.y - camY;
    if (sx > VIEW_W || sy > VIEW_H || sx + b.w < 0 || sy + b.h < 0) continue;
    const def = BIOMES[b.type];
    ctx.fillStyle = def.bg;
    ctx.fillRect(sx, sy, b.w, b.h);
    // grid lines clipped to this cell
    ctx.save();
    ctx.beginPath(); ctx.rect(sx, sy, b.w, b.h); ctx.clip();
    ctx.strokeStyle = def.grid; ctx.lineWidth = 1;
    const gx0 = Math.floor(b.x / TILE) * TILE, gy0 = Math.floor(b.y / TILE) * TILE;
    for (let x = gx0; x <= b.x + b.w; x += TILE) { const px = x - camX; ctx.beginPath(); ctx.moveTo(px, sy); ctx.lineTo(px, sy + b.h); ctx.stroke(); }
    for (let y = gy0; y <= b.y + b.h; y += TILE) { const py = y - camY; ctx.beginPath(); ctx.moveTo(sx, py); ctx.lineTo(sx + b.w, py); ctx.stroke(); }
    ctx.restore();
    // biome boundary
    ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 3;
    ctx.strokeRect(sx, sy, b.w, b.h);
  }

  // world-edge border so the map limits are visible
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 4;
  ctx.strokeRect(-camX, -camY, WORLD_W, WORLD_H);

  // biome decorations (drawn under the actors)
  for (const d of G.decor) {
    const sx = d.x - camX, sy = d.y - camY;
    if (sx < -d.size || sx > VIEW_W + d.size || sy < -d.size || sy > VIEW_H + d.size) continue;
    ctx.drawImage(getSprite(d.emoji), sx - d.size / 2, sy - d.size / 2, d.size, d.size);
  }

  // enemies (only those on screen); bosses are larger with a pulsing aura
  const pulse = 1 + 0.12 * Math.sin(Date.now() / 250);
  for (const e of G.worldEnemies) {
    const sx = e.x - camX, sy = e.y - camY;
    const sz = e.def.boss ? SPRITE * 1.7 : SPRITE;
    if (sx < -sz || sx > VIEW_W + sz || sy < -sz || sy > VIEW_H + sz) continue;
    if (e.def.boss) {
      ctx.beginPath();
      ctx.arc(sx, sy, (sz / 2 + 6) * pulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,92,200,0.25)";
      ctx.fill();
      ctx.strokeStyle = "#ff5cc8"; ctx.lineWidth = 2; ctx.stroke();
      ctx.drawImage(getSprite("👑"), sx - 12, sy - sz / 2 - 20, 24, 24);
    }
    ctx.drawImage(getSprite(e.def.sprite), sx - sz / 2, sy - sz / 2, sz, sz);
  }

  // player (flip to face movement direction)
  const spr = getSprite("🧙");
  ctx.save();
  ctx.translate(G.px - camX, G.py - camY);
  ctx.scale(G.facing, 1);
  ctx.drawImage(spr, -SPRITE / 2, -SPRITE / 2, SPRITE, SPRITE);
  ctx.restore();

  drawMinimap();
}

function drawMinimap() {
  const cv = $("minimap");
  const ctx = cv.getContext("2d");
  const mw = cv.width, mh = cv.height;
  const sx = mw / WORLD_W, sy = mh / WORLD_H;
  ctx.clearRect(0, 0, mw, mh);
  // biome regions
  for (const b of G.biomeGrid) {
    ctx.fillStyle = BIOMES[b.type].mm;
    ctx.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);
  }
  // enemies (bosses shown as larger gold markers)
  for (const e of G.worldEnemies) {
    if (e.def.boss) {
      ctx.fillStyle = "#ffd35c";
      ctx.fillRect(e.x * sx - 3, e.y * sy - 3, 6, 6);
    } else {
      ctx.fillStyle = "#ff5c6a";
      ctx.fillRect(e.x * sx - 1.5, e.y * sy - 1.5, 3, 3);
    }
  }
  // camera viewport rectangle
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1;
  ctx.strokeRect(camX * sx, camY * sy, VIEW_W * sx, VIEW_H * sy);
  // player
  ctx.fillStyle = "#ffd35c";
  ctx.fillRect(G.px * sx - 2, G.py * sy - 2, 4, 4);
}

function worldStep() {
  if (G.mode === "explore") {
    let dx = 0, dy = 0;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;
    if (G.bossMsg && (dx || dy)) { G.bossMsg = ""; G._hintKey = null; }
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      G.px = Math.max(SPRITE / 2, Math.min(WORLD_W - SPRITE / 2, G.px + (dx / len) * SPEED));
      G.py = Math.max(SPRITE / 2, Math.min(WORLD_H - SPRITE / 2, G.py + (dy / len) * SPEED));
      if (dx) G.facing = dx < 0 ? -1 : 1;
      // collision with a monster?
      for (const e of G.worldEnemies) {
        const r = e.def.boss ? COLLIDE + 20 : COLLIDE;
        if (Math.hypot(e.x - G.px, e.y - G.py) < r) { enterBattle(e); break; }
      }
      // refresh hint only when biome / count changes
      const b = currentBiome();
      const key = (b ? b.type : "") + "|" + G.worldEnemies.length;
      if (key !== G._hintKey) { G._hintKey = key; updateHint(); }
    }
    drawWorld();
  }
  requestAnimationFrame(worldStep);
}

function startExplore() {
  G.mode = "explore";
  $("battle").classList.remove("show");
  $("explore").classList.remove("hidden");
  G._hintKey = null;
  updateHint();
  renderQuestObjective();
  drawWorld();
}

// ---------- UI update ----------
function updateBars() {
  const pPct = Math.max(0, (G.pHp / G.pMaxHp) * 100);
  const ePct = Math.max(0, (G.eHp / G.eMaxHp) * 100);
  $("pHp").style.width = pPct + "%";
  $("eHp").style.width = ePct + "%";
  $("pHp").classList.toggle("low", pPct < 30);
  $("eHp").classList.toggle("low", ePct < 30);
  $("pHpText").textContent = `${Math.max(0, Math.ceil(G.pHp))}/${G.pMaxHp}`;
  $("eHpText").textContent = `${Math.max(0, Math.ceil(G.eHp))}/${G.eMaxHp}`;
  $("uiLevel").textContent = G.level;
  $("uiKills").textContent = G.kills;
  $("uiBest").textContent = G.bestStreak;
  $("qStreak").textContent = `🔥 Streak: ${G.streak}`;
}

function floater(target, txt, color) {
  const el = document.createElement("div");
  el.className = "floater";
  el.textContent = txt;
  el.style.color = color;
  const host = $(target === "enemy" ? "enemy" : "player");
  el.style.left = "50%";
  el.style.top = "10px";
  el.style.transform = "translateX(-50%)";
  host.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// Start a battle against a specific overworld enemy entry.
function enterBattle(entry) {
  G.mode = "battle";
  G.activeEntry = entry;
  G.enemyTier = entry.tier;
  const e = entry.def;
  G.eMaxHp = e.hp;
  G.eHp = e.hp;
  G.enemyWeak = e.weak;
  $("eName").textContent = e.name;
  drawSprite($("eSprite"), e.sprite);
  document.querySelectorAll(".weaktag").forEach((t) => {
    t.textContent = t.dataset.w === e.weak ? WEAK_LABEL[e.weak] : "";
  });
  $("explore").classList.add("hidden");
  $("battle").classList.add("show");
  updateBars();
  beginTurn();
}

function setLog(msg) { $("log").textContent = msg; }

// ---------- inventory / drops ----------
function awardDrop(drop) {
  if (!drop) return;
  const it = G.inventory[drop.name] || { ico: drop.ico, count: 0 };
  it.count++;
  G.inventory[drop.name] = it;
  renderInventory();
  questOnCollect(drop.name);
}

function renderInventory() {
  const bag = $("inventory");
  const names = Object.keys(G.inventory).filter((n) => G.inventory[n].count > 0);
  if (names.length === 0) {
    bag.innerHTML = '<span class="bagempty">Bag: (defeat monsters for drops)</span>';
    return;
  }
  bag.innerHTML = names.map((n) => {
    const it = G.inventory[n];
    return `<span class="item" title="${n}"><span class="ii">${it.ico}</span>` +
           `<span class="inm">${n}</span><span class="ic">×${it.count}</span></span>`;
  }).join("");
}

function haveCount(name) { return (G.inventory[name] && G.inventory[name].count) || 0; }
function addItem(name, ico, n = 1) {
  const it = G.inventory[name] || { ico, count: 0 };
  it.count += n; it.ico = ico;
  G.inventory[name] = it;
}

// ---------- crafting ----------
function canAfford(recipe) {
  return Object.keys(recipe.cost).every((k) => haveCount(k) >= recipe.cost[k]);
}

function renderRecipes() {
  const list = $("recipeList");
  list.innerHTML = RECIPES.map((r, i) => {
    const afford = canAfford(r);
    const cost = Object.keys(r.cost).map((k) => {
      const need = r.cost[k], have = haveCount(k);
      const cls = have >= need ? "ok" : "no";
      const ico = (G.inventory[k] && G.inventory[k].ico) || DROP_ICO[k] || "";
      return `<span class="${cls}">${ico} ${k} ${have}/${need}</span>`;
    }).join(" &middot; ");
    return `<div class="recipe">` +
      `<span class="rico">${r.ico}</span>` +
      `<span class="rmid"><div class="rnm">${r.name}</div>` +
      `<div class="rdesc">${r.desc}</div><div class="rcost">${cost}</div></span>` +
      `<button class="cbtn" data-i="${i}" ${afford ? "" : "disabled"}>Craft</button>` +
      `</div>`;
  }).join("");
  list.querySelectorAll(".cbtn").forEach((b) => {
    b.onclick = () => craft(+b.dataset.i);
  });
}

function craft(i) {
  const r = RECIPES[i];
  if (!canAfford(r)) return;
  for (const k of Object.keys(r.cost)) G.inventory[k].count -= r.cost[k];
  let msg;
  if (r.result.kind === "potion") {
    addItem(r.name, r.ico);
    msg = `Brewed ${r.ico} ${r.name}! Use it during battle.`;
  } else {
    const b = r.result;
    if (b.stat === "atk") { G.atkBonus += b.amount; msg = `Attack up! (+${b.amount})`; }
    else if (b.stat === "maxhp") { G.pMaxHp += b.amount; G.pHp = G.pMaxHp; msg = `Max HP up! (+${b.amount}) and fully healed.`; }
    else if (b.stat === "crit") { G.critBonus += b.amount; msg = `Crit damage up! (+${b.amount})`; }
    updateBars();
  }
  $("craftMsg").textContent = msg;
  renderInventory();
  renderRecipes();
}

// ---------- potions in battle ----------
function renderPotions() {
  const bar = $("potionbar");
  const usable = Object.keys(POTION_HEAL).filter((n) => haveCount(n) > 0);
  if (G.mode !== "battle" || usable.length === 0) { bar.innerHTML = ""; return; }
  bar.innerHTML = usable.map((n) =>
    `<button class="potionbtn" data-p="${n}">${G.inventory[n].ico} ${n} (+${POTION_HEAL[n]}) ×${haveCount(n)}</button>`
  ).join("");
  bar.querySelectorAll(".potionbtn").forEach((b) => { b.onclick = () => usePotion(b.dataset.p); });
}

function usePotion(name) {
  if (G.locked || haveCount(name) <= 0) return;
  if (G.pHp >= G.pMaxHp) { setLog("HP already full!"); return; }
  G.inventory[name].count--;
  const heal = POTION_HEAL[name];
  G.pHp = Math.min(G.pMaxHp, G.pHp + heal);
  floater("player", "+" + heal, "#46e39b");
  setLog(`Drank ${name}: +${heal} HP.`);
  updateBars();
  renderInventory();
  renderPotions();
}

// ---------- quest tracking ----------
function resetQuests() {
  G.mainStage = 0; G.mainProg = 0;
  G.sideState = {};
  SIDE_QUESTS.forEach((q) => { G.sideState[q.id] = { prog: 0, done: false }; });
}

function grantReward(reward) {
  if (!reward) return "";
  if (reward.potion) { addItem(reward.potion, itemIco(reward.potion), reward.n || 1); renderInventory(); return `${itemIco(reward.potion)} ${reward.potion} ×${reward.n || 1}`; }
  if (reward.item) { addItem(reward.item, itemIco(reward.item), reward.n || 1); renderInventory(); return `${itemIco(reward.item)} ${reward.item} ×${reward.n || 1}`; }
  if (reward.buff) {
    const b = reward.buff;
    if (b.stat === "atk") G.atkBonus += b.amount;
    else if (b.stat === "maxhp") { G.pMaxHp += b.amount; G.pHp = G.pMaxHp; }
    else if (b.stat === "crit") G.critBonus += b.amount;
    updateBars();
    return reward.label || "a buff";
  }
  return "";
}

function pushNotice(msg) { (G._noticeBuf = G._noticeBuf || []).push(msg); }
function completeQuest(title, reward) {
  const rt = grantReward(reward);
  pushNotice(`✅ ${title}${rt ? ` — got ${rt}` : ""}`);
}

function advanceMain(def) {
  if (G.mainStage >= MAIN_STAGES.length) return;
  const s = MAIN_STAGES[G.mainStage];
  let inc = 0;
  if (s.type === "kill") inc = 1;
  else if (s.type === "boss" && def.boss) inc = 1;
  else if (s.type === "killname" && def.name === s.name) inc = 1;
  if (!inc) return;
  G.mainProg += inc;
  if (G.mainProg >= s.target) {
    completeQuest("Main Quest complete!", s.reward);
    G.mainStage++; G.mainProg = 0;
    if (G.mainStage >= MAIN_STAGES.length) pushNotice("🌟 The Chaos Curse is broken!");
  }
}

function questOnKill(def) {
  advanceMain(def);
  for (const q of SIDE_QUESTS) {
    const st = G.sideState[q.id];
    if (st.done) continue;
    let hit = false;
    if (q.type === "killname" && def.name === q.name) hit = true;
    else if (q.type === "killnames" && q.names.includes(def.name)) hit = true;
    else if (q.type === "killbiome" && def.biome === q.biome && !def.boss) hit = true;
    if (hit && ++st.prog >= q.target) { st.done = true; completeQuest(q.title, q.reward); }
  }
}

function questOnCollect(name) {
  for (const q of SIDE_QUESTS) {
    const st = G.sideState[q.id];
    if (st.done || q.type !== "collect" || name !== q.name) continue;
    st.prog = haveCount(name);
    if (st.prog >= q.target) { st.done = true; completeQuest(q.title, q.reward); }
  }
}

function renderQuestObjective() {
  const el = $("questObjective");
  if (!el) return;
  if (G.mainStage >= MAIN_STAGES.length) { el.innerHTML = "📜 <b>Main Quest complete!</b> Clear any remaining foes."; return; }
  const s = MAIN_STAGES[G.mainStage];
  el.innerHTML = `📜 <b>Main:</b> ${s.desc} <span style="color:var(--gold)">(${G.mainProg}/${s.target})</span>`;
}

function renderQuests() {
  const box = $("questList");
  let html = '<div class="qsect">MAIN QUEST — Lift the Chaos Curse</div>';
  MAIN_STAGES.forEach((s, i) => {
    const done = i < G.mainStage;
    const cur = i === G.mainStage;
    const prog = done ? s.target : (cur ? G.mainProg : 0);
    const mark = done ? "✅" : (cur ? "➡️" : "🔒");
    html += `<div class="quest ${done ? "qdone" : ""}">${mark} ${s.desc} <span class="qp">(${prog}/${s.target})</span></div>`;
  });
  html += '<div class="qsect">SIDE QUESTS</div>';
  SIDE_QUESTS.forEach((q) => {
    const st = G.sideState[q.id];
    const mark = st.done ? "✅" : "▫️";
    html += `<div class="quest ${st.done ? "qdone" : ""}">${mark} <b>${q.title}</b> (${BIOMES[q.biome].name})<br>` +
      `<span class="qd">${q.desc}</span> <span class="qp">(${Math.min(st.prog, q.target)}/${q.target})</span></div>`;
  });
  box.innerHTML = html;
}

// ---------- turn flow ----------
// Phase 1: choose a spell (element). Choices hidden, spell bar shown.
function beginTurn() {
  G.locked = false;
  G.current = null;
  $("qText").innerHTML = "Choose a spell to attack! 💡 Match the enemy's weakness for bonus damage.";
  $("qChoices").innerHTML = "";
  $("explain").classList.remove("show");
  $("spellbar").style.display = "grid";
  document.querySelectorAll(".spell").forEach((b) => (b.disabled = false));
  renderPotions();
}

// Phase 2: a spell was chosen -> present its problem.
function castSpell(spell) {
  if (G.locked || G.current) return;
  G.spell = spell;
  document.querySelectorAll(".spell").forEach((b) => (b.disabled = true));
  $("spellbar").style.display = "none";
  $("potionbar").innerHTML = "";
  G.current = generateProblem(spell, G.level);
  const p = G.current;
  $("qBadge").className = "badge " + p.category;
  $("qBadge").textContent = `${SPELLS[spell].ico} ${p.badge}`;
  $("qText").innerHTML = p.text;

  const box = $("qChoices");
  box.innerHTML = "";
  p.choices.forEach((c) => {
    const b = document.createElement("button");
    b.className = "choice";
    b.textContent = c;
    b.onclick = () => answer(c, b);
    box.appendChild(b);
  });
  G.locked = false;
}

function damageEnemy() {
  const base = 8 + G.level * 2 + G.atkBonus;
  const bonus = G.streak * 3;
  const weakHit = G.spell === G.enemyWeak;
  let dmg = base + bonus + rand(0, 4);
  if (weakHit) dmg = Math.round(dmg * (1.6 + G.critBonus));
  G.eHp -= dmg;
  floater("enemy", (weakHit ? "CRIT -" : "-") + dmg, weakHit ? "#ff5cc8" : "#ffe9a8");
  G.lastWeakHit = weakHit;
  $("eSprite").classList.add("shake");
  $("pSprite").classList.add("cast");
  setTimeout(() => { $("eSprite").classList.remove("shake"); $("pSprite").classList.remove("cast"); }, 320);
  return dmg;
}

function damagePlayer() {
  const dmg = rand(11, 17) + G.enemyTier * 3;
  G.pHp -= dmg;
  floater("player", "-" + dmg, "#ff9aa4");
  $("pSprite").classList.add("shake");
  $("eSprite").classList.add("cast");
  setTimeout(() => { $("pSprite").classList.remove("shake"); $("eSprite").classList.remove("cast"); }, 320);
  return dmg;
}

function answer(choice, btn) {
  if (G.locked) return;
  G.locked = true;
  const correct = choice === G.current.answer;
  const buttons = [...document.querySelectorAll(".choice")];
  buttons.forEach((b) => (b.disabled = true));

  if (correct) {
    btn.classList.add("correct");
    G.streak++;
    G.bestStreak = Math.max(G.bestStreak, G.streak);
    const dmg = damageEnemy();
    setLog(G.lastWeakHit
      ? `💥 Super effective! ${SPELLS[G.spell].ico} hits the weakness for ${dmg}!`
      : `✨ Correct! Your ${SPELLS[G.spell].name} hits for ${dmg}.`);
    updateBars();
    G.pending = (G.eHp <= 0) ? onEnemyDefeated : beginTurn;
    showExplain(true);
  } else {
    btn.classList.add("wrong");
    buttons.forEach((b) => { if (b.textContent === G.current.answer) b.classList.add("correct"); });
    G.streak = 0;
    const dmg = damagePlayer();
    setLog(`💥 Wrong! The monster strikes back for ${dmg}.`);
    updateBars();
    G.pending = (G.pHp <= 0) ? () => gameOver(false) : beginTurn;
    showExplain(false);
  }
}

function showExplain(correct) {
  const el = $("explain");
  const head = correct
    ? `<b style="color:var(--good)">Correct — ${G.current.answer}</b><br>`
    : `<b style="color:var(--bad)">Answer: ${G.current.answer}</b><br>`;
  let reward = "";
  if (G.eHp <= 0 && G.activeEntry && G.activeEntry.def.drop) {
    const d = G.activeEntry.def.drop;
    reward = `<br><span class="reward">🎁 ${G.activeEntry.def.name} dropped ${d.ico} <b>${d.name}</b>!</span>`;
  }
  $("explainText").innerHTML = head + (G.current.explain || "") + reward;
  el.classList.add("show");
  const nb = $("nextBtn");
  nb.textContent = (G.eHp <= 0) ? "Continue ▶" : (G.pHp <= 0 ? "See Results ▶" : "Next ▶");
  nb.focus();
}

function onEnemyDefeated() {
  G.kills++;
  G.xp++;
  // reward: this monster's drop (also advances collect quests)
  G._noticeBuf = [];
  const slainDef = G.activeEntry.def;
  awardDrop(slainDef.drop);
  const slainBiome = slainDef.biome;
  const wasBoss = !!slainDef.boss;
  // remove the defeated enemy from the overworld
  G.worldEnemies = G.worldEnemies.filter((e) => e !== G.activeEntry);
  G.activeEntry = null;
  // quest progress for this kill
  questOnKill(slainDef);
  // if that was the last regular monster in its biome, summon the boss
  if (!wasBoss && !G.bossSpawned[slainBiome]) {
    const regularsLeft = G.worldEnemies.some((e) => e.def.biome === slainBiome && !e.def.boss);
    if (!regularsLeft) spawnBoss(slainBiome);
  }
  G.bossMsg = (G._noticeBuf && G._noticeBuf.length) ? G._noticeBuf.join("  •  ") : "";
  // level up?
  if (G.xp >= G.xpNeed) {
    G.xp = 0;
    G.xpNeed++;
    G.level++;
    G.pMaxHp += 15;
    G.pHp = G.pMaxHp; // full heal on level up
  } else {
    G.pHp = Math.min(G.pMaxHp, G.pHp + 12); // small heal each kill
  }
  updateBars();
  if (G.worldEnemies.length === 0) { gameOver(true); return; }
  // nudge the player off the enemy tile, then return to exploring
  G.px = WORLD_W / 2; G.py = WORLD_H / 2;
  startExplore();
}

function gameOver(won) {
  const ov = $("overlay");
  $("ovTitle").textContent = won ? "🏆 Victory!" : "💀 Defeated";
  const loot = Object.keys(G.inventory).filter((n) => G.inventory[n].count > 0);
  const lootStr = loot.length
    ? "<br><br>Loot collected:<br>" + loot.map((n) => `${G.inventory[n].ico} ${n} ×${G.inventory[n].count}`).join("  ·  ")
    : "";
  $("ovText").innerHTML =
    `You reached <b>Level ${G.level}</b>, defeated <b>${G.kills}</b> monsters,<br>` +
    `with a best streak of <b>${G.bestStreak}</b>.` + lootStr + `<br><br>` +
    (won ? "You cleared every biome!" : "The discrete depths claim another mage. Try again!");
  ov.classList.add("show");
}

function startGame() {
  Object.assign(G, {
    level: 1, kills: 0, xp: 0, xpNeed: 3,
    streak: 0, bestStreak: 0,
    pMaxHp: 100, pHp: 100,
    eMaxHp: 30, eHp: 30, enemyTier: 0,
    current: null, locked: false, spell: null, enemyWeak: "arcane", pending: null,
    // overworld
    mode: "explore", px: 320, py: 160, facing: 1,
    worldEnemies: [], activeEntry: null, biomeGrid: [], decor: [], _hintKey: null,
    _lastQText: null, inventory: {}, atkBonus: 0, critBonus: 0,
    bossSpawned: {}, bossMsg: "",
  });
  $("overlay").classList.remove("show");
  drawSprite($("pSprite"), "🧙");
  resetQuests();
  renderInventory();
  renderQuestObjective();
  buildWorld();
  updateBars();
  startExplore();
}

// wire spell buttons
document.querySelectorAll(".spell").forEach((b) => {
  b.addEventListener("click", () => castSpell(b.dataset.spell));
});

// Next button advances the turn when the player is ready
$("nextBtn").addEventListener("click", () => {
  const fn = G.pending;
  G.pending = null;
  $("explain").classList.remove("show");
  if (fn) fn();
});

// ---------- keyboard / overworld input ----------
const MOVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (MOVE_KEYS.includes(k)) { keys[k] = true; e.preventDefault(); }
});
window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (MOVE_KEYS.includes(k)) { keys[k] = false; }
});

// tutorial -> begin
$("tutBtn").onclick = () => { $("tutorial").classList.remove("show"); };

// crafting menu
$("craftBtn").onclick = () => {
  $("craftMsg").textContent = "Combine drops into potions & permanent buffs.";
  renderRecipes();
  $("craftOverlay").classList.add("show");
};
$("craftClose").onclick = () => { $("craftOverlay").classList.remove("show"); };

// quest log
$("questBtn").onclick = () => { renderQuests(); $("questOverlay").classList.add("show"); };
$("questClose").onclick = () => { $("questOverlay").classList.remove("show"); };

$("ovBtn").onclick = () => { startGame(); };

startGame();
requestAnimationFrame(worldStep);
