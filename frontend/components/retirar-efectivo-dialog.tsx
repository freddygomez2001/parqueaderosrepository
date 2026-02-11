// components/retirar-efectivo-dialog.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Minus, DollarSign, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { registrarEgresoCaja } from "@/servicios/cajaService"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface RetirarEfectivoDialogProps {
  operador: string
  onEgresoRegistrado: () => void
  saldoDisponible?: number
}

export function RetirarEfectivoDialog({
  operador,
  onEgresoRegistrado,
  saldoDisponible = 0
}: RetirarEfectivoDialogProps) {
  const [open, setOpen] = useState(false)
  const [monto, setMonto] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  const montoNum = parseFloat(monto) || 0
  const esValido = montoNum > 0 && montoNum <= saldoDisponible && descripcion.trim().length >= 3

  const handleSubmit = async () => {
    if (!esValido) {
      if (montoNum > saldoDisponible) {
        setError(`Saldo insuficiente. Disponible: $${saldoDisponible.toFixed(2)}`)
      } else if (descripcion.trim().length < 3) {
        setError("La descripción debe tener al menos 3 caracteres")
      }
      return
    }

    setGuardando(true)
    const toastId = toast.loading("Registrando retiro de efectivo...")

    try {
      await registrarEgresoCaja(montoNum, descripcion.trim(), operador)
      
      toast.success("Retiro registrado exitosamente", {
        id: toastId,
        description: `-$${montoNum.toFixed(2)} retirado de caja`,
        icon: <CheckCircle className="h-4 w-4" />,
      })

      setMonto("")
      setDescripcion("")
      setError("")
      setOpen(false)
      onEgresoRegistrado()
    } catch (error) {
      toast.error("Error al registrar retiro", {
        id: toastId,
        description: error instanceof Error ? error.message : "Error desconocido",
        icon: <XCircle className="h-4 w-4" />,
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-transparent border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          <Minus className="h-4 w-4" />
          Retirar efectivo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <Minus className="h-4 w-4 text-red-600" />
            </div>
            <DialogTitle>Retirar efectivo de caja</DialogTitle>
          </div>
          <DialogDescription>
            Registrar un egreso o retiro de efectivo de la caja actual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Saldo disponible */}
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Saldo disponible en caja</p>
            <p className="text-2xl font-bold text-foreground">${saldoDisponible.toFixed(2)}</p>
          </div>

          {/* Monto a retirar */}
          <div className="grid gap-2">
            <Label htmlFor="monto-retiro">Monto a retirar ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="monto-retiro"
                type="number"
                step="0.01"
                min="0.01"
                max={saldoDisponible}
                placeholder="0.00"
                value={monto}
                onChange={(e) => {
                  setMonto(e.target.value)
                  setError("")
                }}
                className="pl-10 text-xl h-12 font-mono"
                autoFocus
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="grid gap-2">
            <Label htmlFor="descripcion-retiro">Motivo del retiro</Label>
            <Input
              id="descripcion-retiro"
              placeholder="Ej: Pago a proveedor, cambio para huéspedes..."
              value={descripcion}
              onChange={(e) => {
                setDescripcion(e.target.value)
                setError("")
              }}
            />
          </div>

          {/* Mensaje de error */}
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Advertencia */}
          {montoNum > 0 && (
            <div className="rounded-lg bg-amber-500/10 p-3 text-center">
              <p className="text-xs text-amber-700 font-medium">
                Se restarán ${montoNum.toFixed(2)} del saldo de caja
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!esValido || guardando}
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {guardando ? (
              "Registrando..."
            ) : (
              <>
                <Minus className="h-4 w-4" />
                Retirar ${montoNum.toFixed(2)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}