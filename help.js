// help.js — the /help tutorial: every typed door, what it does, its exact
// syntax, a worked example, and the walkthrough. Pure and browser-safe so
// it is testable in node (P10); app.js only renders what this returns.
//
// THE ONE RULE the index says first, because it governs everything here:
// every door is checked BEFORE any model call, so what you type is never
// hijacked. Most doors are mechanical (computed, never generated); the
// ones that call a model or reach the network say so in their card.

export const HELP_CATEGORIES = {
  material: "Getting material in — text becomes sources you can question and cite",
  build: "Building things — folds, tasks, essays, code",
  self: "Memory and self — the instrument's own cognition, on request",
  check: "Checking claims — against the record and against the world",
  reason: "Reasoning and the record — derivation, the void, the loops",
  room: "The room — other machines, shared sealed chats",
  system: "The instrument itself — routes, gateways, this tutorial",
};

/** The tutorial registry. Keyed by the door as typed ("/fold"). Every door
 * in app.js's DOORS has an entry here, and every entry is a real door —
 * help.test.mjs reads app.js's DOORS literal and pins that agreement. */
export const HELP = {
  "/source": {
    category: "material",
    name: "Save text as a source",
    summary: "turns the text after the first line into a named, citable source — chunked, identified, read on arrival, persisted.",
    syntax: "/source <name>\n<the text to save>",
    example: "/source hamlin.txt\nHannibal Hamlin was Abraham Lincoln's first vice president, in office from 1861 to 1865.",
    tutorial: "Put the name on the first line and the content on the lines after it. The text becomes an ordinary source exactly as a pasted or uploaded file would: it is chunked into passages, its kind is identified, it is read as it arrives, and it survives a reload. Leave the name off and it is auto-named pasted.txt, pasted-2.txt, and so on. A source is MATERIAL — bytes the machine will ground answers on — never model output, which is the whole point of the word. There is no model call here.",
    needs: "nothing — the text itself is all it takes",
  },
  "/transcribe": {
    category: "material",
    name: "Transcribe audio",
    summary: "turns a YouTube URL or a local audio file into addressable text material, transcribed in the browser by Whisper.",
    syntax: "/transcribe <youtube-url>\n/transcribe  (bare — opens a file picker for a local audio file)",
    example: "/transcribe https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    tutorial: "Paste a YouTube link, or run it bare to pick a local audio file. Whisper runs entirely in the browser and the result lands as a source named transcription-<time>.audio, addressed by the times the recognizer heard. The first transcription downloads the Whisper model (~150 MB) and says so before it starts; after that it is cached.",
    needs: "for a URL: the recorded web egress (the server fetches the audio bytes only); for a local file: nothing. The model weights download once from huggingface.co.",
  },
  "/visual": {
    category: "material",
    name: "Read an image",
    summary: "reads an already-attached image's structure and attaches the folded description as a citable text source.",
    syntax: "/visual <name>",
    example: "/visual diagram.png",
    tutorial: "Attach an image first (drop it or use the ＋ Add menu), then run this with its name. The server reads the image (OpenCV box and connector detection, per-region OCR) and the result attaches as an ordinary text source, so you can question and cite it like any document.",
    needs: "an attached image with that name; a server crossing (localhost)",
  },
  "/measure": {
    category: "material",
    name: "Measure a file",
    summary: "runs one declared statistic against a Born-constructed null over an attached file's own surface, mechanically.",
    syntax: "/measure <media>\n/measure <media> channel:… frame:… as:… broken:… draws:… window:…",
    example: "/measure quakes.csv\n/measure audio channel:left frame:samples as:mean broken:shuffle draws:200",
    tutorial: "Bare /measure <media> probes the file's measurable surface and offers example declaration lines. A full declaration places one statistic against a null built from the material itself — the 'broken:' clause is the perturbation, so the result reads 'censored above', 'within the band', or a typed gap, never a bare number. No model is ever asked what a number means.",
    needs: "an attached file with that name",
  },

  "/fold": {
    category: "build",
    name: "Revise a fold",
    summary: "asks the model to revise an existing code fold; whatever code comes back lands as a new version on THAT fold's log, never a new fold.",
    syntax: "/fold <n> <instruction>",
    example: "/fold 2 make the spiral's radius grow with the angle",
    tutorial: "Name the fold by number and say what to change. The door carries the target, so the model's prose can never re-route the result: the returned code is extracted mechanically and appended to that fold's own append-only log. Complaining in plain words ('it's broken', 'make it blue') routes the same way, automatically.",
    needs: "an existing fold; one model call",
  },
  "/task": {
    category: "build",
    name: "Plan and run a task",
    summary: "plans a many-part job into parts, each run separately against the material, its log folded into the answer.",
    syntax: "/task <what to produce>",
    example: "/task research the 1960 World Series and write a report with sources",
    tutorial: "A task is planned (its plan is decoded from the model's grammar, never instructed), then each part runs through the same organs an ordinary question uses — retrieval, grounding, correction. The plan is an append-only log, and the answer is the fold of it. A single-sentence question usually does not need this door and runs the two-pass answer instead.",
    needs: "material helps; model calls, one per part plus planning",
  },
  "/bound": {
    category: "build",
    name: "Answer twice",
    summary: "answers the same question twice side by side — once free and audited, once with the decoding grammar holding names and figures to the material.",
    syntax: "/bound <question>",
    example: "/bound who was Lincoln's vice president in 1861?",
    tutorial: "Two answers, measured against each other: the free draft and the bound one where grammar, not instruction, holds every name to the cast and every figure to the material's cells. Use it when you want to see what the apparatus itself is buying.",
    needs: "material for a meaningful bound answer; model calls",
  },
  "/essay": {
    category: "build",
    name: "Compose a piece",
    summary: "writes a long-form piece as sections, each section its own checked pass.",
    syntax: "/essay <topic>",
    example: "/essay the history of the Panama Canal",
    tutorial: "A longer work is produced as sections rather than one prompt. Each section is its own part with its own retrieval and checks, so the whole does not exceed one model call's context and nothing is fabricated into a gap between sections.",
    needs: "material helps; model calls per section",
  },
  "/ingest": {
    category: "build",
    name: "Ingest a repo",
    summary: "fetches a GitHub repository's admissible files and lands each as a fold carrying its provenance forever.",
    syntax: "/ingest <owner/name or github url>",
    example: "/ingest clovenbradshaw-ctrl/commoncite",
    tutorial: "Every admissible file becomes its own code fold whose birth carries the shared provenance — repo, path, license, retrieval date — so an ingested file can be edited in place by the whole iteration ladder without its ancestry washing out. Entirely mechanical: no model call anywhere.",
    needs: "recorded network egress (the recorded P13 crossing)",
  },
  "/run": {
    category: "build",
    name: "Run code you wrote",
    summary: "runs code YOU typed or pasted in the same sandboxed, network-severed Worker the model's own code runs inside.",
    syntax: "/run <runtime>\n<code>",
    example: "/run python\nprint(2 + 2)\n/run sql\n.load pasted.txt\nselect * from pasted where riders > 1500;",
    tutorial: "First line names the runtime (python, js/javascript, or sql — use the first line's second word), everything after it is the code, verbatim. The sandbox has no network and no access to your machine; material you attached is mounted so queries and scripts can read it. One-shot: every /run is its own action, never a standing switch. Code the MODEL wrote in a fold auto-runs by itself — this door is only for code you wrote.",
    needs: "a sandbox boot (python/pyodide ~9s the first time), nothing else",
  },
  "/act": {
    category: "build",
    name: "Compose a nine-operator act",
    summary: "lands one act of the composition law on the same append-only log the terminal's act/grid commands read and write.",
    syntax: "/act <verb> <object> at <terrain> from <stance> [ground <source> broken:<perturbation>]",
    example: "/act distinguish who-is-here at Entity from encounter ground pasted.txt broken:rotation",
    tutorial: "A single act of the operator algebra — distinguish, relate, synthesize, define, evaluate, and the rest — lands on the grid log, and a distinguish over a loaded source can run the cast capacity for real (the referents found attach to the act's own entry). Refusals are typed and grammatical: no ground clause, an unestablished referent, an illegal stance — each is named, never guessed.",
    needs: "the composition grammar's own rules; a loaded source for a real cast run",
  },

  "/self": {
    category: "self",
    name: "The instrument's own cognition",
    summary: "shows one level of how this instrument has been working — computed from state, never generated.",
    syntax: "/self <acts|surprise|pace|folds|records|sources|passages>\n/self  (bare — the whole ladder)",
    example: "/self surprise",
    tutorial: "Every level is a table computed from the append-only ledger of this conversation's own acts: what was asked, retrieved, checked, corrected, recorded. It answers 'how do you work' by showing the ledger, not by making something up. Self-questions asked in words ('what surprised you most') route here too, but only with a clear second-person tell.",
    needs: "nothing — it reads state",
  },
  "/reflect": {
    category: "self",
    name: "Ask the self plane a question",
    summary: "answers about how this instrument has been working, retrieving from its own act ledger with the usual checks.",
    syntax: "/reflect <question>",
    example: "/reflect how often have I been asking about sources?",
    tutorial: "A model turn over the self plane: retrieval runs against the conversation's own ledger chunks, and the answer gets the same grounding checks a material answer does — against the ledger's bytes, not the world's. A record such a turn earns is typed as self-knowledge, never as a check against the world.",
    needs: "a model call",
  },
  "/reopen": {
    category: "self",
    name: "Reopen the last open",
    summary: "restores the last source, fold, or door result from the record's own rows — no model, and restore never re-admits.",
    syntax: "/reopen [source|fold|door]",
    example: "/reopen source",
    tutorial: "The record keeps what was opened; this walks back to the most recent open of the kind you name and restores it — a source back into the viewer, a fold re-scrubbed, a door result re-rendered from its recorded fields. It reads the record, never the memory of this browser, and it says when the record names something this conversation never attached rather than fetching it.",
    needs: "a record with an open of that kind",
  },
  "/learn": {
    category: "self",
    name: "Open the handbook",
    summary: "opens the vendored handbook's chapters — the theory this instrument is built on.",
    syntax: "/learn <chapter>",
    example: "/learn constitution",
    tutorial: "The terminal's own learn walk grades real keystrokes, which chat cannot offer; here the door points to the vendored handbook chapters this instrument is built on, so chat can open them directly.",
    needs: "nothing",
  },
  "/reading": {
    category: "self",
    name: "How this turn reads",
    summary: "discloses which reading basis decided a turn's identity — in plain language.",
    syntax: "/reading",
    example: "/reading",
    tutorial: "Identity in this instrument is decided by a reading: the page reads with the same constitutional assembly the evals use, and this door says which basis actually decided the turn's identity, rather than leaving it to be inferred.",
    needs: "nothing — it reads the page's own reading state",
  },

  "/facts": {
    category: "check",
    name: "Compose a fact sheet",
    summary: "composes claims the material holds as a plain-language fact sheet, with each claim's standing named.",
    syntax: "/facts [maxFetches]",
    example: "/facts",
    tutorial: "Reads the conversation's own accumulated notes and renders the ones the material backs as a passage you can read at a glance — each claim with its standing ('stated in more than one place' / 'stated once so far'). Claims standing only on Wikipedia are chased to a primary source first if consent allows; Wikipedia is read, it just never grounds a sentence.",
    needs: "material, and web consent for the primary-source chase",
  },
  "/corroborate": {
    category: "check",
    name: "Corroborate the ledger",
    summary: "walks the conversation's own accumulated notes against the loaded sources with a witness, asking each note the material itself did not settle.",
    syntax: "/corroborate <maxAsks>",
    example: "/corroborate 8",
    tutorial: "The number is YOUR budget — the model calls this walk may spend, and it is never defaulted. Notes the ledger has heard but that still stand on one source are put to a small witness that reads the passages and says which the material states. The spend is a door, never a silent per-turn cost.",
    needs: "material and the declared budget in model calls",
  },
  "/ranke": {
    category: "check",
    name: "Chase a claim to its source",
    summary: "chases notes read off a fetched page to the sources that page cites or quotes, verifying each with a witness.",
    syntax: "/ranke <maxFetches> [maxSearches]",
    example: "/ranke 6 3",
    tutorial: "A page that cites nothing chases nothing; a link sharing no word with a claim is not a lead for it. Containment is a lead, never a landing — only the witness's own 'states' verdict lands as primary. The ledger then discloses standing, and an account and the document it cites are counted as two kinds of witness, never summed.",
    needs: "web consent; the budget in fetches/searches",
  },
  "/priors": {
    category: "check",
    name: "Browse the priors ledger",
    summary: "reads and flips the live_priors toggle ledger — the same ledger the Priors tab and the terminal's priors command use.",
    syntax: "/priors\n/priors <name or genre>",
    example: "/priors",
    tutorial: "One ledger, three doors (chat, the Priors tab, the terminal). Bare /priors shows what the corpus offers and what is toggled on; naming a document or genre flips it. A toggle is a fact about a file on disk, computed from a server fetch, never generated.",
    needs: "the live_priors corpus on disk (localhost)",
  },

  "/declare": {
    category: "reason",
    name: "Declare what a relation does",
    summary: "records, with you as the giver, what a relation does — transitive, or composing into a named product.",
    syntax: "/declare <relation> transitive\n/declare <relation> composes <product>",
    example: "/declare after transitive",
    tutorial: "The record derives from declared chemistry and nowhere else, so every derived fact names who licensed it. You are the giver — the declaration is on the append-only register forever, and can be conceded.",
    needs: "your own declaration; nothing else",
  },
  "/derive": {
    category: "reason",
    name: "Derive what follows",
    summary: "derives the facts the declared chemistry licenses, landing products on the ledger with their grounds.",
    syntax: "/derive",
    example: "/derive",
    tutorial: "The circuit composes what you declared: a transitive relation composes across the record, and a declared product composes its inputs. A derived fact reaches the model as derived, never as settled — it always carries restsOn.",
    needs: "declarations on the register",
  },
  "/concede": {
    category: "reason",
    name: "Concede a premise",
    summary: "shows what would fall if a premise or product were withdrawn, then withdraws it on the record.",
    syntax: "/concede <id>\n/concede! <id>  (perform the withdrawal)",
    example: "/concede p:3",
    tutorial: "The dry run comes first: /concede shows exposure — every product that would fall — before anything is decided. Only the bang performs the act, and the withdrawal is recorded with its trigger. Never a rewind: the past stays on the log.",
    needs: "a premise or product id on the record",
  },
  "/holograph": {
    category: "reason",
    name: "The record as rows",
    summary: "draws the record as drillable rows at a cursor and a rung — the record is the object, every view a small pattern computed from it.",
    syntax: "/holograph [query]",
    example: "/holograph hamlin",
    tutorial: "The holograph is the append-only record itself, revealed as rows that drill (a cursor on the loop ledger's sequence, a rung on the nine terrains). Words carry their own meaning; nothing explains the rung. A query narrows the rows — by keyword, or by the EOT glyph notation.",
    needs: "nothing — it reads the record",
  },
  "/model-loop": {
    category: "reason",
    name: "The model's own loops",
    summary: "opens or resumes a model-loop — a saved reasoning circuit that answers by running its own logged turns.",
    syntax: "/model-loop <name or prompt>",
    example: "/model-loop weather-check",
    tutorial: "A model-loop is a saved, named circuit of turns that answers by re-running its own append-only log rather than improvising each time. Name one to open or resume it; a new prompt begins a fresh loop.",
    needs: "model calls",
  },
  "/void": {
    category: "reason",
    name: "Declare a void",
    summary: "declares a gap the material has not filled — an open question on the record, tracked through time, never asserted closed.",
    syntax: "/void <id>\n/void! <id>  (perform the declaration)\n/void   (list open voids)",
    example: "/void who directed the Northgate Observatory",
    tutorial: "A void is DEF·Ground: the instrument says 'looked for and not found so far — an open gap, not a finding that it is false.' A void that the reader later fills is re-zeroed the moment a link fills it. The answer's own 'there is no mention' now cites the void in scope for it.",
    needs: "nothing — the question's own space",
  },
  "/must": {
    category: "reason",
    name: "The obligation ledger",
    summary: "admits an enumerated instruction set as clauses each owed a visit, and reports coverage as enumeration.",
    syntax: "/must <instruction set>\n/must  (bare — coverage: what is unvisited, what stands violated)",
    example: "/must 1. check every date in section 2. 2. confirm each name against the source.",
    tutorial: "A long instruction set is admitted as declared clauses, each owed a visit. Coverage is reported as enumeration — the unvisited NAMED, complete only when nothing is unvisited and nothing stands violated. 'done', 'broke', and 'waive … by <who>' move standings append-only, each with its because.",
    needs: "nothing",
  },

  "/matrix": {
    category: "room",
    name: "The room",
    summary: "signs in to a homeserver you name, opens the room sheet, or acts on the room's state — preserve, share, join, serve, pool.",
    syntax: "/matrix\n/matrix login\n/matrix logout",
    example: "/matrix",
    tutorial: "The room is how other machines take part: this browser preserves a chat sealed under a key the homeserver never holds, shares it, joins one shared with someone else, and offers this machine's models as a mouth for the room. Every door in the sheet sends the door it names, so the act lands on the transcript exactly as a typed one does.",
    needs: "a homeserver you name; your own consent for each crossing",
  },
  "/preserve": {
    category: "room",
    name: "Preserve this chat",
    summary: "writes this chat into a room on the homeserver, sealed, so it survives and can be shared.",
    syntax: "/preserve",
    example: "/preserve",
    tutorial: "Everything that leaves this page for the homeserver is sealed under a key only you hold. Preserving is the first step toward sharing: the sealed chat lives in the room, and a share link can hand it to someone you name.",
    needs: "a signed-in homeserver",
  },
  "/share": {
    category: "room",
    name: "Share a chat",
    summary: "makes a share link for the preserved chat — bound to someone, or open with a warning.",
    syntax: "/share <@who>",
    example: "/share @friend:server.com",
    tutorial: "A bound link is redeemed by publishing a key proof — only the person you name can open it. An open link uses a magic key and is always printed with a warning. Passphrase links seal the key under words. The fragment carries the key, so the link itself is what you hand over.",
    needs: "a preserved chat and a homeserver",
  },
  "/join": {
    category: "room",
    name: "Join a shared chat",
    summary: "opens a chat someone shared with you from its link.",
    syntax: "/join <link or room>",
    example: "/join https://…/#share-key",
    tutorial: "Hand the share link to the room and this browser opens the shared chat sealed. A link you cannot open says so, typed, rather than pretending.",
    needs: "a valid share link",
  },
  "/serve": {
    category: "room",
    name: "Serve a mouth",
    summary: "offers this machine's models to the room as a mouth that answers the room's questions headless.",
    syntax: "/serve",
    example: "/serve",
    tutorial: "This machine becomes a member of the room that answers its questions with its own local models — a real mouth on the pool, no browser needed. The session lives in ~/.the-fold/matrix-worker.json at mode 600.",
    needs: "a signed-in homeserver; Ollama running on this machine",
  },
  "/pool": {
    category: "room",
    name: "The pool",
    summary: "shows the room's members, their machines, models, and in-flight work.",
    syntax: "/pool",
    example: "/pool",
    tutorial: "Every offer from every mouth carries what it can run and what is spare; the pool ranks by in-flight × latency. Picking a member's model in the model menu routes your turns to them, sealed.",
    needs: "a room with more than one machine",
  },

  "/help": {
    category: "system",
    name: "This tutorial",
    summary: "the grouped index of every door, or the full walkthrough of one command.",
    syntax: "/help\n/help <door>",
    example: "/help fold\n/help source",
    tutorial: "Bare /help is the index below, grouped by what a door is for. /help <door> is that command's full card — syntax, a worked example, and the walkthrough. There is no model call: the tutorial is data, computed and printed.",
    needs: "nothing",
  },
  "/routes": {
    category: "system",
    name: "What the page can reach",
    summary: "re-probes where this page is and what it found reachable at boot.",
    syntax: "/routes",
    example: "/routes",
    tutorial: "Three homes (localhost dev server, static site, terminal) answer differently; this says which one this page is in and what the probes found reachable. A probe that was never asked is reported as not asked, never as if it were instant.",
    needs: "nothing — localhost or same-origin probes only",
  },
  "/gateways": {
    category: "system",
    name: "Public gateways",
    summary: "shows the learned table of which public gateways are open — and, with probe, measures one by fetching through it.",
    syntax: "/gateways\n/gateways probe",
    example: "/gateways",
    tutorial: "A refused direct fetch (403, a challenge shell, an empty page) tries public gateways in an order the record has learned. This shows that table; probe makes one recorded fetch through each so the table has something to learn from. A number here is a measurement of a route, never a promise about the web.",
    needs: "for probe: one recorded fetch through each gateway",
  },
};

