'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontalIcon, UsersIcon, CheckCircleIcon, Trash2Icon, PencilIcon } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { MatchWithPlayers } from '@/types/database'

interface UpcomingMatchCardProps {
  match: MatchWithPlayers
  isAdmin: boolean
  onAssignPlayers: (match: MatchWithPlayers) => void
  onComplete: (matchId: string) => Promise<void>
  onDelete: (matchId: string) => Promise<void>
  onEdit: (match: MatchWithPlayers) => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function UpcomingMatchCard({
  match,
  isAdmin,
  onAssignPlayers,
  onComplete,
  onDelete,
  onEdit,
}: UpcomingMatchCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const playing = match.players.filter(p => p.was_selected)
  const hasPlayers = match.players.length > 0

  async function handleComplete() {
    setIsCompleting(true)
    try {
      await onComplete(match.id)
    } finally {
      setIsCompleting(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await onDelete(match.id)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="font-semibold text-sm">{match.title || formatDate(match.played_at)}</p>
            {match.title && (
              <p className="text-xs text-muted-foreground">{formatDate(match.played_at)}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {hasPlayers && playing.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 shrink-0">
                {playing.length} playing
              </Badge>
            )}
            {isAdmin && (<>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative size-8 sm:size-7 p-0 after:absolute after:inset-[-6px] after:content-['']">
                    <MoreHorizontalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onAssignPlayers(match)}>
                    <UsersIcon className="size-3.5" />
                    {hasPlayers ? 'Reassign players' : 'Assign players'}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => onEdit(match)}>
                    <PencilIcon className="size-3.5" />
                    Edit date / title
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleComplete}
                    disabled={isCompleting}
                  >
                    <CheckCircleIcon className="size-3.5" />
                    {isCompleting ? 'Completing…' : 'Mark as played'}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={isDeleting}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2Icon className="size-3.5" />
                    {isDeleting ? 'Deleting…' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ConfirmDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                title="Delete match?"
                description="This will permanently delete the match and all player records for it."
                confirmLabel="Delete"
                onConfirm={handleDelete}
              />
            </>)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {!hasPlayers ? (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Players not yet assigned</p>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => onAssignPlayers(match)}
              >
                <UsersIcon className="size-3" />
                Assign players
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {playing.map(p => (
              <span
                key={p.player.name}
                className="text-sm px-3 py-1 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              >
                {p.player.name}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
