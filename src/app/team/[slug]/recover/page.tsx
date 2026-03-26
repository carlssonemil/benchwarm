import { notFound } from 'next/navigation'
import { getTeamBySlug } from '@/actions/team-actions'
import { PinRecoveryForm } from '@/components/team/pin-recovery-form'

interface RecoverPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: RecoverPageProps) {
  const { slug } = await params
  const team = await getTeamBySlug(slug)
  if (!team) return {}
  return { title: `Reset PIN — ${team.name} — Benchwarm` }
}

export default async function RecoverPage({ params }: RecoverPageProps) {
  const { slug } = await params
  const team = await getTeamBySlug(slug)
  if (!team) notFound()

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <PinRecoveryForm team={team} />
      </div>
    </div>
  )
}
