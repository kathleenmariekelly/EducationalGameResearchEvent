// scenarios.js
//
// Content pool for TokenSmith. Every round is the SAME core task — order a
// set of token rules by priority so a raw string tokenizes into the target
// stream — with variation that forces the "order matters" lesson to recur:
//   - keyword must beat identifier            (KW_IF, KW_LET, KW_PRINT)
//   - longer operator must beat its prefix    (<= before <, == before =)
//   - longer number must beat its prefix      (float before int)
//   - a greedy literal must beat its opener   (string before a lone quote,
//                                              header before a lone '<')
//   - the lesson holds across MULTIPLE statements and in real language
//     features (string literals, C preprocessor includes)
//
// A rule = { id, label, color, pattern, skip? }
//   pattern : a RegExp source string, applied with the sticky ("y") flag
//             at the current scan position.
//   skip    : if true the rule consumes input but emits no token (whitespace).
//
// `initialOrder` is deliberately WRONG so the player has to notice the broken
// output and fix the priority. `target` is what a correct ordering produces.

const C = {
  keyword: 0xef7d57,
  ident: 0x41a6f6,
  op: 0xffcd75,
  num: 0xa7f070,
  string: 0x38b764,
  header: 0x73eff7,
  comment: 0x94a06a,
  path: 0xb13e53,
  method: 0xef7d57,
  status: 0xa7f070,
  punct: 0xc0cbdc,
  note: 0x41a6f6,
  sharp: 0xef7d57,
  ws: 0x8b8fb5,
};

