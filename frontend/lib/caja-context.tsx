// src/lib/caja-context.tsx
"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { obtenerEstadoCaja, abrirCaja as abrirCajaAPI } from "@/servicios/cajaService"
import { useAuth } from "./auth-context"
import { toast } from "sonner"

interface EstadoCaja {
    caja_abierta: boolean
    caja_actual: CajaActual | null
    total_dia_parqueo: number
    total_dia_servicios: number
    total_dia_total: number
    monto_esperado: number
}

interface CajaActual {
    id: number
    monto_inicial: number
    fecha_apertura: string
    operador_apertura: string
    estado: string
    notas_apertura?: string
}

interface CajaContextType {
    cajaAbierta: boolean
    estadoCaja: EstadoCaja | null
    loading: boolean
    abrirCaja: (montoInicial: number) => Promise<void>
    refrescarEstado: () => Promise<void>
}

const CajaContext = createContext<CajaContextType | undefined>(undefined)

export function CajaProvider({ children }: { children: ReactNode }) {
    const { operador } = useAuth()
    const [cajaAbierta, setCajaAbierta] = useState(false)
    const [estadoCaja, setEstadoCaja] = useState<EstadoCaja | null>(null)
    const [loading, setLoading] = useState(true)

    const refrescarEstado = async () => {
        try {
            const estado = await obtenerEstadoCaja()
            setEstadoCaja(estado)
            setCajaAbierta(estado.caja_abierta)
        } catch (error) {
            console.error("Error al obtener estado de caja:", error)
            setCajaAbierta(false)
            toast.error("Error al verificar estado de caja", {
                description: "No se pudo conectar con el servidor",
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refrescarEstado()
    }, [])

    const abrirCaja = async (montoInicial: number) => {
        if (!operador) {
            toast.error("No hay operador autenticado", {
                description: "Inicia sesión nuevamente",
            })
            return
        }

        try {
            await abrirCajaAPI(montoInicial, operador)
            await refrescarEstado()
        } catch (error) {
            throw error
        }
    }


    return (
        <CajaContext.Provider
            value={{
                cajaAbierta,
                estadoCaja,
                loading,
                abrirCaja,
                refrescarEstado,
            }}
        >
            {children}
        </CajaContext.Provider>
    )
}

export function useCaja() {
    const context = useContext(CajaContext)
    if (context === undefined) {
        throw new Error("useCaja must be used within a CajaProvider")
    }
    return context
}