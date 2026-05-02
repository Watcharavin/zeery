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

// Polyfill for roundRect (Safari < 15.4)
function pillRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, bw: number, bh: number,
  r: number,
) {
  r = Math.min(r, bw / 2, bh / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + bw - r, y)
  ctx.arcTo(x + bw, y, x + bw, y + r, r)
  ctx.lineTo(x + bw, y + bh - r)
  ctx.arcTo(x + bw, y + bh, x + bw - r, y + bh, r)
  ctx.lineTo(x + r, y + bh)
  ctx.arcTo(x, y + bh, x, y + bh - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

export function drawDotChart(opts: DotChartOpts): void {
  const {
    canvas,
    type,
    data,
    pct = 0,
    cols = 28,
    rows = 7,
    accent = '#e85d24',
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

  // Parse accent color — support CSS variables by falling back to orange
  let accentHex = accent
  if (accent.startsWith('var(')) {
    accentHex = '#e85d24'
    // Try to read from computed style if possible
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

  // ── BAR CHART ──────────────────────────────────────────────────────────────
  if (type === 'bar') {
    const colData = data ?? Array(cols).fill(0)
    const cellW = w / cols
    const barW = Math.max(2.5, cellW * 0.48)
    const maxBarH = h - 2
    const baseY = h
    const cornerR = barW / 2

    // 1. Draw all background pill bars
    for (let col = 0; col < cols; col++) {
      const x = col * cellW + (cellW - barW) / 2
      pillRect(ctx, x, baseY - maxBarH, barW, maxBarH, cornerR)
      ctx.fillStyle = dim
      ctx.fill()
    }

    // 2. Draw filled bars with gradient + glow cap
    for (let col = 0; col < cols; col++) {
      const intensity = Math.min(1, Math.max(0, colData[col] ?? 0))
      if (intensity < 0.02) continue

      const barH = Math.max(barW, intensity * maxBarH)
      const x = col * cellW + (cellW - barW) / 2
      const y = baseY - barH

      // Gradient: dim at base, full color at top
      const grad = ctx.createLinearGradient(0, baseY, 0, y)
      grad.addColorStop(0, accentFn(0.15))
      grad.addColorStop(0.45, accentFn(0.55))
      grad.addColorStop(1, accentFn(1.0))

      pillRect(ctx, x, y, barW, barH, cornerR)
      ctx.fillStyle = grad
      ctx.fill()

      // Glowing cap dot at the top of each bar
      if (intensity > 0.08) {
        const capR = Math.min(barW * 0.72, 5)
        const capX = x + barW / 2
        const capY = y + capR

        ctx.save()
        ctx.shadowBlur = 10
        ctx.shadowColor = accentFn(0.75)
        ctx.beginPath()
        ctx.arc(capX, capY, capR, 0, Math.PI * 2)
        ctx.fillStyle = accentFn(1.0)
        ctx.fill()
        ctx.restore()
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

        ctx.beginPath()
        ctx.arc(x, y, isFilled ? dr : dr * 0.8, 0, Math.PI * 2)
        ctx.fillStyle = isFilled ? accentFn(0.45 + 0.55 * progress) : dim
        ctx.fill()
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

      ctx.beginPath()
      ctx.arc(x, y, isFilled ? dotR : dotR * 0.7, 0, Math.PI * 2)

      if (isLastFew) {
        ctx.save()
        ctx.shadowBlur = 8
        ctx.shadowColor = accentFn(0.9)
        ctx.fillStyle = accentFn(1.0)
        ctx.fill()
        ctx.restore()
      } else {
        ctx.fillStyle = isFilled ? accentFn(0.35 + 0.65 * progress) : dim
        ctx.fill()
      }
    }
  }
}
