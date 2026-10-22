// Microgame definitions. Each microgame is a factory that returns an object
// implementing: prompt (string), topic (string), and either
//  - a multiple-choice set of options with a correct index, OR
//  - a drag-arrange puzzle.
// The MicrogameScene renders these generically so we can add many quickly.

import { choice, shuffle, randInt } from './engine.js';
import { productKey2 as productKey } from './pixelart.js';

// Topic ids used for the end-of-run report card.
export const TOPICS = {
  QUEUE_FIFO: 'Queue (FIFO)',
  STACK_FILO: 'Stack (FILO)',
  OPS: 'Operations (push/pop/enqueue/dequeue)',
  CALLSTACK: 'The Call Stack',
  APPLIED: 'Real-World Uses',
};

const NAMES = ['Ana', 'Bo', 'Cy', 'Dee', 'Eli', 'Fin', 'Gus', 'Hana', 'Ivy', 'Jo'];

// ---- helpers to build the microgame shapes ----
function mc(topic, prompt, options, correctIndex, explain, extra = {}) {
  return { kind: 'mc', topic, prompt, options, correctIndex, explain, ...extra };
}
function arrange(topic, prompt, items, correctOrder, explain, slotLabel) {
  // items: [{label}], correctOrder: array of item indices in target order
  return { kind: 'arrange', topic, prompt, items, correctOrder, explain, slotLabel };
}
// TAP: click directly on the correct sprite in the scene.
// entities: array describing sprites; correctId = which one to tap.
function tap(topic, prompt, structure, entities, correctId, explain) {
  return { kind: 'tap', topic, prompt, structure, entities, correctId, explain };
}
// SERVE: click sprites in the CORRECT ORDER to clear the whole structure.
// order = array of entity ids in the required click order.
function serve(topic, prompt, structure, entities, order, explain) {
  return { kind: 'serve', topic, prompt, structure, entities, order, explain };
}
// BINS: drag each item into one of TWO labeled bins.
// items: [{label, bin}] where bin is 0 or 1 (correct bin). binLabels: [L,R].
function bins(topic, prompt, items, binLabels, explain) {
  return { kind: 'bins', topic, prompt, items, binLabels, explain };
}
// MEMORY: show a stack briefly, hide it, then tap the answer among choices.
// choices: array of {label}; correctId = index.
function memory(topic, prompt, revealItems, choices, correctId, explain) {
  return { kind: 'memory', topic, prompt, revealItems, choices, correctId, explain };
}
// TRUEFALSE: a statement; tap the big check or cross. answer = true|false.
function truefalse(topic, prompt, answer, explain) {
  return { kind: 'truefalse', topic, prompt, answer, explain };
}
// CHOICE: two big word buttons (e.g. STACK vs QUEUE). correctId = 0 or 1.
function choose(topic, prompt, labels, correctId, explain) {
  return { kind: 'choice', topic, prompt, labels, correctId, explain };
}

// =========================================================
// EASY microgames (single concept)
// =========================================================

// Queue: who gets served next? (front = first in)
export function gQueueNext() {
  const n = randInt(3, 4);
  const people = shuffle(NAMES).slice(0, n);
  const entities = people.map((name, i) => ({ id: i, label: name, type: 'person' }));
  // index 0 = FRONT = served next
  return tap(TOPICS.QUEUE_FIFO,
    'SERVE NEXT!',
    'queue', entities, 0,
    'A queue is FIFO. The FRONT of the line (waited longest) is served first.');
}

// Stack: tap the product you can grab first (top = last placed)
export function gStackNext() {
  const n = randInt(3, 4);
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, kind: productKey(randInt(0, 7)), type: 'product' });
  return tap(TOPICS.STACK_FILO,
    'GRAB ONE!',
    'stack', entities, n - 1,
    'A stack is FILO. Only the TOP item (placed last) can be taken first.');
}

