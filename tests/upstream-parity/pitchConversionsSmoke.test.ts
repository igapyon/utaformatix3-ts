import type { Note } from "../../src/core/model/Note";
import type { Pitch } from "../../src/core/model/Pitch";
import type { Tempo } from "../../src/core/model/Tempo";
import { cevioTrackPitchDataLength, pitchFromCevioTrack } from "../../src/core/process/pitch/CevioPitchConversion";
import { generateForDv, pitchFromDvTrack } from "../../src/core/process/pitch/DeepVocalPitchConversion";
import {
  OpenUtauPitchShape,
  pitchFromUstxPart,
  toOpenUtauPitchData,
} from "../../src/core/process/pitch/OpenUtauPitchConversion";
import { appendPitchPointsForSvpOutput, processSvpInputPitchData } from "../../src/core/process/pitch/SynthVPitchConversion";
import { pitchFromUtauMode1Track, pitchToUtauMode1Track } from "../../src/core/process/pitch/UtauMode1PitchConversion";
import { pitchFromUtauMode2Track, pitchToUtauMode2Track } from "../../src/core/process/pitch/UtauMode2PitchConversion";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
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
    events: [{ index: 0, repeat: 10, value: 5.6 }],
  });
  assert(imported != null, "cevio import should return pitch");
  assert(cevioTrackPitchDataLength({ tickPrefix: 0, tempos, events: [{ index: 0, repeat: 1, value: 0 }] }) > 0, "cevio length should be positive");
}

function testDeepVocal(): void {
  const exported = generateForDv(pitch, notes);
  assert(exported != null, "dv export should return data");
  const imported = pitchFromDvTrack(
    [{ tickOffset: 0, data: [[0, 100], [10, 120]] }],
    notes.map((note) => ({ note, porHead: 0, porTail: 0, benLen: 0, benDep: 0, vibrato: [] })),
    tempos,
  );
  assert(imported != null, "dv import should return pitch");
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
  assert(Array.isArray(exported), "ustx export should return array");
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
  assert(appendPitchPointsForSvpOutput([[0, 0], [10, 0], [20, 1]]).length > 0, "svp append should return points");
}

function testUtauMode1And2(): void {
  const m1 = pitchToUtauMode1Track(pitch, notes);
  assert(m1 != null, "mode1 export should return data");
  const m1Back = pitchFromUtauMode1Track(m1, notes);
  assert(m1Back != null, "mode1 import should return pitch");

  const m2 = pitchToUtauMode2Track(pitch, notes, tempos);
  assert(m2 != null, "mode2 export should return data");
  const m2Back = pitchFromUtauMode2Track(m2, notes, tempos);
  assert(m2Back != null, "mode2 import should return pitch");
}

testCevio();
testDeepVocal();
testOpenUtau();
testSvp();
testUtauMode1And2();

