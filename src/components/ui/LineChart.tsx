'use client';

import { useState } from 'react';

interface LineConfig {
  key: string;
  label: string;
  color: string;
}

interface LineChartProps {
  data: Record<string, number | string>[];
  lines: LineConfig[];
  xKey?: string;
  height?: number;
}

export default function LineChart({
  data,
  lines,
  xKey = 'date',
  height = 180,
}: LineChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; index: number } | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-text-secondary text-center py-8">Sem dados no período.</p>;
  }

  const allValues = lines.flatMap((l) => data.map((d) => Number(d[l.key]) || 0));
  const max = Math.max(1, ...allValues);
  const W = 100;
  const H = 100;
  const padL = 4;
  const padR = 2;
  const padT = 4;
  const padB = 2;

  function toPoint(i: number, value: number) {
    const x = padL + (i / (data.length - 1)) * (W - padL - padR);
    const y = padT + (1 - value / max) * (H - padT - padB);
    return { x, y };
  }

  function buildPath(key: string) {
    return data
      .map((d, i) => {
        const { x, y } = toPoint(i, Number(d[key]) || 0);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }

  function buildArea(key: string) {
    const pts = data.map((d, i) => toPoint(i, Number(d[key]) || 0));
    const first = pts[0];
    const last = pts[pts.length - 1];
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return `${path} L ${last.x} ${H - padB} L ${first.x} ${H - padB} Z`;
  }

  // X-axis labels: show only first, middle, last
  const labelIndexes = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <div>
      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((t) => {
            const y = padT + (1 - t) * (H - padT - padB);
            return (
              <line
                key={t}
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.06}
                strokeWidth={0.5}
              />
            );
          })}

          {/* Area fills */}
          {lines.map((l) => (
            <path
              key={`area-${l.key}`}
              d={buildArea(l.key)}
              fill={l.color}
              fillOpacity={0.08}
            />
          ))}

          {/* Lines */}
          {lines.map((l) => (
            <path
              key={`line-${l.key}`}
              d={buildPath(l.key)}
              fill="none"
              stroke={l.color}
              strokeWidth={1.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Hover zones + dots */}
          {data.map((d, i) => {
            const slotW = (W - padL - padR) / data.length;
            return (
              <rect
                key={i}
                x={padL + i * slotW}
                y={0}
                width={slotW}
                height={H}
                fill="transparent"
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGRectElement)
                    .closest('svg')!
                    .getBoundingClientRect();
                  setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, index: i });
                }}
              />
            );
          })}

          {/* Active dots */}
          {tooltip !== null &&
            lines.map((l) => {
              const { x, y } = toPoint(tooltip.index, Number(data[tooltip.index][l.key]) || 0);
              return (
                <circle key={l.key} cx={x} cy={y} r={1.5} fill={l.color} />
              );
            })}
        </svg>

        {/* Tooltip */}
        {tooltip !== null && (
          <div
            className="absolute z-10 pointer-events-none bg-surface border border-border rounded-lg px-3 py-2 shadow-lg text-xs"
            style={{
              left: Math.min(tooltip.x + 8, height * 2 - 100),
              top: Math.max(0, tooltip.y - 40),
              transform: 'translateX(0)',
            }}
          >
            <p className="text-text-secondary mb-1">{String(data[tooltip.index][xKey])}</p>
            {lines.map((l) => (
              <p key={l.key} className="font-medium" style={{ color: l.color }}>
                {l.label}: {Number(data[tooltip.index][l.key]) || 0}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="relative mt-1">
        {labelIndexes.map((i) => {
          const pct = data.length <= 1 ? 50 : (i / (data.length - 1)) * 100;
          const label = String(data[i][xKey]).slice(5); // Remove year (YYYY-)
          return (
            <span
              key={i}
              className="absolute text-[10px] text-text-secondary"
              style={{
                left: `${pct}%`,
                transform: i === 0 ? 'none' : i === data.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-6">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-text-secondary">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