// Identify FIFO vs FILO: tap the FRONT of the shown structure.
export function gIdentifyType() {
  const isQueue = Math.random() < 0.5;
  if (isQueue) {
    const n = randInt(3, 4);
    const people = shuffle(NAMES).slice(0, n);
    const entities = people.map((name, i) => ({ id: i, label: name, type: 'person' }));
    return tap(TOPICS.OPS, 'WHO LEAVES FIRST?',
      'queue', entities, 0,
      'FIFO = First In First Out. The front leaves first.');
  }
  const n = randInt(3, 4);
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, kind: productKey(randInt(0, 7)), type: 'product' });
  return tap(TOPICS.OPS, 'WHAT LEAVES FIRST?',
    'stack', entities, n - 1,
    'FILO = First In Last Out. The top (last placed) leaves first.');
}

// Operation vocabulary as a tap: highlight where the named op acts.
export function gVocab() {
  const kind = choice(['push', 'pop', 'enqueue', 'dequeue']);
  if (kind === 'push' || kind === 'pop') {
    const n = randInt(3, 4);
    const entities = [];
    for (let i = 0; i < n; i++) entities.push({ id: i, kind: productKey(randInt(0, 7)), type: 'product' });
    // push targets the top (new goes on top); pop removes the top
    return tap(TOPICS.OPS,
      kind === 'push' ? 'PUSH!' : 'POP!',
      'stack', entities, n - 1,
      kind === 'push' ? 'PUSH adds to the TOP of a stack — tap the top.' : 'POP removes from the TOP of a stack — tap the top.');
  }
  const n = randInt(3, 4);
  const people = shuffle(NAMES).slice(0, n);
  const entities = people.map((name, i) => ({ id: i, label: name, type: 'person' }));
  // enqueue adds at back (last index); dequeue serves front (index 0)
  return tap(TOPICS.OPS,
    kind === 'enqueue' ? 'ENQUEUE!' : 'DEQUEUE!',
    'queue', entities, kind === 'enqueue' ? n - 1 : 0,
    kind === 'enqueue' ? 'ENQUEUE adds to the BACK of a queue — tap the back.' : 'DEQUEUE removes from the FRONT of a queue — tap the front.');
}

// =========================================================
// MEDIUM microgames
// =========================================================

// Arrange a queue: put people in the order they'll be SERVED
export function gArrangeQueue() {
  const n = randInt(3, 3);
  const people = shuffle(NAMES).slice(0, n);
  // They "arrive" in this order: people[0] first. Serve order = same (FIFO).
  return arrange(TOPICS.QUEUE_FIFO,
    'SERVE ORDER?',
    people.map((p) => ({ label: p })),
    people.map((_, i) => i), // already arrival order == serve order
    'FIFO: serve order equals arrival order. First to arrive is served first.',
    'SERVE ORDER (FIRST ON LEFT)');
}

// Arrange a stack: order items will be REMOVED
export function gArrangeStack() {
  const n = 3;
  const placed = shuffle(NAMES).slice(0, n); // placed[0] first placed (bottom)
  const removeOrder = placed.slice().reverse(); // FILO
  return arrange(TOPICS.STACK_FILO,
    'REMOVE ORDER?',
    placed.map((p) => ({ label: p })),
    placed.map((_, i) => n - 1 - i),
    'FILO: the last item placed is removed first. Remove order reverses placement.',
    'REMOVE ORDER (FIRST ON LEFT)');
}

