import { Format } from "../../src/core/model/Format";
import { JapaneseLyricsType } from "../../src/core/model/JapaneseLyricsType";
import type { Project } from "../../src/core/model/Project";
import { analyseJapaneseLyricsTypeForProject } from "../../src/core/process/lyrics/japanese/Analysis";
import { cleanupJapaneseLyrics } from "../../src/core/process/lyrics/japanese/Cleanup";
import { convertJapaneseLyrics } from "../../src/core/process/lyrics/japanese/Conversion";
import { mapLyrics, LyricsMappingRequest } from "../../src/core/process/lyrics/LyricsMapping";
import { convertChineseLyricsToPinyin } from "../../src/core/process/lyrics/chinese/Conversion";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function baseProject(): Project {
  return {
    format: Format.UfData,
    inputFiles: [],
    name: "p",
    tracks: [
      {
        id: 0,
        name: "t",
        notes: [
          { id: 0, key: 60, lyric: "a", tickOn: 0, tickOff: 120 },
          { id: 1, key: 61, lyric: "i", tickOn: 120, tickOff: 240 },
        ],
      },
    ],
    timeSignatures: [{ measurePosition: 0, numerator: 4, denominator: 4 }],
    tempos: [{ tickPosition: 0, bpm: 120 }],
    ppq: 480,
    measurePrefix: 0,
    importWarnings: [],
    japaneseLyricsType: JapaneseLyricsType.RomajiCv,
  };
}

function testLyricsMapping(): void {
  const request = new LyricsMappingRequest("a=la\ni=li", false);
  const mapped = mapLyrics(baseProject(), request);
  assert(mapped.tracks[0].notes[0].lyric === "la", "lyrics mapping first note mismatch");
  assert(mapped.tracks[0].notes[1].lyric === "li", "lyrics mapping second note mismatch");
}

function testLyricsMappingToPhoneme(): void {
  const request = new LyricsMappingRequest("a=AA", true);
  const mapped = mapLyrics(baseProject(), request);
  assert(mapped.tracks[0].notes[0].phoneme === "AA", "phoneme mapping mismatch");
}

function testJapaneseAnalysisAndCleanup(): void {
  const project = {
    ...baseProject(),
    tracks: [
      {
        id: 0,
        name: "t",
        notes: [
          { id: 0, key: 60, lyric: "a", tickOn: 0, tickOff: 120 },
          { id: 1, key: 61, lyric: "i", tickOn: 120, tickOff: 240 },
        ],
      },
    ],
  };
  const type = analyseJapaneseLyricsTypeForProject(project);
  assert(type === JapaneseLyricsType.RomajiCv, "analyse Japanese lyrics type mismatch");

  const cleanedTracks = cleanupJapaneseLyrics(project.tracks, JapaneseLyricsType.RomajiCv);
  assert(cleanedTracks[0].notes[0].lyric === "a", "cleanup Japanese lyrics mismatch");
}

function testJapaneseConversion(): void {
  const project = baseProject();
  const converted = convertJapaneseLyrics(project, JapaneseLyricsType.KanaCv, Format.Ustx);
  assert(converted.tracks[0].notes[0].lyric === "あ", "convert Japanese lyrics a->kana mismatch");
}

function testChineseConversion(): void {
  const project = {
    ...baseProject(),
    tracks: [{ ...baseProject().tracks[0], notes: [{ id: 0, key: 60, lyric: "你", tickOn: 0, tickOff: 120 }] }],
  };
  const converted = convertChineseLyricsToPinyin(project, "你,ni");
  assert(converted.tracks[0].notes[0].lyric === "ni", "convert Chinese lyrics mismatch");
}

testLyricsMapping();
testLyricsMappingToPhoneme();
testJapaneseAnalysisAndCleanup();
testJapaneseConversion();
testChineseConversion();
