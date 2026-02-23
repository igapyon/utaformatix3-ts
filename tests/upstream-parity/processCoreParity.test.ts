import { evalFractionOrNull } from "../../src/core/process/Eval";
import { interpolateLinear } from "../../src/core/process/Interpolation";
import { lengthLimited } from "../../src/core/process/LengthLimit";
import { needWarningZoom, projectZoomFactorOptions, zoomProject } from "../../src/core/process/ProjectZooming";
import { simplifyShape, simplifyShapeTo } from "../../src/core/process/RdpSimplification";
import { dotResampled } from "../../src/core/process/Resampling";
import { milliSecFromTick } from "../../src/core/process/pitch/TimeUnitConversion";
import { Format } from "../../src/core/model/Format";
import { JapaneseLyricsType } from "../../src/core/model/JapaneseLyricsType";
import type { Project } from "../../src/core/model/Project";

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

function createProject(): Project {
  return {
    format: Format.UfData,
    inputFiles: [],
    name: "p",
    tracks: [
      {
        id: 0,
        name: "t",
        notes: [
          { id: 0, tickOn: 0, tickOff: 240, key: 60, lyric: "a" },
          { id: 1, tickOn: 240, tickOff: 480, key: 62, lyric: "b" },
        ],
        pitch: {
          data: [
            [0, 0.0],
            [360, 1.0],
          ],
          isAbsolute: false,
        },
      },
    ],
    tempos: [
      { tickPosition: 0, bpm: 120 },
      { tickPosition: 480, bpm: 150 },
    ],
    timeSignatures: [
      { measurePosition: 0, numerator: 4, denominator: 4 },
      { measurePosition: 1, numerator: 3, denominator: 4 },
    ],
    ppq: 480,
    measurePrefix: 0,
    importWarnings: [],
    japaneseLyricsType: JapaneseLyricsType.Unknown,
  };
}

function testEvalFractionOrNull(): void {
  assert(evalFractionOrNull("2") === 2, "number parse mismatch");
  assert(evalFractionOrNull("5/3") === 5 / 3, "fraction parse mismatch");
  assert(evalFractionOrNull("x") === null, "invalid expression should be null");
}

function testInterpolateLinear(): void {
  const input: Array<[number, number]> = [
    [0, 0],
    [4, 4],
  ];
  const output = interpolateLinear(input, 2);
  assertEquals(
    [
      [0, 0],
      [2, 2],
      [4, 4],
    ],
    output,
    "interpolate linear mismatch",
  );
}

function testResampling(): void {
  const output = dotResampled(
    [
      [0, 1],
      [10, null],
      [20, 2],
    ],
    10,
  );
  assertEquals(
    [
      [0, 1],
      [10, null],
      [20, 2],
    ],
    output,
    "dot resampled mismatch",
  );
}

function testRdpSimplification(): void {
  const line: Array<[number, number]> = [
    [0, 0],
    [1, 0.01],
    [2, 0],
    [3, 0],
  ];
  const simplified = simplifyShape(line, 0.02);
  assertEquals(
    [
      [0, 0],
      [3, 0],
    ],
    simplified,
    "simplify shape mismatch",
  );
  const simplifiedTo = simplifyShapeTo(
    [
      [0, 0],
      [1, 1],
      [2, 0],
      [3, 1],
      [4, 0],
    ],
    4,
  );
  assert(simplifiedTo.length < 4, "simplifyShapeTo should return less than maxPointCount");
}

function testProjectLengthAndZoom(): void {
  const project = createProject();
  const limited = lengthLimited(project, 300);
  assert(limited.tracks[0].notes.length === 1, "length limited notes mismatch");
  assert(limited.tempos.length === 1, "length limited tempos mismatch");
  assert(limited.tracks[0].pitch?.data.length === 1, "length limited pitch mismatch");

  assert(needWarningZoom(project, 1.5), "needWarningZoom mismatch");
  const zoomed = zoomProject(project, 2);
  assert(zoomed.tracks[0].notes[1].tickOff === 960, "zoomed note tick mismatch");
  assert(zoomed.tempos[1].bpm === 300, "zoomed tempo bpm mismatch");
  assert(projectZoomFactorOptions.includes("3/2"), "project zoom factor options mismatch");
}

function testTimeUnitConversion(): void {
  const actual = milliSecFromTick(480, 120);
  assert(actual === 500, `milliSecFromTick mismatch: actual=${actual}`);
}

testEvalFractionOrNull();
testInterpolateLinear();
testResampling();
testRdpSimplification();
testProjectLengthAndZoom();
testTimeUnitConversion();

