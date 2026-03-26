import type { PlayerWithBank } from '@/types/database'

export interface SelectionResult {
  guaranteed: PlayerWithBank[]
  picked: PlayerWithBank[]     // randomly selected from pool
  notPicked: PlayerWithBank[]  // available but not selected
  spinNeeded: boolean
}

/**
 * Runs the weighted selection algorithm per section 9 of the plan.
 * Pure function — no side effects, safe to call repeatedly for re-picks.
 */
export function runSelection(
  availablePlayers: PlayerWithBank[],
  matchSize: number,
): SelectionResult {
  const guaranteed = availablePlayers.filter(p => p.is_guaranteed)
  const nonGuaranteed = availablePlayers.filter(p => !p.is_guaranteed)

  const slotsRemaining = matchSize - guaranteed.length

  // Fewer available than matchSize — everyone plays, no spin needed
  if (availablePlayers.length <= matchSize) {
    return { guaranteed, picked: nonGuaranteed, notPicked: [], spinNeeded: false }
  }

  // Guaranteed players alone fill or exceed matchSize
  if (slotsRemaining <= 0) {
    return {
      guaranteed: guaranteed.slice(0, matchSize),
      picked: [],
      notPicked: [...nonGuaranteed, ...guaranteed.slice(matchSize)],
      spinNeeded: false,
    }
  }

  // Not enough non-guaranteed players to need a spin
  if (nonGuaranteed.length <= slotsRemaining) {
    return { guaranteed, picked: nonGuaranteed, notPicked: [], spinNeeded: false }
  }

  // Build weighted pool: each player appears bank_entries times
  const pool: PlayerWithBank[] = []
  for (const player of nonGuaranteed) {
    for (let i = 0; i < player.bank_entries; i++) {
      pool.push(player)
    }
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  // Pick unique players until slots are filled
  const picked: PlayerWithBank[] = []
  const pickedIds = new Set<string>()

  for (const entry of pool) {
    if (pickedIds.has(entry.id)) continue
    picked.push(entry)
    pickedIds.add(entry.id)
    if (picked.length >= slotsRemaining) break
  }

  const notPicked = nonGuaranteed.filter(p => !pickedIds.has(p.id))

  return { guaranteed, picked, notPicked, spinNeeded: true }
}
