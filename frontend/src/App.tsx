import { useCallback, useEffect, useState } from 'react'
import './App.css'

type HealthResult = {
  status: string
  service?: string
  version?: string
  database?: string
}

type Status = 'checking' | 'up' | 'down'

type ServiceState = {
  status: Status
  data: HealthResult | null
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const REFRESH_MS = 30000
const SECTIONS = ['overview', 'services', 'metrics', 'deployments', 'logs'] as const

const NAV_ITEMS: { id: (typeof SECTIONS)[number]; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◫' },
  { id: 'services', label: 'Services', icon: '◇' },
  { id: 'metrics', label: 'Metrics', icon: '⌁' },
  { id: 'deployments', label: 'Deployments', icon: '⇧' },
  { id: 'logs', label: 'Logs', icon: '≡' },
]

const INITIAL: ServiceState = { status: 'checking', data: null }

async function checkEndpoint(path: string): Promise<ServiceState> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(`${API_URL}${path}`, { signal: controller.signal })
    const data: HealthResult = await response.json()
    if (!response.ok || data.status !== 'ok') throw new Error('Health check failed')
    return { status: 'up', data }
  } catch {
    return { status: 'down', data: null }
  } finally {
    window.clearTimeout(timeout)
  }
}

function pillLabel(status: Status, up: string, down: string) {
  return status === 'checking' ? 'Checking' : status === 'up' ? up : down
}

