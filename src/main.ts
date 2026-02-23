import { parseMusicXml, parseUfdata, parseVsqx, writeMusicXml, writeUfdata, writeVsqx } from "./lib";

type SupportedFormat = "vsqx" | "musicxml" | "ufdata";

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required DOM element is missing: ${id}`);
  }
  return element as T;
}

const status = requiredElement<HTMLElement>("app-status");
const error = requiredElement<HTMLElement>("error");
const inputFile = requiredElement<HTMLInputElement>("inputFile");
const downloadVsqxButton = requiredElement<HTMLButtonElement>("downloadVsqxButton");
const downloadMusicXmlButton = requiredElement<HTMLButtonElement>("downloadMusicXmlButton");
const downloadUfdataButton = requiredElement<HTMLButtonElement>("downloadUfdataButton");

status.textContent = "App loaded. Select file, then click output format button.";
let detectedInputFormat: SupportedFormat | null = null;

function detectInputFormatFromFileName(fileName: string): SupportedFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".vsqx")) {
    return "vsqx";
  }
  if (lower.endsWith(".musicxml")) {
    return "musicxml";
  }
  if (lower.endsWith(".ufdata") || lower.endsWith(".ufdata.json")) {
    return "ufdata";
  }
  if (lower.endsWith(".xml")) {
    return "musicxml";
  }
  if (lower.endsWith(".json")) {
    return "ufdata";
  }
  return null;
}

function parseProject(text: string, format: SupportedFormat) {
  if (format === "vsqx") {
    return parseVsqx(text, { defaultLyric: "あ" });
  }
  if (format === "musicxml") {
    return parseMusicXml(text, { defaultLyric: "あ" });
  }
  return parseUfdata(text);
}

function writeProject(project: ReturnType<typeof parseProject>, format: SupportedFormat) {
  if (format === "vsqx") {
    return { text: writeVsqx(project).content, ext: "vsqx" };
  }
  if (format === "musicxml") {
    return { text: writeMusicXml(project, { mode: "generate" }), ext: "musicxml" };
  }
  return { text: writeUfdata(project), ext: "ufdata.json" };
}

function downloadText(text: string, extension: string, baseName: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function convertAndDownload(outputFormat: SupportedFormat): Promise<void> {
  error.textContent = "";
  const file = inputFile.files?.[0];
  if (!file) {
    error.textContent = "Input file is not selected.";
    return;
  }
  const inputFormat = detectedInputFormat ?? detectInputFormatFromFileName(file.name);
  if (!inputFormat) {
    error.textContent = "Unknown input extension. Supported: .vsqx, .musicxml, .xml, .ufdata, .json";
    return;
  }

  try {
    const inputText = await file.text();
    const project = parseProject(inputText, inputFormat);
    const output = writeProject(project, outputFormat);
    const baseName = file.name.replace(/\.[^.]+$/, "") || "converted";
    downloadText(output.text, output.ext, baseName);
    status.textContent = `Converted and downloaded: ${inputFormat} -> ${outputFormat} / tracks=${project.tracks.length}`;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    error.textContent = `Convert failed:\n${message}`;
    status.textContent = "Convert failed.";
  }
}

inputFile.addEventListener("change", () => {
  const file = inputFile.files?.[0];
  if (!file) {
    return;
  }
  const detected = detectInputFormatFromFileName(file.name);
  if (detected) {
    detectedInputFormat = detected;
    status.textContent = `Input format auto-detected from extension: ${detected}`;
  } else {
    detectedInputFormat = null;
    status.textContent = "Unknown extension.";
  }
});

downloadVsqxButton.addEventListener("click", () => {
  void convertAndDownload("vsqx");
});
downloadMusicXmlButton.addEventListener("click", () => {
  void convertAndDownload("musicxml");
});
downloadUfdataButton.addEventListener("click", () => {
  void convertAndDownload("ufdata");
});
