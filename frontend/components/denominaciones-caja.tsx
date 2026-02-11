// components/denominaciones-caja.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Banknote, Coins, Calculator } from "lucide-react"

interface Denominacion {
  denominacion: number
  cantidad: number
  subtotal: number
}

const DENOMINACIONES = [
  { valor: 100, nombre: "Billetes de $100", tipo: "billete" },
  { valor: 50, nombre: "Billetes de $50", tipo: "billete" },
  { valor: 20, nombre: "Billetes de $20", tipo: "billete" },
  { valor: 10, nombre: "Billetes de $10", tipo: "billete" },
  { valor: 5, nombre: "Billetes de $5", tipo: "billete" },
  { valor: 1, nombre: "Billetes/Monedas de $1", tipo: "billete" },
  { valor: 0.50, nombre: "Monedas de 50¢", tipo: "moneda" },
  { valor: 0.25, nombre: "Monedas de 25¢", tipo: "moneda" },
  { valor: 0.10, nombre: "Monedas de 10¢", tipo: "moneda" },
  { valor: 0.05, nombre: "Monedas de 5¢", tipo: "moneda" },
  { valor: 0.01, nombre: "Monedas de 1¢", tipo: "moneda" },
]

interface DenominacionesCajaProps {
  totalEsperado?: number
  onDenominacionesChange: (data: { items: Denominacion[]; total: number }) => void
  disabled?: boolean
  compact?: boolean  // 👈 NUEVA PROPIEDAD
}

export function DenominacionesCaja({
  totalEsperado,
  onDenominacionesChange,
  disabled = false,
  compact = false  // 👈 VALOR POR DEFECTO
}: DenominacionesCajaProps) {
  const [denominaciones, setDenominaciones] = useState<Denominacion[]>(
    DENOMINACIONES.map(d => ({
      denominacion: d.valor,
      cantidad: 0,
      subtotal: 0
    }))
  )

  const totalCalculado = denominaciones.reduce((sum, d) => sum + d.subtotal, 0)
  const diferencia = totalEsperado !== undefined ? totalCalculado - totalEsperado : 0

  useEffect(() => {
    onDenominacionesChange({
      items: denominaciones.filter(d => d.cantidad > 0),
      total: totalCalculado
    })
  }, [denominaciones, totalCalculado, onDenominacionesChange])

  const handleCantidadChange = (index: number, cantidad: string) => {
    const cant = parseInt(cantidad) || 0
    setDenominaciones(prev => {
      const newDenom = [...prev]
      newDenom[index] = {
        ...newDenom[index],
        cantidad: cant,
        subtotal: cant * newDenom[index].denominacion
      }
      return newDenom
    })
  }

  const limpiar = () => {
    setDenominaciones(prev => 
      prev.map(d => ({ ...d, cantidad: 0, subtotal: 0 }))
    )
  }

  // ✅ VERSIÓN COMPACT (para cierre de caja)
  if (compact) {
    const billetes = denominaciones.slice(0, 6)
    const monedas = denominaciones.slice(6)

    return (
      <div className="space-y-3">
        {/* Total esperado y calculado */}
        <div className="flex items-center justify-between border-b pb-2">
          <span className="text-xs text-muted-foreground">Total esperado:</span>
          <span className="text-sm font-bold text-primary">${totalEsperado?.toFixed(2) || '0.00'}</span>
        </div>
        
        {/* Billetes - compacto */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Banknote className="h-3 w-3 text-green-600" />
            <span className="text-xs font-medium">Billetes</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {billetes.map((item, idx) => (
              <div key={item.denominacion} className="flex items-center gap-0.5">
                <span className="text-[10px] w-10">${item.denominacion.toFixed(2)}</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={item.cantidad || ""}
                  onChange={(e) => handleCantidadChange(idx, e.target.value)}
                  className="h-7 w-14 text-xs px-1"
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Monedas - compacto */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Coins className="h-3 w-3 text-amber-600" />
            <span className="text-xs font-medium">Monedas</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {monedas.map((item, idx) => (
              <div key={item.denominacion} className="flex items-center gap-0.5">
                <span className="text-[10px] w-10">${item.denominacion.toFixed(2)}</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={item.cantidad || ""}
                  onChange={(e) => handleCantidadChange(idx + 6, e.target.value)}
                  className="h-7 w-14 text-xs px-1"
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Totales compactos */}
        <div className="border-t pt-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total contado:</span>
            <span className="font-bold">${totalCalculado.toFixed(2)}</span>
          </div>
          {totalEsperado !== undefined && (
            <div className={`flex justify-between text-xs ${diferencia === 0 ? 'text-green-600' : diferencia > 0 ? 'text-amber-600' : 'text-destructive'}`}>
              <span className="text-muted-foreground">Diferencia:</span>
              <span className="font-bold">
                {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
              </span>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={limpiar}
            disabled={disabled}
            className="h-7 text-xs w-full mt-1"
          >
            Limpiar
          </Button>
        </div>
      </div>
    )
  }

  // ✅ VERSIÓN NORMAL (para apertura de caja)
  const billetes = denominaciones.slice(0, 6)
  const monedas = denominaciones.slice(6)

  return (
    <Card className="border shadow-sm">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Desglose de efectivo</h3>
          </div>
          {totalEsperado !== undefined && (
            <div className="text-sm">
              <span className="text-muted-foreground">Esperado: </span>
              <span className="font-bold">${totalEsperado.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Billetes */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Billetes</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {billetes.map((item, idx) => (
              <div key={item.denominacion} className="space-y-1">
                <Label className="text-xs">
                  ${item.denominacion.toFixed(2)}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={item.cantidad || ""}
                  onChange={(e) => handleCantidadChange(idx, e.target.value)}
                  className="h-9 text-sm"
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Monedas */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Coins className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">Monedas</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {monedas.map((item, idx) => (
              <div key={item.denominacion} className="space-y-1">
                <Label className="text-xs">
                  ${item.denominacion.toFixed(2)}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={item.cantidad || ""}
                  onChange={(e) => handleCantidadChange(idx + 6, e.target.value)}
                  className="h-9 text-sm"
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Totales */}
        <div className="border-t pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total contado:</span>
            <span className="font-bold">${totalCalculado.toFixed(2)}</span>
          </div>
          {totalEsperado !== undefined && (
            <div className={`flex justify-between text-sm ${diferencia === 0 ? 'text-green-600' : diferencia > 0 ? 'text-amber-600' : 'text-destructive'}`}>
              <span className="text-muted-foreground">Diferencia:</span>
              <span className="font-bold">
                {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={limpiar}
              disabled={disabled}
              className="text-xs"
            >
              Limpiar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}