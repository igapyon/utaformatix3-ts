import { Format } from "../model/Format";
import { JapaneseLyricsType } from "../model/JapaneseLyricsType";
import { getNoteLength, type Note } from "../model/Note";
import type { Project } from "../model/Project";
import type { Tempo } from "../model/Tempo";
import { TickCounter } from "../model/TickCounter";
import type { TimeSignature } from "../model/TimeSignature";
import type { Track } from "../model/Track";
import type { ExportNotification } from "../model/ExportNotification";

const BPM_RATE = 100.0;
const MIN_MEASURE_OFFSET = 1;

export type VsqxSchemaVersion = "vsq3" | "vsq4";

export interface VsqxExtras {
  schemaVersion: VsqxSchemaVersion;
  originalXml: string;
  preservedAt: string;
}

type TagNames = {
  masterTrack: string;
  preMeasure: string;
  timeSig: string;
  posMes: string;
  nume: string;
  denomi: string;
  tempo: string;
  posTick: string;
  bpm: string;
  vsTrack: string;
  trackName: string;
  musicalPart: string;
  note: string;
  duration: string;
  noteNum: string;
  lyric: string;
  xSampa: string;
  trackNum: string;
  playTime: string;
};

const TAG_NAMES_VSQ4: TagNames = {
  masterTrack: "masterTrack",
  preMeasure: "preMeasure",
  timeSig: "timeSig",
  posMes: "m",
  nume: "nu",
  denomi: "de",
  tempo: "tempo",
  posTick: "t",
  bpm: "v",
  vsTrack: "vsTrack",
  trackName: "name",
  musicalPart: "vsPart",
  note: "note",
  duration: "dur",
  noteNum: "n",
  lyric: "y",
  xSampa: "p",
  trackNum: "tNo",
  playTime: "playTime",
};

const TAG_NAMES_VSQ3: TagNames = {
  masterTrack: "masterTrack",
  preMeasure: "preMeasure",
  timeSig: "timeSig",
  posMes: "posMes",
  nume: "nume",
  denomi: "denomi",
  tempo: "tempo",
  posTick: "posTick",
  bpm: "bpm",
  vsTrack: "vsTrack",
  trackName: "trackName",
  musicalPart: "musicalPart",
  note: "note",
  duration: "durTick",
  noteNum: "noteNum",
  lyric: "lyric",
  xSampa: "phnms",
  trackNum: "vsTrackNo",
  playTime: "playTime",
};

function detectVsqxSchemaVersion(text: string): VsqxSchemaVersion {
  if (text.includes('xmlns="http://www.yamaha.co.jp/vocaloid/schema/vsq4/"')) {
    return "vsq4";
  }
  return "vsq3";
}

function getTagNames(schemaVersion: VsqxSchemaVersion): TagNames {
  return schemaVersion === "vsq4" ? TAG_NAMES_VSQ4 : TAG_NAMES_VSQ3;
}

function firstElementByTagName(parent: Element, tagName: string): Element | null {
  const node = parent.getElementsByTagName(tagName).item(0);
  return node instanceof Element ? node : null;
}

function elementText(parent: Element, tagName: string): string | null {
  const node = firstElementByTagName(parent, tagName);
  return node?.textContent?.trim() ?? null;
}

function getTickPrefix(timeSignatures: TimeSignature[], measurePrefix: number): number {
  const counter = new TickCounter();
  for (const timeSignature of timeSignatures) {
    if (timeSignature.measurePosition >= measurePrefix) break;
    counter.goToTimeSignatureMeasure(timeSignature);
  }
  counter.goToMeasure(measurePrefix);
  return counter.tick;
}

