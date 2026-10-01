interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  className?: string
}

export function SectionHeader({ eyebrow, title, description, className = '' }: SectionHeaderProps) {
  return (
    <div className={`mb-4 px-4 ${className}`}>
      {eyebrow ? <p className="mb-1 text-sm font-medium text-muted-foreground">{eyebrow}</p> : null}
      <h2 className="atelier-section-title">{title || 'منو'}</h2>
      {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}
