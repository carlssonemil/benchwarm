'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { saveMatch, updateMatch } from '@/actions/match-actions'
import { toast } from 'sonner'
import type { MatchWithPlayers, Player, Team } from '@/types/database'

interface RecordMatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: Team
  seasonId: string
  activePlayers: Player[]
  getPinHash: () => string | null
  existingMatch?: MatchWithPlayers
  onSaved: () => void
}

interface PlayerRow {
  player: Player
  available: boolean
  played: boolean
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateTitle(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function RecordMatchDialog({
  open,
  onOpenChange,
  team,
  seasonId,
  activePlayers,
  getPinHash,
  existingMatch,
  onSaved,
}: RecordMatchDialogProps) {
  const isEditing = !!existingMatch
  const [title, setTitle] = useState('')
  const [playedAt, setPlayedAt] = useState(todayISO())
  const [playerRows, setPlayerRows] = useState<PlayerRow[]>([])
  const [isPending, startTransition] = useTransition()

  // Reset form whenever the dialog opens or the existingMatch changes
  useEffect(() => {
    if (!open) return

    const date = existingMatch?.played_at ? existingMatch.played_at.slice(0, 10) : todayISO()
    setPlayedAt(date)
    setTitle(existingMatch?.title ?? formatDateTitle(date))

    if (existingMatch) {
      // Build rows from the existing match's players + any current active players not in it
      const allPlayerIds = new Set<string>()
      const rows: PlayerRow[] = []

      // First: players already in the match record
      for (const ep of existingMatch.players) {
        allPlayerIds.add(ep.player_id)
        rows.push({
          player: ep.player,
          available: ep.was_available,
          played: ep.was_selected,
        })
      }

      // Then: currently active players NOT already in the match
      for (const p of activePlayers) {
        if (!allPlayerIds.has(p.id)) {
          rows.push({ player: p, available: false, played: false })
        }
      }

      setPlayerRows(rows)
    } else {
      // New match: all active players, none marked available by default
      setPlayerRows(activePlayers.map(p => ({ player: p, available: false, played: false })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingMatch])

  function setAvailable(playerId: string, available: boolean) {
    setPlayerRows(rows =>
      rows.map(r =>
        r.player.id === playerId
          ? { ...r, available, played: available ? r.played : false }
          : r,
      ),
    )
  }

  function setPlayed(playerId: string, played: boolean) {
    setPlayerRows(rows => rows.map(r => (r.player.id === playerId ? { ...r, played } : r)))
  }

  function handleSave() {
    if (!playedAt) {
      toast.error('Please pick a date.')
      return
    }

    const players = playerRows.map(r => ({
      playerId: r.player.id,
      wasAvailable: r.available,
      wasSelected: r.played,
      bankEntriesAtSpin: 0,
      wasGuaranteed: false,
    }))

    startTransition(async () => {
      const pinHash = getPinHash()
      if (!pinHash) {
        toast.error('Admin session expired. Please re-authenticate.')
        return
      }

      let result: { error?: string }

      if (isEditing && existingMatch) {
        result = await updateMatch(team.slug, pinHash, {
          matchId: existingMatch.id,
          title: title.trim() || null,
          playedAt,
          players,
        })
      } else {
        result = await saveMatch(team.slug, pinHash, {
          seasonId,
          teamId: team.id,
          title: title.trim() || null,
          playedAt,
          players,
        })
      }

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(isEditing ? 'Match updated.' : 'Match recorded.')
      onOpenChange(false)
      onSaved()
    })
  }

  const availableCount = playerRows.filter(r => r.available).length
  const playedCount = playerRows.filter(r => r.played).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit match' : 'Record past match'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6 pb-2 flex flex-col gap-5 pt-2">
          {/* Title + Date */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="match-title">Match title</Label>

              <Input
                id="match-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={formatDateTitle(playedAt)}
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Date played</Label>
              <DatePicker value={playedAt} onChange={setPlayedAt} disabled={isPending} />
            </div>
          </div>

          {/* Player list */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Players
              </Label>

              <span className="text-xs text-muted-foreground">
                {playedCount} played · {availableCount - playedCount} sat out
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 pb-1">
                <span />
                <span className="text-xs text-muted-foreground w-16 text-center">Available</span>
                <span className="text-xs text-muted-foreground w-12 text-center">Played</span>
              </div>

              {playerRows.map(r => (
                <div
                  key={r.player.id}
                  className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-3 py-1.5 rounded-lg hover:bg-muted/40"
                >
                  <span className={`text-sm ${!r.available ? 'text-muted-foreground' : ''}`}>
                    {r.player.name}
                  </span>

                  <div className="w-16 flex justify-center">
                    <Checkbox
                      checked={r.available}
                      onCheckedChange={v => setAvailable(r.player.id, !!v)}
                      disabled={isPending}
                    />
                  </div>

                  <div className="w-12 flex justify-center">
                    <Checkbox
                      checked={r.played}
                      onCheckedChange={v => setPlayed(r.player.id, !!v)}
                      disabled={isPending || !r.available}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Record match'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
