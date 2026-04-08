'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GuaranteedBadge } from '@/components/team/match/guaranteed-badge'
import { setPlayerActive } from '@/actions/player-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PencilIcon, EyeOffIcon, EyeIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PlayerAvatar } from '@/components/player-avatar'
import { PlayerProfileDialog } from './player-profile-dialog'
import type { Player, PlayerWithBank } from '@/types/database'

interface PlayerRowProps {
  player: Player
  slug: string
  isAdmin: boolean
  getPinHash: () => string | null
  bankData?: PlayerWithBank
}

export function PlayerRow({ player, slug, isAdmin, getPinHash, bankData }: PlayerRowProps) {
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleToggleActive() {
    startTransition(async () => {
      const pinHash = getPinHash()
      if (!pinHash) return
      const result = await setPlayerActive(slug, pinHash, player.id, !player.is_active)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(player.is_active ? 'Player deactivated.' : 'Player reactivated.')
        router.refresh()
      }
    })
  }

  return (
    <>
      <PlayerProfileDialog
        mode="edit"
        player={player}
        slug={slug}
        getPinHash={getPinHash}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onSaved={() => router.refresh()}
      />

      <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 group">
        <PlayerAvatar
          player={player}
          size="sm"
          className={!player.is_active ? 'opacity-40' : undefined}
        />

        <span className={`flex-1 text-sm ${!player.is_active ? 'text-muted-foreground line-through' : ''}`}>
          {player.name}
        </span>

        {/* Bank / guaranteed badges (active players only) */}
        {player.is_active && bankData && (
          bankData.is_guaranteed
            ? <GuaranteedBadge streak={bankData.consecutive_sit_outs} />
            : bankData.bank_entries > 1
              ? (
                <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted">
                  {bankData.bank_entries} entries in bank
                </span>
              )
              : null
        )}

        {!player.is_active && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Inactive
          </Badge>
        )}

        {isAdmin && (
          <div className="flex items-center gap-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setProfileOpen(true)}
                  disabled={isPending}
                >
                  <PencilIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit player</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleToggleActive}
                  disabled={isPending}
                >
                  {player.is_active ? <EyeOffIcon /> : <EyeIcon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{player.is_active ? 'Deactivate' : 'Reactivate'}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </>
  )
}
