import type { Note } from "../../model/Note";
import type { Pitch } from "../../model/Pitch";
import type { Tempo } from "../../model/Tempo";
import { runIf } from "../../util/ChainCall";
import { getAbsoluteData, keyToLoggedFrequency, loggedFrequencyToKey } from "./PitchCalculation";

export interface CevioTrackPitchData {
  events: CevioTrackPitchDataEvent[];
  tempos: Tempo[];
  tickPrefix: number;
}

export interface CevioTrackPitchDataEvent {
  index: number | null;
  repeat: number | null;
  value: number;
}

interface EventDouble {
  index: number | null;
  repeat: number | null;
  value: number | null;
}

const TIME_UNIT_AS_TICKS_PER_BPM = 4.8 / 120;
const MIN_DATA_LENGTH = 500;
const TEMP_VALUE_AS_NULL = -1.0;

function eventDoubleFrom(event: CevioTrackPitchDataEvent): EventDouble {
  return { index: event.index, repeat: event.repeat, value: event.value };
}

function roundEvent(event: EventDouble): CevioTrackPitchDataEvent | null {
  if (event.value == null) return null;
  return {
    index: event.index == null ? null : Math.round(event.index),
    repeat: event.repeat == null ? null : Math.round(event.repeat),
    value: event.value,
  };
}

export function pitchFromCevioTrack(data: CevioTrackPitchData): Pitch | null {
  const convertedPoints: Array<[number, number | null]> = [];
  let currentValue: number | null = null;
  const eventsNormalized = shapeEvents(normalizeToTick(appendEndingPoints(data)));
  let nextPos: number | null = null;
  for (const event of eventsNormalized) {
    const pos = (event.index ?? 0) - data.tickPrefix;
    const length = event.repeat ?? 0;
    const value = event.value == null ? null : loggedFrequencyToKey(event.value);
    if (value !== currentValue || nextPos !== pos) {
      convertedPoints.push([pos, value]);
      currentValue = value;
    }
    nextPos = pos + length;
  }
  const lastMinusPosPoint = [...convertedPoints].reverse().find((it) => it[0] < 0 && it[1] != null);
  if (lastMinusPosPoint) {
    convertedPoints.splice(0, convertedPoints.indexOf(lastMinusPosPoint) + 1);
    const firstPositive = convertedPoints[0];
    if (firstPositive && firstPositive[0] > 0) {
      convertedPoints.unshift([0.0, lastMinusPosPoint[1]]);
    }
  }
  const pitch: Pitch = {
    data: convertedPoints.map(([pos, value]) => [Math.round(pos), value]),
    isAbsolute: true,
  };
  return pitch.data.length > 0 ? pitch : null;
}

function appendEndingPoints(data: CevioTrackPitchData): CevioTrackPitchData {
  const result: CevioTrackPitchDataEvent[] = [];
  let nextPos: number | null = null;
  for (const event of data.events) {
    const pos: number = event.index != null ? event.index : (nextPos ?? 0);
    const length = event.repeat ?? 1;
    if (nextPos != null && nextPos < pos) {
      result.push({ index: nextPos, repeat: null, value: TEMP_VALUE_AS_NULL });
    }
    result.push({ index: pos, repeat: length, value: event.value });
    nextPos = pos + length;
  }
  if (nextPos != null) {
    result.push({ index: nextPos, repeat: null, value: TEMP_VALUE_AS_NULL });
  }
  return { ...data, events: result };
}

function expandTempos(tempos: Tempo[]): Array<[number, number, number]> {
  return tempos.reduce<Array<[number, number, number]>>((acc, element) => {
    if (acc.length === 0) return [[0.0, 0.0, element.bpm]];
    const [lastPos, lastTickPos, lastBpm] = acc[acc.length - 1];
    const ticksInTimeUnit = TIME_UNIT_AS_TICKS_PER_BPM * lastBpm;
    const newPos = lastPos + (element.tickPosition - lastTickPos) / ticksInTimeUnit;
    return [...acc, [newPos, element.tickPosition, element.bpm]];
  }, []);
}

