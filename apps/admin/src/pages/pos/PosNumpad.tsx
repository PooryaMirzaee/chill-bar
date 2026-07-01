interface PosNumpadProps {
  value: number
  onChange: (value: number) => void
  onConfirm?: () => void
  label?: string
}

export function PosNumpad({ value, onChange, onConfirm, label }: PosNumpadProps) {
  const append = (digit: string) => {
    const raw = value === 0 ? digit : `${value}${digit}`
    onChange(Number(raw))
  }

  const clear = () => onChange(0)

  return (
    <div className="pos-numpad">
      {label && <label className="pos-numpad-label">{label}</label>}
      <div className="pos-numpad-display">{value.toLocaleString('fa-IR')}</div>
      <div className="pos-numpad-grid">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'پاک', '0', 'تأیید'].map((key) => (
          <button
            key={key}
            type="button"
            className={`pos-numpad-key ${key === 'تأیید' ? 'confirm' : ''}`}
            onClick={() => {
              if (key === 'پاک') clear()
              else if (key === 'تأیید') onConfirm?.()
              else append(key)
            }}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  )
}
