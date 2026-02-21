import React, { useEffect, useMemo, useState } from 'react'
import { listShipments, askCopilot, Shipment } from '../api/client'
import { categorizeStatus, ShipmentCategory } from '../domain/status'
import { Badge, Button, Card, Input, Mono, SmallMuted } from './components'

type CategoryFilter = ShipmentCategory | 'all'

type CopilotMessage = {
  question: string
  answer: string
}

export function ShipmentsPage(props: { onOpenShipment: (shipmentRef: string) => void }) {
  const [allShipments, setAllShipments] = useState<Shipment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<CategoryFilter>('active')
  const [query, setQuery] = useState<string>('')
  const [copilotQuestion, setCopilotQuestion] = useState<string>('')
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([])
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotError, setCopilotError] = useState<string | null>(null)
  const [copilotVisible, setCopilotVisible] = useState(false)
  const copilotInputRef = React.useRef<HTMLInputElement>(null)

  const refresh = async () => {
    try {
      setError(null)
      const data = await listShipments()
      setAllShipments(data)
    } catch (e: any) {
      setError(e?.message ?? String(e))
      setAllShipments([])
    }
  }

  const handleAskCopilot = async () => {
    if (!copilotQuestion.trim()) return
    try {
      setCopilotError(null)
      setCopilotLoading(true)
      const response = await askCopilot(copilotQuestion)
      setCopilotMessages(prev => [{ question: copilotQuestion, answer: response.answer }, ...prev])
      setCopilotQuestion('')
    } catch (e: any) {
      setCopilotError(e?.message ?? String(e))
    } finally {
      setCopilotLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    if (!allShipments) return null
    const q = query.trim().toLowerCase()
    return allShipments.filter(s => {
      if (category !== 'all' && categorizeStatus(s.status_code) !== category) return false
      if (!q) return true
      return (
        s.shipment_ref.toLowerCase().includes(q) ||
        s.status_code.toLowerCase().includes(q) ||
        (s.carrier_scac ?? '').toLowerCase().includes(q) ||
        (s.location_city ?? '').toLowerCase().includes(q) ||
        (s.location_state ?? '').toLowerCase().includes(q)
      )
    })
  }, [allShipments, category, query])

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Shipments</h2>
        <Button onClick={() => {
          setCopilotVisible(true)
          setTimeout(() => copilotInputRef.current?.focus(), 0)
        }}>Ask Copilot</Button>
        <div style={{ marginLeft: 'auto' }}>
          <Button onClick={refresh}>Refresh</Button>
        </div>
      </div>

      {copilotVisible && (
        <Card>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>✦ Ask Copilot</h3>
              <button
                onClick={() => {
                  setCopilotVisible(false)
                  setCopilotMessages([])
                }}
                style={{
                  marginLeft: 'auto',
                  border: 'none',
                  background: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  opacity: 0.6,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
              <input
                ref={copilotInputRef}
                value={copilotQuestion}
                onChange={e => setCopilotQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !copilotLoading && handleAskCopilot()}
                placeholder="Ask about your shipments..."
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <Button kind="primary" onClick={handleAskCopilot} disabled={copilotLoading}>
                {copilotLoading ? 'Asking…' : 'Ask'}
              </Button>
            </div>

            {copilotError && (
              <div style={{ marginTop: 8, color: '#991b1b', fontSize: 13 }}>
                <strong>Error:</strong> {copilotError}
              </div>
            )}

            {copilotLoading && (
              <div style={{ marginTop: 8, color: '#375151', fontSize: 13 }}>
                Copilot is thinking…
              </div>
            )}

            {copilotMessages.length > 0 && (
              <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
                {copilotMessages.map((msg, idx) => (
                  <div key={idx} style={{ padding: 10, background: '#f9fafb', borderRadius: 10, borderLeft: '3px solid #375151' }}>
                    <SmallMuted style={{ fontSize: 12, opacity: 0.9, fontStyle: 'italic' }}>Your question:</SmallMuted>
                    <div style={{ fontSize: 13, marginBottom: 10 }}>{msg.question}</div>
                    <SmallMuted style={{ fontSize: 12, opacity: 0.9, fontStyle: 'italic' }}>Answer:</SmallMuted>
                    <div
                      style={{ fontSize: 13, lineHeight: 1.5 }}
                      dangerouslySetInnerHTML={{
                        __html: msg.answer.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, match =>
                          match.replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        ),
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <FilterButton label="All" active={category === 'all'} onClick={() => setCategory('all')} />
            <FilterButton label="Active" active={category === 'active'} onClick={() => setCategory('active')} />
            <FilterButton label="Exception" active={category === 'exception'} onClick={() => setCategory('exception')} />
            <FilterButton label="Completed" active={category === 'completed'} onClick={() => setCategory('completed')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10 }}>
            <Input value={query} onChange={setQuery} placeholder="Search by shipment ref, status, carrier, location..." />
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', fontSize: 12, opacity: 0.7 }}>
              {filtered?.length ?? 0} shown
            </div>
          </div>

          {error ? (
            <div style={{ color: '#991b1b' }}>
              <div style={{ fontWeight: 800 }}>Error</div>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{error}</div>
            </div>
          ) : null}

          {!filtered ? (
            <div>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No shipments found for this filter yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {filtered.map(s => (
                <ShipmentRow key={s.shipment_ref} s={s} onOpen={props.onOpenShipment} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function FilterButton(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 999,
        padding: '8px 12px',
        background: props.active ? '#111827' : 'white',
        color: props.active ? 'white' : '#111827',
        fontWeight: 800,
        cursor: 'pointer',
      }}
    >
      {props.label}
    </button>
  )
}

function ShipmentRow(props: { s: Shipment; onOpen: (shipmentRef: string) => void }) {
  const { s } = props
  const category = categorizeStatus(s.status_code)
  const loc = [s.location_city, s.location_state].filter(Boolean).join(', ') || null
  return (
    <div
      onClick={() => props.onOpen(s.shipment_ref)}
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 160px 1fr 140px',
        gap: 10,
        alignItems: 'center',
        padding: '10px 10px',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        cursor: 'pointer',
        background: '#fff',
      }}
    >
      <div>
        <div style={{ fontWeight: 900 }}><Mono>{s.shipment_ref}</Mono></div>
        <SmallMuted>{s.carrier_scac ?? ''}</SmallMuted>
      </div>

      <div>
        <div style={{ fontWeight: 800 }}>{s.status_code}</div>
        <SmallMuted>{s.status_event_time ? new Date(s.status_event_time).toLocaleString() : '—'}</SmallMuted>
      </div>

      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {loc ?? <span style={{ opacity: 0.6 }}>No location</span>}
      </div>

      <div style={{ justifySelf: 'end' }}>
        <Badge label={category.toUpperCase()} kind={category} />
      </div>
    </div>
  )
}
