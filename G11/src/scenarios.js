// scenarios.js
//
// Content pool for terminal-dungeon. Each level is a small filesystem
// tree the player must navigate to reach the "treasure_room" directory
// using only `cat`, `ls`, `ls -a`, and `cd`. Variety is generated at build
// time here (not at play time / via any API): different depths, dead ends,
// decoy rooms, hidden directories, directory permissions, and diegetic
// clue files that guide the correct path.
//
// Tree node shape:
//   {
//     name: "dirname",
//     hidden: false,        // shown only by `ls -a`
//     read: true,           // r bit: can this dir's contents be `ls`-ed?
//     exec: true,           // x bit: can the player `cd` into this dir?
//     files: ["note.txt"],  // plain files living in this dir
//     dirs: [ ...childNodes ]
//   }
//
// The root node is the starting directory ("/"). The goal is to `cd` into
// the directory named exactly `treasure_room`.
//
// Each level also carries a `contents` map: filename -> text shown by
// `cat filename`. Some are pure flavor (dead-end atmosphere); others are
// riddles that steer the player toward the right room. Hints are written
// in-universe with the real command in parentheses, e.g. "read it (cat)".

export const GOAL = "treasure_room";

function dir(name, opts = {}) {
  return {
    name,
    hidden: opts.hidden || false,
    read: opts.read !== undefined ? opts.read : true,
    exec: opts.exec !== undefined ? opts.exec : true,
    files: opts.files || [],
    dirs: opts.dirs || [],
  };
}

