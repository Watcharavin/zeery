import { useEffect, useRef, useState } from 'react'
import rough from 'roughjs'

interface RoughButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  fill?: string
  stroke?: string
  style?: React.CSSProperties
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

/**
 * RoughButton — a hand-drawn button with irregular border-radius and hard shadow.
 * Uses roughjs to draw the border as SVG over the button element.
 */
export default function RoughButton({
  children,
  onClick,
  disabled = false,
  fill = '#faf9f6',
  stroke = '#c8c0b4',
  style,
  className,
  type = 'button',
}: RoughButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = btnRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || size.w === 0 || size.h === 0) return

    while (svg.firstChild) svg.removeChild(svg.firstChild)

    const rc = rough.svg(svg)
    const pad = 2
    const node = rc.rectangle(pad, pad, size.w - pad * 2, size.h - pad * 2, {
      fill: disabled ? '#e0ddd5' : fill,
      fillStyle: 'solid',
      stroke: disabled ? '#aaa9a0' : stroke,
      strokeWidth: 2,
      roughness: 1.5,
      bowing: 2,
    })
    svg.appendChild(node)
  }, [size, fill, stroke, disabled])

  return (
    <button
      ref={btnRef}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        position: 'relative',
        background: 'transparent',
        border: 'none',
        padding: '10px 20px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'Kalam', 'Itim', cursive",
        fontSize: '0.95rem',
        fontWeight: 700,
        color: disabled ? '#aaa9a0' : 'var(--text)',
        boxShadow: disabled ? 'none' : 'var(--shadow-sm)',
        borderRadius: '10px',
        transition: 'box-shadow 0.15s ease, opacity 0.15s ease',
        ...style,
      }}
      onMouseEnter={e => {
        if (disabled) return
        e.currentTarget.style.boxShadow = 'var(--shadow)'
      }}
      onMouseLeave={e => {
        if (disabled) return
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
      }}
      onMouseDown={e => {
        if (disabled) return
        e.currentTarget.style.opacity = '0.75'
        e.currentTarget.style.boxShadow = 'none'
      }}
      onMouseUp={e => {
        if (disabled) return
        e.currentTarget.style.opacity = ''
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
      }}
    >
      {/* Rough SVG border */}
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
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </button>
  )
}
