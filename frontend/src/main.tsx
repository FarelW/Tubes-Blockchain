import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ErrorBoundary from './components/ErrorBoundary'
import { RoleProvider } from './contexts/RoleContext'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ToastContainer from './components/ToastContainer'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

const rootElement = document.getElementById('root') || document.getElementById('app')

if (!rootElement) {
  throw new Error('Root element not found. Please check index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RoleProvider>
            <AuthProvider>
              <BrowserRouter>
                <App />
                <ToastContainer />
              </BrowserRouter>
            </AuthProvider>
          </RoleProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)

