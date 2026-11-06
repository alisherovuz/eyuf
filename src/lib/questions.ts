import type { Level, Question } from "./types";
import { GEN_BY_FAMILY, GENERATORS, generate, parseGenId } from "./gen";
import eyufRaw from "@/data/eyuf-items.json";
import bookRaw from "@/data/book-items.json";

interface ImageItem {
  id: string;
  file: string;
  family: string;
  rule: string;
  optionLetters: string[];
  answer: string;
  difficulty: number;
  explanation: string;
}

export const IMAGE_ITEMS: Record<string, ImageItem[]> = {
  eyuf: eyufRaw as ImageItem[],
  kitob: bookRaw as ImageItem[],
};
export const IMAGE_FAMILIES = Object.keys(IMAGE_ITEMS);

export const FAMILY_NAMES: Record<string, string> = {
  ...Object.fromEntries(GENERATORS.map((g) => [g.family, g.name])),
  eyuf: "EYUF namunalari",
  kitob: "PUZA kitobi",
};
export const FAMILIES = [...GENERATORS.map((g) => g.family), ...IMAGE_FAMILIES];

const PROMPTS: Record<string, string> = {
  eyuf: "Rasmdagi savolni yeching va to‘g‘ri javob harfini tanlang.",
  kitob: "PUZA kitobidan savol (matn turk va ingliz tilida). Rasmdagi savolni yeching va javob harfini tanlang.",
};

function imageQuestion(family: string, item: ImageItem): Question {
  const level = Math.min(3, Math.max(1, item.difficulty)) as Level;
  return {
    id: item.id,
    source: family === "eyuf" ? "eyuf" : "book",
    family,
    rule: item.id,
    fingerprint: `${family}|${item.id}`,
    level,
    prompt: PROMPTS[family],
    diagram: { kind: "image", src: item.file },
    options: item.optionLetters.map((l) => ({ text: l })),
    answer: item.optionLetters.indexOf(item.answer),
    explanation: [item.explanation],
    targetSec: [0, 60, 90, 120][level],
  };
}

const IMAGE_BY_ID = new Map(IMAGE_FAMILIES.flatMap((f) => IMAGE_ITEMS[f].map((i) => [i.id, { family: f, item: i }] as const)));

export function getQuestion(id: string): Question | null {
  const img = IMAGE_BY_ID.get(id);
  if (img) return imageQuestion(img.family, img.item);
  const p = parseGenId(id);
  if (!p || !GEN_BY_FAMILY[p.family]) return null;
  return generate(p.family, p.level, p.rule, p.seed);
}

const RULE_NAMES: Record<string, string> = {
  "tarozi:direct3": "3 belgi, bitta to‘g‘ridan-to‘g‘ri tenglik", "tarozi:mixed3": "3 belgi, aralash tengliklar", "tarozi:mixed4": "4 belgi, 3 ta tenglik",
  "amal:sum+k": "a + b + k", "amal:prod-k": "a · b − k", "amal:diff*k": "|a − b| · k", "amal:sum*k": "(a + b) · k", "amal:sq-diff": "a² − b²",
  "amal:ab+a": "a · b + a", "amal:sqrt-sum": "√a + √b", "amal:concat-diff-sum": "|a − b| va a + b yonma-yon", "amal:sqrt-prod*k": "√a · √b · k",
  "amal:a2+b": "a² + b", "amal:digitsum-prod": "raqamlar yig‘indilari ko‘paytmasi", "amal:ab-(a+b)": "a · b − (a + b)",
  "shifr:known-row": "berilgan qatorni ochish", "shifr:new-row": "yangi qatorni kodlash",
  "qator:arith": "teng qadam", "qator:geom": "barobar oshish", "qator:alt": "+p, −q navbatma-navbat", "qator:inc-diff": "o‘suvchi ayirma",
  "qator:interleave": "ikki qator aralash", "qator:xq+k": "× q + k", "qator:squares+k": "kvadratlar", "qator:fib": "oldingi ikkisining yig‘indisi",
  "qator:mul-add": "× va + navbatma-navbat", "qator:add-mul": "+ va × navbatma-navbat", "qator:diff-geom": "ayirmalar barobar oshadi", "qator:cubes+k": "kublar",
  "doira:opp-sum": "qarama-qarshi sonlar yig‘indisi", "doira:opp-prod": "qarama-qarshi sonlar ko‘paytmasi", "doira:opp-mul": "qarama-qarshi son barobari",
  "doira:opp-2a+k": "qarama-qarshi son × 2 + k", "doira:opp-sq+k": "qarama-qarshi son kvadrati",
  "kub:count": "kublarni sanash", "kub:missing": "yetishmayotgan kublar",
};

export function ruleName(family: string, rule: string) {
  if (family === "eyuf") return `EYUF savoli ${rule.replace("eyuf-", "№")}`;
  if (family === "kitob") {
    const it = IMAGE_BY_ID.get(rule)?.item;
    return it ? `${it.family}: ${it.rule}` : rule;
  }
  return RULE_NAMES[`${family}:${rule}`] ?? rule;
}
