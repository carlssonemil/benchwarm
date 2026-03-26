'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GuaranteedBadge } from './guaranteed-badge'
import { SpinningWheel, type SpinningWheelHandle, type WheelSegment } from '@/components/team/wheel/spinning-wheel'
import { WheelControls, type ControlsPhase } from '@/components/team/wheel/wheel-controls'
import { runSelection, type SelectionResult } from '@/lib/selection'
import { PLAYER_COLORS } from '@/lib/constants'
import { ArrowLeftIcon, PartyPopperIcon } from 'lucide-react'
import type { PlayerWithBank } from '@/types/database'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Pick one winner from the pool, weighted by bank_entries. */
function pickWeighted(pool: PlayerWithBank[]): PlayerWithBank {
  const weighted: PlayerWithBank[] = []
  for (const p of pool) {
    for (let i = 0; i < p.bank_entries; i++) weighted.push(p)
  }
  return weighted[Math.floor(Math.random() * weighted.length)]
}

function buildSegments(
  pool: PlayerWithBank[],
  colorMap: Map<string, string>,
): WheelSegment[] {
  const total = pool.reduce((s, p) => s + p.bank_entries, 0)
  if (total === 0) return []
  return pool.map(p => ({
    id: p.id,
    name: p.name,
    color: colorMap.get(p.id) ?? '#6366f1',
    arc: (p.bank_entries / total) * 2 * Math.PI,
  }))
}

// ── Component ─────────────────────────────────────────────────────────────────

interface WheelStepProps {
  bankedPlayers: PlayerWithBank[]
  matchSize: number
  onBack: () => void
  onConfirm: (result: SelectionResult) => void
  stepIndicator?: React.ReactNode
}