export const SCENARIOS = [
  {
    input: "if x",
    hint: "A keyword is just a specific identifier. Which rule must win?",
    rules: [
      { id: "kw_if", label: "KW_IF", color: C.keyword, pattern: "if" },
      { id: "ident", label: "IDENT", color: C.ident, pattern: "[A-Za-z_]\\w*" },
      { id: "ws", label: "WS", color: C.ws, pattern: "\\s+", skip: true },
    ],
    initialOrder: ["ident", "kw_if", "ws"],
    target: [
      { type: "KW_IF", value: "if" },
      { type: "IDENT", value: "x" },
    ],
  },
  {
    input: "x <= 10",
    hint: "One rule matches a prefix of another. Longer match should win.",
    rules: [
      { id: "le", label: "LE", color: C.op, pattern: "<=" },
      { id: "lt", label: "LT", color: C.op, pattern: "<" },
      { id: "ident", label: "IDENT", color: C.ident, pattern: "[A-Za-z_]\\w*" },
      { id: "num", label: "NUM", color: C.num, pattern: "[0-9]+" },
      { id: "ws", label: "WS", color: C.ws, pattern: "\\s+", skip: true },
    ],
    initialOrder: ["ident", "num", "lt", "le", "ws"],
    target: [
      { type: "IDENT", value: "x" },
      { type: "LE", value: "<=" },
      { type: "NUM", value: "10" },
    ],
  },
  {
    input: "a == b != c",
    hint: "Two two-char operators share a prefix with two one-char ones.",
    rules: [
      { id: "eqeq", label: "EQ", color: C.op, pattern: "==" },
      { id: "neq", label: "NEQ", color: C.op, pattern: "!=" },
      { id: "assign", label: "ASSIGN", color: C.op, pattern: "=" },
      { id: "not", label: "NOT", color: C.op, pattern: "!" },
      { id: "ident", label: "IDENT", color: C.ident, pattern: "[A-Za-z_]\\w*" },
      { id: "ws", label: "WS", color: C.ws, pattern: "\\s+", skip: true },
    ],
    initialOrder: ["ident", "assign", "not", "eqeq", "neq", "ws"],
    target: [
      { type: "IDENT", value: "a" },
      { type: "EQ", value: "==" },
      { type: "IDENT", value: "b" },
      { type: "NEQ", value: "!=" },
      { type: "IDENT", value: "c" },
    ],
  },
  {
    input: "if iffy",
    hint: "An identifier can START with a keyword. Note the \\b (word boundary) in the keyword.",
    rules: [
      { id: "kw_if", label: "KW_IF", color: C.keyword, pattern: "if\\b" },
      { id: "ident", label: "IDENT", color: C.ident, pattern: "[A-Za-z_]\\w*" },
      { id: "ws", label: "WS", color: C.ws, pattern: "\\s+", skip: true },
    ],
    initialOrder: ["ident", "kw_if", "ws"],
    target: [
      { type: "KW_IF", value: "if" },
      { type: "IDENT", value: "iffy" },
    ],
  },
  {
    input: "let n = 3.14",
    hint: "A float is an int followed by more. Which number rule goes first?",
    rules: [
      { id: "kw_let", label: "KW_LET", color: C.keyword, pattern: "let" },
      { id: "float", label: "FLOAT", color: C.num, pattern: "[0-9]+\\.[0-9]+" },
      { id: "int", label: "INT", color: C.num, pattern: "[0-9]+" },
      { id: "assign", label: "ASSIGN", color: C.op, pattern: "=" },
      { id: "ident", label: "IDENT", color: C.ident, pattern: "[A-Za-z_]\\w*" },
      { id: "ws", label: "WS", color: C.ws, pattern: "\\s+", skip: true },
    ],
    initialOrder: ["ident", "int", "float", "assign", "kw_let", "ws"],
    target: [
      { type: "KW_LET", value: "let" },
      { type: "IDENT", value: "n" },
      { type: "ASSIGN", value: "=" },
      { type: "FLOAT", value: "3.14" },
    ],
  },
  {
    input: "a += b * c *= 2",
    hint: "Compound assignments '+=' and '*=' each share a prefix with a plain operator.",
    rules: [
      { id: "pluseq", label: "PLUSEQ", color: C.op, pattern: "\\+=" },
      { id: "stareq", label: "STAREQ", color: C.op, pattern: "\\*=" },
      { id: "plus", label: "PLUS", color: C.op, pattern: "\\+" },
      { id: "star", label: "STAR", color: C.op, pattern: "\\*" },
      { id: "ident", label: "IDENT", color: C.ident, pattern: "[A-Za-z_]\\w*" },
      { id: "num", label: "NUM", color: C.num, pattern: "[0-9]+" },
      { id: "ws", label: "WS", color: C.ws, pattern: "\\s+", skip: true },
    ],
    initialOrder: ["ident", "num", "plus", "star", "pluseq", "stareq", "ws"],
    target: [
      { type: "IDENT", value: "a" },
      { type: "PLUSEQ", value: "+=" },
      { type: "IDENT", value: "b" },
      { type: "STAR", value: "*" },
      { type: "IDENT", value: "c" },
      { type: "STAREQ", value: "*=" },
      { type: "NUM", value: "2" },
    ],
  },
  {
    input: 'print "hi"',
    hint: "A string is a greedy literal. If a lone-quote rule wins first, it splits open.",
    rules: [
      { id: "kw_print", label: "KW_PRINT", color: C.keyword, pattern: "print" },
      { id: "str", label: "STRING", color: C.string, pattern: '"[^"]*"' },
      { id: "dquote", label: "DQUOTE", color: C.punct, pattern: '"' },
      { id: "ident", label: "IDENT", color: C.ident, pattern: "[A-Za-z_]\\w*" },
      { id: "ws", label: "WS", color: C.ws, pattern: "\\s+", skip: true },
    ],
    initialOrder: ["ident", "dquote", "str", "kw_print", "ws"],
    target: [
      { type: "KW_PRINT", value: "print" },
      { type: "STRING", value: '"hi"' },
    ],
  },
  {
    input: "#include <stdio.h>",
    hint: "A C include. The header <...> is one token — don't let '<' win alone.",
    rules: [
      { id: "pp", label: "PP_INCLUDE", color: C.keyword, pattern: "#include" },
      { id: "header", label: "HEADER", color: C.header, pattern: "<[\\w.]+>" },
      { id: "lt", label: "LT", color: C.op, pattern: "<" },
      { id: "gt", label: "GT", color: C.op, pattern: ">" },
      { id: "dot", label: "DOT", color: C.punct, pattern: "\\." },
      { id: "ident", label: "IDENT", color: C.ident, pattern: "[A-Za-z_]\\w*" },
      { id: "ws", label: "WS", color: C.ws, pattern: "\\s+", skip: true },
    ],
    initialOrder: ["ident", "lt", "gt", "dot", "header", "pp", "ws"],
    target: [
      { type: "PP_INCLUDE", value: "#include" },
      { type: "HEADER", value: "<stdio.h>" },
    ],
  },
  {
    input: "x = 1 // set x",
    hint: "An inline comment '//' runs to end of line \u2014 don't let the divide '/' win first.",
    rules: [
      { id: "comment", label: "COMMENT", color: C.comment, pattern: "//.*" },
      { id: "div", label: "DIV", color: C.op, pattern: "/" },
      { id: "ident", label: "IDENT", color: C.ident, pattern: "[A-Za-z_]\\w*" },
      { id: "num", label: "NUM", color: C.num, pattern: "[0-9]+" },
      { id: "assign", label: "ASSIGN", color: C.op, pattern: "=" },
      { id: "ws", label: "WS", color: C.ws, pattern: "\\s+", skip: true },
    ],
    initialOrder: ["ident", "num", "assign", "div", "comment", "ws"],
    target: [
      { type: "IDENT", value: "x" },
      { type: "ASSIGN", value: "=" },
      { type: "NUM", value: "1" },
      { type: "COMMENT", value: "// set x" },
    ],
  },
  {
    input: "let x = 1; let y = 2",
    hint: "Two statements. The same ordering rule has to hold every time.",
    rules: [
      { id: "kw_let", label: "KW_LET", color: C.keyword, pattern: "let" },
      { id: "ident", label: "IDENT", color: C.ident, pattern: "[A-Za-z_]\\w*" },
      { id: "num", label: "NUM", color: C.num, pattern: "[0-9]+" },
      { id: "assign", label: "ASSIGN", color: C.op, pattern: "=" },
      { id: "semi", label: "SEMI", color: C.punct, pattern: ";" },
      { id: "ws", label: "WS", color: C.ws, pattern: "\\s+", skip: true },
    ],
    initialOrder: ["ident", "num", "assign", "semi", "kw_let", "ws"],
    target: [
      { type: "KW_LET", value: "let" },
      { type: "IDENT", value: "x" },
      { type: "ASSIGN", value: "=" },
      { type: "NUM", value: "1" },
      { type: "SEMI", value: ";" },
      { type: "KW_LET", value: "let" },
      { type: "IDENT", value: "y" },
      { type: "ASSIGN", value: "=" },
      { type: "NUM", value: "2" },
    ],
  },
  {
    input: "sum+=1",
    hint: "No spaces to hide behind. '+=' shares its prefix with '+'.",
    rules: [
      { id: "pluseq", label: "PLUSEQ", color: C.op, pattern: "\\+=" },
      { id: "plus", label: "PLUS", color: C.op, pattern: "\\+" },
      { id: "assign", label: "ASSIGN", color: C.op, pattern: "=" },
      { id: "ident", label: "IDENT", color: C.ident, pattern: "[A-Za-z_]\\w*" },
      { id: "num", label: "NUM", color: C.num, pattern: "[0-9]+" },
    ],
    initialOrder: ["ident", "num", "plus", "assign", "pluseq"],
    target: [
      { type: "IDENT", value: "sum" },
      { type: "PLUSEQ", value: "+=" },
      { type: "NUM", value: "1" },
    ],
  },
  {
    input: "C#DF#G#",
    hint: "A music DSL: a sharp note like 'C#' is ONE token. A bare note is the prefix.",
    rules: [
      { id: "sharp", label: "SHARP", color: C.sharp, pattern: "[A-G]#" },
      { id: "note", label: "NOTE", color: C.note, pattern: "[A-G]" },
    ],
    initialOrder: ["note", "sharp"],
    target: [
      { type: "SHARP", value: "C#" },
      { type: "NOTE", value: "D" },
      { type: "SHARP", value: "F#" },
      { type: "SHARP", value: "G#" },
    ],
  },
  {
    input: "ABBABABABABAA",
    hint: "No spaces, no keywords \u2014 just symbols. Group the pair 'AB' greedily before singles.",
    rules: [
      { id: "ab", label: "AB", color: C.op, pattern: "AB" },
      { id: "a", label: "A", color: C.ident, pattern: "A" },
      { id: "b", label: "B", color: C.num, pattern: "B" },
    ],
    initialOrder: ["a", "b", "ab"],
    target: [
      { type: "AB", value: "AB" },
      { type: "B", value: "B" },
      { type: "AB", value: "AB" },
      { type: "AB", value: "AB" },
      { type: "AB", value: "AB" },
      { type: "AB", value: "AB" },
      { type: "A", value: "A" },
      { type: "A", value: "A" },
    ],
  },
];
