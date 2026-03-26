'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requirePin } from '@/lib/pin'
import type { Player } from '@/types/database'

export async function getPlayersByTeamId(teamId: string): Promise<Player[]> {
  const rows = await sql`
    SELECT * FROM players
    WHERE team_id = ${teamId}
    ORDER BY created_at ASC
  `
  return rows as Player[]
}

export async function addPlayer(
  slug: string,
  pinHash: string,
  name: string,
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Player name is required.' }
  if (trimmed.length > 60) return { error: 'Name must be 60 characters or fewer.' }

  const teams = await sql`SELECT id FROM teams WHERE slug = ${slug} LIMIT 1`
  const teamId = (teams[0] as { id: string } | undefined)?.id
  if (!teamId) return { error: 'Team not found.' }

  await sql`
    INSERT INTO players (team_id, name)
    VALUES (${teamId}, ${trimmed})
  `

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function renamePlayer(
  slug: string,
  pinHash: string,
  playerId: string,
  name: string,
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name cannot be empty.' }
  if (trimmed.length > 60) return { error: 'Name must be 60 characters or fewer.' }

  await sql`
    UPDATE players SET name = ${trimmed}
    WHERE id = ${playerId}
  `

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function setPlayerActive(
  slug: string,
  pinHash: string,
  playerId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  await sql`
    UPDATE players SET is_active = ${isActive}
    WHERE id = ${playerId}
  `

  revalidatePath(`/team/${slug}`)
  return {}
}