export function WheelStep({ bankedPlayers, matchSize, onBack, onConfirm, stepIndicator }: WheelStepProps) {
  // Pre-compute guaranteed vs pool split (stable for the duration of this step)
  const guaranteed = useMemo(
    () => bankedPlayers.filter(p => p.is_guaranteed),
    [bankedPlayers],
  )
  const initialPool = useMemo(
    () => bankedPlayers.filter(p => !p.is_guaranteed),
    [bankedPlayers],
  )
  const slotsToFill = Math.max(0, matchSize - guaranteed.length)

  // Stable color assignment based on original player order
  const colorMap = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>()
    bankedPlayers.forEach((p, i) => map.set(p.id, PLAYER_COLORS[i % PLAYER_COLORS.length]))
    return map
  }, [bankedPlayers])

  // Determine if a spin is even needed (edge cases per spec section 9.5)
  const noSpinNeeded = useMemo(() => {
    const { spinNeeded } = runSelection(bankedPlayers, matchSize)
    return !spinNeeded
  }, [bankedPlayers, matchSize])

  // ── Sequential spin state ────────────────────────────────────────────────
  const [pool, setPool] = useState<PlayerWithBank[]>(initialPool)
  const [picked, setPicked] = useState<PlayerWithBank[]>([])
  const [phase, setPhase] = useState<ControlsPhase>('ready')
  const [pendingWinner, setPendingWinner] = useState<PlayerWithBank | null>(null)
  const [poolKey, setPoolKey] = useState(0) // increments to remount wheel between spins

  const wheelRef = useRef<SpinningWheelHandle>(null)
  const segments = useMemo(() => buildSegments(pool, colorMap), [pool, colorMap])

  const spinIndex = picked.length          // how many picks done so far
  const totalSpins = slotsToFill           // total picks needed

  const [autoSpin, setAutoSpin] = useState(false)

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSpin = useCallback(() => {
    if (pool.length === 0) return
    const winner = pickWeighted(pool)
    setPendingWinner(winner)
    setPhase('spinning')
    wheelRef.current?.spin(winner.id)
  }, [pool])

  const handleSpinEnd = useCallback((_winnerId: string) => {
    setPhase('landed')
  }, [])

  const handleNext = useCallback(() => {
    if (!pendingWinner) return

    const newPicked = [...picked, pendingWinner]
    const newPool = pool.filter(p => p.id !== pendingWinner.id)

    setPicked(newPicked)
    setPool(newPool)
    setPendingWinner(null)

    if (newPicked.length >= slotsToFill) {
      // All spins done — build result and confirm
      onConfirm({
        guaranteed,
        picked: newPicked,
        notPicked: newPool,
        spinNeeded: true,
      })
    } else {
      // More spins needed — remount wheel with updated pool
      setPoolKey(k => k + 1)
      setPhase('ready')
    }
  }, [pendingWinner, picked, pool, slotsToFill, guaranteed, onConfirm])

  const handleQuickSpin = useCallback(() => {
    setAutoSpin(true)
    handleSpin()
  }, [handleSpin])

  // Auto-advance from landed → next spin when autoSpin is active
  useEffect(() => {
    if (!autoSpin || phase !== 'landed') return
    const t = setTimeout(handleNext, 1000)
    return () => clearTimeout(t)
  }, [autoSpin, phase, handleNext])

  // Auto-trigger the next spin after the wheel remounts between picks
  useEffect(() => {
    if (!autoSpin || phase !== 'ready' || spinIndex === 0) return
    const t = setTimeout(handleSpin, 300)
    return () => clearTimeout(t)
  }, [autoSpin, phase, spinIndex, handleSpin])

  // ── No-spin edge case ─────────────────────────────────────────────────────
  if (noSpinNeeded) {
    const result = runSelection(bankedPlayers, matchSize)
    const allPlay = [...result.guaranteed, ...result.picked]

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <PartyPopperIcon className="size-10 text-primary" />
          <div>
            <p className="font-medium">Everyone plays!</p>

            <p className="text-sm text-muted-foreground mt-0.5">
              {allPlay.length >= matchSize
                ? 'Not enough available players to need a draw.'
                : 'All spots filled without a spin.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          {allPlay.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-emerald-50 dark:bg-emerald-900/10">
              <span className="text-sm font-medium">{p.name}</span>
              {p.is_guaranteed && <GuaranteedBadge streak={p.consecutive_sit_outs} />}
            </div>
          ))}
        </div>

        <div className="relative flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeftIcon />
            Back
          </Button>

          <div className="absolute left-1/2 -translate-x-1/2">{stepIndicator}</div>
          
          <Button onClick={() => onConfirm(result)}>
            Confirm lineup
          </Button>
        </div>
      </div>
    )
  }

  // ── Spin flow ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Guaranteed players — always visible at top */}
      {guaranteed.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Guaranteed ({guaranteed.length})
          </p>

          <div className="flex flex-wrap gap-1.5">
            {guaranteed.map(p => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
                style={{ backgroundColor: colorMap.get(p.id) }}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Already-picked players */}
      <AnimatePresence>
        {picked.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-col gap-1.5"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Picked ({picked.length}/{totalSpins})
            </p>

            <div className="flex flex-wrap gap-1.5">
              {picked.map(p => (
                <motion.span
                  key={p.id}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
                  style={{ backgroundColor: colorMap.get(p.id) }}
                >
                  {p.name}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated wheel — remounts between spins via key */}
      <AnimatePresence mode="wait">
        <motion.div
          key={poolKey}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.88 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <SpinningWheel
            ref={wheelRef}
            segments={segments}
            onSpinEnd={handleSpinEnd}
          />
        </motion.div>
      </AnimatePresence>

      {/* Pool preview — shown only before first spin */}
      {spinIndex === 0 && phase === 'ready' && (
        <div className="flex flex-wrap gap-1.5 justify-center max-w-xs mx-auto">
          {pool.map(p => (
            <Badge key={p.id} variant="outline" className="text-xs gap-1">
              <span
                className="size-2 rounded-full inline-block"
                style={{ backgroundColor: colorMap.get(p.id) }}
              />
              {p.name}
              {p.bank_entries > 1 && (
                <span className="text-muted-foreground">×{p.bank_entries}</span>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Controls */}
      <WheelControls
        phase={phase}
        spinIndex={spinIndex}
        totalSpins={totalSpins}
        winnerName={pendingWinner?.name}
        winnerColor={pendingWinner ? (colorMap.get(pendingWinner.id) ?? '#6366f1') : undefined}
        onSpin={handleSpin}
        onNext={handleNext}
        onQuickSpin={totalSpins > 1 ? handleQuickSpin : undefined}
        autoSpin={autoSpin}
      />

      {/* Back + step indicator row (only before spinning starts) */}
      {spinIndex === 0 && phase === 'ready' && (
        <div className="relative flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeftIcon className="size-3.5" />
            Back
          </Button>
          
          <div className="absolute left-1/2 -translate-x-1/2">{stepIndicator}</div>
          <div />
        </div>
      )}
    </div>
  )
}
