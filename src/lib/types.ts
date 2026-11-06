export type Sym = "sq" | "cir" | "tri" | "star" | "dia" | "plus" | "hex";

export type Diagram =
  | { kind: "scales"; pans: { left: Sym[]; right: Sym[] }[]; ask: Sym[] }
  | { kind: "equations"; lines: string[]; ask: string }
  | { kind: "cipher"; rows: Sym[][]; codes: string[]; ask: Sym[] }
  | { kind: "series"; items: (number | null)[] }
  | { kind: "wheel"; spokes: (number | null)[]; center: number | null }
  | { kind: "cubes"; heights: number[][]; box?: [number, number, number] }
  | { kind: "image"; src: string };

export type Option = { text?: string; syms?: Sym[] };

export type Level = 1 | 2 | 3;

export interface Question {
  id: string;
  source: "generator" | "eyuf" | "book";
  family: string;
  rule: string;
  fingerprint: string;
  level: Level;
  prompt: string;
  diagram: Diagram;
  options: Option[];
  answer: number;
  explanation: string[];
  targetSec: number;
}

export type PublicQuestion = Omit<Question, "answer" | "explanation" | "fingerprint">;

export function toPublic(q: Question): PublicQuestion {
  const { answer: _a, explanation: _e, fingerprint: _f, ...rest } = q;
  return rest;
}
