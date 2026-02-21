import React, { useState } from 'react'
import { login, LoginResponse } from '../api/client'

const VALID_SENDERS = ['GLBX', 'AFCG', 'FSDX', 'ADMIN'] as const

const SENDER_DESCRIPTIONS: Record<string, string> = {
  GLBX: 'Carrier — sees own shipments only',
  AFCG: 'Carrier — sees own shipments only',
  FSDX: 'Carrier — sees own shipments only',
  ADMIN: 'Full read/write access across all carriers',
}

export function LoginPage(props: { onLogin: (_: LoginResponse) => void }) {
  const [sender, setSender] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredSender, setHoveredSender] = useState<string | null>(null)

  const handleLogin = async (senderValue: string) => {
    const s = senderValue.trim().toUpperCase()
    if (!s) return
    setLoading(true)
    setError(null)
    try {
      const r = await login(s)
      props.onLogin(r)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial',
      }}
    >
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: '36px 40px',
          width: 380,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>FreightOps</div>
          <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>
            Sign in to continue
          </div>
        </div>

        {/* Manual input */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, display: 'block', marginBottom: 6 }}>
            Sender ID
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={sender}
              onChange={e => setSender(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin(sender)}
              placeholder="e.g. ADMIN"
              style={{
                flex: 1,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'ui-monospace, monospace',
                textTransform: 'uppercase',
              }}
            />
            <button
              onClick={() => handleLogin(sender)}
              disabled={loading || !sender.trim()}
              style={{
                background: '#111827',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '10px 18px',
                fontWeight: 700,
                fontSize: 14,
                cursor: loading || !sender.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !sender.trim() ? 0.5 : 1,
              }}
            >
              {loading ? '…' : 'Login'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Quick-select senders */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.5, marginBottom: 10 }}>
            AVAILABLE ACCOUNTS
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {VALID_SENDERS.map(s => (
              <button
                key={s}
                onClick={() => handleLogin(s)}
                disabled={loading}
                onMouseEnter={() => setHoveredSender(s)}
                onMouseLeave={() => setHoveredSender(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: `1px solid ${hoveredSender === s && !loading ? '#111827' : '#e5e7eb'}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  background: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 900,
                    fontSize: 14,
                    minWidth: 48,
                  }}
                >
                  {s}
                </span>
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  {SENDER_DESCRIPTIONS[s]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
