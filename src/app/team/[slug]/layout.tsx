import { notFound } from 'next/navigation'
import { getTeamBySlug } from '@/actions/team-actions'
import { TeamHero } from '@/components/team/team-hero'
import { AdminProvider } from '@/components/team/admin-context'

interface TeamLayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function TeamLayout({ children, params }: TeamLayoutProps) {
  const { slug } = await params
  const team = await getTeamBySlug(slug)

  if (!team) notFound()

  return (
    <AdminProvider slug={slug}>
      <TeamHero team={team} />
      <div className="flex flex-col flex-1">{children}</div>
    </AdminProvider>
  )
}
