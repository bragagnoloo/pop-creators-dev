export default function Loading() {
  return (
    <div className="py-8 max-w-2xl mx-auto animate-pulse space-y-6">
      <div className="h-7 w-28 bg-white/5 rounded-lg" />
      <div className="h-10 w-44 bg-white/5 rounded-xl" />
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-end justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white/5 rounded-full" />
            <div className="h-3 w-16 bg-white/5 rounded" />
            <div className="w-20 h-16 bg-white/5 rounded-t-lg" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-white/5 rounded-full" />
            <div className="h-3 w-20 bg-white/5 rounded" />
            <div className="w-24 h-24 bg-white/5 rounded-t-lg" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white/5 rounded-full" />
            <div className="h-3 w-16 bg-white/5 rounded" />
            <div className="w-20 h-12 bg-white/5 rounded-t-lg" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-xl">
            <div className="w-7 h-3 bg-white/5 rounded" />
            <div className="w-8 h-8 bg-white/5 rounded-full shrink-0" />
            <div className="flex-1 h-3 bg-white/5 rounded" />
            <div className="w-16 h-5 bg-white/5 rounded-full" />
            <div className="w-14 h-3 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
