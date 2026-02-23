declare function require(name: string): any;

import type { Note } from "../../src/core/model/Note";
import type { Pitch } from "../../src/core/model/Pitch";
import type { Tempo } from "../../src/core/model/Tempo";
import { cevioTrackPitchDataLength, pitchFromCevioTrack } from "../../src/core/process/pitch/CevioPitchConversion";
import { generateForDv, pitchFromDvTrack } from "../../src/core/process/pitch/DeepVocalPitchConversion";
import {
  mergePitchFromUstxParts,
  pitchFromUstxPart,
  reduceRepeatedPitchPointsFromUstxTrack,
  toOpenUtauPitchData,
} from "../../src/core/process/pitch/OpenUtauPitchConversion";
import { appendPitchPointsForSvpOutput, processSvpInputPitchData } from "../../src/core/process/pitch/SynthVPitchConversion";
import { pitchFromUtauMode1Track, pitchToUtauMode1Track } from "../../src/core/process/pitch/UtauMode1PitchConversion";
import { pitchFromUtauMode2Track, pitchToUtauMode2Track } from "../../src/core/process/pitch/UtauMode2PitchConversion";

const fs = require("node:fs");
const path = require("node:path");

type Fixture = {
  kind: string;
  input: Record<string, any>;
  expected: Record<string, any>;
};

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function listFixturePaths(): string[] {
  const root = path.join("tests", "fixtures", "pitch");
  return fs
    .readdirSync(root)
    .filter((name: string) => name.endsWith(".json"))
    .sort()
    .map((name: string) => path.join(root, name));
}

function loadFixture(filePath: string): Fixture {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Fixture;
}

function testCevioFixture(fixture: Fixture): void {
  const imported = pitchFromCevioTrack({
    tickPrefix: fixture.input.tickPrefix,
    tempos: fixture.input.tempos as Tempo[],
    events: fixture.input.events,
  });
  assert(imported != null, "cevio import should return pitch");
  if (!imported) return;
  assert(imported.isAbsolute === fixture.expected.isAbsolute, "cevio isAbsolute mismatch");
  assert(imported.data.length === fixture.expected.pointCount, "cevio point count mismatch");
  assert(imported.data[0][0] === fixture.expected.firstTick, "cevio first tick mismatch");
  assert(cevioTrackPitchDataLength({
    tickPrefix: fixture.input.tickPrefix,
    tempos: fixture.input.tempos as Tempo[],
    events: fixture.input.events,
  }) > 0, "cevio length should be positive");
}

function testDvFixture(fixture: Fixture): void {
  const notes = fixture.input.notes as Note[];
  const pitch = fixture.input.pitch as Pitch;
  const tempos = fixture.input.tempos as Tempo[];
  const exported = generateForDv(pitch, notes);
  assert(exported != null, "dv export should return data");
  if (!exported) return;
  assert(exported.data.length >= fixture.expected.exportPointCountMin, "dv export point count mismatch");
  const imported = pitchFromDvTrack(
    fixture.input.segments,
    notes.map((note) => ({ note, porHead: 0, porTail: 0, benLen: 0, benDep: 0, vibrato: [] })),
    tempos,
  );
  assert(imported != null, "dv import should return pitch");
  if (!imported) return;
  assert(imported.isAbsolute === fixture.expected.importIsAbsolute, "dv import isAbsolute mismatch");
  assert(imported.data.length >= fixture.expected.importPointCountMin, "dv import point count mismatch");
}

function testUstxFixture(fixture: Fixture): void {
  const notes = fixture.input.notes as Note[];
  const tempos = fixture.input.tempos as Tempo[];
  const pitch = fixture.input.pitch as Pitch;
  const imported = pitchFromUstxPart(notes, fixture.input.part, tempos);
  assert(imported != null, "ustx import should return pitch");
  if (!imported) return;
  assert(imported.data.length >= fixture.expected.importPointCountMin, "ustx import point count mismatch");
  const exported = toOpenUtauPitchData(pitch, notes);
  assert(exported.length >= fixture.expected.exportPointCountMin, "ustx export point count mismatch");
  const merged = mergePitchFromUstxParts(
    { data: [[0, 0.1]], isAbsolute: false },
    { data: [[0, 0.2], [10, 0.1]], isAbsolute: false },
  );
  assert((merged?.data.length ?? 0) === fixture.expected.mergedPointCount, "ustx merged point count mismatch");
  const reduced = reduceRepeatedPitchPointsFromUstxTrack({
    data: [[0, 1], [5, 1], [10, 1], [15, 2]],
    isAbsolute: false,
  });
  assert((reduced?.data.length ?? 0) === fixture.expected.reducedPointCount, "ustx reduced point count mismatch");
}

function testSvpFixture(fixture: Fixture): void {
  const processed = processSvpInputPitchData(
    fixture.input.points,
    fixture.input.mode,
    fixture.input.notesWithVibrato,
    fixture.input.tempos,
    fixture.input.vibratoEnvPoints,
    fixture.input.vibratoEnvMode,
    fixture.input.vibratoDefaultParameters,
  );
  assert(processed.length >= fixture.expected.processedPointCountMin, "svp processed point count mismatch");
  const appended = appendPitchPointsForSvpOutput(fixture.input.appendInput);
  assert(appended.length >= fixture.expected.appendedPointCountMin, "svp appended point count mismatch");
  assert(appended[0][0] === fixture.expected.appendedFirstTick, "svp appended first tick mismatch");
}

function testMode1Fixture(fixture: Fixture): void {
  const notes = fixture.input.notes as Note[];
  const pitch = fixture.input.pitch as Pitch;
  const exported = pitchToUtauMode1Track(pitch, notes);
  assert(exported != null, "mode1 export should return data");
  if (!exported) return;
  assert(exported.notes.length === fixture.expected.exportNoteCount, "mode1 export note count mismatch");
  const imported = pitchFromUtauMode1Track(exported, notes);
  assert(imported != null, "mode1 import should return pitch");
  if (!imported) return;
  assert(imported.isAbsolute === fixture.expected.importIsAbsolute, "mode1 import isAbsolute mismatch");
  assert(imported.data.length >= fixture.expected.importPointCountMin, "mode1 import point count mismatch");
}

function testMode2Fixture(fixture: Fixture): void {
  const notes = fixture.input.notes as Note[];
  const pitch = fixture.input.pitch as Pitch;
  const tempos = fixture.input.tempos as Tempo[];
  const exported = pitchToUtauMode2Track(pitch, notes, tempos);
  assert(exported != null, "mode2 export should return data");
  if (!exported) return;
  assert(exported.notes.length === fixture.expected.exportNoteCount, "mode2 export note count mismatch");
  const imported = pitchFromUtauMode2Track(exported, notes, tempos);
  assert(imported != null, "mode2 import should return pitch");
  if (!imported) return;
  assert(imported.data.length >= fixture.expected.importPointCountMin, "mode2 import point count mismatch");
}

for (const filePath of listFixturePaths()) {
  const fixture = loadFixture(filePath);
  switch (fixture.kind) {
    case "cevio":
      testCevioFixture(fixture);
      break;
    case "dv":
      testDvFixture(fixture);
      break;
    case "ustx":
      testUstxFixture(fixture);
      break;
    case "svp":
      testSvpFixture(fixture);
      break;
    case "mode1":
      testMode1Fixture(fixture);
      break;
    case "mode2":
      testMode2Fixture(fixture);
      break;
    default:
      throw new Error(`Unknown fixture kind: ${fixture.kind} at ${filePath}`);
  }
}

