'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CreateSeasonDialog } from './create-season-dialog'
import { endSeason } from '@/actions/season-actions'
import { useAdmin } from '@/hooks/use-admin'
import { toast } from 'sonner'
import { CalendarIcon, PlusIcon, LockIcon, StopCircleIcon, SwordsIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Season, Team } from '@/types/database'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface SeasonManagerProps {
  team: Team
  initialSeasons: Season[]
}

export function SeasonManager({ team, initialSeasons }: SeasonManagerProps) {
  const router = useRouter()
  const { isAdmin, getStoredPinHash } = useAdmin(team.slug)
  const [createOpen, setCreateOpen] = useState(false)
  const [confirmEndId, setConfirmEndId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeSeason = initialSeasons.find(s => s.is_active) ?? null
  const pastSeasons = initialSeasons.filter(s => !s.is_active)

  function handleEndSeason() {
    if (!confirmEndId) return
    startTransition(async () => {
      const pinHash = getStoredPinHash()
      if (!pinHash) return
      const result = await endSeason(team.slug, pinHash, confirmEndId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Season ended.')
        setConfirmEndId(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Active season */}
      {activeSeason ? (
        <div className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">{activeSeason.name}</h3>
                <Badge variant="default" className="text-xs">Active</Badge>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {activeSeason.start_date && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="size-3" />
                    Started {formatDate(activeSeason.start_date)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <SwordsIcon className="size-3" />
                  {activeSeason.match_count} {activeSeason.match_count === 1 ? 'match' : 'matches'} played
                </p>
              </div>
            </div>

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmEndId(activeSeason.id)}
                disabled={isPending}
              >
                <StopCircleIcon className="size-3.5" />
                End season
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CalendarIcon className="size-8 text-muted-foreground/50" />

          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">No active season</p>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Create a season to start tracking matches.' : 'Ask your admin to create a season.'}
            </p>
          </div>

          {isAdmin && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              New season
            </Button>
          )}
        </div>
      )}

      {/* New season button (when there's already an active season) */}
      {activeSeason && isAdmin && (
        <div className="flex justify-end">
          <Tooltip disableHoverableContent={!activeSeason}>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!activeSeason}
                >
                  <PlusIcon />
                  New season
                </Button>
              </span>
            </TooltipTrigger>
            {activeSeason && (
              <TooltipContent>End the active season before creating a new one</TooltipContent>
            )}
          </Tooltip>
        </div>
      )}

      {/* Past seasons */}
      {pastSeasons.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Past seasons</span>
            <Separator className="flex-1" />
          </div>

          <div className="flex flex-col gap-1">
            {pastSeasons.map(season => (
              <div key={season.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-muted-foreground">{season.name}</span>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-muted-foreground/70">
                      {season.start_date ? formatDate(season.start_date) : formatDate(season.created_at)}
                      {season.end_date ? ` – ${formatDate(season.end_date)}` : ''}
                    </span>

                    <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                      <SwordsIcon className="size-3" />
                      {season.match_count} {season.match_count === 1 ? 'match' : 'matches'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAdmin && !activeSeason && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <LockIcon className="size-3" />
          Admin access required to manage seasons.
        </p>
      )}

      <CreateSeasonDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        slug={team.slug}
        getPinHash={getStoredPinHash}
      />

      <AlertDialog open={!!confirmEndId} onOpenChange={open => { if (!open) setConfirmEndId(null) }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>End this season?</AlertDialogTitle>
            
            <AlertDialogDescription>
              The season will be marked as ended. Match history is preserved. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>

            <AlertDialogAction
              variant="destructive"
              onClick={handleEndSeason}
              disabled={isPending}
            >
              {isPending ? 'Ending…' : 'End season'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
