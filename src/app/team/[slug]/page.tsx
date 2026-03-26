import { getTeamBySlug } from '@/actions/team-actions'
import { getPlayersByTeamId } from '@/actions/player-actions'
import { getSeasonsByTeamId } from '@/actions/season-actions'
import { getPlannedMatchesWithPlayers } from '@/actions/match-actions'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { TabsContent } from '@/components/ui/tabs'
import { PlayerList } from '@/components/team/roster/player-list'
import { SeasonManager } from '@/components/team/season/season-manager'
import { MatchHistory } from '@/components/team/history/match-history'
import { PlayerStatsView } from '@/components/team/history/player-stats-view'
import { UpcomingMatches } from '@/components/team/match/upcoming-matches'
import { OnboardingWelcome } from '@/components/team/onboarding-welcome'
import { TeamTabs } from '@/components/team/team-tabs'

interface TeamPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: TeamPageProps) {
  const { slug } = await params
  const team = await getTeamBySlug(slug)
  if (!team) return {}
  return {
    title: `${team.name} — Benchwarm`,
    description: `Match lineups and player stats for ${team.name}. Powered by Benchwarm.`,
  }
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params
  const team = await getTeamBySlug(slug)
  if (!team) notFound()

  const [players, seasons, plannedMatches] = await Promise.all([
    getPlayersByTeamId(team.id),
    getSeasonsByTeamId(team.id),
    getPlannedMatchesWithPlayers(team.id),
  ])

  const hasSeasons = seasons.length > 0
  const hasActivePlayers = players.some(p => p.is_active)
  const hasPlannedMatches = plannedMatches.length > 0
  const needsOnboarding = !hasSeasons || !hasActivePlayers || !hasPlannedMatches

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 pb-6 gap-6">
      <Suspense>
      <TeamTabs>
        <TabsContent value="matches" className="pt-6">
          {needsOnboarding && (
            <OnboardingWelcome
              team={team}
              hasSeasons={hasSeasons}
              hasActivePlayers={hasActivePlayers}
            />
          )}
          {(hasSeasons && hasActivePlayers) && (
            <UpcomingMatches
              team={team}
              initialSeasons={seasons}
              activePlayers={players.filter(p => p.is_active)}
            />
          )}
        </TabsContent>

        <TabsContent value="roster" className="pt-6">
          <PlayerList team={team} initialPlayers={players} activeSeason={seasons.find(s => s.is_active)} />
        </TabsContent>

        <TabsContent value="history" className="pt-6">
          <MatchHistory
            seasons={seasons}
            teamSlug={team.slug}
            team={team}
            activePlayers={players.filter(p => p.is_active)}
          />
        </TabsContent>

        <TabsContent value="stats" className="pt-6">
          <PlayerStatsView seasons={seasons} team={team} />
        </TabsContent>

        <TabsContent value="seasons" className="pt-6">
          <SeasonManager
            team={team}
            initialSeasons={seasons}
          />
        </TabsContent>
      </TeamTabs>
      </Suspense>
    </div>
  )
}
