'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusIcon, CalendarIcon } from 'lucide-react'
import { UpcomingMatchCard } from './upcoming-match-card'
import { PlanMatchDialog } from './plan-match-dialog'
import { EditPlannedMatchDialog } from './edit-planned-match-dialog'
import { MatchWizard } from './match-wizard'
import {
  getPlannedMatchesWithPlayers,
  completeMatch,
  deletePlannedMatch,
} from '@/actions/match-actions'
import { useAdmin } from '@/hooks/use-admin'
import { toast } from 'sonner'
import type { MatchWithPlayers, Player, Season, Team } from '@/types/database'

interface UpcomingMatchesProps {
  team: Team
  initialSeasons: Season[]
  activePlayers: Player[]
}

export function UpcomingMatches({ team, initialSeasons, activePlayers }: UpcomingMatchesProps) {
  const router = useRouter()
  const { isAdmin, getStoredPinHash } = useAdmin(team.slug)

  const activeSeason = initialSeasons.find(s => s.is_active) ?? null

  const [matches, setMatches] = useState<MatchWithPlayers[]>([])
  const [isLoading, startLoadTransition] = useTransition()
  const [planOpen, setPlanOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MatchWithPlayers | null>(null)

  useEffect(() => {
    startLoadTransition(async () => {
      const data = await getPlannedMatchesWithPlayers(team.id)
      setMatches(data)
    })
  }, [team.id])

  async function refresh() {
    const data = await getPlannedMatchesWithPlayers(team.id)
    setMatches(data)
    router.refresh()
  }

  async function handleComplete(matchId: string) {
    const pinHash = getStoredPinHash()
    if (!pinHash) {
      toast.error('PIN required.')
      return
    }

    const result = await completeMatch(team.slug, pinHash, matchId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Match marked as played!')
      await refresh()
    }
  }

  async function handleDelete(matchId: string) {
    const pinHash = getStoredPinHash()
    if (!pinHash) {
      toast.error('PIN required.')
      return
    }

    const result = await deletePlannedMatch(team.slug, pinHash, matchId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Match deleted.')
      await refresh()
    }
  }

  function handleAssignPlayers(match: MatchWithPlayers) {
    setSelectedMatch(match)
    setWizardOpen(true)
  }

  function handleEdit(match: MatchWithPlayers) {
    setSelectedMatch(match)
    setEditOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeSeason ? (
            <Badge variant="outline" className="text-xs gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
              {activeSeason.name}
            </Badge>
          ) : (
            <p className="text-xs text-muted-foreground">No active season</p>
          )}
        </div>

        {isAdmin && activeSeason && (
          <Button size="sm" onClick={() => setPlanOpen(true)}>
            <PlusIcon className="size-3.5" />
            Plan match
          </Button>
        )}
      </div>

      {/* Match list */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map(i => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <CalendarIcon className="size-8 text-muted-foreground/40" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">No upcoming matches</p>
            
            <p className="text-xs text-muted-foreground">
              {isAdmin && activeSeason
                ? 'Plan your next match above.'
                : 'Check back when a match has been planned.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map(match => (
            <UpcomingMatchCard
              key={match.id}
              match={match}
              isAdmin={isAdmin}
              onAssignPlayers={handleAssignPlayers}
              onComplete={handleComplete}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {activeSeason && (
        <PlanMatchDialog
          open={planOpen}
          onOpenChange={setPlanOpen}
          team={team}
          activeSeason={activeSeason}
          getPinHash={getStoredPinHash}
          onCreated={refresh}
        />
      )}

      {activeSeason && selectedMatch && (
        <MatchWizard
          open={wizardOpen}
          onOpenChange={open => {
            setWizardOpen(open)
            if (!open) setSelectedMatch(null)
          }}
          team={team}
          activeSeason={activeSeason}
          activePlayers={activePlayers}
          getPinHash={getStoredPinHash}
          existingMatchId={selectedMatch.id}
          existingMatchTitle={selectedMatch.title}
          existingMatchDate={selectedMatch.played_at}
          onSaved={refresh}
        />
      )}

      {selectedMatch && (
        <EditPlannedMatchDialog
          open={editOpen}
          onOpenChange={open => {
            setEditOpen(open)
            if (!open) setSelectedMatch(null)
          }}
          match={selectedMatch}
          team={team}
          getPinHash={getStoredPinHash}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
