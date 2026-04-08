'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PlayerRow } from './player-row'
import { PlayerProfileDialog } from './player-profile-dialog'
import { computePlayerBanks } from '@/actions/match-actions'
import { useAdmin } from '@/hooks/use-admin'
import { PlusIcon, LockIcon } from 'lucide-react'
import type { Player, PlayerWithBank, Season, Team } from '@/types/database'

interface PlayerListProps {
  team: Team
  initialPlayers: Player[]
  activeSeason?: Season
}

export function PlayerList({ team, initialPlayers, activeSeason }: PlayerListProps) {
  const router = useRouter()
  const { isAdmin, getStoredPinHash } = useAdmin(team.slug)
  const [addOpen, setAddOpen] = useState(false)
  const [bankData, setBankData] = useState<PlayerWithBank[]>([])

  const collator = new Intl.Collator(undefined, { sensitivity: 'base' })
  const active = initialPlayers.filter(p => p.is_active).sort((a, b) => collator.compare(a.name, b.name))
  const inactive = initialPlayers.filter(p => !p.is_active).sort((a, b) => collator.compare(a.name, b.name))

  useEffect(() => {
    if (!activeSeason || active.length === 0) return
    computePlayerBanks(activeSeason.id, active).then(setBankData)
  }, [activeSeason?.id, active.length])

  const bankMap = new Map(bankData.map(p => [p.id, p]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{active.length}</span> active player{active.length !== 1 ? 's' : ''}{' '}
          &middot; {team.match_size} play each match
        </p>

        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <PlusIcon />
            Add player
          </Button>
        )}
      </div>

      {isAdmin && (
        <PlayerProfileDialog
          mode="create"
          slug={team.slug}
          getPinHash={getStoredPinHash}
          open={addOpen}
          onOpenChange={setAddOpen}
          onSaved={() => router.refresh()}
        />
      )}

      {initialPlayers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            {isAdmin ? 'Add your first player using the button above.' : 'No players on the roster yet.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {active.map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              slug={team.slug}
              isAdmin={isAdmin}
              getPinHash={getStoredPinHash}
              bankData={bankMap.get(player.id)}
            />
          ))}

          {inactive.length > 0 && (
            <>
              <div className="flex items-center gap-3 my-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Inactive</span>
                <Separator className="flex-1" />
              </div>
              {inactive.map(player => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  slug={team.slug}
                  isAdmin={isAdmin}
                  getPinHash={getStoredPinHash}


                />
              ))}
            </>
          )}
        </div>
      )}

      {!isAdmin && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
          <LockIcon className="size-3" />
          Admin access required to edit the roster.
        </p>
      )}
    </div>
  )
}
