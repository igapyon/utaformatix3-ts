import { Format } from "../model/Format";
import { JapaneseLyricsType } from "../model/JapaneseLyricsType";
import type { Note } from "../model/Note";
import type { Project } from "../model/Project";
import type { Tempo } from "../model/Tempo";
import { TickCounter } from "../model/TickCounter";
import type { TimeSignature } from "../model/TimeSignature";
import type { Track } from "../model/Track";

export const MUSIC_XML_VERSION = "2.0";
const TICKS_IN_BEAT = 480;
const TICKS_IN_FULL_NOTE = TICKS_IN_BEAT * 4;
const DEFAULT_TICK_RATE_CEVIO = 2.0;
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

function ticksInMeasure(timeSignature: TimeSignature): number {
  return (TICKS_IN_FULL_NOTE * timeSignature.numerator) / timeSignature.denominator;
}

function parseTieType(noteBlock: string): "start" | "stop" | null {
  const tieMatch = noteBlock.match(/<tie\b[^>]*\btype="([^"]+)"/);
  const tieType = tieMatch?.[1];
  if (tieType === "start" || tieType === "stop") {
    return tieType;
  }
  return null;
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

interface MasterTrackParseResult {
  timeSignatures: TimeSignature[];
  tempos: Tempo[];
  importTickRate: number;
  measureBorders: number[];
  importWarnings: Array<"TempoNotFound" | "TimeSignatureNotFound">;
}

function parseTrackFromPart(
  partBlock: string,
  trackIndex: number,
  defaultLyric: string,
  masterTrack: MasterTrackParseResult,
): Track {
  const measureBlocks = extractTagBlocks(partBlock, "measure");
  const importTickRate = masterTrack.importTickRate;
  const notes: Note[] = [];
  let isInsideNote = false;

  for (let index = 0; index < measureBlocks.length; index += 1) {
    const measureBlock = measureBlocks[index];
    let tickPosition = masterTrack.measureBorders[index] ?? 0;
    const noteBlocks = extractTagBlocks(measureBlock, "note");
    for (const noteBlock of noteBlocks) {
      const durationText = extractFirstTagValue(noteBlock, "duration");
      let duration: number;
      if (durationText == null) {
        if (/<grace(\s|\/|>)/.test(noteBlock)) {
          continue;
        }
        throw new Error("MusicXML duration not found");
      }
      duration = Math.round(Number(durationText) * importTickRate);
      const isRest = /<rest(\s|\/|>)/.test(noteBlock);
      if (isRest) {
        tickPosition += duration;
        continue;
      }
      const key = parsePitchToKey(noteBlock);
      const lyric =
        decodeXml(extractFirstTagValue(extractFirstTagValue(noteBlock, "lyric") ?? "", "text") ?? defaultLyric);
      const note: Note =
        !isInsideNote
          ? {
              id: 0,
              key,
              lyric,
              tickOn: tickPosition,
              tickOff: tickPosition + duration,
            }
          : (() => {
              const last = notes.pop();
              if (!last) {
                throw new Error("MusicXML tie continuation note not found");
              }
              return {
                ...last,
                tickOff: last.tickOff + duration,
              };
            })();

      tickPosition += duration;
      notes.push(note);

      const tieType = parseTieType(noteBlock);
      if (tieType === "start") {
        isInsideNote = true;
      } else if (tieType === "stop") {
        isInsideNote = false;
      }
    }
  }
  return {
    id: trackIndex,
    name: `Track ${trackIndex + 1}`,
    notes: notes.map((note, index) => ({ ...note, id: index })),
  };
}

