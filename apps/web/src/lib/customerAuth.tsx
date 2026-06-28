import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CustomerPreferences, CustomerProfile, Order, OtpPurpose } from '@chill-bar/shared'
import {
  apiClient,
  clearCustomerToken,
  getCustomerToken,
  setCustomerToken,
} from './api'
import {
  emptyProfile,
  loadTasteProfile,
  saveTasteProfile,
  type TasteProfile,
} from './tasteProfile'

interface CustomerContextValue {
  customer: CustomerProfile | null
  loading: boolean
  isRegistered: boolean
  sendOtp: (phone: string, purpose: OtpPurpose) => Promise<{ cooldownSeconds: number }>
  verifyOtp: (phone: string, code: string, purpose: OtpPurpose, name?: string) => Promise<void>
  updateProfile: (data: { name?: string | null }) => Promise<void>
  syncPreferences: (patch?: Partial<CustomerPreferences>) => Promise<void>
  getOrders: () => Promise<Order[]>
  refresh: () => Promise<CustomerProfile>
  applyRemotePreferences: () => void
}

const CustomerContext = createContext<CustomerContextValue | null>(null)

const ICE_BUILD_KEY = 'chill-ice-build'

function applyPreferencesToLocal(prefs: CustomerPreferences) {
  if (prefs.tasteProfile) {
    saveTasteProfile({
      ...emptyProfile(),
      ...prefs.tasteProfile,
      updatedAt: prefs.tasteProfile.updatedAt ?? Date.now(),
    })
  }
  if (prefs.iceCreamBuild) {
    localStorage.setItem(ICE_BUILD_KEY, JSON.stringify(prefs.iceCreamBuild))
  }
}

function buildPreferencesPatch(extra?: Partial<CustomerPreferences>): Partial<CustomerPreferences> {
  const tasteProfile = loadTasteProfile()
  let iceCreamBuild: CustomerPreferences['iceCreamBuild']
  try {
    const raw = localStorage.getItem(ICE_BUILD_KEY)
    if (raw) iceCreamBuild = JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {
    tasteProfile,
    iceCreamBuild,
    ...extra,
  }
}

async function bootstrapSession(): Promise<CustomerProfile> {
  const token = getCustomerToken()
  if (token) {
    try {
      const profile = await apiClient.getCustomerProfile()
      applyPreferencesToLocal(profile.preferences)
      return profile
    } catch {
      clearCustomerToken()
    }
  }
  const res = await apiClient.createGuestSession()
  setCustomerToken(res.token)
  applyPreferencesToLocal(res.customer.preferences)
  return res.customer
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    const profile = await apiClient.getCustomerProfile()
    setCustomer(profile)
    applyPreferencesToLocal(profile.preferences)
    return profile
  }, [])

  useEffect(() => {
    bootstrapSession()
      .then(setCustomer)
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  const scheduleSync = useCallback(() => {
    if (!customer?.isRegistered) return
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(async () => {
      try {
        const updated = await apiClient.syncCustomerPreferences(buildPreferencesPatch())
        setCustomer(updated)
      } catch {
        /* silent */
      }
    }, 1500)
  }, [customer?.isRegistered])

  const syncPreferences = useCallback(
    async (patch?: Partial<CustomerPreferences>) => {
      if (!customer) return
      const updated = await apiClient.syncCustomerPreferences(buildPreferencesPatch(patch))
      setCustomer(updated)
    },
    [customer],
  )

  const sendOtp = useCallback(async (phone: string, purpose: OtpPurpose) => {
    const res = await apiClient.sendCustomerOtp(phone, purpose)
    return { cooldownSeconds: res.cooldownSeconds }
  }, [])

  const verifyOtp = useCallback(
    async (phone: string, code: string, purpose: OtpPurpose, name?: string) => {
      const res = await apiClient.verifyCustomerOtp(phone, code, purpose, name)
      setCustomerToken(res.token)
      setCustomer(res.customer)
      if (purpose === 'register') {
        await syncPreferences()
      } else {
        applyPreferencesToLocal(res.customer.preferences)
      }
    },
    [syncPreferences],
  )

  const updateProfile = useCallback(
    async (data: { name?: string | null }) => {
      const updated = await apiClient.updateCustomerProfile(data)
      setCustomer(updated)
    },
    [],
  )

  const getOrders = useCallback(() => apiClient.getCustomerOrders(), [])

  const applyRemotePreferences = useCallback(() => {
    if (customer?.preferences) applyPreferencesToLocal(customer.preferences)
  }, [customer?.preferences])

  useEffect(() => {
    if (!customer?.isRegistered) return
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'chill-taste-profile' || e.key === ICE_BUILD_KEY) scheduleSync()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [customer?.isRegistered, scheduleSync])

  return (
    <CustomerContext.Provider
      value={{
        customer,
        loading,
        isRegistered: !!customer?.isRegistered,
        sendOtp,
        verifyOtp,
        updateProfile,
        syncPreferences,
        getOrders,
        refresh,
        applyRemotePreferences,
      }}
    >
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomer() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider')
  return ctx
}

/** Call after taste profile changes to sync in background */
export function useTasteSync() {
  const { customer, syncPreferences } = useCustomer()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useCallback(
    (_profile: TasteProfile) => {
      if (!customer?.isRegistered) return
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        syncPreferences().catch(() => undefined)
      }, 1200)
    },
    [customer?.isRegistered, syncPreferences],
  )
}
