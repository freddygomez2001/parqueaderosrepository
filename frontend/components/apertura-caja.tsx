// src/components/apertura-caja.tsx
"use client"

import type React from "react"
import { useState } from "react"
import { useCaja } from "@/lib/caja-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Vault, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function AperturaCaja() {
  const [monto, setMonto] = useState("")
  const [error, setError] = useState("")
  const [abriendo, setAbriendo] = useState(false)
  const { abrirCaja } = useCaja()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = parseFloat(monto)

    if (isNaN(valor) || valor < 0) {
      setError("Ingrese un monto válido (puede ser 0)")
      return
    }

    setAbriendo(true)
    const toastId = toast.loading("Abriendo caja...")

    try {
      await abrirCaja(valor)
      toast.success("Caja abierta exitosamente", {
        id: toastId,
        description: `Monto inicial: $${valor.toFixed(2)}`,
      })
    } catch (err) {
      toast.error("Error al abrir caja", {
        id: toastId,
        description: err instanceof Error ? err.message : "Error desconocido",
      })
      setAbriendo(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a2332 0%, #2d4159 50%, #1a2332 100%)",
      }}
    >
      {/* Fondo decorativo */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-400 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md shadow-2xl relative z-10 border-amber-200/20 bg-white/95 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20">
            <Vault className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Apertura de Caja
          </CardTitle>
          <CardDescription>
            Ingrese el monto con el que inicia la caja del día. Esto registrará el efectivo disponible al inicio del
            turno.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="monto-apertura">Monto inicial en caja ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="monto-apertura"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => {
                    setMonto(e.target.value)
                    setError("")
                  }}
                  className="pl-10 text-2xl h-14 font-mono"
                  autoFocus
                  disabled={abriendo}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Al abrir la caja se registrará:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>El monto inicial de efectivo</li>
                <li>Hora de apertura del turno</li>
                <li>Todos los ingresos por parqueo y servicios</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
              disabled={abriendo}
            >
              {abriendo ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Abriendo...
                </>
              ) : (
                <>
                  <Vault className="h-5 w-5" />
                  Abrir Caja
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}