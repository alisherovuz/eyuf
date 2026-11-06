"use client";

import { useState } from "react";
import type { Diagram as D, Sym } from "@/lib/types";
import { SymShape } from "./Sym";

const INK = "var(--ink)";
const MUTED = "var(--muted)";

function PanSyms({ syms, cx, y }: { syms: Sym[]; cx: number; y: number }) {
  const s = 17, gap = 4;
  const w = syms.length * s + (syms.length - 1) * gap;
  return <>{syms.map((sym, i) => <SymShape key={i} sym={sym} x={cx - w / 2 + i * (s + gap) + s / 2} y={y} s={s} />)}</>;
}

function Balance({ left, right, y, ask }: { left: Sym[]; right: Sym[] | null; y: number; ask?: boolean }) {
  const L = 80, R = 260, beam = y + 14, tray = y + 64;
  return (
    <g>
      <line x1={L - 52} y1={beam} x2={R + 52} y2={beam} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <line x1={170} y1={beam} x2={170} y2={y + 86} stroke={MUTED} strokeWidth={3} />
      <path d={`M150 ${y + 92}h40l-6 -6h-28z`} fill={MUTED} />
      <circle cx={170} cy={beam} r={4} fill={INK} />
      {[L, R].map((cx) => (
        <g key={cx}>
          <line x1={cx - 50} y1={beam} x2={cx - 44} y2={tray} stroke={MUTED} strokeWidth={1.2} />
          <line x1={cx + 50} y1={beam} x2={cx + 44} y2={tray} stroke={MUTED} strokeWidth={1.2} />
          <path d={`M${cx - 54} ${tray}h108l-8 7h-92z`} fill={MUTED} />
        </g>
      ))}
      <PanSyms syms={left} cx={L} y={tray - 12} />
      {right ? <PanSyms syms={right} cx={R} y={tray - 12} /> : (
        <text x={R} y={tray - 4} textAnchor="middle" fontSize={26} fontWeight={700} fill="var(--accent)">?</text>
      )}
      {ask && <rect x={2} y={y} width={336} height={100} rx={12} fill="none" stroke="var(--accent)" strokeDasharray="5 5" />}
    </g>
  );
}

function Scales({ d }: { d: Extract<D, { kind: "scales" }> }) {
  const rows = [...d.pans.map((p) => ({ ...p, ask: false })), { left: d.ask, right: null, ask: true }];
  const h = rows.length * 112;
  return (
    <svg viewBox={`0 0 340 ${h}`} width={340} role="img" aria-label="Tarozilar">
      {rows.map((r, i) => <Balance key={i} left={r.left} right={r.right} y={i * 112 + 4} ask={r.ask} />)}
    </svg>
  );
}

function Cipher({ d }: { d: Extract<D, { kind: "cipher" }> }) {
  const s = 22, gap = 8, rowH = 38;
  const len = Math.max(...d.rows.map((r) => r.length));
  const symW = len * s + (len - 1) * gap;
  const codeX = symW + 70;
  const h = d.rows.length * rowH;
  const total = h + 70;
  return (
    <svg viewBox={`0 0 ${codeX + 90} ${total}`} width={codeX + 90} role="img" aria-label="Belgilar va kodlar">
      {d.rows.map((row, i) => row.map((sym, j) => <SymShape key={`${i}-${j}`} sym={sym} x={j * (s + gap) + s / 2 + 4} y={i * rowH + rowH / 2} s={s} />))}
      <path d={`M${symW + 26} 6 q10 0 10 12 v${h / 2 - 26} q0 10 10 10 q-10 0 -10 10 v${h / 2 - 26} q0 12 -10 12`} fill="none" stroke={MUTED} strokeWidth={2} />
      {d.codes.map((c, i) => (
        <text key={c + i} x={codeX} y={i * rowH + rowH / 2 + 7} fontSize={20} fontFamily="var(--mono)" fontWeight={600} fill={INK} letterSpacing={3}>{c}</text>
      ))}
      <line x1={0} y1={h + 12} x2={codeX + 90} y2={h + 12} stroke="var(--line)" />
      {d.ask.map((sym, j) => <SymShape key={j} sym={sym} x={j * (s + gap) + s / 2 + 4} y={h + 44} s={s} />)}
      <text x={symW + 22} y={h + 52} fontSize={22} fontWeight={700} fill="var(--accent)">= ?</text>
    </svg>
  );
}

