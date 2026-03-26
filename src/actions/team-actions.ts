'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requirePin } from '@/lib/pin'
import type { Team } from '@/types/database'

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}

export async function createTeam(data: {
  name: string
  slug: string
  pinHash: string
  matchSize: number
  recoveryTokenHash: string
}): Promise<{ slug?: string; error?: string }> {
  const { name, slug, pinHash, matchSize, recoveryTokenHash } = data

  if (!name.trim()) return { error: 'Team name is required.' }
  if (!/^[a-z0-9-]+$/.test(slug)) return { error: 'Slug may only contain lowercase letters, numbers, and hyphens.' }
  if (matchSize < 1 || matchSize > 22) return { error: 'Match size must be between 1 and 22.' }

  const existing = await sql`SELECT id FROM teams WHERE slug = ${slug}`
  if (existing.length > 0) return { error: 'That slug is already taken. Try a different team name or edit the slug.' }

  await sql`
    INSERT INTO teams (name, slug, admin_pin_hash, match_size, recovery_token_hash)
    VALUES (${name.trim()}, ${slug}, ${pinHash}, ${matchSize}, ${recoveryTokenHash})
  `

  return { slug }
}

export async function getTeamsSummary(slugs: string[]): Promise<Array<{
  slug: string
  name: string
  match_size: number
  player_count: number
  last_match_at: string | null
}>> {
  if (slugs.length === 0) return []
  const rows = await sql`
    SELECT
      t.slug,
      t.name,
      t.match_size,
      COUNT(DISTINCT p.id) FILTER (WHERE p.is_active = true) AS player_count,
      MAX(g.played_at) AS last_match_at
    FROM teams t
    LEFT JOIN players p ON p.team_id = t.id
    LEFT JOIN matches g ON g.team_id = t.id
    WHERE t.slug = ANY(${slugs})
    GROUP BY t.slug, t.name, t.match_size
  `
  return rows as Array<{
    slug: string
    name: string
    match_size: number
    player_count: number
    last_match_at: string | null
  }>
}

export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const rows = await sql`SELECT * FROM teams WHERE slug = ${slug} LIMIT 1`
  return (rows[0] as Team) ?? null
}

export async function verifyTeamPin(slug: string, pinHash: string): Promise<boolean> {
  const rows = await sql`SELECT admin_pin_hash FROM teams WHERE slug = ${slug} LIMIT 1`
  if (rows.length === 0) return false
  return (rows[0] as { admin_pin_hash: string }).admin_pin_hash === pinHash
}

export async function updateTeamSettings(
  slug: string,
  pinHash: string,
  data: {
    name: string
    matchSize: number
    newPinHash?: string
    logoUrl?: string
  },
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  const { name, matchSize, newPinHash, logoUrl } = data

  if (!name.trim()) return { error: 'Team name is required.' }
  if (matchSize < 1 || matchSize > 22) return { error: 'Match size must be between 1 and 22.' }

  if (logoUrl) {
    try { new URL(logoUrl) } catch { return { error: 'Logo URL must be a valid URL.' } }
  }

  const logoValue = logoUrl?.trim() || null

  if (newPinHash) {
    await sql`
      UPDATE teams
      SET name = ${name.trim()}, match_size = ${matchSize}, admin_pin_hash = ${newPinHash}, logo_url = ${logoValue}
      WHERE slug = ${slug}
    `
  } else {
    await sql`
      UPDATE teams
      SET name = ${name.trim()}, match_size = ${matchSize}, logo_url = ${logoValue}
      WHERE slug = ${slug}
    `
  }

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function resetAdminPin(
  slug: string,
  tokenHash: string,
  newPinHash: string,
): Promise<{ error?: string }> {
  const rows = await sql`
    SELECT recovery_token_hash FROM teams WHERE slug = ${slug} LIMIT 1
  `
  const stored = (rows[0] as { recovery_token_hash: string | null } | undefined)
    ?.recovery_token_hash

  if (!stored) {
    return { error: 'No recovery code has been set for this team. Contact your database admin.' }
  }
  if (stored !== tokenHash) {
    return { error: 'Incorrect recovery code.' }
  }

  await sql`UPDATE teams SET admin_pin_hash = ${newPinHash} WHERE slug = ${slug}`

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function updateRecoveryToken(
  slug: string,
  pinHash: string,
  newTokenHash: string,
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  await sql`UPDATE teams SET recovery_token_hash = ${newTokenHash} WHERE slug = ${slug}`

  revalidatePath(`/team/${slug}`)
  return {}
}
