// scenarios.js
//
// Three tiers, each teaching a DIFFERENT SQL construct. The clues in each
// tier are authored so you cannot solve the case without the construct that
// tier teaches — the skill is required, not optional.
//
//   Rookie (easy)          — WHERE, =, AND, and basic comparisons (>, <, >=)
//   Detective (medium)     — richer single-table predicates: BETWEEN, IN,
//                            LIKE, NOT IN
//   Chief Inspector (hard) — JOIN across two tables + INNER vs LEFT
//
// All data is a HIDDEN black-box database, generated procedurally at load
// time (no API calls). Exactly one suspect satisfies every clue: the culprit.
//
// Condition shape used throughout:
//   { column, op, value }                    comparisons + LIKE (value=pattern)
//   { column, op:"BETWEEN", low, high }
//   { column, op:"IN", values:[...], negate? }
//   { column, op:"LIKE", value, negate? }
//   (table:"A"|"B" is added on JOIN cases so the engine knows the source)
//
// Domains drive generation:
//   { type:"int", min, max }  { type:"enum", values:[...] }
//   { type:"string", values:[...] }   (used for LIKE / IN on text)

// ---------------------------------------------------------------- ROOKIE ----
export const easyCases = [
  {
    id: "museum",
    title: "The Midnight Museum Heist",
    scenario:
      "A jeweled crown vanished from the City Museum overnight. The suspect database is sealed — query it to narrow the after-hours crowd to your thief.",
    table: "suspects",
    columns: [
      { key: "name", label: "name", type: "name" },
      { key: "height_cm", label: "height_cm", domain: { type: "int", min: 158, max: 192 } },
      { key: "hand", label: "hand", domain: { type: "enum", values: ["left", "right"] } },
      { key: "badge_seen", label: "badge_seen", domain: { type: "enum", values: ["yes", "no"] } },
      { key: "left_after", label: "left_after_hour", domain: { type: "int", min: 0, max: 23 } },
    ],
    clues: [
      { text: "A left-handed smudge was found on the display case.", cond: { column: "hand", op: "=", value: "left" } },
      { text: "The thief's badge was caught on camera — they were a badge holder.", cond: { column: "badge_seen", op: "=", value: "yes" } },
      { text: "They slipped out in the early hours — a departure hour before noon.", cond: { column: "left_after", op: "<", value: 12 } },
      { text: "Footprint depth suggests someone taller than 175cm.", cond: { column: "height_cm", op: ">", value: 175 } },
    ],
    culprit: { hand: "left", badge_seen: "yes", left_after: 4, height_cm: 183 },
  },
  {
    id: "leak",
    title: "The Corporate Leak",
    scenario:
      "Confidential product plans leaked from Nyx Software. The employee database is locked down — interrogate it with queries to find your leaker.",
    table: "employees",
    columns: [
      { key: "name", label: "name", type: "name" },
      { key: "dept", label: "dept", domain: { type: "enum", values: ["sales", "engineering", "legal", "marketing", "hr"] } },
      { key: "clearance", label: "clearance_level", domain: { type: "int", min: 1, max: 5 } },
      { key: "usb_used", label: "usb_used", domain: { type: "enum", values: ["yes", "no"] } },
      { key: "login_hour", label: "login_hour", domain: { type: "int", min: 17, max: 23 } },
    ],
    clues: [
      { text: "The leaked files needed high access — clearance level of 4 or above.", cond: { column: "clearance", op: ">=", value: 4 } },
      { text: "The files were copied onto a USB stick.", cond: { column: "usb_used", op: "=", value: "yes" } },
      { text: "The leaker was on the engineering team.", cond: { column: "dept", op: "=", value: "engineering" } },
      { text: "The transfer happened late — logged in at hour 23.", cond: { column: "login_hour", op: "=", value: 23 } },
    ],
    culprit: { clearance: 4, usb_used: "yes", dept: "engineering", login_hour: 23 },
  },
  {
    id: "bank",
    title: "The Vault Job",
    scenario:
      "Someone cracked the vault at Meridian Bank during the lunch rush. The staff database is off-limits — query your way to the one who did it.",
    table: "staff",
    columns: [
      { key: "name", label: "name", type: "name" },
      { key: "shift", label: "shift", domain: { type: "enum", values: ["morning", "lunch", "evening", "night"] } },
      { key: "vault_access", label: "vault_access", domain: { type: "enum", values: ["yes", "no"] } },
      { key: "gloves", label: "wore_gloves", domain: { type: "enum", values: ["yes", "no"] } },
      { key: "years", label: "years_employed", domain: { type: "int", min: 1, max: 20 } },
    ],
    clues: [
      { text: "The job happened during the lunch shift.", cond: { column: "shift", op: "=", value: "lunch" } },
      { text: "The thief had vault access.", cond: { column: "vault_access", op: "=", value: "yes" } },
      { text: "No fingerprints — they wore gloves.", cond: { column: "gloves", op: "=", value: "yes" } },
      { text: "Only a veteran knew the old override code — more than 10 years employed.", cond: { column: "years", op: ">", value: 10 } },
    ],
    culprit: { shift: "lunch", vault_access: "yes", gloves: "yes", years: 13 },
  },
  {
    id: "poison",
    title: "The Dinner Party",
    scenario:
      "A guest was poisoned at a dinner party. The guest list is sealed — query the records to find who slipped away.",
    table: "guests",
    columns: [
      { key: "name", label: "name", type: "name" },
      { key: "seat", label: "seat_side", domain: { type: "enum", values: ["left", "right"] } },
      { key: "kitchen", label: "visited_kitchen", domain: { type: "enum", values: ["yes", "no"] } },
      { key: "drink", label: "drink", domain: { type: "enum", values: ["wine", "water", "juice", "soda"] } },
      { key: "left_early", label: "left_early", domain: { type: "enum", values: ["yes", "no"] } },
    ],
    clues: [
      { text: "The poisoner slipped into the kitchen where the drinks were poured.", cond: { column: "kitchen", op: "=", value: "yes" } },
      { text: "The poison was found in a wine glass.", cond: { column: "drink", op: "=", value: "wine" } },
      { text: "They sat on the left side, next to the victim.", cond: { column: "seat", op: "=", value: "left" } },
      { text: "They slipped out before dessert — left early.", cond: { column: "left_early", op: "=", value: "yes" } },
    ],
    culprit: { kitchen: "yes", drink: "wine", seat: "left", left_early: "yes" },
  },
  {
    id: "missing",
    title: "The Missing Botanist",
    scenario:
      "Dr. Fenn vanished from the research station. The personnel records are sealed — query them to expose who was really in the greenhouse.",
    table: "personnel",
    columns: [
      { key: "name", label: "name", type: "name" },
      { key: "role", label: "role", domain: { type: "enum", values: ["guard", "researcher", "intern", "technician"] } },
      { key: "has_keycard", label: "has_keycard", domain: { type: "enum", values: ["yes", "no"] } },
      { key: "greenhouse", label: "in_greenhouse", domain: { type: "enum", values: ["yes", "no"] } },
      { key: "last_seen", label: "last_seen_hour", domain: { type: "int", min: 16, max: 23 } },
    ],
    clues: [
      { text: "Whoever it was had a keycard to reach the lab wing.", cond: { column: "has_keycard", op: "=", value: "yes" } },
      { text: "They were seen in the greenhouse, where Dr. Fenn was last working.", cond: { column: "greenhouse", op: "=", value: "yes" } },
      { text: "They were still around late — last seen at hour 22.", cond: { column: "last_seen", op: "=", value: 22 } },
      { text: "Dr. Fenn only trusted fellow researchers with the greenhouse keys.", cond: { column: "role", op: "=", value: "researcher" } },
    ],
    culprit: { has_keycard: "yes", greenhouse: "yes", last_seen: 22, role: "researcher" },
  },
  {
    id: "graffiti",
    title: "The Rooftop Tag",
    scenario:
      "A giant mural appeared overnight on the old mill's roof. The art-school roster is locked — query it to unmask the tagger.",
    table: "students",
    columns: [
      { key: "name", label: "name", type: "name" },
      { key: "medium", label: "medium", domain: { type: "enum", values: ["spray", "oil", "acrylic", "charcoal"] } },
      { key: "roof_key", label: "has_roof_key", domain: { type: "enum", values: ["yes", "no"] } },
      { key: "paint_blue", label: "bought_blue_paint", domain: { type: "enum", values: ["yes", "no"] } },
      { key: "alibi_hour", label: "signed_out_hour", domain: { type: "int", min: 0, max: 23 } },
    ],
    clues: [
      { text: "The mural was spray paint, not brushwork.", cond: { column: "medium", op: "=", value: "spray" } },
      { text: "They had a key to the roof access door.", cond: { column: "roof_key", op: "=", value: "yes" } },
      { text: "The mural's signature blue matches a recent paint purchase.", cond: { column: "paint_blue", op: "=", value: "yes" } },
      { text: "They signed out of the studio in the small hours — hour < 6.", cond: { column: "alibi_hour", op: "<", value: 6 } },
    ],
    culprit: { medium: "spray", roof_key: "yes", paint_blue: "yes", alibi_hour: 2 },
  },
];

