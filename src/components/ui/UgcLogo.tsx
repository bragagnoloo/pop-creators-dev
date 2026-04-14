interface UgcLogoProps {
  size?: number;
  className?: string;
}

export default function UgcLogo({ size = 40, className = '' }: UgcLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="ugc-bg" x1="0" y1="120" x2="120" y2="0">
          <stop stopColor="#d946ef" />
          <stop offset="0.5" stopColor="#e879a8" />
          <stop offset="1" stopColor="#f0abfc" />
        </linearGradient>
      </defs>
      {/* Circle background */}
      <circle cx="60" cy="60" r="60" fill="url(#ugc-bg)" />
      {/* 4-point star */}
      <path
        d="M60 25C60 25 67 48 72 53C77 58 95 60 95 60C95 60 77 62 72 67C67 72 60 95 60 95C60 95 53 72 48 67C43 62 25 60 25 60C25 60 43 58 48 53C53 48 60 25 60 25Z"
        fill="white"
        stroke="white"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Top-right sparkle */}
      <path
        d="M82 28C82 28 84 33 86 35C88 37 93 38 93 38C93 38 88 39 86 41C84 43 82 48 82 48C82 48 80 43 78 41C76 39 71 38 71 38C71 38 76 37 78 35C80 33 82 28 82 28Z"
        fill="white"
      />
      {/* Bottom-left sparkle */}
      <path
        d="M38 72C38 72 39.5 76 41 77.5C42.5 79 46 80 46 80C46 80 42.5 81 41 82.5C39.5 84 38 88 38 88C38 88 36.5 84 35 82.5C33.5 81 30 80 30 80C30 80 33.5 79 35 77.5C36.5 76 38 72 38 72Z"
        fill="white"
      />
    </svg>
  );
}

export function UgcLogoText({ size = 40, className = '' }: UgcLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <UgcLogo size={size} />
      <span className="font-bold text-text-primary" style={{ fontSize: size * 0.45 }}>UGC+</span>
    </div>
  );
}
