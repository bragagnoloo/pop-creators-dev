'use client';

export default function SoundWaves() {
  const barCount = 80;

  const bars = Array.from({ length: barCount }, (_, i) => {
    const distance = i / barCount;
    // Inverted: small at center (i=0), big at edges (i=barCount)
    const edgeFactor = 0.1 + distance * 0.9;
    const randomFactor = 0.4 + Math.random() * 0.6;
    const maxHeight = Math.max(12, 350 * edgeFactor * randomFactor);
    const delay = i * 0.04;
    const duration = 1.5 + Math.random() * 2;
    // Opacity also grows toward edges
    const opacity = Math.max(0.05, 0.15 + 0.35 * distance);

    return { maxHeight, delay, duration, opacity };
  });

  // Colors: magenta at center -> pink middle -> light at edges
  const getColor = (i: number) => {
    const t = i / barCount;
    if (t < 0.25) return 'var(--color-popline-magenta)';
    if (t < 0.5) return 'var(--color-popline-pink)';
    if (t < 0.75) return 'var(--color-popline-light)';
    return 'var(--color-popline-light)';
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Left side */}
      <div className="absolute left-0 right-1/2 flex items-center justify-end">
        <div className="flex items-center justify-end w-full gap-[2px] sm:gap-[4px] lg:gap-[6px]">
          {bars.map((bar, i) => (
            <div
              key={`left-${i}`}
              className="sound-bar"
              style={{
                '--max-height': `${bar.maxHeight}px`,
                '--delay': `${bar.delay}s`,
                '--duration': `${bar.duration}s`,
                '--bar-color': getColor(i),
                '--bar-opacity': bar.opacity,
                order: barCount - i,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      {/* Right side */}
      <div className="absolute left-1/2 right-0 flex items-center justify-start">
        <div className="flex items-center justify-start w-full gap-[2px] sm:gap-[4px] lg:gap-[6px]">
          {bars.map((bar, i) => (
            <div
              key={`right-${i}`}
              className="sound-bar"
              style={{
                '--max-height': `${bar.maxHeight}px`,
                '--delay': `${bar.delay + 0.03}s`,
                '--duration': `${bar.duration}s`,
                '--bar-color': getColor(i),
                '--bar-opacity': bar.opacity,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
