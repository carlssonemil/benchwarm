'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
import { Checkbox } from '@/components/ui/checkbox'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { createTeam } from '@/actions/team-actions'
import { ADMIN_PIN_SESSION_KEY, DEFAULT_MATCH_SIZE } from '@/lib/constants'
import { useRecentTeams } from '@/hooks/use-recent-teams'

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateRecoveryCode(): string {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 6)}-${hex.slice(6, 12)}-${hex.slice(12, 18)}`
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
  const router = useRouter()
  const { saveTeam } = useRecentTeams()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [matchSize, setMatchSize] = useState(DEFAULT_MATCH_SIZE)
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [createdTeam, setCreatedTeam] = useState<{ slug: string; pinHash: string; recoveryCode: string } | null>(null)
  const [codeSaved, setCodeSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    if (!slugEdited) {
      setSlug(toSlug(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setSlugEdited(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) return setError('Team name is required.')
    if (!slug) return setError('Slug is required.')
    if (pin.length < 4 || pin.length > 6) return setError('PIN must be 4–6 digits.')
    if (!/^\d+$/.test(pin)) return setError('PIN must contain only digits.')
    if (pin !== pinConfirm) return setError('PINs do not match.')

    startTransition(async () => {
      const pinHash = await hashPin(pin)
      const recoveryCode = generateRecoveryCode()
      const recoveryTokenHash = await hashPin(recoveryCode)
      const suffix = Math.random().toString(36).slice(2, 6)
      const finalSlug = slug ? `${slug}-${suffix}` : suffix

      const result = await createTeam({ name, slug: finalSlug, pinHash, matchSize, recoveryTokenHash })
      if (result?.error) {
        setError(result.error)
      } else if (result?.slug) {
        setCreatedTeam({ slug: result.slug, pinHash, recoveryCode })
      }
    })
  }

  function handleCopyCode() {
    if (!createdTeam) return
    navigator.clipboard.writeText(createdTeam.recoveryCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleContinue() {
    if (!createdTeam) return
    sessionStorage.setItem(`${ADMIN_PIN_SESSION_KEY}_${createdTeam.slug}`, createdTeam.pinHash)
    saveTeam(createdTeam.slug, name)
    router.push(`/team/${createdTeam.slug}`)
  }

  return (
    <Dialog open={open} onOpenChange={createdTeam ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {createdTeam ? (
          // ── Recovery code step ──────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle>Save your recovery code</DialogTitle>
              <DialogDescription>
                If you forget your admin PIN, this code lets you reset it. It&apos;s only shown once.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-5 pt-2">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3">
                <span className="flex-1 font-mono text-base tracking-widest select-all">
                  {createdTeam.recoveryCode}
                </span>

                <Button variant="ghost" size="sm" onClick={handleCopyCode}>
                  {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Store this somewhere safe — a password manager, notes app, or written down. You cannot view it again.
              </p>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="code-saved"
                  checked={codeSaved}
                  onCheckedChange={v => setCodeSaved(!!v)}
                />

                <label htmlFor="code-saved" className="text-sm leading-none cursor-pointer pt-0.5">
                  I&apos;ve saved my recovery code
                </label>
              </div>

              <Button className="w-full" disabled={!codeSaved} onClick={handleContinue}>
                Continue to your team
              </Button>
            </div>
          </>
        ) : (
          // ── Create team form ────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle>Create a team</DialogTitle>

              <DialogDescription>
                Set up your team. Share the link with teammates — no accounts needed.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="team-name">Team name</Label>

                <Input
                  id="team-name"
                  placeholder="e.g. Ninjas in Pyjamas"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="team-slug">
                  URL slug{' '}
                  <span className="text-muted-foreground font-normal text-xs">(a unique suffix will be added)</span>
                </Label>

                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-sm shrink-0">/team/</span>
                  
                  <Input
                    id="team-slug"
                    placeholder="ninjas-in-pyjamas"
                    value={slug}
                    onChange={e => handleSlugChange(e.target.value)}
                  />

                  <span className="text-muted-foreground text-sm shrink-0">-xxxx</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="match-size">Players per game</Label>
                
                <Input
                  id="match-size"
                  type="number"
                  min={1}
                  max={22}
                  value={matchSize}
                  onChange={e => setMatchSize(Number(e.target.value))}
                  className="w-24"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pin">Admin PIN (4–6 digits)</Label>
                
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pin-confirm">Confirm PIN</Label>
                
                <Input
                  id="pin-confirm"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••"
                  value={pinConfirm}
                  onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <DialogFooter className="mt-2">
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? 'Creating…' : 'Create team'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
