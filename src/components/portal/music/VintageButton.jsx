import React from 'react'
import VintageIcon from './VintageIcon.jsx'

/**
 * VintageButton — botón de hardware. Variantes:
 *  - 'transport': botón plástico con bisel que se HUNDE al pulsar (translateY +
 *    sombra interna). Ideal para play/pause/stop con VintageIcon.
 *  - 'led': tapa translúcida con LED interior que se ENCIENDE (glow) cuando active.
 *  - 'toggle': interruptor de palanca metálico que bascula (resorte) on/off.
 *
 * Accesible: <button> real, aria-pressed cuando aplica, focus-visible con anillo
 * del acento (CSS), disabled mate. reduced-motion desactiva rebotes por CSS.
 *
 * Props: variant, icon (nombre VintageIcon), label, active, onClick, disabled,
 *        accent, ledColor ('amber'|'red'|'green'), size, title
 */
export default function VintageButton({
  variant = 'transport', icon, label, active = false, onClick,
  disabled = false, accent = '#22c55e', ledColor = 'amber', size = 44, title,
}) {
  const isToggleLike = variant === 'led' || variant === 'toggle'
  const common = {
    type: 'button',
    onClick: disabled ? undefined : onClick,
    disabled,
    title: title || label,
    'aria-label': label,
    ...(isToggleLike ? { 'aria-pressed': !!active } : {}),
    style: { '--accent': accent, '--vbtn-size': `${size}px` },
  }

  if (variant === 'toggle') {
    return (
      <button {...common} className={`vbtn vbtn--toggle ${active ? 'is-on' : ''} ${disabled ? 'is-disabled' : ''}`}>
        <span className="vbtn-toggle-track"><span className="vbtn-toggle-lever" /></span>
        {label && <span className="vbtn-label">{label}</span>}
      </button>
    )
  }

  if (variant === 'led') {
    return (
      <button {...common} className={`vbtn vbtn--led led--${ledColor} ${active ? 'is-on' : ''} ${disabled ? 'is-disabled' : ''}`}>
        <span className="vbtn-led" aria-hidden="true" />
        {label && <span className="vbtn-label">{label}</span>}
      </button>
    )
  }

  // transport
  return (
    <button {...common} className={`vbtn vbtn--transport ${active ? 'is-on' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <span className="vbtn-cap" aria-hidden="true">
        {icon && <VintageIcon name={icon} size={Math.round(size * 0.42)} />}
      </span>
      {label && <span className="vbtn-label">{label}</span>}
    </button>
  )
}
