import { JapaneseLyricsType } from "../../../model/JapaneseLyricsType";
import type { Note } from "../../../model/Note";
import type { Project } from "../../../model/Project";
import type { Track } from "../../../model/Track";
import { isKana, isRomaji } from "./Words";

const MIN_RELIABLE_PERCENTAGE = 0.7;
const MIN_NOTE_RATIO_FOR_AVAILABLE_TRACK = 0.1;

export function analyseJapaneseLyricsTypeForProject(project: Project): JapaneseLyricsType {
  if (project.tracks.length === 0) {
    return JapaneseLyricsType.Unknown;
  }

  const maxNoteCountInAllTracks = Math.max(...project.tracks.map((track) => track.notes.length));
  const minNoteCountForAvailableTrack = maxNoteCountInAllTracks * MIN_NOTE_RATIO_FOR_AVAILABLE_TRACK;

  const availableResults = Array.from(
    new Set(
      project.tracks
        .filter((track) => track.notes.length >= minNoteCountForAvailableTrack)
        .map((track) => analyseLyricsTypeForTrack(track))
        .filter((type) => type !== JapaneseLyricsType.Unknown),
    ),
  );

  if (availableResults.length > 1) {
    return JapaneseLyricsType.Unknown;
  }
  return availableResults[0] ?? JapaneseLyricsType.Unknown;
}

function analyseLyricsTypeForTrack(track: Track): JapaneseLyricsType {
  const total = track.notes.length;
  const types = track.notes.map((note) => checkNoteType(note));
  const typePercentages = Object.values(JapaneseLyricsType).map((type) => {
    const count = types.filter((it) => it === type).length;
    return [type, total === 0 ? 0 : count / total] as [JapaneseLyricsType, number];
  });
  return (
    typePercentages.find(([, ratio]) => ratio > MIN_RELIABLE_PERCENTAGE)?.[0] ?? JapaneseLyricsType.Unknown
  );
}

function checkNoteType(note: Note): JapaneseLyricsType {
  let lyric = note.lyric;
  if (lyric.includes("_")) {
    lyric = lyric.slice(0, lyric.indexOf("_"));
  }
  if (lyric.includes(" ")) {
    const mainLyric = lyric.slice(lyric.indexOf(" ") + 1);
    if (isKana(mainLyric)) {
      return JapaneseLyricsType.KanaVcv;
    }
    if (isRomaji(mainLyric)) {
      return JapaneseLyricsType.RomajiVcv;
    }
  } else {
    if (isKana(lyric)) {
      return JapaneseLyricsType.KanaCv;
    }
    if (isRomaji(lyric)) {
      return JapaneseLyricsType.RomajiCv;
    }
  }
  return JapaneseLyricsType.Unknown;
}
