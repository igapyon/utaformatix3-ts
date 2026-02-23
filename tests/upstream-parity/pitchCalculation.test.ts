import {
  appendPitchPointsForInterpolation,
  reduceRepeatedPitchPoints,
} from "../../src/core/process/pitch/PitchCalculation";

function assertEquals<T>(expected: T, actual: T, message: string): void {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`${message}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
  }
}

function testAppendPitchPointsForInterpolation(): void {
  const input: Array<[number, number]> = [
    [0, 0.0],
    [3, 6.0],
    [10, 20.0],
    [50, 100.0],
  ];
  const interval = 4;
  const expected: Array<[number, number]> = [
    [0, 0.0],
    [3, 6.0],
    [6, 6.0],
    [10, 20.0],
    [46, 20.0],
    [50, 100.0],
  ];
  const actual = appendPitchPointsForInterpolation(input, interval);
  assertEquals(expected, actual, "appendPitchPointsForInterpolation mismatch");
}

function testReduceRepeatedPitchPoints(): void {
  const input = [0, 0, 0, 1, 1, 1, 2, 2, 1, 3, 2, 3, 3, 3, 3, 3, 4, 5, 5, 5].map(
    (value, index) => [index, value] as [number, number],
  );
  const expected = [0, null, 0, 1, null, 1, 2, 2, 1, 3, 2, 3, null, null, null, 3, 4, 5, null, 5];
  const reduced = reduceRepeatedPitchPoints(input);
  const actual = input.map((point) => {
    const hit = reduced.find((it) => it[0] === point[0]);
    return hit == null ? null : hit[1];
  });
  assertEquals(expected, actual, "reduceRepeatedPitchPoints mismatch");
}

testAppendPitchPointsForInterpolation();
testReduceRepeatedPitchPoints();
