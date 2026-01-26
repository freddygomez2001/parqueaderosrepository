"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface AuthContextType {
  isAuthenticated: boolean
  operador: string | null
  login: (usuario: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Credenciales de ejemplo - en producción esto vendría del backend
const CREDENCIALES = {
  usuario: "operador",
  password: "hotel2024",
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [operador, setOperador] = useState<string | null>(null)

  useEffect(() => {
    // Verificar si hay sesión guardada
    const session = sessionStorage.getItem("parking_session")
    if (session) {
      const { usuario } = JSON.parse(session)
      setIsAuthenticated(true)
      setOperador(usuario)
    }
  }, [])

  const login = (usuario: string, password: string): boolean => {
    if (usuario === CREDENCIALES.usuario && password === CREDENCIALES.password) {
      setIsAuthenticated(true)
      setOperador(usuario)
      sessionStorage.setItem("parking_session", JSON.stringify({ usuario }))
      return true
    }
    return false
  }

  const logout = () => {
    setIsAuthenticated(false)
    setOperador(null)
    sessionStorage.removeItem("parking_session")
  }

  return <AuthContext.Provider value={{ isAuthenticated, operador, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}
