import { useCallback, useEffect, useRef, useState } from 'react'

const STORE_KEY = 'zp-image-slots-v1'

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    /* storage full or unavailable — the image just won't persist across reloads */
  }
}

/** Programmatically set a slot's image (e.g. from a composer that reads a File before an id exists). */
export function writeImageSlot(id, dataUrl) {
  const store = readStore()
  store[id] = dataUrl
  writeStore(store)
}

/** Whether a slot has a stored image, without subscribing/rendering anything. */
export function hasImageSlot(id) {
  return !!readStore()[id]
}

const shapeRadius = { rect: 0, rounded: 12, circle: '50%', pill: 999 }

/**
 * A user-fillable image placeholder — click or drag a picture onto it. Mirrors the
 * design prototype's <image-slot> visually (rounded placeholder + caption), but
 * persists the drop to localStorage instead of the design tool's authoring sidecar.
 */
export default function ImageSlot({ id, shape = 'rounded', radius, placeholder = 'Kéo ảnh vào đây', className, style }) {
  const [src, setSrc] = useState(() => readStore()[id] || null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setSrc(readStore()[id] || null)
  }, [id])

  const applyFile = useCallback(
    (file) => {
      if (!file || !file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result
        setSrc(dataUrl)
        const store = readStore()
        store[id] = dataUrl
        writeStore(store)
      }
      reader.readAsDataURL(file)
    },
    [id],
  )

  const borderRadius = radius != null ? radius : shapeRadius[shape] ?? 12

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius,
        overflow: 'hidden',
        cursor: 'pointer',
        background: src ? 'transparent' : 'rgba(120,140,180,.14)',
        outline: dragOver ? '2px dashed #2c5fff' : 'none',
        outlineOffset: -2,
        ...style,
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        applyFile(e.dataTransfer.files?.[0])
      }}
      title={placeholder}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => applyFile(e.target.files?.[0])}
      />
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 8,
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1.4,
            color: 'rgba(120,140,180,.85)',
          }}
        >
          {placeholder}
        </div>
      )}
    </div>
  )
}
