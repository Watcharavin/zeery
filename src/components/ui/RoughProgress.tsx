import { useEffect, useRef } from 'react'
import rough from 'roughjs'

interface RoughProgressProps {
  value: number   // 0–1
  color?: string
  height?: number
  width?: number | string
}

/**
 * RoughProgress — a hand-drawn progress bar using roughjs canvas.
 */
export default function RoughProgress({
  value,
  color = '#3d9b8a',
  height = 14,
  width = '100%',
}: RoughProgressProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const w = container.clientWidth
    const h = height
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)

    const rc = rough.canvas(canvas)
    const pad = 2

    // Track (background)
    rc.rectangle(pad, pad, w - pad * 2, h - pad * 2, {
      fill: '#ede9e3',
      fillStyle: 'solid',
      stroke: '#c8c0b4',
      strokeWidth: 1.5,
      roughness: 1.2,
      bowing: 1,
    })

    // Fill
    const fillW = Math.max(0, (w - pad * 2) * Math.min(1, value))
    if (fillW > 4) {
      rc.rectangle(pad, pad, fillW, h - pad * 2, {
        fill: color,
        fillStyle: 'solid',
        stroke: color,
        strokeWidth: 1,
        roughness: 0.8,
        bowing: 1,
      })
    }
  }, [value, color, height])

  return (
    <div ref={containerRef} style={{ width, lineHeight: 0 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height }} />
    </div>
  )
}
