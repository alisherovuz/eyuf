import type { Sym } from "@/lib/types";

/** Draws one symbol centred at (x, y) with size s. */
export function SymShape({ sym, x, y, s }: { sym: Sym; x: number; y: number; s: number }) {
  const r = s / 2;
  const fill = "var(--ink)";
  switch (sym) {
    case "sq":
      return <rect x={x - r * 0.85} y={y - r * 0.85} width={r * 1.7} height={r * 1.7} fill={fill} />;
    case "cir":
      return <circle cx={x} cy={y} r={r * 0.9} fill={fill} />;
    case "tri":
      return <polygon points={`${x},${y - r} ${x + r},${y + r * 0.8} ${x - r},${y + r * 0.8}`} fill={fill} />;
    case "dia":
      return <polygon points={`${x},${y - r} ${x + r * 0.8},${y} ${x},${y + r} ${x - r * 0.8},${y}`} fill={fill} />;
    case "plus": {
      const w = r * 0.62;
      return <path d={`M${x - w / 2} ${y - r}h${w}v${r - w / 2}h${r - w / 2}v${w}h${-(r - w / 2)}v${r - w / 2}h${-w}v${-(r - w / 2)}h${-(r - w / 2)}v${-w}h${r - w / 2}z`} fill={fill} />;
    }
    case "hex": {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i;
        return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`;
      }).join(" ");
      return <polygon points={pts} fill="none" stroke={fill} strokeWidth={s * 0.14} />;
    }
    case "star": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (Math.PI / 5) * i;
        const rr = i % 2 ? r * 0.45 : r;
        return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`;
      }).join(" ");
      return <polygon points={pts} fill={fill} />;
    }
  }
}

const NAMES: Record<Sym, string> = { sq: "kvadrat", cir: "doira", tri: "uchburchak", star: "yulduz", dia: "romb", plus: "xoch", hex: "olti burchak" };

/** A row of symbols as an inline SVG. */
export function SymRow({ syms, size = 20, gap = 6 }: { syms: Sym[]; size?: number; gap?: number }) {
  const w = syms.length * size + (syms.length - 1) * gap;
  return (
    <svg width={w} height={size} viewBox={`0 0 ${w} ${size}`} role="img" aria-label={syms.map((s) => NAMES[s]).join(", ")} style={{ verticalAlign: "middle", overflow: "visible" }}>
      {syms.map((s, i) => (
        <SymShape key={i} sym={s} x={i * (size + gap) + size / 2} y={size / 2} s={size} />
      ))}
    </svg>
  );
}
