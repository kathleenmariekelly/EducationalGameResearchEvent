// scenarios.js
//
// Build-time content pool for ForkTree. No API calls at play time — the
// game shuffles and cycles through these hand-authored fork/exec traces.
//
// Each scenario is a fully specified, deterministic execution trace so the
// engine never needs a C interpreter. PIDs are assigned in creation order
// across the whole scenario (root is always pid 1).
//
// Event kinds:
//   fork  { line, pairs:[{parent, child}] }
//           Every listed parent is a currently-live leaf that reaches this
//           fork() line and spawns exactly one child. In the parent, fork()
//           returns the child's PID; in the child it returns 0.
//   write { line, pid, value }   a process writes memVar in ITS OWN copy
//   exec  { line, pid, prog }    that process replaces its image (exec)
//   exit  { line, pid }          child calls exit() -> zombie (asks the quiz)
//   terminate { line, pid, note } a process just exits (no quiz, narrative)
//   ask   { line, prompt, options[], answer, explain, hint, weight }
//                                 a direct multiple-choice question about state
//
// finalQ: the always-asked "how many processes total ran in this program?"
//         (equals the number of nodes in the tree).

export const SCENARIOS = [
  {
    id: "single-fork",
    title: "One fork()",
    difficulty: 1,
    code: [
      "int main(void) {",
      "    fork();",
      '    printf("hi\\n");',
      "    return 0;",
      "}",
    ],
    events: [{ kind: "fork", line: 1, pairs: [{ parent: 1, child: 2 }] }],
    finalCount: 2,
    finalPrintQ: {
      prompt: 'How many times is "hi" printed?',
      answer: 2,
      hint: "Both processes continue from AFTER the fork line and reach the printf.",
    },
    explanation:
      "fork() creates ONE child, so now 2 processes exist. In the parent, fork() returned the child's PID (2); in the child it returned 0. Both then run the rest of main(), so \"hi\" prints twice.",
  },

  {
    id: "two-sequential",
    title: "fork(); fork();",
    difficulty: 2,
    code: [
      "int main(void) {",
      "    fork();",
      "    fork();",
      '    printf("go\\n");',
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "fork", line: 1, pairs: [{ parent: 1, child: 2 }] },
      { kind: "fork", line: 2, pairs: [{ parent: 1, child: 3 }, { parent: 2, child: 4 }] },
    ],
    finalCount: 4,
    finalPrintQ: {
      prompt: 'How many times is "go" printed?',
      answer: 4,
      hint: "After the first fork there are 2 processes. The SECOND fork runs in every one of them.",
    },
    explanation:
      "This is the classic trap. After the first fork() there are 2 processes. The second fork() executes in BOTH of them, so each spawns a child -> 4 processes total. \"go\" prints 4 times (2^2).",
  },

  {
    id: "loop-fork",
    title: "fork() in a loop",
    difficulty: 3,
    code: [
      "int main(void) {",
      "    for (int i = 0; i < 3; i++)",
      "        fork();",
      '    printf("x\\n");',
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "fork", line: 2, pairs: [{ parent: 1, child: 2 }] },
      { kind: "fork", line: 2, pairs: [{ parent: 1, child: 3 }, { parent: 2, child: 4 }] },
      {
        kind: "fork",
        line: 2,
        pairs: [
          { parent: 1, child: 5 },
          { parent: 2, child: 6 },
          { parent: 3, child: 7 },
          { parent: 4, child: 8 },
        ],
      },
    ],
    finalCount: 8,
    finalPrintQ: {
      prompt: 'How many times is "x" printed?',
      answer: 8,
      hint: "Each loop iteration doubles the number of processes. 3 iterations => 2^3.",
    },
    explanation:
      "A loop of N unconditional forks doubles the process count each pass: 1 -> 2 -> 4 -> 8. The formula is 2^N. This is why an accidental fork() in a loop is a 'fork bomb'.",
  },

  {
    id: "guarded-child",
    title: "Only the child forks",
    difficulty: 3,
    code: [
      "int main(void) {",
      "    pid_t p = fork();",
      "    if (p == 0)",
      "        fork();",
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "fork", line: 1, pairs: [{ parent: 1, child: 2 }] },
      { kind: "branch", line: 2, cond: "p == 0", desc: "0 (the child)", enter: [2] },
      { kind: "fork", line: 3, pairs: [{ parent: 2, child: 3 }] },
    ],
    finalCount: 3,
    hint: "The second fork() is inside `if (p == 0)`. fork() returns 0 ONLY in the child, so only the child enters the branch.",
    explanation:
      "The first fork() returns the child's PID (nonzero) to the parent and 0 to the child. So `if (p == 0)` is TRUE only in the child, and only the child runs the second fork(). Result: 3 processes, not 4.",
  },

  {
    id: "memory-copy",
    title: "Copy-on-write memory",
    difficulty: 4,
    memVar: "x",
    memInit: 0,
    code: [
      "int main(void) {",
      "    int x = 0;",
      "    if (fork() == 0)",
      "        x = 42;",
      '    printf("%d\\n", x);',
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "fork", line: 2, pairs: [{ parent: 1, child: 2 }] },
      { kind: "branch", line: 2, cond: "fork() == 0", desc: "0 (the child)", enter: [2] },
      { kind: "write", line: 3, pid: 2, value: 42 },
      {
        kind: "ask",
        line: 4,
        prompt:
          "Do the parent and child share the same copy of <code>x</code>?",
        options: [
          "Yes — it's one shared variable",
          "No — each has its own private copy",
        ],
        answer: 1,
        explain:
          "fork() duplicates the address space (copy-on-write). Each process has its own x; a write in one never affects the other.",
        hint: "Think about what fork() actually duplicates when it makes the child.",
        weight: 2,
      },
    ],
    finalCount: 2,
    explanation:
      "After fork() the child has its OWN private copy of x (copy-on-write). `fork() == 0` is true only in the child, so only the child sets x = 42. The parent's x is still 0. They do NOT share memory — each prints its own value.",
  },

  {
    id: "fork-exec",
    title: "fork() then exec()",
    difficulty: 4,
    code: [
      "int main(void) {",
      "    if (fork() == 0)",
      '        execlp("ls", "ls", NULL);',
      '    printf("parent done\\n");',
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "fork", line: 1, pairs: [{ parent: 1, child: 2 }] },
      { kind: "branch", line: 1, cond: "fork() == 0", desc: "0 (the child)", enter: [2] },
      { kind: "exec", line: 2, pid: 2, prog: "ls" },
    ],
    finalCount: 2,
    finalPrintQ: {
      prompt: 'How many processes print "parent done"?',
      answer: 1,
      hint: "exec() REPLACES the child's program image. The C code after execlp never runs in that process.",
    },
    explanation:
      "exec() does NOT create a new process — it replaces the current process's image with a new program (same PID), and on success it NEVER RETURNS: the C code after execlp is gone. The child becomes `ls`; only the parent reaches the printf. fork() to copy, exec() to transform.",
  },

  {
    id: "exit-wait",
    title: "exit() and zombies",
    difficulty: 5,
    code: [
      "int main(void) {",
      "    pid_t p = fork();",
      "    if (p == 0)",
      "        exit(0);",
      "    else",
      "        wait(NULL);",
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "fork", line: 1, pairs: [{ parent: 1, child: 2 }] },
      { kind: "branch", line: 2, cond: "p == 0", desc: "0 (the child)", enter: [2] },
      { kind: "exit", line: 3, pid: 2 },
      {
        kind: "ask",
        line: 5,
        prompt: "The parent now runs <code>wait(NULL)</code>. What does it do to the exited child?",
        options: [
          "Reaps the zombie and frees its table entry",
          "Restarts the child",
          "Nothing — the child is already gone",
        ],
        answer: 0,
        explain:
          "wait() collects the child's exit status and removes the zombie from the process table. That's what 'reaping' means.",
        hint: "A zombie still occupies a process-table slot until someone collects it.",
        weight: 3,
      },
    ],
    finalCount: 2,
    explanation:
      "The child (where fork() returned 0) calls exit(0) and becomes a ZOMBIE — dead, but its exit status lingers in the process table. The parent's wait(NULL) REAPS it, freeing that entry. We COUNT the original because it is a real process too: it's the parent that ran fork() and wait(), and it exists the whole time. The total (2) is the original plus every child it spawned — a zombie still counts as a process that existed, even though it's gone by the end. Without wait(), the zombie would leak.",
  },

  {
    id: "exec-no-return",
    title: "exec never returns",
    difficulty: 3,
    code: [
      "int main(void) {",
      '    printf("before\\n");',
      '    execlp("date", "date", NULL);',
      '    printf("after\\n");',
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "exec", line: 2, pid: 1, prog: "date" },
      {
        kind: "ask",
        line: 3,
        prompt: 'Does <code>"after"</code> ever print?',
        options: ["Yes", "No"],
        answer: 1,
        explain:
          "On success exec() does not return — the process image is replaced by `date`, so the printf below it is gone and never runs.",
        hint: "If exec succeeds, is there any of the original program left to run?",
        weight: 3,
      },
    ],
    finalCount: 1,
    finalPrintQ: {
      prompt: 'How many lines does THIS program print (before/after)?',
      answer: 1,
      hint: "Only code that runs before a successful exec() executes.",
    },
    explanation:
      "No fork() here — one process. It prints \"before\", then execlp replaces the whole image with `date`. exec() does not return on success, so \"after\" never prints. Code after a successful exec is unreachable.",
  },

  {
    id: "fork-exec-wait",
    title: "fork + exec + wait",
    difficulty: 5,
    code: [
      "int main(void) {",
      "    pid_t p = fork();",
      "    if (p == 0)",
      '        execlp("ls", "ls", NULL);',
      "    else",
      "        wait(NULL);",
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "fork", line: 1, pairs: [{ parent: 1, child: 2 }] },
      { kind: "branch", line: 2, cond: "p == 0", desc: "0 (the child)", enter: [2] },
      { kind: "exec", line: 3, pid: 2, prog: "ls" },
      {
        kind: "ask",
        line: 5,
        prompt: "The parent calls <code>wait(NULL)</code>. It blocks until …",
        options: [
          "the child (now running ls) finishes",
          "forever — exec broke the link",
          "it returns immediately",
        ],
        answer: 0,
        explain:
          "exec keeps the same PID, so the parent-child relationship survives. wait() blocks until that child (running ls) exits, then reaps it.",
        hint: "Does exec() change the process's PID or its parent?",
        weight: 4,
      },
    ],
    finalCount: 2,
    explanation:
      "The child branches on p==0 and execs into `ls` — same PID, new program. The parent takes the else branch and wait()s. Because exec preserves the PID and parent link, the parent's wait() still tracks the child, blocks until `ls` finishes, and reaps it. This is exactly how a shell runs a command.",
  },

  {
    id: "orphan",
    title: "Orphan process",
    difficulty: 5,
    code: [
      "int main(void) {",
      "    if (fork() > 0)",
      "        exit(0);",
      "    // child keeps running",
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "fork", line: 1, pairs: [{ parent: 1, child: 2 }] },
      {
        kind: "branch",
        line: 1,
        cond: "fork() > 0",
        desc: "a positive PID (the parent)",
        enter: [1],
      },
      { kind: "terminate", line: 2, pid: 1, note: "The parent leaves before the child." },
      {
        kind: "ask",
        line: 3,
        prompt: "The parent has exited but the child is still running. What is the child now?",
        options: [
          "A zombie",
          "An orphan, re-parented to init (PID 1)",
          "Terminated too",
        ],
        answer: 1,
        explain:
          "A child whose parent exits first is an ORPHAN. init (PID 1) adopts it and will reap it when it exits — so orphans don't leak the way unreaped zombies do.",
        hint: "A zombie is a dead child waiting to be reaped. This child is still alive — but its parent is gone.",
        weight: 4,
      },
    ],
    finalCount: 2,
    explanation:
      "Here fork() > 0 is true only in the parent, so the parent exits first. The child is left running with no living parent — an ORPHAN. The OS re-parents it to init (PID 1), which reaps it later. We still count BOTH toward the total (2, including the original): the parent genuinely existed and ran fork()+exit() before leaving. And unlike the zombie case, the child does NOT wait for the parent — it just keeps running and gets adopted by init. Zombie = dead child not yet reaped; orphan = live child whose parent died.",
  },

  {
    id: "fork-fails",
    title: "When fork() fails",
    difficulty: 4,
    code: [
      "int main(void) {",
      "    pid_t p = fork();",
      "    if (p < 0) {",
      '        perror("fork");',
      "        return 1;",
      "    }",
      '    printf("ok\\n");',
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "forkfail", line: 1, pid: 1, weight: 3 },
      {
        kind: "branch",
        line: 2,
        cond: "p < 0",
        desc: "a negative value (fork failed)",
        enter: [1],
      },
      {
        kind: "ask",
        line: 3,
        prompt: "fork() failed. How many processes are running this program now?",
        options: ["1 — just the original", "2", "0"],
        answer: 0,
        explain:
          "No child was created, so only the original process continues — and here it hits the error branch and returns 1.",
        hint: "If fork() returns -1, was a child ever created?",
        weight: 2,
      },
    ],
    finalCount: 1,
    explanation:
      "fork() can FAIL (e.g. the system hit its process limit). On failure it returns -1 — a NEGATIVE value — sets errno, and creates NO child. That's why real code always checks `if (p < 0)` before assuming a child exists. Here only the original process runs, sees p < 0, prints the error, and exits. Total processes: 1.",
  },

  {
    id: "buffered-double-print",
    title: "The buffered printf trap",
    difficulty: 4,
    code: [
      "int main(void) {",
      '    printf("hi");   // no newline!',
      "    fork();",
      "    return 0;",
      "}",
    ],
    events: [
      {
        kind: "ask",
        line: 1,
        prompt:
          '<code>printf("hi")</code> has no <code>\\n</code>. When <code>fork()</code> runs next, where is "hi"?',
        options: [
          "Already printed to the screen",
          "Still in the process's output buffer (unflushed)",
          "Discarded",
        ],
        answer: 1,
        explain:
          "With no newline (and stdout not a terminal) the text stays in the buffer, which lives in the process's memory.",
        hint: "A newline usually flushes line-buffered stdout. There isn't one here.",
        weight: 3,
      },
      { kind: "fork", line: 2, pairs: [{ parent: 1, child: 2 }] },
    ],
    finalCount: 2,
    finalPrintQ: {
      prompt: 'How many times does "hi" appear in the output?',
      answer: 2,
      hint: "fork() copies memory — including the unflushed buffer. Each process flushes its own copy at exit.",
    },
    explanation:
      'Because "hi" has no newline it stays UNFLUSHED in the output buffer, which is part of the process\'s memory. fork() copies the whole address space — buffer included — so BOTH processes hold "hi" and each flushes its own copy at exit: "hi" prints TWICE. With printf("hi\\n") to a terminal it would flush immediately and print once. The buffer is memory, so it gets copied.',
  },

  {
    id: "fd-shared",
    title: "Copied memory, shared files",
    difficulty: 5,
    code: [
      "int main(void) {",
      '    int fd = open("log", O_WRONLY);',
      "    if (fork() == 0)",
      '        write(fd, "A", 1);',
      "    else {",
      "        wait(NULL);",
      '        write(fd, "B", 1);',
      "    }",
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "fork", line: 2, pairs: [{ parent: 1, child: 2 }] },
      { kind: "branch", line: 2, cond: "fork() == 0", desc: "0 (the child)", enter: [2] },
      {
        kind: "ask",
        line: 3,
        prompt:
          "Both processes use the <code>fd</code> opened BEFORE the fork. Is the file's read/write OFFSET shared between them?",
        options: [
          "No — each gets its own copy, like a normal variable",
          "Yes — they share one open file description, so the offset is shared",
        ],
        answer: 1,
        explain:
          "fork copies the fd NUMBER, but both entries point to the SAME open file description in the kernel — so the offset is shared, unlike ordinary memory which is copied.",
        hint: "Memory is copied on fork. But what about the kernel object an fd points to?",
        weight: 4,
      },
      {
        kind: "ask",
        line: 6,
        prompt:
          'The child writes "A", then the parent (after wait) writes "B". What ends up in the file?',
        options: [
          '"AB" — the shared offset advanced past "A"',
          '"B" — the parent overwrote from offset 0',
          '"A" — only the child\'s write counted',
        ],
        answer: 0,
        explain:
          "Because the offset is shared, the child's write advances it to 1; the parent's write lands at position 1 → \"AB\". A copied (per-process) offset would have overwritten.",
        hint: "If the offset is shared, where does the second write go?",
        weight: 4,
      },
    ],
    finalCount: 2,
    explanation:
      "Key contrast: fork COPIES memory (separate variables) but the child INHERITS copies of the parent's file descriptors that point to the SAME open file description — so the file offset is SHARED. Child writes \"A\" (offset 0→1), parent writes \"B\" (offset 1→2) → file is \"AB\". Memory = copied; open files = shared. This is exactly how shell redirection and pipes work.",
  },

  {
    id: "wait-status",
    title: "What wait() tells you",
    difficulty: 5,
    code: [
      "int main(void) {",
      "    if (fork() == 0)",
      "        exit(3);",
      "    int status;",
      "    pid_t c = wait(&status);",
      "    printf(\"%d\", WEXITSTATUS(status));",
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "fork", line: 1, pairs: [{ parent: 1, child: 2 }] },
      { kind: "branch", line: 1, cond: "fork() == 0", desc: "0 (the child)", enter: [2] },
      { kind: "terminate", line: 2, pid: 2, note: "It exits with status 3." },
      {
        kind: "ask",
        line: 4,
        prompt: "<code>wait(&status)</code> returns … what?",
        options: [
          "the exit code directly (3)",
          "the PID of the child it reaped",
          "always 0",
        ],
        answer: 1,
        explain:
          "wait() returns WHICH child was reaped (its PID). The exit code is encoded separately in `status`.",
        hint: "The return value identifies the child; the code is written into the status argument.",
        weight: 4,
      },
      {
        kind: "ask",
        line: 5,
        prompt: "What does <code>WEXITSTATUS(status)</code> evaluate to here?",
        options: ["3", "0", "the child's PID"],
        answer: 0,
        explain:
          "WEXITSTATUS extracts the low 8 bits the child passed to exit() — here, 3.",
        hint: "It pulls out the value the child gave exit().",
        weight: 3,
      },
    ],
    finalCount: 2,
    explanation:
      "wait(&status) does two things: it RETURNS the PID of the child it reaped (so you know which one finished), and it fills `status` with an encoded result. You don't read status directly — you use macros: WEXITSTATUS(status) gives the value the child passed to exit() (3 here). This is how a parent learns both who died and how.",
  },

  {
    id: "nondeterministic-order",
    title: "Who runs first?",
    difficulty: 3,
    code: [
      "int main(void) {",
      "    if (fork() == 0)",
      '        printf("child\\n");',
      "    else",
      '        printf("parent\\n");',
      "    return 0;",
      "}",
    ],
    events: [
      { kind: "fork", line: 1, pairs: [{ parent: 1, child: 2 }] },
      { kind: "branch", line: 1, cond: "fork() == 0", desc: "0 (the child)", enter: [2] },
      {
        kind: "ask",
        line: 4,
        prompt: 'Which line prints first — "child" or "parent"?',
        options: [
          "Always parent (it existed first)",
          "Always child",
          "Not guaranteed — it depends on the scheduler",
        ],
        answer: 2,
        explain:
          "After fork() both processes are runnable. The OS scheduler decides who runs when, so output order is nondeterministic unless you synchronize (e.g. with wait()).",
        hint: "Are both processes eligible to run at the same time?",
        weight: 3,
      },
    ],
    finalCount: 2,
    finalPrintQ: {
      prompt: "How many lines are printed in total?",
      answer: 2,
      hint: "One process takes the if branch, the other the else — each prints once.",
    },
    explanation:
      "Each process prints exactly one line (one takes the if, one the else), so 2 lines total — but their ORDER is not guaranteed. fork() leaves both processes runnable and the scheduler interleaves them however it likes. Never assume parent-before-child (or vice versa) without explicit synchronization.",
  },
];

