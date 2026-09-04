import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const fingerprintSource = source.match(/function qsoRecordFingerprint\(qso\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(fingerprintSource, "app.js must define qsoRecordFingerprint");
const { qsoRecordFingerprint } = vm.runInNewContext(`${fingerprintSource}; ({ qsoRecordFingerprint })`);

test("identical LoTW records from repeated batches are counted once", () => {
  const qso = { CALL:"JA1ABC", QSO_DATE:"20260904", TIME_ON:"120000", BAND:"20M", MODE:"FT8" };
  const unique = new Map([qso, {...qso}].map(row => [qsoRecordFingerprint(row),row]));
  assert.equal(unique.size, 1);
});

test("distinct LoTW records remain separate", () => {
  const first = { CALL:"JA1ABC", QSO_DATE:"20260904", TIME_ON:"120000", BAND:"20M", MODE:"FT8" };
  const second = { ...first, TIME_ON:"120100" };
  const unique = new Map([first,second].map(row => [qsoRecordFingerprint(row),row]));
  assert.equal(unique.size, 2);
});
