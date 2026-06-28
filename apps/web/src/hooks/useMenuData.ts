import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { categoriesWithItems } from '@chill-bar/shared'
import type { MenuData } from '../types'
import { apiClient } from '../lib/api'

const emptyMenu: MenuData = { categories: [], items: [] }

export function useMenuData() {
  const query = useQuery({
    queryKey: ['menu'],
    queryFn: apiClient.getMenu,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 3,
  })

  const data = query.data ?? emptyMenu

  const items = useMemo(
    () => data.items.filter((i) => i.isAvailable !== false),
    [data.items],
  )

  const visibleCategories = useMemo(() => {
    const ids = new Set(items.map((i) => i.category))
    return categoriesWithItems(data.categories, ids)
  }, [data.categories, items])

  return {
    categories: data.categories,
    visibleCategories,
    items,
    allItems: data.items,
    isLoading: query.isLoading,
    isError: query.isError,
    isLive: query.isSuccess,
  }
}
