// characters.js
//
// Hand-drawn (SVG) cast for SQL Detective — no emoji. Each suspect is a
// randomized "mugshot" portrait: skin tone, hairstyle & colour, optional
// facial hair, glasses / sunglasses, earrings, hats, and outfit all vary,
// seeded by the suspect id so a given slot always looks the same. Purely
// cosmetic; the game logic never depends on any of this.

const SKIN = ["#f7d0a8", "#f2c69b", "#e8b784", "#d99a6c", "#b97a4e", "#8a5a3a"];
const HAIR = ["#241a12", "#5a3b1a", "#8a5a2b", "#caa42b", "#d7d7d7", "#e0603a", "#3a2c4a", "#101014", "#7a4bd0", "#2b8f6a"];
const CLOTH = ["#ff6b6b", "#4dabf7", "#ffd43b", "#69db7c", "#b197fc", "#f783ac", "#3bc9db", "#ffa94d", "#e599f7", "#63e6be", "#ced4da"];

const HAIRSTYLES = ["short", "side", "bob", "long", "ponytail", "bun", "afro", "buzz", "spiky"];
const ACC = ["none", "none", "none", "glasses", "sunglasses", "earrings", "none", "glasses"];
const HATS = ["none", "none", "none", "none", "beanie", "cap"];
const FACIAL = ["none", "none", "none", "none", "none", "mustache", "beard", "stubble"];
const COLLAR = ["tee", "shirt", "suit", "hoodie"];

