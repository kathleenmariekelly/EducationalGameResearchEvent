// Question bank: concept questions (tiers 1-5), code-snippet questions, and the
// two-part boss question. A QuestionPool serves non-repeating, option-shuffled
// questions until a tier/pool is exhausted.

export const CONCEPT = {
  1: [
    { q: "What is a process?",
      options: ["A program stored on disk", "A program in execution",
        "A reserved block of the CPU cache", "A file waiting to be printed",
        "A hardware interrupt line"],
      answer: 1,
      explanation: "A process is a program in execution. The program on disk is passive; once loaded into memory with its own registers, stack and program counter, it becomes an active process." },
    { q: "Which part of the OS decides which process runs next on the CPU?",
      options: ["The loader", "The compiler", "The CPU scheduler", "The file system", "The linker"],
      answer: 2,
      explanation: "The CPU (short-term) scheduler picks which ready process gets the CPU next. It runs very frequently, so it must be fast." },
    { q: "What is the main job of an operating system?",
      options: ["To compile source code", "To manage hardware resources and provide services to programs",
        "To design CPUs", "To render 3D graphics only", "To connect to the internet only"],
      answer: 1,
      explanation: "An OS is a resource manager: it manages the CPU, memory, I/O and files, and provides abstractions so programs don't touch hardware directly." },
    { q: "Which of these is stored in a Process Control Block (PCB)?",
      options: ["The user's password", "The process state, program counter and registers",
        "The monitor resolution", "The Wi-Fi signal strength", "The BIOS version"],
      answer: 1,
      explanation: "The PCB holds everything the OS needs to manage a process: its state, program counter, CPU registers, memory limits, open files, and scheduling info." },
  ],
  2: [
    { q: "What is the key advantage of threads sharing an address space?",
      options: ["They can never cause bugs", "Communication between them is fast and cheap",
        "They never need scheduling", "They run on separate computers", "They eliminate the need for a CPU"],
      answer: 1,
      explanation: "Threads of one process share code, data and heap, so sharing data is cheap. The trade-off: you must synchronize access to avoid race conditions." },
    { q: "In Round Robin scheduling, what is the critical tuning parameter?",
      options: ["Priority", "Time quantum (time slice)", "Arrival order", "Number of CPUs", "Page size"],
      answer: 1,
      explanation: "Round Robin gives each process a fixed time quantum, then preempts it. Too large behaves like FCFS; too small wastes time on context switches." },
    { q: "A context switch requires the OS to...",
      options: ["Reboot the machine", "Save the old process's state and load the next one's",
        "Delete the running process", "Recompile the program", "Format the disk"],
      answer: 1,
      explanation: "During a context switch the running process's context (registers, PC) is saved to its PCB and the next process's context is restored. This is pure overhead." },
    { q: "Which scheduling algorithm gives the minimum average waiting time in theory?",
      options: ["FCFS", "Round Robin", "Shortest Job First", "Last Come First Served", "Random"],
      answer: 2,
      explanation: "Shortest Job First is provably optimal for average waiting time, but it needs to know/predict each job's CPU burst length in advance." },
  ],
  3: [
    { q: "A 'page fault' occurs when...",
      options: ["A page of memory is physically damaged", "The requested page is not currently in physical RAM",
        "Two processes read the same page", "The CPU overheats", "A file is deleted"],
      answer: 1,
      explanation: "A page fault means the page a program accessed isn't in RAM. The OS traps, fetches the page from disk (swap), possibly evicts another page, then resumes." },
    { q: "Paging primarily solves which problem of contiguous allocation?",
      options: ["Internal fragmentation", "External fragmentation", "Deadlock", "Starvation", "Race conditions"],
      answer: 1,
      explanation: "Paging removes external fragmentation: any free frame can hold any page, so memory need not be contiguous. A little internal fragmentation can remain in the last page." },
    { q: "What is a race condition?",
      options: ["Two CPUs running at different clock speeds",
        "When the result depends on the timing/order of concurrent access to shared data",
        "A type of deadlock", "A scheduling policy", "A disk defragmentation step"],
      answer: 1,
      explanation: "A race condition happens when concurrent threads access shared data and the outcome depends on their interleaving. Synchronization (locks/semaphores) prevents it." },
    { q: "What is a 'critical section'?",
      options: ["The most important function in a program",
        "Code that accesses shared data and must run mutually exclusively",
        "The kernel's boot loader", "A damaged disk sector", "The main() function"],
      answer: 1,
      explanation: "A critical section accesses shared resources; only one thread may be inside it at a time. A correct solution needs mutual exclusion, progress, and bounded waiting." },
  ],
  4: [
    { q: "Which is NOT one of the four necessary conditions for deadlock?",
      options: ["Mutual exclusion", "Hold and wait", "Preemption", "No preemption", "Circular wait"],
      answer: 2,
      explanation: "The four Coffman conditions are mutual exclusion, hold-and-wait, NO preemption, and circular wait. Allowing preemption actually helps PREVENT deadlock." },
    { q: "The Banker's Algorithm is a form of deadlock...",
      options: ["Detection", "Avoidance", "Recovery", "Prevention", "Ignorance"],
      answer: 1,
      explanation: "The Banker's Algorithm is deadlock AVOIDANCE: it grants a request only if the system stays in a 'safe state' where every process can still finish." },
    { q: "Which page-replacement algorithm can suffer Belady's anomaly?",
      options: ["LRU", "Optimal (OPT)", "FIFO", "Least Frequently Used", "Most Recently Used"],
      answer: 2,
      explanation: "Belady's anomaly = more frames causing MORE faults. It can happen with FIFO. Stack algorithms like LRU and OPT are immune to it." },
    { q: "Conceptually, how does a mutex differ from a binary semaphore?",
      options: ["They are always identical", "A mutex has ownership (only the locker may unlock it)",
        "A semaphore allows many threads at once", "A mutex cannot be locked", "A semaphore cannot reach zero"],
      answer: 1,
      explanation: "Both allow one thread at a time, but a mutex has ownership: the thread that locked it must unlock it. A semaphore can be signaled by any thread." },
  ],
  5: [
    { q: "In a resource-allocation graph with single-instance resources, a cycle means...",
      options: ["Efficient scheduling", "A guaranteed deadlock", "High throughput", "A page fault", "Nothing at all"],
      answer: 1,
      explanation: "With single-instance resources a cycle in the resource-allocation graph is both necessary AND sufficient for deadlock. With multiple instances it's only necessary." },
    { q: "What is 'thrashing' in virtual memory?",
      options: ["Deleting many files at once", "Spending more time paging in/out than doing useful work",
        "Overheating the CPU", "A fast disk-cache hit", "Encrypting the swap file"],
      answer: 1,
      explanation: "Thrashing occurs when processes have too few frames, so they constantly page-fault. The system spends most of its time swapping pages instead of doing real work." },
    { q: "What does a journaling file system's journal give you?",
      options: ["Faster reads only", "Recovery to a consistent state after a crash",
        "File compression", "Automatic encryption", "Unlimited storage"],
      answer: 1,
      explanation: "A journal records intended changes before applying them, so after a crash the FS can replay or roll back operations and stay consistent." },
    { q: "Why can the Test-and-Set instruction implement a lock correctly?",
      options: ["It is faster than other instructions",
        "It reads and writes a value atomically in one indivisible step",
        "It disables the network", "It runs only in user mode", "It never touches memory"],
      answer: 1,
      explanation: "Test-and-Set is atomic: it reads the old value and sets a new one without interruption. That atomicity is exactly what's needed to build a spinlock safely." },
  ],
};

