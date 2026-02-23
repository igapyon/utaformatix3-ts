import { parseMusicXml, writeMusicXml } from "../../src/core/io/MusicXml";
import { writeUfdata } from "../../src/core/io/UfData";
import { areCanonicalXmlEqual } from "../../src/core/util/XmlComparison";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, canonicalize(v)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function baseXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<score-partwise version="2.0">',
    "<part>",
    '<measure number="1">',
    "<attributes>",
    "<divisions>480</divisions>",
    "<time><beats>4</beats><beat-type>4</beat-type></time>",
    "</attributes>",
    '<sound tempo="120"/>',
    "<note>",
    "<pitch><step>C</step><octave>4</octave></pitch>",
    "<duration>480</duration>",
    "<lyric><syllabic>single</syllabic><text>la</text></lyric>",
    "</note>",
    "</measure>",
    "</part>",
    "</score-partwise>",
  ].join("");
}

function testMusicXmlGenerateComparison(): void {
  const parsed = parseMusicXml(baseXml(), { defaultLyric: "あ" });
  const generated = writeMusicXml(parsed, { mode: "generate" });
  const reparsed = parseMusicXml(generated, { defaultLyric: "あ" });

  assert(areCanonicalXmlEqual(generated, writeMusicXml(reparsed, { mode: "generate" })), "generate xml mismatch");

  const parsedUfDataProject = canonicalize((JSON.parse(writeUfdata(parsed)) as Record<string, any>).project);
  const reparsedUfDataProject = canonicalize((JSON.parse(writeUfdata(reparsed)) as Record<string, any>).project);
  assert(
    JSON.stringify(parsedUfDataProject) === JSON.stringify(reparsedUfDataProject),
    "generate semantic mismatch",
  );
}

function testMusicXmlPreserveNoOpDiff0(): void {
  const source = baseXml();
  const parsed = parseMusicXml(source, { defaultLyric: "あ" });
  const preserved = writeMusicXml(parsed, {
    mode: "preserve",
    originalText: source,
    noOp: true,
  });
  assert(preserved === source, "preserve no-op should be diff 0");
}

function testMusicXmlPreserveChangedComparison(): void {
  const source = baseXml();
  const parsed = parseMusicXml(source, { defaultLyric: "あ" });
  parsed.tracks[0].notes[0].lyric = "lu";

  const changed = writeMusicXml(parsed, {
    mode: "preserve",
    originalText: source,
    noOp: false,
  });

  assert(!areCanonicalXmlEqual(changed, source), "changed preserve xml should differ");

  const changedProject = parseMusicXml(changed, { defaultLyric: "あ" });
  const parsedUfDataProject = canonicalize((JSON.parse(writeUfdata(parsed)) as Record<string, any>).project);
  const changedUfDataProject = canonicalize(
    (JSON.parse(writeUfdata(changedProject)) as Record<string, any>).project,
  );
  assert(
    JSON.stringify(parsedUfDataProject) === JSON.stringify(changedUfDataProject),
    "changed preserve semantic mismatch",
  );
}

testMusicXmlGenerateComparison();
testMusicXmlPreserveNoOpDiff0();
testMusicXmlPreserveChangedComparison();
