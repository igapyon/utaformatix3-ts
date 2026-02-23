import { Format } from "../../model/Format";
import type { Project } from "../../model/Project";
import type { Note } from "../../model/Note";
import type { Track } from "../../model/Track";
import { validateNotes } from "../NoteShaping";

export enum LyricsReplacementFilterType {
  None = "None",
  Exact = "Exact",
  Containing = "Containing",
  Prefix = "Prefix",
  Suffix = "Suffix",
  Regex = "Regex",
}

export enum LyricsReplacementMatchType {
  All = "All",
  Exact = "Exact",
  Regex = "Regex",
}

export class LyricsReplacementRequestItem {
  public constructor(
    public readonly filterType: LyricsReplacementFilterType = LyricsReplacementFilterType.Exact,
    public readonly filter: string = "",
    public readonly matchType: LyricsReplacementMatchType = LyricsReplacementMatchType.All,
    public readonly from: string = "",
    public readonly to: string = "",
  ) {}

  public get isValid(): boolean {
    return (
      (this.filterType === LyricsReplacementFilterType.None || this.filter.length > 0) &&
      (this.matchType === LyricsReplacementMatchType.All || this.from.length > 0)
    );
  }

  public doReplace(lyric: string): string {
    if (!this.filterLyric(lyric)) {
      return lyric;
    }
    if (this.matchType === LyricsReplacementMatchType.All) {
      return this.to;
    }
    if (this.matchType === LyricsReplacementMatchType.Exact) {
      return lyric.split(this.from).join(this.to);
    }
    return lyric.replace(new RegExp(this.from, "g"), this.to);
  }

  private filterLyric(lyric: string): boolean {
    switch (this.filterType) {
      case LyricsReplacementFilterType.None:
        return true;
      case LyricsReplacementFilterType.Exact:
        return lyric === this.filter;
      case LyricsReplacementFilterType.Containing:
        return lyric.includes(this.filter);
      case LyricsReplacementFilterType.Prefix:
        return lyric.startsWith(this.filter);
      case LyricsReplacementFilterType.Suffix:
        return lyric.endsWith(this.filter);
      case LyricsReplacementFilterType.Regex:
        return new RegExp(`^(?:${this.filter})$`).test(lyric);
      default:
        return false;
    }
  }
}

export class LyricsReplacementRequest {
  public constructor(public readonly items: LyricsReplacementRequestItem[] = [new LyricsReplacementRequestItem()]) {}

  public get isValid(): boolean {
    return this.items.every((it) => it.isValid);
  }

  public doReplace(lyric: string): string {
    return this.items.reduce((acc, item) => item.doReplace(acc), lyric);
  }

  public static getPreset(fromFormat: Format, toFormat: Format): LyricsReplacementRequest | null {
    const items: LyricsReplacementRequestItem[] = [];

    if (fromFormat === Format.Ust) {
      items.push(
        new LyricsReplacementRequestItem(
          LyricsReplacementFilterType.Suffix,
          "R",
          LyricsReplacementMatchType.All,
          "",
          "",
        ),
      );
    } else if (fromFormat === Format.Ccs) {
      items.push(
        new LyricsReplacementRequestItem(
          LyricsReplacementFilterType.Exact,
          "ー",
          LyricsReplacementMatchType.All,
          "",
          "-",
        ),
      );
    } else if (fromFormat === Format.Ustx) {
      items.push(
        new LyricsReplacementRequestItem(
          LyricsReplacementFilterType.Exact,
          "+",
          LyricsReplacementMatchType.All,
          "",
          "-",
        ),
      );
    }

    if (toFormat === Format.Ccs) {
      items.push(
        new LyricsReplacementRequestItem(
          LyricsReplacementFilterType.Exact,
          "-",
          LyricsReplacementMatchType.All,
          "",
          "ー",
        ),
      );
    } else if (toFormat === Format.Ustx) {
      items.push(
        new LyricsReplacementRequestItem(
          LyricsReplacementFilterType.Exact,
          "-",
          LyricsReplacementMatchType.All,
          "",
          "+",
        ),
      );
    }

    if (items.length === 0) {
      return null;
    }
    return new LyricsReplacementRequest(items);
  }
}

export function replaceLyricsInProject(project: Project, request: LyricsReplacementRequest): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => replaceLyricsInTrack(track, request)),
  };
}

export function replaceLyricsInTrack(track: Track, request: LyricsReplacementRequest): Track {
  const replacedNotes = track.notes
    .map((note) => replaceLyricsInNote(note, request))
    .filter((note) => note.lyric.length > 0);
  return {
    ...track,
    notes: validateNotes(replacedNotes),
  };
}

function replaceLyricsInNote(note: Note, request: LyricsReplacementRequest): Note {
  return {
    ...note,
    lyric: request.doReplace(note.lyric),
  };
}