// ------------------------------------------------------------- DETECTIVE ----
// Each clue below is written so a plain "=" cannot express it — you must
// reach for BETWEEN, IN, LIKE, or NOT IN.
export const mediumCases = [
  {
    id: "masquerade",
    title: "The Masquerade Theft",
    scenario:
      "A diamond vanished during a masked ball. The guest database is sealed. These clues won't fit a simple equals — you'll need ranges, sets, and patterns.",
    table: "guests",
    columns: [
      { key: "name", label: "name", type: "name" },
      { key: "arrival_hour", label: "arrival_hour", domain: { type: "int", min: 0, max: 23 } },
      { key: "mask_color", label: "mask_color", domain: { type: "enum", values: ["red", "gold", "black", "silver", "white", "green"] } },
      { key: "code_name", label: "code_name", domain: { type: "string", values: ["Vesper", "Viper", "Vortex", "Zephyr", "Onyx", "Cobra", "Falcon", "Raven", "Storm", "Ghost", "Echo", "Nova", "Jinx", "Lynx", "Drake", "Wren", "Sable", "Frost", "Kite", "Mirage"] } },
      { key: "seat_section", label: "seat_section", domain: { type: "enum", values: ["A", "B", "C", "D"] } },
    ],
    clues: [
      { text: "They arrived in the small hours — between 0 and 3 (inclusive).", cond: { column: "arrival_hour", op: "BETWEEN", low: 0, high: 3 } },
      { text: "A witness recalls a red, gold, or black mask.", cond: { column: "mask_color", op: "IN", values: ["red", "gold", "black"] } },
      { text: "Their whispered code name began with 'V'.", cond: { column: "code_name", op: "LIKE", value: "V%" } },
      { text: "They were NOT seated in sections A or B.", cond: { column: "seat_section", op: "IN", values: ["A", "B"], negate: true } },
    ],
    culprit: { arrival_hour: 2, mask_color: "gold", code_name: "Vesper", seat_section: "C" },
  },
  {
    id: "ransomware",
    title: "The Ransomware Note",
    scenario:
      "Ransomware locked the whole newsroom. The employee database is sealed. Simple equals won't cut it — think ranges, sets, and text patterns.",
    table: "employees",
    columns: [
      { key: "name", label: "name", type: "name" },
      { key: "login_hour", label: "login_hour", domain: { type: "int", min: 0, max: 23 } },
      { key: "os", label: "os", domain: { type: "enum", values: ["windows", "mac", "linux"] } },
      { key: "username", label: "username", domain: { type: "string", values: ["sysadmin_kx", "admin_root", "j.reyes", "m.okafor", "backup_admin", "guest01", "p.nadeau", "webadmin", "t.singh", "l.moreau", "kioskuser", "d.abara", "netops", "s.klein", "adminbot", "r.vance"] } },
      { key: "floor", label: "floor", domain: { type: "int", min: 1, max: 6 } },
    ],
    clues: [
      { text: "The attack ran overnight — login hour between 0 and 5.", cond: { column: "login_hour", op: "BETWEEN", low: 0, high: 5 } },
      { text: "The machine ran mac or linux, not windows.", cond: { column: "os", op: "IN", values: ["mac", "linux"] } },
      { text: "The account name contained 'admin' somewhere.", cond: { column: "username", op: "LIKE", value: "%admin%" } },
      { text: "It came from the upper floors — NOT floor 1 or 2.", cond: { column: "floor", op: "IN", values: [1, 2], negate: true } },
    ],
    culprit: { login_hour: 3, os: "linux", username: "sysadmin_kx", floor: 5 },
  },
  {
    id: "smuggler",
    title: "The Smuggler's Manifest",
    scenario:
      "Contraband slipped through the docks. The crew database is sealed. The manifest clues need ranges, sets, and patterns to pin down.",
    table: "crew",
    columns: [
      { key: "name", label: "name", type: "name" },
      { key: "shift_hour", label: "shift_hour", domain: { type: "int", min: 0, max: 23 } },
      { key: "cargo", label: "cargo", domain: { type: "enum", values: ["crates", "barrels", "textiles", "grain", "timber"] } },
      { key: "codename", label: "codename", domain: { type: "string", values: ["Kraken", "Kestrel", "Marlin", "Barracuda", "Tempest", "Anchor", "Reef", "Squall", "Harpoon", "Corsair", "Mako", "Gale", "Keelhaul", "Brine", "Fathom", "Nautilus"] } },
      { key: "rank", label: "rank", domain: { type: "enum", values: ["captain", "mate", "deckhand", "bosun"] } },
    ],
    clues: [
      { text: "On the late shift — hour between 20 and 23.", cond: { column: "shift_hour", op: "BETWEEN", low: 20, high: 23 } },
      { text: "They handled crates, barrels, or timber.", cond: { column: "cargo", op: "IN", values: ["crates", "barrels", "timber"] } },
      { text: "Their codename started with 'K'.", cond: { column: "codename", op: "LIKE", value: "K%" } },
      { text: "They were NOT a captain or a mate.", cond: { column: "rank", op: "IN", values: ["captain", "mate"], negate: true } },
    ],
    culprit: { shift_hour: 22, cargo: "crates", codename: "Kraken", rank: "deckhand" },
  },
  {
    id: "auction",
    title: "The Auction Fraud",
    scenario:
      "A forged painting sold for millions at the Halcyon auction. The bidder database is sealed. Ranges, sets, and patterns are the only way in.",
    table: "bidders",
    columns: [
      { key: "name", label: "name", type: "name" },
      { key: "bid_time", label: "bid_hour", domain: { type: "int", min: 0, max: 23 } },
      { key: "paddle_color", label: "paddle_color", domain: { type: "enum", values: ["red", "blue", "green", "gold", "white"] } },
      { key: "alias", label: "alias", domain: { type: "string", values: ["Draven", "Dahlia", "Doyle", "Mercer", "Sable", "Corbin", "Vex", "Lark", "Dune", "Bram", "Orin", "Cyra", "Dov", "Wynn", "Dex", "Fable"] } },
      { key: "tier", label: "member_tier", domain: { type: "enum", values: ["bronze", "silver", "gold", "platinum"] } },
    ],
    clues: [
      { text: "The winning bid came in late — hour between 20 and 23.", cond: { column: "bid_time", op: "BETWEEN", low: 20, high: 23 } },
      { text: "They held a red, gold, or blue paddle.", cond: { column: "paddle_color", op: "IN", values: ["red", "gold", "blue"] } },
      { text: "Their bidding alias started with 'D'.", cond: { column: "alias", op: "LIKE", value: "D%" } },
      { text: "They were NOT a bronze or silver member.", cond: { column: "tier", op: "IN", values: ["bronze", "silver"], negate: true } },
    ],
    culprit: { bid_time: 21, paddle_color: "gold", alias: "Draven", tier: "platinum" },
  },
];