function normalizeToTick(data: CevioTrackPitchData): EventDouble[] {
  const tempos = expandTempos(data.tempos.map((it) => ({ ...it, tickPosition: it.tickPosition + data.tickPrefix })));
  const events = data.events.map(eventDoubleFrom);
  const eventsNormalized: EventDouble[] = [];
  let currentTempoIndex = 0;
  let nextPos = 0.0;
  let nextTickPos = 0.0;
  for (const event of events) {
    const pos = event.index ?? nextPos;
    const tickPos = event.index == null
      ? nextTickPos
      : (() => {
          while ((tempos[currentTempoIndex + 1]?.[0] ?? Number.POSITIVE_INFINITY) <= event.index!) {
            currentTempoIndex += 1;
          }
          const ticksInTimeUnit = TIME_UNIT_AS_TICKS_PER_BPM * tempos[currentTempoIndex][2];
          return tempos[currentTempoIndex][1] + (event.index! - tempos[currentTempoIndex][0]) * ticksInTimeUnit;
        })();
    const repeat = event.repeat ?? 1.0;
    let remainingRepeat = repeat;
    let repeatInTicks = 0.0;
    while ((tempos[currentTempoIndex + 1]?.[0] ?? Number.POSITIVE_INFINITY) < pos + repeat) {
      repeatInTicks += tempos[currentTempoIndex + 1][1] - Math.max(tempos[currentTempoIndex][1], tickPos);
      remainingRepeat -= tempos[currentTempoIndex + 1][0] - Math.max(tempos[currentTempoIndex][0], pos);
      currentTempoIndex += 1;
    }
    repeatInTicks += remainingRepeat * TIME_UNIT_AS_TICKS_PER_BPM * tempos[currentTempoIndex][2];
    nextPos = pos + repeat;
    nextTickPos = tickPos + repeatInTicks;
    eventsNormalized.push({ index: tickPos, repeat: repeatInTicks, value: event.value });
  }
  return eventsNormalized.map((it) => ({ ...it, value: it.value === TEMP_VALUE_AS_NULL ? null : it.value }));
}

function shapeEvents(eventsWithFullParams: EventDouble[]): EventDouble[] {
  return eventsWithFullParams
    .filter((it) => (it.repeat ?? 0) > 0)
    .reduce<EventDouble[]>((acc, event) => {
      const last = acc[acc.length - 1];
      if (!last) return [event];
      if (last.index === event.index) return [...acc.slice(0, -1), event];
      return [...acc, event];
    }, []);
}

export function generateForCevio(
  pitch: Pitch,
  notes: Note[],
  tempos: Tempo[],
  tickPrefix: number,
): CevioTrackPitchData | null {
  const endTick = notes[notes.length - 1]?.tickOff;
  if (endTick == null) return null;
  const data = getAbsoluteData(pitch, notes);
  if (!data || data.length === 0) return null;
  let nextIndex: number | null = null;
  const eventsWithFullParams: EventDouble[] = [];
  const zipped: Array<[[number, number | null], [number, number | null] | null]> = [];
  for (let i = 0; i < data.length - 1; i += 1) zipped.push([data[i], data[i + 1]]);
  zipped.push([data[data.length - 1], null]);
  for (const [thisPoint, nextPoint] of zipped) {
    const index = thisPoint[0];
    if (nextIndex != null && nextIndex > index) {
      const lastEvent = eventsWithFullParams.pop();
      if (lastEvent) {
        const repeat = index - (lastEvent.index ?? 0);
        if (repeat >= 1) eventsWithFullParams.push({ ...lastEvent, repeat });
      }
    }
    const repeat = Math.max(1, (nextPoint?.[0] ?? endTick) - index);
    nextIndex = index + repeat;
    const value = thisPoint[1] == null ? null : keyToLoggedFrequency(thisPoint[1]);
    if (value == null) continue;
    eventsWithFullParams.push({ index, repeat, value });
  }
  const connected = eventsWithFullParams.map((thisEvent, i) => {
    const next = eventsWithFullParams[i + 1];
    return next ? (thisEvent.index ?? 0) + (thisEvent.repeat ?? 1) >= (next.index ?? 0) : false;
  });
  const events = removeRedundantRepeat(
    removeRedundantIndex(
      mergeEventsIfPossible(
        restoreConnection(denormalizeFromTick(eventsWithFullParams, tempos, tickPrefix), connected),
      ),
    ),
  );
  if (events.length === 0) return null;
  return { events, tempos: [], tickPrefix };
}

export function cevioTrackPitchDataLength(data: CevioTrackPitchData): number {
  const lastWithIndex = [...data.events].reverse().find((it) => it.index != null);
  if (!lastWithIndex || lastWithIndex.index == null) return MIN_DATA_LENGTH;
  let length = lastWithIndex.index;
  const start = data.events.indexOf(lastWithIndex);
  for (let i = start; i < data.events.length; i += 1) {
    length += data.events[i].repeat ?? 1;
  }
  return length + MIN_DATA_LENGTH;
}

