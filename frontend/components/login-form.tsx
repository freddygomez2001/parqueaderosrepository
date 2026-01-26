"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, User, Eye, EyeOff } from "lucide-react"

export function LoginForm() {
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async () => {
    setError("")
    setLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 500))

    const success = login(usuario, password)
    if (!success) {
      setError("Usuario o contraseña incorrectos")
    }
    setLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #1a2332 0%, #2d4159 50%, #1a2332 100%)'
    }}>
      {/* Patrón decorativo de fondo */}
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
                  <path d="M12 2L3 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 2.18l7 3.82v8c0 4.52-3.06 8.78-7 9.93-3.94-1.15-7-5.41-7-9.93V8l7-3.82z"/>
                  <circle cx="12" cy="12" r="3"/>
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
            <p className="text-xs uppercase tracking-widest text-amber-600 font-semibold">Hotel</p>
            <CardDescription className="text-slate-600">
              Sistema de Gestión de Parqueadero
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <div className="space-y-5" onKeyPress={handleKeyPress}>
            <div className="space-y-2">
              <Label htmlFor="usuario" className="text-slate-700 font-medium">
                Usuario
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                <Input
                  id="usuario"
                  type="text"
                  placeholder="Ingrese su usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="pl-10 border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">
                Contraseña
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            
            <Button 
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-11"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Ingresando...
                </span>
              ) : (
                "Ingresar al Sistema"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Decoración inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"></div>
    </div>
  )
}