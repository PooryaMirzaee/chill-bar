import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { LoyaltyBalance } from '@chill-bar/shared'
import { apiClient } from '../lib/api'
import { getCustomerToken } from '../lib/api'

export function useLoyalty(enabled = true) {
  const queryClient = useQueryClient()
  const hasToken = !!getCustomerToken()
  const query = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => apiClient.getLoyaltyBalance(),
    enabled: enabled && hasToken,
    staleTime: 15_000,
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['loyalty'] })
  }, [queryClient])

  return {
    balance: query.data?.chillPoints ?? 0,
    ledger: query.data?.ledger ?? ([] as LoyaltyBalance['ledger']),
    isLoading: query.isLoading,
    refresh: () => query.refetch(),
    invalidate,
    hasAccount: hasToken,
  }
}
