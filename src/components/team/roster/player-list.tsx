'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { PlayerRow } from './player-row'
import { addPlayer } from '@/actions/player-actions'
import { computePlayerBanks } from '@/actions/match-actions'
import { useAdmin } from '@/hooks/use-admin'
import { toast } from 'sonner'
import { PlusIcon, LockIcon } from 'lucide-react'
import { PLAYER_COLORS } from '@/lib/constants'
import type { Player, PlayerWithBank, Season, Team } from '@/types/database'

interface PlayerListProps {
  team: Team
  initialPlayers: Player[]
  activeSeason?: Season
}

export function PlayerList({ team, initialPlayers, activeSeason }: PlayerListProps) {
  const router = useRouter()
  const { isAdmin, getStoredPinHash } = useAdmin(team.slug)
  const [newName, setNewName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [bankData, setBankData] = useState<PlayerWithBank[]>([])

  const active = initialPlayers.filter(p => p.is_active)
  const inactive = initialPlayers.filter(p => !p.is_active)

  // Stable color assignment by player index in the active list
  const colorMap = new Map(active.map((p, i) => [p.id, PLAYER_COLORS[i % PLAYER_COLORS.length]]))

  useEffect(() => {
    if (!activeSeason || active.length === 0) return
    computePlayerBanks(activeSeason.id, active).then(setBankData)
  }, [activeSeason?.id, active.length])

  const bankMap = new Map(bankData.map(p => [p.id, p]))

  function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    startTransition(async () => {
      const pinHash = getStoredPinHash()
      if (!pinHash) return
      const result = await addPlayer(team.slug, pinHash, newName)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`${newName.trim()} added to roster.`)
        setNewName('')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{active.length}</span> active player{active.length !== 1 ? 's' : ''}{' '}
          &middot; {team.match_size} play each match
        </p>
      </div>

      {isAdmin && (
        <form onSubmit={handleAddPlayer} className="flex gap-2">
          <Input
            placeholder="Player name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            disabled={isPending}
            className="flex-1"
          />
          
          <Button type="submit" disabled={isPending || !newName.trim()}>
            <PlusIcon />
            Add
          </Button>
        </form>
      )}

      {initialPlayers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            {isAdmin ? 'Add your first player above.' : 'No players on the roster yet.'}
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
              avatarColor={colorMap.get(player.id) ?? '#6366f1'}
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
                  avatarColor="#6366f1"
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