function denormalizeFromTick(events: EventDouble[], temposInTicks: Tempo[], tickPrefix: number): CevioTrackPitchDataEvent[] {
  const tempos = expandTempos(temposInTicks.map((it) => runIf(it, it.tickPosition !== 0, (v) => ({ ...v, tickPosition: v.tickPosition + tickPrefix }))));
  let currentTempoIndex = 0;
  return events
    .map((event) => ({ ...event, index: (event.index ?? 0) + tickPrefix }))
    .map((event) => {
      const tickPos = event.index ?? 0;
      while ((tempos[currentTempoIndex + 1]?.[1] ?? Number.POSITIVE_INFINITY) <= tickPos) currentTempoIndex += 1;
      const ticksInTimeUnit = TIME_UNIT_AS_TICKS_PER_BPM * tempos[currentTempoIndex][2];
      const pos = tempos[currentTempoIndex][0] + (tickPos - tempos[currentTempoIndex][1]) / ticksInTimeUnit;
      const repeatInTicks = event.repeat ?? 0;
      let remaining = repeatInTicks;
      let repeat = 0.0;
      while ((tempos[currentTempoIndex + 1]?.[1] ?? Number.POSITIVE_INFINITY) < tickPos + repeatInTicks) {
        repeat += tempos[currentTempoIndex + 1][0] - Math.max(tempos[currentTempoIndex][0], pos);
        remaining -= tempos[currentTempoIndex + 1][1] - Math.max(tempos[currentTempoIndex][1], tickPos);
        currentTempoIndex += 1;
      }
      repeat += remaining / (TIME_UNIT_AS_TICKS_PER_BPM * tempos[currentTempoIndex][2]);
      return roundEvent({ index: pos, repeat: Math.max(1.0, repeat), value: event.value });
    })
    .filter((it): it is CevioTrackPitchDataEvent => it != null);
}

function restoreConnection(events: CevioTrackPitchDataEvent[], connected: boolean[]): CevioTrackPitchDataEvent[] {
  return events.map((event, index) => {
    const next = events[index + 1];
    if (!next) return event;
    if (connected[index]) return { ...event, repeat: (next.index ?? 0) - (event.index ?? 0) };
    return event;
  });
}

function mergeEventsIfPossible(events: CevioTrackPitchDataEvent[]): CevioTrackPitchDataEvent[] {
  return events.reduce<CevioTrackPitchDataEvent[]>((acc, thisEvent) => {
    const lastEvent = acc[acc.length - 1];
    if (!lastEvent) return [thisEvent];
    const overlapped = (lastEvent.index ?? 0) + (lastEvent.repeat ?? 0) > (thisEvent.index ?? 0);
    if (overlapped) {
      const lastPoints = Array.from({ length: lastEvent.repeat ?? 0 }, (_, i) => [
        (lastEvent.index ?? 0) + i,
        lastEvent.value,
      ] as [number, number]);
      const thisPoints = Array.from({ length: thisEvent.repeat ?? 0 }, (_, i) => [
        (thisEvent.index ?? 0) + i,
        thisEvent.value,
      ] as [number, number]);
      const mergedByTick = new Map<number, number[]>();
      [...lastPoints, ...thisPoints].forEach(([tick, value]) => {
        const list = mergedByTick.get(tick) ?? [];
        list.push(value);
        mergedByTick.set(tick, list);
      });
      const mergedPoints = Array.from(mergedByTick.entries())
        .map(([tick, values]) => [tick, values.reduce((a, b) => a + b, 0) / values.length] as [number, number])
        .sort((a, b) => a[0] - b[0]);
      const mergedEvents = mergedPoints.reduce<CevioTrackPitchDataEvent[]>((acc2, [tick, value]) => {
        const last = acc2[acc2.length - 1];
        if (!last) return [{ index: tick, repeat: 1, value }];
        if (last.value === value) return [...acc2.slice(0, -1), { ...last, repeat: (last.repeat ?? 1) + 1 }];
        return [...acc2, { index: tick, repeat: 1, value }];
      }, []);
      return [...acc.slice(0, -1), ...mergedEvents];
    }
    const adjacent = (lastEvent.index ?? 0) + (lastEvent.repeat ?? 0) === (thisEvent.index ?? 0);
    const same = lastEvent.value === thisEvent.value;
    if (adjacent && same) {
      return [...acc.slice(0, -1), { ...lastEvent, repeat: (lastEvent.repeat ?? 0) + (thisEvent.repeat ?? 0) }];
    }
    return [...acc, thisEvent];
  }, []);
}

function removeRedundantIndex(events: CevioTrackPitchDataEvent[]): CevioTrackPitchDataEvent[] {
  if (events.length === 0) return events;
  return events.map((thisEvent, index) => {
    const lastEvent = events[index - 1];
    if (!lastEvent) return thisEvent;
    const adjacent = (lastEvent.index ?? 0) + (lastEvent.repeat ?? 0) === (thisEvent.index ?? 0);
    return adjacent ? { ...thisEvent, index: null } : thisEvent;
  });
}

function removeRedundantRepeat(events: CevioTrackPitchDataEvent[]): CevioTrackPitchDataEvent[] {
  return events.map((event) => (event.repeat === 1 ? { ...event, repeat: null } : event));
}
