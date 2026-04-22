interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

export default function PieChart({ data, size = 140 }: PieChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div
          className="rounded-full border-8 border-border"
          style={{ width: size, height: size }}
        />
        <p className="text-xs text-text-secondary mt-3">Sem dados</p>
      </div>
    );
  }

  const radius = 50;
  const cx = 50;
  const cy = 50;

  // Pré-calcula offsets acumulados sem mutação — atende react-hooks/immutability.
  const positive = data.filter(d => d.value > 0);
  const startValues = positive.reduce<number[]>((acc, d, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + positive[i - 1].value);
    return acc;
  }, []);

  const slices = positive.map((d, i) => {
    const startAngle = (startValues[i] / total) * Math.PI * 2;
    const endAngle = ((startValues[i] + d.value) / total) * Math.PI * 2;

    const x1 = cx + radius * Math.sin(startAngle);
    const y1 = cy - radius * Math.cos(startAngle);
    const x2 = cx + radius * Math.sin(endAngle);
    const y2 = cy - radius * Math.cos(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    const pathD =
      d.value === total
        ? `M ${cx - radius},${cy} A ${radius},${radius} 0 1 1 ${cx + radius},${cy} A ${radius},${radius} 0 1 1 ${cx - radius},${cy}`
        : `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`;

    return { d, pathD };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg viewBox="0 0 100 100" style={{ width: size, height: size }} className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.pathD} fill={s.d.color}>
            <title>{`${s.d.label}: ${s.d.value}`}</title>
          </path>
        ))}
      </svg>
      <div className="space-y-1.5 min-w-0">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
              <span className="text-text-secondary">{d.label}</span>
              <span className="font-medium">{d.value}</span>
              <span className="text-xs text-text-secondary">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
