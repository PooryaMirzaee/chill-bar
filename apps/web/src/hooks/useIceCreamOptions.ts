import { useQuery } from '@tanstack/react-query'
import type { IceCreamOptions } from '@chill-bar/shared'
import { DEFAULT_ICE_CREAM_BUILDER_SETTINGS } from '@chill-bar/shared'
import { apiClient } from '../lib/api'
import { BASES, COATINGS, FILLINGS, BASE_PRICE } from '../data/iceCreamBuilder'

const fallback: IceCreamOptions = {
  ...DEFAULT_ICE_CREAM_BUILDER_SETTINGS,
  basePrice: BASE_PRICE,
  bases: BASES,
  coatings: COATINGS,
  fillings: FILLINGS,
}

function hasOptions(data: IceCreamOptions | undefined): data is IceCreamOptions {
  return Boolean(
    data &&
      data.bases.length > 0 &&
      data.coatings.length > 0 &&
      data.fillings.length > 0,
  )
}

/**
 * Loads ice cream builder options from the API. Uses bundled defaults while
 * fetching or if the API is unreachable / returns an empty catalog.
 */
export function useIceCreamOptions() {
  const query = useQuery({
    queryKey: ['ice-cream-options'],
    queryFn: apiClient.getIceCreamOptions,
    placeholderData: fallback,
    staleTime: 120_000,
    retry: 1,
  })

  const data = hasOptions(query.data) ? query.data : fallback

  return {
    ...query,
    data,
    isLive: query.isSuccess && hasOptions(query.data),
  }
}

export type { IceCreamOptions }
