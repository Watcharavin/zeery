import { useState, useRef, useEffect, useMemo } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useBudget } from '../hooks/useBudget'
import { useGoals } from '../hooks/useGoals'
import { useNetWorth } from '../hooks/useNetWorth'
import { useCategories } from '../contexts/CategoriesContext'
import { useRecurring } from '../hooks/useRecurring'
import { Send, Sparkles, RotateCcw } from 'lucide-react'

// ── types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function uid() {
  return Math.random().toString(36).slice(2)
}

// ── suggestions ───────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'สรุปรายจ่ายเดือนนี้ให้หน่อย',
  'หมวดไหนใช้เงินเยอะที่สุด?',
  'ฉันควรลดรายจ่ายหมวดไหนบ้าง?',
  'เป้าหมายออมเงินไปถึงไหนแล้ว?',
  'วางแผนออมเงิน 3 เดือนข้างหน้าให้หน่อย',
  'เปรียบเทียบรายรับกับรายจ่ายเดือนนี้',
]

// ── streaming parser ──────────────────────────────────────────────────────────

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string

async function streamChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  context: string,
  onChunk: (text: string) => void,
  signal: AbortSignal,
) {
  if (!OPENROUTER_KEY) throw new Error('VITE_OPENROUTER_API_KEY ยังไม่ได้ตั้งค่า')

  // Prepend system context as first user turn (OpenRouter system role)
  const withSystem = [
    {
      role: 'system' as const,
      content: `You are Zeery AI — a smart, friendly personal finance assistant.\nAlways reply in the same language the user writes in. If they write Thai, reply in Thai.\nBe concise, warm, and specific. Use the user's actual numbers. Never invent data.\n\n${context}`,
    },
    ...messages,
  ]

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-5',
      stream: true,
      messages: withSystem,
    }),
    signal,
  })

  if (!res.ok || !res.body) {
    const err = await res.text()
    throw new Error(err || 'Chat API error')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (!json || json === '[DONE]') continue
      try {
        const evt = JSON.parse(json)
        const chunk = evt.choices?.[0]?.delta?.content
        if (chunk) onChunk(chunk)
      } catch { /* ignore */ }
    }
  }
}

// ── component ─────────────────────────────────────────────────────────────────