// Sequence of ops on a stack, then tap the item now on TOP.
export function gStackOps() {
  const ops = [];
  const stack = []; // holds letters
  const letters = ['A', 'B', 'C', 'D', 'E'];
  let li = 0;
  const steps = randInt(4, 5);
  for (let i = 0; i < steps; i++) {
    if (stack.length === 0 || Math.random() < 0.62) {
      const x = letters[li++]; stack.push(x); ops.push('PUSH ' + x);
    } else {
      ops.push('POP'); stack.pop();
    }
  }
  if (stack.length === 0) { stack.push('A'); ops.push('PUSH A'); }
  // build entities from the resulting stack, bottom->top
  const entities = stack.map((letter, i) => ({ id: i, label: letter, type: 'frame' }));
  return tap(TOPICS.STACK_FILO,
    'TAP THE TOP',
    'stack', entities, entities.length - 1,
    'Track pushes (add to top) and pops (remove top). The last item still pushed sits on top.');
}

// =========================================================
// HARD microgames — the call stack payoff
// =========================================================

// Call stack: tap the frame running now (top = deepest call).
export function gCallStackTop() {
  const n = randInt(3, 4);
  // bottom->top: fact(n) at bottom, fact(1) on top
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, label: `FACT(${n - i})`, type: 'frame' });
  return tap(TOPICS.CALLSTACK,
    'RUNNING NOW?',
    'stack', entities, n - 1,
    'Each call PUSHES a frame. The most recent call (deepest) sits on top and runs first.');
}

// Call stack: tap the frame that returns (pops) first.
export function gCallStackReturn() {
  const n = randInt(3, 4);
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, label: `F(${n - i})`, type: 'frame' });
  return tap(TOPICS.CALLSTACK,
    'RETURNS FIRST?',
    'stack', entities, n - 1,
    'The call stack is FILO. The deepest (top) frame returns first, then unwinds upward.');
}

// =========================================================
// TAP microgames — click directly on the correct sprite
// =========================================================

// Tap the call-stack frame that is running / returns first (top).
export function gTapActiveFrame() {
  const n = randInt(3, 4);
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, label: `f(${n - i})`, type: 'frame' });
  // entities index 0 = bottom (main-ish), n-1 = top = active
  return tap(TOPICS.CALLSTACK,
    'RUNNING NOW?',
    'stack', entities, n - 1,
    'The most recent call sits on TOP and runs first; it also returns (pops) first.');
}

// =========================================================
// SERVE microgames — click sprites in the correct order
// =========================================================

// Clear the whole QUEUE by tapping front-to-back (FIFO order).
export function gServeQueue() {
  const n = randInt(3, 4);
  const people = shuffle(NAMES).slice(0, n);
  const entities = people.map((name, i) => ({ id: i, label: name, type: 'person' }));
  // must serve front first: index 0, then 1, ...
  const order = entities.map((e) => e.id);
  return serve(TOPICS.QUEUE_FIFO,
    'SERVE ALL!',
    'queue', entities, order,
    'FIFO: serve from the FRONT each time — first in, first out.');
}

// Clear the whole STACK by tapping top-to-bottom (FILO order).
export function gClearStack() {
  const n = randInt(3, 4);
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, kind: productKey(randInt(0, 7)), type: 'product' });
  // must remove top first: index n-1, then n-2, ...
  const order = entities.map((e) => e.id).reverse();
  return serve(TOPICS.STACK_FILO,
    'CLEAR ALL!',
    'stack', entities, order,
    'FILO: always take from the TOP — last in, first out.');
}

// Unwind the call stack: pop frames top-to-bottom as they return.
export function gUnwindStack() {
  const n = randInt(3, 4);
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, label: `f(${n - i})`, type: 'frame' });
  const order = entities.map((e) => e.id).reverse(); // top returns first
  return serve(TOPICS.CALLSTACK,
    'UNWIND ALL!',
    'stack', entities, order,
    'Frames return top-down: the deepest call finishes first, then control unwinds upward.');
}

// =========================================================
// MORE VARIETY — same supermarket setting, new questions
// =========================================================

// Queue: tap who is served LAST (the back of the line).
export function gQueueLast() {
  const n = randInt(3, 4);
  const people = shuffle(NAMES).slice(0, n);
  const entities = people.map((name, i) => ({ id: i, label: name, type: 'person' }));
  return tap(TOPICS.QUEUE_FIFO, 'SERVED LAST?',
    'queue', entities, n - 1,
    'FIFO: the person who just joined at the BACK is served last.');
}

