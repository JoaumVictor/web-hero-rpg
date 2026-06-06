const cache = new Map<string, HTMLImageElement>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  if (cache.has(src)) return Promise.resolve(cache.get(src)!)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { cache.set(src, img); resolve(img) }
    img.onerror = () => reject(new Error(`Failed to load: ${src}`))
    img.src = src
  })
}

export function loadFrames(paths: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(paths.map(loadImage))
}

// Resolves null on 404 — used for auto-detecting frame count
function loadImageOptional(src: string): Promise<HTMLImageElement | null> {
  if (cache.has(src)) return Promise.resolve(cache.get(src)!)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => { cache.set(src, img); resolve(img) }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// Probes frame-1, frame-2 ... until a 404 — stops at first missing file
export async function probeFrames(basePath: string, max = 12): Promise<HTMLImageElement[]> {
  const frames: HTMLImageElement[] = []
  for (let i = 1; i <= max; i++) {
    const img = await loadImageOptional(`${basePath}-${i}.png`)
    if (!img) break
    frames.push(img)
  }
  return frames
}
