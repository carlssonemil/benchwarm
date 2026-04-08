declare module 'gifenc' {
  type RGBAData = Uint8Array | Uint8ClampedArray
  type Palette = number[][]

  interface GIFEncoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: {
        palette?: Palette
        delay?: number
        dispose?: number
        repeat?: number
        transparent?: boolean
        transparentIndex?: number
      },
    ): void
    finish(): void
    bytesView(): Uint8Array
  }

  export function GIFEncoder(opts?: { initialCapacity?: number; auto?: boolean }): GIFEncoder
  export function quantize(data: RGBAData, maxColors: number, opts?: object): Palette
  export function applyPalette(data: RGBAData, palette: Palette, format?: string): Uint8Array
}
