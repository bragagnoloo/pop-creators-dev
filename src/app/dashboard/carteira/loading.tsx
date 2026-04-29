export default function Loading() {
  return (
    <div className="py-8 space-y-6 animate-pulse">
      <div className="h-7 w-28 bg-white/5 rounded-lg" />
      <div className="grid sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-2xl p-5 space-y-2">
            <div className="h-3 bg-white/5 rounded w-2/3" />
            <div className="h-7 bg-white/5 rounded w-1/2" />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-36 bg-white/5 rounded-xl" />
        <div className="h-10 w-40 bg-white/5 rounded-xl" />
      </div>
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
        <div className="h-3 bg-white/5 rounded w-1/3" />
        <div className="h-4 bg-white/5 rounded w-1/2" />
      </div>
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
        <div className="h-5 bg-white/5 rounded w-24 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2 border-b border-border/50">
            <div className="h-3 bg-white/5 rounded w-20" />
            <div className="h-3 bg-white/5 rounded w-16" />
            <div className="h-3 bg-white/5 rounded flex-1" />
            <div className="h-3 bg-white/5 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
