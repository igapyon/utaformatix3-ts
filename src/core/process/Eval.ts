export function evalFractionOrNull(source: string): number | null {
  const asNumber = Number(source);
  if (Number.isFinite(asNumber)) {
    return asNumber;
  }
  const fractionIndex = source.indexOf("/");
  if (fractionIndex <= 0) {
    return null;
  }
  const left = Number.parseInt(source.slice(0, fractionIndex), 10);
  const right = Number.parseInt(source.slice(fractionIndex + 1), 10);
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return null;
  }
  return left / right;
}

