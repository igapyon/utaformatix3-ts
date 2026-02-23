declare function require(name: string): any;

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

const fs = require("node:fs");

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

const fixture = JSON.parse(fs.readFileSync("tests/fixtures/process/core_process_01.json", "utf8")) as Record<string, any>;

function testEval(): void {
  const actual = fixture.eval.inputs.map((it: string) => evalFractionOrNull(it));
  assertEquals(fixture.eval.expected, actual, "eval fixture mismatch");
}

function testInterpolationLinear(): void {
  const actual = interpolateLinear(fixture.interpolationLinear.points, fixture.interpolationLinear.interval);
  assertEquals(fixture.interpolationLinear.expected, actual, "interpolation fixture mismatch");
}

function testResamplingDot(): void {
  const actual = dotResampled(fixture.resamplingDot.points, fixture.resamplingDot.interval);
  assertEquals(fixture.resamplingDot.expected, actual, "resampling fixture mismatch");
}

function testRdp(): void {
  const simplified = simplifyShape(fixture.rdp.line, fixture.rdp.epsilon);
  assertEquals(fixture.rdp.expected, simplified, "rdp simplify fixture mismatch");
  const simplifiedTo = simplifyShapeTo(fixture.rdp.to.line, fixture.rdp.to.maxPointCount);
  assert(simplifiedTo.length < fixture.rdp.to.maxPointCount, "rdp simplifyTo fixture mismatch");
}

function testProjectLengthAndZoom(): void {
  const project = createProject();
  const limited = lengthLimited(project, fixture.projectLengthAndZoom.maxLength);
  assert(
    limited.tracks[0].notes.length === fixture.projectLengthAndZoom.expect.limitedNoteCount,
    "lengthLimited note count fixture mismatch",
  );
  assert(
    limited.tempos.length === fixture.projectLengthAndZoom.expect.limitedTempoCount,
    "lengthLimited tempo count fixture mismatch",
  );
  assert(
    (limited.tracks[0].pitch?.data.length ?? -1) === fixture.projectLengthAndZoom.expect.limitedPitchCount,
    "lengthLimited pitch count fixture mismatch",
  );

  assert(needWarningZoom(project, 1.5), "needWarningZoom fixture mismatch");
  const zoomed = zoomProject(project, fixture.projectLengthAndZoom.factor);
  assert(
    zoomed.tracks[0].notes[1].tickOff === fixture.projectLengthAndZoom.expect.zoomedSecondNoteTickOff,
    "zoomed second note fixture mismatch",
  );
  assert(
    zoomed.tempos[1].bpm === fixture.projectLengthAndZoom.expect.zoomedSecondTempoBpm,
    "zoomed second tempo fixture mismatch",
  );
  assert(projectZoomFactorOptions.includes("3/2"), "project zoom factor options fixture mismatch");
}

function testTimeUnit(): void {
  const actual = milliSecFromTick(fixture.timeUnit.tick, fixture.timeUnit.bpm);
  assert(actual === fixture.timeUnit.expectedMilliSec, "time unit fixture mismatch");
}

testEval();
testInterpolationLinear();
testResamplingDot();
testRdp();
testProjectLengthAndZoom();
testTimeUnit();