// Additional questions drawn from Stallings, "Operating Systems: Internals and
// Design Principles" (process model, threads, concurrency, memory, I/O, RAID...).
const STALLINGS = {
  1: [
    { q: "In the five-state process model, which state holds a process waiting for an I/O event to finish?",
      options: ["Ready", "Running", "Blocked (Waiting)", "New", "Exit"],
      answer: 2,
      explanation: "In Stallings' five-state model (New, Ready, Running, Blocked, Exit), a process that cannot continue until an event (e.g., I/O) completes is Blocked/Waiting - distinct from Ready, where it only needs the CPU." },
    { q: "What is the key difference between user mode and kernel mode?",
      options: ["User mode is faster", "Kernel mode can execute privileged instructions and access all hardware",
        "User mode has more memory", "Kernel mode cannot be interrupted", "They are identical on modern CPUs"],
      answer: 1,
      explanation: "A mode bit separates the two: privileged (kernel) mode may run privileged instructions and touch protected resources; user mode cannot, so applications must use system calls to request OS services." },
  ],
  2: [
    { q: "A drawback of PURE user-level threads (ULT) is that:",
      options: ["They cannot share data", "A blocking system call by one thread blocks the entire process",
        "They require special hardware", "They always run in kernel mode", "They cannot be scheduled at all"],
      answer: 1,
      explanation: "With pure ULT the kernel sees only the process, so if one thread makes a blocking system call the whole process (all its threads) blocks. Kernel-level threads avoid this." },
    { q: "In a Symmetric Multiprocessing (SMP) system:",
      options: ["Only one CPU can run the kernel", "All processors share main memory and can run any process or kernel code",
        "Each CPU runs a separate OS", "Processors cannot communicate", "One master CPU controls all slaves"],
      answer: 1,
      explanation: "In SMP all processors are peers sharing main memory and I/O; any processor can execute the kernel and any process. (The master/slave description is asymmetric multiprocessing.)" },
    { q: "Why do modern systems use interrupts instead of pure polling for I/O?",
      options: ["Interrupts are less accurate", "Interrupts let the CPU do other work until a device needs attention",
        "Polling is impossible in hardware", "Interrupts use no CPU time ever", "Polling requires kernel mode"],
      answer: 1,
      explanation: "Interrupts let a device asynchronously signal the CPU, so the processor isn't wasted busy-waiting (polling) and can do useful work until service is required." },
  ],
  3: [
    { q: "Peterson's algorithm is best described as:",
      options: ["A hardware lock instruction", "A software solution to mutual exclusion for two processes",
        "A disk scheduling policy", "A page replacement scheme", "A deadlock recovery method"],
      answer: 1,
      explanation: "Peterson's algorithm is a classic software-only solution guaranteeing mutual exclusion, progress, and bounded waiting for two processes using shared flags and a turn variable." },
    { q: "A monitor (as a concurrency construct) provides:",
      options: ["Busy-waiting only", "Encapsulated shared data with mutually exclusive procedures and condition variables",
        "A scheduling queue", "A type of interrupt", "Hardware atomicity"],
      answer: 1,
      explanation: "A monitor is a high-level construct bundling shared data with procedures that run under mutual exclusion, plus condition variables (wait/signal) for coordination - easier and safer than raw semaphores." },
    { q: "In the bounded-buffer producer/consumer problem, a counting semaphore for 'empty' slots prevents:",
      options: ["The consumer reading too fast", "The producer adding to a full buffer",
        "Deadlock in the scheduler", "Page faults", "Starvation of the CPU"],
      answer: 1,
      explanation: "The 'empty' semaphore counts free slots; a producer must wait on it before inserting, which blocks it when the buffer is full and prevents overwriting unconsumed data." },
  ],
  4: [
    { q: "The buddy system is a technique for:",
      options: ["CPU scheduling", "Memory allocation by repeatedly splitting blocks into power-of-two sizes",
        "Disk scheduling", "Deadlock avoidance", "Thread synchronization"],
      answer: 1,
      explanation: "The buddy system allocates memory in power-of-two blocks, splitting a block into two 'buddies' as needed and coalescing them when freed - a compromise between fixed and dynamic partitioning." },
    { q: "How does segmentation differ from paging?",
      options: ["Segments are fixed-size", "Segments are variable-length logical units and can cause external fragmentation",
        "Segmentation needs no addresses", "Paging uses variable sizes", "They are the same thing"],
      answer: 1,
      explanation: "Segments are variable-length units that match logical divisions (code, stack, data). Because sizes vary, segmentation suffers external fragmentation, unlike fixed-size paging." },
    { q: "What is the purpose of a TLB (Translation Lookaside Buffer)?",
      options: ["Store files", "Cache recent virtual-to-physical page translations to speed address lookup",
        "Schedule threads", "Detect deadlock", "Buffer disk writes"],
      answer: 1,
      explanation: "The TLB is a small fast cache of page-table entries. On a hit, address translation avoids a slow page-table walk in memory, greatly speeding up paged virtual memory." },
  ],
  5: [
    { q: "The SCAN ('elevator') disk-scheduling algorithm:",
      options: ["Serves requests in arrival order", "Moves the head in one direction servicing requests, then reverses",
        "Always serves the closest request", "Picks requests randomly", "Never moves the head"],
      answer: 1,
      explanation: "SCAN sweeps the head toward one end servicing requests along the way, then reverses - like an elevator. It bounds waiting time better than pure SSTF, which can starve far requests." },
    { q: "RAID level 1 provides redundancy through:",
      options: ["Bit-level striping", "Mirroring (duplicating data on a second disk)",
        "Distributed parity", "Dedicated parity disk", "No redundancy"],
      answer: 1,
      explanation: "RAID 1 mirrors data across disks, so a full copy survives a single-disk failure. It gives strong reliability and fast reads at the cost of 50% storage overhead." },
    { q: "A microkernel architecture is characterized by:",
      options: ["Putting all services in the kernel", "A minimal kernel with most OS services running as user-space processes",
        "No kernel at all", "Running only on one CPU", "Eliminating system calls"],
      answer: 1,
      explanation: "A microkernel keeps only essentials (IPC, basic scheduling, low-level memory) in kernel mode and runs services (drivers, file systems) in user space - improving modularity and reliability at some performance cost." },
    { q: "Deadlock DETECTION (vs prevention/avoidance) means the system:",
      options: ["Ensures deadlock can never occur", "Allows deadlocks to happen, then detects and recovers from them",
        "Ignores resources entirely", "Uses only one resource", "Runs the Banker's Algorithm continuously"],
      answer: 1,
      explanation: "Detection permits deadlocks, periodically checking (e.g., via a wait-for graph) for cycles, then recovers by aborting or preempting processes. Prevention/avoidance instead stop deadlock beforehand." },
  ],
};
for (const t of [1, 2, 3, 4, 5]) CONCEPT[t] = CONCEPT[t].concat(STALLINGS[t]);

