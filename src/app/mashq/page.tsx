"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PublicQuestion } from "@/lib/types";
import { type Feedback, fmtTime, LETTERS, Options, QuestionBody, ReportBox, Solution, useElapsed } from "@/components/QuestionView";

interface Next { question: (PublicQuestion & { }) | null; reviewKey?: string | null; familyName?: string }

function Practice() {
  const params = useSearchParams();
  const family = params.get("f") ?? "";
  const reviewsOnly = params.get("takror") === "1";
  const [data, setData] = useState<Next | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [fb, setFb] = useState<(Feedback & { reviewNote?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState({ n: 0, right: 0 });
  const qid = data?.question?.id ?? "";
  const { ms } = useElapsed(!!data?.question && !fb, qid);

  const load = useCallback(async () => {
    setBusy(true); setError(null); setSelected(null); setFb(null);
    const qs = new URLSearchParams();
    if (family) qs.set("family", family);
    if (reviewsOnly) qs.set("review", "1");
    try {
      const r = await fetch(`/api/next?${qs}`);
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      setError("Savolni yuklab bo‘lmadi. Internetni tekshirib, qayta urining.");
    } finally {
      setBusy(false);
    }
  }, [family, reviewsOnly]);

  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async () => {
    if (selected === null || !data?.question || fb || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/answer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: data.question.id, chosen: selected, timeMs: ms, reviewKey: data.reviewKey ?? null }) });
      if (!r.ok) throw new Error();
      const res = await r.json();
      let reviewNote: string | undefined;
      if (!res.correct) reviewNote = "Xatolar daftariga qo‘shildi: ertaga shu usuldagi yangi savol bilan qaytadi.";
      else if (res.review?.resolved) reviewNote = "Bu xato to‘liq o‘zlashtirildi va daftardan chiqarildi.";
      else if (res.review) reviewNote = `Yaxshi. Keyingi takrorlash ${Math.round((res.review.dueAt - Date.now()) / 86400000)} kundan keyin.`;
      setFb({ chosen: selected, answer: res.answer, correct: res.correct, explanation: res.explanation, reviewNote });
      setCount((c) => ({ n: c.n + 1, right: c.right + (res.correct ? 1 : 0) }));
    } catch {
      setError("Javob saqlanmadi. Qayta bosing.");
    } finally {
      setBusy(false);
    }
  }, [selected, data, fb, busy, ms]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      const n = data?.question?.options.length ?? 0;
      const k = e.key.toUpperCase();
      const idx = /^[1-6]$/.test(k) ? Number(k) - 1 : LETTERS.indexOf(k);
      if (!fb && idx >= 0 && idx < n) setSelected(idx);
      if (e.key === "Enter") { if (fb) load(); else submit(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data, fb, load, submit]);

  const q = data?.question;
  const sec = ms / 1000;
  return (
    <div className="page">
      <div className="spread">
        <h1>{reviewsOnly ? "Takrorlash" : "Mashq"}</h1>
        <span className="small muted num">Bu safar: {count.right} / {count.n}</span>
      </div>
      {(family || reviewsOnly) && (
        <p className="small muted" style={{ margin: 0 }}>
          {reviewsOnly ? "Faqat vaqti kelgan xatolar." : `Faqat bitta bo‘lim.`} <Link href="/mashq">Aralash mashqqa o‘tish</Link>
        </p>
      )}
      {error && <div className="card small" style={{ borderColor: "var(--bad)" }}>{error} <button className="btn ghost" onClick={load}>Qayta urinish</button></div>}
      {!q && !busy && !error && (
        <div className="card stack">
          <b>{reviewsOnly ? "Hozircha takrorlanadigan xato yo‘q." : "Savol topilmadi."}</b>
          <Link className="btn primary" href="/mashq">Aralash mashq</Link>
        </div>
      )}
      {q && (
        <section className="stack" style={{ gap: 16 }}>
          <QuestionBody
            q={q}
            label={`${data?.familyName ?? ""}${data?.reviewKey ? " · takrorlash" : ""}`}
            timer={<span className={`timer${!fb && sec > q.targetSec ? " over" : ""}`}>{fmtTime(sec)} <span className="tiny muted">/ {fmtTime(q.targetSec)}</span></span>}
          />
          <Options q={q} selected={selected} onSelect={setSelected} feedback={fb} />
          {!fb ? (
            <button className="btn primary block" disabled={selected === null || busy} onClick={submit}>Javobni tekshirish</button>
          ) : (
            <>
              <Solution fb={fb} note={fb.reviewNote} />
              <button className="btn primary block" onClick={load} disabled={busy} autoFocus>Keyingi savol</button>
            </>
          )}
          <ReportBox key={q.id} questionId={q.id} />
        </section>
      )}
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="page"><p className="muted">Yuklanmoqda…</p></div>}><Practice /></Suspense>;
}
