interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  className?: string
}

export function SectionHeader({ eyebrow, title, description, className = '' }: SectionHeaderProps) {
  return (
    <div className={`mb-4 px-4 ${className}`}>
      {eyebrow && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      )}
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}
