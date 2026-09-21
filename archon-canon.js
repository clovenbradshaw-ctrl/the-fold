// archon-canon.js — the archons in their own words, for the chat's empty state.
//
// Each archon on solon.js's register is named for a figure or a thing, and the
// card on a new conversation shows that namesake's canonical line: the passage
// in the language it was written in, a public-domain English translation under
// it, and where both live in the priors corpus (live_priors). The module's own
// sentence stays, demoted to a footnote — it is this codebase talking about the
// archon, never the archon talking.
//
// User direction (2026-09-15): "the quote needs to be canonical from the real
// them" and "put the original language with the english translation"; then
// (2026-09-16), on a card that could only say "Wanted: Grímnismál … nothing
// answered": "be sure all the priors are loaded for stuff like this, and also,
// use better quotes than this and better layout." live_priors'
// scripts/fetch-archon-canon.mjs loads the works; this table quotes them.
//
// EVERY QUOTED LINE IS READ BACK OUT OF ITS FILE (archon-canon.test.mjs). What
// the check tolerates is declared, never silent:
//   - whitespace and line breaks, and a verse divider (" / " or " | ") that
//     stands where the file breaks the line — `matchFold`;
//   - an elision mark at either end of a quote (" …"), where a sentence runs on;
//   - `fix`, per quote: [asPrinted, asShown] pairs applied to the FILE before
//     the comparison — OCR misreadings of a scanned book ("tlic" for "the"),
//     and the one typographic modernisation shown (1824's long ſ as s). The
//     file itself is never corrected (live_priors LP1: the source is never
//     replaced by a reading).
// A quote whose file is absent is a typed skip in the test, and at runtime the
// card says the prior is not loaded rather than pretending it was read.
//
// No address here names a host: paths are corpus-relative, so this module
// stays inside constitution.test.mjs's II.13 host scan like every page file.

/** The priors corpus's own folders, so a path is written once. */
const GRC = "11-multi-language/greek-originals";
const NON = "11-multi-language/old-norse-originals";
const EN = "11-multi-language/translations-en";

const POETIC_EDDA = { prior: `${NON}/eddukvaedi.txt`, enPrior: `${EN}/bellows-1923-the-poetic-edda.txt`, tr: "Henry Adams Bellows, 1923" };
const PROSE_EDDA = { prior: `${NON}/snorra-edda.txt`, enPrior: `${EN}/anderson-1880-the-younger-edda.txt`, tr: "Rasmus B. Anderson, 1880" };
const SOLON_LIFE = { prior: `${GRC}/plutarch-life-of-solon.txt`, enPrior: `${EN}/stewart-long-1880-plutarchs-lives-volume-1.txt`, tr: "Aubrey Stewart & George Long, 1880" };
const MMK = { prior: "11-multi-language/sanskrit-originals/nagarjuna-mulamadhyamakakarika.txt", enPrior: `${EN}/stcherbatsky-1927-the-conception-of-buddhist-nirvana.txt`, tr: "Th. Stcherbatsky, 1927" };
const ASHBY = "05-academic-papers/open-access-books/ashby/ashby-1956-an-introduction-to-cybernetics.txt";

