import assert from "node:assert/strict";
import test from "node:test";
import { formatTimer, timerSeconds } from "../src/timer";

test("reading timer uses wall clock across suspension and restoration", () => {
  const serialized = JSON.stringify({ elapsedMs: 45000, runningSince: 100000 });
  const restored = JSON.parse(serialized);
  assert.equal(timerSeconds(restored, 175000), 120);
});
test("paused timer excludes all elapsed wall clock time", () => {
  assert.equal(
    timerSeconds({ elapsedMs: 65750, runningSince: null }, 999999),
    65,
  );
});
test("backwards wall clock never yields negative reading time", () => {
  assert.equal(
    timerSeconds({ elapsedMs: 10000, runningSince: 100000 }, 90000),
    10,
  );
  assert.equal(timerSeconds({ elapsedMs: -1000, runningSince: null }), 0);
});
test("timer keeps hours readable for long sessions", () => {
  assert.equal(formatTimer(3661), "01:01:01");
  assert.equal(formatTimer(0), "00:00:00");
  assert.equal(formatTimer(-5), "00:00:00");
});
