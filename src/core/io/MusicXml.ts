import { Format } from "../model/Format";
import { JapaneseLyricsType } from "../model/JapaneseLyricsType";
import { getNoteLength, type Note } from "../model/Note";
import type { Project } from "../model/Project";
import type { Tempo } from "../model/Tempo";
import type { TimeSignature } from "../model/TimeSignature";
import type { Track } from "../model/Track";

export const MUSIC_XML_VERSION = "2.0";
const TICKS_IN_BEAT = 480;
const KEY_IN_OCTAVE = 12;
const DEFAULT_KEY = 60;

function decodeXml(value: string): string {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractFirstTagValue(source: string, tag: string): string | null {
  const match = source.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : null;
}

function extractTagBlocks(source: string, tag: string): string[] {
  return Array.from(source.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g"))).map((match) =>
    match[1],
  );
}

function parsePitchToKey(noteBlock: string): number {
  const pitchBlock = extractFirstTagValue(noteBlock, "pitch");
  if (!pitchBlock) return DEFAULT_KEY;
  const step = extractFirstTagValue(pitchBlock, "step");
  const alter = Number(extractFirstTagValue(pitchBlock, "alter") ?? "0");
  const octave = Number(extractFirstTagValue(pitchBlock, "octave") ?? "4");
  const stepValue =
    step === "C"
      ? 0
      : step === "D"
        ? 2
        : step === "E"
          ? 4
          : step === "F"
            ? 5
            : step === "G"
              ? 7
              : step === "A"
                ? 9
                : step === "B"
                  ? 11
                  : 0;
  return (octave + 1) * KEY_IN_OCTAVE + stepValue + alter;
}

function parseKeyToPitch(key: number): { step: string; alter?: number; octave: number } {
  const octave = Math.floor(key / KEY_IN_OCTAVE) - 1;
  const index = ((key % KEY_IN_OCTAVE) + KEY_IN_OCTAVE) % KEY_IN_OCTAVE;
  switch (index) {
    case 0:
      return { step: "C", octave };
    case 1:
      return { step: "C", alter: 1, octave };
    case 2:
      return { step: "D", octave };
    case 3:
      return { step: "D", alter: 1, octave };
    case 4:
      return { step: "E", octave };
    case 5:
      return { step: "F", octave };
    case 6:
      return { step: "F", alter: 1, octave };
    case 7:
      return { step: "G", octave };
    case 8:
      return { step: "G", alter: 1, octave };
    case 9:
      return { step: "A", octave };
    case 10:
      return { step: "A", alter: 1, octave };
    default:
      return { step: "B", octave };
  }
}

function parseTrackFromPart(partBlock: string, trackIndex: number, defaultLyric: string): Track {
  const measureBlocks = extractTagBlocks(partBlock, "measure");
  const firstMeasure = measureBlocks[0] ?? "";
  const divisions =
    Number(extractFirstTagValue(firstMeasure, "divisions") ?? extractFirstTagValue(partBlock, "divisions") ?? "480") ||
    480;
  const importTickRate = TICKS_IN_BEAT / divisions;
  let tickPosition = 0;
  const notes: Note[] = [];

  for (const measureBlock of measureBlocks) {
    const noteBlocks = extractTagBlocks(measureBlock, "note");
    for (const noteBlock of noteBlocks) {
      if (noteBlock.includes("<grace")) continue;
      const durationRaw = Number(extractFirstTagValue(noteBlock, "duration") ?? "0");
      const duration = Math.round(durationRaw * importTickRate);
      const isRest = /<rest(\s|\/|>)/.test(noteBlock);
      if (isRest) {
        tickPosition += duration;
        continue;
      }
      const key = parsePitchToKey(noteBlock);
      const lyric =
        decodeXml(extractFirstTagValue(extractFirstTagValue(noteBlock, "lyric") ?? "", "text") ?? defaultLyric);
      const note: Note = {
        id: notes.length,
        key,
        lyric,
        tickOn: tickPosition,
        tickOff: tickPosition + duration,
      };
      notes.push(note);
      tickPosition += duration;
    }
  }
  return {
    id: trackIndex,
    name: `Track ${trackIndex + 1}`,
    notes,
  };
}

function parseMasterTrack(partBlock: string): {
  timeSignatures: TimeSignature[];
  tempos: Tempo[];
} {
  const measureBlocks = extractTagBlocks(partBlock, "measure");
  const divisions =
    Number(
      extractFirstTagValue(measureBlocks[0] ?? "", "divisions") ??
        extractFirstTagValue(partBlock, "divisions") ??
        "480",
    ) || 480;
  const importTickRate = TICKS_IN_BEAT / divisions;
  const timeSignatures: TimeSignature[] = [];
  const tempos: Tempo[] = [];
  let tick = 0;
  for (let i = 0; i < measureBlocks.length; i += 1) {
    const measureBlock = measureBlocks[i];
    const beats = extractFirstTagValue(extractFirstTagValue(measureBlock, "time") ?? "", "beats");
    const beatType = extractFirstTagValue(extractFirstTagValue(measureBlock, "time") ?? "", "beat-type");
    if (beats && beatType) {
      timeSignatures.push({
        measurePosition: i,
        numerator: Number(beats),
        denominator: Number(beatType),
      });
    }
    const soundTempoMatch = measureBlock.match(/<sound[^>]*tempo="([^"]+)"/);
    if (soundTempoMatch) {
      tempos.push({
        tickPosition: tick,
        bpm: Number(soundTempoMatch[1]),
      });
    }
    const noteBlocks = extractTagBlocks(measureBlock, "note");
    let measureDuration = 0;
    for (const noteBlock of noteBlocks) {
      const durationRaw = Number(extractFirstTagValue(noteBlock, "duration") ?? "0");
      measureDuration += Math.round(durationRaw * importTickRate);
    }
    tick += measureDuration;
  }
  return {
    timeSignatures: timeSignatures.length > 0 ? timeSignatures : [{ measurePosition: 0, numerator: 4, denominator: 4 }],
    tempos: tempos.length > 0 ? tempos : [{ tickPosition: 0, bpm: 120 }],
  };
}

