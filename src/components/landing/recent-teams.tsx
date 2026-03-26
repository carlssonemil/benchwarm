'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRecentTeams } from '@/hooks/use-recent-teams'
import { getTeamsSummary } from '@/actions/team-actions'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { XIcon, UsersIcon, CalendarIcon } from 'lucide-react'

const ACCENTS = [
  { bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-600 dark:text-cyan-400' },
] as const

type Accent = (typeof ACCENTS)[number]

function accentFor(slug: string): Accent {
  const idx = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % ACCENTS.length
  return ACCENTS[idx]
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(diff / 3_600_000)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(diff / 86_400_000)
  return `${days}d ago`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface TeamSummary {
  slug: string
  name: string
  match_size: number
  player_count: number
  last_match_at: string | null
}

export function RecentTeams() {
  const { teams, removeTeam } = useRecentTeams()
  const [summaries, setSummaries] = useState<TeamSummary[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (teams.length === 0) { setSummaries([]); return }
    setLoading(true)
    getTeamsSummary(teams.map(t => t.slug))
      .then(data => {
        // Preserve the localStorage order (most-recently-visited first)
        const bySlug = new Map(data.map(d => [d.slug, d]))
        setSummaries(teams.flatMap(t => {
          const s = bySlug.get(t.slug)
          return s ? [s] : []
        }))
      })
      .finally(() => setLoading(false))
  }, [teams])

  if (teams.length === 0) return null

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />

        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap">
          Your teams
        </h2>
        
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading
          ? teams.map(t => (
              <div key={t.slug} className="rounded-xl border bg-card p-4 animate-pulse flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-muted shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="h-3.5 w-28 rounded bg-muted" />
                    <div className="h-3 w-16 rounded bg-muted" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-3 w-20 rounded bg-muted" />
                  <div className="h-3 w-8 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
              </div>
            ))
          : summaries.map(summary => {
              const meta = teams.find(t => t.slug === summary.slug)
              const accent = accentFor(summary.slug)
              return (
                <TeamCard
                  key={summary.slug}
                  summary={summary}
                  lastVisited={meta?.lastVisited ?? Date.now()}
                  accent={accent}
                  onRemove={() => removeTeam(summary.slug)}
                />
              )
            })}
      </div>
    </div>
  )
}

function TeamCard({
  summary,
  lastVisited,
  accent,
  onRemove,
}: {
  summary: TeamSummary
  lastVisited: number
  accent: Accent
  onRemove: () => void
}) {
  const router = useRouter()

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/team/${summary.slug}`)}
      onKeyDown={e => { if (e.key === 'Enter') router.push(`/team/${summary.slug}`) }}
      className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 hover:border-border/80 hover:bg-accent/40 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${accent.bg} ${accent.text}`}>
          {summary.name[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{summary.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {relativeTime(lastVisited)}
          </p>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground -mt-1 -mr-1"
                title="Remove"
              >
                <XIcon className="size-3" />
              </Button>
            }
            title="Remove from recents?"
            description={
              <>
                <span className="font-medium text-foreground">{summary.name}</span> will be removed
                from your recent teams. You can still reach it via its link.
              </>
            }
            confirmLabel="Remove"
            onConfirm={onRemove}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <UsersIcon className="size-3" />
          {summary.player_count} player{summary.player_count !== 1 ? 's' : ''}
        </span>
        <span className="text-border">·</span>
        <span>{summary.match_size}v{summary.match_size}</span>
        {summary.last_match_at && (
          <>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3" />
              {formatDate(summary.last_match_at)}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
