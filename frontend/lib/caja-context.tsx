"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
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

// ✅ Estado vacío como constante — mismo objeto en cada reset, sin crear nuevos objetos
const ESTADO_CERRADO: EstadoCaja = {
    caja_abierta: false,
    caja_actual: null,
    total_dia_parqueo: 0,
    total_dia_servicios: 0,
    total_dia_total: 0,
    monto_esperado: 0,
}

const CajaContext = createContext<CajaContextType | undefined>(undefined)

export function CajaProvider({ children }: { children: ReactNode }) {
    const { operador } = useAuth()
    const [cajaAbierta, setCajaAbierta] = useState(false)
    const [estadoCaja, setEstadoCaja] = useState<EstadoCaja | null>(null)
    const [loading, setLoading] = useState(true)

    const refrescarEstado = useCallback(async () => {
        try {
            const estado = await obtenerEstadoCaja()

            if (estado.caja_abierta) {
                // ✅ Caja abierta: un solo setState con el estado real
                setCajaAbierta(true)
                setEstadoCaja(estado)
            } else {
                // ✅ Caja cerrada: un solo setState con estado vacío limpio
                // Esto garantiza que AperturaCaja vea el form sin datos anteriores
                setCajaAbierta(false)
                setEstadoCaja(ESTADO_CERRADO)
            }
        } catch (error) {
            console.error("Error al obtener estado de caja:", error)
            setCajaAbierta(false)
            setEstadoCaja(null)
            toast.error("Error al verificar estado de caja", {
                description: "No se pudo conectar con el servidor",
            })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refrescarEstado()
    }, [refrescarEstado])

    const abrirCaja = async (montoInicial: number) => {
        if (!operador) {
            toast.error("No hay operador autenticado", {
                description: "Inicia sesión nuevamente",
            })
            return
        }

        try {
            await abrirCajaAPI(montoInicial, operador)
            // ✅ Refrescar DESPUÉS de que el backend confirme la apertura
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