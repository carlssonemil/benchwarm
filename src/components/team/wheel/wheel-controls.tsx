'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRightIcon, ZapIcon, LoaderPinwheelIcon } from 'lucide-react'

export type ControlsPhase = 'ready' | 'spinning' | 'landed' | 'done'

interface WheelControlsProps {
  phase: ControlsPhase
  spinIndex: number      // 0-based, which spin we're on (0 = first)
  totalSpins: number     // how many spins total
  winnerName?: string
  winnerColor?: string
  onSpin: () => void
  onNext: () => void     // "Next pick" or "Confirm"
  onQuickSpin?: () => void
  autoSpin?: boolean
}

export function WheelControls({
  phase,
  spinIndex,
  totalSpins,
  winnerName,
  winnerColor,
  onSpin,
  onNext,
  onQuickSpin,
  autoSpin,
}: WheelControlsProps) {
  const spinsLeft = totalSpins - spinIndex  // remaining INCLUDING current
  const isLast = spinIndex === totalSpins - 1

  return (
    <div className="flex flex-col items-center gap-3 pt-1">
      <AnimatePresence mode="wait">
        {phase === 'ready' && spinIndex === 0 && (
          <motion.div
            key="spin-btn"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            <Button
              size="lg"
              onClick={onSpin}
              className="gap-2 px-8"
            >
              <LoaderPinwheelIcon className="size-4" />
              {spinIndex === 0 ? 'Spin!' : `Spin again`}
              {totalSpins > 1 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {spinsLeft} left
                </Badge>
              )}
            </Button>
            {onQuickSpin && spinIndex === 0 && (
              <Button variant="ghost" size="sm" onClick={onQuickSpin} className="gap-1.5 text-muted-foreground">
                <ZapIcon className="size-3.5" />
                Quick spin all {totalSpins}
              </Button>
            )}
          </motion.div>
        )}

        {phase === 'landed' && !autoSpin && (
          <motion.div
            key="next-btn"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, delay: 0.4 }}
            className="flex flex-col items-center gap-2"
          >
            <Button onClick={onNext} className="gap-2 px-8">
              {isLast ? 'Confirm lineup' : 'Next pick'}
              <ChevronRightIcon className="size-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
