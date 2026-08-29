import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles/global.css'

// Portal components — lazy loaded
const PortalDataProvider = React.lazy(() => import('./components/portal/PortalDataProvider.jsx'))
const PortalLayout = React.lazy(() => import('./components/portal/PortalLayout.jsx'))
const PortalLanding = React.lazy(() => import('./pages/portal/PortalLanding.jsx'))
const PortalCommissions = React.lazy(() => import('./pages/portal/PortalCommissions.jsx'))
const PortalPortfolio = React.lazy(() => import('./pages/portal/PortalPortfolio.jsx'))
const PortalCalendar = React.lazy(() => import('./pages/portal/PortalCalendar.jsx'))
const PortalLinks = React.lazy(() => import('./pages/portal/PortalLinks.jsx'))
const PortalRequest = React.lazy(() => import('./pages/portal/PortalRequest.jsx'))
const PortalServices = React.lazy(() => import('./pages/portal/PortalServices.jsx'))
const PortalThemeProvider = React.lazy(() => import('./components/portal/PortalThemeProvider.jsx'))

function PortalRoutes() {
  return (
    <Routes>
      <Route index element={<PortalLanding />} />
      <Route path="commissions" element={<PortalCommissions />} />
      <Route path="portfolio" element={<PortalPortfolio />} />
      <Route path="calendar" element={<PortalCalendar />} />
      <Route path="links" element={<PortalLinks />} />
      <Route path="request" element={<PortalRequest />} />
      <Route path="services" element={<PortalServices />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  )
}

function PortalFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111113' }}>
      <div className="mini-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PortalFallback />}>
        <Routes>
          {/* Portal routes — /p/:slug/* */}
          <Route
            path="/p/:slug/*"
            element={
              <PortalDataProvider>
                <PortalThemeProvider>
                  <PortalLayout>
                    <PortalRoutes />
                  </PortalLayout>
                </PortalThemeProvider>
              </PortalDataProvider>
            }
          />
          {/* Root redirect to a placeholder */}
          <Route path="/" element={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111113', color: '#e8e8ec', fontFamily: 'Inter, sans-serif' }}>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Possumble Studio</h1>
                <p style={{ color: '#888', fontSize: '0.85rem' }}>Portal de comisiones — accede via /p/tu-slug</p>
              </div>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