// Stack: tap the item that is HARDEST to reach (the bottom, removed last).
export function gStackBottom() {
  const n = randInt(3, 4);
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, kind: productKey(randInt(0, 7)), type: 'product' });
  return tap(TOPICS.STACK_FILO, 'REMOVED LAST?',
    'stack', entities, 0,
    'FILO: the FIRST item placed (bottom) is buried and comes off LAST.');
}

// MIXED: randomly a queue OR a stack, with the matching "what comes off first"
// prompt. This stops you from guessing the same answer every round.
export function gMixedFirst() {
  const isQueue = Math.random() < 0.5;
  const n = randInt(3, 4);
  if (isQueue) {
    const people = shuffle(NAMES).slice(0, n);
    const entities = people.map((name, i) => ({ id: i, label: name, type: 'person' }));
    return tap(TOPICS.QUEUE_FIFO, 'WHO LEAVES FIRST?',
      'queue', entities, 0, 'A queue is FIFO — the FRONT leaves first.');
  }
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, kind: productKey(randInt(0, 7)), type: 'product' });
  return tap(TOPICS.STACK_FILO, 'WHAT LEAVES FIRST?',
    'stack', entities, n - 1, 'A stack is FILO — the TOP leaves first.');
}

// MIXED: randomly queue or stack asking for what leaves LAST. Extra tricky.
export function gMixedLast() {
  const isQueue = Math.random() < 0.5;
  const n = randInt(3, 4);
  if (isQueue) {
    const people = shuffle(NAMES).slice(0, n);
    const entities = people.map((name, i) => ({ id: i, label: name, type: 'person' }));
    return tap(TOPICS.QUEUE_FIFO, 'WHO LEAVES LAST?',
      'queue', entities, n - 1, 'Queue FIFO — the BACK of the line leaves last.');
  }
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, kind: productKey(randInt(0, 7)), type: 'product' });
  return tap(TOPICS.STACK_FILO, 'WHAT LEAVES LAST?',
    'stack', entities, 0, 'Stack FILO — the BOTTOM item leaves last.');
}

// MIXED serve: clear a random structure in the correct order (queue OR stack).
export function gMixedServe() {
  const isQueue = Math.random() < 0.5;
  const n = randInt(3, 4);
  if (isQueue) {
    const people = shuffle(NAMES).slice(0, n);
    const entities = people.map((name, i) => ({ id: i, label: name, type: 'person' }));
    return serve(TOPICS.QUEUE_FIFO, 'SERVE ALL!',
      'queue', entities, entities.map((e) => e.id),
      'FIFO: serve front-to-back.');
  }
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, kind: productKey(randInt(0, 7)), type: 'product' });
  return serve(TOPICS.STACK_FILO, 'CLEAR ALL!',
    'stack', entities, entities.map((e) => e.id).reverse(),
    'FILO: remove top-to-bottom.');
}

// Express lane: tap the shopper carrying the FEWEST items (still a queue vibe).
export function gExpressLane() {
  const n = randInt(3, 4);
  const people = shuffle(NAMES).slice(0, n);
  const counts = shuffle([1, 5, 8, 12].slice(0, n));
  let minI = 0;
  for (let i = 1; i < n; i++) if (counts[i] < counts[minI]) minI = i;
  const entities = people.map((name, i) => ({ id: i, label: name + ' (' + counts[i] + ')', type: 'person' }));
  return tap(TOPICS.QUEUE_FIFO, 'FEWEST ITEMS?',
    'queue', entities, minI,
    'A twist on ordering: read each shopper and pick the smallest basket.');
}

