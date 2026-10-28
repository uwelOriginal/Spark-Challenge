import { test } from "node:test";
import assert from "node:assert/strict";
import { planParts } from "../src/lib/longaudio.ts";
import { mmss } from "../src/lib/transcript.ts";

test("parts cover the whole class with a 5 s overlap and no gaps", () => {
  const parts = planParts(3 * 3600 + 125, 600, 5); // 3 h 2 min 5 s
  assert.equal(parts.length, 19);
  assert.equal(parts[0].start, 0);
  for (let i = 1; i < parts.length; i++) {
    assert.equal(parts[i].keepFrom, i * 600);
    assert.equal(parts[i].start, i * 600 - 5); // starts 5 s early
    assert.ok(parts[i - 1].start + parts[i - 1].seconds >= parts[i].keepFrom); // no gap
  }
  const last = parts[parts.length - 1];
  assert.ok(Math.abs(last.start + last.seconds - (3 * 3600 + 125)) < 1e-9);
});

test("a 6-hour class is 36 parts", () => assert.equal(planParts(6 * 3600, 600, 5).length, 36));
test("a short file is one part", () => assert.equal(planParts(95, 600, 5).length, 1));

test("time marks switch to h:mm:ss after an hour", () => {
  assert.equal(mmss(192), "03:12");
  assert.equal(mmss(3930), "1:05:30");
});
