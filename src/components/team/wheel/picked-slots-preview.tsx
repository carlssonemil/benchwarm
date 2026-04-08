'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { UserRoundIcon } from 'lucide-react'
import { PlayerAvatar } from '@/components/player-avatar'
import type { PlayerWithBank } from '@/types/database'
import type { ControlsPhase } from './wheel-controls'

interface PickedSlotsPreviewProps {
  totalSlots: number
  picked: PlayerWithBank[]
  pendingWinner: PlayerWithBank | null
  colorMap: Map<string, string>
  phase: ControlsPhase
}

export function PickedSlotsPreview({
  totalSlots,
  picked,
  pendingWinner,
  colorMap,
  phase,
}: PickedSlotsPreviewProps) {
  if (totalSlots === 0) return null

  return (
    <div className="flex justify-center gap-3 flex-wrap pt-1">
      {Array.from({ length: totalSlots }, (_, i) => {
        const confirmed = picked[i] ?? null
        const isPending = !confirmed && i === picked.length && pendingWinner !== null && phase === 'landed'
        const player = confirmed ?? (isPending ? pendingWinner : null)
        const color = player ? (colorMap.get(player.id) ?? '#6366f1') : undefined

        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="size-10">
              <AnimatePresence mode="wait">
                {player ? (
                  <motion.div
                    key={player.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    className="size-10"
                  >
                    <PlayerAvatar player={player} color={color} size="lg" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="size-10 rounded-full bg-muted flex items-center justify-center"
                  >
                    <UserRoundIcon className="size-4 text-muted-foreground/50" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Name label — only for filled slots */}
            <div className="h-4">
              {player && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="max-w-16 truncate text-xs text-center text-muted-foreground leading-none"
                >
                  {player.name}
                </motion.p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