// Vocab reverse: name the operation by tapping the acting spot, queue version.
export function gDequeueSpot() {
  const n = randInt(3, 4);
  const people = shuffle(NAMES).slice(0, n);
  const entities = people.map((name, i) => ({ id: i, label: name, type: 'person' }));
  return tap(TOPICS.OPS, 'DEQUEUE!',
    'queue', entities, 0, 'DEQUEUE removes from the FRONT of the queue.');
}
export function gPushSpot() {
  const n = randInt(3, 4);
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, kind: productKey(randInt(0, 7)), type: 'product' });
  return tap(TOPICS.OPS, 'PUSH!',
    'stack', entities, n - 1, 'PUSH adds a new item to the TOP of the stack.');
}

// ---- NEW variety mechanics ----

// PEEK vs REMOVE: which one gets taken now? (reinforces 'only the end moves')
export function gPeekFront() {
  const n = randInt(4, 5);
  const people = shuffle(NAMES).slice(0, n);
  const entities = people.map((name, i) => ({ id: i, label: name, type: 'person' }));
  // sometimes ask front, sometimes back, with a middle decoy emphasized
  const askBack = Math.random() < 0.5;
  return tap(TOPICS.QUEUE_FIFO,
    askBack ? 'JOIN THE LINE!' : 'CALL NEXT!',
    'queue', entities, askBack ? n - 1 : 0,
    askBack ? 'New arrivals ALWAYS join the BACK of a queue.' : 'The FRONT of the queue is always served next.');
}

// REVERSED serve: serve a stack that must go top->bottom, longer (5 items).
export function gBigClearStack() {
  const n = 5;
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, kind: productKey(randInt(0, 7)), type: 'product' });
  return serve(TOPICS.STACK_FILO, 'CLEAR ALL!',
    'stack', entities, entities.map((e) => e.id).reverse(),
    'FILO: always take the TOP. Work all the way down.');
}

// REVERSED serve: serve a long line front->back (5 people).
export function gBigServeQueue() {
  const n = 5;
  const people = shuffle(NAMES).slice(0, n);
  const entities = people.map((name, i) => ({ id: i, label: name, type: 'person' }));
  return serve(TOPICS.QUEUE_FIFO, 'SERVE ALL!',
    'queue', entities, entities.map((e) => e.id),
    'FIFO: serve the front each time until the line is empty.');
}

// MIDDLE trap: tap the front, but the line is long so the middle is tempting.
export function gLongQueueNext() {
  const n = 5;
  const people = shuffle(NAMES).slice(0, n);
  const entities = people.map((name, i) => ({ id: i, label: name, type: 'person' }));
  return tap(TOPICS.QUEUE_FIFO, 'SERVE NEXT!',
    'queue', entities, 0, 'No matter how long the line, the FRONT goes first (FIFO).');
}

// ARRANGE by basket size (express lane ordering) — sort people small->big.
export function gArrangeExpress() {
  const n = 3;
  const people = shuffle(NAMES).slice(0, n);
  const counts = shuffle([2, 6, 11]);
  // correct order = ascending basket size
  const order = counts.map((c, i) => i).sort((a, b) => counts[a] - counts[b]);
  return arrange(TOPICS.QUEUE_FIFO,
    'SORT: FEWEST FIRST',
    people.map((p, i) => ({ label: p + ' ' + counts[i] })),
    order,
    'Not FIFO here — read the numbers and order them smallest to largest.',
    'FEWEST ITEMS FIRST');
}

// PUSH result: after pushing a NEW item, tap what is now on top.
export function gAfterPush() {
  const n = randInt(3, 4);
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, kind: productKey(randInt(0, 7)), type: 'product' });
  return tap(TOPICS.OPS, 'POP!',
    'stack', entities, n - 1, 'After a PUSH, that new top item is exactly what a POP removes next.');
}

// =========================================================
// APPLIED / CREATIVE — real-world uses of stacks & queues
// =========================================================

