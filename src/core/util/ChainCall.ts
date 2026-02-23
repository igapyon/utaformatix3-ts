export function runIf<T>(
  value: T,
  condition: boolean | ((value: T) => boolean),
  block: (value: T) => T,
): T {
  const predicate = typeof condition === "function" ? condition(value) : condition;
  return predicate ? block(value) : value;
}

export function runIfAllNotNull<T, R1, R2>(
  value: T,
  parameter1: R1 | null | undefined,
  parameter2: R2 | null | undefined,
  block: (value: T, parameter1: R1, parameter2: R2) => T,
): T {
  if (parameter1 != null && parameter2 != null) {
    return block(value, parameter1, parameter2);
  }
  return value;
}
