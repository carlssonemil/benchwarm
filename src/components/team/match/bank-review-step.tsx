'use client'

import { Button } from '@/components/ui/button'
import { GuaranteedBadge } from './guaranteed-badge'
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'
import { PlayerAvatar } from '@/components/player-avatar'
import type { PlayerWithBank } from '@/types/database'

interface BankReviewStepProps {
  bankedPlayers: PlayerWithBank[]
  matchSize: number
  onBack: () => void
  onNext: () => void
  stepIndicator?: React.ReactNode
}

export function BankReviewStep({ bankedPlayers, matchSize, onBack, onNext, stepIndicator }: BankReviewStepProps) {
  const guaranteed = bankedPlayers.filter(p => p.is_guaranteed)
  const inPool = bankedPlayers.filter(p => !p.is_guaranteed)
  const totalEntries = inPool.reduce((sum, p) => sum + p.bank_entries, 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          {guaranteed.length > 0 && (
            <>
              <span className="font-medium text-foreground">{guaranteed.length}</span> player{guaranteed.length !== 1 ? 's are' : ' is'} guaranteed a spot.{' '}
            </>
          )}
          {inPool.length > 0 && (
            <>
              <span className="font-medium text-foreground">{inPool.length}</span> player{inPool.length !== 1 ? 's are' : ' is'} in the lottery pool with{' '}
              <span className="font-medium text-foreground">{totalEntries}</span> total entries.
            </>
          )}
        </p>
      </div>

      {guaranteed.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Guaranteed</p>
          
          <div className="flex flex-col gap-0.5">
            {[...guaranteed].sort((a, b) => a.name.localeCompare(b.name)).map(player => (
              <div key={player.id} className="flex items-center gap-2 justify-between rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-900/10">
                <div className="flex items-center gap-2">
                  <PlayerAvatar player={player} size="sm" />
                  <span className="text-sm font-medium">{player.name}</span>
                </div>
                <GuaranteedBadge streak={player.consecutive_sit_outs} />
              </div>
            ))}
          </div>
        </div>
      )}

      {inPool.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Lottery pool ({matchSize - guaranteed.length} spot{matchSize - guaranteed.length !== 1 ? 's' : ''} remaining)
          </p>

          <div className="flex flex-col gap-0.5">
            {[...inPool].sort((a, b) => a.name.localeCompare(b.name)).map(player => (
              <div key={player.id} className="flex items-center gap-2 justify-between rounded-lg px-3 py-2 hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <PlayerAvatar player={player} size="sm" />
                  <span className="text-sm">{player.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <BankDots count={player.bank_entries} />

                  <span className="text-xs text-muted-foreground w-14 text-right">
                    {player.bank_entries} {player.bank_entries === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </Button>

        <div className="absolute left-1/2 -translate-x-1/2">{stepIndicator}</div>
        
        <Button onClick={onNext}>
          Next
          <ArrowRightIcon />
        </Button>
      </div>
    </div>
  )
}

function BankDots({ count }: { count: number }) {
  const MAX_DOTS = 6
  const shown = Math.min(count, MAX_DOTS)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: shown }).map((_, i) => (
        <span
          key={i}
          className="size-2 rounded-full bg-primary/70"
        />
      ))}
      {count > MAX_DOTS && (
        <span className="text-xs text-muted-foreground ml-0.5">+{count - MAX_DOTS}</span>
      )}
    </div>
  )
}
