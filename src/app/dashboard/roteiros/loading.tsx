export default function Loading() {
  return (
    <div className="py-8 animate-pulse space-y-6">
      <div className="h-7 w-36 bg-white/5 rounded-lg" />
      <div className="h-10 w-56 bg-white/5 rounded-xl" />
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div className="h-4 bg-white/5 rounded w-1/3" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-24 bg-white/5 rounded-xl" />
        <div className="h-12 bg-white/5 rounded-xl w-full" />
      </div>
    </div>
  );
}