// -------------------------------------------------------- CHIEF INSPECTOR ----
// Two tables. Some clues live in the SECOND table, so you must JOIN to answer
// them. INNER vs LEFT matters: INNER drops suspects with no matching record.
export const hardCases = [
  {
    id: "warehouse",
    title: "The Warehouse Job",
    scenario:
      "Crates walked out of Pier 9. The suspects table alone won't crack it — witness sightings live in a second table. JOIN them, and remember: INNER keeps only suspects who were actually seen.",
    isJoin: true,
    tableA: "suspects",
    tableB: "sightings",
    joinOn: "suspects.id = sightings.suspect_id",
    sightingRate: 0.6,
    columns: [
      { key: "name", label: "name", type: "name", src: "A" },
      { key: "vehicle", label: "vehicle", src: "A", domain: { type: "enum", values: ["van", "sedan", "motorcycle", "truck"] } },
      { key: "prior_record", label: "prior_record", src: "A", domain: { type: "enum", values: ["yes", "no"] } },
      { key: "location", label: "location", src: "B", domain: { type: "enum", values: ["docks", "uptown", "mill", "station"] } },
      { key: "witness", label: "witness", src: "B", domain: { type: "enum", values: ["Blake", "Cruz", "Dole", "Estes"] } },
      { key: "sighting_hour", label: "sighting_hour", src: "B", domain: { type: "int", min: 18, max: 23 } },
    ],
    clues: [
      { text: "The getaway used a van.  (suspects table)", cond: { column: "vehicle", op: "=", value: "van", table: "A" } },
      { text: "A witness placed them at the docks.  (sightings table)", cond: { column: "location", op: "=", value: "docks", table: "B" } },
      { text: "That witness was Cruz.  (sightings table)", cond: { column: "witness", op: "=", value: "Cruz", table: "B" } },
      { text: "The sighting was at hour 23.  (sightings table)", cond: { column: "sighting_hour", op: "=", value: 23, table: "B" } },
    ],
    culpritA: { vehicle: "van" },
    culpritB: { location: "docks", witness: "Cruz", sighting_hour: 23 },
  },
  {
    id: "gala",
    title: "The Gala Pickpocket",
    scenario:
      "A necklace disappeared at the charity gala. Guest details are in one table; the camera logs that place people in each zone are in another. JOIN to see who was where.",
    isJoin: true,
    tableA: "guests",
    tableB: "camera_logs",
    joinOn: "guests.id = camera_logs.guest_id",
    sightingRate: 0.6,
    columns: [
      { key: "name", label: "name", type: "name", src: "A" },
      { key: "accessory", label: "accessory", src: "A", domain: { type: "enum", values: ["clutch", "cane", "gloves", "scarf"] } },
      { key: "table_no", label: "table_no", src: "A", domain: { type: "int", min: 1, max: 12 } },
      { key: "zone", label: "zone", src: "B", domain: { type: "enum", values: ["lobby", "ballroom", "terrace", "cloakroom"] } },
      { key: "operator", label: "operator", src: "B", domain: { type: "enum", values: ["Reyes", "Kim", "Park", "Ono"] } },
      { key: "clip_hour", label: "clip_hour", src: "B", domain: { type: "int", min: 19, max: 23 } },
    ],
    clues: [
      { text: "The thief wore gloves.  (guests table)", cond: { column: "accessory", op: "=", value: "gloves", table: "A" } },
      { text: "A camera caught them in the cloakroom.  (camera_logs table)", cond: { column: "zone", op: "=", value: "cloakroom", table: "B" } },
      { text: "Operator Reyes logged the clip.  (camera_logs table)", cond: { column: "operator", op: "=", value: "Reyes", table: "B" } },
      { text: "The clip was timestamped hour 22.  (camera_logs table)", cond: { column: "clip_hour", op: "=", value: 22, table: "B" } },
    ],
    culpritA: { accessory: "gloves" },
    culpritB: { zone: "cloakroom", operator: "Reyes", clip_hour: 22 },
  },
  {
    id: "serverroom",
    title: "The Server Room Breach",
    scenario:
      "Someone walked source code out of the data center. Staff details are in one table; badge swipes that log every door are in another. JOIN them to place your suspect at the door.",
    isJoin: true,
    tableA: "staff",
    tableB: "badge_swipes",
    joinOn: "staff.id = badge_swipes.staff_id",
    sightingRate: 0.6,
    columns: [
      { key: "name", label: "name", type: "name", src: "A" },
      { key: "dept", label: "dept", src: "A", domain: { type: "enum", values: ["it", "facilities", "security", "exec"] } },
      { key: "contractor", label: "contractor", src: "A", domain: { type: "enum", values: ["yes", "no"] } },
      { key: "door", label: "door", src: "B", domain: { type: "enum", values: ["server_room", "lobby", "roof", "archive"] } },
      { key: "reader", label: "badge_reader", src: "B", domain: { type: "enum", values: ["R1", "R2", "R3", "R4"] } },
      { key: "swipe_hour", label: "swipe_hour", src: "B", domain: { type: "int", min: 0, max: 23 } },
    ],
    clues: [
      { text: "They were a contractor, not a full employee.  (staff table)", cond: { column: "contractor", op: "=", value: "yes", table: "A" } },
      { text: "They worked in IT.  (staff table)", cond: { column: "dept", op: "=", value: "it", table: "A" } },
      { text: "A badge swipe opened the server_room.  (badge_swipes table)", cond: { column: "door", op: "=", value: "server_room", table: "B" } },
      { text: "The swipe was logged at hour 2.  (badge_swipes table)", cond: { column: "swipe_hour", op: "=", value: 2, table: "B" } },
    ],
    culpritA: { contractor: "yes", dept: "it" },
    culpritB: { door: "server_room", swipe_hour: 2 },
  },
];

export const tiers = {
  easy: { cases: easyCases },
  medium: { cases: mediumCases },
  hard: { cases: hardCases },
};
