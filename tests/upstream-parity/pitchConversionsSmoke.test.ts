import type { Note } from "../../src/core/model/Note";
import type { Pitch } from "../../src/core/model/Pitch";
import type { Tempo } from "../../src/core/model/Tempo";
import { cevioTrackPitchDataLength, pitchFromCevioTrack } from "../../src/core/process/pitch/CevioPitchConversion";
import { generateForDv, pitchFromDvTrack } from "../../src/core/process/pitch/DeepVocalPitchConversion";
import {
  OpenUtauPitchShape,
  mergePitchFromUstxParts,
  pitchFromUstxPart,
  reduceRepeatedPitchPointsFromUstxTrack,
  toOpenUtauPitchData,
} from "../../src/core/process/pitch/OpenUtauPitchConversion";
import { appendPitchPointsForSvpOutput, processSvpInputPitchData } from "../../src/core/process/pitch/SynthVPitchConversion";
import { pitchFromUtauMode1Track, pitchToUtauMode1Track } from "../../src/core/process/pitch/UtauMode1PitchConversion";
import { pitchFromUtauMode2Track, pitchToUtauMode2Track } from "../../src/core/process/pitch/UtauMode2PitchConversion";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(expected: T, actual: T, message: string): void {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`${message}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
  }
}

const notes: Note[] = [
  { id: 0, key: 60, lyric: "a", tickOn: 0, tickOff: 240 },
  { id: 1, key: 62, lyric: "i", tickOn: 240, tickOff: 480 },
];
const tempos: Tempo[] = [{ tickPosition: 0, bpm: 120 }];
const pitch: Pitch = {
  data: [
    [0, 0],
    [120, 0.5],
    [240, 0],
  ],
  isAbsolute: false,
};

function testCevio(): void {
  const imported = pitchFromCevioTrack({
    tickPrefix: 0,
    tempos,
    events: [{ index: 0, repeat: 10, value: 5.6 }, { index: 10, repeat: 10, value: 5.7 }],
  });
  assert(imported != null, "cevio import should return pitch");
  if (!imported) throw new Error("cevio import null");
  assert(imported.data.length >= 2, "cevio import pitch point count mismatch");
  assert(cevioTrackPitchDataLength({ tickPrefix: 0, tempos, events: [{ index: 0, repeat: 1, value: 0 }] }) > 0, "cevio length should be positive");
}

function testDeepVocal(): void {
  const exported = generateForDv(pitch, notes);
  assert(exported != null, "dv export should return data");
  if (!exported) throw new Error("dv export null");
  assert(exported.data.length >= 2, "dv export point count mismatch");
  const imported = pitchFromDvTrack(
    [{ tickOffset: 0, data: [[0, 100], [10, 120]] }],
    notes.map((note) => ({ note, porHead: 0, porTail: 0, benLen: 0, benDep: 0, vibrato: [] })),
    tempos,
  );
  assert(imported != null, "dv import should return pitch");
  if (!imported) throw new Error("dv import null");
  assert(imported.isAbsolute === true, "dv import should be absolute");
}

function testOpenUtau(): void {
  const imported = pitchFromUstxPart(
    notes,
    {
      points: [],
      notes: notes.map(() => ({
        points: [
          { x: 0, y: 0, shape: OpenUtauPitchShape.EaseInOut },
          { x: 100, y: 10, shape: OpenUtauPitchShape.Linear },
        ],
        vibrato: { length: 0, period: 175, depth: 0, fadeIn: 0, fadeOut: 0, phaseShift: 0, shift: 0 },
      })),
    },
    tempos,
  );
  assert(imported != null, "ustx import should return pitch");
  const exported = toOpenUtauPitchData(pitch, notes);
  assert(exported.length > 0, "ustx export should return non-empty array");
  const merged = mergePitchFromUstxParts(
    { data: [[0, 0.1]], isAbsolute: false },
    { data: [[0, 0.2], [10, 0.1]], isAbsolute: false },
  );
  assertEquals([[0, 0.30000000000000004], [10, 0.1]], merged?.data, "ustx merge mismatch");
  const reduced = reduceRepeatedPitchPointsFromUstxTrack({
    data: [[0, 1], [5, 1], [10, 1], [15, 2]],
    isAbsolute: false,
  });
  assertEquals([[0, 1], [10, 1], [15, 2]], reduced?.data, "ustx reduce repeated mismatch");
}

function testSvp(): void {
  const processed = processSvpInputPitchData(
    [[0, 0], [120, 1]],
    "linear",
    [{ noteStartTick: 0, noteLengthTick: 240, vibratoStart: null, easeInLength: null, easeOutLength: null, depth: null, frequency: null, phase: null }],
    tempos,
    [],
    "linear",
    null,
  );
  assert(processed.length > 0, "svp process should return points");
  const appended = appendPitchPointsForSvpOutput([[0, 0], [10, 0], [20, 1]]);
  assert(appended.length > 0, "svp append should return points");
  assert(appended[0][0] === 0, "svp append start tick mismatch");
}

function testUtauMode1And2(): void {
  const m1 = pitchToUtauMode1Track(pitch, notes);
  assert(m1 != null, "mode1 export should return data");
  if (!m1) throw new Error("mode1 export null");
  assert(m1.notes.length === notes.length, "mode1 exported note count mismatch");
  const m1Back = pitchFromUtauMode1Track(m1, notes);
  assert(m1Back != null, "mode1 import should return pitch");
  if (!m1Back) throw new Error("mode1 import null");
  assert(m1Back.isAbsolute === true, "mode1 import should be absolute");

  const m2 = pitchToUtauMode2Track(pitch, notes, tempos);
  assert(m2 != null, "mode2 export should return data");
  if (!m2) throw new Error("mode2 export null");
  assert(m2.notes.length === notes.length, "mode2 exported note count mismatch");
  const m2Back = pitchFromUtauMode2Track(m2, notes, tempos);
  assert(m2Back != null, "mode2 import should return pitch");
  if (!m2Back) throw new Error("mode2 import null");
  assert(m2Back.data.length > 0, "mode2 import pitch point count mismatch");
}

testCevio();
testDeepVocal();
testOpenUtau();
testSvp();
testUtauMode1And2();
