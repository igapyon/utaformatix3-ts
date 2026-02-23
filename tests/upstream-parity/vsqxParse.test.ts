import { parseVsqx } from "../../src/core/io/Vsqx";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function testParseVsq3WithPrefixAndDefaultLyric(): void {
  const sourceXml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<vsq3 xmlns="http://www.yamaha.co.jp/vocaloid/schema/vsq3/">' +
    "<masterTrack>" +
    "<preMeasure>1</preMeasure>" +
    "<timeSig><posMes>0</posMes><nume>4</nume><denomi>4</denomi></timeSig>" +
    "<tempo><posTick>0</posTick><bpm>12000</bpm></tempo>" +
    "</masterTrack>" +
    "<vsTrack>" +
    "<vsTrackNo>0</vsTrackNo>" +
    "<trackName>Track 1</trackName>" +
    "<musicalPart>" +
    "<posTick>1920</posTick>" +
    "<playTime>960</playTime>" +
    "<note><posTick>0</posTick><durTick>480</durTick><noteNum>60</noteNum></note>" +
    "<note><posTick>480</posTick><durTick>480</durTick><noteNum>62</noteNum><lyric>li</lyric></note>" +
    "</musicalPart>" +
    "</vsTrack>" +
    "</vsq3>";

  const project = parseVsqx(sourceXml, { defaultLyric: "あ" });

  assert(project.measurePrefix === 1, "measurePrefix mismatch");
  assert(project.timeSignatures.length === 1, "timeSignatures count mismatch");
  assert(project.tempos.length === 1, "tempos count mismatch");
  assert(project.tracks.length === 1, "tracks count mismatch");
  assert(project.tracks[0].notes.length === 2, "notes count mismatch");
  assert(project.tracks[0].notes[0].tickOn === 0, "note[0] tickOn mismatch");
  assert(project.tracks[0].notes[0].tickOff === 480, "note[0] tickOff mismatch");
  assert(project.tracks[0].notes[0].lyric === "あ", "default lyric mismatch");
  assert(project.tracks[0].notes[1].tickOn === 480, "note[1] tickOn mismatch");
  assert(project.tracks[0].notes[1].lyric === "li", "explicit lyric mismatch");

  const extras = (project.extras as Record<string, any>).vsqx;
  assert(extras.schemaVersion === "vsq3", "schemaVersion mismatch");
}

testParseVsq3WithPrefixAndDefaultLyric();
