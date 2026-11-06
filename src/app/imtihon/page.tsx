"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicQuestion } from "@/lib/types";
import { fmtTime, Options, QuestionBody } from "@/components/QuestionView";

type Q = PublicQuestion & { familyName: string };
interface Exam { id: number; kind: string; durationS: number; startedAt: string; serverNow: string; answers: Record<string, { chosen: number | null; timeMs: number }>; questions: Q[] }

export default function ExamPage() {
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/exam").then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => setExam(d.exam)).catch(() => setError("Yuklab bo‘lmadi. Sahifani yangilang.")).finally(() => setLoading(false));
  }, []);

  const start = async (kind: "full" | "mini") => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/exam", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind }) });
      if (!r.ok) throw new Error();
      setExam((await r.json()).exam);
    } catch {
      setError("Imtihonni boshlab bo‘lmadi. Qayta urining.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page"><p className="muted">Yuklanmoqda…</p></div>;
  if (exam) return <Runner exam={exam} onDone={(id) => router.push(`/imtihon/${id}`)} />;
  return (
    <div className="page">
      <h1>Imtihon simulyatori</h1>
      <p className="small muted" style={{ margin: 0 }}>
        Format: 2024-yilda xabar qilingan 30 savol / 60 daqiqa (rasmiy spetsifikatsiya emas). Javoblar va yechimlar oxirida ko‘rsatiladi.
      </p>
      {error && <div className="card small">{error}</div>}
      <div className="grid2">
        <div className="card stack">
          <span className="eyebrow">To‘liq</span>
          <b style={{ fontSize: 20 }}>30 savol · 60 daqiqa</b>
          <span className="small muted">8 ta EYUF namunasi + 22 ta o‘rta va qiyin savol.</span>
          <button className="btn primary" onClick={() => start("full")}>Boshlash</button>
        </div>
        <div className="card stack">
          <span className="eyebrow">Mini</span>
          <b style={{ fontSize: 20 }}>10 savol · 20 daqiqa</b>
          <span className="small muted">Kunlik qisqa sinov uchun.</span>
          <button className="btn" onClick={() => start("mini")}>Boshlash</button>
        </div>
      </div>
    </div>
  );
}

function Runner({ exam, onDone }: { exam: Exam; onDone: (id: number) => void }) {
  const offset = useRef(Date.parse(exam.serverNow) - Date.now());
  const end = Date.parse(exam.startedAt) + exam.durationS * 1000;
  const [now, setNow] = useState(Date.now() + offset.current);
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { chosen: number | null; timeMs: number }>>(exam.answers);
  const [confirm, setConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const enteredAt = useRef(Date.now());
  const spent = useRef<Record<number, number>>(Object.fromEntries(Object.entries(exam.answers).map(([k, v]) => [Number(k), v.timeMs])));

  const remaining = Math.max(0, (end - now) / 1000);

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    const r = await fetch("/api/exam/finish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ examId: exam.id }) }).catch(() => null);
    if (r?.ok) onDone(exam.id);
    else { setFinishing(false); setSaveErr(true); }
  }, [exam.id, finishing, onDone]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset.current), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (remaining <= 0) finish(); }, [remaining, finish]);

  const leave = () => {
    spent.current[cur] = (spent.current[cur] ?? 0) + (Date.now() - enteredAt.current);
    enteredAt.current = Date.now();
  };
  const go = (i: number) => { leave(); setCur(i); setConfirm(false); };

  const choose = async (i: number) => {
    const chosen = answers[cur]?.chosen === i ? null : i;
    leave();
    const timeMs = spent.current[cur] ?? 0;
    setAnswers((a) => ({ ...a, [cur]: { chosen, timeMs } }));
    const r = await fetch("/api/exam/answer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ examId: exam.id, index: cur, chosen, timeMs }) }).catch(() => null);
    setSaveErr(!r?.ok);
  };

  const q = exam.questions[cur];
  const answered = Object.values(answers).filter((a) => a.chosen !== null).length;
  const unanswered = exam.questions.length - answered;

  return (
    <div className="page">
      <div className="card spread" style={{ position: "sticky", top: 62, zIndex: 10, padding: "12px 16px" }}>
        <span className={`countdown${remaining < 300 ? " low" : ""}`} aria-live="off">{fmtTime(remaining)}</span>
        <span className="small muted num">{answered} / {exam.questions.length} javob</span>
        {!confirm ? (
          <button className="btn" onClick={() => setConfirm(true)} disabled={finishing}>Yakunlash</button>
        ) : (
          <div className="row">
            <span className="small">{unanswered ? `${unanswered} ta savol javobsiz.` : "Hammasi javoblangan."} Yakunlaysizmi?</span>
            <button className="btn accent" onClick={finish} disabled={finishing}>Ha, yakunlash</button>
            <button className="btn ghost" onClick={() => setConfirm(false)}>Yo‘q</button>
          </div>
        )}
      </div>
      {saveErr && <div className="card small" style={{ borderColor: "var(--bad)" }}>Javob serverga saqlanmadi. Internetni tekshiring; tanlov qayta bosilganda saqlanadi.</div>}
      <nav className="qnav" aria-label="Savollar">
        {exam.questions.map((_, i) => (
          <button key={i} className={`${answers[i]?.chosen != null ? "done" : ""} ${i === cur ? "cur" : ""}`} onClick={() => go(i)} aria-label={`${i + 1}-savol`} aria-current={i === cur ? "true" : undefined}>{i + 1}</button>
        ))}
      </nav>
      <section className="stack" style={{ gap: 16 }}>
        <QuestionBody q={q} label={`${cur + 1}-savol · ${q.familyName}`} />
        <Options q={q} selected={answers[cur]?.chosen ?? null} onSelect={choose} />
        <div className="spread">
          <button className="btn" disabled={cur === 0} onClick={() => go(cur - 1)}>← Oldingi</button>
          <button className="btn primary" disabled={cur === exam.questions.length - 1} onClick={() => go(cur + 1)}>Keyingi →</button>
        </div>
      </section>
    </div>
  );
}
