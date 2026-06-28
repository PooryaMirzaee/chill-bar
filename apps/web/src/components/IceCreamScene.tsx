/** Minimal wrapper — premium backdrop handled by parent Tailwind classes. */
export function IceCreamScene({ children }: { children: React.ReactNode }) {
  return <div className="relative h-full w-full">{children}</div>
}
