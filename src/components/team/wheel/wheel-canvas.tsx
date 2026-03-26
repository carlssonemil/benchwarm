/**
 * Pure canvas drawing utilities for the spinning wheel.
 * No React — just imperative drawing functions consumed by SpinningWheel.
 */

export interface WheelSegment {
  id: string
  name: string
  color: string
  arc: number // radians — proportional to bank_entries / total_entries
}

const FONT_LARGE = 'bold 13px system-ui, -apple-system, sans-serif'
const FONT_SMALL = 'bold 11px system-ui, -apple-system, sans-serif'

/**
 * Draws the full wheel frame at the given rotation angle.
 * Call this inside a requestAnimationFrame loop.
 *
 * @param ctx  - 2D context already scaled for DPR
 * @param segments - segments to render
 * @param angle - clockwise rotation in radians
 * @param size  - CSS pixel size of the square canvas
 */
export function drawWheelFrame(
  ctx: CanvasRenderingContext2D,
  segments: WheelSegment[],
  angle: number,
  size: number,
): void {
  const cx = size / 2
  const cy = size / 2
  const pointerH = 20 // pointer height in px
  const radius = size / 2 - pointerH - 6

  // Reset transform to DPR scale (caller must set this before calling)
  ctx.clearRect(0, 0, size, size)

  if (segments.length === 0) return

  // ── Wheel (rotates) ────────────────────────────────────────────────────────
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)

  let startAngle = -Math.PI / 2 // segments start from 12 o'clock

  for (const seg of segments) {
    const endAngle = startAngle + seg.arc

    // Filled arc
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, radius, startAngle, endAngle)
    ctx.closePath()
    ctx.fillStyle = seg.color
    ctx.fill()

    // White divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Text — only render if segment is wide enough to be readable
    if (seg.arc >= 0.22) {
      const midAngle = startAngle + seg.arc / 2
      const textRadius = radius * 0.62

      ctx.save()
      ctx.rotate(midAngle)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 3
      ctx.font = seg.arc > 0.55 ? FONT_LARGE : FONT_SMALL

      // Constrain text to fit within segment width at that radius
      const maxTextWidth = 2 * textRadius * Math.sin(seg.arc / 2) * 0.8
      ctx.fillText(seg.name, textRadius, 0, maxTextWidth)
      ctx.restore()
    }

    startAngle = endAngle
  }

  // Centre hub
  ctx.beginPath()
  ctx.arc(0, 0, 14, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.restore()

  // ── Outer ring (fixed, decorative) ────────────────────────────────────────
  ctx.save()
  ctx.translate(cx, cy)
  ctx.beginPath()
  ctx.arc(0, 0, radius + 3, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()

  // ── Pointer (fixed — not rotated) ─────────────────────────────────────────
  const pHalfW = 11
  const pTipY = cy - radius + 2  // tip just inside the rim
  const pBaseY = pTipY - pointerH

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx - pHalfW, pBaseY)
  ctx.lineTo(cx + pHalfW, pBaseY)
  ctx.lineTo(cx, pTipY)
  ctx.closePath()
  ctx.fillStyle = '#ef4444' // red pointer
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 4
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}