/** Every door the tutorial knows, as a plain list — the keys of HELP. */
export const HELP_DOOR_NAMES = Object.freeze(Object.keys(HELP));

/** Normalize a user-typed door reference ("fold", "/FOLD", "fold x") to the
 * canonical "/door" key, or null if it names no door. */
export function normalizeDoor(query) {
  const raw = String(query ?? "").trim().toLowerCase().replace(/^\//, "");
  if (!raw) return null;
  const key = "/" + raw.split(/\s+/)[0];
  return HELP[key] ? key : null;
}

function line(door, entry) {
  return `  ${door} — ${entry.name} — ${entry.summary}`;
}

/** The grouped index: every door, one line each, under its category. */
export function renderHelpIndex() {
  const byCat = new Map();
  for (const door of HELP_DOOR_NAMES) {
    const e = HELP[door];
    if (!byCat.has(e.category)) byCat.set(e.category, []);
    byCat.get(e.category).push({ door, ...e });
  }
  const parts = [
    "The Fold — the doors",
    "",
    "Every door below is checked BEFORE any model call, so what you type is never hijacked. Most are mechanical (computed, never generated); the ones that call a model or reach the network say so in their card. Type /help <door> for the full walkthrough of any command.",
    "",
  ];
  for (const [cat, entries] of byCat) {
    parts.push(HELP_CATEGORIES[cat].toUpperCase());
    parts.push(entries.map((e) => line(e.door, e)).join("\n"));
    parts.push("");
  }
  parts.push("Getting material in has a shortcut with no command at all: paste a large block straight into the composer (over 1,000 characters) and it becomes a source by itself — /source names one explicitly.");
  parts.push("Type /help <door> — e.g. /help fold — for the full tutorial on that command.");
  return parts.join("\n");
}

/** The full card for one door. */
export function renderDoorCard(door, entry) {
  const heading = `${door} — ${entry.name}  (${HELP_CATEGORIES[entry.category]})`;
  return [
    heading,
    "",
    entry.tutorial,
    "",
    `Syntax:`,
    `  ${entry.syntax}`,
    "",
    `Example:`,
    `  ${entry.example}`,
    "",
    `You need: ${entry.needs}`,
  ].join("\n");
}

/** A door nobody knows: say so, and list what is known. */
export function renderUnknown(query) {
  const asked = String(query ?? "").trim().replace(/^\//, "") || "that";
  return [
    `there is no door named "${asked}" — the doors: ${HELP_DOOR_NAMES.join(" ")}`,
    "",
    `Type /help for the grouped index, or /help <door> (e.g. /help fold) for one command's walkthrough.`,
  ].join("\n");
}

/** The whole /help renderer: empty query → index; a known door → its
 * card; anything else → the unknown-door refusal. */
export function renderHelp(query) {
  const raw = String(query ?? "").trim().replace(/^\//, "");
  if (!raw) return renderHelpIndex();
  const key = "/" + raw.split(/\s+/)[0].toLowerCase();
  if (HELP[key]) return renderDoorCard(key, HELP[key]);
  return renderUnknown(query);
}