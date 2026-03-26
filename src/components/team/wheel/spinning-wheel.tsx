'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { drawWheelFrame, type WheelSegment } from './wheel-canvas'

// ── Constants ────────────────────────────────────────────────────────────────

const SPIN_DURATION_MS = 5200
const FULL_ROTATIONS = 7 // extra full spins added before landing for drama

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

function fireConfetti() {
  const opts = { spread: 60, startVelocity: 45, ticks: 120, zIndex: 9999 }
  confetti({ ...opts, particleCount: 70, angle: 60, origin: { x: 0.1, y: 0.55 } })
  confetti({ ...opts, particleCount: 70, angle: 120, origin: { x: 0.9, y: 0.55 } })
}

// ── Types ────────────────────────────────────────────────────────────────────

export type { WheelSegment }

export interface SpinningWheelHandle {
  /** Pre-determined winner — wheel animates to land on this segment. */
  spin: (winnerId: string) => void
}

interface SpinningWheelProps {
  segments: WheelSegment[]
  onSpinEnd: (winnerId: string) => void
  size?: number
}

// ── Component ────────────────────────────────────────────────────────────────

export const SpinningWheel = forwardRef<SpinningWheelHandle, SpinningWheelProps>(
  function SpinningWheel({ segments, onSpinEnd, size: sizeProp }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const dprRef = useRef(1)
    const angleRef = useRef(0)     // current wheel angle (radians, increases clockwise)
    const animRef = useRef<number | null>(null)
    const sizeRef = useRef(sizeProp ?? 300)

    const [size, setSize] = useState(sizeProp ?? 300)
    const [winner, setWinner] = useState<WheelSegment | null>(null)
    const [isSpinning, setIsSpinning] = useState(false)

    // ── Responsive sizing via ResizeObserver ─────────────────────────────────
    useEffect(() => {
      if (sizeProp !== undefined) return // explicit size overrides auto
      const el = containerRef.current
      if (!el) return

      const observer = new ResizeObserver(entries => {
        const w = entries[0]?.contentRect.width ?? 300
        const newSize = Math.min(Math.floor(w), 340)
        setSize(newSize)
        sizeRef.current = newSize
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [sizeProp])

    // ── Canvas setup (runs on mount and whenever size changes) ──────────────
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      dprRef.current = dpr
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
    }, [size])

    // ── Draw the wheel at a given angle ─────────────────────────────────────
    const draw = useCallback(
      (angle: number) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const dpr = dprRef.current
        // setTransform resets + applies DPR scale — safe to call every frame
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawWheelFrame(ctx, segments, angle, sizeRef.current)
      },
      [segments],
    )

    // Redraw when segments or size change (e.g. wheel rebuild between spins)
    useEffect(() => {
      draw(angleRef.current)
    }, [draw, size])

    // ── Spin to a pre-determined winner ──────────────────────────────────────
    const spinTo = useCallback(
      (winnerId: string) => {
        if (isSpinning || segments.length === 0) return

        // Find the winner's angular midpoint in unrotated wheel coords
        let cumOffset = 0
        let winnerMidAngle = 0
        let found = false

        for (const seg of segments) {
          if (seg.id === winnerId) {
            winnerMidAngle = cumOffset + seg.arc / 2
            found = true
            break
          }
          cumOffset += seg.arc
        }

        if (!found) return

        // We want: (winnerMidAngle - π/2) + finalAngle ≡ -π/2 (mod 2π)
        // i.e. finalAngle ≡ -(winnerMidAngle) (mod 2π)
        const targetFraction =
          ((-winnerMidAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
        const currentFraction =
          (angleRef.current % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)

        let delta = targetFraction - currentFraction
        // Ensure we always spin forward (at least a tiny bit on the final rotation)
        if (delta <= 0.05) delta += 2 * Math.PI

        const finalAngle = angleRef.current + delta + FULL_ROTATIONS * 2 * Math.PI
        const startAngle = angleRef.current
        const startTime = performance.now()

        setIsSpinning(true)
        setWinner(null)

        if (animRef.current !== null) cancelAnimationFrame(animRef.current)

        function animate(now: number) {
          const elapsed = now - startTime
          const t = Math.min(elapsed / SPIN_DURATION_MS, 1)
          const eased = easeOutQuart(t)
          const currentAngle = startAngle + (finalAngle - startAngle) * eased

          angleRef.current = currentAngle
          draw(currentAngle)

          if (t < 1) {
            animRef.current = requestAnimationFrame(animate)
          } else {
            angleRef.current = finalAngle
            draw(finalAngle)

            const winnerSeg = segments.find(s => s.id === winnerId)!
            setIsSpinning(false)
            setWinner(winnerSeg)

            // Small delay before confetti so the wheel fully settles
            setTimeout(fireConfetti, 150)
            onSpinEnd(winnerId)
          }
        }

        animRef.current = requestAnimationFrame(animate)
      },
      [segments, isSpinning, draw, onSpinEnd],
    )

    useImperativeHandle(ref, () => ({ spin: spinTo }), [spinTo])

    // Cleanup rAF on unmount
    useEffect(() => {
      return () => {
        if (animRef.current !== null) cancelAnimationFrame(animRef.current)
      }
    }, [])

    return (
      <div ref={containerRef} className="flex flex-col items-center gap-4 w-full">
        {/* Canvas */}
        <div className="relative flex items-center justify-center">
          <canvas ref={canvasRef} className="rounded-full" />
        </div>

        {/* Winner reveal */}
        <div className="h-14 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {winner && !isSpinning && (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, y: 16, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="px-7 py-2.5 rounded-xl font-bold text-xl text-white shadow-lg select-none"
                style={{ backgroundColor: winner.color }}
              >
                {winner.name}
              </motion.div>
            )}

            {isSpinning && (
              <motion.p
                key="spinning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-muted-foreground animate-pulse"
              >
                Spinning…
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  },
)
