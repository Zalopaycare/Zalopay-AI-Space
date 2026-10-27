// Use case covers are always 1920×1080 (16:9): the largest 16:9 area in the middle of the picture,
// scaled to that size and saved as JPEG. Used by the share form and by admins adding a missing cover.
// Resolves { data: "data:image/jpeg;base64,…", note } (note = what happened to the picture, or '').
export function cropCover(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('')); return }
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { reject(new Error('Chỉ nhận ảnh PNG, JPG, WEBP hoặc GIF.')); return }
    const img = new Image()
    const src = URL.createObjectURL(file)
    img.onload = () => {
      const W = 1920, H = 1080
      const sw = Math.min(img.width, img.height * W / H), sh = sw * H / W
      const cv = document.createElement('canvas')
      cv.width = W; cv.height = H
      const g = cv.getContext('2d')
      g.imageSmoothingQuality = 'high'
      g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H)
      URL.revokeObjectURL(src)
      // the server takes up to 2 MB: step the quality down for busy pictures
      let data = ''
      for (const q of [0.85, 0.75, 0.65, 0.55]) { data = cv.toDataURL('image/jpeg', q); if (data.length <= 2.6 * 1024 * 1024) break }
      if (data.length > 2.6 * 1024 * 1024) { reject(new Error('Ảnh quá lớn, chọn ảnh khác nhỏ hơn.')); return }
      const notes = []
      if (Math.abs(img.width / img.height - W / H) > 0.01) notes.push('Ảnh không đúng tỉ lệ 16:9 nên đã được cắt phần giữa.')
      if (img.width < W || img.height < H) notes.push(`Ảnh gốc ${img.width}×${img.height} nhỏ hơn 1920×1080 nên có thể hơi mờ.`)
      resolve({ data, note: notes.join(' ') })
    }
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('Không đọc được ảnh này.')) }
    img.src = src
  })
}