// Title ladder, ascending. effect drives how flashy the celebration is.
export const TITLES = [
  { name: "Segfault Rookie", color: "#8a8f98", effect: 0 },
  { name: "Zombie Reaper", color: "#7fae5f", effect: 1 },
  { name: "PID Apprentice", color: "#5fb0c9", effect: 1 },
  { name: "Fork Ranger", color: "#5f8dd6", effect: 2 },
  { name: "Copy-on-Writer", color: "#9b6fd6", effect: 2 },
  { name: "Process Whisperer", color: "#d67fc4", effect: 3 },
  { name: "Scheduler Sage", color: "#e0a13a", effect: 3 },
  { name: "Kernel Hacker", color: "#e0603a", effect: 4 },
  { name: "Fork Bomber", color: "#e03a5f", effect: 4 },
  { name: "OS Overlord", color: "#ffd24a", effect: 5 },
  { name: "Context Switcher", color: "#4ad6c4", effect: 5 },
  { name: "Zombie Slayer", color: "#7fff5f", effect: 6 },
  { name: "Kernel Archon", color: "#a98cff", effect: 6 },
  { name: "Syscall Sovereign", color: "#ff8cf0", effect: 7 },
  { name: "The Scheduler (Ascended)", color: "#ffe66a", effect: 7 },
  // Endgame title — requires a big point leap (see FINAL_EXTRA in the scene).
  { name: "init (PID 1)", color: "#ffffff", effect: 8 },
];
