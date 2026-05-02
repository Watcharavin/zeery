import rough from 'roughjs'

export type DotChartOpts = {
  canvas: HTMLCanvasElement
  type: 'bar' | 'fill' | 'ring'
  data?: number[]     // bar: array 0–1 per column
  pct?: number        // fill/ring: 0–1
  cols?: number       // default 28
  rows?: number       // default 7
  dotRadius?: number  // unused, kept for compat
  gap?: number        // reserved
  accentFn?: (alpha: number) => string
  accent?: string
  dimColor?: string
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function drawDotChart(opts: DotChartOpts): void {
  const {
    canvas,
    type,
    data,
    pct = 0,
    cols = 28,
    rows = 7,
    accent = '#3d9b8a',
    dimColor,
  } = opts

  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth || canvas.width
  const h = canvas.clientHeight || canvas.height

  canvas.width = w * dpr
  canvas.height = h * dpr

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  // Parse accent color — support CSS variables by falling back to teal
  let accentHex = accent
  if (accent.startsWith('var(')) {
    accentHex = '#3d9b8a'
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(
        accent.replace('var(', '').replace(')', '').trim()
      ).trim()
      if (v) accentHex = v
    } catch { /* ignore */ }
  }

  const [ar, ag, ab] = hexToRgb(accentHex)
  const accentFn = opts.accentFn ?? ((alpha: number) => `rgba(${ar},${ag},${ab},${alpha})`)

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches ||
    document.documentElement.dataset.theme === 'dark'
  const dim = dimColor ?? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.055)')
  const borderDim = isDark ? 'rgba(255,255,255,0.12)' : '#c8c0b4'

  // roughjs canvas — inherits the ctx.scale(dpr,dpr) transform already applied
  const rc = rough.canvas(canvas)

  // ── BAR CHART ──────────────────────────────────────────────────────────────
  if (type === 'bar') {
    const colData = data ?? Array(cols).fill(0)
    const cellW = w / cols
    const barW = Math.max(2.5, cellW * 0.48)
    const maxBarH = h - 2
    const baseY = h

    // 1. Draw all background bars (rough rectangles)
    for (let col = 0; col < cols; col++) {
      const x = col * cellW + (cellW - barW) / 2
      rc.rectangle(x, baseY - maxBarH, barW, maxBarH, {
        fill: dim,
        fillStyle: 'solid',
        stroke: borderDim,
        strokeWidth: 1,
        roughness: 1.3,
        bowing: 1.2,
      })
    }

    // 2. Draw filled bars (rough rectangles, no gradient — solid accent)
    for (let col = 0; col < cols; col++) {
      const intensity = Math.min(1, Math.max(0, colData[col] ?? 0))
      if (intensity < 0.02) continue

      const barH = Math.max(barW, intensity * maxBarH)
      const x = col * cellW + (cellW - barW) / 2
      const y = baseY - barH

      rc.rectangle(x, y, barW, barH, {
        fill: accentFn(0.75),
        fillStyle: 'solid',
        stroke: accentHex,
        strokeWidth: 1.2,
        roughness: 0.9,
        bowing: 1,
      })

      // Hand-drawn glow cap dot at the top
      if (intensity > 0.08) {
        const capR = Math.min(barW * 0.72, 5)
        const capX = x + barW / 2
        const capY = y + capR

        rc.circle(capX, capY, capR * 2, {
          fill: accentFn(1.0),
          fillStyle: 'solid',
          stroke: accentFn(0.5),
          strokeWidth: 1,
          roughness: 0.6,
          bowing: 0,
        })
      }
    }
    return
  }

  // ── FILL (dot grid) ────────────────────────────────────────────────────────
  if (type === 'fill') {
    const total = cols * rows
    const filled = Math.round(pct * total)
    const cellW = w / cols
    const cellH = h / rows
    const dr = Math.min(cellW, cellH) * 0.32

    let idx = 0
    for (let row = rows - 1; row >= 0; row--) {
      for (let col = 0; col < cols; col++) {
        const x = col * cellW + cellW / 2
        const y = row * cellH + cellH / 2
        const isFilled = idx < filled
        const progress = isFilled ? idx / Math.max(filled - 1, 1) : 0
        const dotD = (isFilled ? dr : dr * 0.8) * 2

        rc.circle(x, y, dotD, {
          fill: isFilled ? accentFn(0.45 + 0.55 * progress) : dim,
          fillStyle: 'solid',
          stroke: isFilled ? accentFn(0.35) : borderDim,
          strokeWidth: 0.8,
          roughness: 0.75,
          bowing: 0.5,
        })
        idx++
      }
    }
    return
  }

  // ── RING ───────────────────────────────────────────────────────────────────
  if (type === 'ring') {
    const cx = w / 2
    const cy = h / 2
    const outerR = Math.min(w, h) / 2 - 5
    const trackR = outerR * 0.52
    const dotCount = 56
    const filledCount = Math.round(pct * dotCount)
    const dotR = Math.max(2, outerR * 0.085)

    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2 - Math.PI / 2
      const x = cx + trackR * Math.cos(angle)
      const y = cy + trackR * Math.sin(angle)
      const isFilled = i < filledCount
      const progress = isFilled ? i / Math.max(filledCount - 1, 1) : 0
      const isLastFew = isFilled && i >= filledCount - 2 && filledCount > 2
      const dotD = (isFilled ? dotR : dotR * 0.7) * 2

      rc.circle(x, y, dotD, {
        fill: isLastFew ? accentFn(1.0) : (isFilled ? accentFn(0.35 + 0.65 * progress) : dim),
        fillStyle: 'solid',
        stroke: isLastFew ? accentFn(0.8) : (isFilled ? accentFn(0.3) : borderDim),
        strokeWidth: isLastFew ? 1.2 : 0.8,
        roughness: isLastFew ? 0.9 : 0.75,
        bowing: 0.5,
      })
    }
  }
}
