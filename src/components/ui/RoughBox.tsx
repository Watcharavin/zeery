import { useEffect, useRef, useState } from 'react'
import rough from 'roughjs'

interface RoughBoxProps {
  children?: React.ReactNode
  fill?: string
  stroke?: string
  strokeWidth?: number
  roughness?: number
  bowing?: number
  style?: React.CSSProperties
  className?: string
  onClick?: () => void
}

/**
 * RoughBox — wraps children in a hand-drawn SVG border.
 * The SVG is absolutely positioned on top; children render in a relative div.
 */
export default function RoughBox({
  children,
  fill = 'transparent',
  stroke = 'var(--border)',
  strokeWidth = 2,
  roughness = 1.2,
  bowing = 1.5,
  style,
  className,
  onClick,
}: RoughBoxProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // Observe size changes
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Draw rough rect whenever size changes
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || size.w === 0 || size.h === 0) return

    // Clear previous drawing
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    const rc = rough.svg(svg)
    const pad = strokeWidth + 1
    const node = rc.rectangle(
      pad,
      pad,
      size.w - pad * 2,
      size.h - pad * 2,
      {
        fill,
        fillStyle: fill !== 'transparent' ? 'solid' : 'none',
        stroke,
        strokeWidth,
        roughness,
        bowing,
      },
    )
    svg.appendChild(node)
  }, [size, fill, stroke, strokeWidth, roughness, bowing])

  return (
    <div
      ref={wrapRef}
      className={className}
      onClick={onClick}
      style={{ position: 'relative', ...style }}
    >
      {/* Rough SVG border layer */}
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      />
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  )
}
