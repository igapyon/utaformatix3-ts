import { writeMusicXml } from "../../src/core/io/MusicXml";
import { Format } from "../../src/core/model/Format";
import { JapaneseLyricsType } from "../../src/core/model/JapaneseLyricsType";
import type { Project } from "../../src/core/model/Project";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function createProjectForTieAndTempoDirection(): Project {
  return {
    format: Format.MusicXml,
    inputFiles: [],
    name: "musicxml-generate-detail",
    tracks: [
      {
        id: 0,
        name: "Track 1",
        notes: [{ id: 0, key: 60, lyric: "la", tickOn: 0, tickOff: 960 }],
      },
    ],
    timeSignatures: [{ measurePosition: 0, numerator: 4, denominator: 4 }],
    tempos: [
      { tickPosition: 0, bpm: 120 },
      { tickPosition: 480, bpm: 150 },
    ],
    ppq: 480,
    measurePrefix: 0,
    importWarnings: [],
    japaneseLyricsType: JapaneseLyricsType.Unknown,
  };
}

function testMusicXmlGenerateIncludesDirectionAndTieNotation(): void {
  const xml = writeMusicXml(createProjectForTieAndTempoDirection(), { mode: "generate" });

  assert(xml.includes("<direction>"), "direction node missing");
  assert(xml.includes("<metronome>"), "metronome node missing");
  assert(xml.includes('<tie type="start"/>'), "tie start missing");
  assert(xml.includes('<tie type="stop"/>'), "tie stop missing");
  assert(xml.includes('<tied type="start"/>'), "notations tied start missing");
  assert(xml.includes('<tied type="stop"/>'), "notations tied stop missing");
  assert(xml.includes("<syllabic>begin</syllabic>"), "lyric syllabic begin missing");
  assert(xml.includes("<syllabic>end</syllabic>"), "lyric syllabic end missing");
}

testMusicXmlGenerateIncludesDirectionAndTieNotation();
