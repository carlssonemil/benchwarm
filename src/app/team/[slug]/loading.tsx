export default function TeamLoading() {
  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 pb-6 gap-6 animate-pulse">
      {/* Tab bar — line variant */}
      <div className="border-b border-border">
        <div className="flex h-9 gap-4">
          {[56, 48, 52, 36, 52].map((w, i) => (
            <div key={i} className="relative flex items-center gap-1.5 px-2 py-1">
              <div className="h-3.5 w-3.5 rounded-sm bg-muted" />
              <div className="h-3.5 rounded bg-muted" style={{ width: w }} />
              {i === 0 && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-muted-foreground/40 rounded-full" />}
            </div>
          ))}
        </div>
      </div>

      {/* Matches tab content */}
      <div className="flex flex-col gap-4 pt-6">
        {/* Header: active season badge + Plan match button */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 rounded-full bg-muted" />
          <div className="h-7 w-24 rounded-md bg-muted" />
        </div>

        {/* Match card skeletons */}
        {[1, 2].map(i => (
          <div key={i} className="rounded-xl bg-muted h-32" />
        ))}
      </div>
    </div>
  )
}
