interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export default function BarChart({ data, height = 140, color = '#ec4899' }: BarChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-secondary text-center py-8">Sem dados no período.</p>;
  }

  const max = Math.max(1, ...data.map(d => d.value));
  const barWidth = 100 / data.length;
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div>
      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 100 100`} preserveAspectRatio="none" className="w-full h-full">
          {data.map((d, i) => {
            const h = (d.value / max) * 95;
            return (
              <g key={i}>
                <rect
                  x={i * barWidth + barWidth * 0.15}
                  y={100 - h}
                  width={barWidth * 0.7}
                  height={h}
                  fill={color}
                  opacity={d.value === 0 ? 0.1 : 0.85}
                  rx={0.5}
                >
                  <title>{`${d.label}: ${d.value}`}</title>
                </rect>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex mt-2">
        {data.map((d, i) => (
          <div key={i} style={{ width: `${barWidth}%` }} className="text-[10px] text-text-secondary text-center truncate">
            {d.label}
          </div>
        ))}
      </div>
      <p className="text-xs text-text-secondary mt-2">Total no período: <span className="text-text-primary font-medium">{total}</span></p>
    </div>
  );
}
