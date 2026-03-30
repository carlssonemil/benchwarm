'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { MoreHorizontalIcon, PencilIcon, Undo2Icon, Trash2Icon, ChevronDownIcon, UserXIcon } from 'lucide-react'
import type { MatchWithPlayers } from '@/types/database'

interface MatchCardProps {
  match: MatchWithPlayers
  isAdmin: boolean
  onDelete: () => Promise<void>
  onRevert: () => Promise<void>
  onEdit: () => void
  onNoShow: () => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function MatchCard({ match, isAdmin, onDelete, onRevert, onEdit, onNoShow }: MatchCardProps) {
  const [isActing, setIsActing] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const playing = match.players.filter(p => p.was_selected && !p.was_no_show)
  const noShows = match.players.filter(p => p.was_no_show)
  const replacements = match.players.filter(p => p.was_replacement)
  const satOut = match.players.filter(p => p.was_available && !p.was_selected && !p.was_replacement)
  const unavailable = match.players.filter(p => !p.was_available)

  async function handleDelete() {
    setIsActing(true)
    try { await onDelete() } finally { setIsActing(false) }
  }

  async function handleRevert() {
    setIsActing(true)
    try { await onRevert() } finally { setIsActing(false) }
  }

  return (
    <Card
      className="cursor-pointer select-none"
      onClick={() => setExpanded(e => !e)}
    >
      <CardHeader
        className={`transition-[padding] duration-200 ease-in-out ${expanded ? 'pb-3' : ''}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="font-semibold text-sm">{match.title || formatDate(match.played_at)}</p>
            {match.title && (
              <p className="text-xs text-muted-foreground">{formatDate(match.played_at)}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {playing.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 shrink-0">
                {playing.length} playing
              </Badge>
            )}
            {isAdmin && (<>
              <div onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="size-7 p-0" disabled={isActing}>
                      <MoreHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                      <PencilIcon className="size-3.5" />
                      Edit
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={onNoShow}>
                      <UserXIcon className="size-3.5" />
                      Report no-shows
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleRevert}>
                      <Undo2Icon className="size-3.5" />
                      Mark as not played
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2Icon className="size-3.5" />
                      Delete
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
              </div>
            </>)}

            <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </CardHeader>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <CardContent className="flex flex-col gap-3 pb-3">
              {playing.length > 0 && (
                <PlayerGroup
                  label="Playing"
                  players={playing.map(p => p.player.name)}
                  variant="playing"
                />
              )}
              {noShows.length > 0 && (
                <PlayerGroup
                  label="No-show"
                  players={noShows.map(p => p.player.name)}
                  variant="noshow"
                />
              )}
              {replacements.length > 0 && (
                <PlayerGroup
                  label="Stepped in"
                  players={replacements.map(p => p.player.name)}
                  variant="replacement"
                />
              )}
              {satOut.length > 0 && (
                <PlayerGroup
                  label="Sat out"
                  players={satOut.map(p => p.player.name)}
                  variant="satout"
                />
              )}
              {unavailable.length > 0 && (
                <PlayerGroup
                  label="Unavailable"
                  players={unavailable.map(p => p.player.name)}
                  variant="unavailable"
                />
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function PlayerGroup({
  label,
  players,
  variant,
}: {
  label: string
  players: string[]
  variant: 'playing' | 'noshow' | 'replacement' | 'satout' | 'unavailable'
}) {
  const dotColor =
    variant === 'playing'
      ? 'bg-emerald-500'
      : variant === 'noshow'
        ? 'bg-rose-500'
        : variant === 'replacement'
          ? 'bg-sky-500'
          : variant === 'satout'
            ? 'bg-amber-500'
            : 'bg-muted-foreground/40'

  const pillClass =
    variant === 'playing'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
      : variant === 'noshow'
        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
        : variant === 'replacement'
          ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
          : variant === 'satout'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
            : 'bg-muted text-muted-foreground'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className={`size-2 rounded-full shrink-0 ${dotColor}`} />

        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label} ({players.length})
        </span>
      </div>
      
      <div className="flex flex-wrap gap-1.5 pl-3.5">
        {players.map(name => (
          <span
            key={name}
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${pillClass}`}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
