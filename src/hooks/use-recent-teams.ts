'use client'

import { useCallback, useEffect, useState } from 'react'
import { RECENT_TEAMS_KEY } from '@/lib/constants'

interface RecentTeam {
  slug: string
  name: string
  lastVisited: number // Unix timestamp ms
}

export function useRecentTeams() {
  const [teams, setTeams] = useState<RecentTeam[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_TEAMS_KEY)
      if (stored) setTeams(JSON.parse(stored))
    } catch {}
  }, [])

  const saveTeam = useCallback((slug: string, name: string) => {
    setTeams(prev => {
      const filtered = prev.filter(t => t.slug !== slug)
      const updated = [{ slug, name, lastVisited: Date.now() }, ...filtered].slice(0, 10)
      try { localStorage.setItem(RECENT_TEAMS_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const removeTeam = useCallback((slug: string) => {
    setTeams(prev => {
      const updated = prev.filter(t => t.slug !== slug)
      try { localStorage.setItem(RECENT_TEAMS_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  return { teams, saveTeam, removeTeam }
}
