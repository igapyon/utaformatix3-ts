import type { Note } from "../../src/core/model/Note";
import {
  PhonemesMappingRequest,
  replacePhonemesInNote,
} from "../../src/core/process/phonemes/PhonemesMapping";

function assertEquals<T>(expected: T, actual: T, message: string): void {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`${message}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
  }
}

const request = new PhonemesMappingRequest(
  `
a=A
b=B
c a=C' A
c=C
d c a=DC' A
d c=DC
sil=
s=S
sh=SH
effff=EF
effff d=EF D
Q=a
OI=Q
`.trim(),
);

function createNote(phoneme: string): Note {
  return {
    id: 0,
    key: 60,
    lyric: "",
    tickOn: 0,
    tickOff: 480,
    phoneme,
  };
}

function testNoMatch(): void {
  const note = createNote("l o");
  const actual = replacePhonemesInNote(note, request).phoneme;
  assertEquals("l o", actual, "no match mismatch");
}

function testSingleMatch(): void {
  const note = createNote("b");
  const actual = replacePhonemesInNote(note, request).phoneme;
  assertEquals("B", actual, "single match mismatch");
}

function testSingleInMultipleMatch(): void {
  const note = createNote("l a m b n");
  const actual = replacePhonemesInNote(note, request).phoneme;
  assertEquals("l A m B n", actual, "single in multiple mismatch");
}

function testMultipleMatch(): void {
  const note = createNote("c a");
  const actual = replacePhonemesInNote(note, request).phoneme;
  assertEquals("C' A", actual, "multiple match mismatch");
}

function testMultipleInMultipleMatch(): void {
  const note = createNote("d c a m d c");
  const actual = replacePhonemesInNote(note, request).phoneme;
  assertEquals("DC' A m DC", actual, "multiple in multiple mismatch");
}

function testRepeatedMultipleMatch(): void {
  const note = createNote("d c a d c a");
  const actual = replacePhonemesInNote(note, request).phoneme;
  assertEquals("DC' A DC' A", actual, "repeated multiple mismatch");
}

function testMutedPhoneme(): void {
  const note = createNote("sil a");
  const actual = replacePhonemesInNote(note, request).phoneme;
  assertEquals("A", actual, "muted phoneme mismatch");
}

function testSortLength(): void {
  const note = createNote("sh");
  const actual = replacePhonemesInNote(note, request).phoneme;
  assertEquals("SH", actual, "sort length mismatch");
}

function testSortMultiLength(): void {
  const note = createNote("effff d c a");
  const actual = replacePhonemesInNote(note, request).phoneme;
  assertEquals("EF DC' A", actual, "sort multi length mismatch");
}

function testSameTextDifferentPhoneme(): void {
  const note = createNote("OI");
  const actual = replacePhonemesInNote(note, request).phoneme;
  assertEquals("Q", actual, "same text different phoneme mismatch");
}

testNoMatch();
testSingleMatch();
testSingleInMultipleMatch();
testMultipleMatch();
testMultipleInMultipleMatch();
testRepeatedMultipleMatch();
testMutedPhoneme();
testSortLength();
testSortMultiLength();
testSameTextDifferentPhoneme();
