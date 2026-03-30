'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { markNoShows } from '@/actions/match-actions'
import { toast } from 'sonner'
import type { MatchWithPlayers } from '@/types/database'

interface NoShowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  match: MatchWithPlayers
  slug: string
  getPinHash: () => string | null
  onSaved: () => void
}

export function NoShowDialog({
  open,
  onOpenChange,
  match,
  slug,
  getPinHash,
  onSaved,
}: NoShowDialogProps) {
  const selectedPlayers = match.players.filter(p => p.was_selected)
  const benchPlayers = match.players.filter(p => p.was_available && !p.was_selected)

  const [noShowIds, setNoShowIds] = useState<Set<string>>(
    new Set(match.players.filter(p => p.was_no_show).map(p => p.player_id)),
  )
  const [replacementIds, setReplacementIds] = useState<Set<string>>(
    new Set(match.players.filter(p => p.was_replacement).map(p => p.player_id)),
  )
  const [isPending, startTransition] = useTransition()

  function toggleNoShow(playerId: string, checked: boolean) {
    setNoShowIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(playerId)
      else {
        next.delete(playerId)
        // If no no-shows remain, clear all replacements too
        if (next.size === 0) setReplacementIds(new Set())
      }
      return next
    })
  }

  function toggleReplacement(playerId: string, checked: boolean) {
    setReplacementIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(playerId)
      else next.delete(playerId)
      return next
    })
  }

  function handleSave() {
    startTransition(async () => {
      const pinHash = getPinHash()
      if (!pinHash) {
        toast.error('Admin session expired. Please re-authenticate.')
        return
      }

      const result = await markNoShows(slug, pinHash, {
        matchId: match.id,
        noShowPlayerIds: Array.from(noShowIds),
        replacementPlayerIds: Array.from(replacementIds),
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('No-shows recorded.')
      onOpenChange(false)
      onSaved()
    })
  }

  function handleSkip() {
    onOpenChange(false)
    onSaved()
  }

  const hasNoShows = noShowIds.size > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Any no-shows?</DialogTitle>
          <DialogDescription>
            Mark players who were selected but didn&apos;t show up. Replacements keep their bank entries.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6 pb-2 flex flex-col gap-5 pt-1">
          {selectedPlayers.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Selected players
              </span>

              <div className="flex flex-col gap-0.5">
                {selectedPlayers.map(p => (
                  <label
                    key={p.player_id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={noShowIds.has(p.player_id)}
                      onCheckedChange={v => toggleNoShow(p.player_id, !!v)}
                      disabled={isPending}
                    />
                    <span className={`text-sm flex-1 ${noShowIds.has(p.player_id) ? 'line-through text-muted-foreground' : ''}`}>
                      {p.player.name}
                    </span>
                    {noShowIds.has(p.player_id) && (
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">No-show</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {hasNoShows && benchPlayers.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Who stepped in?
              </span>

              <div className="flex flex-col gap-0.5">
                {benchPlayers.map(p => (
                  <label
                    key={p.player_id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={replacementIds.has(p.player_id)}
                      onCheckedChange={v => toggleReplacement(p.player_id, !!v)}
                      disabled={isPending}
                    />
                    <span className="text-sm flex-1">{p.player.name}</span>
                    {replacementIds.has(p.player_id) && (
                      <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">Stepped in</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {hasNoShows && benchPlayers.length === 0 && (
            <p className="text-xs text-muted-foreground px-1">
              No bench players available to mark as replacements.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="ghost" onClick={handleSkip} disabled={isPending}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={isPending || !hasNoShows}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
