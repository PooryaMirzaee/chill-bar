import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'

export function useAiConfig() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-config'],
    queryFn: apiClient.getAiConfig,
    staleTime: 60_000,
  })

  return {
    config: data,
    enabled: !!data?.enabled,
    isLoading,
  }
}
