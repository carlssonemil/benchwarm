'use client'

import { useCallback, useState } from 'react'
import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { drawWheelFrame, type WheelSegment } from './wheel-canvas'

// ── Replay settings ─────────────────────────────────────────────────────────
const REPLAY_SPIN_MS = 1800    // each replayed spin lasts 1.8s (vs 5.2s live)
const REPLAY_HOLD_MS = 600     // hold on the winner frame before next spin
const REPLAY_ROTATIONS = 4     // fewer rotations than live (7) since it's compressed
const FPS = 15
const FRAME_MS = 1000 / FPS    // ~67ms per frame

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface SpinRecord {
  segments: WheelSegment[]
  winnerId: string
  winnerName: string
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useGifRecorder() {
  const [gifBlob, setGifBlob] = useState<Blob | null>(null)
  const [isEncoding, setIsEncoding] = useState(false)

  const generateGif = useCallback((spins: SpinRecord[], size: number) => {
    if (spins.length === 0) return

    setIsEncoding(true)
    setGifBlob(null)

    // Defer so UI transitions aren't blocked
    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        const gif = GIFEncoder()
        const spinFrameCount = Math.ceil(REPLAY_SPIN_MS / FRAME_MS)

        let currentAngle = 0

        for (const spin of spins) {
          // ── Calculate target angle (same math as spinning-wheel.tsx) ───────
          let cumOffset = 0
          let winnerMidAngle = 0
          for (const seg of spin.segments) {
            if (seg.id === spin.winnerId) {
              winnerMidAngle = cumOffset + seg.arc / 2
              break
            }
            cumOffset += seg.arc
          }

          const targetFraction =
            ((-winnerMidAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
          const currentFraction =
            (currentAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)

          let delta = targetFraction - currentFraction
          if (delta <= 0.05) delta += 2 * Math.PI

          const finalAngle = currentAngle + delta + REPLAY_ROTATIONS * 2 * Math.PI
          const startAngle = currentAngle

          // ── Render spin frames ────────────────────────────────────────────
          for (let i = 0; i <= spinFrameCount; i++) {
            const t = Math.min(i / spinFrameCount, 1)
            const angle = startAngle + (finalAngle - startAngle) * easeOutQuart(t)

            ctx.clearRect(0, 0, size, size)
            drawWheelFrame(ctx, spin.segments, angle, size)

            writeFrame(gif, ctx, size)
          }

          currentAngle = finalAngle

          // ── Hold the final frame with an extended delay ────────────────────
          // Instead of duplicating frames, just use a longer delay on the last one
          ctx.clearRect(0, 0, size, size)
          drawWheelFrame(ctx, spin.segments, finalAngle, size)
          writeFrame(gif, ctx, size, REPLAY_HOLD_MS)
        }

        gif.finish()
        setGifBlob(new Blob([gif.bytesView() as unknown as BlobPart], { type: 'image/gif' }))
      } finally {
        setIsEncoding(false)
      }
    }, 0)
  }, [])

  return { generateGif, gifBlob, isEncoding }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function writeFrame(
  gif: ReturnType<typeof GIFEncoder>,
  ctx: CanvasRenderingContext2D,
  size: number,
  delayMs: number = FRAME_MS,
) {
  const { data } = ctx.getImageData(0, 0, size, size)
  const rgba = new Uint8Array(data.buffer)
  const palette = quantize(rgba, 256)
  const index = applyPalette(rgba, palette)
  gif.writeFrame(index, size, size, { palette, delay: delayMs, dispose: 2 })
}
