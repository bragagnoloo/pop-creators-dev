export default function Loading() {
  return (
    <div className="py-8 space-y-8 animate-pulse">
      <div className="text-center space-y-2">
        <div className="h-8 w-48 bg-white/5 rounded-lg mx-auto" />
        <div className="h-4 w-72 bg-white/5 rounded mx-auto" />
      </div>
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-2">
        <div className="h-3 bg-white/5 rounded w-24" />
        <div className="h-6 bg-white/5 rounded w-32" />
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-3xl p-6 space-y-4">
            <div className="h-5 bg-white/5 rounded w-20" />
            <div className="h-8 bg-white/5 rounded w-28" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-3 bg-white/5 rounded w-full" />
              ))}
            </div>
            <div className="h-10 bg-white/5 rounded-xl w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
