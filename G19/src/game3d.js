// ===========================================================================
// CmdLine Rescue — 3D FIRST-PERSON / TACTICAL-ESPIONAGE (Three.js)
// First-person mouse-look, a scanner device in your right hand, checkpoints,
// and heart pickups you collect. Reuses LEVELS/OUTRO from levels.js.
// To revert to 2D: restore index.html to load game.js (see index-2d.html).
// ===========================================================================

const canvas = document.getElementById("scene");
const crosshair = document.getElementById("crosshair");
const lockHint = document.getElementById("lock-hint");

// --- HUD refs ---
const elLevelName = document.getElementById("level-name");
const elProgress = document.getElementById("progress");
const elScore = document.getElementById("score");
const elHearts = document.getElementById("hearts");
const elTicker = document.getElementById("ticker-text");
const elCards = document.getElementById("cards");
const elHi = document.getElementById("hi");
const elStamina = document.getElementById("stamina");
const elStaminaFill = document.getElementById("stamina-fill");
const toastEl = document.getElementById("toast");
const cheatEl = document.getElementById("cheatsheet");
const cheatContent = document.getElementById("cheat-content");
const cheatClose = document.getElementById("cheat-close");

// Debug keys only when ?debug is in the URL
const DEBUG = new URLSearchParams(location.search).has("debug");
const HISCORE_KEY = "cdlinerescue_hi";

// --- Overlay refs ---
const overlay = document.getElementById("overlay");
const pzTopic = document.getElementById("puzzle-topic");
const pzTitle = document.getElementById("puzzle-title");
const pzQuestion = document.getElementById("puzzle-question");
const pzChoices = document.getElementById("puzzle-choices");
const pzInputWrap = document.getElementById("puzzle-input-wrap");
const pzInput = document.getElementById("puzzle-input");
const pzFeedback = document.getElementById("puzzle-feedback");
const pzSubmit = document.getElementById("puzzle-submit");

// --- Story refs ---
const story = document.getElementById("story");
const storyArt = document.getElementById("story-art");
const storyTitle = document.getElementById("story-title");
const storyText = document.getElementById("story-text");
const storyBtn = document.getElementById("story-btn");

// --- Pause / cancel refs ---
const pauseEl = document.getElementById("pause");
const resumeBtn = document.getElementById("resume-btn");
const restartBtn = document.getElementById("restart-btn");
const pzCancel = document.getElementById("puzzle-cancel");
const bossBar = document.getElementById("boss-bar");
const bossFill = document.getElementById("boss-fill");

// --- Game state ---
const MAX_HEARTS = 5;
const START_HEARTS = 3;
const state = {
  levelIndex: 0,
  score: 0,
  hearts: START_HEARTS,
  paused: true,
  attempts: 0,
  checkpoints: [],
  pickups: [],
  activeCheckpoint: null,
  yaw: 0,
  pitch: 0,
  walkBob: 0,
  isMenuPaused: false,
  pauseStart: 0,
  enemies: [],
  bossActive: false,
  bossNode: null,
  pickupCells: [],
  cards: [],
  cardsCollected: 0,
  stamina: 1,
  revealUntil: 0,
  hiScore: +(localStorage.getItem("cdlinerescue_hi") || 0),
  lastStep: 0,
  unlocked: [],
  cheatOpen: false,
};

// ---------------------------------------------------------------------------
// Input: keyboard + pointer-lock mouse-look
// ---------------------------------------------------------------------------
const keys = {};
function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  // Esc while a checkpoint popup is open = back out of it
  if (k === "escape" && !overlay.classList.contains("hidden") && state.activeCheckpoint) {
    e.preventDefault();
    cancelPuzzle();
    return;
  }
  if (k === "escape" && state.cheatOpen) { e.preventDefault(); closeCheatSheet(); return; }
  if (isTyping(e)) return;
  // H toggles the cheat sheet (collected recap cards)
  if (k === "h") { toggleCheatSheet(); return; }
  // P toggles pause
  if (k === "p") {
    if (state.isMenuPaused) resumeGame();
    else pauseGame();
    return;
  }
  // J = manually trigger a jumpscare + chase (debug only)
  if (DEBUG && k === "j" && gameplayActive()) {
    triggerJumpscare();
    state.nextScareAt = performance.now() + 12000;
    return;
  }
  // + / = : DEBUG skip to next level (or straight to ending during boss)
  if (DEBUG && (k === "+" || k === "=") && gameplayActive()) {
    e.preventDefault();
    despawnEnemy();
    if (state.bossActive) winGame();
    else onLevelComplete();
    return;
  }
  keys[k] = true;
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
});
window.addEventListener("keyup", (e) => {
  if (isTyping(e)) return;
  keys[e.key.toLowerCase()] = false;
});

const isLocked = () => document.pointerLockElement === canvas;
canvas.addEventListener("click", () => {
  if (!state.paused && !isLocked()) canvas.requestPointerLock();
});
document.addEventListener("pointerlockchange", () => {
  const locked = isLocked();
  crosshair.style.display = locked ? "block" : "none";
  lockHint.style.display = locked || state.paused ? "none" : "block";
  // Pressing Esc releases the mouse during play -> open the pause menu
  if (!locked && gameplayActive()) pauseGame();
});
document.addEventListener("mousemove", (e) => {
  if (!isLocked()) return;
  state.yaw -= e.movementX * 0.0025;
  state.pitch -= e.movementY * 0.0025;
  state.pitch = Math.max(-0.6, Math.min(0.5, state.pitch));
});

// ---------------------------------------------------------------------------
// Three.js setup
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07060a);
scene.fog = new THREE.Fog(0x07060a, 12, 52);

