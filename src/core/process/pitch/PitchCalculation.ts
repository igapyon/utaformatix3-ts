export function appendPitchPointsForInterpolation(
  points: Array<[number, number]>,
  intervalTick: number,
): Array<[number, number]> {
  if (points.length === 0) {
    return [];
  }

  const result: Array<[number, number]> = [points[0]];

  for (let i = 0; i < points.length - 1; i += 1) {
    const lastPoint = points[i];
    const thisPoint = points[i + 1];
    const tickDiff = thisPoint[0] - lastPoint[0];

    if (tickDiff >= intervalTick && tickDiff < 2 * intervalTick) {
      result.push([Math.trunc((thisPoint[0] + lastPoint[0]) / 2), lastPoint[1]]);
    } else if (tickDiff >= 2 * intervalTick) {
      result.push([thisPoint[0] - intervalTick, lastPoint[1]]);
    }
    result.push(thisPoint);
  }

  return result;
}

export function reduceRepeatedPitchPoints(points: Array<[number, number]>): Array<[number, number]> {
  const toBeRemoved = new Set<number>();
  let currentRepeatedValue: number | null = null;
  let prevPoint: [number, number] | null = null;

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    if (prevPoint == null) {
      prevPoint = point;
      continue;
    }

    if (currentRepeatedValue == null) {
      if (prevPoint[1] === point[1]) {
        currentRepeatedValue = point[1];
      }
      prevPoint = point;
      continue;
    }

    if (currentRepeatedValue === point[1]) {
      toBeRemoved.add(i - 1);
    } else {
      currentRepeatedValue = null;
    }

    prevPoint = point;
  }

  return points.filter((_, index) => !toBeRemoved.has(index));
}