function parseMasterTrack(partBlock: string): MasterTrackParseResult {
  const measureBlocks = extractTagBlocks(partBlock, "measure");
  const firstMeasure = measureBlocks[0] ?? "";
  const divisions =
    Number(extractFirstTagValue(firstMeasure, "divisions") ?? extractFirstTagValue(partBlock, "divisions") ?? "480") ||
    480;
  const importTickRate = TICKS_IN_BEAT / divisions;
  const timeSignatures: TimeSignature[] = [];
  const tempos: Tempo[] = [];
  const importWarnings: Array<"TempoNotFound" | "TimeSignatureNotFound"> = [];
  const measureBorders: number[] = [0];
  let currentTimeSignature: TimeSignature = { measurePosition: 0, numerator: 4, denominator: 4 };
  let tick = 0;

  for (let i = 0; i < measureBlocks.length; i += 1) {
    const measureBlock = measureBlocks[i];
    const beats = extractFirstTagValue(extractFirstTagValue(measureBlock, "time") ?? "", "beats");
    const beatType = extractFirstTagValue(extractFirstTagValue(measureBlock, "time") ?? "", "beat-type");
    if (beats && beatType) {
      const timeSignature = {
        measurePosition: i,
        numerator: Number(beats),
        denominator: Number(beatType),
      };
      timeSignatures.push(timeSignature);
      currentTimeSignature = timeSignature;
    }
    const soundTempoMatch = measureBlock.match(/<sound[^>]*tempo="([^"]+)"/);
    if (soundTempoMatch) {
      tempos.push({
        tickPosition: tick,
        bpm: Number(soundTempoMatch[1]),
      });
    }
    tick += ticksInMeasure(currentTimeSignature);
    measureBorders.push(tick);
  }
  if (timeSignatures.length === 0) {
    importWarnings.push("TimeSignatureNotFound");
  }
  if (tempos.length === 0) {
    importWarnings.push("TempoNotFound");
  }
  return {
    timeSignatures: timeSignatures.length > 0 ? timeSignatures : [{ measurePosition: 0, numerator: 4, denominator: 4 }],
    tempos: tempos.length > 0 ? tempos : [{ tickPosition: 0, bpm: 120 }],
    importTickRate,
    measureBorders,
    importWarnings,
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
  const tracks = partBlocks.map((partBlock, index) => parseTrackFromPart(partBlock, index, options?.defaultLyric ?? "あ", master));
  return {
    format: Format.MusicXml,
    inputFiles: [],
    name: "musicxml",
    tracks,
    timeSignatures: master.timeSignatures,
    tempos: master.tempos,
    ppq: 480,
    measurePrefix: 0,
    importWarnings: master.importWarnings.map((kind) => ({ kind })),
    japaneseLyricsType: JapaneseLyricsType.Unknown,
    extras: {
      musicxml: {
        originalXml: text,
        preservedAt: new Date().toISOString(),
      },
    },
  };
}

type NoteType = "Begin" | "Middle" | "End" | "Single";

type MeasureContent =
  | { kind: "Tempo"; bpm: number }
  | { kind: "Rest"; duration: number }
  | { kind: "Note"; duration: number; note: Note; noteType: NoteType };

interface Measure {
  tickStart: number;
  length: number;
  timeSignature: TimeSignature | null;
  contents: MeasureContent[];
}

type KeyTick =
  | { kind: "Tempo"; tick: number; tempo: Tempo }
  | { kind: "NoteStart"; tick: number; note: Note }
  | { kind: "NoteEnd"; tick: number; note: Note };

function applyTickRate(project: Project): Project {
  return {
    ...project,
    tempos: project.tempos.map((tempo) => ({
      ...tempo,
      tickPosition: Math.trunc(tempo.tickPosition * DEFAULT_TICK_RATE_CEVIO),
    })),
    tracks: project.tracks.map((track) => ({
      ...track,
      notes: track.notes.map((note) => ({
        ...note,
        tickOn: Math.trunc(note.tickOn * DEFAULT_TICK_RATE_CEVIO),
        tickOff: Math.trunc(note.tickOff * DEFAULT_TICK_RATE_CEVIO),
      })),
    })),
  };
}

function getKeyTicks(project: Project, track: Track): KeyTick[] {
  const tempos: KeyTick[] = project.tempos.map((tempo) => ({
    kind: "Tempo",
    tick: tempo.tickPosition,
    tempo,
  }));
  const noteStarts: KeyTick[] = track.notes.map((note) => ({
    kind: "NoteStart",
    tick: note.tickOn,
    note,
  }));
  const noteEnds: KeyTick[] = track.notes.map((note) => ({
    kind: "NoteEnd",
    tick: note.tickOff,
    note,
  }));
  return [...noteEnds, ...tempos, ...noteStarts].sort((a, b) => a.tick - b.tick);
}

