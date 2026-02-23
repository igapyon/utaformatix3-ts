import { compareArchiveEntries } from "../../src/core/util/VsqxArchiveComparison";
import { areCanonicalXmlEqual } from "../../src/core/util/XmlComparison";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function testArchiveEntryNameComparison(): void {
  const expected = {
    "a.xml": "<root/>",
    "b.txt": "x",
  };
  const actual = {
    "b.txt": "x",
    "a.xml": "<root/>",
  };
  const result = compareArchiveEntries(expected, actual);
  assert(result.ok, "entry name comparison should pass");
}

function testArchiveEntryNameMismatch(): void {
  const expected = { "a.xml": "<root/>" };
  const actual = { "b.xml": "<root/>" };
  const result = compareArchiveEntries(expected, actual);
  assert(!result.ok, "entry name mismatch should fail");
  assert(result.missingEntries.includes("a.xml"), "missing entry should include a.xml");
  assert(result.extraEntries.includes("b.xml"), "extra entry should include b.xml");
}

function testXmlCanonicalizationAndElementOrder(): void {
  const xml1 = '<root b="2" a="1"> <child>v</child> </root>';
  const xml2 = '<root a="1" b="2"><child>v</child></root>';
  assert(areCanonicalXmlEqual(xml1, xml2), "attribute order/whitespace should be ignored");

  const xmlOrder1 = "<root><a/><b/></root>";
  const xmlOrder2 = "<root><b/><a/></root>";
  assert(!areCanonicalXmlEqual(xmlOrder1, xmlOrder2), "element order difference must not be ignored");
}

testArchiveEntryNameComparison();
testArchiveEntryNameMismatch();
testXmlCanonicalizationAndElementOrder();
