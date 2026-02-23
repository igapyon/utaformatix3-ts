import type { Note } from "../../model/Note";
import type { Project } from "../../model/Project";
import type { Track } from "../../model/Track";
import { validateNotes } from "../NoteShaping";

export class LyricsMappingRequest {
  public constructor(
    public readonly mapText = "",
    public readonly mapToPhonemes = false,
  ) {}

  public get isValid(): boolean {
    return this.map.size > 0;
  }

  public get map(): Map<string, string> {
    return new Map(
      this.mapText
        .split(/\r?\n/)
        .map((line) => {
          if (!line.includes("=")) {
            return null;
          }
          const from = line.slice(0, line.indexOf("=")).trim();
          const to = line.slice(line.indexOf("=") + 1).trim();
          return [from, to] as [string, string];
        })
        .filter((it): it is [string, string] => it != null),
    );
  }

  public static readonly Presets: Array<[string, LyricsMappingRequest]> = [];

  public static findPreset(name: string): LyricsMappingRequest | undefined {
    return this.Presets.find(([presetName]) => presetName === name)?.[1];
  }

  public static getPreset(name: string): LyricsMappingRequest {
    const preset = this.findPreset(name);
    if (!preset) {
      throw new Error(`Lyrics mapping preset not found: ${name}`);
    }
    return preset;
  }
}

export function mapLyrics(project: Project, request: LyricsMappingRequest): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => replaceLyrics(track, request)),
  };
}

function replaceLyrics(track: Track, request: LyricsMappingRequest): Track {
  return {
    ...track,
    notes: validateNotes(
      track.notes
        .map((note) => replaceLyricsInNote(note, request))
        .filter((note) => note.lyric.length > 0),
    ),
  };
}

function replaceLyricsInNote(note: Note, request: LyricsMappingRequest): Note {
  const mappedValue = request.map.get(note.lyric) ?? note.lyric;
  if (request.mapToPhonemes) {
    return {
      ...note,
      phoneme: mappedValue,
    };
  }
  return {
    ...note,
    lyric: mappedValue,
  };
}