function getMeasures(keyTicks: KeyTick[], timeSignatures: TimeSignature[]): Measure[] {
  if (keyTicks.length === 0) {
    return [
      {
        tickStart: 0,
        length: TICKS_IN_FULL_NOTE * DEFAULT_TICK_RATE_CEVIO,
        timeSignature: timeSignatures.find((it) => it.measurePosition === 0) ?? null,
        contents: [],
      },
    ];
  }

  const tickCounter = new TickCounter(1.0, TICKS_IN_FULL_NOTE * DEFAULT_TICK_RATE_CEVIO);
  const measureBorderTicks: number[] = [0];
  for (const timeSignature of timeSignatures) {
    const previousMeasure = tickCounter.measure;
    const ticksInMeasure = tickCounter.ticksInMeasure;
    tickCounter.goToMeasure(timeSignature.measurePosition, timeSignature.numerator, timeSignature.denominator);
    const currentMeasure = tickCounter.measure;
    for (let i = 0; i < currentMeasure - previousMeasure; i += 1) {
      measureBorderTicks.push(measureBorderTicks[measureBorderTicks.length - 1] + ticksInMeasure);
    }
  }

  const lastTick = keyTicks[keyTicks.length - 1].tick;
  if (lastTick >= tickCounter.tick + tickCounter.ticksInMeasure) {
    const previousMeasure = tickCounter.measure;
    const ticksInMeasure = tickCounter.ticksInMeasure;
    tickCounter.goToTick(lastTick);
    const currentMeasure = tickCounter.measure;
    for (let i = 0; i < currentMeasure - previousMeasure; i += 1) {
      measureBorderTicks.push(measureBorderTicks[measureBorderTicks.length - 1] + ticksInMeasure);
    }
  }
  measureBorderTicks.push(measureBorderTicks[measureBorderTicks.length - 1] + tickCounter.ticksInMeasure);

  const bordered = measureBorderTicks.slice(0, -1).map((start, index) => {
    const end = measureBorderTicks[index + 1];
    const group = keyTicks.filter((keyTick) => {
      if (keyTick.kind === "NoteEnd") {
        return keyTick.tick > start && keyTick.tick <= end;
      }
      return keyTick.tick >= start && keyTick.tick < end;
    });
    return { start, end, group };
  });

  const contentByBorder = new Map<string, MeasureContent[]>();
  let ongoingNote: { note: Note; head: number } | null = null;

  for (const { start, end, group } of bordered) {
    let currentTickInMeasure = 0;
    const currentContents: MeasureContent[] = [];

    for (const keyTick of group) {
      const keyTickRelative = keyTick.tick - start;
      if (keyTickRelative > currentTickInMeasure) {
        if (ongoingNote == null) {
          currentContents.push({
            kind: "Rest",
            duration: keyTickRelative - currentTickInMeasure,
          });
        }
        currentTickInMeasure = keyTickRelative;
      }

      if (keyTick.kind === "Tempo") {
        if (ongoingNote == null) {
          currentContents.push({ kind: "Tempo", bpm: keyTick.tempo.bpm });
        } else {
          currentContents.push({
            kind: "Note",
            duration: keyTick.tick - ongoingNote.head,
            note: ongoingNote.note,
            noteType: ongoingNote.note.tickOn === ongoingNote.head ? "Begin" : "Middle",
          });
          ongoingNote = { note: ongoingNote.note, head: keyTick.tick };
          currentContents.push({ kind: "Tempo", bpm: keyTick.tempo.bpm });
        }
      } else if (keyTick.kind === "NoteStart") {
        ongoingNote = { note: keyTick.note, head: keyTick.tick };
      } else {
        if (ongoingNote == null) {
          throw new Error("MusicXML ongoing note not found");
        }
        currentContents.push({
          kind: "Note",
          duration: keyTick.note.tickOff - ongoingNote.head,
          note: keyTick.note,
          noteType: keyTick.note.tickOn === ongoingNote.head ? "Single" : "End",
        });
        ongoingNote = null;
      }
    }

    const restLength = end - start - currentTickInMeasure;
    if (restLength > 0) {
      if (ongoingNote == null) {
        currentContents.push({ kind: "Rest", duration: restLength });
      } else {
        currentContents.push({
          kind: "Note",
          duration: end - ongoingNote.head,
          note: ongoingNote.note,
          noteType: ongoingNote.note.tickOn === ongoingNote.head ? "Begin" : "Middle",
        });
        ongoingNote = { note: ongoingNote.note, head: end };
      }
    }

    contentByBorder.set(`${start}:${end}`, currentContents);
  }

  return Array.from(contentByBorder.entries())
    .map(([key, contents], index) => {
      const [startText, endText] = key.split(":");
      const tickStart = Number(startText);
      const tickEnd = Number(endText);
      return {
        tickStart,
        length: tickEnd - tickStart,
        timeSignature: timeSignatures.find((it) => it.measurePosition === index) ?? null,
        contents,
      };
    })
    .sort((a, b) => a.tickStart - b.tickStart);
}