export interface ParseMusicXmlOptions {
  defaultLyric?: string;
}

export function parseMusicXml(text: string, options?: ParseMusicXmlOptions): Project {
  const partBlocks = extractTagBlocks(text, "part");
  if (partBlocks.length === 0) {
    throw new Error("MusicXML part not found");
  }
  const master = parseMasterTrack(partBlocks[0]);
  const tracks = partBlocks.map((partBlock, index) =>
    parseTrackFromPart(partBlock, index, options?.defaultLyric ?? "あ"),
  );
  return {
    format: Format.MusicXml,
    inputFiles: [],
    name: "musicxml",
    tracks,
    timeSignatures: master.timeSignatures,
    tempos: master.tempos,
    ppq: 480,
    measurePrefix: 0,
    importWarnings: [],
    japaneseLyricsType: JapaneseLyricsType.Unknown,
    extras: {
      musicxml: {
        originalXml: text,
        preservedAt: new Date().toISOString(),
      },
    },
  };
}

function generateNoteXml(note: Note): string {
  const pitch = parseKeyToPitch(note.key);
  const lyric = escapeXml(note.lyric);
  const alterXml = pitch.alter != null ? `<alter>${pitch.alter}</alter>` : "";
  return [
    "<note>",
    "<pitch>",
    `<step>${pitch.step}</step>`,
    alterXml,
    `<octave>${pitch.octave}</octave>`,
    "</pitch>",
    `<duration>${getNoteLength(note)}</duration>`,
    "<lyric>",
    "<syllabic>single</syllabic>",
    `<text>${lyric}</text>`,
    "</lyric>",
    "</note>",
  ].join("");
}

function generatePartXml(track: Track, timeSignature: TimeSignature, tempo: Tempo): string {
  const notesXml = track.notes.map((note) => generateNoteXml(note)).join("");
  return [
    "<part>",
    '<measure number="1">',
    "<attributes>",
    "<divisions>480</divisions>",
    "<time>",
    `<beats>${timeSignature.numerator}</beats>`,
    `<beat-type>${timeSignature.denominator}</beat-type>`,
    "</time>",
    "</attributes>",
    `<sound tempo="${tempo.bpm}"/>`,
    notesXml,
    "</measure>",
    "</part>",
  ].join("");
}

export interface WriteMusicXmlOptions {
  mode?: "generate" | "preserve";
  originalText?: string;
  noOp?: boolean;
}

export function writeMusicXml(project: Project, options?: WriteMusicXmlOptions): string {
  const mode = options?.mode ?? "generate";
  if (mode === "preserve" && options?.noOp && options.originalText != null) {
    return options.originalText;
  }

  const timeSignature = project.timeSignatures[0] ?? { measurePosition: 0, numerator: 4, denominator: 4 };
  const tempo = project.tempos[0] ?? { tickPosition: 0, bpm: 120 };
  const tracks = project.tracks.length > 0 ? project.tracks : [{ id: 0, name: "Track 1", notes: [] }];
  const partsXml = tracks.map((track) => generatePartXml(track, timeSignature, tempo)).join("");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<score-partwise version="${MUSIC_XML_VERSION}">`,
    partsXml,
    "</score-partwise>",
  ].join("");
}