export const ARCHON_CANON = Object.freeze([
  {
    who: "Ashby", term: "requisite variety", gloss: "the regulator must be as various as what it regulates",
    module: { line: "only variety can absorb variety", cite: "ashby.js:5-6" },
    canon: {
      lang: "en", text: "only variety in R can force down the variety due to D; variety can destroy variety.",
      prior: ASHBY, loc: "An Introduction to Cybernetics, 11/7", date: "1956",
    },
  },
  {
    who: "Ashby", term: "the homeostat", gloss: "the machine that keeps itself stable",
    module: { line: "the one who never becomes an object of his own knowledge", cite: "ashby.js:6-7" },
    canon: {
      lang: "en", text: "It does not ask “what is this thing?” but “what does it do?”",
      prior: ASHBY, loc: "An Introduction to Cybernetics, 1/2", date: "1956",
    },
  },
  {
    who: "Aletheia", term: "ἀλήθεια", gloss: "truth as un-concealment",
    module: { line: "is a silent question answered with a decline, not a fabrication?", cite: "aletheia.js:22-23" },
    canon: {
      lang: "grc", text: "τοὺς δὲ ἀληθινούς, ἔφη, τίνας λέγεις; τοὺς τῆς ἀληθείας, ἦν δ᾽ ἐγώ, φιλοθεάμονας.",
      prior: `${GRC}/plato-republic.txt`,
      en: "He said: Who then are the true philosophers? Those, I said, who are lovers of the vision of truth.",
      enPrior: "01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt",
      loc: "Plato, Republic V, 475e", tr: "Benjamin Jowett, 1888",
    },
  },
  {
    who: "Clippy", term: "the paperclip", gloss: "the one who decides what is in context", gif: true,
    module: { line: "A figure that fails any is COLD — typed, refused, never silently bound.", cite: "clippy.js:12" },
    canon: null, noPrior: "the paperclip is this project's own handle; its canonical form is not a sentence but the assistant itself",
  },
  {
    who: "Kairos", term: "καιρός", gloss: "the opportune moment",
    module: { line: "A GAP IS NEVER A VERDICT", cite: "kairos.js:38" },
    canon: {
      lang: "grc", text: "Ὁ βίος βραχὺς, ἡ δὲ τέχνη μακρὴ, ὁ δὲ καιρὸς ὀξὺς, ἡ δὲ πεῖρα σφαλερὴ, ἡ δὲ κρίσις χαλεπή.",
      prior: `${GRC}/hippocrates-aphorisms.txt`,
      en: "Life is short, and the Art long; the occasion fleeting; experience fallacious, and judgment difficult.",
      enPrior: `${EN}/adams-1849-the-genuine-works-of-hippocrates-volume-2.txt`, enFix: [["tlic", "the"]],
      loc: "Hippocrates, Aphorisms I.1", tr: "Francis Adams, 1849",
    },
  },
  {
    who: "Kairos", term: "καιρός / χρόνος", gloss: "the right moment, as against the clock",
    module: { line: "the difference that makes a difference", cite: "kairos.js:1-2" },
    canon: {
      lang: "grc", text: "βαιὰ δ' ἐν μακροῖσι ποικίλλειν, / ἀκοὰ σοφοῖς: ὁ δὲ καιρὸς ὁμοίως / παντὸς ἔχει κορυφάν.",
      prior: `${GRC}/pindar-pythian-odes.txt`,
      en: "yet to be brief and skilful on long themes is a good hearing for bards: for fitness of times is in everything alike of chief import.",
      enPrior: `${EN}/myers-1874-the-extant-odes-of-pindar.txt`,
      loc: "Pindar, Pythian 9.78–80", tr: "Ernest Myers, 1874",
    },
  },
  {
    who: "Muninn", term: "memory", gloss: "Odin's other raven",
    module: { line: "FORGETTING IS OF THE PRESENT, NEVER DELETION", cite: "muninn.js:33" },
    canon: {
      lang: "non", text: "Hrafnar tveir sitja á öxlum honum ok segja í eyru honum öll tíðendi, þau er þeir sjá eða heyra. Þeir heita svá, Huginn ok Muninn.",
      en: "Two ravens sit on Odin’s shoulders, and bring to his ears all that they hear and see. Their names are Hugin and Munin.",
      loc: "Snorri Sturluson, Gylfaginning 38", ...PROSE_EDDA,
    },
  },
  {
    who: "Muninn", term: "memory", gloss: "the remembered account, brought back on cue",
    module: { line: "A RECALL THAT READ NOTHING CONVICTS NOTHING", cite: "muninn.js:42" },
    canon: {
      lang: "non", text: "Huginn ok Muninn / fljúga hverjan dag / Jörmungrund yfir; / óumk ek of Hugin, / at hann aftr né komi-t, / þó sjámk meir of Munin.",
      en: "O’er Mithgarth Hugin and Munin both / Each day set forth to fly; / For Hugin I fear lest he come not home, / But for Munin my care is more.",
      loc: "Grímnismál 20, the Poetic Edda", ...POETIC_EDDA,
    },
  },
  {
    who: "Huginn", term: "thought", gloss: "the raven who flies out and brings back what he saw",
    module: { line: "a preference dressed as a fact and nothing is a promise", cite: "huginn.js:25" },
    canon: {
      lang: "non", text: "Þá sendir hann í dagan at fljúga um heim allan, ok koma þeir aftr at dögurðarmáli. Þar af verðr hann margra tíðenda víss.",
      en: "At dawn he sends them out to fly over the whole world, and they come back at breakfast time. Thus he gets information about many things …",
      loc: "Snorri Sturluson, Gylfaginning 38", ...PROSE_EDDA,
    },
  },
  {
    who: "Huginn", term: "thought", gloss: "the raven Odin fears for",
    module: { line: "A wrong answer never hops — it is the caller's", cite: "huginn.js:34-35" },
    canon: {
      lang: "non", text: "Huginn ok Muninn / fljúga hverjan dag / Jörmungrund yfir; / óumk ek of Hugin, / at hann aftr né komi-t …",
      en: "O’er Mithgarth Hugin and Munin both / Each day set forth to fly; / For Hugin I fear lest he come not home …",
      loc: "Grímnismál 20, the Poetic Edda", ...POETIC_EDDA,
    },
  },
  {
    who: "Nāgārjuna", term: "prasaṅga", gloss: "a position refuted by its own consequences",
    module: { line: "A wrong filling collapses under examination; a grounded one holds.", cite: "nagarjuna.js:11-12" },
    canon: {
      lang: "sa-Latn", text: "na svato nāpi parato na dvābhyāṃ nāpy ahetutaḥ / utpannā jātu vidyante bhāvāḥ kva cana ke cana",
      en: "There absolutely are no things, / Nowhere and none, that arise (anew), / Neither out of themselves, nor out of non-self / Nor out of both, nor at random.",
      enFix: [["raudom", "random"]],
      loc: "Mūlamadhyamakakārikā 1.1", ...MMK,
    },
  },
  {
    who: "Nāgārjuna", term: "svabhāva", gloss: "own-being — what a thing would be by itself",
    module: { line: "a slot has NO own-being", cite: "nagarjuna.js:4" },
    canon: {
      lang: "sa-Latn", text: "na hi svabhāvo bhāvānāṃ pratyayādiṣu vidyate / avidyamāne svabhāve parabhāvo na vidyate",
      en: "In these conditions we can find / No self-existence of the entities. / Where self-existence is deficient, / Relational existence also lacks.",
      loc: "Mūlamadhyamakakārikā 1.3", ...MMK,
    },
  },
  {
    who: "Parmenides", term: "δόξα", gloss: "the way of seeming, refused outright",
    module: { line: "it may nominate, never decide", cite: "parmenides.js:11" },
    canon: {
      lang: "grc", text: "οὐ γὰρ μήποτε τοῦτο δαμῇ, φησίν, εἶναι μὴ ἐόντα· / ἀλλὰ σὺ τῆσδ' ἀφ' ὁδοῦ διζήμενος εἶργε νόημα.",
      prior: `${GRC}/plato-sophist.txt`,
      en: "Keep your mind from this way of enquiry, for never will you show that not-being is.",
      enPrior: `${EN}/jowett-plato-sophist.txt`,
      loc: "Parmenides, fr. B7, as Plato quotes it, Sophist 237a", tr: "Benjamin Jowett",
    },
  },
  {
    who: "Heimdall", term: "Bifröst", gloss: "the bridge he keeps",
    module: { line: "A dead connection is measured, re-zeroed, and recorded, never assumed.", cite: "heimdall-client.js:4-5" },
    canon: {
      lang: "non", text: "Hann er vörðr goða ok sitr þar við himins enda at gæta brúarinnar fyrir bergrisum. Hann þarf minna svefn en fugl.",
      en: "He is the ward of the gods, and sits at the end of heaven, guarding the bridge against the mountain-giants. He needs less sleep than a bird …",
      loc: "Snorri Sturluson, Gylfaginning 27", ...PROSE_EDDA,
    },
  },
  {
    who: "Solon", term: "the Athenian lawgiver", gloss: "asked what makes a city well governed",
    module: { line: "A dead watcher is the one failure the watcher cannot report itself.", cite: "solon.js:49" },
    canon: {
      lang: "grc", text: "ἐρωτηθεὶς γάρ, ὡς ἔοικεν, ἥτις οἰκεῖται κάλλιστα τῶν πόλεων, “ἐκείνη,” εἶπεν, “ἐν ᾗ τῶν ἀδικουμένων οὐχ ἧττον οἱ μὴ ἀδικούμενοι προβάλλονται καὶ κολάζουσι τοὺς ἀδικοῦντας.”",
      en: "Being asked, what he thought was the best managed city? \"That,\" he answered, \"in which those who are not wronged espouse the cause of those who are, and punish their oppressors.\"",
      loc: "Plutarch, Solon 18.5", ...SOLON_LIFE,
    },
  },
  {
    who: "Solon", term: "σεισάχθεια", gloss: "the shaking-off of burdens",
    module: { line: "EVA probes before it convicts; every verdict names its evidence.", cite: "solon.js:59" },
    canon: {
      lang: "grc", text: "ὅρους ἀνεῖλε πολλαχῆ πεπηγότας: / πρόσθεν δὲ δουλεύουσα, νῦν ἐλευθέρα",
      en: "Taken off the mortgages, which on the land were laid, / And made the country free, which was formerly enslaved.",
      loc: "Solon's verses, as Plutarch quotes them, Solon 15.5", ...SOLON_LIFE,
    },
  },
  {
    who: "Solon", term: "the lawgiver", gloss: "asked whether his laws were the best",
    module: { line: "The regulator is part of the regulated", cite: "solon.js:65" },
    canon: {
      lang: "grc", text: "ὅθεν ὕστερον ἐρωτηθεὶς εἰ τοὺς ἀρίστους Ἀθηναίοις νόμους ἔγραψεν, “ὧν ἄν,” ἔφη, “προσεδέξαντο τοὺς ἀρίστους.”",
      en: "Being afterwards asked whether he had composed the best possible laws for the Athenians, he answered, \"The best that they would endure.\"",
      loc: "Plutarch, Solon 15.2", ...SOLON_LIFE,
    },
  },
  {
    who: "Kelsen", term: "lex posterior", gloss: "the later law prevails",
    module: { line: "claims as norms in a hierarchy, conflicts resolved by precedence", cite: "solon.js:31-32" },
    canon: {
      lang: "la", text: "in duodecim tabulis legem esse ut quodcumque postremum populus iussisset, id ius ratumque esset",
      prior: "11-multi-language/latin-originals/livy-history.txt",
      en: "it was a law in the twelve tables, that whatever the people ordered last should be law and in force",
      enPrior: `${EN}/spillan-livy-history-of-rome-books-1-8.txt`,
      loc: "the Twelve Tables, as Livy reports them, 7.17.12", tr: "Daniel Spillan",
      // Said on the card, because the handle is his and the words are not.
      note: "Kelsen's own Reine Rechtslehre is still under copyright; this is the precedence rule his archon applies, in its oldest written form.",
    },
  },
  {
    who: "Ranke", term: "Quellenkritik", gloss: "the account judged by the document it stands on",
    module: { line: "Ranke: the agent that chases a claim to its primary source.", cite: "eoreader7 native/organs/ranke.js:1" },
    canon: {
      lang: "de", text: "Strenge Darstellung der Thatsache, wie bedingt und unschön sie auch sey, ist ohne Zweifel das oberste Gesetz.",
      prior: "11-multi-language/german-originals/ranke-geschichten-der-romanischen-und-germanischen-voelker-1824.txt",
      // The 1824 scan's OCR, corrected where it misread the Fraktur; then the
      // long ſ shown as s and the printed "oͤ" as "ö".
      fix: [["Darftellung", "Darſtellung"], ["der * IE Thatſache", "der Thatſache"], ["fie auch", "ſie auch"], ["oͤ", "ö"], ["ſ", "s"]],
      en: "A strict representation of facts, be it ever so narrow and unpoetical, is, beyond doubt, the first law.",
      enPrior: `${EN}/ashworth-1887-ranke-history-of-the-latin-and-teutonic-nations.txt`, enFix: [["donbt", "doubt"]],
      loc: "Ranke, preface to the first edition, 1824", tr: "Philip A. Ashworth, 1887",
    },
  },
  {
    who: "LaVar", term: "the grader", gloss: "what LaVar is, in the charter's own words",
    module: { line: "catches what the small reader missed", cite: "eoreader7 LAVAR.md:29" },
    canon: {
      lang: "en", text: "LaVar is not a better reader. LaVar is a grader, a reviser, and eventually a spot-checker, and the goal is for it to be needed less over time.",
      charter: "eoreader7/LAVAR.md", loc: "LaVar's charter",
    },
    noPrior: "LaVar is this project's own charter — the canonical text is LAVAR.md, not a work in the priors",
  },
  {
    who: "Wilson", term: "the swarm", gloss: "the evolutionary swarm of reading variants",
    module: { line: "Wilson may descend, never redefine", cite: "eoreader7 LAVAR.md:352" },
    canon: {
      lang: "en", text: "There is no final answer. The swarm is always asymptotically approaching the limit, never arriving.",
      charter: "eoreader7/LAVAR.md", loc: "Wilson's standing laws, 1",
    },
    noPrior: "the handle's own namesake is not stated in either repo; the charter's first law is the canonical text",
  },
]);

