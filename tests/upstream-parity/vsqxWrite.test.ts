import { Format } from "../../src/core/model/Format";
import { JapaneseLyricsType } from "../../src/core/model/JapaneseLyricsType";
import type { Project } from "../../src/core/model/Project";
import { writeVsqx } from "../../src/core/io/Vsqx";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createProject(): Project {
  return {
    format: Format.Vsqx,
    inputFiles: [],
    name: "vsqx-test",
    tracks: [
      {
        id: 0,
        name: "Track 1",
        notes: [{ id: 0, key: 60, lyric: "la", tickOn: 0, tickOff: 480 }],
        pitch: {
          data: [
            [0, 3.0],
            [120, 2.5],
          ],
          isAbsolute: false,
        },
      },
    ],
    timeSignatures: [{ measurePosition: 0, numerator: 4, denominator: 4 }],
    tempos: [{ tickPosition: 0, bpm: 120 }],
    ppq: 480,
    measurePrefix: 0,
    importWarnings: [],
    japaneseLyricsType: JapaneseLyricsType.Unknown,
    extras: {
      vsqx: {
        schemaVersion: "vsq4",
        originalXml: "<vsq4 />",
        preservedAt: "2026-02-23T00:00:00.000Z",
      },
    },
  };
}

function testVsqxWriteMvp(): void {
  const result = writeVsqx(createProject());
  assert(result.content.includes("<vsq4 "), "vsq4 root missing");
  assert(result.content.includes("<masterTrack>"), "masterTrack missing");
  assert(result.content.includes("<vender><![CDATA[Yamaha corporation]]></vender>"), "vender missing");
  assert(result.content.includes("<version><![CDATA[4.0.0.3]]></version>"), "version missing");
  assert(result.content.includes("<mixer>"), "mixer missing");
  assert(result.content.includes("<vsUnit>"), "vsUnit missing");
  assert(result.content.includes("<vVoiceTable>"), "vVoiceTable missing");
  assert(result.content.includes("<vsTrack>"), "vsTrack missing");
  assert(result.content.includes("<singer>"), "singer missing");
  assert(result.content.includes('<cc><t>0</t><v id="P">'), "pitch PIT control missing");
  assert(result.content.includes('<cc><t>0</t><v id="S">'), "pitch PBS control missing");
  assert(result.content.includes("<monoTrack>"), "monoTrack missing");
  assert(result.content.includes("<stTrack>"), "stTrack missing");
  assert(result.content.includes("<aux>"), "aux missing");
  assert(result.content.includes("<note>"), "note missing");
  assert(result.notifications.some((it) => it.kind === "PhonemeResetRequiredV4"), "notification missing");
  assert(result.retainedExtras !== undefined, "retainedExtras missing");
  const vsqxExtras = (result.retainedExtras as Record<string, any>).vsqx;
  assert(vsqxExtras?.schemaVersion === "vsq4", "retained extras schemaVersion mismatch");
}

testVsqxWriteMvp();
