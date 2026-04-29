export default function Loading() {
  return (
    <div className="py-8 animate-pulse">
      <div className="h-7 w-32 bg-white/5 rounded-lg mb-6" />
      <div className="h-10 w-64 bg-white/5 rounded-xl mb-6" />
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/5 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            </div>
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-3 bg-white/5 rounded w-5/6" />
            <div className="h-9 bg-white/5 rounded-xl w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
