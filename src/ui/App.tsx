import React, { useState } from 'react'
import { setAuthToken, clearAuthToken, LoginResponse } from '../api/client'
import { LoginPage } from './LoginPage'
import { ShipmentsPage } from './ShipmentsPage'
import { ShipmentDetailPage } from './ShipmentDetailPage'
import { EventsPage } from './EventsPage'

type Route =
  | { name: 'shipments' }
  | { name: 'shipment_detail'; shipmentRef: string }
  | { name: 'events' }

type AuthState = { token: string; sender: string }

export function App() {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [route, setRoute] = useState<Route>({ name: 'shipments' })

  const handleLogin = (result: LoginResponse) => {
    setAuthToken(result.token)
    setAuth({ token: result.token, sender: result.sender })
    setRoute({ name: 'shipments' })
  }

  const handleLogout = () => {
    clearAuthToken()
    setAuth(null)
    setRoute({ name: 'shipments' })
  }

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />
  }

  const onOpenShipment = (shipmentRef: string) => {
    setRoute({ name: 'shipment_detail', shipmentRef })
  }

  const onBack = () => setRoute({ name: 'shipments' })

  return (
    <div style={styles.app}>
      <Header
        sender={auth.sender}
        onHome={() => setRoute({ name: 'shipments' })}
        onEvents={() => setRoute({ name: 'events' })}
        onLogout={handleLogout}
      />
      <div style={styles.container}>
        {route.name === 'shipments' ? (
          <ShipmentsPage onOpenShipment={onOpenShipment} />
        ) : route.name === 'events' ? (
          <EventsPage onBack={() => setRoute({ name: 'shipments' })} />
        ) : (
          <ShipmentDetailPage shipmentRef={route.shipmentRef} onBack={onBack} />
        )}
      </div>
    </div>
  )
}

function Header(props: { sender: string; onHome: () => void; onEvents: () => void; onLogout: () => void }) {
  return (
    <div style={styles.header}>
      <button onClick={props.onHome} style={styles.brandButton}>
        FreightOps
      </button>
      <div style={{ opacity: 0.7, fontSize: 12 }}>Exception Copilot UI (POC)</div>
      <button
        onClick={props.onEvents}
        style={{
          border: 'none',
          background: 'transparent',
          color: '#111827',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          marginLeft: 20,
          paddingBottom: 2,
        }}
      >
        Events
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>
          {props.sender}
        </span>
        <button onClick={props.onLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial',
    color: '#111827',
    background: '#f3f4f6',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 18px',
    borderBottom: '1px solid #e5e7eb',
    background: 'white',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  brandButton: {
    fontSize: 16,
    fontWeight: 700,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
  logoutButton: {
    border: '1px solid #e5e7eb',
    background: 'white',
    color: '#111827',
    padding: '6px 12px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: 16,
  },
}
