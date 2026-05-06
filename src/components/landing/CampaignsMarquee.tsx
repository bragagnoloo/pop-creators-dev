type Campaign = { id: string; title: string };

export default function CampaignsMarquee({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return null;

  return (
    <div className="relative border-y border-white/5 py-4 bg-background/60 overflow-hidden">
      {/* Label fixo à esquerda com fade */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-4 sm:pl-6 lg:pl-8 pr-16"
        style={{ background: 'linear-gradient(to right, var(--color-background) 60%, transparent)' }}>
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-popline-pink whitespace-nowrap">
          Campanhas ativas
        </span>
      </div>

      {/* Fade direita */}
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, var(--color-background), transparent)' }} />

      {/* Track — duplicado para loop contínuo */}
      <div className="flex gap-3 animate-marquee w-max pl-48 sm:pl-52">
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
  );
}