function parseTimeSignatures(
  masterTrack: Element,
  tags: TagNames,
  measurePrefix: number,
): { tickPrefix: number; timeSignatures: TimeSignature[] } {
  const raw = Array.from(masterTrack.getElementsByTagName(tags.timeSig))
    .map((node) => {
      const measurePosition = Number(elementText(node, tags.posMes));
      const numerator = Number(elementText(node, tags.nume));
      const denominator = Number(elementText(node, tags.denomi));
      if (
        !Number.isFinite(measurePosition) ||
        !Number.isFinite(numerator) ||
        !Number.isFinite(denominator)
      ) {
        return null;
      }
      return { measurePosition, numerator, denominator };
    })
    .filter((it): it is TimeSignature => it !== null);

  const timeSignatures = raw.length > 0 ? raw : [{ measurePosition: 0, numerator: 4, denominator: 4 }];
  const tickPrefix = getTickPrefix(timeSignatures, measurePrefix);

  const adjusted = timeSignatures.map((it) => ({
    ...it,
    measurePosition: it.measurePosition - measurePrefix,
  }));
  const lastInsidePrefixIndex = adjusted.reduce((acc, it, index) => (it.measurePosition <= 0 ? index : acc), 0);
  const result = adjusted.slice(lastInsidePrefixIndex);
  if (result.length > 0) {
    result[0] = { ...result[0], measurePosition: 0 };
  }
  return { tickPrefix, timeSignatures: result };
}

function parseTempos(masterTrack: Element, tags: TagNames, tickPrefix: number): Tempo[] {
  const raw = Array.from(masterTrack.getElementsByTagName(tags.tempo))
    .map((node) => {
      const tickPosition = Number(elementText(node, tags.posTick));
      const bpm = Number(elementText(node, tags.bpm));
      if (!Number.isFinite(tickPosition) || !Number.isFinite(bpm)) return null;
      return { tickPosition: tickPosition - tickPrefix, bpm: bpm / BPM_RATE };
    })
    .filter((it): it is Tempo => it !== null);

  const tempos = raw.length > 0 ? raw : [{ tickPosition: 0, bpm: 120 }];
  const lastInsidePrefixIndex = tempos.reduce((acc, it, index) => (it.tickPosition <= 0 ? index : acc), 0);
  const result = tempos.slice(lastInsidePrefixIndex);
  if (result.length > 0) {
    result[0] = { ...result[0], tickPosition: 0 };
  }
  return result;
}

function parseTrack(
  trackNode: Element,
  id: number,
  tags: TagNames,
  tickPrefix: number,
  defaultLyric: string,
): Track {
  const name = elementText(trackNode, tags.trackName) ?? `Track ${id + 1}`;
  const partNodes = Array.from(trackNode.getElementsByTagName(tags.musicalPart));

  const notes: Note[] = partNodes
    .flatMap((partNode) => {
      const tickOffset = Number(elementText(partNode, tags.posTick) ?? "0") - tickPrefix;
      const noteNodes = Array.from(partNode.getElementsByTagName(tags.note));
      return noteNodes.map((noteNode) => ({ tickOffset, noteNode }));
    })
    .map(({ tickOffset, noteNode }, index) => {
      const key = Number(elementText(noteNode, tags.noteNum) ?? "0");
      const tickOnBase = Number(elementText(noteNode, tags.posTick) ?? "0");
      const length = Number(elementText(noteNode, tags.duration) ?? "0");
      const lyric = elementText(noteNode, tags.lyric) ?? defaultLyric;
      const phoneme = elementText(noteNode, tags.xSampa);
      return {
        id: index,
        key,
        lyric,
        tickOn: tickOnBase + tickOffset,
        tickOff: tickOnBase + tickOffset + length,
        phoneme: phoneme ?? undefined,
      };
    });

  return { id, name, notes, pitch: null };
}

export interface ParseVsqxOptions {
  defaultLyric?: string;
}

