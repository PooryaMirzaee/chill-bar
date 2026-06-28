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

if (import.meta.env.PROD) {
  registerSW({ immediate: true })
} else if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => void reg.unregister())
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <CustomerProvider>
          <App />
        </CustomerProvider>
      </ErrorBoundary>
      <Toaster position="bottom-center" dir="rtl" richColors closeButton />
    </QueryClientProvider>
  </StrictMode>,
)
