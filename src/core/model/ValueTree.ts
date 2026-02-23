import type { ValueTree } from "../external/ValueTree";

export interface VariantType<T> {
  type: string;
  value: T;
}

export function createValueTree(): ValueTree {
  return {
    type: "",
    attributes: {},
    children: [],
  };
}

export function baseVariantType(): VariantType<unknown> {
  return {
    type: "",
    value: undefined,
  };
}

export function stringToVariantType(value: string): VariantType<string> {
  return {
    type: "string",
    value,
  };
}

export function intToVariantType(value: number): VariantType<number> {
  return {
    type: "int",
    value,
  };
}

export function doubleToVariantType(value: number): VariantType<number> {
  return {
    type: "double",
    value,
  };
}

export function booleanToVariantType(value: boolean): VariantType<boolean> {
  return {
    type: value ? "boolTrue" : "boolFalse",
    value,
  };
}

export function binaryToVariantType(value: Uint8Array): VariantType<Uint8Array> {
  return {
    type: "binary",
    value,
  };
}
