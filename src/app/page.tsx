"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Fam { family: string; name: string; attempts: number; accuracy: number | null; avgSec: number | null; freshAccuracy: number | null; level: number | null }
interface Stats {
  daysLeft: number; examDate: string; goal: number; doneToday: number; correctToday: number; dueReviews: number; openReviews: number;
  examToday: boolean; total: number; freshAccuracy: number | null; families: Fam[];
  exams: { id: number; kind: string; score: number | null; n: number; finishedAt?: string }[];
}

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const LEVELS = ["", "Oson", "O‘rta", "Qiyin"];

export default function Home() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch("/api/stats").then((r) => (r.ok ? r.json() : Promise.reject())).then(setS).catch(() => setErr(true));
  }, []);

  if (err) return <div className="page"><div className="card">Ma’lumotlarni yuklab bo‘lmadi. Sahifani yangilang.</div></div>;
  if (!s) return <div className="page"><p className="muted">Yuklanmoqda…</p></div>;

  const left = Math.max(0, s.goal - s.doneToday);
  const weakest = [...s.families].filter((f) => f.accuracy !== null && f.attempts >= 3).sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))[0];

  return (
    <div className="page">
      <section className="card stack" style={{ gap: 14 }}>
        <div className="spread">
          <div>
            <div className="eyebrow">Imtihongacha</div>
            <div className="big-num num">{s.daysLeft} <span style={{ fontSize: 20 }}>kun</span></div>
          </div>
          <span className="pill accent">Taxminiy sana: {s.examDate.split("-").reverse().join(".")}</span>
        </div>
        <div>
          <div className="spread small"><span>Bugungi reja</span><span className="num">{s.doneToday} / {s.goal} savol</span></div>
          <div className="bar" style={{ marginTop: 6 }}><i className={s.doneToday >= s.goal ? "ok" : ""} style={{ width: `${Math.min(100, (s.doneToday / s.goal) * 100)}%` }} /></div>
        </div>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 2 }}>
          <li>{left > 0 ? `${left} ta yangi savol qoldi` : "Bugungi savollar bajarildi"}</li>
          <li>{s.dueReviews > 0 ? `${s.dueReviews} ta xatoni takrorlash vaqti keldi` : "Takrorlash uchun xato yo‘q"}</li>
          <li>{s.examToday ? "Bugun imtihon topshirildi" : "Bugun bitta imtihon (to‘liq yoki mini) topshiring"}</li>
        </ul>
        <div className="row">
          <Link className="btn primary" href="/mashq">Mashqni boshlash</Link>
          {s.dueReviews > 0 && <Link className="btn" href="/mashq?takror=1">Xatolarni takrorlash · {s.dueReviews}</Link>}
          <Link className="btn" href="/imtihon">Imtihon</Link>
        </div>
      </section>

      <section className="stack">
        <div className="spread">
          <h2>Bo‘limlar</h2>
          <span className="small muted">Yangi savollarda aniqlik: <b className="num">{pct(s.freshAccuracy)}</b></span>
        </div>
        {weakest && <p className="small muted" style={{ margin: 0 }}>Eng zaif bo‘lim: <b>{weakest.name}</b>. Mashq bu bo‘limni ko‘proq beradi.</p>}
        <div className="card scroll-x" style={{ padding: "6px 14px" }}>
          <table className="t">
            <thead><tr><th>Bo‘lim</th><th>Aniqlik</th><th>O‘rtacha vaqt</th><th>Daraja</th><th /></tr></thead>
            <tbody>
              {s.families.map((f) => (
                <tr key={f.family}>
                  <td style={{ fontWeight: 600 }}>{f.name}<div className="tiny muted num">{f.attempts} ta urinish</div></td>
                  <td style={{ minWidth: 110 }}>
                    <div className="num small">{pct(f.accuracy)}</div>
                    <div className="bar"><i className={f.accuracy !== null && f.accuracy < 0.6 ? "warn" : ""} style={{ width: `${(f.accuracy ?? 0) * 100}%` }} /></div>
                  </td>
                  <td className="num small">{f.avgSec === null ? "—" : `${f.avgSec} s`}</td>
                  <td className="small">{f.level ? LEVELS[f.level] : "—"}</td>
                  <td><Link href={`/mashq?f=${f.family}`} className="small">Mashq</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {s.exams.length > 0 && (
        <section className="stack">
          <h2>Oxirgi imtihonlar</h2>
          <div className="card" style={{ padding: "6px 14px" }}>
            <table className="t">
              <tbody>
                {s.exams.map((e) => (
                  <tr key={e.id}>
                    <td>{e.kind === "mini" ? "Mini" : "To‘liq"}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{e.score ?? 0} / {e.n}</td>
                    <td className="small muted num">{e.finishedAt ? new Date(e.finishedAt).toLocaleDateString("uz-UZ", { timeZone: "Asia/Tashkent" }) : ""}</td>
                    <td><Link href={`/imtihon/${e.id}`} className="small">Tahlil</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
