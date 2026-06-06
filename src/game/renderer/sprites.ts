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