export const LEVELS = [
  // 1 — teaches the whole basic loop: cat, ls, cd.
  {
    title: "Level 1 — First steps",
    hint: "A torn note lies at your feet. Read it (cat readme.txt).",
    goal: "Reach the treasure_room.",
    contents: {
      "readme.txt":
        "Welcome, delver.\n" +
        "Three words will carry you through these halls:\n" +
        "  look   (ls)        - see what shares your room\n" +
        "  read   (cat FILE)  - inspect a scroll or object\n" +
        "  enter  (cd ROOM)   - step through a doorway\n" +
        "Now: look around (ls), then enter the treasure_room (cd).",
      "torch.txt":
        "A guttering torch. Its light barely reaches the walls.",
    },
    tree: dir("/", {
      files: ["readme.txt", "torch.txt"],
      dirs: [dir("treasure_room", { files: ["gold.txt"] })],
    }),
  },

  // 2 — one level of nesting: two cds in a row, with flavor.
  {
    title: "Level 2 — Going deeper",
    hint: "The gold isn't in the first room. Press on (cd), and look (ls) as you go.",
    goal: "Reach the treasure_room.",
    contents: {
      "cobwebs.txt":
        "Thick cobwebs drape the corner. No one has passed here in years.\n" +
        "        '\n" +
        "     .-'-.\n" +
        "    (  o  )   ...still, a draft leaks from deeper in.\n" +
        "     '-.-'",
    },
    tree: dir("/", {
      dirs: [
        dir("cellar", {
          files: ["cobwebs.txt"],
          dirs: [dir("treasure_room", { files: ["gold.txt"] })],
        }),
      ],
    }),
  },

  // 3 — dead ends + a riddle that names the correct branch. Teaches cd ..
  {
    title: "Level 3 — Dead ends",
    hint: "Read the signs (cat), and back out of dead ends (cd ..).",
    goal: "Reach the treasure_room.",
    contents: {
      "inscription.txt":
        "Carved above the doorways:\n" +
        "  \"Gold is not kept among weapons.\n" +
        "   Seek instead the hall where feasts were held.\"",
      "rusty_sword.txt":
        "A rusted blade, fused to its scabbard. Useless.",
      "empty.txt":
        "An empty weapon rack. Whatever hung here is long gone.",
      "banner.txt":
        "A faded feast-hall banner. You are on the right path.",
    },
    tree: dir("/", {
      files: ["inscription.txt"],
      dirs: [
        dir("armory", { files: ["rusty_sword.txt", "empty.txt"] }),
        dir("great_hall", {
          files: ["banner.txt"],
          dirs: [dir("treasure_room", { files: ["gold.txt"] })],
        }),
      ],
    }),
  },

  // 4 — bigger maze, more decoys, a signpost riddle that steers east.
  {
    title: "Level 4 — The maze",
    hint: "Look in every room (ls) and read what you find (cat). Dead end? Back up (cd ..).",
    goal: "Reach the treasure_room.",
    contents: {
      "signpost.txt":
        "A weathered signpost at the crossroads, its arrows worn to nothing.\n" +
        "Only one carved line survives:\n" +
        "  \"Knowledge guards the hoard.\"",
      "stale_bread.txt": "A loaf hard as stone. The kitchen is long cold.",
      "barrels.txt": "Empty barrels, staved in by time. A dead end.",
      "dusty_tome.txt":
        "A dusty tome, its spine cracked. A margin note reads:\n" +
        "  \"Below the reading room, the vault of gold.\"",
    },
    tree: dir("/", {
      files: ["signpost.txt"],
      dirs: [
        dir("west_wing", {
          dirs: [
            dir("kitchen", { files: ["stale_bread.txt"] }),
            dir("pantry", { files: ["barrels.txt"] }),
          ],
        }),
        dir("east_wing", {
          dirs: [
            dir("library", {
              files: ["dusty_tome.txt"],
              dirs: [dir("treasure_room", { files: ["gold.txt"] })],
            }),
          ],
        }),
      ],
    }),
  },

  // 5 — hidden directory. The ls -a clue lives in ROOT, where the hidden
  // door actually is. Child rooms are honest dead ends.
  {
    title: "Level 5 — Hidden doors",
    hint: "Read the scroll at your feet (cat riddle.txt). Then look carefully (ls -a).",
    goal: "Reach the treasure_room (it may be hidden).",
    contents: {
      "riddle.txt":
        "You feel a draft, yet see only solid walls around THIS room.\n" +
        "Not every door wants to be seen: a plain look (ls) turns away\n" +
        "from names that begin with a dot. To reveal them here, look\n" +
        "carefully:  ls -a",
      "bones.txt":
        "A heap of old bones.\n" +
        "   x   x\n" +
        "    ---     Just a dead end. Nothing hidden here.",
      "dust.txt":
        "Undisturbed dust coats the floor. No one came this way. Dead end.",
      "skulls.txt":
        "Rows of skulls stare from the ossuary walls. A dead end.",
    },
    tree: dir("/", {
      files: ["riddle.txt"],
      dirs: [
        dir("crypt", { files: ["bones.txt", "dust.txt"] }),
        dir("ossuary", { files: ["skulls.txt"] }),
        dir(".secret_passage", {
          hidden: true,
          dirs: [dir("treasure_room", { files: ["gold.txt"] })],
        }),
      ],
    }),
  },

  // 6 — permission puzzle: the note explains r-vs-x so it isn't a guess.
  {
    title: "Level 6 — Locked from sight",
    hint: "Before you go anywhere, read the warning (cat warning.txt).",
    goal: "Reach the treasure_room. One room can't be listed from inside.",
    contents: {
      "warning.txt":
        "The vault ahead is pitch black.\n" +
        "On a room (directory): read (r) lets you look (ls); execute (x) lets you enter (cd).\n" +
        "The vault has x but NO r: you CAN walk in, you just CAN'T see.\n" +
        "So step inside anyway and press on (cd) to the treasure_room within.",
    },
    tree: dir("/", {
      files: ["warning.txt"],
      dirs: [
        dir("vault", {
          read: false, // can cd in, but `ls` here is denied
          dirs: [dir("treasure_room", { files: ["gold.txt"] })],
        }),
      ],
    }),
  },

  // 7 — finale of the core kit: many dead ends, guided by a torn map.
  // The ls -a clue lives in `dungeon`, where the hidden .oubliette is.
  {
    title: "Level 7 — The final descent",
    hint: "Read the map first (cat map_fragment.txt), then read every note you find (cat).",
    goal: "Reach the treasure_room.",
    contents: {
      "map_fragment.txt":
        "...torn parchment...\n" +
        "  Gold lies below, past the dungeon. The barracks and armory\n" +
        "  hold nothing. Descend through the dungeon and read the warden's note.",
      "bunks.txt":
        "Rotted bunks in the barracks. The guards deserted long ago. Dead end.",
      "footlocker.txt":
        "An empty footlocker, lid hanging open. Looted centuries ago.",
      "rack.txt":
        "An armory rack of broken spears. Nothing of worth. Dead end.",
      "warden_note.txt":
        "The warden's log, left on a hook here in the dungeon:\n" +
        "  \"The oubliette's hatch sits flush with the floor of THIS room.\n" +
        "   You'll not see it with a glance -- look carefully (ls -a).\n" +
        "   Drop through, follow the tunnel to the treasure_room.\"",
      "chains.txt":
        "Rusted shackles bolted to a cell wall.\n" +
        "  o==[]==o    Nothing here but old sorrow. Dead end.",
    },
    tree: dir("/", {
      files: ["map_fragment.txt"],
      dirs: [
        dir("barracks", { files: ["bunks.txt", "footlocker.txt"] }),
        dir("armory", { files: ["rack.txt"] }),
        dir("dungeon", {
          files: ["warden_note.txt"],
          dirs: [
            dir("cells", { files: ["chains.txt"] }),
            dir(".oubliette", {
              hidden: true,
              dirs: [
                dir("tunnel", {
                  dirs: [dir("treasure_room", { files: ["gold.txt"] })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  },

  // 8 — the gauntlet: reuses the DARK room (no read) together with a
  // hidden dir, deep nesting, and dead ends. Each clue sits in the room
  // it describes, so every step is earned by reading, not guessing.
  {
    title: "Level 8 — The gauntlet",
    hint: "Everything now: read (cat), look (ls), look carefully (ls -a), enter (cd), retreat (cd ..).",
    goal: "Reach the treasure_room through the sealed, lightless crypt.",
    contents: {
      "last_will.txt":
        "A noble's last will, pinned by a dagger:\n" +
        "  \"My hoard rests in the catacombs, not the chapel.\n" +
        "   But the catacombs keep secrets -- read the epitaph below.\"",
      "altar.txt":
        "A cold stone altar in the chapel. Candles long dead. A dead end.",
      "candles.txt":
        "Melted stubs of a hundred candles. The chapel holds nothing else.",
      "epitaph.txt":
        "An epitaph carved along the catacomb wall:\n" +
        "  \"One tomb here is SEALED and unlit -- hidden from a glance\n" +
        "   (look carefully: ls -a). Inside you'll see nothing at all\n" +
        "   (it has no read). Do not turn back: press on (cd) to the\n" +
        "   treasure_room within.\"",
      "empty_reliquary.txt":
        "A reliquary, its holy relic long stolen. Bare shelves. Dead end.",
      "rubble.txt":
        "A collapsed passage, choked with rubble. There is no way through here.",
    },
    tree: dir("/", {
      files: ["last_will.txt"],
      dirs: [
        dir("chapel", { files: ["altar.txt", "candles.txt"] }),
        dir("catacombs", {
          files: ["epitaph.txt"],
          dirs: [
            dir("reliquary", { files: ["empty_reliquary.txt"] }),
            dir("collapsed_hall", { files: ["rubble.txt"] }),
            dir(".sealed_crypt", {
              hidden: true,
              read: false, // hidden AND lightless: find it, then cd in blind
              dirs: [dir("treasure_room", { files: ["gold.txt"] })],
            }),
          ],
        }),
      ],
    }),
  },

  // 9 — the sprawling capstone. Key ideas:
  //  * The keep's lower halls are DARK (no read) and CHAINED together
  //    (dark -> dark), so their names can't be discovered by `ls` from
  //    inside. The only record of the descent order lives in the ARCHIVE,
  //    down a SEPARATE branch (west_tower) -> forced backtracking.
  //  * A NORMAL room (antechamber) sits AFTER the dark chain, so the
  //    player learns that leaving a dark room can restore sight.
  //  * Many dead ends and a hidden observatory for extra sprawl.
  {
    title: "Level 9 — The sunken keep",
    hint: "A sprawling ruin. Read everything (cat), and remember: some rooms' names live in other wings. You'll have to double back (cd ..).",
    goal: "Reach the treasure_room in the lightless depths of the keep.",
    contents: {
      "proclamation.txt":
        "Royal proclamation, nailed to the gate:\n" +
        "  \"The hoard lies deep within the KEEP. But the keep's lower\n" +
        "   halls are pitch dark -- their doors give no light and no\n" +
        "   listing (ls will fail there). Learn their names BEFORE you\n" +
        "   descend. The tower archive to the west set them down.\"",
      "portcullis.txt":
        "A rusted portcullis, jammed half-open. Just the gatehouse. Dead end.",
      "stairs.txt":
        "Spiral stairs wind up the west tower to the archive above.\n" +
        "(You sense a sealed room here too -- look carefully: ls -a.)",
      "ledger.txt":
        "Archivist's ledger, the last entry before the lights failed:\n" +
        "  \"The descent of the keep, in order:\n" +
        "     keep -> undercroft -> oubliette -> antechamber -> treasure_room\n" +
        "   The undercroft AND the oubliette are lightless (no read);\n" +
        "   you will see nothing within either. Trust these names and\n" +
        "   press on (cd) through the dark until sight returns.\"",
      "dusty_scrolls.txt":
        "Shelves of crumbling scrolls, ink faded to nothing. Nothing useful.",
      "star_chart.txt":
        "A faded star chart in the sealed observatory. Beautiful, but a dead end.",
      "throne.txt":
        "A toppled throne in the keep's hall.\n" +
        "A final scratch in the armrest: \"Down, into the undercroft.\"",
      "cots.txt":
        "Rotted cots line the barracks. The garrison is centuries gone. Dead end.",
      "antechamber_note.txt":
        "Light returns! A sconce still burns in this antechamber.\n" +
        "An arrow is chalked on the flagstones toward the treasure_room.",
    },
    tree: dir("/", {
      files: ["proclamation.txt"],
      dirs: [
        dir("gatehouse", { files: ["portcullis.txt"] }),
        dir("west_tower", {
          files: ["stairs.txt"],
          dirs: [
            dir("archive", { files: ["ledger.txt", "dusty_scrolls.txt"] }),
            dir(".observatory", { hidden: true, files: ["star_chart.txt"] }),
          ],
        }),
        dir("keep", {
          files: ["throne.txt"],
          dirs: [
            dir("barracks", { files: ["cots.txt"] }),
            // dark chain: undercroft (dark) -> oubliette (dark) -> antechamber (normal)
            dir("undercroft", {
              read: false,
              dirs: [
                dir("oubliette", {
                  read: false,
                  dirs: [
                    dir("antechamber", {
                      files: ["antechamber_note.txt"],
                      dirs: [dir("treasure_room", { files: ["gold.txt"] })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  },
];