/**
 * The comparison's one fold, shared by the test and the runtime so they cannot
 * disagree about what "the same words" means: markdown emphasis dropped, a
 * verse divider (" / ", " | ") read as the line break it stands for, every run
 * of whitespace one space, an elision mark at either end dropped.
 */
export function matchFold(s) {
  return String(s ?? "")
    .normalize("NFC")
    .replace(/\*\*/g, "")
    .replace(/\s+[|/]\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^…\s*/, "")
    .replace(/\s*…$/, "");
}

/** A document's text with a quote's declared fixes applied, then folded. */
export function foldedWithFixes(docText, fixes = []) {
  let t = matchFold(docText);
  for (const [asPrinted, asShown] of fixes) t = t.split(matchFold(asPrinted)).join(asShown);
  return t;
}

/** Is `quote` in `docText`, allowing only the declared fold and fixes? */
export function containsQuote(docText, quote, fixes = []) {
  const q = matchFold(quote);
  return q.length > 0 && foldedWithFixes(docText, fixes).includes(q);
}

/** A stable identity for one card, so a refresh never shows the same one twice running. */
export const archonKey = (a) => `${a.who}|${a.canon?.loc ?? a.module.cite}|${a.module.cite}`;

/** One card, never the one shown last; `random` is injected so a test can pin it. */
export function pickArchon(pool = ARCHON_CANON, lastKey = null, random = Math.random) {
  const choices = pool.filter((a) => archonKey(a) !== lastKey);
  const from = choices.length ? choices : pool;
  return from[Math.floor(random() * from.length) % from.length];
}

/**
 * A verse divider is the file's line break: the card shows it as one, so a
 * stanza reads as a stanza. Returns the lines of a quote.
 */
export const quoteLines = (text) => String(text ?? "").split(/\s+\/\s+/);
