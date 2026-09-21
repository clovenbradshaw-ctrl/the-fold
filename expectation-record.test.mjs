import { test } from "node:test";
import assert from "node:assert";
import { expectationRecord, validate, expectationRecordLine, PFC, FAILURE_TYPE } from "./expectation-record.js";

test("record carries expected (desired/adequate + valence) and outcome", () => {
  const rec = expectationRecord({
    question: "My order is late.",
    expected: { desired: "resolve within 2 minutes", adequate: "give a real status", valence: ["may not understand me"] },
    outcome: { actual: "gave a real status", confirmationGap: "adequate met" },
    pfc: PFC.VOLUNTARY,
  });
  assert.ok(validate(rec));
  assert.equal(rec.expected.desired, "resolve within 2 minutes");
  assert.ok(rec.expected.valence.includes("may not understand me"));
});

test("pfc defaults to unknown and must be a valid enum", () => {
  const rec = expectationRecord({});
  assert.equal(rec.pfc, PFC.UNKNOWN);
  assert.throws(() => expectationRecord({ pfc: "maybe" }));
});

test("failure type/severity use the attribution taxonomy", () => {
  const rec = expectationRecord({ outcome: { failureType: FAILURE_TYPE.PROCESS, severity: "high" } });
  assert.ok(validate(rec));
  assert.throws(() => expectationRecord({ outcome: { failureType: "bogus" } }));
});

test("per/sit factors are whitelisted to the corpus keys", () => {
  const rec = expectationRecord({ factors: { personal: { trust: "low", noise: "x" }, situational: { task: "urgent" } } });
  assert.deepEqual(rec.factors.personal, { trust: "low" });
  assert.deepEqual(rec.factors.situational, { task: "urgent" });
});

test("line renders as a single JSONL row with the event name", () => {
  const line = expectationRecordLine(expectationRecord({ question: "q", pfc: PFC.FORCED }));
  const parsed = JSON.parse(line);
  assert.equal(parsed.event, "expectation-record");
  assert.equal(parsed.pfc, PFC.FORCED);
});

test("every mandatory shape field validates", () => {
  const rec = expectationRecord({});
  for (const k of ["schema", "question", "expected", "factors", "pfc", "outcome", "satisfaction", "at"]) {
    assert.ok(k in rec, `missing ${k}`);
  }
});