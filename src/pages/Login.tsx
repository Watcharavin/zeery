import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch {
      setError('เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-lg)',
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: '360px',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '0.25rem' }}>
          <span style={{
            fontFamily: "'Caveat', cursive",
            fontWeight: 700,
            fontSize: '3rem',
            color: 'var(--accent)',
            lineHeight: 1,
          }}>
            Zeery ✏️
          </span>
        </div>
        <p style={{
          fontFamily: "'Kalam', 'Itim', cursive",
          color: 'var(--text2)',
          fontSize: '0.9rem',
          marginBottom: '2rem',
        }}>
          แอปติดตามการเงินส่วนตัว
        </p>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '12px 20px',
            background: loading ? 'var(--bg3)' : 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Kalam', 'Itim', cursive",
            fontSize: '1rem',
            fontWeight: 700,
            color: loading ? 'var(--text2)' : 'var(--text)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = 'var(--shadow)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
        >
          {/* Google icon */}
          {!loading && (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
        </button>

        {error && (
          <p style={{
            marginTop: '1rem',
            color: 'var(--red)',
            fontFamily: "'Kalam', 'Itim', cursive",
            fontSize: '0.85rem',
          }}>
            {error}
          </p>
        )}

        <p style={{
          marginTop: '1.5rem',
          color: 'var(--text2)',
          fontFamily: "'Kalam', 'Itim', cursive",
          fontSize: '0.78rem',
          lineHeight: 1.6,
        }}>
          ข้อมูลของคุณเก็บแยกกันตาม Google account<br/>ไม่มีการแชร์ข้อมูลระหว่างผู้ใช้
        </p>
      </div>
    </div>
  )
}
