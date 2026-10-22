// A tiny, safe interpreter for the C++-flavored command language.
//
// We do NOT use eval(). Instead we tokenize the code into a list of
// "actions" the game engine executes step by step, so we can animate
// each move and detect crashes. Supported syntax:
//
//   moveForward();
//   turnLeft();  turnRight();
//   jump();                        // leap over one wall tile ahead
//   for (int i = 0; i < N; i++) { ... }
//   while (pathClear()) { ... }   // capped to avoid infinite loops
//   if (pathClear()) { ... }
//   void name() { ... }            // define a function
//   name();                        // call a function you defined
//   // line comments
//
// Returns { actions: [...], error: string|null }.
// Each action is one of: "move", "left", "right", "jump".

const MAX_LOOP = 200; // safety cap so while-loops can't hang the page

export function compile(code, world) {
  // Strip comments, normalize whitespace into a token stream.
  const cleaned = code
    .replace(/\/\/[^\n]*/g, " ")     // line comments
    .replace(/\/\*[\s\S]*?\*\//g, " "); // block comments

  let pos = 0;
  const src = cleaned;

  // We simulate a virtual player to evaluate pathClear() during compile,
  // because loops/conditions depend on Steve's live position.
  const sim = {
    x: world.start.x,
    y: world.start.y,
    facing: world.facing,
  };
  const actions = [];
  let stepBudget = 5000; // total simulated steps guard
  const functions = {};  // name -> { start, end } body source positions
  let callDepth = 0;     // guard against runaway recursion

  const DIRS = {
    up:    { dx: 0, dy: -1 },
    down:  { dx: 0, dy: 1 },
    left:  { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
  };
  const RIGHT_OF = { up: "right", right: "down", down: "left", left: "up" };
  const LEFT_OF  = { up: "left", left: "down", down: "right", right: "up" };

  function isWall(x, y) {
    if (x < 0 || y < 0 || x >= world.cols || y >= world.rows) return true;
    return world.walls.some((w) => w.x === x && w.y === y);
  }
  function pathClear() {
    const d = DIRS[sim.facing];
    return !isWall(sim.x + d.dx, sim.y + d.dy);
  }
  function doMove() {
    const d = DIRS[sim.facing];
    sim.x += d.dx;
    sim.y += d.dy;
    actions.push("move");
  }
  function doJump() {
    // Leap two tiles: over the tile directly ahead, landing on the next.
    const d = DIRS[sim.facing];
    sim.x += d.dx * 2;
    sim.y += d.dy * 2;
    actions.push("jump");
  }

  // --- token helpers ---
  function skipWs() { while (pos < src.length && /\s/.test(src[pos])) pos++; }
  function peek() { skipWs(); return src.slice(pos); }
  function match(str) {
    skipWs();
    if (src.startsWith(str, pos)) { pos += str.length; return true; }
    return false;
  }
  function error(msg) { throw new Error(msg); }

  // Parse a { ... } block or a single statement, executing as we go.
  function parseBlock() {
    skipWs();
    if (match("{")) {
      while (true) {
        skipWs();
        if (match("}")) return;
        if (pos >= src.length) error("Missing closing } — check your braces.");
        parseStatement();
      }
    } else {
      parseStatement();
    }
  }

  function parseStatement() {
    if (stepBudget-- <= 0) error("Program too long or stuck in a loop.");
    skipWs();
    if (pos >= src.length) return;

    if (match("moveForward")) {
      requireCallEnd("moveForward");
      doMove();
      return;
    }
    if (match("jump")) {
      requireCallEnd("jump");
      doJump();
      return;
    }
    if (match("void")) { defineFunction(); return; }
    if (match("turnLeft")) {
      requireCallEnd("turnLeft");
      sim.facing = LEFT_OF[sim.facing];
      actions.push("left");
      return;
    }
    if (match("turnRight")) {
      requireCallEnd("turnRight");
      sim.facing = RIGHT_OF[sim.facing];
      actions.push("right");
      return;
    }
    if (match("for")) { parseFor(); return; }
    if (match("while")) { parseWhile(); return; }
    if (match("if")) { parseIf(); return; }

    // A call to a user-defined function, e.g. goHome();
    const save = pos;
    const name = tryReadIdent();
    if (name && functions[name] !== undefined) {
      if (!match("(")) error(`${name} needs parentheses: ${name}()`);
      if (!match(")")) error(`${name} needs a closing parenthesis: ${name}()`);
      if (!match(";")) error(`Add a semicolon: ${name}();`);
      callFunction(name);
      return;
    }
    pos = save;

    // Unknown token — grab a snippet for a helpful message.
    const snippet = peek().slice(0, 20).trim();
    error(`I don't understand: "${snippet}...". Check spelling and semicolons.`);
  }

  function defineFunction() {
    // void name() { ... }
    const name = readIdent();
    if (!match("(")) error(`Function ${name} needs (): void ${name}() { }`);
    if (!match(")")) error(`Function ${name} needs a closing ): void ${name}() { }`);
    skipWs();
    if (src[pos] !== "{") error(`Function ${name} needs a { } body.`);
    const bodyStart = pos;
    skipBlock(); // advances pos past the whole { ... } block
    functions[name] = { start: bodyStart, end: pos };
  }

  function callFunction(name) {
    if (callDepth++ > 50) error("Too many nested function calls.");
    const fn = functions[name];
    const savedPos = pos;
    pos = fn.start;
    parseBlock();          // execute the function body
    pos = savedPos;        // return to caller
    callDepth--;
  }

  function tryReadIdent() {
    skipWs();
    const m = /^[A-Za-z_]\w*/.exec(src.slice(pos));
    if (!m) return null;
    pos += m[0].length;
    return m[0];
  }

  function requireCallEnd(name) {
    if (!match("(")) error(`${name} needs parentheses: ${name}()`);
    if (!match(")")) error(`${name} needs a closing parenthesis: ${name}()`);
    if (!match(";")) error(`Add a semicolon: ${name}();`);
  }

  function parseFor() {
    // for (int i = 0; i < N; i++) { ... }
    if (!match("(")) error("for needs parentheses: for (...) { }");
    // int i = start
    match("int");
    const varName = readIdent();
    if (!match("=")) error("for loop: expected '=' in initializer.");
    const startVal = readNumber();
    if (!match(";")) error("for loop: expected ';' after initializer.");
    // i < limit  (also allow <=)
    readIdent(); // loop var again
    let inclusive = false;
    if (match("<=")) inclusive = true;
    else if (!match("<")) error("for loop: expected '<' comparison.");
    const limit = readNumber();
    if (!match(";")) error("for loop: expected ';' after condition.");
    // i++ (consume the rest until ')')
    while (pos < src.length && src[pos] !== ")") pos++;
    if (!match(")")) error("for loop: missing ')'.");

    const iterations = inclusive ? (limit - startVal + 1) : (limit - startVal);
    // Record the body position, run it `iterations` times.
    const bodyStart = pos;
    if (iterations <= 0) { skipBlock(); return; }
    if (iterations > MAX_LOOP) error("for loop runs too many times.");
    for (let k = 0; k < iterations; k++) {
      pos = bodyStart;
      parseBlock();
    }
  }

  function parseWhile() {
    // while (pathClear()) { ... }
    if (!match("(")) error("while needs parentheses: while (pathClear()) { }");
    const cond = readCondition();
    if (!match(")")) error("while: missing ')'.");
    const bodyStart = pos;
    let count = 0;
    while (evalCondition(cond)) {
      if (count++ > MAX_LOOP) error("while loop never stops — is the condition always true?");
      pos = bodyStart;
      parseBlock();
    }
    // Skip the body once more to move past it in the source.
    pos = bodyStart;
    skipBlock();
  }

  function parseIf() {
    if (!match("(")) error("if needs parentheses: if (pathClear()) { }");
    const cond = readCondition();
    if (!match(")")) error("if: missing ')'.");
    const bodyStart = pos;
    if (evalCondition(cond)) {
      parseBlock();
    } else {
      skipBlock();
    }
  }

  function readCondition() {
    skipWs();
    if (match("pathClear")) {
      match("("); match(")");
      return { type: "pathClear" };
    }
    if (match("true")) return { type: "true" };
    if (match("false")) return { type: "false" };
    error("Unknown condition. Try pathClear().");
  }
  function evalCondition(cond) {
    if (cond.type === "pathClear") return pathClear();
    if (cond.type === "true") return true;
    if (cond.type === "false") return false;
    return false;
  }

  // Move `pos` past the next { ... } block (or single statement) WITHOUT executing.
  function skipBlock() {
    skipWs();
    if (src[pos] === "{") {
      let depth = 0;
      do {
        if (src[pos] === "{") depth++;
        else if (src[pos] === "}") depth--;
        pos++;
      } while (pos < src.length && depth > 0);
    } else {
      while (pos < src.length && src[pos] !== ";") pos++;
      if (src[pos] === ";") pos++;
    }
  }

  function readIdent() {
    skipWs();
    const m = /^[A-Za-z_]\w*/.exec(src.slice(pos));
    if (!m) error("Expected a name (like i).");
    pos += m[0].length;
    return m[0];
  }
  function readNumber() {
    skipWs();
    const m = /^-?\d+/.exec(src.slice(pos));
    if (!m) error("Expected a number. Did you leave a blank ___ ?");
    pos += m[0].length;
    return parseInt(m[0], 10);
  }

  // --- run it ---
  try {
    while (true) {
      skipWs();
      if (pos >= src.length) break;
      parseStatement();
    }
  } catch (e) {
    return { actions, error: e.message };
  }
  return { actions, error: null };
}
