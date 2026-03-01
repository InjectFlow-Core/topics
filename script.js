(() => {
  const STORAGE_KEY = 'kaban.board.v1';
  const THEME_KEY = 'kaban.theme.v1';
  const DENSITY_KEY = 'kaban.density.v1';
  const AUTH_ITERATIONS = 120000;
  // Signing keys (owner): set these to enable cross-device, cross-site owner signing
  // Public key JWK (ECDSA P-256) and encrypted private key blob
  // Example placeholders – replace with your generated values
  const SIGN_PUB_JWK = {"key_ops":["verify"],"ext":true,"kty":"EC","x":"Cb7zcKgMmZ9aswDkPa6KKGc2siMIimjaGrKXWyUqwW4","y":"fkbznjZz-DUNGFHPvsuJ0AtXBbknB29LZlh1g1jM_yk","crv":"P-256"};
  const SIGN_PRIV_BLOB = {"kdf":{"iter":120000,"salt":"VDy6RR5epUJ/Obvy2y3LkA=="},"iv":"R9MD6aHPT1k7UPeU","ct":"lEntKmhJ8XqTr6baBW8vjaJuhkC58pyeC6E0ZjvmtZKDMlBmwlWZ5omqf3VyBPr5IP7LzX9yZLW181Xc98Y/mSLEd+KWhxmbCLVn43TwTKcjUi4us/Z9aou6CF400vuu1xnh0Whvw7nM7T9kqUaY7VCl8RLsQ3c2wRB5VwquGRRo4XTdJD823AWbjWgBTanktmOXyiPMlgppCJPMdekz9xcEuq8yDMoreqoCIkqv4csDuon3CixqbELpLptP6lgXx5EdBCCNNpep0KFKoChZIIIpK5TvmugOnftjPw9c"};

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // App state
  let state = null;
  // Removed legacy per-browser code auth; we use signing only now
  let signerKey = null; // CryptoKey private key cached for session
  let linkedFileHandle = null; // FileSystemFileHandle if JSON sync is linked
  let fileSyncTimer = null;
  let autoPullTimer = null;
  let lastFileMtimeMs = 0;
  let lastSyncAtMs = 0;
  let syncSignerPrompted = false;

  // Columns definition
  const columns = [
    { id: 'todo', name: 'To Do' },
    { id: 'inprogress', name: 'In Progress' },
    { id: 'review', name: 'Review' },
    { id: 'done', name: 'Done' },
  ];

  // Seed data
  function seedData() {
    const content = [];

    // Computer Architecture — Ranked by Difficulty (1-26)
    content.push(
      item(1, 'How the call stack grows and shrinks during function calls — why deep recursion causes a stack overflow', 'Beginner', '8-12 mins', 'A developer writes a recursive function to traverse a file directory. It works fine on small folders but crashes on a deep nested structure. The video traces exactly what the CPU is doing with the stack on every function call, showing how each frame consumes memory until there is nothing left.'),
      item(2, 'How a CPU handles an interrupt — what actually happens when you press a key while your program is running', 'Beginner', '8-12 mins', 'A developer notices their program responds to keyboard input even though it never explicitly checks for it in the main loop. The video explains how the CPU pauses whatever it is doing, saves its state, handles the interrupt, and resumes without the program ever knowing it was interrupted.'),
      item(3, 'How DRAM stores and refreshes bits — why RAM is volatile and loses data the moment power cuts off', 'Beginner', '10-14 mins', 'A junior developer asks why their in-memory cache disappears every time the server restarts but their database survives. The video goes down to the transistor level, showing how DRAM stores a bit as a charge in a capacitor that leaks over time and needs constant refreshing to survive.'),
      item(4, 'How power gating shuts down idle CPU sections — why your laptop CPU spikes from 800MHz to 4GHz instantly', 'Beginner', '8-12 mins', 'A developer profiling their app notices the CPU frequency jumps dramatically the moment their code runs. The video explains how modern CPUs shut down entire sections when idle, and how a single instruction can trigger the hardware to power them back up within microseconds.'),
      item(5, 'How a CPU executes one instruction — why your "fast" code still takes multiple clock cycles', 'Beginner', '12-16 mins', 'A developer assumes that a single line of code maps to a single CPU operation. The video follows one ADD instruction through fetch, decode, execute, and writeback, showing that even the simplest operation involves multiple stages and multiple clock cycles before any result appears.'),
      item(6, 'How branch prediction works and what misprediction costs — why sorting your data before processing it can speed up a loop', 'Beginner-Intermediate', '12-16 mins', 'A developer benchmarks two versions of the same loop, one with sorted data and one with random data, and finds a 5x speed difference with no algorithmic change. The video explains how the CPU is guessing which branch to take before it evaluates the condition, and what happens when it guesses wrong.'),
      item(7, 'How DMA transfers data without CPU involvement — why your disk read does not peg your CPU at 100%', 'Beginner-Intermediate', '10-14 mins', 'A developer wonders why a large file copy barely touches the CPU while their data processing loop pegs it at 100%. The video shows how DMA lets hardware devices move data directly into memory while the CPU is free to do other work, with the CPU only getting involved at the start and end.'),
      item(8, 'How cache lines are loaded and evicted — why iterating a 2D array row-first is faster than column-first', 'Intermediate', '14-18 mins', 'A developer optimizes an image processing algorithm and stumbles on a counterintuitive result: simply changing the loop order makes it three times faster. The video explains that the CPU does not load one byte at a time but an entire cache line, and column-first iteration throws away most of what was loaded.'),
      item(9, 'How CPU prefetching guesses what memory you need next — why sequential access patterns are faster than random ones', 'Intermediate', '12-16 mins', 'A developer benchmarks a linked list traversal against an array traversal and finds the array is dramatically faster despite both having the same number of elements. The video shows how the CPU\'s hardware prefetcher detects sequential access patterns and loads memory before it is requested, but fails completely with pointer chasing.'),
      item(10, 'Why false sharing kills multi-threaded performance — why adding more threads made your program slower', 'Intermediate', '14-18 mins', 'A developer parallelizes a counter update across four threads expecting a 4x speedup and instead gets a slowdown. The video reveals that both counters sit on the same cache line, so every write from one core invalidates the cache on every other core, turning a parallel program into a serialized one.'),
      item(11, 'How the instruction pipeline works and where stalls happen — why reordering your code can make it faster without changing logic', 'Intermediate', '16-20 mins', 'A developer reads that their compiler reordered their instructions and wonders why that matters. The video walks through a five-stage pipeline, showing how a data dependency between two consecutive instructions forces the pipeline to stall and wait, and how reordering eliminates the stall without changing the result.'),
      item(12, 'How the MMU translates virtual to physical addresses — why two processes can use the same memory address without conflict', 'Intermediate', '16-20 mins', 'A developer notices that two completely separate processes both report using address 0x7fff and wonders how that is possible. The video explains the page table structure the OS maintains per process, and how the MMU silently translates every memory access from a virtual address to a unique physical one.'),
      item(13, 'What actually happens during a context switch — why spawning too many threads slows your server down', 'Intermediate', '14-18 mins', 'A backend developer spins up a thread per request expecting better throughput and watches their server latency climb instead. The video traces what the OS does during a context switch, how long it takes to save and restore CPU state, and why hundreds of threads fighting for CPU time produces more overhead than work.'),
      item(14, 'How a mutex lock prevents race conditions — why a $1000 wallet can be drained to $1,000,000 when concurrent requests read balance before any write commits', 'Intermediate', '16-20 mins', 'A fintech developer discovers their withdrawal endpoint has a bug where concurrent requests all read the same balance and approve withdrawals that should have been rejected. The video shows the exact sequence of reads and writes that produce the exploit, then demonstrates how a mutex serializes access so only one request can read and write at a time.'),
      item(15, 'How TLB caching speeds up address translation — why huge pages improve database performance', 'Intermediate', '14-18 mins', 'A database administrator notices that switching from 4KB to 2MB memory pages cuts query latency noticeably. The video explains that every memory access requires an address translation, and the TLB is a small cache that holds recent translations. Huge pages mean fewer unique translations, so the TLB misses less often.'),
      item(16, 'How write buffers and store queues defer memory writes — why memory writes appear instant but are not', 'Intermediate', '14-18 mins', 'A developer writes a value to memory and immediately reads it back, expecting the read to reflect the write, and it does. But in a second thread, the read returns the old value. The video explains that writes go into a store queue first and are not immediately visible to other cores, which is the root of most subtle concurrency bugs.'),
      item(17, 'How out-of-order execution reorders instructions — why your CPU is doing work you never explicitly scheduled', 'Intermediate-Advanced', '18-22 mins', 'A developer reads that modern CPUs execute instructions out of order and cannot reconcile that with their sequential code. The video shows how the CPU finds independent instructions ahead in the instruction stream and executes them early to avoid sitting idle, while still presenting results as if everything ran in order.'),
      item(18, 'How a page fault is handled from start to finish — why the first access to allocated memory is slower than subsequent ones', 'Intermediate-Advanced', '16-20 mins', 'A developer profiles their application and notices the first iteration of a loop is consistently slower than all subsequent ones, even after warming up. The video explains that malloc does not actually give you physical memory until you touch it, and the first access triggers a page fault that pulls the OS into a chain of work before the instruction completes.'),
      item(19, 'How SIMD processes multiple values in one instruction — how video encoders and machine learning libraries process data so fast', 'Intermediate-Advanced', '18-22 mins', 'A developer benchmarks their hand-written matrix multiplication against NumPy and finds NumPy is 50x faster with the same algorithm. The video explains that NumPy compiles down to SIMD instructions that process 8 or 16 floats in a single CPU operation, while the developer\'s loop processes one at a time.'),
      item(20, 'How hyperthreading shares execution units between threads — why 16 logical cores does not mean 16x performance', 'Intermediate-Advanced', '16-20 mins', 'A developer buys a machine advertised as 16 cores but notices their parallel workload only gets about a 10x speedup. The video explains that half those cores are logical, sharing the same physical execution units, and two hyperthreads on the same core compete for resources rather than running truly in parallel.'),
      item(21, 'How memory ordering differs between CPUs — why multithreaded code that works on x86 breaks on ARM', 'Advanced', '20-25 mins', 'A developer ships code that passes all tests on their x86 development machine but produces intermittent data corruption on an ARM server in production. The video explains that x86 has a strong memory model that implicitly prevents most reorderings, while ARM allows far more, so the developer\'s assumption about write visibility was wrong all along.'),
      item(22, 'How the reorder buffer tracks in-flight instructions — why CPUs can execute hundreds of instructions simultaneously', 'Advanced', '20-25 mins', 'A developer learns that modern CPUs have instruction windows of 200 or more and wonders what that means in practice. The video explains the reorder buffer as the structure that lets the CPU dispatch instructions out of order while tracking which ones have completed, and commits results back to registers in the original program order.'),
      item(23, 'How register renaming eliminates false dependencies — why compilers generate different assembly than what you wrote', 'Advanced', '18-22 mins', 'A developer compares their source code to the compiler output and finds the compiler used different registers than expected, seemingly for no reason. The video shows how reusing the same register in two consecutive instructions creates a false dependency that stalls the pipeline, and how the CPU renames registers internally to remove the dependency entirely.'),
      item(24, 'How speculative execution works — why Spectre could read memory your process had no permission to access', 'Advanced', '22-28 mins', 'A developer reads the Spectre disclosure and cannot understand how a CPU performance optimization became a security vulnerability. The video traces how the CPU executes code past a branch before knowing if the branch is even taken, and how an attacker trains the branch predictor to speculatively execute code that reads privileged memory, leaving traces in the cache that can be measured.'),
      item(25, 'How NUMA affects memory access time across CPU sockets — why a process pinned to the wrong CPU core runs slower', 'Advanced', '18-22 mins', 'A developer running a high-throughput service on a dual-socket server notices some worker processes are consistently slower than others with identical code. The video explains that each CPU socket has its own local memory, and accessing memory attached to a different socket crosses an interconnect that adds significant latency to every single memory read.'),
      item(26, 'How the memory bus arbitrates between CPU and devices — why PCIe bandwidth matters for GPU-heavy workloads', 'Advanced', '20-24 mins', 'A machine learning engineer finds their GPU utilization is low despite the GPU having enough compute. The video traces how data has to move from system RAM across the PCIe bus to GPU memory before the GPU can touch it, and how that bus becomes the bottleneck when the model is too large or batches are too small.')
    );

    // Data Structures and Algorithms — Ranked by Difficulty (1-26)
    content.push(
      item(27, 'How dynamic programming breaks overlapping subproblems — why a naive recursive Fibonacci call is exponentially slow', 'Beginner', '10-14 mins', 'A developer writes a recursive Fibonacci function that works fine for small inputs but hangs on anything above 40. The video visualizes the call tree, showing the same subproblems being recomputed thousands of times, then introduces memoization as a way to store and reuse results, collapsing the tree into a straight line.'),
      item(28, 'How a heap maintains order during insert and delete — how your OS schedules processes by priority', 'Beginner', '10-14 mins', 'A developer wonders how their OS always picks the highest priority process to run next without scanning every waiting process each time. The video animates how a heap keeps the highest priority element at the root and restores that property with just a few swaps after every insert or delete.'),
      item(29, 'How Dijkstra\'s algorithm picks the shortest path — how Google Maps finds the fastest route between two points', 'Beginner', '12-16 mins', 'A developer is asked to build a delivery routing feature and reaches for Dijkstra without fully understanding it. The video animates the algorithm visiting nodes in order of current known distance, showing exactly why it never needs to revisit a node and how the priority queue drives the whole process.'),
      item(30, 'How a trie stores and searches strings — how autocomplete suggestions appear as you type', 'Beginner', '10-14 mins', 'A developer builds an autocomplete feature using a filtered list and notices it slows down as the word list grows. The video shows how a trie stores each character as a node so that searching for all words with a given prefix means just walking the tree from that prefix, with no scanning required.'),
      item(31, 'How LRU cache eviction works with a hashmap and linked list — how your browser decides which cached resources to drop', 'Beginner-Intermediate', '12-16 mins', 'A developer needs to implement a fixed-size cache and cannot figure out how to make both lookup and eviction fast. The video shows how combining a hashmap with a doubly linked list gives O(1) access and O(1) eviction by moving accessed nodes to the front and dropping from the back.'),
      item(32, 'How heapsort builds and drains a max heap — why heapsort has guaranteed O(n log n) but is rarely used in practice', 'Beginner-Intermediate', '12-16 mins', 'A developer learning sorting algorithms wonders why heapsort is taught but rarely seen in production code. The video animates the heapify process, shows why it guarantees O(n log n) in the worst case unlike quicksort, then explains why its poor cache behavior makes it slower in practice despite the identical asymptotic bound.'),
      item(33, 'How merge sort divides and conquers across memory — why merge sort is preferred over quicksort for linked lists', 'Beginner-Intermediate', '12-16 mins', 'A developer sorting a linked list reaches for quicksort and discovers it performs terribly. The video shows why quicksort needs random index access to partition efficiently, while merge sort only needs to split and merge sequentially, making it the natural fit for any structure where you cannot jump to the middle.'),
      item(34, 'How a Bloom filter tests membership with no false negatives — how databases avoid disk lookups for keys that do not exist', 'Beginner-Intermediate', '12-16 mins', 'A developer working on a database notices that lookups for nonexistent keys are dramatically slower than hits. The video introduces a Bloom filter as a compact structure that can definitively say a key does not exist, eliminating the disk read entirely, at the cost of occasionally saying a key exists when it does not.'),
      item(35, 'How topological sort orders a dependency graph — how package managers resolve installation order', 'Intermediate', '14-18 mins', 'A developer building a task runner needs to execute tasks in an order that respects dependencies without running anything before its prerequisites. The video animates how topological sort walks a directed acyclic graph, producing a valid execution order and detecting circular dependencies that would make ordering impossible.'),
      item(36, 'How quicksort partitions around a pivot in place — why sorted input can be the worst case for a naive implementation', 'Intermediate', '14-18 mins', 'A developer discovers their sorting function is extremely slow on already-sorted data and cannot understand why. The video animates the partition step showing how a bad pivot choice on sorted input produces one partition of size zero and one of size n-1 every time, degrading the algorithm to O(n²).'),
      item(37, 'How a hash map resizes and rehashes all keys — why inserting into a dictionary causes a sudden latency spike', 'Intermediate', '14-18 mins', 'A developer profiling a high-throughput service finds occasional latency spikes that correlate with nothing obvious in their code. The video reveals that their hash map hit its load factor threshold mid-request, triggered a full rehash of every key into a new backing array, and that single operation blocked the thread long enough to blow the latency budget.'),
      item(38, 'How open addressing resolves hash collisions — why a nearly full hash table gets dramatically slower', 'Intermediate', '14-18 mins', 'A developer notices their hash map performance degrades well before it runs out of memory. The video animates how open addressing probes for the next available slot on a collision, showing how a high load factor creates long probe chains that turn O(1) lookups into something closer to O(n).'),
      item(39, 'How union-find tracks connected components — how social networks detect whether two users are in the same group', 'Intermediate', '14-18 mins', 'A developer needs to determine in real time whether two users are reachable through mutual connections. The video animates how union-find represents each component as a tree, how union merges two trees by linking their roots, and how path compression flattens the tree so future lookups are nearly O(1).'),
      item(40, 'How A* improves on Dijkstra with a heuristic — why game pathfinding uses A* instead of plain Dijkstra**', 'Intermediate', '16-20 mins', 'A game developer implements Dijkstra for NPC pathfinding and finds it visits too many nodes to run at 60fps. The video animates how A* uses a heuristic to bias the search toward the destination, visiting far fewer nodes than Dijkstra on a grid, then shows what happens when the heuristic overestimates and the algorithm loses its correctness guarantee.'),
      item(41, 'How a skip list achieves O(log n) without balancing — how Redis implements its sorted sets under the hood', 'Intermediate', '16-20 mins', 'A developer reads that Redis sorted sets use a skip list instead of a balanced tree and wonders why. The video animates how a skip list builds express lanes of decreasing density above a base linked list, allowing the search to skip large sections at each level, achieving logarithmic time without any of the rotation logic a balanced tree requires.'),
      item(42, 'How garbage collection traces and sweeps live objects — why your application pauses unpredictably under memory pressure', 'Intermediate', '18-22 mins', 'A backend developer running a JVM service notices occasional multi-second pauses that correlate with high allocation rates. The video traces how the garbage collector walks object references from roots to find live objects, marks everything else as dead, and why that traversal has to stop the world in a stop-and-sweep collector.'),
      item(43, 'How KMP pattern matching avoids redundant comparisons — how text editors implement find without scanning every character twice', 'Intermediate', '16-20 mins', 'A developer implements a naive string search that works but crawls on large documents. The video animates how KMP precomputes a failure function from the pattern, allowing the search to skip ahead when a mismatch occurs rather than backing up, making the total comparisons linear in the combined length of the pattern and text.'),
      item(44, 'How Bellman-Ford detects negative weight cycles — how routers detect and avoid routing loops', 'Intermediate', '16-20 mins', 'A network engineer notices traffic circulating between routers endlessly, racking up cost without reaching its destination. The video shows how Bellman-Ford relaxes all edges repeatedly and detects a negative cycle by checking whether any distance still decreases after n-1 iterations, the condition that should be impossible in a loop-free graph.'),
      item(45, 'How a B-tree node splits and merges — how your database index stays balanced as rows are inserted', 'Intermediate-Advanced', '18-22 mins', 'A developer adding millions of rows to a database wonders why query performance stays consistent rather than degrading over time. The video animates how a B-tree node that hits capacity splits into two and promotes a key to the parent, and how this process keeps the tree balanced and all leaves at the same depth regardless of insertion order.'),
      item(46, 'How a red-black tree rebalances after insertion — why ordered maps in most standard libraries never degrade to O(n)', 'Intermediate-Advanced', '20-24 mins', 'A developer using a sorted map assumes it will always be fast but wonders what stops it from degrading like a naive binary search tree. The video animates how red-black coloring rules constrain the tree shape and how rotations and recolorings after each insertion restore those rules, keeping the height bounded at O(log n).'),
      item(47, 'How memory allocators manage free lists and fragmentation — why long-running servers slowly consume more memory over time', 'Intermediate-Advanced', '18-22 mins', 'A developer notices their server\'s memory usage climbs steadily over days despite not leaking any objects. The video shows how an allocator carves up a heap into blocks, maintains free lists by size class, and how many small allocations and deallocations in different orders leave gaps that cannot be reused, slowly making the heap look full when it is not.'),
      item(48, 'How optimistic vs pessimistic locking handles concurrent writes — why MongoDB\'s document versioning stops double-spend attacks that Node.js async code cannot prevent alone', 'Intermediate-Advanced', '20-24 mins', 'A fintech developer discovers their withdrawal endpoint allows users to spend more than their balance by firing concurrent requests. The video contrasts pessimistic locking, which blocks all other writers immediately, with optimistic locking, which lets writes proceed but rejects any that find the document has changed since they read it, showing how MongoDB\'s version field implements the latter.'),
      item(49, 'How radix sort bypasses comparison-based lower bounds — why sorting integers can be faster than O(n log n)', 'Intermediate-Advanced', '16-20 mins', 'A developer sorting large arrays of integers learns that O(n log n) is the theoretical floor for comparison-based sorting and assumes nothing can beat it. The video shows how radix sort never compares two elements at all, instead distributing values into buckets by digit, and why that sidesteps the lower bound entirely to achieve O(nk) time.'),
      item(50, 'How consistent hashing distributes keys across nodes — why adding one server to a cluster does not reshuffle all cached data', 'Advanced', '20-24 mins', 'A developer adds a new cache server to their cluster expecting to split the load and instead finds their cache hit rate drops to nearly zero as all keys remap. The video shows how naive modulo hashing ties every key to the total number of nodes, then animates how consistent hashing places both nodes and keys on a ring so that only the keys between two points need to move when a node is added or removed.'),
      item(51, 'How a segment tree answers range queries efficiently — how analytics dashboards aggregate data over arbitrary date ranges', 'Advanced', '20-24 mins', 'A developer building a dashboard feature needs to sum values over arbitrary date ranges in real time and finds a naive loop too slow. The video builds a segment tree from the bottom up, showing how each internal node stores an aggregate of its subtree, so any range query decomposes into at most O(log n) precomputed nodes rather than scanning every element.'),
      item(52, 'How a Fenwick tree computes prefix sums with bit tricks — how leaderboards compute cumulative scores in real time', 'Advanced', '18-22 mins', 'A developer building a leaderboard needs to both update scores and query cumulative totals in real time but finds a segment tree complex to implement. The video shows how a Fenwick tree uses each index\'s lowest set bit to determine which range it is responsible for, producing an update and query structure that fits in a plain array with no tree pointers at all.')
    );

    const cards = {};
    const order = content.sort((a,b) => a.rank - b.rank).map(c => {
      const id = genId();
      cards[id] = { id, title: c.title, description: c.description, difficulty: c.difficulty, length: c.length, createdAt: Date.now(), updatedAt: Date.now() };
      return id;
    });

    return {
      columns: {
        todo: order,
        inprogress: [],
        review: [],
        done: [],
      },
      cards,
      meta: { version: 1, seededAt: Date.now(), wip: { todo: null, inprogress: 6, review: 5, done: null } },
    };
  }

  function item(rank, title, difficulty, length, description) {
    return { rank, title, difficulty, length, description };
  }

  function genId() {
    return 'c_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    scheduleFileSync();
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function setThemeMode(mode) {
    const html = document.documentElement;
    html.setAttribute('data-theme', mode);
    localStorage.setItem(THEME_KEY, mode);
    const icon = $('#themeIcon');
    icon.textContent = mode === 'dark' ? '🌙' : mode === 'light' ? '🌞' : '🌤️';
    const apply = () => {
      if (mode === 'dark') html.classList.add('dark');
      else if (mode === 'light') html.classList.remove('dark');
      else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) html.classList.add('dark'); else html.classList.remove('dark');
      }
    };
    apply();
    if (!setThemeMode._media) {
      const m = window.matchMedia('(prefers-color-scheme: dark)');
      m.addEventListener('change', () => {
        const modeNow = document.documentElement.getAttribute('data-theme') || 'auto';
        if (modeNow === 'auto') {
          const prefersDark = m.matches;
          if (prefersDark) html.classList.add('dark'); else html.classList.remove('dark');
        }
      });
      setThemeMode._media = m;
    }
  }

  function cycleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'auto';
    const next = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
    setThemeMode(next);
  }

  function initTheme() {
    let mode = localStorage.getItem(THEME_KEY);
    if (!mode) mode = 'auto';
    document.documentElement.setAttribute('data-theme', mode);
    setThemeMode(mode);
  }

  // Density (comfortable/cozy/compact)
  function setDensity(mode) {
    document.documentElement.setAttribute('data-density', mode);
    localStorage.setItem(DENSITY_KEY, mode);
    const icon = document.getElementById('densityIcon');
    if (icon) icon.textContent = mode === 'comfortable' ? '⬇️' : mode === 'cozy' ? '↕️' : '⬆️';
  }
  function cycleDensity() {
    const current = document.documentElement.getAttribute('data-density') || 'compact';
    const next = current === 'comfortable' ? 'cozy' : current === 'cozy' ? 'compact' : 'comfortable';
    setDensity(next);
  }
  function initDensity() {
    const saved = localStorage.getItem(DENSITY_KEY) || 'compact';
    setDensity(saved);
  }

  // --- Minimal Auth (client-side, encrypted verifier) ---
  const te = new TextEncoder();
  const td = new TextDecoder();
  // Legacy marker removed (no per-browser code auth)

  function bufToB64(buf) {
    const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer ?? buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64ToBuf(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  async function deriveKey(pass, salt, iterations = AUTH_ITERATIONS) {
    const baseKey = await crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Legacy per-browser code functions removed

  // ----- Signing helpers (ECDSA P-256) -----
  async function importPubKey() {
    if (!SIGN_PUB_JWK) return null;
    return crypto.subtle.importKey('jwk', SIGN_PUB_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
  }
  async function decryptPrivateKey(pass) {
    if (!SIGN_PRIV_BLOB) return null;
    const salt = b64ToBuf(SIGN_PRIV_BLOB.kdf?.salt || '');
    const iv = b64ToBuf(SIGN_PRIV_BLOB.iv);
    const base = await crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']);
    const aes = await crypto.subtle.deriveKey({ name:'PBKDF2', salt:new Uint8Array(salt), iterations: SIGN_PRIV_BLOB.kdf?.iter || AUTH_ITERATIONS, hash:'SHA-256' }, base, { name:'AES-GCM', length:256 }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv:new Uint8Array(iv) }, aes, b64ToBuf(SIGN_PRIV_BLOB.ct));
    const jwk = JSON.parse(td.decode(pt));
    return crypto.subtle.importKey('jwk', jwk, { name:'ECDSA', namedCurve:'P-256' }, false, ['sign']);
  }
  async function signString(privKey, text) {
    const sig = await crypto.subtle.sign({ name:'ECDSA', hash:'SHA-256' }, privKey, te.encode(text));
    return bufToB64(sig);
  }
  async function verifyString(pubKey, text, sigB64) {
    const ok = await crypto.subtle.verify({ name:'ECDSA', hash:'SHA-256' }, pubKey, b64ToBuf(sigB64), te.encode(text));
    return ok;
  }
  function canonicalize(value) {
    if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
    if (value && typeof value === 'object') {
      const keys = Object.keys(value).sort();
      return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
    }
    return JSON.stringify(value);
  }

  // Legacy ensureAuth removed; we use ensureSigner()

  async function ensureSigner() {
    const secure = !!(window.isSecureContext && crypto?.subtle);
    if (!secure) { toast('Signing requires https or localhost.'); return false; }
    if (!SIGN_PUB_JWK || !SIGN_PRIV_BLOB) { toast('Owner signing keys not configured.'); return false; }
    if (signerKey) return true;
    // Retry until correct or cancelled
    while (true) {
      const pass = await openAuthModal({ mode: 'verify', errorText: '' });
      if (!pass) return false;
      try {
        signerKey = await decryptPrivateKey(pass);
        if (signerKey) return true;
      } catch {}
      // Wrong passphrase; show inline error and try again
      const maybe = await openAuthModal({ mode: 'verify', errorText: 'Incorrect passphrase. Try again.' });
      if (!maybe) return false;
      try {
        signerKey = await decryptPrivateKey(maybe);
        if (signerKey) return true;
      } catch {}
      // Loop continues
    }
  }

  function openAuthModal({ mode, errorText = '' }) {
    return new Promise((resolve) => {
      const dlg = document.getElementById('authModal');
      const title = document.getElementById('authTitle');
      const hint = document.getElementById('authHint');
      const code = document.getElementById('authCode');
      const confWrap = document.getElementById('authConfirmWrap');
      const code2 = document.getElementById('authCodeConfirm');
      const err = document.getElementById('authError');
      const form = document.getElementById('authForm');
      const cancel = document.getElementById('cancelAuthBtn');
      const closeBtn = document.getElementById('closeAuthBtn');

      if (errorText) { err.textContent = errorText; err.classList.remove('hidden'); }
      else { err.classList.add('hidden'); err.textContent = ''; }
      code.value = '';
      code2.value = '';

      if (mode === 'set') {
        title.textContent = 'Set Passphrase';
        hint.textContent = 'This passphrase unlocks protected actions (signing).';
        confWrap.classList.remove('hidden');
      } else {
        title.textContent = 'Enter Passphrase';
        hint.textContent = 'Enter your passphrase to continue.';
        confWrap.classList.add('hidden');
      }

      function cleanup(res) {
        form.removeEventListener('submit', onSubmit);
        cancel.removeEventListener('click', onCancel);
        closeBtn.removeEventListener('click', onCancel);
        if (dlg.open) dlg.close();
        resolve(res);
      }

      function onCancel() { cleanup(false); }

      async function onSubmit(e) {
        e.preventDefault();
        const a = code.value.trim();
        if (!a || a.length < 6) {
          err.textContent = 'Passphrase must be at least 6 characters.';
          err.classList.remove('hidden');
          code.focus();
          return;
        }
        if (mode === 'set') {
          const b = code2.value.trim();
          if (a !== b) {
            err.textContent = 'Passphrases do not match.';
            err.classList.remove('hidden');
            code2.focus();
            return;
          }
        }
        cleanup(a);
      }

      form.addEventListener('submit', onSubmit);
      cancel.addEventListener('click', onCancel);
      closeBtn.addEventListener('click', onCancel);

      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', 'open');
      setTimeout(() => code.focus(), 50);
    });
  }

  // Rendering
  function render() {
    const board = $('#board');
    board.innerHTML = '';
    for (const col of columns) {
      const node = renderColumn(col);
      board.appendChild(node);
    }
  }

  // ---------- JSON File Sync (File System Access API) ----------
  const IDB_DB = 'kaban-idb';
  const IDB_STORE = 'handles';

  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbSetHandle(handle) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ key: 'stateFile', handle });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async function idbGetHandle() {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('stateFile');
      req.onsuccess = () => resolve(req.result?.handle || null);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbDeleteHandle() {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete('stateFile');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function fsSupported() { return 'showOpenFilePicker' in window || 'showSaveFilePicker' in window; }

  async function linkJsonFile() {
    if (!fsSupported()) { toast('File System Access API not supported in this browser.'); return; }
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      linkedFileHandle = handle;
      await idbSetHandle(handle);
      $('#pullJsonBtn').disabled = false;
      toast('Linked JSON file.');
      // optional: pull initial state from file
      await pullFromLinkedFile();
    } catch (e) { /* user cancelled */ }
  }

  async function unlinkJsonFile() {
    linkedFileHandle = null;
    await idbDeleteHandle();
    $('#pullJsonBtn').disabled = true;
    toast('Unlinked JSON file.');
  }

  async function pullFromLinkedFile(manual = false) {
    if (!linkedFileHandle) return;
    try {
      const file = await linkedFileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = parsed?.data || parsed;
      if (SIGN_PUB_JWK) {
        const pub = await importPubKey();
        const payload = { meta: parsed.meta || {}, data };
        const canon = canonicalize(payload);
        const ok = parsed.sig && await verifyString(pub, canon, parsed.sig);
        if (!ok) {
          if (manual && await ensureSigner()) {
            const proceed = await openConfirmModal({ title: 'Adopt Unsigned File', message: 'Linked file signature is invalid. Trust current content and re-sign with your key?', confirmText: 'Adopt & Sign', cancelText: 'Cancel' });
            if (!proceed) return;
            state = data;
            saveState();
            await writeToLinkedFile();
            render();
            toast('Adopted and re-signed linked file');
          } else {
            // Silent in auto mode to avoid modal loops
            if (manual) toast('Signature invalid; refusing to load');
          }
          return;
        }
      }
      if (!data || !data.cards || !data.columns) { toast('Invalid board in file'); return; }
      state = data;
      saveState();
      render();
      toast('Pulled state from JSON');
      lastFileMtimeMs = file.lastModified || Date.parse(file.lastModifiedDate || '') || Date.now();
      lastSyncAtMs = Date.now();
      updateLinkedStatus();
    } catch (e) {
      toast('Failed to read linked file');
    }
  }

  async function writeToLinkedFile() {
    if (!linkedFileHandle) return;
    try {
      if (!signerKey) {
        // Try to unlock signer once to enable global sync silently
        if (!syncSignerPrompted) {
          syncSignerPrompted = true;
          const ok = await ensureSigner();
          if (!ok) { toast('Sync paused until passphrase is entered.'); return; }
        } else {
          return; // Avoid repeated prompts; keep local until user triggers a protected action
        }
      }
      const writable = await linkedFileHandle.createWritable();
      const payload = { meta: { exportedAt: new Date().toISOString(), app: 'kaban-board', version: 1 }, data: state };
      const canon = canonicalize(payload);
      const sig = await signString(signerKey, canon);
      const backup = { ...payload, sig };
      await writable.write(JSON.stringify(backup, null, 2));
      await writable.close();
      // Refresh file metadata to capture new mtime
      try {
        const f = await linkedFileHandle.getFile();
        lastFileMtimeMs = f.lastModified || Date.now();
      } catch {}
      lastSyncAtMs = Date.now();
      updateLinkedStatus();
    } catch (e) {
      // If permission lost or fail, disable link
      console.warn('File write failed', e);
    }
  }

  function scheduleFileSync() {
    if (!linkedFileHandle) return;
    clearTimeout(fileSyncTimer);
    fileSyncTimer = setTimeout(writeToLinkedFile, 500);
  }

  function updateLinkedStatus() {
    const el = document.getElementById('linkedStatus');
    if (!el) return;
    if (!linkedFileHandle) { el.classList.add('hidden'); el.textContent = ''; return; }
    const last = lastSyncAtMs ? new Date(lastSyncAtMs).toLocaleTimeString() : '—';
    el.textContent = `Linked • Last sync ${last}`;
    el.classList.remove('hidden');
  }

  function startAutoPull(intervalMs = 12000) {
    if (!linkedFileHandle) return;
    clearInterval(autoPullTimer);
    autoPullTimer = setInterval(async () => {
      try {
        const f = await linkedFileHandle.getFile();
        const mtime = f.lastModified || Date.now();
        if (mtime > lastFileMtimeMs + 1000) {
          await pullFromLinkedFile();
        }
      } catch (e) {
        // Permission loss or read error; stop auto pull
        clearInterval(autoPullTimer);
      }
    }, intervalMs);
  }

  function renderColumn(col) {
    const tpl = $('#columnTemplate');
    const frag = tpl.content.cloneNode(true);
    const section = $('.column', frag);
    section.dataset.columnId = col.id;
    $('.column-title', section).textContent = col.name;

    const addBtn = $('.add-card-btn', section);
    addBtn.addEventListener('click', () => openModal({ columnId: col.id }));

    const dropzone = $('.dropzone', section);
    setupDropzone(dropzone, col.id);

    // WIP badge
    const wipBtn = $('.wip-badge', section);
    if (wipBtn) {
      const limit = state.meta?.wip?.[col.id] ?? null;
      const count = state.columns[col.id].length;
      wipBtn.textContent = `${count}${limit ? ' / ' + limit : ''}`;
      wipBtn.addEventListener('click', () => {
        const current = state.meta?.wip?.[col.id] ?? '';
        const input = prompt(`Set WIP limit for ${col.name} (empty to clear):`, current === null ? '' : current);
        if (input === null) return;
        const value = input.trim() === '' ? null : Math.max(1, parseInt(input, 10) || 0);
        state.meta = state.meta || {}; state.meta.wip = state.meta.wip || {};
        state.meta.wip[col.id] = value;
        saveState();
        render();
      });
    }

    for (const cardId of state.columns[col.id]) {
      const card = state.cards[cardId];
      const node = renderCard(card);
      if (!matchesFilter(card)) node.classList.add('is-hidden');
      dropzone.appendChild(node);
    }

    return section;
  }

  function difficultyClass(diff) {
    const d = (diff || '').toLowerCase();
    if (d.includes('beginner-intermediate')) return 'diff-beginner-intermediate';
    if (d.includes('intermediate-advanced')) return 'diff-intermediate-advanced';
    if (d.includes('beginner')) return 'diff-beginner';
    if (d.includes('intermediate')) return 'diff-intermediate';
    return 'diff-advanced';
  }

  function renderCard(card) {
    const tpl = $('#cardTemplate');
    const frag = tpl.content.cloneNode(true);
    const el = $('.card', frag);
    el.dataset.cardId = card.id;

    // Compact card: title only, difficulty accent via class
    $('.card-title', el).textContent = card.title;
    el.classList.add(difficultyClass(card.difficulty));
    el.title = `${card.title}\n${card.difficulty || ''}${card.length ? ' • ' + card.length : ''}`;

    // Drag & Drop
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('dragend', onDragEnd);

    // Edit on click shows full details in modal
    el.addEventListener('click', () => openModal({ cardId: card.id }));

    return el;
  }

  function makeBadge(label, value, extraClass = '') {
    const span = document.createElement('span');
    span.className = `badge ${extraClass}`.trim();
    const dot = document.createElement('span');
    dot.className = 'dot';
    const text = document.createElement('span');
    text.textContent = `${label}: ${value}`;
    span.append(dot, text);
    return span;
  }

  // Drag & Drop handlers
  let dragInfo = null; // { cardId, fromColumn }

  function onDragStart(e) {
    const el = e.currentTarget;
    const cardId = el.dataset.cardId;
    const fromColumn = findCardColumn(cardId);
    dragInfo = { cardId, fromColumn };
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => el.classList.add('dragging'));
  }

  function onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    dragInfo = null;
    $$('.dropzone').forEach(z => z.classList.remove('is-over'));
  }

  function setupDropzone(zone, columnId) {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('is-over');
      const afterEl = getDragAfterElement(zone, e.clientY);
      const dragging = $('.card.dragging');
      if (!dragging) return;
      if (afterEl == null) zone.appendChild(dragging);
      else zone.insertBefore(dragging, afterEl);
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('is-over');
      const cardId = dragInfo?.cardId || e.dataTransfer.getData('text/plain');
      if (!cardId) return;
      // Enforce WIP
      const limit = state.meta?.wip?.[columnId];
      if (limit && state.columns[columnId].length >= limit && dragInfo?.fromColumn !== columnId) {
        toast(`WIP limit reached for ${getColName(columnId)}`);
        zone.classList.add('shake'); setTimeout(() => zone.classList.remove('shake'), 450);
        render();
        return;
      }
      moveCard(cardId, dragInfo?.fromColumn, columnId, computeIndex(zone, cardId));
    });
  }

  function getDragAfterElement(container, y) {
    const elements = [...container.querySelectorAll('.card:not(.dragging)')];
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const offset = y - (rect.top + rect.height / 2);
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: el };
      }
    }
    return closest.element;
  }

  function computeIndex(zone, cardId) {
    const ids = $$('.card', zone).map(el => el.dataset.cardId);
    return ids.indexOf(cardId);
  }

  function findCardColumn(cardId) {
    for (const colId of Object.keys(state.columns)) {
      if (state.columns[colId].includes(cardId)) return colId;
    }
    return null;
  }

  function updateWipBadge(colId) {
    const section = document.querySelector(`.column[data-column-id="${colId}"]`);
    if (!section) return;
    const w = section.querySelector('.wip-badge');
    if (!w) return;
    const limit = state.meta?.wip?.[colId] ?? null;
    const count = state.columns[colId]?.length ?? 0;
    w.textContent = `${count}${limit ? ' / ' + limit : ''}`;
  }

  function moveCard(cardId, fromCol, toCol, toIndex) {
    if (!toCol) return;
    if (!fromCol) fromCol = findCardColumn(cardId);
    if (fromCol === toCol) {
      const arr = state.columns[toCol].filter(id => id !== cardId);
      arr.splice(toIndex, 0, cardId);
      state.columns[toCol] = arr;
    } else {
      // Defensive WIP check
      const limit = state.meta?.wip?.[toCol];
      if (limit && state.columns[toCol].length >= limit) {
        toast(`WIP limit reached for ${getColName(toCol)}`);
        render();
        return;
      }
      state.columns[fromCol] = state.columns[fromCol].filter(id => id !== cardId);
      const target = state.columns[toCol];
      target.splice(toIndex, 0, cardId);
    }
    saveState();
    // No full re-render needed; DOM already matches order from dragover logic
    // Update WIP badge counts for both source and destination
    updateWipBadge(toCol);
    if (fromCol && fromCol !== toCol) updateWipBadge(fromCol);
  }

  // Modal logic
  function openModal({ cardId = null, columnId = null } = {}) {
    const dlg = $('#cardModal');
    const title = $('#modalTitle');
    const deleteBtn = $('#deleteCardBtn');
    const idInput = $('#cardId');
    const colInput = $('#targetColumnId');
    const t = $('#titleInput');
    const d = $('#descriptionInput');
    const diff = $('#difficultyInput');
    const len = $('#lengthInput');

    if (cardId) {
      const c = state.cards[cardId];
      title.textContent = 'Edit Card';
      idInput.value = c.id;
      colInput.value = findCardColumn(cardId);
      t.value = c.title;
      d.value = c.description || '';
      diff.value = c.difficulty || 'Intermediate';
      len.value = c.length || '';
      deleteBtn.hidden = false;
    } else {
      title.textContent = 'Add Card';
      idInput.value = '';
      colInput.value = columnId || 'todo';
      t.value = '';
      d.value = '';
      diff.value = 'Intermediate';
      len.value = '';
      deleteBtn.hidden = true;
    }

    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', 'open');
  }

  function closeModal() {
    const dlg = $('#cardModal');
    if (dlg.open) dlg.close();
    else dlg.removeAttribute('open');
  }

  // Generic confirm modal
  function openConfirmModal({ title = 'Confirm', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel' } = {}) {
    return new Promise((resolve) => {
      const dlg = document.getElementById('confirmModal');
      const form = document.getElementById('confirmForm');
      const titleEl = document.getElementById('confirmTitle');
      const msgEl = document.getElementById('confirmMessage');
      const cancelBtn = document.getElementById('cancelConfirmBtn');
      const closeBtn = document.getElementById('closeConfirmBtn');
      const confirmBtn = document.getElementById('confirmConfirmBtn');

      titleEl.textContent = title;
      msgEl.textContent = message;
      cancelBtn.textContent = cancelText;
      confirmBtn.textContent = confirmText;

      function cleanup(result) {
        form.removeEventListener('submit', onSubmit);
        cancelBtn.removeEventListener('click', onCancel);
        closeBtn.removeEventListener('click', onCancel);
        if (dlg.open) dlg.close();
        resolve(result);
      }
      function onCancel() { cleanup(false); }
      function onSubmit(e) { e.preventDefault(); cleanup(true); }

      form.addEventListener('submit', onSubmit);
      cancelBtn.addEventListener('click', onCancel);
      closeBtn.addEventListener('click', onCancel);
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', 'open');
    });
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const idInput = $('#cardId');
    const colInput = $('#targetColumnId');
    const t = $('#titleInput');
    const d = $('#descriptionInput');
    const diff = $('#difficultyInput');
    const len = $('#lengthInput');

    const payload = {
      title: t.value.trim(),
      description: d.value.trim(),
      difficulty: diff.value.trim(),
      length: len.value.trim(),
    };
    if (!payload.title) { t.focus(); return; }

    const cardId = idInput.value || null;
    if (cardId) {
      // update
      const card = state.cards[cardId];
      Object.assign(card, payload, { updatedAt: Date.now() });
      saveState();
      render();
    } else {
      // create
      const colId = colInput.value || 'todo';
      const limit = state.meta?.wip?.[colId];
      if (limit && state.columns[colId].length >= limit) {
        toast(`WIP limit reached for ${getColName(colId)}`);
        return;
      }
      const id = genId();
      state.cards[id] = { id, ...payload, createdAt: Date.now(), updatedAt: Date.now() };
      state.columns[colId].unshift(id);
      saveState();
      render();
    }
    closeModal();
  }

  function handleDeleteCard() {
    const idInput = $('#cardId');
    const cardId = idInput.value;
    if (!cardId) return;
    openConfirmModal({ title: 'Delete Card', message: 'Are you sure you want to delete this card? This action cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel' }).then((ok) => {
      if (!ok) return;
      const col = findCardColumn(cardId);
      state.columns[col] = state.columns[col].filter(id => id !== cardId);
      delete state.cards[cardId];
      saveState();
      render();
      closeModal();
    });
  }

  // Export / Import
  function exportJson() {
    const payload = { meta: { exportedAt: new Date().toISOString(), app: 'kaban-board', version: 1 }, data: state };
    const canon = canonicalize(payload);
    if (!signerKey) { toast('Signer unavailable'); return; }
    // Sign and attach
    const sigPromise = signString(signerKey, canon);
    const out = { ...payload };
    sigPromise.then(sig => {
      out.sig = sig;
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kaban-board-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const data = parsed?.data || parsed; // signed wrapper expected
        // Verify signature if present and pubkey configured
        if (SIGN_PUB_JWK) {
          const pubVerify = importPubKey();
          Promise.resolve(pubVerify).then(async (pub) => {
            if (!pub) throw new Error('Verification key missing');
            const payload = { meta: parsed.meta || {}, data };
            const canon = canonicalize(payload);
            const ok = parsed.sig && await verifyString(pub, canon, parsed.sig);
            if (!ok) {
              // Allow owner to override for legacy/unsigned files
              if (await ensureSigner()) {
                const proceed = await openConfirmModal({ title: 'Import Unsigned File', message: 'Signature is missing or invalid. Import and re-sign this file with your key?', confirmText: 'Import & Sign', cancelText: 'Cancel' });
                if (!proceed) return;
                state = data;
                saveState();
                render();
                toast('Imported and trusted (will be signed on next write)');
                return;
              }
              throw new Error('Signature verification failed');
            }
            state = data;
            saveState();
            render();
          }).catch(err => { alert('Import failed: ' + err.message); });
          return;
        }
        if (!data || !data.cards || !data.columns) throw new Error('Invalid structure');
        // Basic shape checks
        for (const col of ['todo','inprogress','review','done']) {
          if (!Array.isArray(data.columns[col])) throw new Error('Missing column: ' + col);
        }
        state = data;
        saveState();
        render();
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function resetToSeed() {
    openConfirmModal({ title: 'Reset Board', message: 'Reset the board to the initial seeded content? This will overwrite current data.', confirmText: 'Reset', cancelText: 'Cancel' })
      .then((ok) => {
        if (!ok) return;
        state = seedData();
        saveState();
        render();
      });
  }

  // Search/filter
  let currentQuery = '';
  function setQuery(q) { currentQuery = (q || '').trim().toLowerCase(); render(); }
  function matchesFilter(card) {
    if (!currentQuery) return true;
    const hay = `${card.title}\n${card.description}\n${card.difficulty}\n${card.length}`.toLowerCase();
    return hay.includes(currentQuery);
  }

  // Toasts
  let toastTimer = null;
  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) { alert(msg); return; }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  function getColName(id) { return (columns.find(c => c.id === id) || {}).name || id; }

  // Event wiring
  function wireUI() {
    $('#exportBtn').addEventListener('click', async () => { if (await ensureSigner()) exportJson(); });
    // Gate import before opening picker
    const importBtn = document.getElementById('importBtn');
    if (importBtn) importBtn.addEventListener('click', async (e) => { e.preventDefault(); if (await ensureSigner()) document.getElementById('importInput').click(); });
    $('#importInput').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file && await ensureSigner()) importJson(file);
      e.target.value = '';
    });
    $('#clearBoardBtn').addEventListener('click', async () => { if (await ensureSigner()) resetToSeed(); });
    $('#themeToggle').addEventListener('click', cycleTheme);
    // JSON link/pull
    const linkBtn = $('#linkJsonBtn');
    const pullBtn = $('#pullJsonBtn');
    linkBtn.addEventListener('click', async () => {
      if (linkedFileHandle) {
        if (!(await ensureSigner())) return;
        await unlinkJsonFile();
        clearInterval(autoPullTimer);
        lastFileMtimeMs = 0; lastSyncAtMs = 0; updateLinkedStatus();
      } else {
        if (!(await ensureSigner())) return;
        await linkJsonFile();
        if (linkedFileHandle) { startAutoPull(); updateLinkedStatus(); }
      }
      linkBtn.textContent = linkedFileHandle ? 'Unlink JSON' : 'Link JSON';
    });
    pullBtn.addEventListener('click', () => pullFromLinkedFile(true));
    const dens = document.getElementById('densityToggle');
    if (dens) dens.addEventListener('click', cycleDensity);
    const search = document.getElementById('searchInput');
    if (search) search.addEventListener('input', (e) => setQuery(e.target.value));

    // Modal
    // Adding/editing cards does not require signing; only destructive/global actions do
    $('#cardForm').addEventListener('submit', handleFormSubmit);
    $('#deleteCardBtn').addEventListener('click', async () => { if (await ensureSigner()) handleDeleteCard(); });
    $('#closeModalBtn').addEventListener('click', closeModal);
    $('#cancelBtn').addEventListener('click', closeModal);

    // Mobile menu
    const menuBtn = document.getElementById('mobileMenuBtn');
    const menuDlg = document.getElementById('menuModal');
    if (menuBtn && menuDlg) {
      menuBtn.addEventListener('click', () => (typeof menuDlg.showModal === 'function' ? menuDlg.showModal() : menuDlg.setAttribute('open','open')));
      menuDlg.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        if (action === 'close') { if (menuDlg.open) menuDlg.close(); return; }
        if (action === 'export') { if (await ensureSigner()) exportJson(); }
        if (action === 'import') { if (await ensureSigner()) document.getElementById('importInputMobile').click(); }
        if (action === 'reset') { if (await ensureSigner()) resetToSeed(); }
        if (action === 'link') {
          const linkBtn = document.getElementById('linkJsonBtn');
          if (linkedFileHandle) { if (await ensureSigner()) { await unlinkJsonFile(); clearInterval(autoPullTimer); lastFileMtimeMs=0; lastSyncAtMs=0; updateLinkedStatus(); linkBtn.textContent='Link JSON'; } }
          else { if (await ensureSigner()) { await linkJsonFile(); if (linkedFileHandle){ startAutoPull(); updateLinkedStatus(); linkBtn.textContent='Unlink JSON'; } } }
        }
        if (action === 'pull') { pullFromLinkedFile(); }
        if (action === 'density') { cycleDensity(); }
        if (action === 'theme') { cycleTheme(); }
      });
      const importMobile = document.getElementById('importInputMobile');
      if (importMobile) importMobile.addEventListener('change', async (e) => { const file = e.target.files?.[0]; if (file && await ensureSigner()) importJson(file); e.target.value=''; });
      const pullMobile = document.getElementById('pullMobile');
      if (pullMobile) {
        const sync = () => { pullMobile.disabled = !linkedFileHandle; };
        const pullBtn = document.getElementById('pullJsonBtn');
        if (pullBtn) new MutationObserver(sync).observe(pullBtn, { attributes:true, attributeFilter:['disabled'] });
        sync();
      }
    }
  }

  // Boot
  window.addEventListener('DOMContentLoaded', () => {
    // Ensure all dialogs start closed (avoid invisible overlays)
    ['cardModal','authModal','confirmModal','menuModal'].forEach(id => { const d=document.getElementById(id); if (d && d.open) try{ d.close(); }catch{} });
    initTheme();
    initDensity();
    state = loadState() || seedData();
    wireUI();
    render();
    // Try restore linked file handle from IDB
    if (fsSupported()) {
      idbGetHandle().then(async (h) => {
        if (h) {
          linkedFileHandle = h;
          $('#pullJsonBtn').disabled = false;
          $('#linkJsonBtn').textContent = 'Unlink JSON';
          // Optional: initial pull to ensure sync
          try {
            await pullFromLinkedFile();
          } catch {}
          updateLinkedStatus();
          startAutoPull();
        }
      });
    }
  });
})();
