'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { createSeason } from '@/actions/season-actions'
import { toast } from 'sonner'

interface CreateSeasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  getPinHash: () => string | null
}

export function CreateSeasonDialog({ open, onOpenChange, slug, getPinHash }: CreateSeasonDialogProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const pinHash = getPinHash()
      if (!pinHash) {
        setError('Admin PIN not found. Please re-authenticate.')
        return
      }

      const result = await createSeason(slug, pinHash, {
        name,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })

      if (result.error) {
        setError(result.error)
      } else {
        toast.success(`Season "${name}" started.`)
        onOpenChange(false)
        setName('')
        setStartDate('')
        setEndDate('')
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New season</DialogTitle>
          <DialogDescription>
            Give the season a name. Both dates are optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="season-name">Season name</Label>

            <Input
              id="season-name"
              placeholder={`e.g. Spring ${new Date().getFullYear()}`}
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              Start date{' '}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>

            <DatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="Pick start date"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              End date{' '}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="Pick end date"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending || !name.trim()} className="w-full">
              {isPending ? 'Creating…' : 'Start season'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
