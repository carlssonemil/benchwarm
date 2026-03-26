'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreateSeasonDialog } from '@/components/team/season/create-season-dialog'
import { useAdminContext } from '@/components/team/admin-context'
import {
  TrophyIcon,
  Users2Icon,
  CalendarIcon,
  LockIcon,
  CheckCircle2Icon,
} from 'lucide-react'
import type { Team } from '@/types/database'

interface OnboardingWelcomeProps {
  team: Team
  hasSeasons: boolean
  hasActivePlayers: boolean
}

export function OnboardingWelcome({ team, hasSeasons, hasActivePlayers }: OnboardingWelcomeProps) {
  const router = useRouter()
  const { isAdmin, getStoredPinHash } = useAdminContext()
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false)

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <LockIcon className="size-8 text-muted-foreground/50" />
        <p className="text-muted-foreground">This team is being set up. Check back soon!</p>
      </div>
    )
  }

  // When steps 1+2 are done, show a compact prompt instead of the full cards
  if (hasSeasons && hasActivePlayers) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground mb-4">
        <CalendarIcon className="size-4 shrink-0" />
        <p>Last step — use the <span className="text-foreground font-medium">Plan match</span> button to schedule your first match.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Welcome to {team.name}</h2>
        <p className="text-muted-foreground text-sm mt-1">Get your team set up in a few steps.</p>
      </div>

      <div className="flex flex-col gap-3">
        {/* Step 1: Create a season */}
        <StepCard
          done={hasSeasons}
          icon={<TrophyIcon className="size-4" />}
          title="Create a season"
          description="Start a season to begin tracking matches."
          action={
            !hasSeasons ? (
              <Button size="sm" onClick={() => setSeasonDialogOpen(true)}>
                Create season
              </Button>
            ) : null
          }
        />

        {/* Step 2: Update roster */}
        <StepCard
          done={hasActivePlayers}
          disabled={!hasSeasons}
          icon={<Users2Icon className="size-4" />}
          title="Update roster"
          description="Add your team members to the roster."
          action={
            hasSeasons && !hasActivePlayers ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.replace('?tab=roster', { scroll: false })}
              >
                Go to Roster
              </Button>
            ) : null
          }
        />

        {/* Step 3: Plan a match */}
        <StepCard
          done={false}
          disabled={true}
          icon={<CalendarIcon className="size-4" />}
          title="Plan a match"
          description="Schedule a match and spin the wheel."
        />
      </div>

      <CreateSeasonDialog
        open={seasonDialogOpen}
        onOpenChange={setSeasonDialogOpen}
        slug={team.slug}
        getPinHash={getStoredPinHash}
      />
    </div>
  )
}

interface StepCardProps {
  done: boolean
  disabled?: boolean
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

function StepCard({ done, disabled, icon, title, description, action }: StepCardProps) {
  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 transition-opacity ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        {done
          ? <CheckCircle2Icon className="size-4 text-green-500" />
          : <span className={done ? 'text-green-500' : 'text-muted-foreground'}>{icon}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${done ? 'line-through text-muted-foreground' : ''}`}>{title}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{description}</p>
      </div>
      {action}
    </div>
  )
}