// UNDO STACK: typed some letters, hit UNDO n times — tap the letter still shown.
export function gUndoStack() {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const typed = randInt(3, 4);
  const undos = randInt(1, typed - 1);
  const remaining = typed - undos; // letters still on screen (stack)
  // entities are the letters still visible, bottom..top
  const entities = [];
  for (let i = 0; i < remaining; i++) entities.push({ id: i, label: letters[i], type: 'frame' });
  return tap(TOPICS.APPLIED,
    `UNDO x${undos} - TAP THE TOP`,
    'stack', entities, remaining - 1,
    'UNDO is a STACK: each keystroke is pushed; UNDO pops the most recent one off the top.');
}

// BROWSER HISTORY (back stack): visited pages, hit BACK — tap current page.
export function gBrowserBack() {
  const pages = ['HOME', 'NEWS', 'SHOP', 'CART', 'PAY'];
  const visited = randInt(3, 4);
  const backs = randInt(1, visited - 1);
  const cur = visited - backs; // current page index (1-based count)
  const entities = [];
  for (let i = 0; i < visited - backs; i++) entities.push({ id: i, label: pages[i], type: 'frame' });
  return tap(TOPICS.APPLIED,
    `BACK x${backs} - CURRENT PAGE?`,
    'stack', entities, cur - 1,
    'The browser BACK button is a STACK: pages push on as you visit; BACK pops to the previous top.');
}

// PRINT QUEUE: documents sent to a printer — tap which prints next (FIFO).
export function gPrintQueue() {
  const docs = ['DOC1', 'DOC2', 'DOC3', 'DOC4'];
  const n = randInt(3, 4);
  const entities = [];
  for (let i = 0; i < n; i++) entities.push({ id: i, label: docs[i], type: 'frame', structure: 'queue' });
  // render as a queue (horizontal). Front (index 0) prints next.
  return tap(TOPICS.APPLIED,
    'PRINTS NEXT?',
    'queueframe', entities, 0,
    'A printer uses a QUEUE (FIFO): the first document sent is the first one printed.');
}

// DELI COUNTER: ticket numbers — now serving X, tap who is next.
export function gDeliTicket() {
  const start = randInt(40, 60);
  const n = randInt(3, 4);
  // people hold tickets start, start+1, ... in random visual order
  const tickets = [];
  for (let i = 0; i < n; i++) tickets.push(start + i);
  const order = shuffle(tickets.map((_, i) => i));
  const nowServing = start - 1;
  const entities = order.map((idx, pos) => ({ id: pos, label: '#' + tickets[idx], ticket: tickets[idx], type: 'person' }));
  // next = the smallest ticket number
  let minPos = 0;
  for (let i = 1; i < entities.length; i++) if (entities[i].ticket < entities[minPos].ticket) minPos = i;
  return tap(TOPICS.APPLIED,
    `SERVING #${nowServing} - WHO NEXT?`,
    'queue', entities, minPos,
    'A ticket line is a QUEUE: the lowest (oldest) number is served next — FIFO.');
}

// REVERSE tool: which structure reverses a sequence? (stack) vs keeps order (queue)
export function gReverseTool() {
  const wantReverse = Math.random() < 0.5;
  const entities = [
    { id: 0, label: 'STACK', type: 'frame' },
    { id: 1, label: 'QUEUE', type: 'frame' },
  ];
  return tap(TOPICS.APPLIED,
    wantReverse ? 'REVERSE A LIST?' : 'KEEP THE ORDER?',
    'stack', entities, wantReverse ? 0 : 1,
    wantReverse ? 'A STACK reverses order (last in, first out).' : 'A QUEUE preserves order (first in, first out).');
}

// BRACKET MATCH: tap the bracket that closes the most-recently-opened one.
export function gBracketMatch() {
  // show a row of opening brackets; the LAST opened must close first (stack)
  const opens = shuffle(['(', '[', '{']).slice(0, randInt(2, 3));
  const entities = opens.map((b, i) => ({ id: i, label: b, type: 'frame' }));
  return tap(TOPICS.APPLIED,
    'CLOSES FIRST?',
    'queueframe', entities, opens.length - 1,
    'Matching brackets uses a STACK: the LAST opened bracket must be the FIRST closed.');
}

