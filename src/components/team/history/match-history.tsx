'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { MatchCard } from './match-card'
import { RecordMatchDialog } from './record-match-dialog'
import { NoShowDialog } from '@/components/team/match/no-show-dialog'
import { getMatchesWithPlayers, deleteMatch, revertMatchToPlanned } from '@/actions/match-actions'
import { useAdmin } from '@/hooks/use-admin'
import { toast } from 'sonner'
import type { MatchWithPlayers, Player, Season, Team } from '@/types/database'

interface MatchHistoryProps {
  seasons: Season[]
  teamSlug: string
  team: Team
  activePlayers: Player[]
  dataVersion: number
}

export function MatchHistory({ seasons, teamSlug, team, activePlayers, dataVersion }: MatchHistoryProps) {
  const router = useRouter()
  const { isAdmin, getStoredPinHash } = useAdmin(teamSlug)

  const defaultSeason =
    seasons.find(s => s.is_active) ??
    seasons.sort((a, b) => (b.start_date ?? b.created_at).localeCompare(a.start_date ?? a.created_at))[0] ??
    null

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    defaultSeason?.id ?? 'all',
  )
  const [matches, setMatches] = useState<MatchWithPlayers[]>([])
  const [isLoading, startTransition] = useTransition()
  const [recordOpen, setRecordOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<MatchWithPlayers | undefined>(undefined)
  const [noShowMatch, setNoShowMatch] = useState<MatchWithPlayers | null>(null)
  const [noShowOpen, setNoShowOpen] = useState(false)

  useEffect(() => {
    startTransition(async () => {
      const gds = await getMatchesWithPlayers(selectedSeasonId, team.id)
      setMatches(gds)
    })
  }, [selectedSeasonId, dataVersion])

  async function handleDelete(matchId: string) {
    const pinHash = getStoredPinHash()
    if (!pinHash) { toast.error('PIN required.'); return }

    const result = await deleteMatch(teamSlug, pinHash, matchId)
    if (result.error) { toast.error(result.error); return }

    const gds = await getMatchesWithPlayers(selectedSeasonId, team.id)
    setMatches(gds)
    router.refresh()
    toast.success('Match deleted.')
  }

  async function handleRevert(matchId: string) {
    const pinHash = getStoredPinHash()
    if (!pinHash) { toast.error('PIN required.'); return }

    const result = await revertMatchToPlanned(teamSlug, pinHash, matchId)
    if (result.error) { toast.error(result.error); return }

    const gds = await getMatchesWithPlayers(selectedSeasonId, team.id)
    setMatches(gds)
    router.refresh()
    toast.success('Match reverted to planned.')
  }

  async function handleRecordSaved() {
    const gds = await getMatchesWithPlayers(selectedSeasonId, team.id)
    setMatches(gds)
    router.refresh()
  }

  if (seasons.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-4xl">📋</span>
        <p className="text-sm text-muted-foreground">Create a season to get started.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
          <SelectTrigger className="w-full sm:w-auto">
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

        {isAdmin && selectedSeasonId !== 'all' && (
          <Button
            variant="outline"
            className="ml-auto sm:ml-0 w-full sm:w-auto"
            onClick={() => {
              setEditingMatch(undefined)
              setRecordOpen(true)
            }}
          >
            <PlusIcon className="size-3.5" />
            Record past match
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-sm text-muted-foreground">No matches played this season.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map(m => (
            <MatchCard
              key={m.id}
              match={m}
              isAdmin={isAdmin}
              onDelete={() => handleDelete(m.id)}
              onRevert={() => handleRevert(m.id)}
              onEdit={() => {
                setEditingMatch(m)
                setRecordOpen(true)
              }}
              onNoShow={() => {
                setNoShowMatch(m)
                setNoShowOpen(true)
              }}
            />
          ))}
        </div>
      )}

      {selectedSeasonId !== 'all' && (
        <RecordMatchDialog
          open={recordOpen}
          onOpenChange={open => {
            setRecordOpen(open)
            if (!open) setEditingMatch(undefined)
          }}
          team={team}
          seasonId={selectedSeasonId}
          activePlayers={activePlayers}
          getPinHash={getStoredPinHash}
          existingMatch={editingMatch}
          onSaved={handleRecordSaved}
        />
      )}

      {noShowMatch && (
        <NoShowDialog
          open={noShowOpen}
          onOpenChange={open => {
            setNoShowOpen(open)
            if (!open) setNoShowMatch(null)
          }}
          match={noShowMatch}
          slug={teamSlug}
          getPinHash={getStoredPinHash}
          onSaved={handleRecordSaved}
        />
      )}
    </div>
  )
}
