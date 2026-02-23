type MaybePoint = [number, number | null];

export function resampled(
  points: MaybePoint[],
  interval: number,
  interpolateMethod: (
    prev: MaybePoint | undefined,
    next: MaybePoint | undefined,
    pos: number,
  ) => number | null,
): MaybePoint[] {
  const result: MaybePoint[] = [];
  const leftBound = points.reduce<number | undefined>((acc, [tick]) => (acc == null ? tick : Math.min(acc, tick)), undefined) ?? 0;
  const rightBound = points.reduce<number | undefined>((acc, [tick]) => (acc == null ? tick : Math.max(acc, tick)), undefined) ?? 0;
  for (let current = leftBound; current <= rightBound; current += interval) {
    const prev = [...points].reverse().find(([tick]) => tick <= current);
    const next = points.find(([tick]) => tick >= current);
    result.push([current, interpolateMethod(prev, next, current)]);
  }
  return result;
}

export function dotResampled(points: MaybePoint[], interval: number): MaybePoint[] {
  return resampled(points, interval, (prev, next) => prev?.[1] ?? next?.[1] ?? null);
}

