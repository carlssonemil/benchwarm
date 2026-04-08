'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlayerAvatar } from '@/components/player-avatar'
import { addPlayer, updatePlayerProfile, refreshSteamAvatar, renamePlayer } from '@/actions/player-actions'
import { toast } from 'sonner'
import { RefreshCwIcon } from 'lucide-react'
import type { Player } from '@/types/database'

// Shared between create and edit modes
interface BaseProps {
  slug: string
  getPinHash: () => string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

interface CreateProps extends BaseProps {
  mode: 'create'
  player?: never
}

interface EditProps extends BaseProps {
  mode: 'edit'
  player: Player
}

type PlayerProfileDialogProps = CreateProps | EditProps

export function PlayerProfileDialog({
  mode,
  player,
  slug,
  getPinHash,
  open,
  onOpenChange,
  onSaved,
}: PlayerProfileDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(player?.name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(player?.avatar_url ?? '')
  const [steamInput, setSteamInput] = useState(player?.steam_id ?? '')

  // Reset fields when dialog opens
  function handleOpenChange(value: boolean) {
    if (value) {
      setName(player?.name ?? '')
      setAvatarUrl(player?.avatar_url ?? '')
      setSteamInput(player?.steam_id ?? '')
    }
    onOpenChange(value)
  }

  function handleSave() {
    startTransition(async () => {
      const pinHash = getPinHash()
      if (!pinHash) return

      if (mode === 'create') {
        // If no name but Steam is provided, use a placeholder — we'll rename after Steam fetch
        const playerName = name.trim() || (steamInput.trim() ? 'New player' : '')
        const addResult = await addPlayer(slug, pinHash, playerName)
        if (addResult.error) {
          toast.error(addResult.error)
          return
        }

        const newId = addResult.id!

        // Attach avatar/Steam if provided
        if (avatarUrl || steamInput) {
          const profileResult = await updatePlayerProfile(slug, pinHash, newId, {
            avatarUrl: avatarUrl || undefined,
            steamInput: steamInput || undefined,
          })
          if (profileResult.error) {
            toast.warning(`Player added, but avatar failed: ${profileResult.error}`)
          } else if (profileResult.steamName) {
            // Use Steam name if no custom name was provided
            if (!name.trim()) {
              await renamePlayer(slug, pinHash, newId, profileResult.steamName)
            }
            toast.success(`${profileResult.steamName} added to roster.`)
          } else {
            toast.success(`${playerName} added to roster.`)
          }
        } else {
          toast.success(`${playerName} added to roster.`)
        }

        onOpenChange(false)
        onSaved()
        return
      }

      // Edit mode — update avatar/Steam first so we know the Steam name
      const profileResult = await updatePlayerProfile(slug, pinHash, player.id, {
        avatarUrl: avatarUrl || undefined,
        steamInput: steamInput || undefined,
      })

      if (profileResult.error) {
        toast.error(profileResult.error)
        return
      }

      // Determine the final name: use Steam name if name field was cleared and Steam returned a name
      const finalName = name.trim() || profileResult.steamName || player.name
      if (finalName !== player.name) {
        const renameResult = await renamePlayer(slug, pinHash, player.id, finalName)
        if (renameResult.error) {
          toast.error(renameResult.error)
          return
        }
      }

      if (profileResult.steamName && !name.trim()) {
        toast.success(`Name updated from Steam: ${profileResult.steamName}`)
      } else if (profileResult.steamName) {
        toast.success(`Linked to Steam: ${profileResult.steamName}`)
      } else {
        toast.success('Profile updated.')
      }

      onOpenChange(false)
      onSaved()
    })
  }

  function handleRefreshSteam() {
    if (!player) return
    startTransition(async () => {
      const pinHash = getPinHash()
      if (!pinHash) return
      const result = await refreshSteamAvatar(slug, pinHash, player.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Steam avatar refreshed.')
        onSaved()
      }
    })
  }

  // Preview player for avatar rendering (works in both modes)
  const previewPlayer = {
    id: player?.id ?? 'preview',
    name: name || (player?.name ?? '?'),
    avatar_url: avatarUrl || null,
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add player' : 'Edit player'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Avatar preview */}
          <div className="flex justify-center py-2">
            <PlayerAvatar player={previewPlayer} size="lg" />
          </div>

          {/* Steam option */}
          <div className={`flex flex-col gap-3 rounded-lg border p-3 transition-colors ${steamInput.trim() ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
            <p className="text-sm font-medium leading-none">Import from Steam</p>
            <p className="text-xs text-muted-foreground -mt-1">Name and avatar are pulled automatically</p>
            <div className="flex gap-2">
              <Input
                id="steam-input"
                value={steamInput}
                onChange={e => {
                  setSteamInput(e.target.value)
                  if (e.target.value) setAvatarUrl('')
                }}
                placeholder="76561198... or steamcommunity.com/id/..."
                disabled={isPending}
                className="flex-1"
              />
              {mode === 'edit' && player.steam_id && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleRefreshSteam}
                  disabled={isPending}
                  title="Refresh from Steam"
                >
                  <RefreshCwIcon />
                </Button>
              )}
            </div>
            {mode === 'edit' && player.steam_fetched_at && (
              <p className="text-xs text-muted-foreground">
                Last synced {new Date(player.steam_fetched_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Manual option */}
          <div className={`flex flex-col gap-3 rounded-lg border p-3 transition-colors ${(name.trim() || avatarUrl.trim()) && !steamInput.trim() ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
            <p className="text-sm font-medium leading-none">Set manually</p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="player-name">Name</Label>
              <Input
                id="player-name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                placeholder="Player name"
                disabled={isPending}
                autoFocus={mode === 'create'}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="avatar-url">Avatar URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="avatar-url"
                value={avatarUrl}
                onChange={e => {
                  setAvatarUrl(e.target.value)
                  if (e.target.value) setSteamInput('')
                }}
                placeholder="https://example.com/avatar.png"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || (!name.trim() && !steamInput.trim())}>
              {mode === 'create' ? 'Add' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
