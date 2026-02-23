import { Format } from "../../../model/Format";
import { JapaneseLyricsType } from "../../../model/JapaneseLyricsType";
import type { Note } from "../../../model/Note";
import type { Project } from "../../../model/Project";
import type { Track } from "../../../model/Track";
import { cleanupJapaneseLyrics } from "./Cleanup";
import { findVowelKana, isKana, isRomaji, toKana, toRomaji } from "./Words";

function isRomajiType(type: JapaneseLyricsType): boolean {
  return type === JapaneseLyricsType.RomajiCv || type === JapaneseLyricsType.RomajiVcv;
}

function isCvType(type: JapaneseLyricsType): boolean {
  return type === JapaneseLyricsType.RomajiCv || type === JapaneseLyricsType.KanaCv;
}

export function convertJapaneseLyrics(
  project: Project,
  targetType: JapaneseLyricsType,
  targetFormat: Format,
): Project {
  const sourceType = project.japaneseLyricsType;
  let tracks = cleanupJapaneseLyrics(project.tracks, sourceType);

  if (isRomajiType(sourceType) && !isRomajiType(targetType)) {
    tracks = convertRomajiToKana(tracks);
  } else if (!isRomajiType(sourceType) && isRomajiType(targetType)) {
    tracks = convertKanaToRomaji(tracks);
  }

  if (isCvType(sourceType) && !isCvType(targetType)) {
    tracks = convertCVToVCV(tracks);
  } else if (!isCvType(sourceType) && isCvType(targetType)) {
    tracks = convertVCVToCV(tracks);
  }

  if (targetFormat === Format.Ust) {
    tracks = convertVowelConnections(tracks, targetType);
  }

  return {
    ...project,
    tracks,
  };
}

function convertRomajiToKana(tracks: Track[]): Track[] {
  return convertBetweenRomajiAndKana(tracks, (it) => toKana(it));
}

function convertKanaToRomaji(tracks: Track[]): Track[] {
  return convertBetweenRomajiAndKana(tracks, (it) => toRomaji(it));
}

function convertBetweenRomajiAndKana(tracks: Track[], conversion: (text: string) => string): Track[] {
  return convertJapaneseLyricsInTracks(tracks, (notes) =>
    notes.map((note) => {
      const lyric = note.lyric;
      if (lyric.includes(" ")) {
        const blankPos = lyric.indexOf(" ");
        const head = lyric.slice(0, blankPos);
        const body = lyric.slice(blankPos + 1);
        return { ...note, lyric: `${head} ${conversion(body)}` };
      }
      return { ...note, lyric: conversion(lyric) };
    }),
  );
}

function convertCVToVCV(tracks: Track[]): Track[] {
  return convertJapaneseLyricsInTracks(tracks, (notes) => {
    const result = [...notes];
    let lastTail = "-";
    for (let i = 0; i < result.length; i += 1) {
      let tail = lastTail;
      if (i > 0 && result[i].tickOn > result[i - 1].tickOff) {
        tail = "-";
      }
      if (isKana(result[i].lyric)) {
        lastTail = toRomaji(result[i].lyric).slice(-1);
        result[i] = { ...result[i], lyric: `${tail} ${result[i].lyric}` };
      } else if (isRomaji(result[i].lyric)) {
        lastTail = result[i].lyric.slice(-1);
        result[i] = { ...result[i], lyric: `${tail} ${result[i].lyric}` };
      } else {
        lastTail = "-";
      }
    }
    return result;
  });
}

function convertVCVToCV(tracks: Track[]): Track[] {
  return convertJapaneseLyricsInTracks(tracks, (notes) =>
    notes.map((note) => {
      const lyric = note.lyric;
      if (!lyric.includes(" ")) {
        return note;
      }
      const body = lyric.slice(lyric.indexOf(" ") + 1);
      if (isKana(body) || isRomaji(body)) {
        return { ...note, lyric: body };
      }
      return note;
    }),
  );
}

function convertJapaneseLyricsInTracks(tracks: Track[], conversion: (notes: Note[]) => Note[]): Track[] {
  return tracks.map((track) => ({
    ...track,
    notes: conversion(track.notes),
  }));
}

function convertVowelConnections(tracks: Track[], targetType: JapaneseLyricsType): Track[] {
  return tracks.map((track) => {
    const lyrics = track.notes.map((note) => note.lyric);
    if (lyrics.length < 2) {
      return track;
    }

    for (let index = 1; index < lyrics.length; index += 1) {
      const currentLyric = lyrics[index];
      if (currentLyric !== "-" && currentLyric !== "ー") {
        continue;
      }
      const previousLyric = lyrics[index - 1];
      let newCurrentLyric: string | null = null;
      if (isRomajiType(targetType)) {
        if (isRomaji(previousLyric)) {
          newCurrentLyric = previousLyric.slice(-1);
        }
      } else if (isKana(previousLyric)) {
        newCurrentLyric = findVowelKana(previousLyric);
      }
      if (newCurrentLyric != null) {
        lyrics[index] = newCurrentLyric;
      }
    }

    return {
      ...track,
      notes: track.notes.map((note, index) => ({
        ...note,
        lyric: lyrics[index],
      })),
    };
  });
}
