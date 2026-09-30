import type { Background } from "@/lib/remover-types"

const cutoutCache = new WeakMap<ImageData, HTMLCanvasElement>()

function cutoutCanvas(data: ImageData) {
  let c = cutoutCache.get(data)
  if (!c) {
    c = document.createElement("canvas")
    c.width = data.width
    c.height = data.height
    c.getContext("2d")!.putImageData(data, 0, 0)
    cutoutCache.set(data, c)
  }
  return c
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(url: string) {
  let p = imageCache.get(url)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
    imageCache.set(url, p)
  }
  return p
}

/** Draws the cutout over the chosen background, at full resolution, into `canvas`. */
export async function compose(canvas: HTMLCanvasElement, cutout: ImageData, originalUrl: string, bg: Background) {
  const { width, height } = cutout
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, width, height)

  if (bg.kind === "color") {
    ctx.fillStyle = bg.color
    ctx.fillRect(0, 0, width, height)
  } else if (bg.kind === "blur") {
    const img = await loadImage(originalUrl)
    const radius = Math.round((Math.max(width, height) / 1000) * bg.amount)
    ctx.save()
    ctx.filter = `blur(${radius}px)`
    // Draw slightly oversized so the blur doesn't fade to transparent at the edges.
    const pad = radius * 2
    ctx.drawImage(img, -pad, -pad, width + pad * 2, height + pad * 2)
    ctx.restore()
  }

  ctx.drawImage(cutoutCanvas(cutout), 0, 0)
}

export async function composeBlob(cutout: ImageData, originalUrl: string, bg: Background) {
  const canvas = document.createElement("canvas")
  await compose(canvas, cutout, originalUrl, bg)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/png")
  )
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function outputName(name: string) {
  return `${name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-") || "image"}-clearcut.png`
}
