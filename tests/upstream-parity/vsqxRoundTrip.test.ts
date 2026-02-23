import { parseUfdata, writeUfdata } from "../../src/core/io/UfData";
import { parseVsqx, writeVsqx } from "../../src/core/io/Vsqx";
import { compareArchiveEntries } from "../../src/core/util/VsqxArchiveComparison";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonicalize(child)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function testVsqxRoundTripAndSemanticComparison(): void {
  const sourceXml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<vsq4 xmlns="http://www.yamaha.co.jp/vocaloid/schema/vsq4/">' +
    "<masterTrack>" +
    "<preMeasure>1</preMeasure>" +
    "<timeSig><m>0</m><nu>4</nu><de>4</de></timeSig>" +
    "<tempo><t>0</t><v>12000</v></tempo>" +
    "</masterTrack>" +
    "<vsTrack>" +
    "<tNo>0</tNo>" +
    "<name>Track 1</name>" +
    "<vsPart>" +
    "<t>1920</t>" +
    "<playTime>480</playTime>" +
    "<note><t>0</t><dur>480</dur><n>60</n><y>la</y><p>l a</p></note>" +
    "</vsPart>" +
    "</vsTrack>" +
    "</vsq4>";

  const parsedProject = parseVsqx(sourceXml, { defaultLyric: "あ" });
  const generated = writeVsqx(parsedProject);
  const reparsedProject = parseVsqx(generated.content, { defaultLyric: "あ" });
  const regenerated = writeVsqx(reparsedProject);

  const archiveCompareResult = compareArchiveEntries(generated.content, regenerated.content, {
    canonicalizeXmlEntries: true,
  });
  assert(archiveCompareResult.ok, "vsqx archive/xml compare should pass");

  const parsedUfData = JSON.parse(writeUfdata(parsedProject));
  const reparsedUfData = JSON.parse(writeUfdata(reparsedProject));
  const parsedSemantic = canonicalize((parsedUfData as Record<string, any>).project);
  const reparsedSemantic = canonicalize((reparsedUfData as Record<string, any>).project);
  assert(
    JSON.stringify(parsedSemantic) === JSON.stringify(reparsedSemantic),
    "semantic comparison via ufdata should pass",
  );

  // Ensure write/read for UFDATA also remains valid in this layered comparison flow.
  const parsedBackFromUfData = parseUfdata(JSON.stringify(parsedUfData));
  assert(parsedBackFromUfData.tracks.length === parsedProject.tracks.length, "ufdata reparse track size mismatch");
}

testVsqxRoundTripAndSemanticComparison();
