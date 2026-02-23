import { Format } from "../../src/core/model/Format";
import type { Note } from "../../src/core/model/Note";
import type { Track } from "../../src/core/model/Track";
import {
  LyricsReplacementFilterType,
  LyricsReplacementMatchType,
  LyricsReplacementRequest,
  LyricsReplacementRequestItem,
  replaceLyricsInTrack,
} from "../../src/core/process/lyrics/LyricsReplacement";

function assertEquals<T>(expected: T, actual: T, message: string): void {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`${message}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
  }
}

function testSimple(): void {
  const lyrics = ["as", "ad", "ff", "qqw"];
  const request = new LyricsReplacementRequest([
    new LyricsReplacementRequestItem(
      LyricsReplacementFilterType.Exact,
      "ff",
      LyricsReplacementMatchType.All,
      "",
      "cc",
    ),
  ]);
  const result = lyrics.map((it) => request.doReplace(it));
  const expected = ["as", "ad", "cc", "qqw"];
  assertEquals(expected, result, "simple replace mismatch");
}

function testRegex(): void {
  const lyrics = ["a_as_R", "ad", "f_af_R", "qqw", "f_af_Rr"];
  const request = new LyricsReplacementRequest([
    new LyricsReplacementRequestItem(
      LyricsReplacementFilterType.Regex,
      String.raw`\w+_\w+_R`,
      LyricsReplacementMatchType.Regex,
      String.raw`(\w+)_(\w+)_R`,
      "$1_$2_$1$2",
    ),
  ]);
  const result = lyrics.map((it) => request.doReplace(it));
  const expected = ["a_as_aas", "ad", "f_af_faf", "qqw", "f_af_Rr"];
  assertEquals(expected, result, "regex replace mismatch");
}

function testRegex2(): void {
  const lyrics = ["あ", "i あ", "e か"];
  const request = new LyricsReplacementRequest([
    new LyricsReplacementRequestItem(
      LyricsReplacementFilterType.None,
      "",
      LyricsReplacementMatchType.Regex,
      String.raw`^. (.+)$`,
      "$1",
    ),
  ]);
  const result = lyrics.map((it) => request.doReplace(it));
  const expected = ["あ", "あ", "か"];
  assertEquals(expected, result, "regex2 replace mismatch");
}

function createNote(id: number, lyric: string, tickOn: number, tickOff: number): Note {
  return {
    id,
    key: 60,
    lyric,
    tickOn,
    tickOff,
  };
}

function testRemoveNotes(): void {
  const track: Track = {
    id: 0,
    name: "",
    pitch: null,
    notes: [
      createNote(0, "a", 0, 1),
      createNote(1, "a R", 1, 2),
      createNote(2, "a", 2, 3),
      createNote(3, "R", 3, 4),
      createNote(4, "a", 4, 5),
    ],
  };
  const request = LyricsReplacementRequest.getPreset(Format.Ust, Format.Ust);
  if (request == null) {
    throw new Error("preset not found");
  }
  const result = replaceLyricsInTrack(track, request);
  const expected = [
    createNote(0, "a", 0, 1),
    createNote(1, "a", 2, 3),
    createNote(2, "a", 4, 5),
  ];
  assertEquals(expected, result.notes, "remove notes mismatch");
}

testSimple();
testRegex();
testRegex2();
testRemoveNotes();
