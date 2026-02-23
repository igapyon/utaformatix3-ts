type Point = [number, number];

function perpendicularDistance(pt: Point, lineStart: Point, lineEnd: Point): number {
  let dx = lineEnd[0] - lineStart[0];
  let dy = lineEnd[1] - lineStart[1];
  const mag = Math.hypot(dx, dy);
  if (mag > 0.0) {
    dx /= mag;
    dy /= mag;
  }
  const pvx = pt[0] - lineStart[0];
  const pvy = pt[1] - lineStart[1];
  const pvdot = dx * pvx + dy * pvy;
  const ax = pvx - pvdot * dx;
  const ay = pvy - pvdot * dy;
  return Math.hypot(ax, ay);
}

export function simplifyShape(pointList: Point[], epsilon: number): Point[] {
  if (pointList.length < 2) {
    return pointList;
  }
  let dmax = 0.0;
  let index = 0;
  const end = pointList.length - 1;
  for (let i = 1; i < end; i += 1) {
    const d = perpendicularDistance(pointList[i], pointList[0], pointList[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }
  if (dmax > epsilon) {
    const firstLine = pointList.slice(0, index + 1);
    const lastLine = pointList.slice(index);
    const recResults1 = simplifyShape(firstLine, epsilon);
    const recResults2 = simplifyShape(lastLine, epsilon);
    return [...recResults1.slice(0, recResults1.length - 1), ...recResults2];
  }
  return [pointList[0], pointList[pointList.length - 1]];
}

export function simplifyShapeTo(pointList: Point[], maxPointCount: number): Point[] {
  const step = 0.05;
  let epsilon = step;
  while (true) {
    const result = simplifyShape(pointList, epsilon);
    if (result.length < maxPointCount) {
      return result;
    }
    epsilon += step;
  }
}

