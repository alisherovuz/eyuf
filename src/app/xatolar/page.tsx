"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Review { key: string; name: string; ruleName: string; family: string; dueAt: number; step: number; wrongCount: number; due: boolean }

function when(ms: number) {
  const days = Math.ceil((ms - Date.now()) / 86_400_000);
  if (days <= 0) return "hozir";
  if (days === 1) return "ertaga";
  return `${days} kundan keyin`;
}

export default function Mistakes() {
  const [list, setList] = useState<Review[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch("/api/reviews").then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => setList(d.reviews)).catch(() => setErr(true));
  }, []);
  const due = list?.filter((r) => r.due).length ?? 0;
  return (
    <div className="page">
      <h1>Xatolar daftari</h1>
      <p className="small muted" style={{ margin: 0 }}>Har bir xato 1, 3 va 7 kundan keyin yangi variant bilan qaytadi. Uch marta ketma-ket to‘g‘ri yechilsa, daftardan chiqadi.</p>
      {err && <div className="card">Yuklab bo‘lmadi. Sahifani yangilang.</div>}
      {list && list.length === 0 && <div className="card">Hozircha xato yo‘q. <Link href="/mashq">Mashqni boshlang</Link>.</div>}
      {list && list.length > 0 && (
        <>
          <div className="row">
            <Link className={`btn ${due ? "primary" : ""}`} href="/mashq?takror=1" aria-disabled={!due}>
              {due ? `Hozir takrorlash · ${due}` : "Hozircha takrorlash vaqti kelmagan"}
            </Link>
          </div>
          <div className="card scroll-x" style={{ padding: "6px 14px" }}>
            <table className="t">
              <thead><tr><th>Bo‘lim</th><th>Usul</th><th>Xato</th><th>Bosqich</th><th>Qachon</th></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.key}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td className="small">{r.ruleName}</td>
                    <td className="num small">{r.wrongCount}×</td>
                    <td className="num small">{r.step + 1} / 3</td>
                    <td><span className={`pill ${r.due ? "bad" : ""}`}>{when(r.dueAt)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
