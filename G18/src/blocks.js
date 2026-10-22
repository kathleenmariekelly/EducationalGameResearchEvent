// blocks.js
//
// The primitive block set. Deliberately small: no block does a whole
// algorithm on its own. The player designs the algorithm by how they
// NEST these — and, for compare/swap, by choosing the operands. That
// arrangement + configuration IS the algorithm, which is the point.
//
// kind: "container" -> holds child blocks (loops, if)
//       "action"    -> a leaf (swap)
// provides: loop variable this block puts in scope for its children
// config:   default per-instance settings (operands / operator)

export const INDEX_OPTS = ["i", "i+1", "j", "j+1"];
export const OP_OPTS = [">", "<"];

export const BLOCK_DEFS = {
  loop_i: {
    label: "for each i : 0 → n-1",
    kind: "container",
    provides: "i",
    color: "#3b82f6",
  },
  loop_j_after_i: {
    label: "for each j : i+1 → n-1",
    kind: "container",
    provides: "j",
    color: "#6366f1",
  },
  loop_j_full: {
    label: "for each j : 0 → n-2",
    kind: "container",
    provides: "j",
    color: "#8b5cf6",
  },
  repeat_until_stable: {
    label: "repeat passes until no swaps",
    kind: "container",
    color: "#0ea5e9",
  },
  if_cmp: {
    label: "if  a[ ]  a[ ]",
    kind: "container",
    configurable: "compare",
    defaultConfig: { left: "i", op: ">", right: "j" },
    color: "#f59e0b",
  },
  swap: {
    label: "swap  a[ ] , a[ ]",
    kind: "action",
    configurable: "swap",
    defaultConfig: { a: "i", b: "j" },
    color: "#ef4444",
  },
};

export const PALETTE_ORDER = [
  "loop_i",
  "loop_j_after_i",
  "loop_j_full",
  "repeat_until_stable",
  "if_cmp",
  "swap",
];

// ---- Execution engine -------------------------------------------------

const OP_LIMIT = 500000; // hard guard against infinite constructions

// Resolve an index expression ("i", "j+1", ...) against the loop scope.
function resolveIdx(expr, env, arrLen, forWhat) {
  const base = expr.replace("+1", "");
  if (env[base] === undefined) {
    throw new Error(
      `${forWhat} uses a[${expr}], but the ${base} loop isn't around it. Nest it inside a ${base}-loop first.`
    );
  }
  let v = env[base];
  if (expr.endsWith("+1")) v += 1;
  if (v < 0 || v >= arrLen) {
    throw new Error(
      `a[${expr}] pointed past the end of the list. Check your loop range (e.g. use "j : 0 → n-2" when you read a[j+1]).`
    );
  }
  return v;
}

export function runProgram(program, inputData) {
  const arr = inputData.slice();
  const state = {
    arr,
    comparisons: 0,
    swaps: 0,
    ops: 0,
    trace: [],
    swappedInPass: false,
  };

  function tick() {
    state.ops++;
    if (state.ops > OP_LIMIT) {
      throw new Error(
        "This construction ran way too long — it looks like it never finishes. Check that 'repeat until no swaps' can actually reach a no-swap pass."
      );
    }
  }

  function record(kind, a, b) {
    state.trace.push({ kind, a, b, arr: arr.slice() });
  }

  function exec(nodes, env) {
    for (const node of nodes) {
      switch (node.type) {
        case "loop_i":
          for (let i = 0; i < arr.length; i++) {
            tick();
            exec(node.children, { ...env, i });
          }
          break;
        case "loop_j_after_i":
          if (env.i === undefined)
            throw new Error("\"for each j : i+1 → n-1\" needs an i-loop around it.");
          for (let j = env.i + 1; j < arr.length; j++) {
            tick();
            exec(node.children, { ...env, j });
          }
          break;
        case "loop_j_full":
          for (let j = 0; j < arr.length - 1; j++) {
            tick();
            exec(node.children, { ...env, j });
          }
          break;
        case "repeat_until_stable": {
          let pass = 0;
          do {
            tick();
            state.swappedInPass = false;
            exec(node.children, { ...env });
            pass++;
            if (pass > arr.length + 2) break;
          } while (state.swappedInPass);
          break;
        }
        case "if_cmp": {
          const l = resolveIdx(node.config.left, env, arr.length, "compare");
          const r = resolveIdx(node.config.right, env, arr.length, "compare");
          state.comparisons++;
          record("compare", l, r);
          const truth = node.config.op === ">" ? arr[l] > arr[r] : arr[l] < arr[r];
          if (truth) exec(node.children, env);
          break;
        }
        case "swap": {
          const a = resolveIdx(node.config.a, env, arr.length, "swap");
          const b = resolveIdx(node.config.b, env, arr.length, "swap");
          [arr[a], arr[b]] = [arr[b], arr[a]];
          state.swaps++;
          state.swappedInPass = true;
          record("swap", a, b);
          break;
        }
        default:
          throw new Error("Unknown block: " + node.type);
      }
    }
  }

  exec(program, {});

  const sorted = arr.every((v, k) => k === 0 || arr[k - 1] <= v);
  return {
    result: arr,
    sorted,
    comparisons: state.comparisons,
    swaps: state.swaps,
    trace: state.trace,
  };
}

// ---- Static analysis: max nested loop depth (for the Big-O walkthrough)
// Counts how deeply loops-over-the-data are nested. Each such loop is a
// factor of ~n; repeat-until-stable also multiplies by up to n passes.
export function maxLoopDepth(program) {
  function depth(nodes) {
    let best = 0;
    for (const n of nodes) {
      const isLoop =
        n.type === "loop_i" ||
        n.type === "loop_j_after_i" ||
        n.type === "loop_j_full" ||
        n.type === "repeat_until_stable";
      if (n.children) {
        const inner = depth(n.children);
        best = Math.max(best, isLoop ? inner + 1 : inner);
      }
    }
    return best;
  }
  return depth(program);
}
