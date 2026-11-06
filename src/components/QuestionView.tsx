"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicQuestion } from "@/lib/types";
import { Diagram } from "./Diagram";
import { SymRow } from "./Sym";

export const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function useElapsed(running: boolean, resetKey: string) {
  const start = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { start.current = Date.now(); setNow(Date.now()); }, [resetKey]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [running]);
  return { ms: now - start.current, startedAt: start };
}

export interface Feedback { chosen: number; answer: number; correct: boolean; explanation: string[] }

export function Options({ q, selected, onSelect, feedback }: { q: PublicQuestion; selected: number | null; onSelect: (i: number) => void; feedback?: Feedback | null }) {
  const lettersOnly = q.options.every((o) => o.text && o.text.length === 1 && LETTERS.includes(o.text));
  return (
    <div className={`opts${lettersOnly ? " letters" : ""}`} role="radiogroup" aria-label="Javob variantlari">
      {q.options.map((o, i) => {
        let cls = "opt";
        if (feedback) {
          if (i === feedback.answer) cls += " right";
          else if (i === feedback.chosen) cls += " wrong";
        } else if (selected === i) cls += " sel";
        return (
          <button key={i} type="button" role="radio" aria-checked={selected === i} className={cls} disabled={!!feedback} onClick={() => onSelect(i)}>
            {lettersOnly ? (
              <span className="letter" style={{ width: 34, height: 34, fontSize: 16 }}>{o.text}</span>
            ) : (
              <>
                <span className="letter">{LETTERS[i]}</span>
                {o.syms ? <SymRow syms={o.syms} size={18} gap={4} /> : <span className="val">{o.text}</span>}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function QuestionBody({ q, label, timer }: { q: PublicQuestion; label: string; timer?: React.ReactNode }) {
  return (
    <>
      <div className="q-head">
        <span className="pill accent">{label}</span>
        {timer}
      </div>
      <p className="q-prompt" style={{ margin: 0 }}>{q.prompt}</p>
      <Diagram d={q.diagram} />
    </>
  );
}

export function Solution({ fb, note }: { fb: Feedback; note?: string }) {
  return (
    <div className="solution" aria-live="polite">
      <div className="row">
        <span className={`pill ${fb.correct ? "good" : "bad"}`}>{fb.correct ? "To‘g‘ri" : "Noto‘g‘ri"}</span>
        <span className="small muted">To‘g‘ri javob: {LETTERS[fb.answer]}</span>
      </div>
      <b className="small">Yechim</b>
      {fb.explanation.map((l, i) => <p key={i} className="small">{l}</p>)}
      {note && <p className="tiny muted">{note}</p>}
    </div>
  );
}

export function ReportBox({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  if (state === "sent") return <p className="tiny muted">Xabar yuborildi. Bu savol tekshirilmaguncha hisobga olinmaydi.</p>;
  if (!open) return <button type="button" className="btn ghost tiny" onClick={() => setOpen(true)}>Savolda xato bormi? Xabar bering</button>;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label htmlFor={`note-${questionId}`} className="small">Nima noto‘g‘ri? (ixtiyoriy)</label>
      <textarea id={`note-${questionId}`} className="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: ikkita javob to‘g‘ri chiqyapti" />
      <div className="row">
        <button type="button" className="btn" disabled={state === "sending"} onClick={async () => {
          setState("sending");
          const r = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId, note }) }).catch(() => null);
          setState(r?.ok ? "sent" : "error");
        }}>Yuborish</button>
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Bekor qilish</button>
        {state === "error" && <span className="tiny" style={{ color: "var(--bad)" }}>Yuborilmadi. Internetni tekshirib, qayta urining.</span>}
      </div>
    </div>
  );
}
