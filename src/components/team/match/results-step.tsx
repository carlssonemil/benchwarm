'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { GuaranteedBadge } from './guaranteed-badge'
import { saveMatch, assignPlayersToPlannedMatch } from '@/actions/match-actions'
import { toast } from 'sonner'
import { ArrowLeftIcon, SaveIcon, CalendarIcon } from 'lucide-react'
import { PlayerAvatar } from '@/components/player-avatar'
import type { Player, PlayerWithBank } from '@/types/database'
import type { SelectionResult } from '@/lib/selection'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDateTitle(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface ResultsStepProps {
  slug: string
  getPinHash: () => string | null
  teamId: string
  seasonId: string
  activePlayers: Player[]
  availableIds: string[]
  selection: SelectionResult
  bankedPlayers: PlayerWithBank[]
  onBack: () => void
  onSaved: () => void
  stepIndicator?: React.ReactNode
  /** When set, assigns players to an existing planned match instead of creating a new one */
  existingMatchId?: string
  existingMatchTitle?: string | null
  existingMatchDate?: string
}

export function ResultsStep({
  slug,
  getPinHash,
  teamId,
  seasonId,
  activePlayers,
  availableIds,
  selection,
  bankedPlayers,
  onBack,
  onSaved,
  stepIndicator,
  existingMatchId,
  existingMatchTitle,
  existingMatchDate,
}: ResultsStepProps) {
  const [playedAt, setPlayedAt] = useState(() => existingMatchDate ?? todayISO())
  const [title, setTitle] = useState(() => existingMatchTitle ?? formatDateTitle(existingMatchDate ?? todayISO()))
  const [titleEdited, setTitleEdited] = useState(!!existingMatchTitle)
  const [isPending, startTransition] = useTransition()

  // Keep title in sync with date unless user has edited it manually
  useEffect(() => {
    if (!titleEdited) setTitle(formatDateTitle(playedAt))
  }, [playedAt, titleEdited])

  const selectedIds = new Set([
    ...selection.guaranteed.map(p => p.id),
    ...selection.picked.map(p => p.id),
  ])
  const guaranteedIds = new Set(selection.guaranteed.map(p => p.id))
  const bankMap = new Map(bankedPlayers.map(p => [p.id, p]))

  const unavailablePlayers = activePlayers.filter(p => !availableIds.includes(p.id))

  function handleSave() {
    startTransition(async () => {
      const pinHash = getPinHash()
      if (!pinHash) {
        toast.error('Admin session expired. Please re-authenticate.')
        return
      }

      // Build full player record: available (selected or sitting out) + unavailable
      const playerRecords = [
        ...activePlayers.filter(p => availableIds.includes(p.id)).map(p => ({
          playerId: p.id,
          wasAvailable: true,
          wasSelected: selectedIds.has(p.id),
          bankEntriesAtSpin: bankMap.get(p.id)?.bank_entries ?? 1,
          wasGuaranteed: guaranteedIds.has(p.id),
        })),
        ...unavailablePlayers.map(p => ({
          playerId: p.id,
          wasAvailable: false,
          wasSelected: false,
          bankEntriesAtSpin: 0,
          wasGuaranteed: false,
        })),
      ]

      let result: { error?: string }

      if (existingMatchId) {
        result = await assignPlayersToPlannedMatch(slug, pinHash, {
          matchId: existingMatchId,
          players: playerRecords,
        })
      } else {
        result = await saveMatch(slug, pinHash, {
          seasonId,
          teamId,
          title: title.trim() || null,
          playedAt,
          players: playerRecords,
        })
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(existingMatchId ? 'Players assigned!' : 'Match saved!')
        onSaved()
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Playing */}
      <Section label={`Playing (${selectedIds.size})`}>
        {selection.guaranteed.map(p => (
          <ResultRow key={p.id} player={p}>
            <GuaranteedBadge streak={p.consecutive_sit_outs} />
          </ResultRow>
        ))}
        {selection.picked.map(p => (
          <ResultRow key={p.id} player={p}>
            <Badge className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              Picked
            </Badge>
          </ResultRow>
        ))}
      </Section>

      {/* Sitting out */}
      {selection.notPicked.length > 0 && (
        <Section label={`Sitting out (${selection.notPicked.length})`}>
          {selection.notPicked.map(p => (
            <ResultRow key={p.id} player={p} muted>
              <span className="text-xs text-muted-foreground">
                +{bankMap.get(p.id)?.bank_entries ?? 1} next week
              </span>
            </ResultRow>
          ))}
        </Section>
      )}

      {/* Unavailable */}
      {unavailablePlayers.length > 0 && (
        <Section label={`Unavailable (${unavailablePlayers.length})`}>
          {unavailablePlayers.map(p => (
            <ResultRow key={p.id} player={p} muted>
              <span className="text-xs text-muted-foreground">+1 next week</span>
            </ResultRow>
          ))}
        </Section>
      )}

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="match-title">Match title</Label>

        <Input
          id="match-title"
          value={title}
          onChange={e => { setTitle(e.target.value); setTitleEdited(true) }}
          placeholder={formatDateTitle(playedAt)}
          disabled={isPending}
        />
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <Label className="flex items-center gap-1.5">
          Date played
        </Label>

        <DatePicker
          value={playedAt}
          onChange={setPlayedAt}
        />
      </div>

      <div className="relative flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack} disabled={isPending}>
          <ArrowLeftIcon />
          Back
        </Button>

        <div className="absolute left-1/2 -translate-x-1/2">{stepIndicator}</div>
        
        <Button onClick={handleSave} disabled={isPending}>
          <SaveIcon className="size-3.5" />
          {isPending ? 'Saving…' : 'Save match'}
        </Button>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function ResultRow({
  player,
  children,
  muted = false,
}: {
  player: Player | PlayerWithBank
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <PlayerAvatar player={player} size="sm" className={muted ? 'opacity-40' : undefined} />
        <span className={`text-sm ${muted ? 'text-muted-foreground' : ''}`}>{player.name}</span>
      </div>
      {children}
    </div>
  )
}
