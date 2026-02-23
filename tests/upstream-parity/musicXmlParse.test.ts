import { parseMusicXml } from "../../src/core/io/MusicXml";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function testMusicXmlParseWithRestAndMultipleMeasures(): void {
  const source =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<score-partwise version="2.0">' +
    "<part>" +
    '<measure number="1">' +
    "<attributes>" +
    "<divisions>480</divisions>" +
    "<time><beats>4</beats><beat-type>4</beat-type></time>" +
    "</attributes>" +
    '<sound tempo="120"/>' +
    "<note><rest/><duration>240</duration></note>" +
    "<note><pitch><step>C</step><octave>4</octave></pitch><duration>240</duration><lyric><text>la</text></lyric></note>" +
    "</measure>" +
    '<measure number="2">' +
    '<sound tempo="150"/>' +
    "<note><pitch><step>D</step><octave>4</octave></pitch><duration>480</duration><lyric><text>li</text></lyric></note>" +
    "</measure>" +
    "</part>" +
    "</score-partwise>";

  const project = parseMusicXml(source, { defaultLyric: "あ" });

  assert(project.tracks.length === 1, "tracks count mismatch");
  assert(project.tracks[0].notes.length === 2, "notes count mismatch");
  assert(project.tracks[0].notes[0].tickOn === 240, "first note tickOn should skip rest");
  assert(project.tracks[0].notes[0].tickOff === 480, "first note tickOff mismatch");
  assert(project.tracks[0].notes[1].tickOn === 1920, "second note tickOn mismatch");
  assert(project.tracks[0].notes[1].tickOff === 2400, "second note tickOff mismatch");
  assert(project.tempos.length === 2, "tempo count mismatch");
  assert(project.tempos[0].bpm === 120, "tempo[0] mismatch");
  assert(project.tempos[1].bpm === 150, "tempo[1] mismatch");
  assert(project.timeSignatures.length >= 1, "timeSignature should exist");
}

function testMusicXmlParseTieAcrossNotes(): void {
  const source =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<score-partwise version="2.0">' +
    "<part>" +
    '<measure number="1">' +
    "<attributes>" +
    "<divisions>480</divisions>" +
    "<time><beats>4</beats><beat-type>4</beat-type></time>" +
    "</attributes>" +
    "<note>" +
    "<pitch><step>C</step><octave>4</octave></pitch>" +
    "<duration>240</duration>" +
    '<tie type="start"/>' +
    "<lyric><text>la</text></lyric>" +
    "</note>" +
    "<note>" +
    "<pitch><step>C</step><octave>4</octave></pitch>" +
    "<duration>240</duration>" +
    '<tie type="stop"/>' +
    "<lyric><text>la</text></lyric>" +
    "</note>" +
    "</measure>" +
    "</part>" +
    "</score-partwise>";

  const project = parseMusicXml(source, { defaultLyric: "あ" });
  assert(project.tracks[0].notes.length === 1, "tie notes should be merged into one");
  assert(project.tracks[0].notes[0].tickOn === 0, "merged note tickOn mismatch");
  assert(project.tracks[0].notes[0].tickOff === 480, "merged note tickOff mismatch");
}

testMusicXmlParseWithRestAndMultipleMeasures();
testMusicXmlParseTieAcrossNotes();
