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
import { DatePicker } from '@/components/ui/date-picker'
import { updatePlannedMatch } from '@/actions/match-actions'
import { toast } from 'sonner'
import type { MatchWithPlayers, Team } from '@/types/database'

function formatDateTitle(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface EditPlannedMatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  match: MatchWithPlayers
  team: Team
  getPinHash: () => string | null
  onSaved: () => void
}

export function EditPlannedMatchDialog({
  open,
  onOpenChange,
  match,
  team,
  getPinHash,
  onSaved,
}: EditPlannedMatchDialogProps) {
  const [scheduledDate, setScheduledDate] = useState(match.played_at)
  const [title, setTitle] = useState(match.title ?? formatDateTitle(match.played_at))
  const [titleEdited, setTitleEdited] = useState(!!match.title)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setScheduledDate(match.played_at)
      setTitle(match.title ?? formatDateTitle(match.played_at))
      setTitleEdited(!!match.title)
    }
  }, [open, match])

  useEffect(() => {
    if (!titleEdited) setTitle(formatDateTitle(scheduledDate))
  }, [scheduledDate, titleEdited])

  function handleSave() {
    startTransition(async () => {
      const pinHash = getPinHash()
      if (!pinHash) {
        toast.error('Admin session expired. Please re-authenticate.')
        return
      }

      const result = await updatePlannedMatch(team.slug, pinHash, {
        matchId: match.id,
        title: title.trim() || null,
        scheduledDate,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Match updated!')
        onOpenChange(false)
        onSaved()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit match</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>

            <DatePicker value={scheduledDate} onChange={setScheduledDate} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-title">Title</Label>

            <Input
              id="edit-title"
              value={title}
              onChange={e => { setTitle(e.target.value); setTitleEdited(true) }}
              placeholder={formatDateTitle(scheduledDate)}
              disabled={isPending}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
