// src/app/page.tsx
"use client"

import { useAuth, AuthProvider } from "@/lib/auth-context"
import { useCaja, CajaProvider } from "@/lib/caja-context"
import { LoginForm } from "@/components/login-form"
import { AperturaCaja } from "@/components/apertura-caja"
import { Dashboard } from "@/components/dashboard"
import { Loader2 } from "lucide-react"

function AppContent() {
  const { isAuthenticated } = useAuth()
  const { cajaAbierta, loading } = useCaja()

  if (!isAuthenticated) {
    return <LoginForm />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando estado de caja...</p>
        </div>
      </div>
    )
  }

  if (!cajaAbierta) {
    return <AperturaCaja />
  }

  return <Dashboard />
}

export default function Home() {
  return (
    <AuthProvider>
      <CajaProvider>
        <AppContent />
      </CajaProvider>
    </AuthProvider>
  )
}