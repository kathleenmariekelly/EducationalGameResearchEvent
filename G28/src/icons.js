// icons.js — small inline SVG icons (no emoji). Use currentColor so CSS
// controls the tint; medals/trophy carry their own fills.

export const ICONS = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10" cy="10" r="6"/><line x1="14.5" y1="14.5" x2="21" y2="21"/></svg>`,
  clue: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 12a7 7 0 0 1 14 0"/><path d="M7.5 12a4.5 4.5 0 0 1 9 0v3"/><path d="M10 12a2 2 0 0 1 4 0v5"/><line x1="12" y1="12" x2="12" y2="20"/></svg>`,
  db: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><ellipse cx="12" cy="5.5" rx="7" ry="2.8"/><path d="M5 5.5v13c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-13"/><path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/></svg>`,
  query: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><polyline points="7,10 10,12 7,14"/><line x1="12.5" y1="15" x2="16.5" y2="15"/></svg>`,
  lineup: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3l4 2-1.4 3L5.6 6z"/><path d="M9.6 8L4 21"/><path d="M11 5l9 3.5-1.5 4.5L11 10z" fill="currentColor" fill-opacity=".2"/></svg>`,
  arrest: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2.5l8 2.8v5.2c0 5-3.6 8.6-8 10-4.4-1.4-8-5-8-10V5.3z"/><path d="M12 7.2l1.5 3 3.3.4-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3L5.2 10.6l3.3-.4z" fill="currentColor" stroke="none"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l11 7-11 7z"/></svg>`,
  medal1: medal("#e8a45a", "#c07a2f"),
  medal2: medal("#cfd6e4", "#9aa3b8"),
  medal3: medal("#f4c542", "#c79a1f"),
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="#c79a1f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v4a5 5 0 0 1-10 0z" fill="#f4c542" stroke="none"/><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/><line x1="12" y1="13" x2="12" y2="17"/><path d="M8.5 20h7l-1-3h-5z" fill="#f4c542" stroke="none"/><path d="M8.5 20h7l-1-3h-5z"/></svg>`,
};

function medal(face, ring) {
  return `<svg viewBox="0 0 24 24"><path d="M9 2l3 6 3-6" fill="none" stroke="#4dabf7" stroke-width="2"/><circle cx="12" cy="15" r="6.5" fill="${face}" stroke="${ring}" stroke-width="1.6"/><path d="M12 11.5l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z" fill="${ring}"/></svg>`;
}

export function injectIcons(root = document) {
  root.querySelectorAll(".ico[data-ico]").forEach((e) => {
    const svg = ICONS[e.dataset.ico];
    if (svg) e.innerHTML = svg;
  });
}