function App() {
  const [backend, setBackend] = useState<ServiceState>(INITIAL)
  const [database, setDatabase] = useState<ServiceState>(INITIAL)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [activeSection, setActiveSection] = useState<string>('overview')

  const refreshHealth = useCallback(async () => {
    setLoading(true)
    // Keep the previous status on screen while re-checking so the UI doesn't flicker.
    const [b, d] = await Promise.all([
      checkEndpoint('/api/health'),
      checkEndpoint('/api/db-health'),
    ])
    setBackend(b)
    setDatabase(d)
    setLastChecked(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    void refreshHealth()
    const interval = window.setInterval(() => void refreshHealth(), REFRESH_MS)
    return () => window.clearInterval(interval)
  }, [refreshHealth])

  // Highlight the sidebar item for the section currently in view.
  useEffect(() => {
    const elements = SECTIONS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActiveSection(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const backendUp = backend.status === 'up'
  const databaseUp = database.status === 'up'
  const servicesUp = Number(backendUp) + Number(databaseUp)
  const initialCheck = backend.status === 'checking' || database.status === 'checking'

  const availabilityText = initialCheck
    ? 'Checking services'
    : servicesUp === 2
      ? 'All systems operational'
      : 'Service attention needed'
  const availabilityClass = initialCheck
    ? 'muted-text'
    : servicesUp === 2
      ? 'status-text success'
      : 'status-text warning'

  const dotClass = (s: Status) => (s === 'up' ? 'green-dot' : s === 'down' ? 'red-dot' : '')
  const pillClass = (s: Status) => (s === 'up' ? 'healthy' : s === 'down' ? 'unhealthy' : '')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="DevOpsHub home">
          <span className="brand-mark">D</span>
          <span>devops<span className="brand-light">hub</span></span>
        </a>

        <div className="nav-label">Workspace</div>
        <nav className="navigation" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              href={`#${item.id}`}
              aria-current={activeSection === item.id ? 'page' : undefined}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span> {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="environment-label">Environment</div>
          <div className="environment">
            <span className="environment-dot" />
            <span>Development</span>
            <span className="environment-arrow" aria-hidden="true">⌄</span>
          </div>
          <div className="sidebar-footer">
            <span className="avatar">AC</span>
            <span className="user-info">
              <strong>DevOps Engineer</strong>
              <small>DevOpsHub workspace</small>
            </span>
            <span className="more" aria-hidden="true">···</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <span>/</span> <strong>Overview</strong>
          </div>
          <div className="topbar-right">
            <span className="live-indicator">
              <span /> Live checks
            </span>
            <button
              className="refresh-button"
              onClick={() => void refreshHealth()}
              disabled={loading}
            >
              <span className={loading ? 'spin' : ''} aria-hidden="true">↻</span>
              Refresh
            </button>
          </div>
        </header>

        <section className="page-heading" id="overview">
          <div>
            <div className="eyebrow">Your infrastructure at a glance</div>
            <h1>Overview<span className="heading-period">.</span></h1>
            <p className="page-description">
              Monitor your services, infrastructure and deployments in one place.
            </p>
          </div>
          <div className="updated-label" role="status" aria-live="polite">
            <span className="updated-dot" />
            {loading && !lastChecked
              ? 'Checking services...'
              : loading
                ? 'Refreshing...'
                : lastChecked
                  ? `Updated ${lastChecked.toLocaleTimeString()}`
                  : 'Waiting for first check'}
          </div>
        </section>

        <section className="summary-grid" aria-label="Summary">
          <article className="summary-card">
            <div className="card-top">
              <span className="card-label">Availability</span>
              <span className="card-icon purple" aria-hidden="true">◈</span>
            </div>
            <div className="card-value">
              {initialCheck ? '–' : servicesUp}<span className="value-muted">/2</span>
            </div>
            <div className="card-foot">
              <span className={availabilityClass}>{availabilityText}</span>
            </div>
          </article>

          <article className="summary-card">
            <div className="card-top">
              <span className="card-label">Backend API</span>
              <span className="card-icon green" aria-hidden="true">⌘</span>
            </div>
            <div className="card-value status-value">
              <span className={`status-dot ${dotClass(backend.status)}`} />
              {pillLabel(backend.status, 'Healthy', 'Unavailable')}
            </div>
            <div className="card-foot">
              <span className="muted-text">{backend.data?.service ?? 'Flask application'}</span>
            </div>
          </article>

          <article className="summary-card">
            <div className="card-top">
              <span className="card-label">Database</span>
              <span className="card-icon blue" aria-hidden="true">▤</span>
            </div>
            <div className="card-value status-value">
              <span className={`status-dot ${dotClass(database.status)}`} />
              {pillLabel(database.status, 'Connected', 'Unavailable')}
            </div>
            <div className="card-foot">
              <span className="muted-text">
                PostgreSQL · {databaseUp ? 'Connection verified' : 'Connection not verified'}
              </span>
            </div>
          </article>

          <article className="summary-card">
            <div className="card-top">
              <span className="card-label">Monitoring</span>
              <span className="card-icon amber" aria-hidden="true">⌁</span>
            </div>
            <div className="card-value monitoring-value">In progress</div>
            <div className="card-foot">
              <span className="muted-text">Prometheus setup is next</span>
            </div>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel metrics-panel" id="metrics">
            <div className="panel-heading">
              <div>
                <h2>Performance metrics</h2>
                <p>Application and infrastructure telemetry</p>
              </div>
              <span className="coming-badge">Next step</span>
            </div>

            <div className="metrics-placeholder">
              <div className="chart-illustration">
                <div className="chart-gridline line-one" />
                <div className="chart-gridline line-two" />
                <div className="chart-gridline line-three" />
                <svg viewBox="0 0 500 120" preserveAspectRatio="none" aria-hidden="true">
                  <path
                    d="M0 100 L65 88 L120 95 L175 60 L225 72 L280 35 L330 53 L385 25 L440 42 L500 10"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
              <h3>Your metrics will appear here</h3>
              <p>
                We'll connect Prometheus to collect real CPU, memory, request
                latency and error-rate data. No simulated values.
              </p>
            </div>

            <div className="metric-legend">
              <span><i className="legend-dot purple-dot" /> Request latency</span>
              <span className="muted-text">Awaiting telemetry</span>
            </div>
          </article>

          <article className="panel services-panel" id="services">
            <div className="panel-heading">
              <div>
                <h2>Service health</h2>
                <p>Live endpoint checks</p>
              </div>
              <span className="service-count">{initialCheck ? '–' : servicesUp}/2</span>
            </div>

            <div className="service-row">
              <div className="service-symbol flask-symbol">API</div>
              <div className="service-details">
                <strong>Backend API</strong>
                <small>GET /api/health</small>
              </div>
              <span className={`health-pill ${pillClass(backend.status)}`}>
                {pillLabel(backend.status, 'Healthy', 'Down')}
              </span>
            </div>

            <div className="service-row">
              <div className="service-symbol database-symbol">DB</div>
              <div className="service-details">
                <strong>PostgreSQL</strong>
                <small>GET /api/db-health</small>
              </div>
              <span className={`health-pill ${pillClass(database.status)}`}>
                {pillLabel(database.status, 'Healthy', 'Down')}
              </span>
            </div>

            <div className="panel-note">
              <span className="note-icon" aria-hidden="true">i</span>
              Health checks refresh automatically every 30 seconds.
            </div>
          </article>
        </section>

        <section className="panel activity-panel" id="deployments">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Deployment and operational events</p>
            </div>
            <span className="coming-badge">Coming soon</span>
          </div>

          <div className="empty-activity">
            <span className="empty-icon" aria-hidden="true">↗</span>
            <div>
              <strong>No activity feed connected yet</strong>
              <p>Next, we'll integrate deployment events from GitHub Actions.</p>
            </div>
          </div>
        </section>

        <section className="panel activity-panel" id="logs">
          <div className="panel-heading">
            <div>
              <h2>Logs</h2>
              <p>Application and service logs</p>
            </div>
            <span className="coming-badge">Coming soon</span>
          </div>

          <div className="empty-activity">
            <span className="empty-icon" aria-hidden="true">≡</span>
            <div>
              <strong>No log source connected yet</strong>
              <p>Logs from the backend and database will be streamed here.</p>
            </div>
          </div>
        </section>

        <footer className="page-footer">
          <span><span className="footer-mark">D</span> DevOpsHub <span>·</span> Phase 4</span>
          <span>Built to observe. Designed to recover.</span>
        </footer>
      </main>
    </div>
  )
}

export default App