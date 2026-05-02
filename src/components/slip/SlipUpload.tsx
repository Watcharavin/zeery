import { useRef, useState, useCallback } from 'react'

interface Props {
  onImage: (base64: string, mimeType: string) => void
}

export default function SlipUpload({ onImage }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => {
      const result = e.target?.result as string
      const base64 = result.split(',')[1]
      onImage(base64, file.type)
    }
    reader.readAsDataURL(file)
  }, [onImage])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (item) processFile(item.getAsFile()!)
  }, [processFile])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onPaste={handlePaste}
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '40px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        background: dragOver ? 'rgba(232,93,36,0.04)' : 'var(--bg3)',
        transition: 'all 0.2s',
        outline: 'none',
      }}
    >
      <span style={{ fontSize: '2.5rem' }}>📷</span>
      <p style={{ color: 'var(--text)', fontWeight: 500, fontSize: '0.95rem', textAlign: 'center' }}>
        วาง slip หรือคลิกเลือกรูป
      </p>
      <p style={{ color: 'var(--text2)', fontSize: '0.78rem', textAlign: 'center' }}>
        รองรับ JPG, PNG · วาง Ctrl+V / ⌘V ได้เลย
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
      />
    </div>
  )
}