// =========================================================
// NEW MECHANICS — sorting bins & memory recall
// =========================================================

// BIN SORT: drag each real-world example into STACK or QUEUE bin.
export function gSortStackQueue() {
  const examples = [
    { label: 'UNDO', bin: 0 }, { label: 'BACK BTN', bin: 0 }, { label: 'BRACKETS', bin: 0 },
    { label: 'PRINTER', bin: 1 }, { label: 'TICKET LINE', bin: 1 }, { label: 'CHECKOUT', bin: 1 },
  ];
  const pick = shuffle(examples).slice(0, 4);
  return bins(TOPICS.APPLIED,
    'STACK OR QUEUE?',
    pick, ['STACK', 'QUEUE'],
    'Last-in-first-out things are STACKS (undo, back, brackets); first-in-first-out things are QUEUES (printer, lines).');
}

// BIN SORT: which OPERATION goes with STACK vs QUEUE.
export function gSortOps() {
  const ops = [
    { label: 'PUSH', bin: 0 }, { label: 'POP', bin: 0 },
    { label: 'ENQUEUE', bin: 1 }, { label: 'DEQUEUE', bin: 1 },
  ];
  const pick = shuffle(ops).slice(0, 4);
  return bins(TOPICS.OPS,
    'SORT THE OPS!',
    pick, ['STACK', 'QUEUE'],
    'PUSH/POP act on a STACK. ENQUEUE/DEQUEUE act on a QUEUE.');
}

// MEMORY: flash a stack, hide it, then tap what was on TOP.
export function gMemoryTop() {
  const n = randInt(3, 4);
  const letters = shuffle(['A', 'B', 'C', 'D', 'E']).slice(0, n);
  const reveal = letters.map((l, i) => ({ id: i, label: l, type: 'frame' })); // bottom..top
  const topLabel = letters[n - 1];
  const choices = shuffle(letters).map((l) => ({ label: l }));
  return memory(TOPICS.STACK_FILO,
    'WHAT WAS ON TOP?',
    reveal, choices, choices.findIndex((c) => c.label === topLabel),
    'The TOP of a stack is the last item placed — the first that would pop.');
}

// MEMORY: flash a queue, hide it, then tap who was at the FRONT.
export function gMemoryFront() {
  const n = randInt(3, 4);
  const names = shuffle(NAMES).slice(0, n);
  const reveal = names.map((nm, i) => ({ id: i, label: nm, type: 'person' })); // front..back
  const frontLabel = names[0];
  const choices = shuffle(names).map((nm) => ({ label: nm }));
  return memory(TOPICS.QUEUE_FIFO,
    'WHO WAS IN FRONT?',
    reveal, choices, choices.findIndex((c) => c.label === frontLabel),
    'The FRONT of a queue is served first — first in, first out.');
}

// Registries ---------------------------------------------------------------
export const APPLIED = [gUndoStack, gBrowserBack, gPrintQueue, gDeliTicket, gReverseTool, gBracketMatch];