export const CODE = [
  { code: "sem = Semaphore(1)\n\nsem.acquire()\n# ... critical section ...\nsem.release()",
    q: "What OS concept does this pattern implement?",
    options: ["A round-robin scheduler", "Mutual exclusion for a critical section",
      "A page replacement policy", "A deadlock recovery routine", "Disk defragmentation"],
    answer: 1,
    explanation: "A semaphore initialized to 1 used as acquire()/release() around a critical section enforces mutual exclusion: only one thread is inside at a time." },
  { code: "pid = fork()\nif pid == 0:\n    print('child')\nelse:\n    print('parent')",
    q: "After fork() succeeds, how many processes print a line?",
    options: ["Zero", "One", "Two", "Three", "It depends on the CPU"],
    answer: 2,
    explanation: "fork() creates a child copy. The parent gets the child's PID (nonzero) and the child gets 0, so both processes run: two lines." },
  { code: "lockA.acquire()\nlockB.acquire()   # Thread 1\n\n# Thread 2 does:\nlockB.acquire()\nlockA.acquire()",
    q: "What risk does this code create?",
    options: ["A memory leak", "A deadlock from inconsistent lock ordering",
      "A page fault", "Faster execution", "Nothing, it is safe"],
    answer: 1,
    explanation: "Two threads acquire the same locks in opposite orders. Each can hold one and wait for the other, a circular wait, i.e. classic deadlock. Fix: always lock in the same order." },
  { code: "while True:\n    p = pick_shortest_ready_job()\n    run_to_completion(p)",
    q: "Which scheduling policy does this loop resemble?",
    options: ["Round Robin", "First-Come First-Served", "Shortest Job First (non-preemptive)",
      "Priority with aging", "Multilevel feedback queue"],
    answer: 2,
    explanation: "It always runs the shortest available job to completion: non-preemptive Shortest Job First. Great average waiting time, but long jobs can starve." },
  { code: "counter = 0\n# Two threads each run:\nfor i in range(1000):\n    counter += 1",
    q: "Without synchronization, what is the final value of counter?",
    options: ["Exactly 2000, always", "Somewhere between 1000 and 2000 (nondeterministic)",
      "Always 1000", "Always 0", "Exactly 4000"],
    answer: 1,
    explanation: "counter += 1 is read-modify-write, not atomic. The two threads' operations interleave and lost updates occur (a race condition), so the result varies." },
  { code: "# each philosopher i:\nwait(fork[i])\nwait(fork[(i+1) % 5])\n# eat\nsignal(fork[i])\nsignal(fork[(i+1) % 5])",
    q: "This is the Dining Philosophers pattern. If all five grab their left fork first, what happens?",
    options: ["Nothing, it is safe", "Deadlock - each holds one fork and waits forever for the other",
      "A page fault", "Starvation of the CPU scheduler", "The forks are duplicated"],
    answer: 1,
    explanation: "If every philosopher picks up the left fork simultaneously, each holds one and waits for a neighbour's fork - a circular wait, i.e. deadlock. Fixes include limiting diners or asymmetric fork order." },
  { code: "wait(empty)\nwait(mutex)\n# add item to buffer\nsignal(mutex)\nsignal(full)",
    q: "Which side of the bounded-buffer problem does this implement?",
    options: ["The consumer", "The producer", "The scheduler", "A page replacer", "A disk controller"],
    answer: 1,
    explanation: "It waits for an 'empty' slot, locks the buffer with 'mutex' to insert an item, then signals 'full'. Waiting on empty and signalling full is the PRODUCER in the producer/consumer solution." },
];