export function parseVsqx(text: string, options?: ParseVsqxOptions): Project {
  const parser = new DOMParser();
  const document = parser.parseFromString(text, "text/xml");
  const root = document.documentElement;
  if (!root) {
    throw new Error("VSQX root not found");
  }
  const schemaVersion = detectVsqxSchemaVersion(text);
  const tags = getTagNames(schemaVersion);
  const masterTrack = firstElementByTagName(root, tags.masterTrack);
  if (!masterTrack) {
    throw new Error("VSQX masterTrack not found");
  }

  const measurePrefix = Number(elementText(masterTrack, tags.preMeasure) ?? "0");
  const { tickPrefix, timeSignatures } = parseTimeSignatures(masterTrack, tags, measurePrefix);
  const tempos = parseTempos(masterTrack, tags, tickPrefix);
  const tracks = Array.from(root.getElementsByTagName(tags.vsTrack)).map((node, index) =>
    parseTrack(node, index, tags, tickPrefix, options?.defaultLyric ?? "あ"),
  );

  return {
    format: Format.Vsqx,
    inputFiles: [],
    name: "vsqx",
    tracks,
    timeSignatures,
    tempos,
    ppq: 480,
    measurePrefix,
    importWarnings: [],
    japaneseLyricsType: JapaneseLyricsType.Unknown,
    extras: {
      vsqx: {
        schemaVersion,
        originalXml: text,
        preservedAt: new Date().toISOString(),
      } satisfies VsqxExtras,
    },
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateTrackXml(track: Track, trackIndex: number, tickPrefix: number): string {
  if (track.notes.length === 0) {
    return `<vsTrack><tNo>${trackIndex}</tNo><name>${escapeXml(track.name)}</name></vsTrack>`;
  }
  const playTime = track.notes[track.notes.length - 1].tickOff;
  const notesXml = track.notes
    .map((note) => {
      const lyric = escapeXml(note.lyric);
      const phoneme = note.phoneme ? `<p>${escapeXml(note.phoneme)}</p>` : "";
      return [
        "<note>",
        `<t>${note.tickOn}</t>`,
        `<dur>${getNoteLength(note)}</dur>`,
        `<n>${note.key}</n>`,
        `<y>${lyric}</y>`,
        phoneme,
        "</note>",
      ].join("");
    })
    .join("");
  return [
    "<vsTrack>",
    `<tNo>${trackIndex}</tNo>`,
    `<name>${escapeXml(track.name)}</name>`,
    "<vsPart>",
    `<t>${tickPrefix}</t>`,
    `<playTime>${playTime}</playTime>`,
    notesXml,
    "</vsPart>",
    "</vsTrack>",
  ].join("");
}

export interface WriteVsqxResult {
  content: string;
  notifications: ExportNotification[];
  retainedExtras?: Record<string, unknown>;
}

export interface WriteVsqxOptions {
  retainOriginalExtras?: boolean;
}

export function writeVsqx(project: Project, options?: WriteVsqxOptions): WriteVsqxResult {
  const measurePrefix = Math.max(project.measurePrefix, MIN_MEASURE_OFFSET);
  const firstTimeSignature = project.timeSignatures[0] ?? { measurePosition: 0, numerator: 4, denominator: 4 };
  const ticksInMeasure = (1920 * firstTimeSignature.numerator) / firstTimeSignature.denominator;
  const tickPrefix = ticksInMeasure * measurePrefix;

  const timeSignatures = project.timeSignatures
    .map((timeSignature, index) => {
      const measure = index === 0 ? 0 : timeSignature.measurePosition + measurePrefix;
      return `<timeSig><m>${measure}</m><nu>${timeSignature.numerator}</nu><de>${timeSignature.denominator}</de></timeSig>`;
    })
    .join("");

  const tempos = project.tempos
    .map((tempo, index) => {
      const tick = index === 0 ? 0 : tempo.tickPosition + tickPrefix;
      return `<tempo><t>${tick}</t><v>${Math.trunc(tempo.bpm * BPM_RATE)}</v></tempo>`;
    })
    .join("");

  const tracksXml = project.tracks
    .map((track, index) => generateTrackXml(track, index, tickPrefix))
    .join("");

  const content = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<vsq4 xmlns="http://www.yamaha.co.jp/vocaloid/schema/vsq4/">',
    "<masterTrack>",
    `<preMeasure>${measurePrefix}</preMeasure>`,
    timeSignatures,
    tempos,
    "</masterTrack>",
    tracksXml,
    "</vsq4>",
  ].join("");

  const hasXSampaData = project.tracks.some((track) =>
    track.notes.some((note) => note.phoneme !== undefined && note.phoneme !== null),
  );
  const notifications: ExportNotification[] = hasXSampaData ? [] : [{ kind: "PhonemeResetRequiredV4" }];
  return {
    content,
    notifications,
    retainedExtras:
      options?.retainOriginalExtras === false ? undefined : ((project.extras ?? {}) as Record<string, unknown>),
  };
}