// deterministic pseudo-random in [0,1) from (seed, salt)
function rnd(seed, salt) {
  const x = Math.sin((seed + 1) * 12.9898 + (salt + 1) * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
const pick = (arr, seed, salt) => arr[Math.floor(rnd(seed, salt) * arr.length)];

export function suspectSVG(seed) {
  const skin = pick(SKIN, seed, 1);
  const hair = pick(HAIR, seed, 2);
  const cloth = pick(CLOTH, seed, 3);
  let style = pick(HAIRSTYLES, seed, 4);
  const acc = pick(ACC, seed, 5);
  const hat = pick(HATS, seed, 6);
  const facial = pick(FACIAL, seed, 7);
  const collar = pick(COLLAR, seed, 8);
  const brow = Math.floor(rnd(seed, 9) * 3);
  const mouth = Math.floor(rnd(seed, 10) * 3);
  const dark = "#241f2b";

  // ---- outfit ----
  let clothing = `<path d="M8 72 Q8 50 32 50 Q56 50 56 72 Z" fill="${cloth}"/>`;
  if (collar === "shirt")
    clothing += `<path d="M25 51 L32 60 L39 51 L37 50 L32 55 L27 50 Z" fill="#ffffff"/>`;
  else if (collar === "suit")
    clothing += `<path d="M24 51 L32 72 L26 72 L22 54 Z" fill="#2a2440"/><path d="M40 51 L32 72 L38 72 L42 54 Z" fill="#2a2440"/><path d="M30 52 h4 l1.4 8 -3.4 3 -3.4 -3 Z" fill="#ffffff"/><path d="M31.2 60 h1.6 l.7 8 h-3 Z" fill="#e0603a"/>`;
  else if (collar === "hoodie")
    clothing += `<path d="M12 66 Q10 46 32 46 Q54 46 52 66" fill="none" stroke="${hair === cloth ? "#00000030" : "rgba(0,0,0,.18)"}" stroke-width="6"/><line x1="29" y1="52" x2="29" y2="62" stroke="#ffffff" stroke-width="2"/><line x1="35" y1="52" x2="35" y2="62" stroke="#ffffff" stroke-width="2"/>`;

  // ---- back hair (behind head) ----
  let back = "";
  if (style === "long")
    back = `<path d="M13 32 Q11 68 22 68 L42 68 Q53 68 51 32 Q51 12 32 12 Q13 12 13 32 Z" fill="${hair}"/>`;
  else if (style === "bob")
    back = `<path d="M14 32 Q14 52 24 54 L40 54 Q50 52 50 32 Q50 12 32 12 Q14 12 14 32 Z" fill="${hair}"/>`;
  else if (style === "ponytail")
    back = `<path d="M47 24 Q60 30 55 48 Q52 58 45 52 Q50 40 45 30 Z" fill="${hair}"/>`;
  else if (style === "afro")
    back = `<circle cx="32" cy="24" r="20" fill="${hair}"/>`;

  // ---- head / ears ----
  const head = `
    <ellipse cx="18" cy="37" rx="3.2" ry="4" fill="${skin}"/>
    <ellipse cx="46" cy="37" rx="3.2" ry="4" fill="${skin}"/>
    ${acc === "earrings" ? `<circle cx="18" cy="42" r="1.6" fill="#ffd43b"/><circle cx="46" cy="42" r="1.6" fill="#ffd43b"/>` : ""}
    <rect x="28" y="44" width="8" height="9" rx="3" fill="${skin}"/>
    <ellipse cx="32" cy="34" rx="15" ry="16" fill="${skin}"/>`;

  // ---- brows ----
  const browY = 28;
  const brows =
    brow === 0
      ? `<line x1="23" y1="${browY}" x2="29" y2="${browY}" stroke="${dark}" stroke-width="1.8" stroke-linecap="round"/><line x1="35" y1="${browY}" x2="41" y2="${browY}" stroke="${dark}" stroke-width="1.8" stroke-linecap="round"/>`
      : brow === 1
      ? `<path d="M23 ${browY} Q26 ${browY - 2} 29 ${browY}" stroke="${dark}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M35 ${browY} Q38 ${browY - 2} 41 ${browY}" stroke="${dark}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      : `<line x1="23" y1="${browY - 1}" x2="29" y2="${browY + 1}" stroke="${dark}" stroke-width="1.8" stroke-linecap="round"/><line x1="35" y1="${browY + 1}" x2="41" y2="${browY - 1}" stroke="${dark}" stroke-width="1.8" stroke-linecap="round"/>`;

  // ---- eyes ----
  const eyes = `
    <circle cx="26" cy="33" r="2.2" fill="#fff"/><circle cx="38" cy="33" r="2.2" fill="#fff"/>
    <circle cx="26" cy="33" r="1.3" fill="${dark}"/><circle cx="38" cy="33" r="1.3" fill="${dark}"/>`;

  // ---- nose + mouth ----
  const nose = `<path d="M32 34 L30.5 39 Q32 40 33.5 39 Z" fill="rgba(0,0,0,.12)"/>`;
  const mouthEl =
    mouth === 0
      ? `<path d="M28 42 Q32 46 36 42" stroke="#a3453b" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      : mouth === 1
      ? `<line x1="29" y1="43" x2="35" y2="43" stroke="#a3453b" stroke-width="1.8" stroke-linecap="round"/>`
      : `<path d="M29 43 Q33 45 36 42" stroke="#a3453b" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;

  // ---- facial hair ----
  let beard = "";
  if (facial === "mustache") beard = `<path d="M27 41 Q32 44 37 41 Q32 43.5 27 41 Z" fill="${hair}"/>`;
  else if (facial === "beard")
    beard = `<path d="M20 36 Q20 52 32 54 Q44 52 44 36 Q41 45 32 45 Q23 45 20 36 Z" fill="${hair}"/>`;
  else if (facial === "stubble")
    beard = `<path d="M21 38 Q22 50 32 52 Q42 50 43 38 Q40 46 32 46 Q24 46 21 38 Z" fill="${hair}" opacity="0.28"/>`;

  // ---- glasses ----
  let glasses = "";
  if (acc === "glasses")
    glasses = `<g fill="none" stroke="${dark}" stroke-width="1.6"><rect x="21" y="30" width="9" height="7" rx="3"/><rect x="34" y="30" width="9" height="7" rx="3"/><line x1="30" y1="33" x2="34" y2="33"/></g>`;
  else if (acc === "sunglasses")
    glasses = `<g><rect x="21" y="30" width="9" height="7" rx="3" fill="#181822"/><rect x="34" y="30" width="9" height="7" rx="3" fill="#181822"/><line x1="30" y1="33" x2="34" y2="33" stroke="#181822" stroke-width="1.8"/></g>`;

  // ---- front hair ----
  let front = "";
  if (style === "short" || style === "long" || style === "bob" || style === "ponytail" || style === "bun")
    front = `<path d="M17 32 Q15 14 32 13 Q49 14 47 32 Q45 22 39 21 Q35 25 32 24 Q29 25 25 21 Q19 22 17 32 Z" fill="${hair}"/>`;
  else if (style === "side")
    front = `<path d="M16 32 Q15 13 33 13 Q50 14 47 30 Q43 19 28 22 Q22 23 19 33 Z" fill="${hair}"/>`;
  else if (style === "buzz")
    front = `<path d="M18 29 Q18 15 32 15 Q46 15 46 29 Q40 21 32 21 Q24 21 18 29 Z" fill="${hair}" opacity="0.9"/>`;
  else if (style === "spiky")
    front = `<path d="M17 30 L20 18 L24 27 L28 15 L32 26 L36 15 L40 27 L44 18 L47 30 Q40 22 32 22 Q24 22 17 30 Z" fill="${hair}"/>`;
  else if (style === "afro")
    front = ``; // afro is the big back circle
  if (style === "bun") front += `<circle cx="32" cy="9" r="5.5" fill="${hair}"/>`;

  // ---- hats (cover the hairline) ----
  let hatEl = "";
  if (hat === "beanie")
    hatEl = `<path d="M15 27 Q15 8 32 8 Q49 8 49 27 Z" fill="#e0603a"/><rect x="14" y="25" width="36" height="5" rx="2.5" fill="#c34e2c"/>`;
  else if (hat === "cap")
    hatEl = `<path d="M16 26 Q16 9 32 9 Q48 9 48 26 Z" fill="#2b6cb0"/><path d="M14 26 Q26 22 40 26 L48 27 Q30 30 14 27 Z" fill="#1e4e82"/>`;

  return `
  <svg class="char" viewBox="0 0 64 74" xmlns="http://www.w3.org/2000/svg">
    ${clothing}
    ${back}
    ${head}
    ${brows}
    ${eyes}
    ${nose}
    ${mouthEl}
    ${beard}
    ${glasses}
    ${front}
    ${hatEl}
  </svg>`;
}

export function jailBars() {
  return `
  <svg class="bars" viewBox="0 0 64 74" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#cfd6e4" stroke-width="3" stroke-linecap="round">
      <line x1="16" y1="4" x2="16" y2="70"/>
      <line x1="32" y1="4" x2="32" y2="70"/>
      <line x1="48" y1="4" x2="48" y2="70"/>
    </g>
  </svg>`;
}

export function detectiveSVG() {
  return `
  <svg viewBox="0 0 170 190" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="82" cy="180" rx="52" ry="7" fill="rgba(0,0,0,.35)"/>
    <path d="M40 182 Q36 96 82 96 Q128 96 124 182 Z" fill="#d9a441"/>
    <path d="M40 182 Q36 96 82 96 L82 182 Z" fill="#c8933a"/>
    <rect x="46" y="140" width="72" height="9" rx="4" fill="#8a5f22"/>
    <rect x="78" y="140" width="9" height="9" rx="2" fill="#5c3f16"/>
    <path d="M64 100 L82 116 L100 100 Z" fill="#b9812f"/>
    <path d="M70 104 Q82 118 94 104 L94 112 Q82 122 70 112 Z" fill="#e8574a"/>
    <circle cx="82" cy="72" r="26" fill="#f2c69b"/>
    <circle cx="74" cy="72" r="3.4" fill="#241f2b"/>
    <circle cx="92" cy="72" r="3.4" fill="#241f2b"/>
    <path d="M68 63 Q74 59 80 63" stroke="#241f2b" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M84 63 Q90 59 96 63" stroke="#241f2b" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M76 84 Q82 88 88 84" stroke="#8a5f22" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M60 52 Q60 34 82 34 Q104 34 104 52 Z" fill="#3a2c2c"/>
    <ellipse cx="82" cy="53" rx="38" ry="8" fill="#3a2c2c"/>
    <rect x="60" y="46" width="44" height="6" rx="3" fill="#e8574a"/>
    <circle cx="128" cy="120" r="20" fill="rgba(180,225,255,.35)" stroke="#cfd6e4" stroke-width="5"/>
    <line x1="142" y1="134" x2="160" y2="156" stroke="#8a5f22" stroke-width="8" stroke-linecap="round"/>
    <circle cx="122" cy="114" r="6" fill="rgba(255,255,255,.55)"/>
  </svg>`;
}
