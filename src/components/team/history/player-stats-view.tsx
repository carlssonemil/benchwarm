'use client'

import { useState, useTransition, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlayerStatsTable } from './player-stats-table'
import { getPlayerStats } from '@/actions/match-actions'
import type { PlayerStat, Season, Team } from '@/types/database'

interface PlayerStatsViewProps {
  seasons: Season[]
  team: Team
}

export function PlayerStatsView({ seasons, team }: PlayerStatsViewProps) {
  const defaultSeason =
    seasons.find(s => s.is_active) ??
    seasons.sort((a, b) => (b.start_date ?? b.created_at).localeCompare(a.start_date ?? a.created_at))[0] ??
    null

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    defaultSeason?.id ?? 'all',
  )
  const [stats, setStats] = useState<PlayerStat[]>([])
  const [isLoading, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const st = await getPlayerStats(selectedSeasonId, team.id)
      setStats(st)
    })
  }, [selectedSeasonId])

  if (seasons.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-4xl">📊</span>
        <p className="text-sm text-muted-foreground">Create a season to get started.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select season" />
        </SelectTrigger>
        
        <SelectContent position="popper">
          <SelectItem value="all">All seasons</SelectItem>
          {seasons.map(s => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
              {s.is_active && ' (active)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="flex flex-col animate-pulse">
          <div className="flex items-center gap-3 px-2 pb-3 border-b">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="ml-auto flex gap-3">
              <div className="h-3 w-12 rounded bg-muted" />
              <div className="h-3 w-9 rounded bg-muted" />
              <div className="h-3 w-11 rounded bg-muted" />
              <div className="h-3 w-7 rounded bg-muted" />
              <div className="h-3 w-8 rounded bg-muted" />
            </div>
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 px-2 py-3 border-b last:border-0">
              <div className="h-3 w-28 rounded bg-muted" />
              <div className="ml-auto flex gap-3">
                <div className="h-3 w-8 rounded bg-muted" />
                <div className="h-3 w-8 rounded bg-muted" />
                <div className="h-3 w-8 rounded bg-muted" />
                <div className="h-3 w-8 rounded bg-muted" />
                <div className="h-3 w-8 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <PlayerStatsTable stats={stats} />
      )}
    </div>
  )
}
