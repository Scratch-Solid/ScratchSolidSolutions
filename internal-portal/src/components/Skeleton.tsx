export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-stone-200 rounded h-5 ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="border rounded p-4 bg-white animate-pulse">
      <div className="h-4 bg-stone-200 rounded w-3/4 mb-3" />
      <div className="h-3 bg-stone-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-stone-200 rounded w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 bg-stone-200 rounded w-1/4" />
          <div className="h-4 bg-stone-200 rounded w-1/3" />
          <div className="h-4 bg-stone-200 rounded w-1/5" />
          <div className="h-4 bg-stone-200 rounded w-1/6" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border rounded-lg p-6 bg-white">
            <div className="h-4 bg-stone-200 rounded w-1/2 mb-3" />
            <div className="h-8 bg-stone-200 rounded w-3/4" />
          </div>
        ))}
      </div>
      <div className="border rounded-lg p-6 bg-white">
        <div className="h-5 bg-stone-200 rounded w-1/3 mb-4" />
        <SkeletonTable rows={6} />
      </div>
    </div>
  );
}

export function SkeletonAvatar() {
  return (
    <div className="animate-pulse bg-stone-200 rounded-full w-10 h-10" />
  );
}

export function SkeletonButton() {
  return (
    <div className="animate-pulse bg-stone-200 rounded h-10 w-24" />
  );
}

export function SkeletonInput() {
  return (
    <div className="animate-pulse bg-stone-200 rounded h-10 w-full" />
  );
}

export function SkeletonChart() {
  return (
    <div className="animate-pulse bg-stone-200 rounded h-64 w-full" />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-stone-200 rounded" style={{ width: `${Math.random() * 40 + 60}%` }} />
      ))}
    </div>
  );
}
