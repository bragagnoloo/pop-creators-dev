'use client';

const BAR_COUNT = 80;

// PRNG determinística baseada em seno — mesma saída a cada render, sem Math.random().
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const BARS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const distance = i / BAR_COUNT;
  const edgeFactor = 0.1 + distance * 0.9;
  const randomFactor = 0.4 + pseudoRandom(i + 1) * 0.6;
  const maxHeight = Math.max(12, 350 * edgeFactor * randomFactor);
  const delay = i * 0.04;
  const duration = 1.5 + pseudoRandom(i + 100) * 2;
  const opacity = Math.max(0.05, 0.15 + 0.35 * distance);
  return { maxHeight, delay, duration, opacity };
});

function getColor(i: number): string {
  const t = i / BAR_COUNT;
  if (t < 0.25) return 'var(--color-popline-magenta)';
  if (t < 0.5) return 'var(--color-popline-pink)';
  return 'var(--color-popline-light)';
}

export default function SoundWaves() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Left side */}
      <div className="absolute left-0 right-1/2 flex items-center justify-end">
        <div className="flex items-center justify-end w-full gap-[2px] sm:gap-[4px] lg:gap-[6px]">
          {BARS.map((bar, i) => (
            <div
              key={`left-${i}`}
              className="sound-bar"
              style={{
                '--max-height': `${bar.maxHeight}px`,
                '--delay': `${bar.delay}s`,
                '--duration': `${bar.duration}s`,
                '--bar-color': getColor(i),
                '--bar-opacity': bar.opacity,
                order: BAR_COUNT - i,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      {/* Right side */}
      <div className="absolute left-1/2 right-0 flex items-center justify-start">
        <div className="flex items-center justify-start w-full gap-[2px] sm:gap-[4px] lg:gap-[6px]">
          {BARS.map((bar, i) => (
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