export const BOSS_QUESTIONS = [
  { part1: { q: "BOSS - Part 1: A deadlock needs four conditions at once. Which strategy attacks the 'circular wait' condition?",
      options: ["Give every process infinite memory", "Impose a global ordering on resource acquisition",
        "Increase the time quantum", "Use a larger page size", "Disable interrupts forever"],
      answer: 1,
      explanation: "Requiring all processes to request resources in one global order makes a cycle impossible, breaking the circular-wait condition." },
    part2: { q: "BOSS - Part 2: WHY does a consistent global lock ordering prevent deadlock?",
      options: ["It makes the CPU faster", "It removes the possibility of a cyclic wait-for chain among processes",
        "It gives each process its own CPU", "It compresses memory", "It disables preemption"],
      answer: 1,
      explanation: "Deadlock needs a cycle in the wait-for graph. If everyone acquires resources in the same order, no cycle can form, so circular-wait can never hold." } },
  { part1: { q: "BOSS - Part 1: Which technique lets a system run programs whose combined size exceeds physical RAM?",
      options: ["Busy waiting", "Virtual memory with demand paging", "Round-robin scheduling", "Journaling", "Spinlocks"],
      answer: 1,
      explanation: "Virtual memory with demand paging keeps only needed pages in RAM and the rest on disk, so total program size can exceed physical memory." },
    part2: { q: "BOSS - Part 2: WHY does demand paging make this possible?",
      options: ["It deletes unused programs", "Pages are loaded only when accessed, so unused pages need not occupy RAM",
        "It overclocks the CPU", "It merges all processes into one", "It disables the MMU"],
      answer: 1,
      explanation: "Because pages are brought in lazily on first access, memory holds only the working set. Rarely used pages stay on disk, so RAM isn't the hard limit." } },
];

