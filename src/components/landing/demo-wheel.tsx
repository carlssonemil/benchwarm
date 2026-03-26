'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { drawWheelFrame, type WheelSegment } from '@/components/team/wheel/wheel-canvas'

// ── Constants ────────────────────────────────────────────────────────────────

const SPIN_DURATION_MS = 4800
const FULL_ROTATIONS = 6

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

// Fake demo players with weighted bank entries
const TOTAL_ENTRIES = 14
const DEMO_SEGMENTS: WheelSegment[] = [
  { id: '1', name: 'Alex',   color: '#6366f1', arc: (3 / TOTAL_ENTRIES) * 2 * Math.PI },
  { id: '2', name: 'Jordan', color: '#f59e0b', arc: (2 / TOTAL_ENTRIES) * 2 * Math.PI },
  { id: '3', name: 'Sam',    color: '#10b981', arc: (3 / TOTAL_ENTRIES) * 2 * Math.PI },
  { id: '4', name: 'Max',    color: '#ef4444', arc: (2 / TOTAL_ENTRIES) * 2 * Math.PI },
  { id: '5', name: 'Riley',  color: '#3b82f6', arc: (2 / TOTAL_ENTRIES) * 2 * Math.PI },
  { id: '6', name: 'Casey',  color: '#8b5cf6', arc: (2 / TOTAL_ENTRIES) * 2 * Math.PI },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface DemoWheelProps {
  size?: number
}

export function DemoWheel({ size = 280 }: DemoWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const angleRef = useRef(0)
  const animRef = useRef<number | null>(null)
  const isSpinningRef = useRef(false)
  const [winner, setWinner] = useState<WheelSegment | null>(null)

  const draw = useCallback(
    (angle: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawWheelFrame(ctx, DEMO_SEGMENTS, angle, size)
    },
    [size],
  )

  const spinTo = useCallback(
    (winnerId: string) => {
      if (isSpinningRef.current) return

      let cumOffset = 0
      let winnerMidAngle = 0

      for (const seg of DEMO_SEGMENTS) {
        if (seg.id === winnerId) {
          winnerMidAngle = cumOffset + seg.arc / 2
          break
        }
        cumOffset += seg.arc
      }

      const targetFraction =
        ((-winnerMidAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
      const currentFraction =
        (angleRef.current % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)

      let delta = targetFraction - currentFraction
      if (delta <= 0.05) delta += 2 * Math.PI

      const finalAngle = angleRef.current + delta + FULL_ROTATIONS * 2 * Math.PI
      const startAngle = angleRef.current
      const startTime = performance.now()

      isSpinningRef.current = true
      setWinner(null)

      if (animRef.current !== null) cancelAnimationFrame(animRef.current)

      function animate(now: number) {
        const elapsed = now - startTime
        const t = Math.min(elapsed / SPIN_DURATION_MS, 1)
        const eased = easeOutQuart(t)
        const current = startAngle + (finalAngle - startAngle) * eased

        angleRef.current = current
        draw(current)

        if (t < 1) {
          animRef.current = requestAnimationFrame(animate)
        } else {
          angleRef.current = finalAngle
          draw(finalAngle)
          isSpinningRef.current = false

          const winnerSeg = DEMO_SEGMENTS.find(s => s.id === winnerId)!
          setWinner(winnerSeg)

          // Schedule next spin after a pause
          setTimeout(() => {
            const next = DEMO_SEGMENTS[Math.floor(Math.random() * DEMO_SEGMENTS.length)]
            spinTo(next.id)
          }, 2800)
        }
      }

      animRef.current = requestAnimationFrame(animate)
    },
    [draw],
  )

  // Setup canvas and kick off the first spin
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    draw(0)

    const timeout = setTimeout(() => {
      const first = DEMO_SEGMENTS[Math.floor(Math.random() * DEMO_SEGMENTS.length)]
      spinTo(first.id)
    }, 600)

    return () => {
      clearTimeout(timeout)
      if (animRef.current !== null) cancelAnimationFrame(animRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} className="rounded-full drop-shadow-lg" />
      
      <div className="h-9 flex items-center justify-center">
        {winner && (
          <span
            className="px-5 py-1.5 rounded-full font-bold text-white text-sm shadow-md"
            style={{ backgroundColor: winner.color }}
          >
            {winner.name} picked!
          </span>
        )}
      </div>
    </div>
  )
}