// =========================================================
// TRUE/FALSE — tap the check or the cross
// =========================================================
export function gTrueFalse() {
  const statements = [
    ['A QUEUE SERVES THE OLDEST ITEM FIRST', true, 'True — a queue is FIFO, oldest (front) first.'],
    ['A STACK REMOVES THE OLDEST ITEM FIRST', false, 'False — a stack is FILO, it removes the NEWEST (top) first.'],
    ['PUSH ADDS TO THE TOP OF A STACK', true, 'True — push always adds on top.'],
    ['DEQUEUE REMOVES FROM THE BACK OF A QUEUE', false, 'False — dequeue removes from the FRONT.'],
    ['THE CALL STACK RETURNS THE NEWEST FRAME FIRST', true, 'True — the deepest/newest call returns first (FILO).'],
    ['A PRINTER QUEUE PRINTS THE LAST JOB FIRST', false, 'False — a queue prints the FIRST job sent first.'],
    ['UNDO IS A STACK', true, 'True — undo pops the most recent action off a stack.'],
    ['ENQUEUE ADDS TO THE FRONT OF A QUEUE', false, 'False — enqueue adds to the BACK.'],
    ['POPPING A STACK REVERSES THE PUSH ORDER', true, 'True — last in, first out reverses the order.'],
    ['A LINE AT A REGISTER IS A STACK', false, 'False — a line is a QUEUE (first come, first served).'],
  ];
  const s = choice(statements);
  return truefalse(TOPICS.OPS, s[0], s[1], s[2]);
}

// =========================================================
// STACK-OR-QUEUE — tap the big word that fits the scenario
// =========================================================
export function gWhichStructure() {
  const cases = [
    ['CARS IN A DRIVE-THRU LANE', 1, 'A single lane is a QUEUE — first in, first served.'],
    ['PLATES STACKED IN A CUPBOARD', 0, 'You take the top plate — that is a STACK.'],
    ['PEOPLE BOARDING A BUS IN LINE', 1, 'A boarding line is a QUEUE (FIFO).'],
    ['BULLETS LOADED IN A MAGAZINE', 0, 'Last loaded fires first — a STACK.'],
    ['CUSTOMERS AT A DELI COUNTER', 1, 'Ticket order = QUEUE (FIFO).'],
    ['BROWSER BACK HISTORY', 0, 'Back pops the most recent page — a STACK.'],
    ['SONGS WAITING IN A PLAYLIST', 1, 'Plays in order added — a QUEUE.'],
    ['A PILE OF DIRTY DISHES', 0, 'You wash the top one first — a STACK.'],
  ];
  const c = choice(cases);
  return choose(TOPICS.APPLIED, c[0], ['STACK', 'QUEUE'], c[1], c[2]);
}

// =========================================================
// ODD ONE OUT — tap the item that does NOT belong
// =========================================================
export function gOddOneOut() {
  const stackWords = ['UNDO', 'BACK BTN', 'BRACKETS', 'DISH PILE', 'PLATES'];
  const queueWords = ['PRINTER', 'DELI LINE', 'DRIVE-THRU', 'BUS LINE', 'PLAYLIST'];
  const oddIsQueue = Math.random() < 0.5;
  const base = oddIsQueue ? stackWords : queueWords; // 3 of these
  const odd = oddIsQueue ? queueWords : stackWords;  // 1 of these
  const three = shuffle(base).slice(0, 3);
  const oddOne = choice(odd);
  const labels = shuffle([...three.map((w) => ({ w, odd: false })), { w: oddOne, odd: true }]);
  const entities = labels.map((o, i) => ({ id: i, label: o.w, type: 'frame' }));
  const correctId = labels.findIndex((o) => o.odd);
  return {
    kind: 'tap', topic: TOPICS.APPLIED, structure: 'queueframe',
    prompt: 'TAP THE ODD ONE OUT', entities, correctId,
    explain: oddIsQueue ? 'Three are STACKS; the odd one is a QUEUE.' : 'Three are QUEUES; the odd one is a STACK.',
  };
}

export const MECHANICS = [gSortStackQueue, gSortOps, gMemoryTop, gMemoryFront,
  gTrueFalse, gWhichStructure, gOddOneOut];
export const EASY = [gQueueNext, gStackNext, gIdentifyType, gVocab];
export const MEDIUM = [gArrangeQueue, gArrangeStack, gStackOps, gServeQueue, gClearStack];
export const HARD = [gCallStackTop, gCallStackReturn, gTapActiveFrame, gUnwindStack, gClearStack, gServeQueue];
