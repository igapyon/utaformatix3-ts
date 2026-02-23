import { TickTimeTransformer } from "../../src/core/process/pitch/TickTimeTransformation";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(expected: T, actual: T, message: string): void {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`${message}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
  }
}

function testTickToSec(): void {
  const transformer = new TickTimeTransformer([
    { tickPosition: 0, bpm: 125.0 },
    { tickPosition: 10000, bpm: 250.0 },
    { tickPosition: 20000, bpm: 125.0 },
  ]);
  const ticks = [0, 5000, 10000, 15000, 20000, 30000];
  const actual = ticks.map((tick) => transformer.tickToSec(tick));
  const expected = [0.0, 5.0, 10.0, 12.5, 15.0, 25.0];
  assertEquals(expected, actual, "tickToSec mismatch");
}

function testSecToTick(): void {
  const transformer = new TickTimeTransformer([
    { tickPosition: 0, bpm: 125.0 },
    { tickPosition: 10000, bpm: 250.0 },
    { tickPosition: 20000, bpm: 125.0 },
  ]);
  const seconds = [0.0, 5.0, 10.0, 12.5, 15.0, 25.0];
  const actual = seconds.map((sec) => transformer.secToTick(sec));
  const expected = [0, 5000, 10000, 15000, 20000, 30000];
  assertEquals(expected, actual, "secToTick mismatch");
}

function testTickDistanceToSec(): void {
  const transformer = new TickTimeTransformer([
    { tickPosition: 0, bpm: 125.0 },
    { tickPosition: 10000, bpm: 250.0 },
    { tickPosition: 20000, bpm: 125.0 },
  ]);
  const actual = transformer.tickDistanceToSec(8000, 12000);
  const expected = 3.0;
  assert(actual === expected, `tickDistanceToSec mismatch: expected=${expected} actual=${actual}`);
}

function testNegativeInput(): void {
  const transformer = new TickTimeTransformer([
    { tickPosition: 0, bpm: 125.0 },
    { tickPosition: 10000, bpm: 250.0 },
    { tickPosition: 20000, bpm: 125.0 },
  ]);
  const second = -5.0;
  const tick = -5000;
  assert(transformer.secToTick(second) === tick, "negative secToTick mismatch");
  assert(transformer.tickToSec(tick) === second, "negative tickToSec mismatch");
}

testTickToSec();
testSecToTick();
testTickDistanceToSec();
testNegativeInput();