function generateLyricXml(noteType: NoteType, lyric: string): string {
  const syllabic =
    noteType === "Begin"
      ? "begin"
      : noteType === "Middle"
        ? "middle"
        : noteType === "End"
          ? "end"
          : "single";
  const text = noteType === "Begin" || noteType === "Single" ? `<text>${escapeXml(lyric)}</text>` : "<text></text>";
  return ["<lyric>", `<syllabic>${syllabic}</syllabic>`, text, "</lyric>"].join("");
}

function generateNoteXml(note: Note, duration: number, noteType: NoteType): string {
  const pitch = parseKeyToPitch(note.key);
  const alterXml = pitch.alter != null ? `<alter>${pitch.alter}</alter>` : "";
  const tieType = noteType === "Begin" ? "start" : noteType === "End" ? "stop" : null;
  const tieXml = tieType == null ? "" : `<tie type="${tieType}"/>`;
  const notationsXml =
    tieType == null ? "" : `<notations><tied type="${tieType}"/></notations>`;
  return [
    "<note>",
    "<pitch>",
    `<step>${pitch.step}</step>`,
    alterXml,
    `<octave>${pitch.octave}</octave>`,
    "</pitch>",
    `<duration>${duration}</duration>`,
    tieXml,
    notationsXml,
    generateLyricXml(noteType, note.lyric),
    "</note>",
  ].join("");
}

function generateTempoXml(bpm: number): string {
  return [
    `<sound tempo="${bpm}"/>`,
    "<direction>",
    "<direction-type>",
    "<metronome>",
    "<beat-unit>quarter</beat-unit>",
    `<per-minute>${bpm}</per-minute>`,
    "</metronome>",
    "</direction-type>",
    `<sound tempo="${bpm}"/>`,
    "</direction>",
  ].join("");
}

function generateRestXml(duration: number): string {
  return ["<note>", "<rest/>", `<duration>${duration}</duration>`, "</note>"].join("");
}

function generateTimeSignatureXml(timeSignature: TimeSignature, withDivisions: boolean): string {
  return [
    "<attributes>",
    withDivisions ? `<divisions>${Math.trunc(TICKS_IN_BEAT * DEFAULT_TICK_RATE_CEVIO)}</divisions>` : "",
    "<time>",
    `<beats>${timeSignature.numerator}</beats>`,
    `<beat-type>${timeSignature.denominator}</beat-type>`,
    "</time>",
    "</attributes>",
  ].join("");
}

function generatePartXml(track: Track, measures: Measure[]): string {
  const measuresXml = measures
    .map((measure, index) => {
      const body = measure.contents
        .map((content) => {
          if (content.kind === "Tempo") {
            return generateTempoXml(content.bpm);
          }
          if (content.kind === "Rest") {
            return generateRestXml(content.duration);
          }
          return generateNoteXml(content.note, content.duration, content.noteType);
        })
        .join("");
      const timeSignatureXml =
        measure.timeSignature != null ? generateTimeSignatureXml(measure.timeSignature, index === 0) : "";
      return [`<measure number="${index + 1}">`, timeSignatureXml, body, "</measure>"].join("");
    })
    .join("");
  return [
    `<part id="P${track.id + 1}">`,
    measuresXml,
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

  const tickRateApplied = applyTickRate(project);
  const tracks = tickRateApplied.tracks.length > 0 ? tickRateApplied.tracks : [{ id: 0, name: "Track 1", notes: [] }];
  const timeSignatures =
    tickRateApplied.timeSignatures.length > 0
      ? tickRateApplied.timeSignatures
      : [{ measurePosition: 0, numerator: 4, denominator: 4 }];
  const partListXml = [
    "<part-list>",
    ...tracks.map(
      (track) =>
        `<score-part id="P${track.id + 1}"><part-name>${escapeXml(track.name || `Track ${track.id + 1}`)}</part-name></score-part>`,
    ),
    "</part-list>",
  ].join("");
  const partsXml = tracks
    .map((track) => {
      const keyTicks = getKeyTicks(tickRateApplied, track);
      const measures = getMeasures(keyTicks, timeSignatures);
      return generatePartXml(track, measures);
    })
    .join("");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<score-partwise version="${MUSIC_XML_VERSION}">`,
    partListXml,
    partsXml,
    "</score-partwise>",
  ].join("");
}
