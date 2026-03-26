export default function TeamLoading() {
  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-6 gap-6 animate-pulse">
      {/* Tab bar — 4 tabs (Matches, Roster, History, Seasons) */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg h-10">
        <div className="rounded-md bg-background shadow-sm" />
        <div className="rounded-md" />
        <div className="rounded-md" />
        <div className="rounded-md" />
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
