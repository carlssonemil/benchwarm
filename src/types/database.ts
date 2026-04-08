export interface Team {
  id: string
  name: string
  slug: string
  admin_pin_hash: string
  match_size: number
  recovery_token_hash: string | null
  logo_url: string | null
  created_at: string
}

export interface Player {
  id: string
  team_id: string
  name: string
  is_active: boolean
  avatar_url: string | null
  steam_id: string | null
  steam_fetched_at: string | null
  created_at: string
}

export interface Season {
  id: string
  team_id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
  match_count: number
}

export interface Match {
  id: string
  season_id: string
  team_id: string
  title: string | null
  played_at: string
  status: 'planned' | 'completed'
  created_at: string
}

export interface MatchPlayer {
  id: string
  match_id: string
  player_id: string
  was_available: boolean
  was_selected: boolean
  bank_entries_at_spin: number
  was_guaranteed: boolean
  was_no_show: boolean
  was_replacement: boolean
}

// Derived types for UI use
export interface PlayerWithBank extends Player {
  bank_entries: number
  consecutive_sit_outs: number
  is_guaranteed: boolean
}

export interface MatchWithPlayers extends Match {
  players: (MatchPlayer & { player: Player })[]
}

export interface PlayerStat {
  player: Player
  gamesPlayed: number
  gamesSatOut: number
  timesUnavailable: number
  timesNoShow: number
  currentBank: number
  playRate: number | null
}
