// lessons.js — interactive lessons that TEACH each concept before combat.
//
// Each lesson is an ordered list of steps. Step kinds:
//   info  : story + code + memory diagram + explanation, then Next.
//   click : ask the player to click a specific cell (target) in the diagram.
//   trace : step through code line-by-line; each sub-step animates memory
//           (set a value, free a cell, or re-point a pointer's arrow).
//   input : type a C++ expression, checked against `accept`.
//   run   : write & execute REAL C++ (via JSCPP) to hit an expected output.
//
// Lessons are keyed by the campaign stage pool they support.

export const LESSONS = {
  // =====================================================================
  basics: {
    title: "Pointers 101 — Addresses, & and *",
    blurb: "What a variable really is, and how pointers store addresses.",
    steps: [
      {
        kind: "info",
        story: "Before you fight, learn to READ memory.",
        code: ["int hp = 42;"],
        memory: [{ id: "hp", name: "hp", addr: "0x1004", value: "42", region: "stack", kind: "int" }],
        note: "A variable is a labelled box in memory. `hp` lives on the STACK at address 0x1004 and holds the value 42. Two things always matter: WHERE it lives (its address) and WHAT it holds (its value).",
      },
      {
        kind: "click",
        story: "Let's make sure you can read the diagram.",
        code: ["int hp = 42;"],
        memory: [{ id: "hp", name: "hp", addr: "0x1004", value: "42", region: "stack", kind: "int" }],
        prompt: "Click the cell for the variable hp.",
        target: "hp",
        success: "That's hp — value 42, living at address 0x1004.",
        hint: "There's only one box here — click it.",
        note: "Every variable occupies a slot in memory with its own address.",
      },
      {
        kind: "info",
        story: "Now we create a POINTER — a variable that stores an ADDRESS.",
        code: ["int hp = 42;", "int* p = &hp;"],
        memory: [
          { id: "hp", name: "hp", addr: "0x1004", value: "42", region: "stack", kind: "int" },
          { id: "p", name: "p", addr: "0x1008", value: "0x1004", region: "stack", kind: "ptr", pointsTo: "hp" },
        ],
        note: "`&hp` means 'address of hp' (0x1004). The pointer `p` stores that address — the gold ARROW shows p pointing AT hp. A pointer holds an address, NOT a copy of the value.",
      },
      {
        kind: "click",
        story: "A pointer is just a variable whose value happens to be an address.",
        code: ["int hp = 42;", "int* p = &hp;"],
        memory: [
          { id: "hp", name: "hp", addr: "0x1004", value: "42", region: "stack", kind: "int" },
          { id: "p", name: "p", addr: "0x1008", value: "0x1004", region: "stack", kind: "ptr", pointsTo: "hp" },
        ],
        prompt: "Click the POINTER — the cell whose value is an address (0x1004).",
        target: "p",
        success: "Right! p holds 0x1004, the address of hp. Follow its arrow to reach hp.",
        hint: "Look for the gold box holding 0x1004, not the one holding 42.",
        note: "p's value (0x1004) equals hp's address. That's exactly what 'points to' means.",
      },
      {
        kind: "input",
        story: "Your turn to write the syntax.",
        code: ["int hp = 42;", "int* p = ____ ;"],
        memory: [
          { id: "hp", name: "hp", addr: "0x1004", value: "42", region: "stack", kind: "int" },
        ],
        prompt: "Type the expression that gives the ADDRESS of hp.",
        accept: ["&hp"],
        hint: "Use the address-of operator: &",
        placeholder: "e.g. &something",
        success: "Exactly — `&hp` is hp's address, which is what a pointer stores.",
        note: "& = 'address of'. It turns a variable into its location.",
      },
      {
        kind: "trace",
        story: "What does `*p = 100;` actually DO? Step through and watch memory change.",
        lines: ["int hp = 42;", "int* p = &hp;", "*p = 100;"],
        memory: [
          { id: "hp", name: "hp", addr: "0x1004", value: "42", region: "stack", kind: "int" },
          { id: "p", name: "p", addr: "0x1008", value: "0x1004", region: "stack", kind: "ptr", pointsTo: "hp" },
        ],
        steps: [
          { line: 0, highlight: "hp", note: "Line 1: hp is created on the stack holding 42." },
          { line: 1, highlight: "p", note: "Line 2: p is created holding &hp (0x1004). The arrow shows it points at hp." },
          { line: 2, highlight: "hp", set: { cell: "hp", value: "100" }, note: "Line 3: *p means 'the thing p points to' = hp. So *p = 100 writes 100 INTO hp. hp changed — but p itself is unchanged!" },
        ],
        note: "Dereferencing (*p) on the LEFT of = writes through the pointer into the target.",
      },
      {
        kind: "click",
        story: "Dereferencing (*p) FOLLOWS the arrow to read a value.",
        code: ["int hp = 100;", "int* p = &hp;", "int x = *p;"],
        memory: [
          { id: "hp", name: "hp", addr: "0x1004", value: "100", region: "stack", kind: "int" },
          { id: "p", name: "p", addr: "0x1008", value: "0x1004", region: "stack", kind: "ptr", pointsTo: "hp" },
        ],
        prompt: "Click the cell that  *p  reads from.",
        target: "hp",
        success: "Yes! *p follows p's arrow to hp and reads 100.",
        hint: "Follow p's arrow.",
        note: "p is the address, *p is the value at that address. Keep them straight!",
      },
      {
        kind: "run",
        story: "Time to write REAL C++ that runs in your browser!",
        prompt: "Use the pointer p to change score to 50 (write THROUGH the pointer). Then press Run.",
        starter:
          "#include <iostream>\nusing namespace std;\nint main() {\n    int score = 10;\n    int* p = &score;\n\n    // TODO: use p to change score to 50\n\n    cout << score << endl;\n    return 0;\n}",
        expectedOutput: "50",
        hint: "*p is the variable p points to. Try  *p = 50;",
        note: "You just wrote and executed real C++! `*p = 50;` changed score through the pointer — the core skill you'll use all game.",
      },
      {
        kind: "info",
        story: "Lesson complete — you can read memory, use & and *, and run C++!",
        note: "Recap:  & = address-of.  * = dereference (follow the arrow).  A pointer stores an address; *p is the value it points to. Now face the Stack Gates!",
      },
    ],
  },

  // =====================================================================
  references: {
    title: "References — a second name for a variable",
    blurb: "Aliases you use directly, and how they differ from pointers.",
    steps: [
      {
        kind: "info",
        story: "A REFERENCE is simply another NAME for a variable that already exists.",
        code: ["int hp = 42;", "int& r = hp;   // r is an alias for hp"],
        memory: [
          { id: "hp", name: "hp / r", addr: "0x1004", value: "42", region: "stack", kind: "int" },
        ],
        note: "Notice there is only ONE box, but it has two names: hp and r. A reference does NOT create new memory and does NOT store an address \u2014 it's just an alias. (The & here is part of the TYPE 'int&', not the address-of operator.)",
      },
      {
        kind: "trace",
        story: "Because r and hp are the same box, writing one changes the other.",
        lines: ["int hp = 42;", "int& r = hp;", "r = 100;"],
        memory: [
          { id: "hp", name: "hp / r", addr: "0x1004", value: "42", region: "stack", kind: "int" },
        ],
        steps: [
          { line: 0, highlight: "hp", note: "hp is created holding 42." },
          { line: 1, highlight: "hp", note: "int& r = hp: r becomes a SECOND NAME for the same box. No new memory, no arrow." },
          { line: 2, highlight: "hp", set: { cell: "hp", value: "100" }, note: "r = 100 writes into the shared box \u2014 so hp is now 100 too. And no * was needed (that's the difference from a pointer)." },
        ],
        note: "With a pointer you'd write *p = 100. With a reference you just write r = 100.",
      },
      {
        kind: "input",
        story: "Write the syntax that binds a reference.",
        code: ["int score = 7;", "______ m = score;   // make m an alias of score"],
        prompt: "Type the TYPE that makes m a reference to an int.",
        accept: ["int&"],
        hint: "The int type, then the reference symbol &.",
        placeholder: "e.g. type&",
        success: "Yes! `int& m = score;` makes m an alias for score.",
        note: "A reference MUST be initialized when created and can never be re-bound to a different variable afterwards.",
      },
      {
        kind: "info",
        story: "Reference vs pointer \u2014 two ways to reach another variable.",
        code: ["int a = 1;", "int& r = a;    // reference (alias)", "int* p = &a;   // pointer (stores address)"],
        memory: [
          { id: "a", name: "a / r", addr: "0x1B00", value: "1", region: "stack", kind: "int" },
          { id: "p", name: "p", addr: "0x1B08", value: "0x1B00", region: "stack", kind: "ptr", pointsTo: "a" },
        ],
        note: "r is just another name for a (no box of its own). p is a real variable holding a's address (its own box + an arrow). Use r directly; use *p to reach the value. A reference can't be null and can't be reseated; a pointer can be both.",
      },
      {
        kind: "info",
        story: "Lesson complete \u2014 you understand references!",
        note: "Recap:  int& r = x  makes r an alias for x (same memory, use it directly, can't be null or rebound). Great for pass-by-reference. Now face the Mirror Warden!",
      },
    ],
  },

  // =====================================================================
  heap: {
    title: "The Heap — new & delete",
    blurb: "Memory you allocate yourself, and why you must free it.",
    steps: [
      {
        kind: "info",
        story: "So far, variables lived on the STACK (auto-managed). There's another region: the HEAP.",
        code: ["int onStack = 5;", "int* p = new int(9);"],
        memory: [
          { id: "s", name: "onStack", addr: "0x2000", value: "5", region: "stack", kind: "int" },
          { id: "p", name: "p", addr: "0x2008", value: "0x9AA0", region: "stack", kind: "ptr", pointsTo: "h" },
          { id: "h", name: "(heap)", addr: "0x9AA0", value: "9", region: "heap", kind: "int" },
        ],
        note: "`new int(9)` grabs a box from the HEAP (right column), sets it to 9, and returns its ADDRESS. The pointer p (on the stack) stores that address. Stack memory is freed automatically; heap memory is NOT.",
      },
      {
        kind: "trace",
        story: "Watch the full life of a heap allocation.",
        lines: ["int* p = new int(7);", "cout << *p;   // 7", "delete p;"],
        memory: [
          { id: "p", name: "p", addr: "0x2100", value: "0xBB10", region: "stack", kind: "ptr", pointsTo: "h" },
          { id: "h", name: "(heap)", addr: "0xBB10", value: "7", region: "heap", kind: "int" },
        ],
        steps: [
          { line: 0, highlight: "h", note: "new int(7): a heap block holding 7 is created; p stores its address (see the arrow)." },
          { line: 1, highlight: "h", note: "*p follows the arrow and reads the heap value: 7." },
          { line: 2, highlight: "h", free: "h", note: "delete p: the heap block is RELEASED back to the system. Notice p still holds the old address — it now dangles (points at freed memory)." },
        ],
        note: "Every `new` needs exactly one matching `delete`, or the memory is wasted.",
      },
      {
        kind: "input",
        story: "You allocated it — you must free it.",
        code: ["int* p = new int(7);", "// ... done using it ...", "____"],
        memory: [
          { id: "p", name: "p", addr: "0x6400", value: "0xCA11", region: "stack", kind: "ptr", pointsTo: "h" },
          { id: "h", name: "(heap)", addr: "0xCA11", value: "7", region: "heap", kind: "int" },
        ],
        prompt: "Type the statement that frees the heap block p points to.",
        accept: ["delete p", "delete p;"],
        hint: "Pair every `new` with this keyword.",
        placeholder: "e.g. keyword p;",
        success: "Correct — `delete p;` returns the block to the heap.",
        note: "Rule: one new -> one delete.  (And for arrays: one new[] -> one delete[].)",
      },
      {
        kind: "click",
        story: "A LEAK happens when the last pointer to heap memory is lost before delete.",
        code: ["void spell() {", "  int* p = new int(1);", "}   // p is destroyed here", ""],
        memory: [
          { id: "p", name: "p (local)", addr: "0xF100", value: "0xAAAA", region: "stack", kind: "ptr", pointsTo: "h" },
          { id: "h", name: "(heap)", addr: "0xAAAA", value: "1", region: "heap", kind: "int" },
        ],
        prompt: "When spell() returns, p disappears. Click the block that is now LEAKED (unreachable, never freed).",
        target: "h",
        success: "Exactly — the heap block still exists but nothing points to it. It can never be freed = a memory leak.",
        hint: "The stack pointer vanishes; what's left stranded on the heap?",
        note: "Add `delete p;` before the function ends to avoid the leak.",
      },
      {
        kind: "info",
        story: "Lesson complete — you understand the heap!",
        note: "Recap:  `new` allocates on the heap and returns an address;  `delete` frees it. Lose the pointer before deleting = leak. Now enter the Heap Caverns!",
      },
    ],
  },

  // =====================================================================
  dangling: {
    title: "Dangling Pointers & Lifetimes",
    blurb: "Why touching freed or expired memory is a bug.",
    steps: [
      {
        kind: "info",
        story: "A DANGLING pointer still holds an address whose memory is gone.",
        code: ["int* p = new int(3);", "delete p;", "// p now dangles"],
        memory: [
          { id: "p", name: "p", addr: "0x8000", value: "0xD100", region: "stack", kind: "ptr", pointsTo: "h", freed: true },
          { id: "h", name: "(freed)", addr: "0xD100", value: "??", region: "heap", kind: "int", freed: true },
        ],
        note: "After `delete p`, the block is gone but p still stores its old address (dashed red arrow). Reading or writing *p now is UNDEFINED BEHAVIOR — 'use-after-free'.",
      },
      {
        kind: "trace",
        story: "Step through a use-after-free bug.",
        lines: ["int* p = new int(3);", "delete p;", "*p = 9;  // BUG"],
        memory: [
          { id: "p", name: "p", addr: "0x8100", value: "0xD200", region: "stack", kind: "ptr", pointsTo: "h" },
          { id: "h", name: "(heap)", addr: "0xD200", value: "3", region: "heap", kind: "int" },
        ],
        steps: [
          { line: 0, highlight: "h", note: "new int(3): heap block holds 3; p points at it." },
          { line: 1, highlight: "h", free: "h", note: "delete p: block freed. p still points there — now dangling." },
          { line: 2, highlight: "p", note: "*p = 9 writes into FREED memory. That slot may already be reused by something else = corruption / crash." },
        ],
        note: "The moment you delete a block, every pointer holding that address becomes dangerous.",
      },
      {
        kind: "input",
        story: "The simple defense.",
        code: ["delete p;", "____", "// now p is safe to test with if (p)"],
        memory: [
          { id: "p", name: "p", addr: "0x8400", value: "0xDEAD", region: "stack", kind: "ptr", freed: true },
        ],
        prompt: "Type the line that makes p safe after deleting (point it at nothing).",
        accept: ["p = nullptr", "p = NULL", "p = 0"],
        hint: "Assign the 'points at nothing' value.",
        placeholder: "e.g. p = ...;",
        success: "Correct — `p = nullptr;` turns a dangling pointer into a null one, which you can safely check.",
        note: "Pattern: `delete p; p = nullptr;`  — also makes an accidental second delete a safe no-op.",
      },
      {
        kind: "click",
        story: "Aliasing makes this trickier: two pointers, one block.",
        code: ["int* a = new int(1);", "int* b = a;", "delete a;"],
        memory: [
          { id: "a", name: "a", addr: "0x8200", value: "0xD300", region: "stack", kind: "ptr", freed: true },
          { id: "b", name: "b", addr: "0x8208", value: "0xD300", region: "stack", kind: "ptr", pointsTo: "h", freed: true },
          { id: "h", name: "(freed)", addr: "0xD300", value: "??", region: "heap", kind: "int", freed: true },
        ],
        prompt: "a and b held the SAME address. After `delete a`, click the pointer that is now silently DANGLING.",
        target: "b",
        success: "Right — b still points at the freed block. Freeing memory invalidates EVERY pointer that aliased it.",
        hint: "Which pointer wasn't the one passed to delete, yet points to the same block?",
        note: "Only one owner should delete a block — and everyone else must stop using it.",
      },
      {
        kind: "info",
        story: "Lesson complete — you can spot dangling pointers!",
        note: "Recap:  using memory after delete (or after a variable's lifetime ends) is use-after-free. Null the pointer after deleting. Now brave the Hollow Crypts!",
      },
    ],
  },

  // =====================================================================
  arithmetic: {
    title: "Pointer Arithmetic & Arrays",
    blurb: "How arrays, indexing, and pointer math connect.",
    steps: [
      {
        kind: "info",
        story: "An array is a row of values laid out contiguously in memory.",
        code: ["int arr[3] = {10, 20, 30};"],
        memory: [
          { id: "a0", name: "arr[0]", addr: "0xE000", value: "10", region: "stack", kind: "int" },
          { id: "a1", name: "arr[1]", addr: "0xE004", value: "20", region: "stack", kind: "int" },
          { id: "a2", name: "arr[2]", addr: "0xE008", value: "30", region: "stack", kind: "int" },
        ],
        note: "The three ints sit back-to-back. Each int is 4 bytes, so the addresses go 0xE000, 0xE004, 0xE008. This layout is WHY pointer arithmetic works.",
      },
      {
        kind: "trace",
        story: "Watch a pointer WALK across the array.",
        lines: ["int arr[3] = {10,20,30};", "int* p = arr;", "p = p + 1;"],
        memory: [
          { id: "a0", name: "arr[0]", addr: "0xE000", value: "10", region: "stack", kind: "int" },
          { id: "a1", name: "arr[1]", addr: "0xE004", value: "20", region: "stack", kind: "int" },
          { id: "a2", name: "arr[2]", addr: "0xE008", value: "30", region: "stack", kind: "int" },
          { id: "p", name: "p", addr: "0xE010", value: "0xE000", region: "stack", kind: "ptr", pointsTo: "a0" },
        ],
        steps: [
          { line: 0, note: "arr is three ints side by side." },
          { line: 1, highlight: "a0", note: "p = arr: an array 'decays' to a pointer to its first element, so p points at arr[0]." },
          { line: 2, highlight: "a1", repoint: { cell: "p", to: "a1" }, set: { cell: "p", value: "0xE004" }, note: "p + 1 moves ONE element forward (4 bytes, not 1!). p now points at arr[1], so *p is 20." },
        ],
        note: "Pointer + N advances by N ELEMENTS. The compiler scales by the element's size for you.",
      },
      {
        kind: "click",
        story: "Indexing is pointer arithmetic in disguise.",
        code: ["int arr[3] = {5, 6, 7};", "int* p = arr;"],
        memory: [
          { id: "a0", name: "arr[0]", addr: "0xE100", value: "5", region: "stack", kind: "int" },
          { id: "a1", name: "arr[1]", addr: "0xE104", value: "6", region: "stack", kind: "int" },
          { id: "a2", name: "arr[2]", addr: "0xE108", value: "7", region: "stack", kind: "int" },
          { id: "p", name: "p", addr: "0xE110", value: "0xE100", region: "stack", kind: "ptr", pointsTo: "a0" },
        ],
        prompt: "Click the element that  *(p + 2)  refers to.",
        target: "a2",
        success: "Yes! *(p + 2) is arr[2] = 7. In fact, arr[i] is DEFINED as *(arr + i).",
        hint: "Start at arr[0], step forward 2 elements.",
        note: "arr[i]  ==  *(arr + i)  ==  *(p + i). Same thing, three spellings.",
      },
      {
        kind: "input",
        story: "Write it yourself.",
        code: ["int arr[3] = {5, 6, 7};", "int* p = arr;"],
        memory: [
          { id: "a0", name: "arr[0]", addr: "0xE100", value: "5", region: "stack", kind: "int" },
          { id: "a1", name: "arr[1]", addr: "0xE104", value: "6", region: "stack", kind: "int" },
          { id: "a2", name: "arr[2]", addr: "0xE108", value: "7", region: "stack", kind: "int" },
          { id: "p", name: "p", addr: "0xE110", value: "0xE100", region: "stack", kind: "ptr", pointsTo: "a0" },
        ],
        prompt: "Type an expression (using p and *) that equals arr[2].",
        accept: ["*(p+2)", "*(2+p)"],
        hint: "arr[i] is *(arr + i).",
        placeholder: "e.g. *(p+...)",
        success: "Perfect — *(p + 2) reads arr[2].",
        note: "Careful: *p + 2 is different — it reads arr[0] THEN adds 2. Parentheses matter!",
      },
      {
        kind: "run",
        story: "Prove it with real, running C++.",
        prompt: "Advance p to the THIRD element of arr so the program prints 30. Don't use [] .",
        starter:
          "#include <iostream>\nusing namespace std;\nint main() {\n    int arr[4] = {10, 20, 30, 40};\n    int* p = arr;\n\n    // TODO: move p to point at the third element (30)\n\n    cout << *p << endl;\n    return 0;\n}",
        expectedOutput: "30",
        hint: "p = p + 2;  moves forward two elements.",
        note: "`p = p + 2;` lands on arr[2] = 30. You just navigated memory with pointer arithmetic!",
      },
      {
        kind: "info",
        story: "Lesson complete — arrays and pointers are two views of the same thing!",
        note: "Recap:  arrays are contiguous;  pointer + N steps N elements;  arr[i] == *(p + i). Beware going past the end (out-of-bounds). Now enter the Voidwalk!",
      },
    ],
  },

  // =====================================================================
  smart: {
    title: "Smart Pointers — automatic, safe heap memory",
    blurb: "unique_ptr & shared_ptr: heap memory that frees itself.",
    steps: [
      {
        kind: "info",
        story: "Raw new/delete is easy to get wrong \u2014 forget delete (leak), use after delete (dangling), or delete twice (double free).",
        code: ["int* p = new int(7);", "// ... lots of code ...", "delete p;   // easy to forget!"],
        memory: [
          { id: "p", name: "p (raw)", addr: "0x4000", value: "0x7000", region: "stack", kind: "ptr", pointsTo: "h" },
          { id: "h", name: "(heap)", addr: "0x7000", value: "7", region: "heap", kind: "int" },
        ],
        note: "Modern C++ fixes this with SMART POINTERS \u2014 objects that own heap memory and free it for you automatically.",
      },
      {
        kind: "info",
        story: "A unique_ptr owns ONE heap object and deletes it automatically.",
        code: ["#include <memory>", "unique_ptr<int> p = make_unique<int>(7);", "// use *p just like a normal pointer"],
        memory: [
          { id: "p", name: "p (unique_ptr)", addr: "0x4100", value: "owns \u2192", region: "stack", kind: "ptr", pointsTo: "h" },
          { id: "h", name: "(heap)", addr: "0x7100", value: "7", region: "heap", kind: "int" },
        ],
        note: "You still use *p to read the value. But you NEVER write delete \u2014 the unique_ptr does it for you when it goes out of scope. This automatic cleanup is called RAII.",
      },
      {
        kind: "trace",
        story: "Watch a unique_ptr clean up by itself at the end of its scope.",
        lines: ["{", "  auto p = make_unique<int>(7);", "  cout << *p;   // 7", "}  // p leaves scope"],
        memory: [
          { id: "p", name: "p (unique_ptr)", addr: "0x4200", value: "owns \u2192", region: "stack", kind: "ptr", pointsTo: "h" },
          { id: "h", name: "(heap)", addr: "0x7200", value: "7", region: "heap", kind: "int" },
        ],
        steps: [
          { line: 1, highlight: "h", note: "make_unique allocates a heap int (7); p owns it." },
          { line: 2, highlight: "h", note: "*p reads the value: 7. Use it like a normal pointer." },
          { line: 3, highlight: "h", free: "h", note: "Scope ends -> p is destroyed -> it AUTOMATICALLY deletes the heap block. No leak, no dangling, no double free!" },
        ],
        note: "The heap memory's lifetime is tied to the owner. That's the whole idea.",
      },
      {
        kind: "input",
        story: "Name the tool for single ownership.",
        code: ["________ p = make_unique<int>(1);"],
        prompt: "Type the smart-pointer TYPE that gives single ownership of an int.",
        accept: ["unique_ptr<int>", "std::unique_ptr<int>"],
        hint: "unique_ptr, holding an int, in angle brackets.",
        placeholder: "e.g. name<int>",
        success: "Correct \u2014 unique_ptr<int> owns the heap int and frees it automatically.",
        note: "unique_ptr can't be copied (no two owners = no double free). Transfer ownership with std::move.",
      },
      {
        kind: "info",
        story: "Need several owners? shared_ptr counts references.",
        code: ["auto a = make_shared<int>(9);", "auto b = a;   // both own it, count = 2"],
        memory: [
          { id: "a", name: "a (shared)", addr: "0x4300", value: "owns \u2192", region: "stack", kind: "ptr", pointsTo: "h" },
          { id: "b", name: "b (shared)", addr: "0x4308", value: "owns \u2192", region: "stack", kind: "ptr", pointsTo: "h" },
          { id: "h", name: "(heap, refs=2)", addr: "0x7300", value: "9", region: "heap", kind: "int" },
        ],
        note: "shared_ptr keeps a reference COUNT. Copying adds 1; each destruction subtracts 1. The object is deleted only when the count reaches 0 \u2014 so it lives exactly as long as it's needed.",
      },
      {
        kind: "info",
        story: "Lesson complete \u2014 you've mastered modern memory management!",
        note: "Recap:  unique_ptr = one owner, auto-freed.  shared_ptr = many owners, freed when the last one goes.  Both prevent leaks, dangling, and double frees. Now end the corruption in the Corrupted Core!",
      },
    ],
  },
};
