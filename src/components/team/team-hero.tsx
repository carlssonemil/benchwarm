'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AdminPinDialog } from './admin-pin-dialog'
import { TeamSettingsDialog } from './team-settings-dialog'
import { useAdmin } from '@/hooks/use-admin'
import { useRecentTeams } from '@/hooks/use-recent-teams'
import { LockOpenIcon, LockIcon, LinkIcon, CheckIcon, SettingsIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Team } from '@/types/database'

interface TeamHeroProps {
  team: Team
}

export function TeamHero({ team }: TeamHeroProps) {
  const { isAdmin, setAdminPin, clearAdmin, getStoredPinHash } = useAdmin(team.slug)
  const { saveTeam } = useRecentTeams()
  const [pinDialogOpen, setPinDialogOpen] = useState(false)

  useEffect(() => { saveTeam(team.slug, team.name) }, [team.slug, team.name, saveTeam])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleCopyLink() {
    const url = `${window.location.origin}/team/${team.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="max-w-3xl mx-auto w-full px-4 pt-6 pb-6">
      {isAdmin && (
        <div className="w-full rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-4">
          <LockOpenIcon className="size-3.5 shrink-0" />
          Admin mode — you can manage players and settings
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {team.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.logo_url}
              alt=""
              className="size-9 rounded object-contain shrink-0"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
          
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{team.name}</h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <LinkIcon className="size-3.5" />}
            <span className="hidden sm:inline">{copied ? 'URL Copied!' : 'Share'}</span>
          </Button>

          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                >
                  <SettingsIcon className="size-3.5" />
                  <span className="sr-only">Settings</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Team settings</TooltipContent>
            </Tooltip>
          )}

          {isAdmin ? (
            <Button variant="outline" size="sm" onClick={clearAdmin}>
              <LockOpenIcon className="size-3.5" />
              <span className="hidden sm:inline">Exit Admin</span>
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setPinDialogOpen(true)}>
              <LockIcon className="size-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          )}
        </div>
      </div>

      <AdminPinDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        slug={team.slug}
        onVerified={setAdminPin}
      />

      <TeamSettingsDialog
        team={team}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        getStoredPinHash={getStoredPinHash}
        onPinChanged={setAdminPin}
      />
    </section>
  )
}
