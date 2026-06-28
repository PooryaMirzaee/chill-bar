import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { StoreSettings } from '@chill-bar/shared'
import { DEFAULT_STORE_SETTINGS } from '@chill-bar/shared'
import { apiClient } from '../lib/api'
import { applyBranding } from '../lib/branding'

export function useStoreSettings() {
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: apiClient.getSettings,
    staleTime: 60_000,
    placeholderData: DEFAULT_STORE_SETTINGS,
  })

  useEffect(() => {
    if (query.data) applyBranding(query.data)
  }, [query.data])

  return {
    settings: query.data ?? DEFAULT_STORE_SETTINGS,
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}

export function useStoreFeatures(settings: StoreSettings) {
  return settings.features
}
