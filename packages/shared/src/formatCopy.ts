/** Replace `{storeName}`, `{openingHours}`, etc. in admin-configured copy */
export function formatCopy(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
}

export function copyVars(settings: {
  storeName: string
  storeSubtitle?: string
  openingHours?: string
  address?: string
  phone?: string
}): Record<string, string> {
  return {
    storeName: settings.storeName,
    storeSubtitle: settings.storeSubtitle ?? '',
    openingHours: settings.openingHours ?? '',
    address: settings.address ?? '',
    phone: settings.phone ?? '',
  }
}
