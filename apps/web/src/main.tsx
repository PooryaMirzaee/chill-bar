import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './styles/legacy-features.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CustomerProvider } from './lib/customerAuth'
import { enforceFreshDeploy } from './lib/deployFreshness'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000 },
  },
})

async function boot() {
  if (import.meta.env.PROD) {
    const buildId = import.meta.env.VITE_BUILD_SHA ?? 'unknown'
    const reloaded = await enforceFreshDeploy(buildId)
    if (reloaded) return

    // autoUpdate: apply new SW quietly. Do NOT force reload on every activation —
    // that caused infinite refresh loops when sw.js was no-cache.
    registerSW({ immediate: true })
  } else if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => void reg.unregister())
    })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <CustomerProvider>
            <App />
          </CustomerProvider>
        </ErrorBoundary>
        <Toaster
          position="top-center"
          dir="rtl"
          richColors
          closeButton
          expand
          visibleToasts={2}
          toastOptions={{
            classNames: {
              toast: 'cart-add-toast',
              actionButton: 'cart-add-toast-action',
            },
          }}
        />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void boot()
