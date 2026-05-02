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
  fill = '#faf8f0',
  stroke = '#2c2c2c',
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
      borderRadius: 8,
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
        color: disabled ? '#aaa9a0' : '#2c2c2c',
        boxShadow: disabled ? 'none' : '3px 3px 0 #2c2c2c',
        borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
        ...style,
      }}
      onMouseEnter={e => {
        if (disabled) return
        const el = e.currentTarget
        el.style.transform = 'translate(-1px, -2px) rotate(-0.5deg)'
        el.style.boxShadow = '5px 5px 0 #2c2c2c'
      }}
      onMouseLeave={e => {
        if (disabled) return
        const el = e.currentTarget
        el.style.transform = ''
        el.style.boxShadow = '3px 3px 0 #2c2c2c'
      }}
      onMouseDown={e => {
        if (disabled) return
        const el = e.currentTarget
        el.style.transform = 'translate(1px, 1px)'
        el.style.boxShadow = 'none'
      }}
      onMouseUp={e => {
        if (disabled) return
        const el = e.currentTarget
        el.style.transform = ''
        el.style.boxShadow = '3px 3px 0 #2c2c2c'
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
