import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import SessionExpiredDialog from '@/components/SessionExpiredDialog'
import { ensureAutoRefresh } from '@/lib/api'
import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import UsersPage from '@/pages/UsersPage'
import RolesPage from '@/pages/RolesPage'
import PermissionsPage from '@/pages/PermissionsPage'
import AuditPage from '@/pages/AuditPage'
import ProductsPage from '@/pages/ProductsPage'
import CrossPage from '@/pages/CrossPage'
import TenantsPage from '@/pages/TenantsPage'
import MyProfilePage from '@/pages/MyProfilePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  useEffect(() => {
    ensureAutoRefresh()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar" element={<ForgotPasswordPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/permisos" element={<PermissionsPage />} />
            <Route path="/auditoria" element={<AuditPage />} />
            <Route path="/productos" element={<ProductsPage />} />
            <Route path="/cross" element={<CrossPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/mi-perfil" element={<MyProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
        <SessionExpiredDialog />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
