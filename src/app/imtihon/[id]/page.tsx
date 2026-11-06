"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { PublicQuestion } from "@/lib/types";
import { fmtTime, LETTERS, Options, QuestionBody, Solution } from "@/components/QuestionView";

interface Item { index: number; question: PublicQuestion; familyName: string; chosen: number | null; answer: number; correct: boolean; timeSec: number; explanation: string[] }
interface Result { id: number; kind: string; score: number; n: number; durationS: number; usedS: number; byFamily: { family: string; name: string; n: number; correct: number; avgSec: number }[]; items: Item[] }

export default function ExamResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [r, setR] = useState<Result | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch(`/api/exam/${id}`).then((x) => (x.ok ? x.json() : Promise.reject())).then((d) => setR(d.result)).catch(() => setErr(true));
  }, [id]);
  if (err) return <div className="page"><div className="card">Natija topilmadi. <Link href="/imtihon">Imtihonlar</Link></div></div>;
  if (!r) return <div className="page"><p className="muted">Yuklanmoqda…</p></div>;
  const slow = [...r.items].sort((a, b) => b.timeSec - a.timeSec).slice(0, 3);
  return (
    <div className="page">
      <div className="spread">
        <h1>Imtihon natijasi</h1>
        <Link className="btn" href="/imtihon">Yangi imtihon</Link>
      </div>
      <section className="card stack">
        <div className="spread">
          <div className="big-num num">{r.score} / {r.n}</div>
          <span className="pill num">{Math.round((r.score / r.n) * 100)}%</span>
        </div>
        <span className="small muted num">Sarflangan vaqt: {fmtTime(r.usedS)} / {fmtTime(r.durationS)} · Eng sekin savollar: {slow.map((s) => `${s.index + 1} (${fmtTime(s.timeSec)})`).join(", ")}</span>
      </section>
      <section className="card scroll-x" style={{ padding: "6px 14px" }}>
        <table className="t">
          <thead><tr><th>Bo‘lim</th><th>Natija</th><th>O‘rtacha vaqt</th></tr></thead>
          <tbody>
            {r.byFamily.map((f) => (
              <tr key={f.family}>
                <td style={{ fontWeight: 600 }}>{f.name}</td>
                <td style={{ minWidth: 120 }}>
                  <span className="num small">{f.correct} / {f.n}</span>
                  <div className="bar"><i className={f.correct / f.n < 0.6 ? "warn" : "ok"} style={{ width: `${(f.correct / f.n) * 100}%` }} /></div>
                </td>
                <td className="num small">{fmtTime(f.avgSec)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="stack">
        <h2>Savollar tahlili</h2>
        {r.items.map((it) => (
          <details key={it.index} className="card" open={!it.correct && it.index === r.items.find((x) => !x.correct)?.index}>
            <summary className="spread" style={{ cursor: "pointer", listStyle: "none" }}>
              <span><b className="num">{it.index + 1}.</b> {it.familyName}</span>
              <span className="row">
                <span className="tiny muted num">{fmtTime(it.timeSec)}</span>
                <span className={`pill ${it.correct ? "good" : "bad"}`}>{it.correct ? "To‘g‘ri" : it.chosen === null ? "Javobsiz" : `Xato: ${LETTERS[it.chosen]}`}</span>
              </span>
            </summary>
            <div className="stack" style={{ marginTop: 14 }}>
              <QuestionBody q={it.question} label={it.familyName} />
              <Options q={it.question} selected={it.chosen} onSelect={() => {}} feedback={{ chosen: it.chosen ?? -1, answer: it.answer, correct: it.correct, explanation: it.explanation }} />
              <Solution fb={{ chosen: it.chosen ?? -1, answer: it.answer, correct: it.correct, explanation: it.explanation }} note={it.correct ? undefined : "Xatolar daftariga qo‘shildi."} />
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
