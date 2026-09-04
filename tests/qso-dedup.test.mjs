import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const fingerprintSource = source.match(/function qsoRecordFingerprint\(qso\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(fingerprintSource, "app.js must define qsoRecordFingerprint");
const { qsoRecordFingerprint } = vm.runInNewContext(`${fingerprintSource}; ({ qsoRecordFingerprint })`);
const azimuthalStart = source.indexOf("function degreesToRadians");
const azimuthalEnd = source.indexOf("function azimuthalGrid");
assert.ok(azimuthalStart >= 0 && azimuthalEnd > azimuthalStart, "app.js must define azimuthal projection helpers");
const azimuthalSource = source.slice(azimuthalStart,azimuthalEnd);
const azimuthal = vm.runInNewContext(`
  const AZIMUTHAL_RADIUS = 270;
  const EARTH_RADIUS_KM = 6371.0088;
  let stationLocation = {lat:39.9,lon:116.4};
  ${azimuthalSource}
  ({ azimuthalPointForLocation, azimuthalLandPath });
`);

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

test("azimuthal base map projects land around the station without invalid paths", () => {
  const center = azimuthal.azimuthalPointForLocation({lat:39.9,lon:116.4});
  assert.deepEqual({x:center.x,y:center.y},{x:300,y:300});
  const path = azimuthal.azimuthalLandPath({polygons:[[[[116.4,39.9],[120,40],[120,42],[116.4,39.9]]]]});
  assert.match(path,/^M/);
  assert.doesNotMatch(path,/NaN/);
});