export default function AIChat() {
  const { transactions } = useTransactions()
  const { budgets } = useBudget()
  const { goals } = useGoals()
  const { totalAssets, totalLiabilities, netWorth } = useNetWorth()
  const { getCat } = useCategories()
  const { recurring } = useRecurring()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── build financial context ────────────────────────────────────────────────

  const context = useMemo(() => {
    const now = new Date()
    const monthPrefix = now.toISOString().slice(0, 7)
    const thisMonth = transactions.filter(tx => tx.date.startsWith(monthPrefix))

    const income = thisMonth.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)
    const expenses = thisMonth.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)
    const balance = income - expenses

    // category breakdown
    const catMap = new Map<string, number>()
    for (const tx of thisMonth.filter(tx => tx.amount < 0)) {
      catMap.set(tx.catId, (catMap.get(tx.catId) ?? 0) + Math.abs(tx.amount))
    }
    const catLines = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([catId, total]) => {
        const cat = getCat(catId)
        return `  - ${cat?.label ?? catId}: ฿${fmt(total)}`
      })
      .join('\n')

    // budget status
    const budgetLines = budgets.map(b => {
      const cat = getCat(b.catId)
      const spent = catMap.get(b.catId) ?? 0
      const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0
      return `  - ${cat?.label ?? b.catId}: ใช้ไป ฿${fmt(spent)} จาก ฿${fmt(b.limit)} (${pct}%)`
    }).join('\n')

    // savings goals
    const goalLines = goals.map(g => {
      const pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0
      return `  - ${g.name}: ฿${fmt(g.saved)} / ฿${fmt(g.target)} (${pct}%)`
    }).join('\n')

    // recurring transactions
    const activeRecurring = recurring.filter(r => r.active)
    const recurringLines = activeRecurring.map(r => {
      const cat = getCat(r.catId)
      const sign = r.type === 'income' ? '+' : '-'
      return `  - ${r.name} (${cat?.label ?? r.catId}): ${sign}฿${fmt(r.amount)} ทุกวันที่ ${r.dayOfMonth}`
    }).join('\n')

    return `=== ข้อมูลการเงินของผู้ใช้ ===
เดือน: ${now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}

รายรับเดือนนี้: ฿${fmt(income)}
รายจ่ายเดือนนี้: ฿${fmt(expenses)}
คงเหลือ: ฿${fmt(balance)}

รายจ่ายแยกตามหมวด:
${catLines || '  (ยังไม่มีข้อมูล)'}

งบประมาณ (Budget):
${budgetLines || '  (ยังไม่ได้ตั้งงบ)'}

เป้าหมายออมเงิน:
${goalLines || '  (ยังไม่มีเป้าหมาย)'}

รายการประจำ (Recurring):
${recurringLines || '  (ยังไม่มีรายการประจำ)'}

ความมั่งคั่งสุทธิ (Net Worth):
  สินทรัพย์รวม: ฿${fmt(totalAssets)}
  หนี้สินรวม: ฿${fmt(totalLiabilities)}
  Net Worth: ฿${fmt(netWorth)}`
  }, [transactions, budgets, goals, totalAssets, totalLiabilities, netWorth, recurring, getCat])

  // ── auto scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── send message ───────────────────────────────────────────────────────────

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { id: uid(), role: 'user', content: trimmed }
    const aiId = uid()
    const aiMsg: Message = { id: aiId, role: 'assistant', content: '', streaming: true }

    setMessages(prev => [...prev, userMsg, aiMsg])
    setInput('')
    setLoading(true)

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      await streamChat(history, context, chunk => {
        setMessages(prev =>
          prev.map(m => m.id === aiId ? { ...m, content: m.content + chunk } : m)
        )
      }, ctrl.signal)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages(prev =>
        prev.map(m =>
          m.id === aiId
            ? { ...m, content: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', streaming: false }
            : m
        )
      )
    } finally {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false } : m))
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  function handleClear() {
    abortRef.current?.abort()
    setMessages([])
    setLoading(false)
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const isEmpty = messages.length === 0

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100svh - 56px - 72px)',
      overflow: 'hidden',
    }}>
      {/* header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: 'var(--bg2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.2 }}>
              Zeery AI
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>ผู้ช่วยวางแผนการเงิน</div>
          </div>
        </div>
        {!isEmpty && (
          <button
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text2)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
            }}
          >
            <RotateCcw size={14} />
            ล้าง
          </button>
        )}
      </div>

      {/* messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {isEmpty ? (
          <EmptyState onSuggest={t => send(t)} />
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* suggestions row — shown after first message */}
      {!isEmpty && !loading && (
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '0 16px 8px',
          flexShrink: 0,
          scrollbarWidth: 'none',
        }}>
          {SUGGESTIONS.slice(0, 4).map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              style={{
                flexShrink: 0,
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                color: 'var(--text2)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* input area */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 16px',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-end',
        flexShrink: 0,
        background: 'var(--bg2)',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ถามเรื่องการเงินได้เลย..."
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '0.9rem',
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--text)',
            outline: 'none',
            lineHeight: '1.4',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          style={{
            width: 40, height: 40,
            borderRadius: '50%',
            background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg3)',
            border: 'none',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
            color: input.trim() && !loading ? '#fff' : 'var(--text2)',
          }}
        >
          <Send size={17} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

// ── sub-components ─────────────────────────────────────────────────────────────

function EmptyState({ onSuggest }: { onSuggest: (t: string) => void }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      paddingBottom: '24px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56,
          borderRadius: '50%',
          background: 'rgba(232,93,36,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <Sparkles size={26} color="var(--accent)" />
        </div>
        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', marginBottom: '6px' }}>
          Zeery AI
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.5 }}>
          ถามได้ทุกอย่างเกี่ยวกับการเงินของคุณ<br />
          ฉันเห็นข้อมูลจริงของคุณและตอบแบบเฉพาะเจาะจง
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        width: '100%',
        maxWidth: '340px',
      }}>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '10px 12px',
              fontSize: '0.78rem',
              color: 'var(--text)',
              cursor: 'pointer',
              textAlign: 'left',
              lineHeight: 1.4,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      alignItems: 'flex-end',
      gap: '8px',
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginBottom: '2px',
        }}>
          <Sparkles size={13} color="#fff" />
        </div>
      )}
      <div style={{
        maxWidth: '78%',
        background: isUser ? 'var(--accent)' : 'var(--bg2)',
        color: isUser ? '#fff' : 'var(--text)',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '10px 14px',
        fontSize: '0.88rem',
        lineHeight: 1.55,
        border: isUser ? 'none' : '1px solid var(--border)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {msg.content || (msg.streaming ? <TypingDots /> : '')}
        {msg.streaming && msg.content && <BlinkCursor />}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center', height: '1em' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 5, height: 5,
            borderRadius: '50%',
            background: 'var(--text2)',
            display: 'inline-block',
            animation: `dot-bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
          }}
        />
      ))}
      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </span>
  )
}

function BlinkCursor() {
  return (
    <>
      <span style={{
        display: 'inline-block',
        width: '2px',
        height: '0.9em',
        background: 'currentColor',
        marginLeft: '1px',
        verticalAlign: 'text-bottom',
        animation: 'blink 1s step-end infinite',
        opacity: 0.7,
      }} />
      <style>{`@keyframes blink { 0%,100%{opacity:.7} 50%{opacity:0} }`}</style>
    </>
  )
}
