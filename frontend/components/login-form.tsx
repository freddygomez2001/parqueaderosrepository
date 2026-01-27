"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleStart = async () => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    login() // ✅ solo esto
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a2332 0%, #2d4159 50%, #1a2332 100%)",
      }}
    >
      {/* Fondo decorativo */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-400 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-amber-200/20 bg-white/95 backdrop-blur">
        <CardHeader className="text-center space-y-4 pb-6">
          {/* Logo */}
          <div className="mx-auto mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full blur-xl opacity-30"></div>
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-full p-6 shadow-xl">
                <svg viewBox="0 0 24 24" className="h-10 w-10 text-amber-400" fill="currentColor">
                  <path d="M12 2L3 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-400/50"></div>
              <CardTitle className="text-3xl font-serif bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                La Farola
              </CardTitle>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-400/50"></div>
            </div>
            <p className="text-xs uppercase tracking-widest text-amber-600 font-semibold">
              Hotel
            </p>
            <CardDescription className="text-slate-600">
              Sistema de Gestión de Parqueadero
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <Button
            onClick={handleStart}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 text-lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Iniciando...
              </span>
            ) : (
              "Comenzar"
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"></div>
    </div>
  )
}
