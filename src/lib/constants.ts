export const DEFAULT_MATCH_SIZE = 5

export const ADMIN_PIN_SESSION_KEY = 'admin_pin_hash'

export const RECENT_TEAMS_KEY = 'benchwarm_recent_teams'

export const PLAYER_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#14b8a6', // teal
  '#a855f7', // purple
]

export function playerColor(playerId: string): string {
  let hash = 0
  for (let i = 0; i < playerId.length; i++) {
    hash = ((hash << 5) - hash) + playerId.charCodeAt(i)
    hash |= 0
  }
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length]
}
