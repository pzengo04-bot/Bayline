"use client";

import { useId, useState } from "react";

type Point = { d: string; n: number };

const W = 640;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 26, left: 34 };

const dayLabel = (d: string, long = false) =>
  new Intl.DateTimeFormat("en-US", long ? { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${d}T12:00:00Z`),
  );

/** Daily visits: a blue line over a soft blue fill, light gridlines, mono axis labels and a hover box. */
export function VisitsChart({ data }: { data: Point[] }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(4, ...data.map((p) => p.n));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (n: number) => PAD.top + ih - (n / top) * ih;
  const line = data.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.n).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1).toFixed(1)},${PAD.top + ih}L${x(0).toFixed(1)},${PAD.top + ih}Z`;
  const ticks = [0, 1, 2, 3, 4].map((k) => k * step);
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const h = hover === null ? null : data[hover];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label={`Visits per day, ${data.length} days, ${data.reduce((a, p) => a + p.n, 0)} in total`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - PAD.left) / iw) * (data.length - 1));
          setHover(Math.min(data.length - 1, Math.max(0, i)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0297de" stopOpacity="0.32" />
            <stop offset="1" stopColor="#0297de" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#1c2a33" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end" className="fill-muted font-mono text-[10px]">
              {t}
            </text>
          </g>
        ))}
        {data.map((p, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={p.d} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="fill-muted font-mono text-[10px]">
              {dayLabel(p.d)}
            </text>
          ) : null,
        )}
        <path d={area} fill={`url(#${id}-fill)`} />
        <path d={line} fill="none" stroke="#0297de" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
        {h && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="#4fb8ea" strokeOpacity="0.5" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.n)} r="4.5" fill="#02070a" stroke="#4fb8ea" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-1 rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-sm shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? "-105%" : "5%"})` }}
        >
          <p className="font-bold">
            {h.n} visit{h.n === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-muted">{dayLabel(h.d, true)}</p>
        </div>
      )}
    </div>
  );
}
