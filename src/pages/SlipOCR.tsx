import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { readSlip } from '../lib/claude'
import { addTransaction } from '../lib/firestore'
import { useCategories } from '../contexts/CategoriesContext'
import SlipUpload from '../components/slip/SlipUpload'
import SlipConfirm from '../components/slip/SlipConfirm'
import type { SlipData } from '../lib/claude'

type Stage = 'upload' | 'loading' | 'confirm' | 'error'

export default function SlipOCR() {
  const navigate = useNavigate()
  const { uid } = useAuth()
  const { getCat } = useCategories()

  const [stage, setStage] = useState<Stage>('upload')
  const [imgSrc, setImgSrc] = useState('')
  const [slipData, setSlipData] = useState<SlipData | null>(null)
  const [errMsg, setErrMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const handleImage = async (base64: string, mimeType: string) => {
    setImgSrc(`data:${mimeType};base64,${base64}`)
    setStage('loading')
    try {
      const data = await readSlip(base64, mimeType)
      setSlipData(data)
      setStage('confirm')
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : String(e))
      setStage('error')
    }
  }

  const handleConfirm = async (data: { amount: number; catId: string; date: string; note: string }) => {
    if (!uid || saving) return
    setSaving(true)
    try {
      const cat = getCat(data.catId)
      await addTransaction(uid, {
        name: data.note || cat.label,
        catId: data.catId,
        amount: -data.amount, // slip = expense
        date: data.date,
        source: 'ocr',
        ...(data.note ? { note: data.note } : {}),
      })
      navigate('/')
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : String(e))
      setStage('error')
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '420px', margin: '0 auto', padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: '1.2rem', padding: '4px' }}
        >
          ←
        </button>
        <h1 style={{
          fontFamily: "'Caveat', cursive",
          fontSize: '1.8rem',
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 0,
        }}>
          สแกน E-Slip 📸
        </h1>
      </div>

      {/* Upload stage */}
      {stage === 'upload' && <SlipUpload onImage={handleImage} />}

      {/* Loading stage */}
      {stage === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 0' }}>
          <img src={imgSrc} alt="slip" style={{
            width: '100%', maxHeight: '200px', objectFit: 'contain',
            borderRadius: '14px', border: '1px solid var(--border)', opacity: 0.6,
          }} />
          <div style={{
            width: '36px', height: '36px', border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: 'var(--text2)', fontSize: '0.88rem', fontFamily: "'Kalam', 'Itim', cursive" }}>กำลังอ่าน slip...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Confirm stage */}
      {stage === 'confirm' && slipData && (
        <SlipConfirm
          slip={slipData}
          imgSrc={imgSrc}
          onConfirm={handleConfirm}
          onCancel={() => setStage('upload')}
        />
      )}

      {/* Error stage */}
      {stage === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0' }}>
          {imgSrc && (
            <img src={imgSrc} alt="slip" style={{
              width: '100%', maxHeight: '180px', objectFit: 'contain',
              borderRadius: '14px', border: '1px solid var(--border)', opacity: 0.5,
            }} />
          )}
          <div style={{
            width: '100%', padding: '16px', borderRadius: '14px',
            background: 'var(--red-fill)', border: '2px solid var(--red)',
          }}>
            <p style={{ color: 'var(--red)', fontWeight: 700, marginBottom: '6px', fontFamily: "'Kalam', 'Itim', cursive" }}>อ่าน slip ไม่ได้</p>
            <p style={{ color: 'var(--text2)', fontSize: '0.82rem', wordBreak: 'break-all', fontFamily: "'Kalam', 'Itim', cursive" }}>{errMsg}</p>
          </div>
          <button
            onClick={() => { setStage('upload'); setErrMsg('') }}
            style={{
              padding: '12px 28px',
              borderRadius: '10px',
              border: '2px solid var(--accent)',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer',
              fontFamily: "'Kalam', 'Itim', cursive", fontSize: '0.95rem', fontWeight: 700,
              boxShadow: 'var(--shadow)',
            }}
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}
    </div>
  )
}
