// Ambient module declaration for roughjs — ensures TypeScript can resolve
// this package on any platform (macOS/Linux) with moduleResolution: "bundler"
declare module 'roughjs' {
  export interface Options {
    roughness?: number
    bowing?: number
    seed?: number
    stroke?: string
    strokeWidth?: number
    fill?: string
    fillStyle?: 'solid' | 'hachure' | 'cross-hatch' | 'dots' | 'dashed' | 'zigzag' | 'zigzag-line' | 'none'
    fillWeight?: number
    hachureAngle?: number
    hachureGap?: number
    dashOffset?: number
    dashGap?: number
    zigzagOffset?: number
  }

  export interface RoughCanvas {
    rectangle(x: number, y: number, width: number, height: number, options?: Options): void
    circle(x: number, y: number, diameter: number, options?: Options): void
    ellipse(x: number, y: number, width: number, height: number, options?: Options): void
    line(x1: number, y1: number, x2: number, y2: number, options?: Options): void
    linearPath(points: [number, number][], options?: Options): void
    polygon(points: [number, number][], options?: Options): void
    arc(x: number, y: number, width: number, height: number, start: number, stop: number, closed?: boolean, options?: Options): void
    path(d: string, options?: Options): void
  }

  export interface RoughSVG {
    rectangle(x: number, y: number, width: number, height: number, options?: Options): SVGGElement
    circle(x: number, y: number, diameter: number, options?: Options): SVGGElement
    ellipse(x: number, y: number, width: number, height: number, options?: Options): SVGGElement
    line(x1: number, y1: number, x2: number, y2: number, options?: Options): SVGGElement
    linearPath(points: [number, number][], options?: Options): SVGGElement
    polygon(points: [number, number][], options?: Options): SVGGElement
    arc(x: number, y: number, width: number, height: number, start: number, stop: number, closed?: boolean, options?: Options): SVGGElement
    path(d: string, options?: Options): SVGGElement
  }

  const rough: {
    canvas(canvas: HTMLCanvasElement): RoughCanvas
    svg(svg: SVGSVGElement): RoughSVG
  }
  export default rough
}
