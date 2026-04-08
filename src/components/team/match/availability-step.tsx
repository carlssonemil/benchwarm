'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowRightIcon } from 'lucide-react'
import { PlayerAvatar } from '@/components/player-avatar'
import type { Player } from '@/types/database'

interface AvailabilityStepProps {
  activePlayers: Player[]
  availableIds: string[]
  onChange: (ids: string[]) => void
  onNext: () => void
  isLoading: boolean
  stepIndicator?: React.ReactNode
}

export function AvailabilityStep({
  activePlayers,
  availableIds,
  onChange,
  onNext,
  isLoading,
  stepIndicator,
}: AvailabilityStepProps) {
  function toggle(id: string) {
    if (availableIds.includes(id)) {
      onChange(availableIds.filter(x => x !== id))
    } else {
      onChange([...availableIds, id])
    }
  }

  function selectAll() {
    onChange(activePlayers.map(p => p.id))
  }

  function clearAll() {
    onChange([])
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{availableIds.length}</span> of{' '}
          {activePlayers.length} available
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 px-2 py-1.5"
          >
            All
          </button>

          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 px-2 py-1.5"
          >
            None
          </button>
        </div>
      </div>

      {activePlayers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No active players on the roster. Add players first.
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {[...activePlayers].sort((a, b) => a.name.localeCompare(b.name)).map(player => {
            const isAvailable = availableIds.includes(player.id)
            return (
              <label
                key={player.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`player-${player.id}`}
                  checked={isAvailable}
                  onCheckedChange={() => toggle(player.id)}
                />

                <PlayerAvatar player={player} size="sm" className={!isAvailable ? 'opacity-40' : undefined} />

                <span className={`text-sm select-none ${!isAvailable ? 'text-muted-foreground line-through' : ''}`}>
                  {player.name}
                </span>
              </label>
            )
          })}
        </div>
      )}

      <div className="relative flex items-center justify-between pt-2">
        <div />

        <div className="absolute left-1/2 -translate-x-1/2">{stepIndicator}</div>
        
        <Button
          onClick={onNext}
          disabled={availableIds.length === 0 || isLoading}
        >
          {isLoading ? 'Computing…' : 'Next'}
          {!isLoading && <ArrowRightIcon />}
        </Button>
      </div>
    </div>
  )
}
