'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreateTeamDialog } from './create-team-dialog'
import { JoinTeamForm } from './join-team-form'
import { DemoWheel } from './demo-wheel'
import { RecentTeams } from './recent-teams'
import { Separator } from '@/components/ui/separator'
import { ShieldCheckIcon, LinkIcon, TrophyIcon } from 'lucide-react'

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Build your roster',
    description: 'Add all your players. Set how many play each week.',
  },
  {
    step: '02',
    title: 'Spin the wheel',
    description:
      "Each session, mark who's available. The wheel picks the lineup — weighted fairly.",
  },
  {
    step: '03',
    title: 'Sit-outs earn entries',
    description:
      'Missed out? You get extra wheel weight next time. Sit out twice in a row? Guaranteed a spot.',
  },
]

export function HeroSection() {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="relative w-full overflow-hidden">
      {/* Background glows — full viewport width */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 -translate-x-1/2 size-[600px] rounded-full bg-amber-700/10 blur-3xl" />
        <div className="absolute top-8 right-1/4 translate-x-1/2 size-[400px] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="flex flex-col w-full max-w-5xl mx-auto px-4">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-center gap-10 pt-28 pb-16 md:pt-36 md:pb-24">
          {/* Left: copy + CTA */}
          <div className="flex flex-col gap-7 flex-1 text-center md:text-left">
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                Benchwarm
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto md:mx-0">
                Fair lineup rotation for your game team. A weighted spin-the-wheel
                picks who plays each week — no spreadsheets, no arguments.
              </p>
            </div>

            <div className="flex flex-col items-center md:items-start gap-5 w-full max-w-sm mx-auto md:mx-0">
              <Button size="lg" className="w-full" onClick={() => setCreateOpen(true)}>
                Create a team
              </Button>

              <div className="flex items-center gap-3 w-full">
                <Separator className="flex-1" />

                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  or join one
                </span>

                <Separator className="flex-1" />
              </div>

              <JoinTeamForm />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 text-sm text-muted-foreground justify-center md:justify-start">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="size-3.5 shrink-0" />
                Share a link — no accounts
              </span>

              <span className="flex items-center gap-1.5">
                <ShieldCheckIcon className="size-3.5 shrink-0" />
                PIN-protected admin
              </span>

              <span className="flex items-center gap-1.5">
                <TrophyIcon className="size-3.5 shrink-0" />
                Full match history
              </span>
            </div>
          </div>

          {/* Right: demo wheel */}
          <div className="hidden md:flex shrink-0 flex-col items-center">
            <DemoWheel size={280} />
          </div>
        </div>

        {/* ── Recent teams ────────────────────────────────────────────────── */}
        <RecentTeams />

        {/* ── How it works ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-8 pb-20">
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />

            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap">
              How it works
            </h2>

            <Separator className="flex-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(item => (
              <div key={item.step} className="flex flex-col gap-3 p-5 rounded-xl border bg-card">
                <span className="text-3xl font-bold leading-none text-amber-500/50">
                  {item.step}
                </span>

                <div className="flex flex-col gap-1.5">
                  <h3 className="font-semibold">{item.title}</h3>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CreateTeamDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
