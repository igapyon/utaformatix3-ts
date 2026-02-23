import { Format } from "../../src/core/model/Format";
import { JapaneseLyricsType } from "../../src/core/model/JapaneseLyricsType";
import type { Project } from "../../src/core/model/Project";
import { assertProjectInvariants } from "../../src/core/model/assertProjectInvariants";

function createValidProject(): Project {
  return {
    format: Format.UfData,
    inputFiles: [],
    name: "test",
    tracks: [
      {
        id: 0,
        name: "track",
        notes: [{ id: 0, key: 60, lyric: "a", tickOn: 0, tickOff: 480 }],
      },
    ],
    timeSignatures: [{ measurePosition: 0, numerator: 4, denominator: 4 }],
    tempos: [{ tickPosition: 0, bpm: 120 }],
    ppq: 480,
    measurePrefix: 0,
    importWarnings: [],
    japaneseLyricsType: JapaneseLyricsType.Unknown,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(block: () => void, pattern: RegExp, message: string): void {
  try {
    block();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assert(pattern.test(text), `${message}: ${text}`);
    return;
  }
  throw new Error(`${message}: did not throw`);
}

function testAcceptsValidProject(): void {
  const project = createValidProject();
  assertProjectInvariants(project);
}

function testRejectsInvalidNoteRange(): void {
  const project = createValidProject();
  project.tracks[0].notes[0].tickOff = 0;
  assertThrows(
    () => assertProjectInvariants(project),
    /note\.tickOn must be < note\.tickOff/,
    "invalid note range",
  );
}

function testRejectsNonSafeIntegerTick(): void {
  const project = createValidProject();
  project.tracks[0].notes[0].tickOn = Number.MAX_SAFE_INTEGER + 1;
  assertThrows(() => assertProjectInvariants(project), /safe integer/, "non-safe integer tick");
}

testAcceptsValidProject();
testRejectsInvalidNoteRange();
testRejectsNonSafeIntegerTick();
