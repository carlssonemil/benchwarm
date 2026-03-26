'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { updateTeamSettings, updateRecoveryToken } from '@/actions/team-actions'
import { CopyIcon, CheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Team } from '@/types/database'

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

interface TeamSettingsDialogProps {
  team: Team
  open: boolean
  onOpenChange: (open: boolean) => void
  getStoredPinHash: () => string | null
  onPinChanged: (newHash: string) => void
}

export function TeamSettingsDialog({
  team,
  open,
  onOpenChange,
  getStoredPinHash,
  onPinChanged,
}: TeamSettingsDialogProps) {
  const router = useRouter()
  const [name, setName] = useState(team.name)
  const [logoUrl, setLogoUrl] = useState(team.logo_url ?? '')
  const [matchSize, setMatchSize] = useState(String(team.match_size))
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isPending, startTransition] = useTransition()
  const [newRecoveryCode, setNewRecoveryCode] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [isRegenerating, startRegenerateTransition] = useTransition()

  function generateRecoveryCode(): string {
    const bytes = new Uint8Array(9)
    crypto.getRandomValues(bytes)
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 6)}-${hex.slice(6, 12)}-${hex.slice(12, 18)}`
  }

  function handleRegenerateCode() {
    startRegenerateTransition(async () => {
      const pinHash = getStoredPinHash()
      if (!pinHash) {
        toast.error('Admin session expired. Please re-authenticate.')
        return
      }
      const code = generateRecoveryCode()
      const tokenHash = await hashPin(code)
      const result = await updateRecoveryToken(team.slug, pinHash, tokenHash)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setNewRecoveryCode(code)
      setTokenCopied(false)
    })
  }

  function handleCopyToken() {
    if (!newRecoveryCode) return
    navigator.clipboard.writeText(newRecoveryCode)
    setTokenCopied(true)
    setTimeout(() => setTokenCopied(false), 2000)
  }

  // Reset form when dialog opens
  function handleOpenChange(next: boolean) {
    if (next) {
      setName(team.name)
      setLogoUrl(team.logo_url ?? '')
      setMatchSize(String(team.match_size))
      setNewPin('')
      setConfirmPin('')
      setNewRecoveryCode(null)
    }
    onOpenChange(next)
  }

  function handleSave() {
    const parsedSize = parseInt(matchSize, 10)
    if (isNaN(parsedSize) || parsedSize < 1 || parsedSize > 22) {
      toast.error('Match size must be between 1 and 22.')
      return
    }

    if (newPin || confirmPin) {
      if (newPin.length < 4 || newPin.length > 6) {
        toast.error('New PIN must be 4–6 digits.')
        return
      }
      if (!/^\d+$/.test(newPin)) {
        toast.error('PIN must contain only digits.')
        return
      }
      if (newPin !== confirmPin) {
        toast.error("PINs don't match.")
        return
      }
    }

    startTransition(async () => {
      const pinHash = getStoredPinHash()
      if (!pinHash) {
        toast.error('Admin session expired. Please re-authenticate.')
        return
      }

      let newPinHash: string | undefined
      if (newPin) {
        newPinHash = await hashPin(newPin)
      }

      const result = await updateTeamSettings(team.slug, pinHash, {
        name: name.trim(),
        matchSize: parsedSize,
        newPinHash,
        logoUrl: logoUrl.trim(),
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (newPinHash) {
        onPinChanged(newPinHash)
        toast.success('Settings saved. PIN updated.')
      } else {
        toast.success('Settings saved.')
      }

      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Team settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-2">
          {/* Team name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-name">Team name</Label>

            <Input
              id="settings-name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={isPending}
              placeholder="My Team"
            />
          </div>

          {/* Logo URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-logo-url">Logo URL</Label>

            <Input
              id="settings-logo-url"
              type="url"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              disabled={isPending}
              placeholder="https://example.com/logo.png"
            />

            <p className="text-xs text-muted-foreground">Shown next to the team name. Leave blank to remove.</p>
          </div>

          {/* Match size */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-match-size">Players per game</Label>

            <Input
              id="settings-match-size"
              type="number"
              min={1}
              max={22}
              value={matchSize}
              onChange={e => setMatchSize(e.target.value)}
              disabled={isPending}
              className="w-24"
            />

            <p className="text-xs text-muted-foreground">How many players are in the active lineup each match.</p>
          </div>

          <Separator />

          {/* Change PIN */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">Change admin PIN</p>
              <p className="text-xs text-muted-foreground">Leave blank to keep the current PIN.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-new-pin">New PIN (4–6 digits)</Label>

              <Input
                id="settings-new-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                disabled={isPending}
                placeholder="••••"
                className="w-32"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-confirm-pin">Confirm new PIN</Label>

              <Input
                id="settings-confirm-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                disabled={isPending}
                placeholder="••••"
                className="w-32"
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">Recovery code</p>

              <p className="text-xs text-muted-foreground">
                Used to reset the admin PIN if forgotten.{' '}
                <a href={`/team/${team.slug}/recover`} className="underline underline-offset-2 hover:text-foreground">
                  Recovery page
                </a>
              </p>
            </div>

            {newRecoveryCode ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Save this code — it won&apos;t be shown again.
                </p>

                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                  <span className="flex-1 font-mono text-sm tracking-wider select-all">
                    {newRecoveryCode}
                  </span>

                  <Button variant="ghost" size="icon-sm" onClick={handleCopyToken}>
                    {tokenCopied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateCode}
                disabled={isRegenerating || isPending}
                className="self-start"
              >
                {isRegenerating ? 'Generating…' : 'Regenerate recovery code'}
              </Button>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            
            <Button onClick={handleSave} disabled={isPending || !name.trim()}>
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
