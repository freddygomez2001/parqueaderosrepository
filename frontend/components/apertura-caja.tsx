// components/apertura-caja.tsx (actualizado)
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useCaja } from "@/lib/caja-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, Vault, Loader2, Calculator } from "lucide-react"
import { DenominacionesCaja } from "@/components/denominaciones-caja"
import { toast } from "sonner"

export function AperturaCaja() {
  const [monto, setMonto] = useState("")
  const [error, setError] = useState("")
  const [abriendo, setAbriendo] = useState(false)
  const [modoIngreso, setModoIngreso] = useState<"directo" | "denominaciones">("directo")
  const [denominacionesData, setDenominacionesData] = useState<any>(null)
  const { abrirCaja, estadoCaja } = useCaja()

  useEffect(() => {
    if (estadoCaja && estadoCaja.caja_abierta) {
      setMonto("")
    }
  }, [estadoCaja])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let valor: number
    let denominaciones = null

    if (modoIngreso === "directo") {
      valor = parseFloat(monto)
      if (isNaN(valor) || valor < 0) {
        setError("Ingrese un monto válido (puede ser 0)")
        return
      }
    } else {
      if (!denominacionesData || denominacionesData.total <= 0) {
        setError("Debe ingresar al menos una denominación")
        return
      }
      valor = denominacionesData.total
      denominaciones = denominacionesData
    }

    setAbriendo(true)
    const toastId = toast.loading("Abriendo caja...")

    try {
      await abrirCaja(valor, denominaciones)
      toast.success("Caja abierta exitosamente", {
        id: toastId,
        description: `Monto inicial: $${valor.toFixed(2)}`,
      })
      setMonto("")
    } catch (err) {
      toast.error("Error al abrir caja", {
        id: toastId,
        description: err instanceof Error ? err.message : "Error desconocido",
      })
    } finally {
      setAbriendo(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a2332 0%, #2d4159 50%, #1a2332 100%)",
      }}
    >
      <Card className="w-full max-w-2xl shadow-2xl relative z-10 border-amber-200/20 bg-card/95 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <Vault className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            Apertura de Caja
          </CardTitle>
          <CardDescription>
            Ingrese el monto con el que inicia la caja del día
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <Tabs 
            value={modoIngreso} 
            onValueChange={(v) => setModoIngreso(v as "directo" | "denominaciones")}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="directo" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Ingreso Directo
              </TabsTrigger>
              <TabsTrigger value="denominaciones" className="gap-2">
                <Calculator className="h-4 w-4" />
                Por Denominaciones
              </TabsTrigger>
            </TabsList>

            <TabsContent value="directo" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="monto-apertura">
                    Monto inicial en caja ($)
                  </Label>
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
              </form>
            </TabsContent>

            <TabsContent value="denominaciones" className="mt-4">
              <DenominacionesCaja
                onDenominacionesChange={setDenominacionesData}
                disabled={abriendo}
              />
            </TabsContent>
          </Tabs>

          <form onSubmit={handleSubmit}>
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground mb-6">
              <p className="font-medium text-foreground mb-2">
                Al abrir la caja se registrará:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>El monto inicial de efectivo</li>
                <li>Hora de apertura del turno</li>
                <li>Detalle de billetes y monedas (si se ingresó por denominaciones)</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
              disabled={
                abriendo || 
                (modoIngreso === "directo" ? !monto : !denominacionesData?.total)
              }
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