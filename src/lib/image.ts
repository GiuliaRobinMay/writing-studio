// Read an image file, downscale it to a sane size, and return a data URL —
// so book covers stay small enough to live comfortably in IndexedDB.

export function resizeImageFile(file: File, maxDim = 700): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not load image'))
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('No canvas context'))
        ctx.drawImage(img, 0, 0, w, h)
        // JPEG keeps cover photos light; quality 0.82 is plenty for a thumbnail.
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
