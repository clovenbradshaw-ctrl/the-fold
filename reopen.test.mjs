// reopen.test.mjs — the `/reopen` door: restore what the person last had
// open, from the record's own rows. The BECOMING below was written BEFORE
// any code (LEVELS.md's convention): it names the referent the door is
// becoming, runs, and its failure does not fail the suite until the day
// the flag comes off. Grep `BECOMING` across the tests for the whole map.
import { test } from "node:test";
import assert from "node:assert/strict";

test("BECOMING reopen — restores the last source, fold, or door result from the record's own rows, never from a transcript search", { todo: true }, async () => {
  // THE REFERENT. The record (record/explore-record.jsonl, append-only,
  // FOLD-CONSTITUTION I.5) already lands `source-open` / `read-start` /
  // `read-reused` for Explore and `term-run`/`term-act` (via:"chat") for
  // the doors. `/reopen` walks those rows BACKWARDS from the cursor and
  // restores the last open — a source by the PATH the row itself carries,
  // a fold by its N, a door result by re-rendering the row's own recorded
  // fields. Walls it must pass to be licensed (each its own test once
  // built, this todo is the referent of all of them):
  //   ADDRESS (P5.2): the address is the row's own field, carried forward —
  //     no regex over transcript text, no search, no model guess.
  //   HEARD: identical on a heard-only ledger (S2 rows from a transcribed
  //     source) as on a read one — the door reads event kind + address, never
  //     the source's text.
  //   TRUST: no model is asked what to reopen. (If one is ever consulted, it
  //     selects by INDEX from a mechanically gathered list.)
  //   NO SELF CO-SIGN: a row that read nothing (no address) or is authored
  //     self:model is not an open — readsNothing applies.
  //   NULL BEFORE NUMBER: any hit rate carries its REDEAL_SEED null.
  //   RESTORE, NEVER RE-ADMIT: nothing reopened is mutated; a reopened
  //     source is opened, not re-added; a door result is re-rendered, not
  //     re-run.
  const { lastOpened } = await import("./reopen.js");
  const rows = [
    { at: "1", event: "source-open", path: "pg345.txt", bytes: 10, modality: "text" },
    { at: "2", event: "term-run", runtime: "js", code: "1+1", ok: true, via: "chat" },
    { at: "3", event: "source-open", path: "pg2600.txt", bytes: 20, modality: "text" },
  ];
  const pick = lastOpened(rows);
  assert.equal(pick.kind, "source");
  assert.equal(pick.address, rows[2].path, "the address is the row's own field, carried");
  assert.equal(lastOpened(rows.slice(0, 2)).kind, "door", "a door result is a reopenable thing");
});
