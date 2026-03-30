'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requirePin } from '@/lib/pin'
import type { Match, MatchWithPlayers, Player, PlayerStat, PlayerWithBank } from '@/types/database'

/** Neon returns DATE columns as Date objects; normalize to "YYYY-MM-DD" string. */
function toDateString(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, '0')
    const d = String(value.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return value as string
}

// ---------------------------------------------------------------------------
// Planned matches
// ---------------------------------------------------------------------------

export async function createPlannedMatch(
  slug: string,
  pinHash: string,
  data: {
    seasonId: string
    teamId: string
    title: string | null
    scheduledDate: string
  },
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  const { seasonId, teamId, title, scheduledDate } = data
  await sql`
    INSERT INTO matches (season_id, team_id, title, played_at, status)
    VALUES (${seasonId}, ${teamId}, ${title}, ${scheduledDate}, 'planned')
  `

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function getPlannedMatchesWithPlayers(teamId: string): Promise<MatchWithPlayers[]> {
  const rows = await sql`
    SELECT
      g.id, g.season_id, g.team_id, g.title, g.played_at, g.status, g.created_at,
      gp.id              AS gp_id,
      gp.player_id,
      gp.was_available,
      gp.was_selected,
      gp.bank_entries_at_spin,
      gp.was_guaranteed,
      gp.was_no_show,
      gp.was_replacement,
      p.name             AS player_name,
      p.is_active        AS player_is_active,
      p.team_id          AS player_team_id,
      p.created_at       AS player_created_at
    FROM matches g
    LEFT JOIN match_players gp ON gp.match_id = g.id
    LEFT JOIN players p ON p.id = gp.player_id
    WHERE g.team_id = ${teamId} AND g.status = 'planned'
    ORDER BY g.played_at ASC, g.created_at ASC, p.name ASC
  `

  const matchMap = new Map<string, MatchWithPlayers>()

  for (const row of rows as Array<Record<string, unknown>>) {
    const matchId = row.id as string

    if (!matchMap.has(matchId)) {
      matchMap.set(matchId, {
        id: matchId,
        season_id: row.season_id as string,
        team_id: row.team_id as string,
        title: row.title as string | null,
        played_at: toDateString(row.played_at),
        status: row.status as 'planned' | 'completed',
        created_at: row.created_at as string,
        players: [],
      })
    }

    // LEFT JOIN may return null for player columns if no players assigned
    if (row.gp_id) {
      matchMap.get(matchId)!.players.push({
        id: row.gp_id as string,
        match_id: matchId,
        player_id: row.player_id as string,
        was_available: row.was_available as boolean,
        was_selected: row.was_selected as boolean,
        bank_entries_at_spin: row.bank_entries_at_spin as number,
        was_guaranteed: row.was_guaranteed as boolean,
        was_no_show: row.was_no_show as boolean,
        was_replacement: row.was_replacement as boolean,
        player: {
          id: row.player_id as string,
          name: row.player_name as string,
          team_id: row.player_team_id as string,
          is_active: row.player_is_active as boolean,
          created_at: row.player_created_at as string,
        },
      })
    }
  }

  return Array.from(matchMap.values())
}

export async function assignPlayersToPlannedMatch(
  slug: string,
  pinHash: string,
  data: {
    matchId: string
    players: Array<{
      playerId: string
      wasAvailable: boolean
      wasSelected: boolean
      bankEntriesAtSpin: number
      wasGuaranteed: boolean
    }>
  },
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  const { matchId, players } = data

  await sql`DELETE FROM match_players WHERE match_id = ${matchId}`

  for (const p of players) {
    await sql`
      INSERT INTO match_players
        (match_id, player_id, was_available, was_selected, bank_entries_at_spin, was_guaranteed, was_no_show, was_replacement)
      VALUES
        (${matchId}, ${p.playerId}, ${p.wasAvailable}, ${p.wasSelected}, ${p.bankEntriesAtSpin}, ${p.wasGuaranteed}, false, false)
    `
  }

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function completeMatch(
  slug: string,
  pinHash: string,
  matchId: string,
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  // Ensure at least one player is assigned before completing
  const rows = await sql`SELECT COUNT(*) AS cnt FROM match_players WHERE match_id = ${matchId}`
  const count = Number((rows[0] as { cnt: string }).cnt)
  if (count === 0) {
    return { error: 'Assign players before completing this match.' }
  }

  await sql`UPDATE matches SET status = 'completed' WHERE id = ${matchId}`

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function deletePlannedMatch(
  slug: string,
  pinHash: string,
  matchId: string,
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  await sql`DELETE FROM matches WHERE id = ${matchId} AND status = 'planned'`

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function updatePlannedMatch(
  slug: string,
  pinHash: string,
  data: { matchId: string; title: string | null; scheduledDate: string },
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  await sql`
    UPDATE matches
    SET title = ${data.title}, played_at = ${data.scheduledDate}
    WHERE id = ${data.matchId} AND status = 'planned'
  `

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function getMatchesBySeasonId(seasonId: string): Promise<Match[]> {
  const rows = await sql`
    SELECT * FROM matches
    WHERE season_id = ${seasonId}
    ORDER BY played_at DESC, created_at DESC
  `
  return rows as Match[]
}

/**
 * Computes bank entries and consecutive sit-out streak for a list of players
 * within a season. Bank is always derived from history — never stored.
 */
export async function computePlayerBanks(
  seasonId: string,
  players: Player[],
): Promise<PlayerWithBank[]> {
  if (players.length === 0) return []

  // All participation records for this season, reverse chronological (completed only)
  const history = await sql`
    SELECT
      gp.player_id,
      gp.was_available,
      gp.was_selected,
      gp.was_replacement
    FROM match_players gp
    JOIN matches g ON g.id = gp.match_id
    WHERE g.season_id = ${seasonId} AND g.status = 'completed'
    ORDER BY g.played_at DESC, g.created_at DESC
  `

  // Group rows by player_id — already in reverse chronological order
  const byPlayer = new Map<string, Array<{ was_available: boolean; was_selected: boolean; was_replacement: boolean }>>()
  for (const row of history as Array<{
    player_id: string
    was_available: boolean
    was_selected: boolean
    was_replacement: boolean
  }>) {
    if (!byPlayer.has(row.player_id)) byPlayer.set(row.player_id, [])
    byPlayer.get(row.player_id)!.push({
      was_available: row.was_available,
      was_selected: row.was_selected,
      was_replacement: row.was_replacement,
    })
  }

  return players.map(player => {
    const playerHistory = byPlayer.get(player.id) ?? []
    let bank = 1
    let consecutiveSitOuts = 0

    for (const entry of playerHistory) {
      if (entry.was_replacement) {
        break // played as replacement — streak stops
      } else if (entry.was_available && !entry.was_selected) {
        bank += 1
        consecutiveSitOuts += 1
      } else if (!entry.was_available) {
        bank += 1
        consecutiveSitOuts += 1
      } else {
        break // played — streak stops
      }
    }

    return {
      ...player,
      bank_entries: bank,
      consecutive_sit_outs: consecutiveSitOuts,
      is_guaranteed: consecutiveSitOuts >= 2,
    }
  })
}

export async function saveMatch(
  slug: string,
  pinHash: string,
  data: {
    seasonId: string
    teamId: string
    title: string | null
    playedAt: string
    players: Array<{
      playerId: string
      wasAvailable: boolean
      wasSelected: boolean
      bankEntriesAtSpin: number
      wasGuaranteed: boolean
      wasNoShow?: boolean
      wasReplacement?: boolean
    }>
  },
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  const { seasonId, teamId, title, playedAt, players } = data

  if (players.length === 0) return { error: 'No players to record.' }

  const matchRows = await sql`
    INSERT INTO matches (season_id, team_id, title, played_at)
    VALUES (${seasonId}, ${teamId}, ${title}, ${playedAt})
    RETURNING id
  `
  const matchId = (matchRows[0] as { id: string }).id

  for (const p of players) {
    await sql`
      INSERT INTO match_players
        (match_id, player_id, was_available, was_selected, bank_entries_at_spin, was_guaranteed, was_no_show, was_replacement)
      VALUES
        (${matchId}, ${p.playerId}, ${p.wasAvailable}, ${p.wasSelected}, ${p.bankEntriesAtSpin}, ${p.wasGuaranteed}, ${p.wasNoShow ?? false}, ${p.wasReplacement ?? false})
    `
  }

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function getMatchesWithPlayers(seasonId: string, teamId?: string): Promise<MatchWithPlayers[]> {
  const rows = await (seasonId === 'all' && teamId
    ? sql`
      SELECT
        g.id, g.season_id, g.team_id, g.title, g.played_at, g.status, g.created_at,
        gp.id              AS gp_id,
        gp.player_id,
        gp.was_available,
        gp.was_selected,
        gp.bank_entries_at_spin,
        gp.was_guaranteed,
        gp.was_no_show,
        gp.was_replacement,
        p.name             AS player_name,
        p.is_active        AS player_is_active,
        p.team_id          AS player_team_id,
        p.created_at       AS player_created_at
      FROM matches g
      JOIN match_players gp ON gp.match_id = g.id
      JOIN players p ON p.id = gp.player_id
      WHERE g.team_id = ${teamId} AND g.status = 'completed'
      ORDER BY g.played_at DESC, g.created_at DESC, p.name ASC
    `
    : sql`
      SELECT
        g.id, g.season_id, g.team_id, g.title, g.played_at, g.status, g.created_at,
        gp.id              AS gp_id,
        gp.player_id,
        gp.was_available,
        gp.was_selected,
        gp.bank_entries_at_spin,
        gp.was_guaranteed,
        gp.was_no_show,
        gp.was_replacement,
        p.name             AS player_name,
        p.is_active        AS player_is_active,
        p.team_id          AS player_team_id,
        p.created_at       AS player_created_at
      FROM matches g
      JOIN match_players gp ON gp.match_id = g.id
      JOIN players p ON p.id = gp.player_id
      WHERE g.season_id = ${seasonId} AND g.status = 'completed'
      ORDER BY g.played_at DESC, g.created_at DESC, p.name ASC
    `)

  const matchMap = new Map<string, MatchWithPlayers>()

  for (const row of rows as Array<Record<string, unknown>>) {
    const matchId = row.id as string

    if (!matchMap.has(matchId)) {
      matchMap.set(matchId, {
        id: matchId,
        season_id: row.season_id as string,
        team_id: row.team_id as string,
        title: row.title as string | null,
        played_at: toDateString(row.played_at),
        status: row.status as 'planned' | 'completed',
        created_at: row.created_at as string,
        players: [],
      })
    }

    matchMap.get(matchId)!.players.push({
      id: row.gp_id as string,
      match_id: matchId,
      player_id: row.player_id as string,
      was_available: row.was_available as boolean,
      was_selected: row.was_selected as boolean,
      bank_entries_at_spin: row.bank_entries_at_spin as number,
      was_guaranteed: row.was_guaranteed as boolean,
      was_no_show: row.was_no_show as boolean,
      was_replacement: row.was_replacement as boolean,
      player: {
        id: row.player_id as string,
        name: row.player_name as string,
        team_id: row.player_team_id as string,
        is_active: row.player_is_active as boolean,
        created_at: row.player_created_at as string,
      },
    })
  }

  return Array.from(matchMap.values())
}

export async function undoLastMatch(
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
    DELETE FROM matches
    WHERE id = (
      SELECT id FROM matches
      WHERE season_id = ${seasonId} AND status = 'completed'
      ORDER BY played_at DESC, created_at DESC
      LIMIT 1
    )
  `

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function deleteMatch(
  slug: string,
  pinHash: string,
  matchId: string,
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  await sql`DELETE FROM matches WHERE id = ${matchId} AND status = 'completed'`

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function revertMatchToPlanned(
  slug: string,
  pinHash: string,
  matchId: string,
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  await sql`DELETE FROM match_players WHERE match_id = ${matchId}`
  await sql`UPDATE matches SET status = 'planned' WHERE id = ${matchId} AND status = 'completed'`

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function updateMatch(
  slug: string,
  pinHash: string,
  data: {
    matchId: string
    title: string | null
    playedAt: string
    players: Array<{
      playerId: string
      wasAvailable: boolean
      wasSelected: boolean
      bankEntriesAtSpin: number
      wasGuaranteed: boolean
      wasNoShow?: boolean
      wasReplacement?: boolean
    }>
  },
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  const { matchId, title, playedAt, players } = data

  if (players.length === 0) return { error: 'No players to record.' }

  await sql`
    UPDATE matches
    SET played_at = ${playedAt}, title = ${title}
    WHERE id = ${matchId}
  `

  await sql`DELETE FROM match_players WHERE match_id = ${matchId}`

  for (const p of players) {
    await sql`
      INSERT INTO match_players
        (match_id, player_id, was_available, was_selected, bank_entries_at_spin, was_guaranteed, was_no_show, was_replacement)
      VALUES
        (${matchId}, ${p.playerId}, ${p.wasAvailable}, ${p.wasSelected}, ${p.bankEntriesAtSpin}, ${p.wasGuaranteed}, ${p.wasNoShow ?? false}, ${p.wasReplacement ?? false})
    `
  }

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function markNoShows(
  slug: string,
  pinHash: string,
  data: {
    matchId: string
    noShowPlayerIds: string[]
    replacementPlayerIds: string[]
  },
): Promise<{ error?: string }> {
  try {
    await requirePin(slug, pinHash)
  } catch {
    return { error: 'Unauthorized.' }
  }

  const { matchId, noShowPlayerIds, replacementPlayerIds } = data

  // Reset all flags for this match first
  await sql`UPDATE match_players SET was_no_show = false, was_replacement = false WHERE match_id = ${matchId}`

  for (const playerId of noShowPlayerIds) {
    await sql`UPDATE match_players SET was_no_show = true WHERE match_id = ${matchId} AND player_id = ${playerId} AND was_selected = true`
  }

  for (const playerId of replacementPlayerIds) {
    await sql`UPDATE match_players SET was_replacement = true WHERE match_id = ${matchId} AND player_id = ${playerId} AND was_selected = false`
  }

  revalidatePath(`/team/${slug}`)
  return {}
}

export async function getPlayerStats(seasonId: string, teamId?: string): Promise<PlayerStat[]> {
  const rows = await (seasonId === 'all' && teamId
    ? sql`
      SELECT
        p.id              AS player_id,
        p.name            AS player_name,
        p.team_id,
        p.is_active,
        p.created_at      AS player_created_at,
        gp.was_available,
        gp.was_selected,
        gp.was_no_show,
        gp.was_replacement
      FROM match_players gp
      JOIN players p ON p.id = gp.player_id
      JOIN matches g ON g.id = gp.match_id
      WHERE g.team_id = ${teamId} AND g.status = 'completed'
      ORDER BY p.id, g.played_at DESC, g.created_at DESC
    `
    : sql`
      SELECT
        p.id              AS player_id,
        p.name            AS player_name,
        p.team_id,
        p.is_active,
        p.created_at      AS player_created_at,
        gp.was_available,
        gp.was_selected,
        gp.was_no_show,
        gp.was_replacement
      FROM match_players gp
      JOIN players p ON p.id = gp.player_id
      JOIN matches g ON g.id = gp.match_id
      WHERE g.season_id = ${seasonId} AND g.status = 'completed'
      ORDER BY p.id, g.played_at DESC, g.created_at DESC
    `)

  const byPlayer = new Map<
    string,
    { player: Player; records: Array<{ was_available: boolean; was_selected: boolean; was_no_show: boolean; was_replacement: boolean }> }
  >()

  for (const row of rows as Array<Record<string, unknown>>) {
    const pid = row.player_id as string
    if (!byPlayer.has(pid)) {
      byPlayer.set(pid, {
        player: {
          id: pid,
          name: row.player_name as string,
          team_id: row.team_id as string,
          is_active: row.is_active as boolean,
          created_at: row.player_created_at as string,
        },
        records: [],
      })
    }
    byPlayer.get(pid)!.records.push({
      was_available: row.was_available as boolean,
      was_selected: row.was_selected as boolean,
      was_no_show: row.was_no_show as boolean,
      was_replacement: row.was_replacement as boolean,
    })
  }

  return Array.from(byPlayer.values())
    .map(({ player, records }) => {
      let gamesPlayed = 0
      let gamesSatOut = 0
      let timesUnavailable = 0
      let timesNoShow = 0
      let currentBank = 1
      let bankDone = false

      for (const r of records) {
        if (r.was_no_show) timesNoShow++
        else if (r.was_selected || r.was_replacement) gamesPlayed++
        else if (r.was_available) gamesSatOut++
        else timesUnavailable++

        if (!bankDone) {
          if (r.was_replacement) {
            bankDone = true
          } else if (r.was_available && !r.was_selected) {
            currentBank++
          } else if (!r.was_available) {
            currentBank++
          } else {
            bankDone = true
          }
        }
      }

      const available = gamesPlayed + gamesSatOut
      const playRate = available > 0 ? gamesPlayed / available : null
      return { player, gamesPlayed, gamesSatOut, timesUnavailable, timesNoShow, currentBank, playRate }
    })
    .sort((a, b) => a.player.name.localeCompare(b.player.name))
}
