type Point = [number, number];
type Mapping = (start: Point, end: Point, input: number[]) => Point[];

function interpolate(points: Point[], samplingIntervalTick: number, mapping: Mapping): Point[] | undefined {
  if (points.length === 0) {
    return undefined;
  }
  const output: Point[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const indexes: number[] = [];
    for (let x = start[0] + 1; x < end[0]; x += 1) {
      if ((x - start[0]) % samplingIntervalTick === 0) {
        indexes.push(x);
      }
    }
    output.push(start, ...mapping(start, end, indexes));
  }
  output.push(points[points.length - 1]);
  return output;
}

export function interpolateLinear(points: Point[], samplingIntervalTick: number): Point[] | undefined {
  return interpolate(points, samplingIntervalTick, (start, end, indexes) => {
    const [x0, y0] = start;
    const [x1, y1] = end;
    return indexes.map((x) => [x, y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)]);
  });
}

export function interpolateCosineEaseInOut(points: Point[], samplingIntervalTick: number): Point[] | undefined {
  return interpolate(points, samplingIntervalTick, (start, end, indexes) => {
    const [x0, y0] = start;
    const [x1, y1] = end;
    const xOffset = x0;
    const yOffset = (y0 + y1) / 2;
    const aFreq = Math.PI / (x1 - x0);
    const amp = (y0 - y1) / 2;
    return indexes.map((x) => [x, amp * Math.cos(aFreq * (x - xOffset)) + yOffset]);
  });
}

export function interpolateCosineEaseIn(points: Point[], samplingIntervalTick: number): Point[] | undefined {
  return interpolate(points, samplingIntervalTick, (start, end, indexes) => {
    const [x0, y0] = start;
    const [x1, y1] = end;
    const xOffset = x0;
    const yOffset = y1;
    const aFreq = Math.PI / (x1 - x0) / 2;
    const amp = y0 - y1;
    return indexes.map((x) => [x, amp * Math.cos(aFreq * (x - xOffset)) + yOffset]);
  });
}

export function interpolateCosineEaseOut(points: Point[], samplingIntervalTick: number): Point[] | undefined {
  return interpolate(points, samplingIntervalTick, (start, end, indexes) => {
    const [x0, y0] = start;
    const [x1, y1] = end;
    const xOffset = x0;
    const yOffset = y0;
    const aFreq = Math.PI / (x1 - x0) / 2;
    const amp = y0 - y1;
    const phase = Math.PI / 2;
    return indexes.map((x) => [x, amp * Math.cos(aFreq * (x - xOffset) + phase) + yOffset]);
  });
}

