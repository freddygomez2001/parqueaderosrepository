"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { obtenerEstadoCaja, abrirCaja as abrirCajaAPI } from "@/servicios/cajaService"
import { useAuth } from "./auth-context"
import { toast } from "sonner"

interface EstadoCaja {
    caja_abierta: boolean
    caja_actual: CajaActual | null
    
    // 💰 INGRESOS REALES - SOLO EFECTIVO (SUMAN A CAJA)
    total_dia_parqueo: number
    total_dia_servicios: number
    total_dia_manuales: number
    total_dia_total: number
    monto_esperado: number
    
    // 📊 ESTADÍSTICAS - TARJETA (NO SUMAN A CAJA)
    total_dia_parqueo_tarjeta: number
    total_dia_servicios_tarjeta: number
    
    // 📊 TOTALES GENERALES (SOLO INFORMATIVOS)
    total_dia_parqueo_total: number
    total_dia_servicios_total: number
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

// ✅ Estado vacío con TODOS los campos
const ESTADO_CERRADO: EstadoCaja = {
    caja_abierta: false,
    caja_actual: null,
    
    // 💰 Ingresos reales (cero)
    total_dia_parqueo: 0,
    total_dia_servicios: 0,
    total_dia_manuales: 0,
    total_dia_total: 0,
    monto_esperado: 0,
    
    // 📊 Estadísticas tarjeta (cero)
    total_dia_parqueo_tarjeta: 0,
    total_dia_servicios_tarjeta: 0,
    
    // 📊 Totales generales (cero)
    total_dia_parqueo_total: 0,
    total_dia_servicios_total: 0,
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
            console.log("📊 Estado de caja recibido:", estado)

            if (estado.caja_abierta) {
                setCajaAbierta(true)
                
                // ✅ Mapear los campos del backend al frontend
                const estadoMapeado: EstadoCaja = {
                    caja_abierta: estado.caja_abierta,
                    caja_actual: estado.caja_actual,
                    
                    // 💰 SOLO EFECTIVO (suma a caja)
                    total_dia_parqueo: estado.total_dia_parqueo || 0,
                    total_dia_servicios: estado.total_dia_servicios || 0,
                    total_dia_manuales: estado.total_dia_manuales || 0,
                    total_dia_total: estado.total_dia_total || 0,
                    monto_esperado: estado.monto_esperado || 0,
                    
                    // 📊 TARJETA (no suma a caja)
                    total_dia_parqueo_tarjeta: estado.total_dia_parqueo_tarjeta || 0,
                    total_dia_servicios_tarjeta: estado.total_dia_servicios_tarjeta || 0,
                    
                    // 📊 TOTALES (solo informativos)
                    total_dia_parqueo_total: (estado.total_dia_parqueo || 0) + (estado.total_dia_parqueo_tarjeta || 0),
                    total_dia_servicios_total: (estado.total_dia_servicios || 0) + (estado.total_dia_servicios_tarjeta || 0),
                }
                
                setEstadoCaja(estadoMapeado)
            } else {
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

