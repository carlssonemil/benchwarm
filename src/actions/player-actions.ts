'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requirePin } from '@/lib/pin'
import { resolveSteamId, fetchSteamProfile } from '@/lib/steam'
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
): Promise<{ error?: string; id?: string }> {
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

  const rows = await sql`
    INSERT INTO players (team_id, name)
    VALUES (${teamId}, ${trimmed})
    RETURNING id
  `

  revalidatePath(`/team/${slug}`)
  return { id: (rows[0] as { id: string }).id }
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

export async function updatePlayerProfile(
  slug: string,
  pinHash: string,
  playerId: string,
  data: { avatarUrl?: string; steamInput?: string },
): Promise<{ error?: string; steamName?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  let avatarUrl: string | null = data.avatarUrl?.trim() || null
  let steamId: string | null = null
  let steamName: string | undefined

  if (data.steamInput?.trim()) {
    const resolved = resolveSteamId(data.steamInput.trim())
    if (!resolved) return { error: 'Could not parse Steam ID or URL.' }

    const profile = await fetchSteamProfile(resolved)
    if (!profile) return { error: 'Could not fetch Steam profile. The profile may be private or the ID is invalid.' }

    steamId = resolved
    avatarUrl = profile.avatarUrl
    steamName = profile.name

    await sql`
      UPDATE players
      SET avatar_url = ${avatarUrl}, steam_id = ${steamId}, steam_fetched_at = NOW()
      WHERE id = ${playerId}
    `
  } else {
    // Manual avatar URL only — clear any existing Steam link
    await sql`
      UPDATE players
      SET avatar_url = ${avatarUrl}, steam_id = NULL, steam_fetched_at = NULL
      WHERE id = ${playerId}
    `
  }

  revalidatePath(`/team/${slug}`)
  return { steamName }
}

export async function refreshSteamAvatar(
  slug: string,
  pinHash: string,
  playerId: string,
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  const rows = await sql`SELECT steam_id FROM players WHERE id = ${playerId} LIMIT 1`
  const player = rows[0] as { steam_id: string | null } | undefined
  if (!player?.steam_id) return { error: 'No Steam ID linked to this player.' }

  const profile = await fetchSteamProfile(player.steam_id)
  if (!profile) return { error: 'Could not fetch Steam profile. The profile may be private.' }

  await sql`
    UPDATE players
    SET avatar_url = ${profile.avatarUrl}, steam_fetched_at = NOW()
    WHERE id = ${playerId}
  `

  revalidatePath(`/team/${slug}`)
  return {}
}

/**
 * Re-fetches Steam profiles for all players on a team whose data is >24h stale.
 * Called fire-and-forget on page load — does not throw.
 */
export async function refreshStaleSteamProfiles(teamId: string): Promise<void> {
  try {
    const rows = await sql`
      SELECT id, steam_id FROM players
      WHERE team_id = ${teamId}
        AND steam_id IS NOT NULL
        AND (steam_fetched_at IS NULL OR steam_fetched_at < NOW() - INTERVAL '24 hours')
    `

    for (const row of rows as Array<{ id: string; steam_id: string }>) {
      const profile = await fetchSteamProfile(row.steam_id)
      if (profile) {
        await sql`
          UPDATE players
          SET avatar_url = ${profile.avatarUrl}, steam_fetched_at = NOW()
          WHERE id = ${row.id}
        `
      }
    }
  } catch {
    // Silently swallow errors — this is a background refresh, not user-facing
  }
}
