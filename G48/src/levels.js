// Level path: mixes stacks & queues from the start, introduces the operation
// words (push/pop/enqueue/dequeue) in level 1, and stays short (5 levels).
import {
  gQueueNext, gStackNext, gIdentifyType, gVocab,
  gTapActiveFrame,
  gArrangeQueue, gArrangeStack, gStackOps,
  gServeQueue, gClearStack, gUnwindStack,
  gCallStackTop, gCallStackReturn,
  gQueueLast, gStackBottom, gMixedFirst, gMixedLast, gMixedServe,
  gExpressLane, gDequeueSpot, gPushSpot,
  gPeekFront, gBigClearStack, gBigServeQueue, gLongQueueNext, gArrangeExpress, gAfterPush,
  gUndoStack, gBrowserBack, gPrintQueue, gDeliTicket, gReverseTool, gBracketMatch,
  gSortStackQueue, gSortOps, gMemoryTop, gMemoryFront,
  gTrueFalse, gWhichStructure, gOddOneOut,
} from './microgames.js';

export const LEVELS = [
  {
    id: 1, name: 'BASICS', sub: 'Lines, piles & the words for them',
    color: '#4ecdc4',
    lesson: {
      title: 'LINES vs PILES', color: '#4ecdc4', visual: 'ops',
      lines: ['LINE: serve the FRONT first (DEQUEUE).', 'PILE: take the TOP first (POP).', 'Add with ENQUEUE (back) or PUSH (top).'],
    },
    // basics + operation words + true/false + which-structure for variety
    pool: [gQueueNext, gStackNext, gVocab, gPushSpot, gDequeueSpot,
      gTrueFalse, gWhichStructure, gStackBottom, gQueueLast, gMixedFirst],
    startTime: 3.5, rounds: 8,
  },
  {
    id: 2, name: 'DONT GUESS', sub: 'FIFO / FILO under pressure',
    color: '#ffd15c',
    lesson: {
      title: 'READ FAST', color: '#ffd15c', visual: 'stack',
      lines: ['Same shop, faster clock.', 'FIRST or LAST? LINE or PILE?', 'PUSH, POP, ENQUEUE, DEQUEUE too.'],
    },
    pool: [gMixedFirst, gMixedLast, gMixedServe, gTrueFalse, gWhichStructure,
      gVocab, gPushSpot, gDequeueSpot, gStackBottom, gExpressLane,
      gSortOps, gMemoryTop, gMemoryFront, gOddOneOut],
    startTime: 3.1, rounds: 9,
  },
  {
    id: 3, name: 'IN ORDER', sub: 'Arrange, serve & trace sequences',
    color: '#ff9f5c',
    lesson: {
      title: 'ORDER MATTERS', color: '#ff9f5c', visual: 'queue',
      lines: ['Serve or clear the WHOLE sequence.', 'Trace pushes and pops in order.', 'Sort things into the right structure.'],
    },
    pool: [gArrangeQueue, gArrangeStack, gServeQueue, gClearStack, gMixedServe,
      gStackOps, gSortOps, gSortStackQueue, gMemoryTop, gTrueFalse,
      gArrangeExpress, gOddOneOut, gWhichStructure],
    startTime: 2.9, rounds: 9,
  },
  {
    id: 4, name: 'REAL WORLD', sub: 'Where stacks & queues actually live',
    color: '#6be585',
    lesson: {
      title: 'IN THE WILD', color: '#6be585', visual: 'stack',
      lines: ['UNDO and browser BACK are STACKS.', 'Printers and ticket lines are QUEUES.', 'Same rules, real situations!'],
    },
    pool: [gUndoStack, gBrowserBack, gPrintQueue, gDeliTicket, gReverseTool,
      gBracketMatch, gSortStackQueue, gWhichStructure, gOddOneOut, gTrueFalse],
    startTime: 3.2, rounds: 9,
  },
  {
    id: 5, name: 'RUSH HOUR', sub: 'Call stack + everything, endless',
    color: '#f78fb3',
    lesson: {
      title: 'RUSH HOUR!', color: '#f78fb3', visual: 'frames',
      lines: ['Function calls PUSH frames; returns POP.', 'Every microgame, no warnings.', 'How long can you survive?'],
    },
    pool: [gQueueNext, gStackNext, gMixedFirst, gMixedLast, gQueueLast, gStackBottom,
      gVocab, gPushSpot, gDequeueSpot, gExpressLane, gPeekFront, gAfterPush,
      gTrueFalse, gWhichStructure, gOddOneOut,
      gArrangeQueue, gArrangeStack, gArrangeExpress, gServeQueue, gClearStack, gMixedServe,
      gBigClearStack, gBigServeQueue, gLongQueueNext,
      gUndoStack, gBrowserBack, gPrintQueue, gDeliTicket, gReverseTool, gBracketMatch,
      gSortStackQueue, gSortOps, gMemoryTop, gMemoryFront,
      gStackOps, gCallStackTop, gCallStackReturn, gTapActiveFrame, gUnwindStack],
    startTime: 2.6, rounds: Infinity,
  },
];