function shuffleOptions(q) {
  const idx = q.options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const out = {
    q: q.q,
    options: idx.map((i) => q.options[i]),
    answer: idx.indexOf(q.answer),
    explanation: q.explanation,
  };
  if (q.code) out.code = q.code;
  return out;
}

const clampTier = (t) => Math.max(1, Math.min(5, t));

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class QuestionPool {
  constructor() {
    this.usedConcept = new Set();
    this.usedCode = new Set();
    this.usedGlobal = new Set();   // question texts already asked this run
  }

  // Candidate concept questions for a tier (includes neighbouring tiers so a
  // single quiz always has enough DISTINCT questions to draw from).
  _conceptCandidates(tier) {
    const tiers = [...new Set([tier, tier - 1, tier + 1].filter((t) => t >= 1 && t <= 5))];
    const arr = [];
    for (const t of tiers) for (const q of CONCEPT[t]) arr.push(q);
    return arr;
  }

  // Draw `n` questions guaranteed unique within this quiz, preferring ones not
  // yet asked this run. Only reuses older questions if the bank runs dry.
  drawUnique(n, tier, useCode) {
    tier = clampTier(tier);
    let candidates = this._conceptCandidates(tier).slice();
    if (useCode) candidates = candidates.concat(CODE);
    // de-duplicate by question text
    const byText = new Map();
    for (const q of candidates) if (!byText.has(q.q)) byText.set(q.q, q);
    candidates = [...byText.values()];

    const chosen = [];
    const chosenText = new Set();
    const take = (list) => {
      for (const q of list) {
        if (chosen.length >= n) break;
        if (!chosenText.has(q.q)) { chosen.push(q); chosenText.add(q.q); }
      }
    };
    take(shuffle(candidates.filter((q) => !this.usedGlobal.has(q.q))));
    if (chosen.length < n) take(shuffle(candidates.filter((q) => !chosenText.has(q.q))));

    for (const q of chosen) this.usedGlobal.add(q.q);
    return chosen.map(shuffleOptions);
  }
  getConcept(tier) {
    tier = clampTier(tier);
    const pool = CONCEPT[tier];
    let avail = pool.map((_, i) => i).filter((i) => !this.usedConcept.has(`${tier}:${i}`));
    if (avail.length === 0) {
      for (const k of [...this.usedConcept]) if (k.startsWith(`${tier}:`)) this.usedConcept.delete(k);
      avail = pool.map((_, i) => i);
    }
    const idx = avail[Math.floor(Math.random() * avail.length)];
    this.usedConcept.add(`${tier}:${idx}`);
    return shuffleOptions(pool[idx]);
  }
  getCode() {
    let avail = CODE.map((_, i) => i).filter((i) => !this.usedCode.has(i));
    if (avail.length === 0) { this.usedCode.clear(); avail = CODE.map((_, i) => i); }
    const idx = avail[Math.floor(Math.random() * avail.length)];
    this.usedCode.add(idx);
    return shuffleOptions(CODE[idx]);
  }
  getBoss() {
    return BOSS_QUESTIONS[Math.floor(Math.random() * BOSS_QUESTIONS.length)];
  }
}
