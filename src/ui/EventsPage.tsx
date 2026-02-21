import React, { useEffect, useState } from 'react'
import {
  CanonicalEvent,
  RawEventMeta,
  SanitizedEvent,
  listCanonicalEvents,
  listRawEvents,
  listSanitizedEvents,
} from '../api/client'
import { Card, SmallMuted, Mono, Button } from './components'

type Tab = 'raw' | 'canonical' | 'sanitized'

export function EventsPage(props: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('sanitized')
  const [limit, setLimit] = useState(50)
  const [raw, setRaw] = useState<RawEventMeta[] | null>(null)
  const [canonical, setCanonical] = useState<CanonicalEvent[] | null>(null)
  const [sanitized, setSanitized] = useState<SanitizedEvent[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [popup, setPopup] = useState<any>(null)

  const fetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, c, s] = await Promise.all([
        listRawEvents(limit),
        listCanonicalEvents(limit),
        listSanitizedEvents(limit),
      ])
      setRaw(r)
      setCanonical(c)
      setSanitized(s)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
  }, [limit])

  const data =
    tab === 'raw' ? raw : tab === 'canonical' ? canonical : sanitized

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button onClick={props.onBack}>← Back</Button>
        <h2 style={{ margin: 0 }}>Event Inspection</h2>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <input
            type="number"
            value={limit}
            onChange={e => setLimit(Math.max(1, parseInt(e.target.value) || 50))}
            placeholder="Limit"
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '6px 10px',
              width: 70,
              fontSize: 13,
              outline: 'none',
            }}
          />
          <Button onClick={fetch} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb' }}>
        {(['raw', 'canonical', 'sanitized'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              fontWeight: tab === t ? 900 : 500,
              borderBottom: tab === t ? '2px solid #111827' : 'none',
              cursor: 'pointer',
              fontSize: 14,
              color: tab === t ? '#111827' : '#6b7280',
              marginBottom: '-1px',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <Card style={{ background: '#fee2e2' }}>
          <div style={{ color: '#991b1b', fontSize: 13 }}>{error}</div>
        </Card>
      )}

      {!data ? (
        <Card>Loading…</Card>
      ) : data.length === 0 ? (
        <Card>No events found.</Card>
      ) : (
        <Card>
          <div style={{ display: 'grid', gap: 6 }}>
            {data.map((item: any, idx: number) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  background: idx % 2 === 0 ? '#f9fafb' : 'white',
                }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    {tab === 'raw'
                      ? `Raw #${(item as RawEventMeta).id}`
                      : tab === 'canonical'
                        ? `${(item as CanonicalEvent).status_code}`
                        : `${(item as SanitizedEvent).shipment_ref} / ${(item as SanitizedEvent).status_code}`}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {tab === 'raw'
                      ? `${(item as RawEventMeta).source} · ${(item as RawEventMeta).shipment_ref || '—'}`
                      : tab === 'canonical'
                        ? `${(item as CanonicalEvent).event_type} · ${(item as CanonicalEvent).created_at}`
                        : `${(item as SanitizedEvent).event_type} · ${(item as SanitizedEvent).event_time || '—'}`}
                  </div>
                </div>
                <button
                  onClick={() => setPopup(item)}
                  style={{
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {popup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
          onClick={() => setPopup(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 20,
              maxWidth: 700,
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                {tab === 'raw' ? 'Raw Event' : tab === 'canonical' ? 'Canonical Event' : 'Sanitized Event'}
              </h3>
              <button
                onClick={() => setPopup(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: 0,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
            <pre
              style={{
                background: '#f3f4f6',
                padding: 12,
                borderRadius: 8,
                overflow: 'auto',
                fontSize: 12,
                lineHeight: 1.5,
                margin: 0,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {JSON.stringify(popup, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
