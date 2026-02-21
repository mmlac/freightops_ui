import React, { useEffect, useState } from 'react'
import {
  ShipmentDetail,
  ShipmentEvent,
  ShipmentException,
  ShipmentPlan,
  EtaUpdate,
  ShipmentDocument,
  ActionLogEntry,
  CopilotSummary,
  getShipment,
  listShipmentEvents,
  listShipmentExceptions,
  getShipmentPlan,
  listShipmentEtas,
  listShipmentDocuments,
  markDocumentReceived,
  listActionLog,
  createActionLogEntry,
  getCopilotSummary,
} from '../api/client'
import { categorizeStatus } from '../domain/status'
import { Badge, Button, Card, Mono, SmallMuted } from './components'

export function ShipmentDetailPage(props: { shipmentRef: string; onBack: () => void }) {
  const [detail, setDetail] = useState<ShipmentDetail | null>(null)
  const [events, setEvents] = useState<ShipmentEvent[] | null>(null)
  const [exceptions, setExceptions] = useState<ShipmentException[] | null>(null)
  const [plan, setPlan] = useState<ShipmentPlan | null>(null)
  const [etas, setEtas] = useState<EtaUpdate[] | null>(null)
  const [documents, setDocuments] = useState<ShipmentDocument[] | null>(null)
  const [actionLog, setActionLog] = useState<ActionLogEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [docSubmitting, setDocSubmitting] = useState<string | null>(null)

  const [copilot, setCopilot] = useState<CopilotSummary | null>(null)
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotError, setCopilotError] = useState<string | null>(null)

  const [rawEventPopup, setRawEventPopup] = useState<ShipmentEvent | null>(null)
  const [exceptionPopup, setExceptionPopup] = useState<ShipmentException | null>(null)

  const [logAction, setLogAction] = useState('CALL_CARRIER')
  const [logComments, setLogComments] = useState('')
  const [logSubmitting, setLogSubmitting] = useState(false)
  const [logResult, setLogResult] = useState<string | null>(null)

  const refresh = async () => {
    try {
      setError(null)
      const [d, ev, ex, pl, etaList, docs, log] = await Promise.all([
        getShipment(props.shipmentRef),
        listShipmentEvents(props.shipmentRef),
        listShipmentExceptions(props.shipmentRef),
        getShipmentPlan(props.shipmentRef),
        listShipmentEtas(props.shipmentRef),
        listShipmentDocuments(props.shipmentRef),
        listActionLog(props.shipmentRef),
      ])
      setDetail(d)
      setEvents(ev)
      setExceptions(ex)
      setPlan(pl)
      setEtas(etaList)
      setDocuments(docs)
      setActionLog(log)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    }
  }

  useEffect(() => {
    refresh()
  }, [props.shipmentRef])

  const category = detail ? categorizeStatus(detail.status_code) : 'active'
  const latestLoc = detail
    ? [detail.location_city, detail.location_state].filter(Boolean).join(', ') || null
    : null

  const handleCopilot = async () => {
    setCopilotLoading(true)
    setCopilotError(null)
    try {
      const result = await getCopilotSummary(props.shipmentRef)
      setCopilot(result)
    } catch (e: any) {
      setCopilotError(e?.message ?? String(e))
    } finally {
      setCopilotLoading(false)
    }
  }

  const handleCreateLogEntry = async () => {
    setLogSubmitting(true)
    setLogResult(null)
    try {
      const entry = await createActionLogEntry(props.shipmentRef, {
        action: logAction,
        comments: logComments.trim() || undefined,
      })
      setActionLog(prev => [...(prev ?? []), entry])
      setLogResult('Logged.')
      setLogComments('')
    } catch (e: any) {
      setLogResult(`Error: ${e?.message ?? String(e)}`)
    } finally {
      setLogSubmitting(false)
    }
  }

  const handleMarkReceived = async (docType: string) => {
    setDocSubmitting(docType)
    try {
      const updated = await markDocumentReceived(props.shipmentRef, { type: docType })
      setDocuments(prev =>
        prev ? prev.map(d => (d.type === docType ? updated : d)) : [updated],
      )
    } catch (e: any) {
      setError(`Failed to mark ${docType} received: ${e?.message ?? String(e)}`)
    } finally {
      setDocSubmitting(null)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button onClick={props.onBack}>← Back</Button>
        <h2 style={{ margin: 0 }}><Mono>{props.shipmentRef}</Mono></h2>
        <button
          onClick={handleCopilot}
          disabled={copilotLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid #e0e7ff',
            background: copilotLoading ? '#eef2ff' : 'white',
            color: '#3730a3',
            padding: '7px 12px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 13,
            cursor: copilotLoading ? 'not-allowed' : 'pointer',
          }}
        >
          <span style={{ fontSize: 15 }}>✦</span>
          {copilotLoading ? 'Summarizing…' : 'Summarize with Copilot'}
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Badge label={category.toUpperCase()} kind={category} />
          <Button onClick={refresh}>Refresh</Button>
        </div>
      </div>

      {(copilot || copilotError) && (
        <Card style={{ borderColor: '#e0e7ff', background: '#f5f3ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, color: '#3730a3', fontSize: 14 }}>
              <span>✦</span> Copilot Summary
            </div>
            {copilot && (
              <SmallMuted>{copilot.model} · {new Date(copilot.generated_at).toLocaleString()}</SmallMuted>
            )}
          </div>
          {copilotError ? (
            <div style={{ color: '#991b1b', fontSize: 13 }}>{copilotError}</div>
          ) : (
            <div
              style={{ fontSize: 14, lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{
                __html: copilot!.summary.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, match =>
                  match.replace(/</g, '&lt;').replace(/>/g, '&gt;')
                ),
              }}
            />
          )}
        </Card>
      )}

      {error ? (
        <Card>
          <div style={{ color: '#991b1b' }}>
            <div style={{ fontWeight: 800 }}>Error</div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{error}</div>
          </div>
        </Card>
      ) : null}

      {!detail ? (
        <Card><div>Loading…</div></Card>
      ) : (
        <>
          {/* Current state */}
          <Card>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <Info label="Latest status" value={detail.status_code ?? '—'} />
                <Info label="Latest event time" value={detail.status_event_time ? new Date(detail.status_event_time).toLocaleString() : '—'} />
                <Info label="Latest location" value={latestLoc ?? '—'} />
              </div>
              {detail.carrier_scac && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                  <Info label="Carrier SCAC" value={detail.carrier_scac} />
                  <Info label="Events" value={String(detail.event_count)} />
                </div>
              )}
            </div>
          </Card>

          {/* Plan */}
          {plan && (
            <Card>
              <SectionTitle>Plan</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                <Info label="Pickup earliest" value={new Date(plan.pickup_earliest).toLocaleString()} />
                <Info label="Pickup latest" value={new Date(plan.pickup_latest).toLocaleString()} />
                <Info label="Delivery appointment" value={new Date(plan.delivery_appointment).toLocaleString()} />
                <Info label="Initial ETA" value={new Date(plan.initial_eta).toLocaleString()} />
              </div>
            </Card>
          )}

          {/* Documents required and provided */}
          <Card>
            <SectionTitle>Documents</SectionTitle>
            {!documents ? (
              <div>Loading…</div>
            ) : documents.length === 0 && !plan ? (
              <SmallMuted>No document tracking — post a plan to initialize document requirements.</SmallMuted>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {(() => {
                  const required = plan?.required_documents ?? []
                  const byType = new Map(documents.map(d => [d.type, d]))
                  const allTypes = [...new Set([...required, ...documents.map(d => d.type)])]
                  if (allTypes.length === 0) return <SmallMuted>No documents tracked.</SmallMuted>
                  return allTypes.map(type => {
                    const doc = byType.get(type)
                    const isRequired = required.includes(type)
                    const isReceived = doc?.status === 'received'
                    return (
                      <div
                        key={type}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '100px 120px 1fr auto',
                          gap: 10,
                          alignItems: 'center',
                          padding: '10px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 12,
                          background: isReceived ? '#f0fdf4' : isRequired ? '#fff7ed' : 'white',
                        }}
                      >
                        <div style={{ fontWeight: 900 }}><Mono>{type}</Mono></div>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          background: isReceived ? '#dcfce7' : '#fee2e2',
                          color: isReceived ? '#166534' : '#991b1b',
                        }}>
                          {isReceived ? 'RECEIVED' : 'MISSING'}
                        </span>
                        <SmallMuted>
                          {isRequired ? 'Required' : 'Extra'}
                          {doc?.received_at ? ` · ${new Date(doc.received_at).toLocaleString()}` : ''}
                        </SmallMuted>
                        {!isReceived && (
                          <Button
                            kind="primary"
                            onClick={() => handleMarkReceived(type)}
                            disabled={docSubmitting === type}
                          >
                            {docSubmitting === type ? 'Saving…' : 'Mark received'}
                          </Button>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </Card>

          {/* ETA history */}
          {etas && etas.length > 0 && (
            <Card>
              <SectionTitle>ETA History</SectionTitle>
              <div style={{ display: 'grid', gap: 8 }}>
                {etas.map((e, i) => (
                  <div
                    key={e.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 10,
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                    }}
                  >
                    <div>
                      <SmallMuted>ETA #{i + 1}</SmallMuted>
                      <div style={{ fontWeight: 900 }}>{new Date(e.eta).toLocaleString()}</div>
                    </div>
                    <div>
                      <SmallMuted>Source</SmallMuted>
                      <div><Mono>{e.source}</Mono></div>
                    </div>
                    <div>
                      <SmallMuted>Recorded</SmallMuted>
                      <div>{new Date(e.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Exceptions */}
          {exceptions && exceptions.length > 0 && (
            <Card>
              <SectionTitle>Exceptions</SectionTitle>
              <div style={{ display: 'grid', gap: 8 }}>
                {exceptions.map(ex => (
                  <ExceptionRow key={ex.id} ex={ex} onShowDetails={() => setExceptionPopup(ex)} />
                ))}
              </div>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <SectionTitle>Timeline</SectionTitle>
            {!events ? (
              <div>Loading…</div>
            ) : events.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No events found for this shipment yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {events.map(e => (
                  <EventRow key={e.id} e={e} onShowRaw={() => setRawEventPopup(e)} />
                ))}
              </div>
            )}
          </Card>

          {/* Action Log */}
          <Card>
            <SectionTitle>Action Log</SectionTitle>
            {actionLog && actionLog.length > 0 && (
              <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
                {actionLog.map(entry => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 80px 1fr 180px',
                      gap: 10,
                      alignItems: 'start',
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 10,
                      background: entry.action === 'NOTE' ? '#fefce8' : 'white',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}><Mono>{entry.action}</Mono></div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'ui-monospace, monospace', opacity: 0.7 }}>{entry.actor}</div>
                    <div style={{ fontSize: 13 }}>{entry.comments ?? <span style={{ opacity: 0.4 }}>—</span>}</div>
                    <SmallMuted>{new Date(entry.taken_at).toLocaleString()}</SmallMuted>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 10, alignItems: 'end' }}>
              <div>
                <SmallMuted>Action</SmallMuted>
                <select value={logAction} onChange={e => setLogAction(e.target.value)} style={selectStyle}>
                  <option value="CALL_CARRIER">Call Carrier</option>
                  <option value="SEND_EMAIL">Send Email</option>
                  <option value="CREATE_TICKET">Create Ticket</option>
                  <option value="NOTE">Note</option>
                </select>
              </div>
              <div>
                <SmallMuted>Comments</SmallMuted>
                <input
                  value={logComments}
                  onChange={e => setLogComments(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !logSubmitting && handleCreateLogEntry()}
                  placeholder={logAction === 'NOTE' ? 'Add a note…' : 'What was done or agreed…'}
                  style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <Button kind="primary" onClick={handleCreateLogEntry} disabled={logSubmitting}>
                {logSubmitting ? 'Logging…' : 'Log'}
              </Button>
            </div>
            {logResult && (
              <div style={{ marginTop: 8, fontSize: 13, color: logResult.startsWith('Error') ? '#991b1b' : '#166534' }}>
                {logResult}
              </div>
            )}
          </Card>
        </>
      )}

      {rawEventPopup && (
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
        onClick={() => setRawEventPopup(null)}
      >
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            padding: 20,
            maxWidth: 600,
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Event Details</h3>
            <button
              onClick={() => setRawEventPopup(null)}
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
            {JSON.stringify(rawEventPopup, null, 2)}
          </pre>
        </div>
      </div>
    )}

    {exceptionPopup && (
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
        onClick={() => setExceptionPopup(null)}
      >
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            padding: 20,
            maxWidth: 600,
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Exception Details</h3>
            <button
              onClick={() => setExceptionPopup(null)}
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
            {JSON.stringify(exceptionPopup, null, 2)}
          </pre>
        </div>
      </div>
    )}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 14,
  outline: 'none',
  background: 'white',
}

function SectionTitle(props: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 900, marginBottom: 8 }}>{props.children}</div>
}

function Info(props: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 10 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{props.label}</div>
      <div style={{ fontWeight: 900, marginTop: 2 }}>{props.value}</div>
    </div>
  )
}

function EventRow(props: { e: ShipmentEvent; onShowRaw: () => void }) {
  const e = props.e
  const when = e.event_time ?? ''
  const loc = [e.location_city, e.location_state].filter(Boolean).join(', ')
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '200px 140px 1fr 100px',
        gap: 10,
        alignItems: 'center',
        padding: '10px 10px',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        background: 'white',
      }}
    >
      <div>
        <div style={{ fontWeight: 900 }}>{e.status_code}</div>
        <SmallMuted>Event #{e.id}</SmallMuted>
      </div>
      <div>
        <div style={{ fontWeight: 800 }}>{when ? new Date(when).toLocaleString() : '—'}</div>
        <SmallMuted>Evidence raw #{e.evidence_raw_event_id}</SmallMuted>
      </div>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {loc || <span style={{ opacity: 0.6 }}>No location</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Mono style={{ fontSize: 12 }}>{e.event_type}</Mono>
        <button
          onClick={props.onShowRaw}
          style={{
            border: '1px solid #e5e7eb',
            background: 'white',
            padding: '4px 8px',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 11,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          View
        </button>
      </div>
    </div>
  )
}

function ExceptionRow(props: { ex: ShipmentException; onShowDetails: () => void }) {
  const { ex } = props
  const severityColor = ex.severity === 'high' ? '#991b1b' : ex.severity === 'medium' ? '#92400e' : '#374151'
  const severityBg = ex.severity === 'high' ? '#fee2e2' : ex.severity === 'medium' ? '#fef3c7' : '#f3f4f6'
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 90px 1fr 100px',
        gap: 10,
        alignItems: 'center',
        padding: '10px 10px',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        background: 'white',
      }}
    >
      <div>
        <div style={{ fontWeight: 900 }}>{ex.type}</div>
        <SmallMuted>ID: {ex.id}</SmallMuted>
      </div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: 999,
          background: severityBg,
          color: severityColor,
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {ex.severity.toUpperCase()}
      </span>
      <div>
        <SmallMuted>Opened {new Date(ex.opened_at).toLocaleString()}</SmallMuted>
        {ex.closed_at ? (
          <SmallMuted>Closed {new Date(ex.closed_at).toLocaleString()}</SmallMuted>
        ) : (
          <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 700 }}>Open</div>
        )}
        {ex.evidence.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {ex.evidence.map((ev, i) => (
              <SmallMuted key={i}>{Object.entries(ev).map(([k, v]) => `${k}: ${v}`).join(' · ')}</SmallMuted>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
        <SmallMuted style={{ whiteSpace: 'nowrap' }}>{ex.evidence.length} item{ex.evidence.length !== 1 ? 's' : ''}</SmallMuted>
        <button
          onClick={props.onShowDetails}
          style={{
            border: '1px solid #e5e7eb',
            background: 'white',
            padding: '4px 8px',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 11,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          View
        </button>
      </div>
    </div>
  )
}
