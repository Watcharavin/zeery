import { useRef, useEffect, useCallback } from 'react'
import { drawDotChart, type DotChartOpts } from '../../lib/dotchart'

type Props = Omit<DotChartOpts, 'canvas'> & { height?: number }

export default function DotChart({ height = 56, ...opts }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawDotChart({ canvas, ...opts })
  }, [opts]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    draw()
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: `${height}px` }}
    />
  )
}
