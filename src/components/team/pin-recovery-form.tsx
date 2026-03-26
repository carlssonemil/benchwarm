'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetAdminPin } from '@/actions/team-actions'
import { ADMIN_PIN_SESSION_KEY } from '@/lib/constants'
import { KeyRoundIcon, CopyIcon, CheckIcon } from 'lucide-react'
import type { Team } from '@/types/database'

function HashHelper({ slug }: { slug: string }) {
  const [pin, setPin] = useState('')
  const [hash, setHash] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (pin.length < 4) { setHash(''); return }
    hashValue(pin).then(setHash)
  }, [pin])

  function handleCopy() {
    if (!hash) return
    navigator.clipboard.writeText(hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const body = `Hi,\n\nCan you reset the PIN for my team?\n\nSlug: ${slug}\nNew PIN hash: ${hash || '(enter your PIN above first)'}\n\nThanks`

  return (
    <div className="border-t pt-5 flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">No recovery code?</p>

        <p className="text-sm text-muted-foreground">
          Enter your desired new PIN below, then email the hash to{' '}
          <a href="mailto:hello@emilcarlsson.se" className="underline underline-offset-2 hover:text-foreground">
            hello@emilcarlsson.se
          </a>.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="helper-pin">New PIN (4–6 digits)</Label>

        <Input
          id="helper-pin"
          type="password"
          inputMode="numeric"
          maxLength={6}
          placeholder="••••"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          className="w-32"
        />
      </div>

      {hash && (
        <div className="flex flex-col gap-1.5">
          <Label>Your hash</Label>

          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
            <span className="flex-1 font-mono text-xs break-all select-all">{hash}</span>
            
            <Button variant="ghost" size="icon-sm" onClick={handleCopy} className="shrink-0">
              {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            </Button>
          </div>

          <a
            href={`mailto:hello@emilcarlsson.se?subject=PIN reset for ${slug}&body=${encodeURIComponent(body)}`}
            className="text-sm underline underline-offset-2 hover:text-foreground text-muted-foreground self-start"
          >
            Open email draft
          </a>
        </div>
      )}
    </div>
  )
}

async function hashValue(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

interface PinRecoveryFormProps {
  team: Team
}

export function PinRecoveryForm({ team }: PinRecoveryFormProps) {
  const router = useRouter()
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!recoveryCode.trim()) return setError('Enter your recovery code.')
    if (newPin.length < 4 || newPin.length > 6) return setError('PIN must be 4–6 digits.')
    if (!/^\d+$/.test(newPin)) return setError('PIN must contain only digits.')
    if (newPin !== confirmPin) return setError("PINs don't match.")

    startTransition(async () => {
      const [tokenHash, newPinHash] = await Promise.all([
        hashValue(recoveryCode.trim().toLowerCase()),
        hashValue(newPin),
      ])

      const result = await resetAdminPin(team.slug, tokenHash, newPinHash)
      if (result.error) {
        setError(result.error)
        return
      }

      // Auto-login with new PIN
      sessionStorage.setItem(`${ADMIN_PIN_SESSION_KEY}_${team.slug}`, newPinHash)
      router.push(`/team/${team.slug}`)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <KeyRoundIcon className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Reset admin PIN</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          Enter the recovery code you saved when creating{' '}
          <span className="font-medium text-foreground">{team.name}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recovery-code">Recovery code</Label>

          <Input
            id="recovery-code"
            value={recoveryCode}
            onChange={e => setRecoveryCode(e.target.value)}
            placeholder="xxxxxx-xxxxxx-xxxxxx"
            autoFocus
            disabled={isPending}
            className="font-mono"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-pin">New PIN (4–6 digits)</Label>

          <Input
            id="new-pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••"
            value={newPin}
            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
            disabled={isPending}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-new-pin">Confirm new PIN</Label>
          
          <Input
            id="confirm-new-pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••"
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            disabled={isPending}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Resetting…' : 'Reset PIN'}
        </Button>
      </form>

      <HashHelper slug={team.slug} />
    </div>
  )
}
