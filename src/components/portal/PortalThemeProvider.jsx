import { useEffect } from 'react'
import { usePortalContext } from './PortalDataProvider.jsx'

const DEFAULT_VARS = {
  '--bg': '#111113',
  '--surface': '#1a1a1e',
  '--surface2': '#222227',
  '--surface3': '#2a2a30',
  '--border': '#2e2e36',
  '--border-light': '#3a3a44',
  '--text': '#e8e8ec',
  '--text-muted': '#888896',
  '--text-dim': '#555560',
  '--accent': '#22C55E',
  '--green': '#22C55E',
  '--radius': '10px',
  '--radius-sm': '7px',
  '--font-heading': "'Inter', system-ui, sans-serif",
  '--font-body': "'Inter', system-ui, sans-serif",
}

const CYBERPUNK_VARS = {
  '--bg': '#000000',
  '--surface': '#18181b',
  '--surface2': '#1e1e22',
  '--surface3': '#27272a',
  '--border': '#27272a',
  '--border-light': '#3f3f46',
  '--text': '#e4e4e7',
  '--text-muted': '#a1a1aa',
  '--text-dim': '#71717a',
  '--accent': '#f472b6',
  '--green': '#22C55E',
  '--radius': '8px',
  '--radius-sm': '6px',
  '--font-heading': "'Share Tech Mono', monospace",
  '--font-body': "'Share Tech Mono', monospace",
}

export default function PortalThemeProvider({ children }) {
  const { theme, accentColor, cyberpunkAccentColor } = usePortalContext()

  useEffect(() => {
    const root = document.documentElement
    const isCyberpunk = theme === 'cyberpunk'
    const vars = isCyberpunk ? { ...CYBERPUNK_VARS } : { ...DEFAULT_VARS }

    if (isCyberpunk && cyberpunkAccentColor) {
      vars['--accent'] = cyberpunkAccentColor
    } else if (!isCyberpunk && accentColor) {
      vars['--accent'] = accentColor
    }

    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    document.body.style.fontFamily = vars['--font-body']
    root.classList.toggle('theme-cyberpunk', isCyberpunk)
    root.classList.toggle('theme-default', !isCyberpunk)

    return () => {
      Object.keys(vars).forEach(key => root.style.removeProperty(key))
      root.classList.remove('theme-cyberpunk', 'theme-default')
    }
  }, [theme, accentColor, cyberpunkAccentColor])

  return children
}