const camera = new THREE.PerspectiveCamera(72, canvas.width / canvas.height, 0.05, 200);
camera.position.set(0, 1.7, 0);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(canvas.width, canvas.height, false);
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// --- Procedural textures (no asset files needed) ---
function makeTex(w, h, draw, repX = 1, repY = 1, srgb = true) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  draw(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  t.anisotropy = 8;
  if (srgb) t.encoding = THREE.sRGBEncoding;
  return t;
}
const floorTex = makeTex(256, 256, (c, w, h) => {
  c.fillStyle = "#3a2a1c"; c.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 32) {
    c.fillStyle = (i / 32) % 2 ? "#34251a" : "#2b1e14";
    c.fillRect(i, 0, 32, h);
    c.strokeStyle = "rgba(0,0,0,0.45)"; c.lineWidth = 2; c.strokeRect(i, 0, 32, h);
  }
  for (let n = 0; n < 5000; n++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`; c.fillRect(Math.random() * w, Math.random() * h, 1, 3); }
}, 18, 9);
const wallTex = makeTex(256, 256, (c, w, h) => {
  c.fillStyle = "#4c4238"; c.fillRect(0, 0, w, h);
  for (let n = 0; n < 7000; n++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.09})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  for (let n = 0; n < 160; n++) { c.fillStyle = "rgba(255,255,255,0.03)"; c.fillRect(Math.random() * w, Math.random() * h, 1, Math.random() * 24); }
}, 7, 2);
const ceilTex = makeTex(128, 128, (c, w, h) => {
  c.fillStyle = "#1b1a18"; c.fillRect(0, 0, w, h);
  for (let n = 0; n < 2500; n++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}, 12, 6);

// Lights — dim horror, warm fill so materials read as "real".
scene.add(new THREE.AmbientLight(0x2a2320, 0.45));
scene.add(new THREE.HemisphereLight(0x35405a, 0x140d08, 0.45));
const moon = new THREE.DirectionalLight(0x3a4a66, 0.3);
moon.position.set(-12, 24, -8);
scene.add(moon);

// Flashlight mounted on the camera (comes from the device) — casts real shadows
const flashlight = new THREE.SpotLight(0xffe9c2, 2.4, 38, 0.6, 0.5, 1.1);
flashlight.position.set(0.2, -0.1, 0);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(1024, 1024);
flashlight.shadow.camera.near = 0.4;
flashlight.shadow.camera.far = 42;
flashlight.shadow.bias = -0.0004;
const flashTarget = new THREE.Object3D();
flashTarget.position.set(0, -0.3, -1);
camera.add(flashlight);
camera.add(flashTarget);
flashlight.target = flashTarget;

// House dimensions
const ARENA_X = 40;
const ARENA_Z = 20;
const WALL_H = 5;

// Textured wooden floor + ceiling
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ARENA_X * 2, ARENA_Z * 2),
  new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.05 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(ARENA_X * 2, ARENA_Z * 2),
  new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 1 })
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = WALL_H;
scene.add(ceiling);

// --- Wall system with collision boxes ---
const walls = []; // { minX, maxX, minZ, maxZ }
const flickerLights = [];
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0 });

function addWall(minX, maxX, minZ, maxZ) {
  const w = maxX - minX, d = maxZ - minZ;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMat);
  m.position.set((minX + maxX) / 2, WALL_H / 2, (minZ + maxZ) / 2);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  walls.push({ minX, maxX, minZ, maxZ });
  return m;
}

// Generic solid furniture piece (mesh + collision footprint)
function addSolid(x, z, w, h, d, mat, collide = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  if (collide) walls.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  return m;
}
// Low decor (no collision): monitors, rugs, props
function addDecor(x, y, z, w, h, d, color, emissive = 0x000000, ei = 0.6) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: emissive ? ei : 0, roughness: 0.7, metalness: 0.2 })
  );
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  return m;
}
function mat(color, rough = 0.8, metal = 0.1) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

// Perimeter
addWall(-ARENA_X - 1, ARENA_X + 1, -ARENA_Z - 1, -ARENA_Z);
addWall(-ARENA_X - 1, ARENA_X + 1, ARENA_Z, ARENA_Z + 1);
addWall(-ARENA_X - 1, -ARENA_X, -ARENA_Z, ARENA_Z);
addWall(ARENA_X, ARENA_X + 1, -ARENA_Z, ARENA_Z);

// --- Floor plan: 3 columns x 2 rows = 6 rooms, connected by offset doorways ---
const DIV1 = -ARENA_X / 3; // vertical wall x
const DIV2 = ARENA_X / 3;
const DIVZ = 0;            // horizontal wall z
const COLX = [(-ARENA_X + DIV1) / 2, 0, (DIV2 + ARENA_X) / 2];
const ROWZ = [-ARENA_Z / 2, ARENA_Z / 2];

function doorLight(x, z, color) {
  const gl = new THREE.PointLight(color, 0.0, 8);
  gl.position.set(x, 2.5, z);
  scene.add(gl);
}
// vertical dividers (gap = doorway); door frame posts add depth
function vDivider(xC, gapMin, gapMax) {
  addWall(xC - 0.5, xC + 0.5, -ARENA_Z, gapMin);
  addWall(xC - 0.5, xC + 0.5, gapMax, ARENA_Z);
  addSolid(xC, gapMin - 0.2, 1.4, WALL_H, 0.5, mat(0x2a2018), false);
  addSolid(xC, gapMax + 0.2, 1.4, WALL_H, 0.5, mat(0x2a2018), false);
}
function hDivider(zC, gaps) {
  let prev = -ARENA_X;
  for (const [gs, ge] of gaps) {
    addWall(prev, gs, zC - 0.5, zC + 0.5);
    prev = ge;
  }
  addWall(prev, ARENA_X, zC - 0.5, zC + 0.5);
}
vDivider(DIV1, 5, 11);   // col0<->col1 via back row
vDivider(DIV2, -11, -5); // col1<->col2 via front row
hDivider(DIVZ, [[-30, -24], [-3, 3], [24, 30]]); // front<->back per column

// 6 room definitions (cellIdx = col*2 + row)
const ROOMS = [];
const THEMES = ["SERVER", "BEDROOM", "LIVING", "KITCHEN", "LAB", "OFFICE"];
for (let col = 0; col < 3; col++)
  for (let row = 0; row < 2; row++)
    ROOMS.push({ x: COLX[col], z: ROWZ[row], col, row, theme: THEMES[col * 2 + row] });
const ROOM_X = COLX; // kept for boss node / spawn fallback

function ceilingLamp(x, z, color, intensity = 0.9) {
  const l = new THREE.PointLight(color, intensity, 24);
  l.position.set(x, WALL_H - 0.6, z);
  scene.add(l);
  addDecor(x, WALL_H - 0.15, z, 1.4, 0.2, 1.4, 0x0b0b0b, color, 0.9); // fixture glow
  flickerLights.push(l);
  return l;
}

function buildHouseDecor() {
  const woodDark = mat(0x2c1d12), woodMid = mat(0x4a3320), metalD = mat(0x14161a, 0.5, 0.7),
    fabric = mat(0x3a2a3a, 0.95, 0), white = mat(0x9a8f80, 0.9), steel = mat(0x2a2d32, 0.4, 0.6);

  ROOMS.forEach((r) => {
    const cx = r.x, cz = r.z;
    switch (r.theme) {
      case "SERVER": {
        ceilingLamp(cx, cz, 0x3366aa, 0.7);
        for (let i = -1; i <= 1; i++) {
          const rk = addSolid(cx + i * 3, cz - 6, 1.8, 4, 1.4, metalD);
          rk.material = metalD;
          for (let j = 0; j < 6; j++) addDecor(cx + i * 3, 0.6 + j * 0.6, cz - 5.3, 1.5, 0.15, 0.1, 0x081018, 0x1e88ff, 0.7);
        }
        addSolid(cx, cz + 6, 5, 1, 1.4, steel); // console bench
        addDecor(cx, 1.6, cz + 6, 2.2, 1.2, 0.1, 0x02060c, 0x2299ff, 0.8); // monitor
        break;
      }
      case "BEDROOM": {
        ceilingLamp(cx, cz, 0xaa7744, 0.75);
        addSolid(cx - 5, cz, 5, 1, 6.5, mat(0x3a2418)); // bed base
        addDecor(cx - 5, 1.15, cz, 5, 0.4, 6.5, 0x6a5566); // mattress
        addDecor(cx - 5, 1.4, cz - 2.2, 4.6, 0.5, 1.6, 0xbfb4a6); // pillow
        addSolid(cx + 5, cz - 5, 2, 3, 1.6, woodMid); // wardrobe
        addSolid(cx + 4.5, cz + 5, 1.6, 1.2, 1.6, woodDark); // nightstand
        break;
      }
      case "LIVING": {
        ceilingLamp(cx, cz, 0xaa6633, 0.8);
        addSolid(cx, cz + 6, 6, 1.4, 1.8, fabric); // couch
        addDecor(cx, 1.7, cz + 6.7, 6, 1, 0.5, 0x2f2230); // couch back
        addSolid(cx, cz - 5, 3, 0.9, 1.6, woodMid); // coffee table
        addDecor(cx, 0.03, cz, 7, 0.06, 7, 0x3a1414); // rug
        addSolid(cx - 7, cz, 0.6, 3.5, 4, mat(0x101010)); // TV cabinet side
        addDecor(cx - 6.6, 2.2, cz, 0.1, 2.2, 3.6, 0x000000, 0x113355, 0.5); // TV screen
        break;
      }
      case "KITCHEN": {
        ceilingLamp(cx, cz, 0xbbbbaa, 0.9);
        addSolid(cx, cz + 6, 8, 1.6, 1.4, white); // counter
        addDecor(cx, 1.45, cz + 6, 8, 0.1, 1.4, 0x2a2a2e, 0x222222, 0.2); // countertop
        addSolid(cx - 5, cz - 5, 2.2, 3, 2.2, steel); // fridge
        addSolid(cx + 4, cz - 5, 2.5, 1.6, 2, mat(0x20140c)); // table
        break;
      }
      case "LAB": {
        ceilingLamp(cx, cz, 0x77aa55, 0.8);
        addSolid(cx, cz - 6, 8, 1.5, 1.5, steel); // bench
        for (let i = -1; i <= 1; i++) addDecor(cx + i * 2.4, 1.7, cz - 6, 1, 1, 1, 0x0a1a0a, 0x33ff66, 0.5);
        addSolid(cx + 6, cz, 1, 3.6, 3.5, woodDark); // shelf
        addSolid(cx - 5, cz + 5, 2, 1.2, 2, steel); // cart
        break;
      }
      case "OFFICE": {
        ceilingLamp(cx, cz, 0x99aabb, 0.85);
        addSolid(cx, cz, 4, 1.1, 2, woodMid); // desk
        addDecor(cx, 1.7, cz - 0.6, 2, 1.2, 0.1, 0x02040a, 0x3388ff, 0.7); // monitor
        addSolid(cx, cz + 2.5, 1.4, 1.1, 1.4, mat(0x141414)); // chair
        addSolid(cx + 6, cz - 5, 1, 3.8, 4, woodDark); // bookshelf
        addSolid(cx - 6, cz + 5, 2.4, 1.6, 1.2, mat(0x1a120a)); // cabinet
        break;
      }
    }
  });
}
buildHouseDecor();

// ---------------------------------------------------------------------------
// Right-hand device (viewmodel) — a handheld network scanner
// ---------------------------------------------------------------------------
const device = new THREE.Group();
const deviceBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.32, 0.5, 0.09),
  new THREE.MeshStandardMaterial({ color: 0x14231a, roughness: 0.6, metalness: 0.5 })
);
device.add(deviceBody);
// Live minimap rendered to a canvas texture on the device screen
const miniCanvas = document.createElement("canvas");
miniCanvas.width = 128;
miniCanvas.height = 160;
const miniCtx = miniCanvas.getContext("2d");
const miniTex = new THREE.CanvasTexture(miniCanvas);
let levelColor = "#33ff66";
const deviceScreen = new THREE.Mesh(
  new THREE.PlaneGeometry(0.24, 0.3),
  new THREE.MeshBasicMaterial({ map: miniTex })
);
deviceScreen.position.set(0, 0.06, 0.048);
device.add(deviceScreen);
const deviceLight = new THREE.PointLight(0x33ff66, 0.7, 3);
deviceLight.position.set(0, 0.1, 0.2);
device.add(deviceLight);
// a little "antenna"
const antenna = new THREE.Mesh(
  new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6),
  new THREE.MeshStandardMaterial({ color: 0x99ffbb })
);
antenna.position.set(0.12, 0.35, 0);
device.add(antenna);
// hold it low-right, tilted toward view
device.position.set(0.38, -0.34, -0.72);
device.rotation.set(0.15, -0.35, 0.05);
camera.add(device);

// ---------------------------------------------------------------------------
// Level building
// ---------------------------------------------------------------------------
function disposeGroup(g) { scene.remove(g); }

function clearLevelObjects() {
  for (const cp of state.checkpoints) disposeGroup(cp.mesh);
  for (const p of state.pickups) disposeGroup(p.mesh);
  for (const c of state.cards) disposeGroup(c.mesh);
  state.checkpoints = [];
  state.pickups = [];
  state.cards = [];
}

function makeHeartPickup(x, z) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.5),
    new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0xff1133, emissiveIntensity: 0.8 })
  );
  group.add(core);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.05, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xff8899 })
  );
  halo.rotation.x = Math.PI / 2;
  group.add(halo);
  const l = new THREE.PointLight(0xff3355, 1, 6);
  group.add(l);
  group.position.set(x, 1.1, z);
  scene.add(group);
  return { x, z, mesh: group, core, halo, taken: false };
}

// Collectible RECAP CARD (acts like a key: shows a concept recap + reveals the map)
function makeCardPickup(x, z) {
  const group = new THREE.Group();
  const card = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.2, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xaa7700, emissiveIntensity: 0.7, roughness: 0.4, metalness: 0.3 })
  );
  card.castShadow = true;
  group.add(card);
  const l = new THREE.PointLight(0xffcc44, 1, 7);
  group.add(l);
  group.position.set(x, 1.3, z);
  scene.add(group);
  return { x, z, mesh: group, card, taken: false };
}

// --- Random placement helpers (6 rooms, central spots so items clear furniture) ---
function randInRoom(cellIdx) {
  const r = ROOMS[cellIdx];
  return {
    x: r.x + (Math.random() - 0.5) * 10,
    z: r.z + (Math.random() - 0.5) * 7,
  };
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Per-level difficulty scaling (index 0..3)
function difficulty(lv = state.levelIndex) {
  return {
    shiftMs: Math.max(6000, 20000 - lv * 4500), // 20s -> 15.5 -> 11 -> 6.5s
    enemiesPerScare: Math.min(4, 1 + lv),        // 1,2,3,4
    glitch: lv,                                  // 0..3 CSS glitch intensity
    torchFlicker: 0.02 + lv * 0.05,              // flashlight dropout chance/frame
    checkpointJitter: lv * 0.04,                 // how much pillars glitch-jitter
  };
}

function applyGlitchClass(lv) {
  gameWrap.classList.remove("glitch-1", "glitch-2", "glitch-3");
  if (lv >= 1) gameWrap.classList.add("glitch-" + Math.min(3, lv));
}

function buildLevel(index) {
  clearLevelObjects();
  const level = LEVELS[index];
  const chosen = shuffle(level.checkpoints.slice()).slice(0, 3); // random 3 of the pool
  const n = chosen.length;
  const color = new THREE.Color(level.color);
  levelColor = level.color;
  const cells = shuffle([0, 1, 2, 3, 4, 5]); // distinct rooms across the 6
  state.pickupCells = cells.slice(n, n + 3);

  for (let i = 0; i < n; i++) {
    const pos = randInRoom(cells[i]);
    const x = pos.x, z = pos.z;

    const group = new THREE.Group();
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.3, 3.4, 6),
      new THREE.MeshStandardMaterial({
        color: level.color, emissive: level.color,
        emissiveIntensity: 0.6, transparent: true, opacity: 0.85,
      })
    );
    pillar.position.y = 1.7;
    group.add(pillar);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.11, 8, 32),
      new THREE.MeshBasicMaterial({ color: level.color })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    group.add(ring);
    const light = new THREE.PointLight(color.getHex(), 1.6, 15);
    light.position.y = 2.2;
    group.add(light);
    group.position.set(x, 0, z);
    scene.add(group);

    state.checkpoints.push({
      x, z, r: 2.3, solved: false, data: chosen[i],
      mesh: group, pillar, ring, light,
    });
  }

  // Heart pickups: one in each of 3 rooms that don't hold a checkpoint
  for (const cell of state.pickupCells) {
    const pos = randInRoom(cell);
    state.pickups.push(makeHeartPickup(pos.x, pos.z));
  }
  // Recap CARD pickups (2 per level) — collectible "keys" that teach + reveal the map
  state.cardsCollected = 0;
  const cardCells = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 2);
  for (const cell of cardCells) {
    const pos = randInRoom(cell);
    state.cards.push(makeCardPickup(pos.x + 2, pos.z));
  }
  updateCards();
  state.stamina = 1;
  state.revealUntil = 0;

  despawnEnemy();
  if (state.bossNode) { scene.remove(state.bossNode.mesh); state.bossNode = null; }
  // reset player position/orientation (entrance of the house)
  camera.position.set(-ARENA_X + 4, 1.7, ARENA_Z - 4);
  state.yaw = -Math.PI / 2; // face down the +X corridor
  state.pitch = 0;
  state.bossActive = false;
  state.nextShiftAt = performance.now() + difficulty(index).shiftMs;
  applyGlitchClass(difficulty(index).glitch);
  gameWrap.classList.toggle("wander", index === LEVELS.length - 1); // final level drifts

  deviceLight.color.set(color.getHex());

  elLevelName.textContent = level.name;
  elProgress.textContent = `Level ${index + 1} / ${LEVELS.length}`;
  document.documentElement.style.setProperty("--green", level.color);
  const d = difficulty(index);
  setTicker(`${level.concept}: signal shifts every ${(d.shiftMs / 1000) | 0}s. Track it on your device, grab ♥ packs, survive the hunt!`);
}

function setTicker(msg) { elTicker.textContent = msg; }

function updateHearts() {
  elHearts.textContent = "♥".repeat(state.hearts) + "♡".repeat(Math.max(0, MAX_HEARTS - state.hearts));
}
function updateCards() {
  elCards.textContent = `🆔 ${state.cardsCollected}/${state.cards.length || 2}`;
}
function updateHi() {
  elHi.textContent = `HI ${state.hiScore}`;
}
function saveHi() {
  if (state.score > state.hiScore) {
    state.hiScore = state.score;
    try { localStorage.setItem(HISCORE_KEY, String(state.hiScore)); } catch (e) {}
    updateHi();
  }
}
function gainHeart() {
  if (state.hearts < MAX_HEARTS) {
    state.hearts++;
    updateHearts();
    elHearts.classList.remove("heart-lost");
    void elHearts.offsetWidth;
    elHearts.classList.add("heart-lost");
    return true;
  }
  return false;
}
function loseHeart() {
  if (state.hearts > 0) state.hearts--;
  updateHearts();
  elHearts.classList.remove("heart-lost");
  void elHearts.offsetWidth;
  elHearts.classList.add("heart-lost");
  return state.hearts <= 0;
}

// ---------------------------------------------------------------------------
// Story screens (release pointer lock so the mouse is usable)
// ---------------------------------------------------------------------------
function releaseMouse() { if (isLocked()) document.exitPointerLock(); }

function showStory(data, onContinue) {
  state.paused = true;
  releaseMouse();
  storyArt.textContent = data.art || "";
  storyTitle.textContent = data.title;
  storyText.textContent = data.text;
  story.classList.remove("hidden");
  storyBtn.onclick = () => {
    story.classList.add("hidden");
    onContinue();
  };
}

// ---------------------------------------------------------------------------
// Pause menu
// ---------------------------------------------------------------------------
function gameplayActive() {
  return (
    !state.paused &&
    overlay.classList.contains("hidden") &&
    story.classList.contains("hidden")
  );
}
function pauseGame() {
  if (!gameplayActive()) return;
  state.paused = true;
  state.isMenuPaused = true;
  state.pauseStart = performance.now();
  releaseMouse();
  pauseEl.classList.remove("hidden");
}
function resumeGame() {
  if (!state.isMenuPaused) return;
  // shift all time-based deadlines forward by the paused duration
  const delta = performance.now() - state.pauseStart;
  state.nextShiftAt += delta;
  state.nextScareAt += delta;
  for (const e of state.enemies) { e.lastHit += delta; e.lastBeat += delta; }
  lastPing += delta;
  state.isMenuPaused = false;
  state.paused = false;
  pauseEl.classList.add("hidden");
  lockHint.style.display = "block";
}
resumeBtn.onclick = resumeGame;
restartBtn.onclick = () => {
  state.isMenuPaused = false;
  pauseEl.classList.add("hidden");
  state.hearts = START_HEARTS;
  updateHearts();
  buildLevel(state.levelIndex);
  state.paused = false;
  lockHint.style.display = "block";
};

// Brief non-blocking toast (doesn't pause the game)
let toastTimer = null;
function showToast(msg, ms = 4000) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), ms);
}

// Cheat sheet (H) — collected recap cards
function renderCheatSheet() {
  if (!state.unlocked.length) {
    cheatContent.innerHTML = "Collect \ud83c\udd94 recap cards in the rooms to fill your cheat sheet.";
    return;
  }
  cheatContent.innerHTML = state.unlocked
    .slice()
    .sort((a, b) => a - b)
    .map((i) => `<div class="card-entry"><b>${LEVELS[i].concept}</b>\n${LEVELS[i].recap || ""}</div>`)
    .join("");
}
function toggleCheatSheet() {
  if (state.cheatOpen) { closeCheatSheet(); return; }
  if (!gameplayActive()) return;
  state.cheatOpen = true;
  state.paused = true;
  state.pauseStart = performance.now();
  releaseMouse();
  renderCheatSheet();
  cheatEl.classList.remove("hidden");
}
function closeCheatSheet() {
  if (!state.cheatOpen) return;
  const delta = performance.now() - state.pauseStart;
  state.nextShiftAt += delta;
  state.nextScareAt += delta;
  for (const e of state.enemies) { e.lastHit += delta; e.lastBeat += delta; }
  lastPing += delta;
  state.cheatOpen = false;
  state.paused = false;
  cheatEl.classList.add("hidden");
  lockHint.style.display = "block";
}
cheatClose.onclick = closeCheatSheet;

// Cancel out of a checkpoint you ran into by accident
function cancelPuzzle() {
  const cp = state.activeCheckpoint;
  if (cp) cp.suppressed = true; // won't re-trigger until you step away
  overlay.classList.add("hidden");
  state.activeCheckpoint = null;
  state.paused = false;
  lockHint.style.display = "block";
  setTicker("Backed out of the checkpoint. Step away, then approach again to retry.");
}
pzCancel.onclick = cancelPuzzle;

// ---------------------------------------------------------------------------
// Puzzle popup
// ---------------------------------------------------------------------------
function openPuzzle(cp) {
  state.paused = true;
  releaseMouse();
  state.activeCheckpoint = cp;
  state.attempts = 0;
  const d = cp.data;

  bossBar.classList.add("hidden");
  pzCancel.classList.remove("hidden");
  pzTopic.textContent = d.topic;
  pzTitle.textContent = d.title;
  pzQuestion.innerHTML = d.question;
  pzFeedback.textContent = "";
  pzFeedback.className = "";
  pzChoices.innerHTML = "";
  pzChoices.classList.add("hidden");
  pzInputWrap.classList.add("hidden");
  pzSubmit.classList.add("hidden");

  if (d.type === "mc") {
    pzChoices.classList.remove("hidden");
    d.choices.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.textContent = choice;
      btn.onclick = () => handleMC(i, btn, d);
      pzChoices.appendChild(btn);
    });
  } else if (d.type === "cmd") {
    pzInputWrap.classList.remove("hidden");
    pzSubmit.classList.remove("hidden");
    pzInput.value = "";
    setTimeout(() => pzInput.focus(), 50);
    pzSubmit.onclick = () => handleCmd(d);
    pzInput.onkeydown = (e) => { if (e.key === "Enter") handleCmd(d); };
  }
  overlay.classList.remove("hidden");
}

function handleMC(i, btn, d) {
  if (btn.disabled) return;
  if (i === d.answer) { btn.classList.add("correct"); solveCheckpoint(); }
  else { btn.classList.add("wrong"); btn.disabled = true; wrongAnswer(d); }
}

function wrongAnswer(d) {
  state.attempts++;
  const dead = loseHeart();
  feedbackBad(d);
  if (dead) { setTimeout(gameOver, 900); return true; }
  return false;
}

function handleCmd(d) {
  const val = pzInput.value.trim().toLowerCase().replace(/\s+/g, " ");
  const ok = d.accept.map((a) => a.trim().toLowerCase()).includes(val);
  if (ok) {
    pzFeedback.className = "fb-good";
    pzFeedback.textContent = "✔ Command accepted.";
    solveCheckpoint();
  } else {
    if (!wrongAnswer(d)) pzInput.select();
  }
}

function feedbackBad(d) {
  pzFeedback.className = "fb-bad";
  let msg = `✗ Not quite — lost a heart (${state.hearts} left).`;
  if (d.hint) msg += `\n💡 Tip: ${d.hint}`;
  pzFeedback.textContent = msg;
}

function solveCheckpoint() {
  const cp = state.activeCheckpoint;
  cp.solved = true;
  cp.pillar.material.opacity = 0.25;
  cp.pillar.material.emissiveIntensity = 0.15;
  cp.ring.material.color.set(0x1c8a3a);
  cp.light.intensity = 0.3;

  // Solving a checkpoint purges the hunting enemies
  if (state.enemies.length && !state.bossActive)
    despawnEnemy("✅ Rogue processes terminated. The signal is clear — for now.");

  const gained = state.attempts === 0 ? 100 : Math.max(40, 100 - state.attempts * 25);
  state.score += gained;
  elScore.textContent = `SCORE ${state.score}`;
  pzFeedback.className = "fb-good";
  const why = cp.data.hint ? `\n💡 ${cp.data.hint}` : "";
  pzFeedback.textContent = `✔ Correct! +${gained} pts${why}`;
  beep(760, 0.08, 0.14);

  setTimeout(() => {
    overlay.classList.add("hidden");
    state.activeCheckpoint = null;
    state.paused = false;
    lockHint.style.display = "block";
    if (state.checkpoints.every((c) => c.solved)) onLevelComplete();
    else setTicker("Node breached! Advance to the next pillar. Click to re-enter view.");
  }, 1500);
}

// ---------------------------------------------------------------------------
// Level flow
// ---------------------------------------------------------------------------
function onLevelComplete() {
  const finished = LEVELS[state.levelIndex];
  saveHi();
  beep(880, 0.12, 0.16); setTimeout(() => beep(1170, 0.16, 0.16), 130); // level-clear sting
  showStory(
    { art: "  [ LEVEL CLEAR ]", title: `${finished.name} — cleared!`,
      text: `${finished.recap || ""}\n\nHearts left: ${state.hearts}   Cards: ${state.cardsCollected}   Score: ${state.score}` },
    () => {
      if (state.levelIndex + 1 < LEVELS.length) {
        state.levelIndex++;
        const next = LEVELS[state.levelIndex];
        showStory(next.intro, () => { buildLevel(state.levelIndex); state.paused = false; lockHint.style.display = "block"; });
      } else {
        startBossFight();
      }
    }
  );
}

// ---------------------------------------------------------------------------
// FINAL BOSS — "The Warden" firewall + hacking mini-quest
// ---------------------------------------------------------------------------
let bossQuest = { idx: 0, hp: 0 };

function startBossFight() {
  showStory(
    { art: "  [ FINAL FIREWALL ]", title: "The Warden",
      text: "Ada is behind one last barrier: The Warden, a self-defending firewall.\n\n" +
        "It will hunt you through the dark. Reach its core node and run the HACK to breach it — " +
        "answer every challenge to bring its integrity to zero." },
    setupBoss
  );
}

function setupBoss() {
  clearLevelObjects();
  despawnEnemy();
  if (state.bossNode) { scene.remove(state.bossNode.mesh); state.bossNode = null; }
  state.bossActive = true;
  gameWrap.classList.add("wander");
  state.hearts = START_HEARTS; // fresh hearts for each boss attempt
  updateHearts();
  bossQuest = { idx: 0, hp: BOSS.integrity };
  applyGlitchClass(3);
  // boss core node (red pillar) in the middle room
  const grp = new THREE.Group();
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0xff2b2b, emissive: 0xff0000, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 })
  );
  pillar.position.y = 2;
  grp.add(pillar);
  const l = new THREE.PointLight(0xff0000, 2, 20);
  l.position.y = 3;
  grp.add(l);
  grp.position.set(ROOM_X[1], 0, 0);
  scene.add(grp);
  state.bossNode = { x: ROOM_X[1], z: 0, mesh: grp };
  // spawn the Warden avatar to hunt you
  camera.position.set(-ARENA_X + 4, 1.7, ARENA_Z - 4);
  state.yaw = -Math.PI / 2;
  spawnEnemy(true);
  chaseBanner.classList.remove("hidden");
  setTicker("🔥 Reach the RED core node to start the hack. The Warden is hunting you!");
  state.paused = false;
  lockHint.style.display = "block";
}

function openBossQuest() {
  state.paused = true;
  releaseMouse();
  bossQuest.idx = 0;
  renderBossQuestion();
  overlay.classList.remove("hidden");
}

function renderBossQuestion() {
  const q = BOSS.questions[bossQuest.idx];
  pzCancel.classList.add("hidden");   // no backing out of the final hack
  bossBar.classList.remove("hidden");
  bossFill.style.width = (bossQuest.hp / BOSS.integrity) * 100 + "%";
  pzTopic.textContent = "FIREWALL HACK";
  pzTitle.textContent = `The Warden — integrity ${bossQuest.hp}/${BOSS.integrity}`;
  pzQuestion.innerHTML = q.q;
  pzFeedback.textContent = "";
  pzFeedback.className = "";
  pzInputWrap.classList.add("hidden");
  pzSubmit.classList.add("hidden");
  pzChoices.innerHTML = "";
  pzChoices.classList.remove("hidden");
  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = choice;
    btn.onclick = () => handleBossChoice(i, btn, q);
    pzChoices.appendChild(btn);
  });
}

function handleBossChoice(i, btn, q) {
  if (btn.disabled) return;
  if (i === q.answer) {
    btn.classList.add("correct");
    bossQuest.hp--;
    state.score += 150;
    elScore.textContent = `SCORE ${state.score}`;
    bossFill.style.width = (bossQuest.hp / BOSS.integrity) * 100 + "%";
    beep(700, 0.08, 0.15);
    if (bossQuest.hp <= 0) { winGame(); return; }
    pzFeedback.className = "fb-good";
    pzFeedback.textContent = "✔ Breach successful. Next layer...";
    bossQuest.idx = (bossQuest.idx + 1) % BOSS.questions.length;
    setTimeout(renderBossQuestion, 650);
  } else {
    btn.classList.add("wrong");
    btn.disabled = true;
    const dead = loseHeart();
    flashDamage();
    pzFeedback.className = "fb-bad";
    pzFeedback.textContent = `✗ Counter-intrusion! Lost a heart (${state.hearts} left). 💡 ${q.tip}`;
    if (dead) { overlay.classList.add("hidden"); setTimeout(gameOver, 350); }
  }
}

function winGame() {
  overlay.classList.add("hidden");
  bossBar.classList.add("hidden");
  state.bossActive = false;
  despawnEnemy();
  if (state.bossNode) { scene.remove(state.bossNode.mesh); state.bossNode = null; }
  gameWrap.classList.remove("glitch-1", "glitch-2", "glitch-3", "wander");
  saveHi();
  playEnding();
}

// A yes/no story screen (adds a temporary second button)
function showChoice(data, yesLabel, noLabel, onYes, onNo) {
  state.paused = true;
  releaseMouse();
  storyArt.textContent = data.art || "";
  storyTitle.textContent = data.title;
  storyText.textContent = data.text;
  story.classList.remove("hidden");
  let no = document.getElementById("story-btn2");
  if (!no) {
    no = document.createElement("button");
    no.id = "story-btn2";
    no.className = "btn-secondary";
    storyBtn.parentNode.appendChild(no);
  }
  const cleanup = () => {
    story.classList.add("hidden");
    storyBtn.textContent = "Continue";
    no.classList.add("hidden");
  };
  storyBtn.textContent = yesLabel;
  storyBtn.onclick = () => { cleanup(); onYes(); };
  no.classList.remove("hidden");
  no.textContent = noLabel;
  no.onclick = () => { cleanup(); onNo(); };
}

// Terminal farewell: player must type `echo bye`
function farewellPrompt(onDone) {
  state.paused = true;
  releaseMouse();
  bossBar.classList.add("hidden");
  pzCancel.classList.add("hidden");
  pzChoices.innerHTML = "";
  pzChoices.classList.add("hidden");
  pzTopic.textContent = "TERMINAL";
  pzTitle.textContent = "Close the channel";
  pzQuestion.innerHTML = "Ada is safe. Sign off — type <code>echo bye</code> to end the session.";
  pzFeedback.textContent = "";
  pzFeedback.className = "";
  pzInputWrap.classList.remove("hidden");
  pzSubmit.classList.remove("hidden");
  pzInput.value = "";
  setTimeout(() => pzInput.focus(), 60);
  const submit = () => {
    const val = pzInput.value.trim().toLowerCase().replace(/\s+/g, " ");
    if (val === "echo bye") {
      pzFeedback.className = "fb-good";
      pzFeedback.textContent = "bye";
      setTimeout(() => { overlay.classList.add("hidden"); onDone(); }, 900);
    } else {
      pzFeedback.className = "fb-bad";
      pzFeedback.textContent = "Type exactly: echo bye";
      pzInput.select();
    }
  };
  pzSubmit.onclick = submit;
  pzInput.onkeydown = (e) => { if (e.key === "Enter") submit(); };
  overlay.classList.remove("hidden");
}

// Full ending sequence: cutscene -> echo bye -> restart?
function playEnding() {
  showStory(
    { art: "   __\n  o  o   .-\"\"-.\n  |__|  /  A   \\\n  /||\\  \\ D A /\n        '-..-'", title: "You reach the last room",
      text: "The dark peels back. Slumped by the Warden's dead console — Ada.\n" +
        "She looks up as your flashlight finds her." },
    () =>
      showStory(
        { art: "  ( Ada )", title: "\"You came for me.\"",
          text: "Ada: \"I knew you'd follow the packets. You learned the whole stack to get here —\n" +
            "the CLI, the layers, TCP, UDP, the tools... even beat The Warden.\"\n\n" +
            "Ada: \"Let's go home. Close us out on the terminal.\"" },
        () =>
          farewellPrompt(() =>
            showChoice(
              { art: "  [ SESSION ENDED ]", title: `Ada rescued — Score: ${state.score}`,
                text: `Best score: ${state.hiScore}\nCards collected this run contributed to your total.\n\nRun the mission again?` },
              "Restart", "Quit",
              () => location.reload(),
              () =>
                showStory(
                  { art: "  \\o/", title: "Goodbye, operator", text: "Session closed. Refresh anytime to play again." },
                  () => {}
                )
            )
          )
      )
  );
}

function gameOver() {
  const wasBoss = state.bossActive;
  saveHi();
  overlay.classList.add("hidden");
  bossBar.classList.add("hidden");
  state.activeCheckpoint = null;
  state.bossActive = false;
  if (state.bossNode) { scene.remove(state.bossNode.mesh); state.bossNode = null; }
  despawnEnemy();
  showStory(
    wasBoss
      ? { art: "  [ FIREWALL HOLDS ]", title: "The Warden Wins... this time",
          text: "The Warden's counter-intrusion overwhelmed you before Ada was free.\n\n" +
            `Score: ${state.score}. Regroup and hit the firewall again — straight back into the boss fight.` }
      : { art: "  [ CONNECTION LOST ]", title: "Out of Hearts",
          text: "The firewall traced you back and dropped the link before you reached Ada.\n\n" +
            `You cleared up to Level ${state.levelIndex + 1} with a score of ${state.score}.\n\n` +
            "Don't give up — grab more ♥ packs and try the op again." },
    () => {
      if (wasBoss) {
        setupBoss(); // restart the boss fight only
      } else {
        state.hearts = START_HEARTS;
        updateHearts();
        buildLevel(state.levelIndex);
        state.paused = false;
        lockHint.style.display = "block";
      }
    }
  );
}

function startGame() {
  state.hearts = START_HEARTS;
  updateHearts();
  updateHi();
  showStory(LEVELS[0].intro, () => { buildLevel(0); state.paused = false; lockHint.style.display = "block"; });
}

// ---------------------------------------------------------------------------
// Wall collision
// ---------------------------------------------------------------------------
const PLAYER_R = 1.2;
function blocked(x, z) {
  for (const w of walls) {
    const cx = Math.max(w.minX, Math.min(x, w.maxX));
    const cz = Math.max(w.minZ, Math.min(z, w.maxZ));
    if ((x - cx) ** 2 + (z - cz) ** 2 < PLAYER_R * PLAYER_R) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Jumpscares — random, around corners, non-lethal but heart-pounding
// ---------------------------------------------------------------------------
const jumpscareEl = document.getElementById("jumpscare");
const gameWrap = document.getElementById("game-wrap");
state.nextScareAt = performance.now() + 4000; // grace period at start
let audioCtx = null;

function screech() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const t = ctx.currentTime;
    // noise burst
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    noise.connect(ng).connect(ctx.destination);
    noise.start(t);
    // dissonant tone sweep
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.35);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.35, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(og).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  } catch (e) { /* audio blocked; visual scare still fires */ }
}

function triggerJumpscare() {
  jumpscareEl.classList.remove("hidden");
  gameWrap.classList.remove("shake");
  void gameWrap.offsetWidth;
  gameWrap.classList.add("shake");
  screech();
  const dur = 380 + Math.random() * 350;
  setTimeout(() => {
    jumpscareEl.classList.add("hidden");
    spawnEnemies(difficulty().enemiesPerScare); // the scare becomes a chase
  }, dur);
}

function maybeJumpscare(now) {
  if (now < state.nextScareAt) return;
  if (state.enemies.length) return; // don't stack while already being chased
  // higher chance when near a doorway/corner (interior divider x lines)
  const nearDoor =
    Math.abs(camera.position.x - DIV1) < 4 || Math.abs(camera.position.x - DIV2) < 4;
  const chance = nearDoor ? 0.035 : 0.012;
  if (Math.random() < chance) {
    triggerJumpscare();
    state.nextScareAt = now + 8000 + Math.random() * 9000; // cooldown
  }
}

// ---------------------------------------------------------------------------
// Shifting checkpoints — the signal keeps moving
// ---------------------------------------------------------------------------
const SHIFT_MS = 20000;
function relocateCheckpoints() {
  const rooms = shuffle([0, 1, 2, 3, 4, 5]);
  let moved = 0;
  state.checkpoints.forEach((cp, i) => {
    if (cp.solved || cp === state.activeCheckpoint) return;
    const pos = randInRoom(rooms[i % rooms.length]);
    cp.x = pos.x;
    cp.z = pos.z;
    cp.mesh.position.set(pos.x, 0, pos.z);
    cp.suppressed = false;
    moved++;
  });
  if (moved) {
    setTicker("⚠ The signal jumped — checkpoints relocated! Re-scan on your device.");
    beep(200, 0.12, 0.25);
  }
}

// ---------------------------------------------------------------------------
// Signal audio (device proximity ping) + generic beep
// ---------------------------------------------------------------------------
function beep(freq, dur, vol) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch (e) {}
}
let lastPing = 0;
function pingSignal(now) {
  const target = nearestUnsolved();
  if (!target) return;
  const d = Math.hypot(target.x - camera.position.x, target.z - camera.position.z);
  // closer -> faster pings
  const interval = Math.max(140, Math.min(1300, d * 22));
  if (now - lastPing > interval) {
    lastPing = now;
    const freq = 500 + Math.max(0, 900 - d * 18);
    beep(freq, 0.06, 0.12);
  }
}
function nearestUnsolved() {
  let best = null, bd = Infinity;
  for (const cp of state.checkpoints) {
    if (cp.solved) continue;
    const d = Math.hypot(cp.x - camera.position.x, cp.z - camera.position.z);
    if (d < bd) { bd = d; best = cp; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Minimap on the device screen
// ---------------------------------------------------------------------------
function w2mx(z) { return ((z + ARENA_Z) / (2 * ARENA_Z)) * miniCanvas.width; }
function w2my(x) { return ((x + ARENA_X) / (2 * ARENA_X)) * miniCanvas.height; }
function drawMinimap(now) {
  const c = miniCtx, W = miniCanvas.width, Hh = miniCanvas.height;
  c.fillStyle = "#031005";
  c.fillRect(0, 0, W, Hh);
  // scan sweep
  c.strokeStyle = "rgba(51,255,102,0.15)";
  c.lineWidth = 1;
  for (let y = 0; y < Hh; y += 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  // room dividers (drawn as vertical world-x lines => horizontal on portrait map)
  c.strokeStyle = levelColor;
  c.globalAlpha = 0.5;
  [DIV1, DIV2].forEach((dx) => {
    const my = w2my(dx);
    c.beginPath(); c.moveTo(0, my); c.lineTo(W, my); c.stroke();
  });
  // horizontal divider (z=0) -> vertical line on the portrait map
  const mx = w2mx(DIVZ);
  c.beginPath(); c.moveTo(mx, 0); c.lineTo(mx, Hh); c.stroke();
  c.globalAlpha = 1;
  // heart packs
  for (const p of state.pickups) {
    if (p.taken) continue;
    c.fillStyle = "#ff3b5c";
    c.beginPath(); c.arc(w2mx(p.z), w2my(p.x), 2.5, 0, 7); c.fill();
  }
  // checkpoints (fog of war: only shown within signal range, or when a card revealed them)
  const pulse = 2 + Math.sin(now * 0.008) * 1.5;
  const revealed = now < state.revealUntil;
  const REVEAL_RANGE = 22;
  for (const cp of state.checkpoints) {
    const d = Math.hypot(cp.x - camera.position.x, cp.z - camera.position.z);
    if (cp.solved) { c.fillStyle = "#1c8a3a"; }
    else if (revealed || d < REVEAL_RANGE) { c.fillStyle = "#ffcc33"; }
    else continue; // hidden until you get close or collect a card
    c.beginPath();
    c.arc(w2mx(cp.z), w2my(cp.x), cp.solved ? 2.5 : 4 + pulse, 0, 7);
    c.fill();
  }
  // cards on the map (gold squares)
  for (const cd of state.cards) {
    if (cd.taken) continue;
    c.fillStyle = "#ffd23f";
    c.fillRect(w2mx(cd.z) - 2, w2my(cd.x) - 2, 4, 4);
  }
  // player + facing
  const px = w2mx(camera.position.z), py = w2my(camera.position.x);
  c.fillStyle = "#ffffff";
  c.beginPath(); c.arc(px, py, 3, 0, 7); c.fill();
  const fx = Math.cos(state.yaw), fz = -Math.sin(state.yaw);
  // facing arrow (map: screenX~z, screenY~x)
  const dirZ = -Math.cos(state.yaw), dirX = -Math.sin(state.yaw);
  c.strokeStyle = "#ffffff";
  c.beginPath(); c.moveTo(px, py);
  c.lineTo(px + dirZ * 8, py + dirX * 8); c.stroke();
  // signal bar
  const t = nearestUnsolved();
  const dist = t ? Math.hypot(t.x - camera.position.x, t.z - camera.position.z) : 99;
  const strength = Math.max(0, Math.min(1, 1 - dist / 55));
  c.fillStyle = "#0a2a12";
  c.fillRect(6, Hh - 12, W - 12, 7);
  c.fillStyle = strength > 0.66 ? "#33ff66" : strength > 0.33 ? "#ffcc33" : "#ff4d4d";
  c.fillRect(6, Hh - 12, (W - 12) * strength, 7);
  c.fillStyle = levelColor;
  c.font = "8px monospace";
  c.fillText("SIGNAL", 6, Hh - 16);
  miniTex.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Enemy — the "rogue process" that hunts you after a jumpscare
// ---------------------------------------------------------------------------
const ENEMY_SPEED = 0.15;   // slower than you (0.22) so you can escape
const ENEMY_R = 1.0;
const chaseBanner = document.getElementById("chase-banner");
const damageEl = document.getElementById("damage");

function enemyBlocked(x, z) {
  for (const w of walls) {
    const cx = Math.max(w.minX, Math.min(x, w.maxX));
    const cz = Math.max(w.minZ, Math.min(z, w.maxZ));
    if ((x - cx) ** 2 + (z - cz) ** 2 < ENEMY_R * ENEMY_R) return true;
  }
  return false;
}

function makeEnemyMesh() {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a0606, emissive: 0x660000, emissiveIntensity: 1.1, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 3.2, 8), dark);
  body.position.y = 1.7;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), dark);
  head.position.y = 3.6;
  g.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  for (const sx of [-0.26, 0.26]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), eyeMat);
    eye.position.set(sx, 3.62, 0.58);
    g.add(eye);
  }
  const l = new THREE.PointLight(0xff0000, 2.4, 16);
  l.position.y = 3.2;
  g.add(l);
  body.castShadow = true; head.castShadow = true;
  return g;
}

function findSpawn(dist) {
  const px = camera.position.x, pz = camera.position.z;
  const behind = Math.atan2(Math.cos(state.yaw), Math.sin(state.yaw));
  const offsets = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, (3 * Math.PI) / 4, -(3 * Math.PI) / 4, Math.PI];
  for (const off of offsets) {
    const a = behind + off + (Math.random() - 0.5) * 0.4;
    const tx = px + Math.cos(a) * dist;
    const tz = pz + Math.sin(a) * dist;
    if (Math.abs(tx) < ARENA_X - 2 && Math.abs(tz) < ARENA_Z - 2 && !enemyBlocked(tx, tz)) {
      return { x: tx, z: tz };
    }
  }
  return { x: px, z: pz };
}

function spawnEnemy(isBoss = false) {
  const now = performance.now();
  const pos = findSpawn(isBoss ? 12 : 8 + Math.random() * 4);
  const mesh = makeEnemyMesh();
  if (isBoss) { mesh.scale.set(2, 2.2, 2); }
  mesh.position.set(pos.x, 0, pos.z);
  scene.add(mesh);
  state.enemies.push({
    mesh, x: pos.x, z: pos.z, lastHit: now, lastBeat: now,
    speed: isBoss ? 0.13 : ENEMY_SPEED, boss: isBoss,
  });
}

function spawnEnemies(count) {
  if (state.enemies.some((e) => e.boss)) return; // never stack on boss
  for (let i = 0; i < count; i++) spawnEnemy(false);
  chaseBanner.classList.remove("hidden");
  setTicker(count > 1
    ? `👾 ${count} rogue processes are hunting you! Reach a checkpoint & answer to purge them.`
    : "👾 A rogue process is hunting you! Reach a checkpoint & answer to purge it.");
  beep(90, 0.4, 0.3);
}

function despawnEnemy(msg) {
  for (const e of state.enemies) scene.remove(e.mesh);
  state.enemies = [];
  chaseBanner.classList.add("hidden");
  if (msg) setTicker(msg);
}

function flashDamage() {
  damageEl.classList.remove("damage-on");
  void damageEl.offsetWidth;
  damageEl.classList.add("damage-on");
  gameWrap.classList.remove("shake");
  void gameWrap.offsetWidth;
  gameWrap.classList.add("shake");
}

function updateEnemy(now) {
  for (const e of state.enemies) {
    const dx = camera.position.x - e.x;
    const dz = camera.position.z - e.z;
    const dist = Math.hypot(dx, dz) || 0.0001;
    const nx = e.x + (dx / dist) * e.speed;
    const nz = e.z + (dz / dist) * e.speed;
    if (!enemyBlocked(nx, e.z)) e.x = nx;
    if (!enemyBlocked(e.x, nz)) e.z = nz;
    e.mesh.position.set(e.x, Math.sin(now * 0.006 + e.x) * 0.15, e.z);
    e.mesh.rotation.y = Math.atan2(dx, dz);

    const beatInt = Math.max(220, Math.min(1100, dist * 30));
    if (now - e.lastBeat > beatInt) { e.lastBeat = now; beep(e.boss ? 50 : 70, 0.12, 0.18); }

    if (dist < (e.boss ? 3 : 1.7) && now - e.lastHit > 900) {
      e.lastHit = now;
      const dead = loseHeart();
      flashDamage();
      if (dead) { despawnEnemy(); setTimeout(gameOver, 350); return; }
    }
  }
}

// ---------------------------------------------------------------------------
// Update & render loop
// ---------------------------------------------------------------------------
const SPEED = 0.22;
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

function update() {
  const now = performance.now();

  if (!state.paused) {
    // Orientation from yaw/pitch
    camera.rotation.set(0, 0, 0);
    camera.rotateY(state.yaw);
    camera.rotateX(state.pitch);

    // Movement relative to facing (XZ plane)
    forward.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    let mf = 0, mr = 0;
    if (keys["w"] || keys["arrowup"]) mf += 1;
    if (keys["s"] || keys["arrowdown"]) mf -= 1;
    if (keys["d"] || keys["arrowright"]) mr += 1;
    if (keys["a"] || keys["arrowleft"]) mr -= 1;
    const moving = mf !== 0 || mr !== 0;
    // Sprint (Shift) drains stamina; walking regenerates it
    const wantSprint = (keys["shift"] || keys["shiftleft"] || keys["shiftright"]) && moving && state.stamina > 0.02;
    if (wantSprint) state.stamina = Math.max(0, state.stamina - 0.010);
    else state.stamina = Math.min(1, state.stamina + 0.006);
    const spd = SPEED * (wantSprint ? 1.7 : 1);
    elStaminaFill.style.width = state.stamina * 100 + "%";
    elStamina.classList.toggle("low", state.stamina < 0.25);
    if (moving) {
      const len = Math.hypot(mf, mr) || 1;
      const stepX = ((forward.x * mf + right.x * mr) / len) * spd;
      const stepZ = ((forward.z * mf + right.z * mr) / len) * spd;
      // Axis-separated movement so you slide along walls & through doorways
      if (!blocked(camera.position.x + stepX, camera.position.z)) camera.position.x += stepX;
      if (!blocked(camera.position.x, camera.position.z + stepZ)) camera.position.z += stepZ;
      state.walkBob += wantSprint ? 0.34 : 0.2;
      maybeJumpscare(now);
      // footsteps
      const stepInt = wantSprint ? 300 : 460;
      if (now - state.lastStep > stepInt) { state.lastStep = now; beep(90, 0.05, 0.05); }
    }
    // head + weapon bob
    const bob = Math.sin(state.walkBob) * (moving ? 0.04 : 0);
    camera.position.y = 1.7 + bob;
    device.position.y = -0.34 + Math.sin(state.walkBob * 0.5) * (moving ? 0.02 : 0.006);
    device.rotation.z = 0.05 + Math.sin(state.walkBob * 0.5) * (moving ? 0.03 : 0.01);

    // Checkpoint proximity
    for (const cp of state.checkpoints) {
      if (cp.solved) continue;
      const d = Math.hypot(cp.x - camera.position.x, cp.z - camera.position.z);
      if (cp.suppressed) { if (d > cp.r + 2.5) cp.suppressed = false; continue; }
      if (d < cp.r + 0.8) { openPuzzle(cp); break; }
    }
    // Heart pickups
    for (const p of state.pickups) {
      if (p.taken) continue;
      const d = Math.hypot(p.x - camera.position.x, p.z - camera.position.z);
      if (d < 1.6) {
        p.taken = true;
        scene.remove(p.mesh);
        beep(560, 0.09, 0.13);
        if (gainHeart()) setTicker("♥ Recovered a heart pack!");
        else setTicker("♥ Pack absorbed (hearts already full).");
      }
    }
    // Recap CARD pickups — collect to learn + reveal the map (like a key)
    for (const c of state.cards) {
      if (c.taken) continue;
      const d = Math.hypot(c.x - camera.position.x, c.z - camera.position.z);
      if (d < 1.7) {
        c.taken = true;
        scene.remove(c.mesh);
        state.cardsCollected++;
        state.score += 150;
        elScore.textContent = `SCORE ${state.score}`;
        state.revealUntil = now + 15000; // reveal all checkpoints for 15s
        if (!state.unlocked.includes(state.levelIndex)) state.unlocked.push(state.levelIndex);
        updateCards();
        beep(990, 0.1, 0.14); setTimeout(() => beep(1320, 0.12, 0.14), 110);
        showToast("🆔 Concept Card +150 — press H to open your cheat sheet. Map revealed 15s.");
        break;
      }
    }

    // Shift checkpoints (faster on higher levels)
    if (now > state.nextShiftAt) {
      relocateCheckpoints();
      state.nextShiftAt = now + difficulty().shiftMs;
    }

    // Boss core node — walk into it to start the hack
    if (state.bossActive && state.bossNode) {
      const bd = Math.hypot(state.bossNode.x - camera.position.x, state.bossNode.z - camera.position.z);
      state.bossNode.mesh.rotation.y += 0.02;
      if (bd < 3.6) openBossQuest();
    }

    // Enemy chase
    updateEnemy(now);

    // Device: proximity ping + live minimap
    pingSignal(now);
    drawMinimap(now);
  }

  // Flickering house lights (horror ambience)
  const diff = difficulty();
  for (let i = 0; i < flickerLights.length; i++) {
    const l = flickerLights[i];
    const base = l.userData.base ?? (l.userData.base = l.intensity || 0.8);
    const flick = Math.random() < 0.06 ? 0.15 : 1;
    l.intensity = base * (0.7 + Math.sin(now * 0.01 + i) * 0.15) * flick;
  }
  // Torch/flashlight flashing — gets worse each level
  flashlight.intensity = Math.random() < diff.torchFlicker ? 0.15 : 2.2;
  // Checkpoints glitch-jitter on higher levels
  if (diff.checkpointJitter > 0) {
    for (const cp of state.checkpoints) {
      if (cp.solved) continue;
      cp.mesh.position.x = cp.x + (Math.random() - 0.5) * diff.checkpointJitter * 6;
      cp.mesh.position.z = cp.z + (Math.random() - 0.5) * diff.checkpointJitter * 6;
    }
  }

  // Idle animations
  for (const cp of state.checkpoints) {
    cp.ring.rotation.z += cp.solved ? 0.005 : 0.03;
    cp.pillar.position.y = 1.7 + Math.sin(now * 0.002 + cp.x) * (cp.solved ? 0 : 0.15);
  }
  for (const p of state.pickups) {
    if (p.taken) continue;
    p.core.rotation.y += 0.04;
    p.core.rotation.x += 0.02;
    p.halo.rotation.z += 0.05;
    p.mesh.position.y = 1.1 + Math.sin(now * 0.003 + p.x) * 0.15;
  }
  for (const cd of state.cards) {
    if (cd.taken) continue;
    cd.card.rotation.y += 0.03;
    cd.mesh.position.y = 1.3 + Math.sin(now * 0.0025 + cd.x) * 0.18;
  }
}

function loop() {
  update();
  renderer.render(scene, camera);
  // Freeze the wandering terminal whenever a popup/menu is up
  gameWrap.classList.toggle("frozen", state.paused);
  requestAnimationFrame(loop);
}

startGame();
loop();
