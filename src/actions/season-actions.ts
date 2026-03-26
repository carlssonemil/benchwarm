'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requirePin } from '@/lib/pin'
import type { Season } from '@/types/database'

export async function getSeasonsByTeamId(teamId: string): Promise<Season[]> {
  const rows = await sql`
    SELECT s.*,
      (SELECT COUNT(*) FROM matches m WHERE m.season_id = s.id AND m.status = 'completed')::int AS match_count
    FROM seasons s
    WHERE s.team_id = ${teamId}
    ORDER BY s.created_at DESC
  `
  return rows as Season[]
}

export async function createSeason(
  slug: string,
  pinHash: string,
  data: { name: string; startDate?: string; endDate?: string },
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  const { name, startDate, endDate } = data

  if (!name.trim()) return { error: 'Season name is required.' }

  const teams = await sql`SELECT id FROM teams WHERE slug = ${slug} LIMIT 1`
  const teamId = (teams[0] as { id: string } | undefined)?.id
  if (!teamId) return { error: 'Team not found.' }

  const existing = await sql`
    SELECT id FROM seasons WHERE team_id = ${teamId} AND is_active = true LIMIT 1
  `
  if (existing.length > 0) {
    return { error: 'There is already an active season. End it before creating a new one.' }
  }

  if (startDate && endDate) {
    await sql`INSERT INTO seasons (team_id, name, start_date, end_date, is_active) VALUES (${teamId}, ${name.trim()}, ${startDate}, ${endDate}, true)`
  } else if (startDate) {
    await sql`INSERT INTO seasons (team_id, name, start_date, is_active) VALUES (${teamId}, ${name.trim()}, ${startDate}, true)`
  } else if (endDate) {
    await sql`INSERT INTO seasons (team_id, name, end_date, is_active) VALUES (${teamId}, ${name.trim()}, ${endDate}, true)`
  } else {
    await sql`INSERT INTO seasons (team_id, name, is_active) VALUES (${teamId}, ${name.trim()}, true)`
  }

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function endSeason(
  slug: string,
  pinHash: string,
  seasonId: string,
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  await sql`
    UPDATE seasons
    SET is_active = false, end_date = current_date
    WHERE id = ${seasonId}
  `

  revalidatePath(`/team/${slug}`)
  return {}
}
