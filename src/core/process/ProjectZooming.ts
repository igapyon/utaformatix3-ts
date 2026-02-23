import type { Project } from "../model/Project";
import type { TimeSignature } from "../model/TimeSignature";
import type { Track } from "../model/Track";

function zoomTrack(track: Track, factor: number): Track {
  const notes = track.notes.map((note) => ({
    ...note,
    tickOn: Math.round(note.tickOn * factor),
    tickOff: Math.round(note.tickOff * factor),
  }));
  const pitch = track.pitch
    ? {
        ...track.pitch,
        data: track.pitch.data.map(([tick, value]) => [Math.round(tick * factor), value] as [number, number]),
      }
    : track.pitch;
  return {
    ...track,
    notes,
    pitch,
  };
}

export function needWarningZoom(project: Project, factor: number): boolean {
  return project.timeSignatures.some((timeSignature) => {
    const newPosition = timeSignature.measurePosition * factor;
    return Math.ceil(newPosition) !== newPosition;
  });
}

export function zoomProject(project: Project, factor: number): Project {
  const tracks = project.tracks.map((track) => zoomTrack(track, factor));
  const tempos = project.tempos.map((tempo) => ({
    ...tempo,
    tickPosition: Math.round(tempo.tickPosition * factor),
    bpm: tempo.bpm * factor,
  }));
  const timeSignatures = project.timeSignatures
    .map((timeSignature) => ({
      ...timeSignature,
      measurePosition: Math.round(timeSignature.measurePosition * factor),
    }))
    .reduce<TimeSignature[]>((acc, timeSignature) => {
      if (acc.length === 0) {
        return [timeSignature];
      }
      const prev = acc[acc.length - 1];
      if (prev.measurePosition === timeSignature.measurePosition) {
        return acc;
      }
      return [...acc, timeSignature];
    }, []);

  return {
    ...project,
    tracks,
    tempos,
    timeSignatures,
  };
}

export const projectZoomFactorOptions = ["2", "5/3", "3/2", "4/3", "6/5", "4/5", "3/4", "3/5", "1/2"];

