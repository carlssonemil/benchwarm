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
import { createPlannedMatch } from '@/actions/match-actions'
import { toast } from 'sonner'
import { CalendarIcon } from 'lucide-react'
import type { Season, Team } from '@/types/database'

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

interface PlanMatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: Team
  activeSeason: Season
  getPinHash: () => string | null
  onCreated: () => void
}

export function PlanMatchDialog({
  open,
  onOpenChange,
  team,
  activeSeason,
  getPinHash,
  onCreated,
}: PlanMatchDialogProps) {
  const [scheduledDate, setScheduledDate] = useState(todayISO())
  const [title, setTitle] = useState(() => formatDateTitle(todayISO()))
  const [titleEdited, setTitleEdited] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setScheduledDate(todayISO())
      setTitle(formatDateTitle(todayISO()))
      setTitleEdited(false)
    }
  }, [open])

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

      const result = await createPlannedMatch(team.slug, pinHash, {
        seasonId: activeSeason.id,
        teamId: team.id,
        title: title.trim() || null,
        scheduledDate,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Match planned!')
        onOpenChange(false)
        onCreated()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="size-4" />
            Plan a match
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            
            <DatePicker value={scheduledDate} onChange={setScheduledDate} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="match-title">Title</Label>

            <Input
              id="match-title"
              value={title}
              onChange={e => { setTitle(e.target.value); setTitleEdited(true) }}
              placeholder={formatDateTitle(scheduledDate)}
              disabled={isPending}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            You can assign players later from the Matches tab.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>

            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Planning…' : 'Plan match'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
