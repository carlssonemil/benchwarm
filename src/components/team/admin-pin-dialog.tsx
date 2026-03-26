'use client'

import { useState, useTransition } from 'react'
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
import { verifyTeamPin } from '@/actions/team-actions'
import Link from 'next/link'

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface AdminPinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  onVerified: (pinHash: string) => void
}

export function AdminPinDialog({ open, onOpenChange, slug, onVerified }: AdminPinDialogProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!pin) return setError('Enter your admin PIN.')

    startTransition(async () => {
      const pinHash = await hashPin(pin)
      const valid = await verifyTeamPin(slug, pinHash)
      if (valid) {
        onVerified(pinHash)
        onOpenChange(false)
        setPin('')
      } else {
        setError('Incorrect PIN.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Admin access</DialogTitle>
          <DialogDescription>
            Enter the admin PIN to unlock team management.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-pin">PIN</Label>
            
            <Input
              id="admin-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <p className="text-xs text-muted-foreground">
            Forgot your PIN?{' '}
            <Link
              href={`/team/${slug}/recover`}
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Reset it with your recovery code
            </Link>
          </p>

          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Verifying…' : 'Unlock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