function Wheel({ d }: { d: Extract<D, { kind: "wheel" }> }) {
  const R = 130, r0 = 40, C = 140;
  const ang = (i: number) => ((-90 + i * 45) * Math.PI) / 180;
  return (
    <svg viewBox="0 0 280 280" width={280} role="img" aria-label="Son doirasi">
      <circle cx={C} cy={C} r={R} fill="var(--surface)" stroke={INK} strokeWidth={2} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = ((-90 + 22.5 + i * 45) * Math.PI) / 180;
        return <line key={i} x1={C + r0 * Math.cos(a)} y1={C + r0 * Math.sin(a)} x2={C + R * Math.cos(a)} y2={C + R * Math.sin(a)} stroke={INK} strokeWidth={1.5} />;
      })}
      <circle cx={C} cy={C} r={r0} fill="var(--surface-2)" stroke={INK} strokeWidth={2} />
      {d.spokes.map((v, i) => (
        <text key={i} x={C + 88 * Math.cos(ang(i))} y={C + 88 * Math.sin(ang(i)) + 8} textAnchor="middle" fontSize={22} fontWeight={700}
          fontFamily="var(--mono)" fill={v === null ? "var(--accent)" : INK}>{v === null ? "?" : v}</text>
      ))}
      {d.center !== null && <text x={C} y={C + 8} textAnchor="middle" fontSize={22} fontWeight={700} fontFamily="var(--mono)" fill={INK}>{d.center}</text>}
    </svg>
  );
}

function Cubes({ d }: { d: Extract<D, { kind: "cubes" }> }) {
  const s = 26, c = s * Math.cos(Math.PI / 6), hh = s / 2;
  const P = (x: number, y: number, z: number) => [(x - y) * c, (x + y) * hh - z * s] as const;
  const cubes: [number, number, number][] = [];
  d.heights.forEach((row, y) => row.forEach((h, x) => { for (let z = 0; z < h; z++) cubes.push([x, y, z]); }));
  cubes.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]) || a[2] - b[2]);
  const pts: (readonly [number, number])[] = [];
  const rows = d.heights.length, cols = d.heights[0].length;
  const H = d.box ? d.box[2] : Math.max(...d.heights.flat());
  for (const x of [0, cols]) for (const y of [0, rows]) for (const z of [0, H]) pts.push(P(x, y, z));
  const minX = Math.min(...pts.map((p) => p[0])) - 6, maxX = Math.max(...pts.map((p) => p[0])) + 6;
  const minY = Math.min(...pts.map((p) => p[1])) - 6, maxY = Math.max(...pts.map((p) => p[1])) + 6;
  const poly = (ps: (readonly [number, number])[]) => ps.map((p) => p.join(",")).join(" ");
  const line = (a: readonly [number, number], b: readonly [number, number], k: string) => (
    <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="5 4" />
  );
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} width={Math.min(420, maxX - minX)} role="img" aria-label="Kublardan yasalgan shakl">
      {cubes.map(([x, y, z], i) => (
        <g key={i} stroke={INK} strokeWidth={1.1} strokeLinejoin="round">
          <polygon points={poly([P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)])} fill="var(--cube-top)" />
          <polygon points={poly([P(x, y + 1, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z), P(x, y + 1, z)])} fill="var(--cube-left)" />
          <polygon points={poly([P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z), P(x + 1, y, z)])} fill="var(--cube-right)" />
        </g>
      ))}
      {d.box && (() => {
        const [X, Y, Z] = d.box;
        return [
          line(P(0, 0, Z), P(X, 0, Z), "a"), line(P(X, 0, Z), P(X, Y, Z), "b"), line(P(X, Y, Z), P(0, Y, Z), "c"), line(P(0, Y, Z), P(0, 0, Z), "d"),
          line(P(X, 0, 0), P(X, 0, Z), "e"), line(P(X, Y, 0), P(X, Y, Z), "f"), line(P(0, Y, 0), P(0, Y, Z), "g"),
          line(P(X, 0, 0), P(X, Y, 0), "h"), line(P(0, Y, 0), P(X, Y, 0), "i"),
        ];
      })()}
    </svg>
  );
}

function ImageQ({ src }: { src: string }) {
  const [zoom, setZoom] = useState(false);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Savol rasmi. Kattalashtirish uchun bosing." onClick={() => setZoom(true)} />
      {zoom && (
        <div className="lightbox" role="dialog" aria-label="Kattalashtirilgan rasm" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Savol rasmi" />
        </div>
      )}
    </>
  );
}

export function Diagram({ d }: { d: D }) {
  let inner: React.ReactNode;
  switch (d.kind) {
    case "scales": inner = <Scales d={d} />; break;
    case "cipher": inner = <Cipher d={d} />; break;
    case "wheel": inner = <Wheel d={d} />; break;
    case "cubes": inner = <Cubes d={d} />; break;
    case "image": inner = <ImageQ src={d.src} />; break;
    case "equations":
      inner = (
        <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 600, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          {d.lines.map((l) => <div key={l}>{l}</div>)}
          <div style={{ color: "var(--accent)", borderTop: "1px solid var(--line)", paddingTop: 8 }}>{d.ask}</div>
        </div>
      );
      break;
    case "series":
      inner = (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {d.items.map((v, i) => (
            <div key={i} style={{ minWidth: 52, padding: "10px 12px", borderRadius: 12, textAlign: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 20,
              border: `2px solid ${v === null ? "var(--accent)" : "var(--line)"}`, color: v === null ? "var(--accent)" : "var(--ink)", background: "var(--surface-2)" }}>
              {v === null ? "?" : v}
            </div>
          ))}
        </div>
      );
      break;
  }
  return <div className="diagram">{inner}</div>;
}
