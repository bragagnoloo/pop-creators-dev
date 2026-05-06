type Campaign = { id: string; title: string };

export default function CampaignsMarquee({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return null;

  return (
    <div className="border-y border-white/5 py-4 bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {/* Label fixo */}
          <span className="flex-none text-[10px] font-bold tracking-[0.2em] uppercase text-popline-pink whitespace-nowrap">
            Campanhas ativas
          </span>

          {/* Separador */}
          <div className="flex-none w-px h-4 bg-border" />

          {/* Track do marquee */}
          <div className="flex-1 overflow-hidden min-w-0 relative">
            {/* Fade direita */}
            <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to left, var(--color-background), transparent)' }} />

            <div className="flex gap-3 animate-marquee w-max">
              {[...campaigns, ...campaigns].map((c, i) => (
                <span
                  key={`${c.id}-${i}`}
                  className="inline-flex items-center px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-sm text-text-secondary whitespace-nowrap"
                >
                  {c.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
