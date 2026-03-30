'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { GuaranteedBadge } from '@/components/team/match/guaranteed-badge'
import { renamePlayer, setPlayerActive } from '@/actions/player-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PencilIcon, CheckIcon, XIcon, EyeOffIcon, EyeIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Player, PlayerWithBank } from '@/types/database'

interface PlayerRowProps {
  player: Player
  slug: string
  isAdmin: boolean
  getPinHash: () => string | null
  bankData?: PlayerWithBank
  avatarColor: string
}

export function PlayerRow({ player, slug, isAdmin, getPinHash, bankData, avatarColor }: PlayerRowProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(player.name)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setEditName(player.name)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function cancelEdit() {
    setEditing(false)
    setEditName(player.name)
  }

  function handleRename() {
    if (editName.trim() === player.name) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      const pinHash = getPinHash()
      if (!pinHash) return
      const result = await renamePlayer(slug, pinHash, player.id, editName)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Player renamed.')
        setEditing(false)
        router.refresh()
      }
    })
  }

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
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 group">
      {/* Colored initial avatar */}
      <div
        className="size-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
        style={{ backgroundColor: player.is_active ? avatarColor : undefined }}
        aria-hidden
      >
        {!player.is_active ? (
          <span className="size-7 rounded-full bg-muted-foreground/20 flex items-center justify-center text-muted-foreground">
            {player.name[0]?.toUpperCase()}
          </span>
        ) : (
          player.name[0]?.toUpperCase()
        )}
      </div>

      {editing ? (
        <>
          <Input
            ref={inputRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') cancelEdit()
            }}
            className="h-7 text-sm"
            disabled={isPending}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="ghost" onClick={handleRename} disabled={isPending}>
                <CheckIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="ghost" onClick={cancelEdit} disabled={isPending}>
                <XIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel</TooltipContent>
          </Tooltip>
        </>
      ) : (
        <>
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
                    onClick={startEdit}
                    disabled={isPending}
                  >
                    <PencilIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rename</TooltipContent>
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
        </>
      )}
    </div>
  )
}
