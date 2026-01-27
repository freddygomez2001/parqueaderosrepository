"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface AuthContextType {
  isAuthenticated: boolean
  operador: string | null
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [operador, setOperador] = useState<string | null>(null)

  const login = () => {
    setIsAuthenticated(true)
    setOperador("Operador")
  }

  const logout = () => {
    setIsAuthenticated(false)
    setOperador(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, operador, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}
