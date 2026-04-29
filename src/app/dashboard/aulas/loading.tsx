export default function Loading() {
  return (
    <div className="py-8 animate-pulse space-y-6">
      <div className="h-7 w-24 bg-white/5 rounded-lg" />
      <div className="flex gap-2">
        <div className="h-9 w-28 bg-white/5 rounded-xl" />
        <div className="h-9 w-36 bg-white/5 rounded-xl" />
        <div className="h-9 w-28 bg-white/5 rounded-xl" />
      </div>
      <div className="h-10 bg-white/5 rounded-xl w-full" />
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="aspect-video bg-white/5 w-full" />
        <div className="p-4 space-y-2">
          <div className="h-5 bg-white/5 rounded w-2/3" />
          <div className="h-3 bg-white/5 rounded w-full" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="aspect-video bg-white/5 w-full" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-white/5 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
