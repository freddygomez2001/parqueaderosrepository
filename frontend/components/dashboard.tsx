"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCaja } from "@/lib/caja-context"
import { ParkingGrid } from "@/components/parking-grid"
import { VehicleExit } from "@/components/vehicle-exit"
import { HistoryTable } from "@/components/history-table"
import { DailyReport } from "@/components/daily-report"
import { ConfigPanel } from "@/components/config-panel"
import { ServicesPanel } from "@/components/services-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LogOut,
  LayoutDashboard,
  History,
  BarChart3,
  Settings,
  Store,
  Wallet,
  TrendingUp,
  ShoppingCart,
  Car,
  RefreshCw,
  Vault,
  Plus,
  Printer,
  CreditCard,
  Banknote,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import {
  obtenerMovimientosCaja,
  agregarEfectivoCaja,
  cerrarCaja,
} from "@/servicios/cajaService"
import { toast } from "sonner"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MovimientoCaja {
  id: string
  tipo: "parqueo" | "servicio" | "efectivo_manual"
  descripcion: string
  monto: number
  metodo_pago?: string
  fecha: string
}

interface MovimientosResponse {
  movimientos: MovimientoCaja[]
  total_efectivo: number
  total_tarjeta: number
  total_movimientos: number
}

interface CierreResumen {
  montoInicial: number
  totalParqueo: number
  totalServicios: number
  totalIngresos: number
  montoEsperado: number
  montoFisico: number
  diferencia: number
  operador: string
  fechaCierre: string
  movimientos: MovimientoCaja[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HOTEL_INFO = {
  nombre: "Hotel La Farola",
  direccion: "Av. Gil Ramirez Davalos y Av Heroes de Verdeloma",
  telefono: "+593 99 808 5600",
  ruc: "1234567890001",
}

function tipoBadge(tipo: string, metodoPago?: string) {
  if (tipo === "parqueo") {
    return (
      <Badge variant="default" className="text-xs bg-blue-600 hover:bg-blue-600">
        <Car className="h-3 w-3 mr-1" />Parqueo
      </Badge>
    )
  }
  if (tipo === "efectivo_manual") {
    return (
      <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-500">
        <Plus className="h-3 w-3 mr-1" />Manual
      </Badge>
    )
  }
  if (metodoPago === "tarjeta") {
    return (
      <Badge variant="secondary" className="text-xs">
        <CreditCard className="h-3 w-3 mr-1" />Tarjeta
      </Badge>
    )
  }
  return (
    <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600">
      <Banknote className="h-3 w-3 mr-1" />Servicio
    </Badge>
  )
}

// ─── Dialog: Agregar efectivo ─────────────────────────────────────────────────

function AgregarEfectivoDialog({
  operador,
  onAgregado,
}: {
  operador: string
  onAgregado: () => void
}) {
  const [open, setOpen] = useState(false)
  const [monto, setMonto] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [guardando, setGuardando] = useState(false)

  const handleSubmit = async () => {
    const valor = parseFloat(monto)
    if (!valor || valor <= 0) return
    setGuardando(true)
    const toastId = toast.loading("Registrando efectivo...")
    try {
      await agregarEfectivoCaja(valor, descripcion || "Efectivo agregado", operador)
      toast.success("Efectivo registrado", {
        id: toastId,
        description: `+$${valor.toFixed(2)} agregado a la caja`,
        icon: <CheckCircle className="h-4 w-4" />,
      })
      setMonto(""); setDescripcion("")
      setOpen(false)
      onAgregado()
    } catch (error) {
      toast.error("Error al agregar efectivo", {
        id: toastId,
        description: error instanceof Error ? error.message : "Error desconocido",
        icon: <XCircle className="h-4 w-4" />,
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 bg-transparent border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Agregar efectivo
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <Plus className="h-4 w-4 text-amber-600" />
              </div>
              <DialogTitle>Agregar efectivo a caja</DialogTitle>
            </div>
            <DialogDescription>
              Para registrar monedas de cambio, depósitos u otro efectivo que entra a la caja sin ser una venta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Monto ($)</Label>
              <Input
                type="number" step="0.01" min="0.01" placeholder="0.00"
                value={monto} onChange={(e) => setMonto(e.target.value)}
                className="text-xl font-mono h-12" autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Descripción (opcional)</Label>
              <Input
                placeholder="Ej: Monedas de cambio, depósito..."
                value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={guardando}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!monto || parseFloat(monto) <= 0 || guardando}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {guardando ? "Registrando..." : `Agregar $${parseFloat(monto || "0").toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Dialog: Cierre de caja ───────────────────────────────────────────────────

function CierreCajaDialog({
  estadoCaja,
  operador,
  movimientos,
  onCerrado,
}: {
  estadoCaja: any
  operador: string
  movimientos: MovimientoCaja[]
  onCerrado: (resumen: CierreResumen) => void
}) {
  const [open, setOpen] = useState(false)
  const [montoFisico, setMontoFisico] = useState("")
  const [cerrando, setCerrando] = useState(false)

  const montoEsperado = estadoCaja?.monto_esperado ?? 0
  const montoFisicoNum = parseFloat(montoFisico) || 0
  const diferencia = montoFisicoNum - montoEsperado

  const handleCerrar = async () => {
    if (!montoFisico) return
    setCerrando(true)
    const toastId = toast.loading("Cerrando caja...")
    try {
      await cerrarCaja(montoFisicoNum, operador)

      // ✅ Capturar resumen ANTES de cerrar el dialog
      const resumen: CierreResumen = {
        montoInicial: estadoCaja?.caja_actual?.monto_inicial ?? 0,
        totalParqueo: estadoCaja?.total_dia_parqueo ?? 0,
        totalServicios: estadoCaja?.total_dia_servicios ?? 0,
        totalIngresos: estadoCaja?.total_dia_total ?? 0,
        montoEsperado,
        montoFisico: montoFisicoNum,
        diferencia,
        operador,
        fechaCierre: new Date().toISOString(),
        movimientos: [...movimientos],
      }

      toast.success("Caja cerrada exitosamente", {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />,
      })

      setMontoFisico("")
      setOpen(false)
      // ✅ Pasar resumen al padre inmediatamente (sin setTimeout)
      onCerrado(resumen)
    } catch (error) {
      toast.error("Error al cerrar caja", {
        id: toastId,
        description: error instanceof Error ? error.message : "Error desconocido",
        icon: <XCircle className="h-4 w-4" />,
      })
    } finally {
      setCerrando(false)
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Vault className="h-4 w-4" />
        Cerrar caja
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <Vault className="h-4 w-4 text-destructive" />
              </div>
              <DialogTitle>Cerrar caja</DialogTitle>
            </div>
            <DialogDescription>
              Ingresa el monto físico contado en caja para calcular la diferencia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Monto inicial</p>
                <p className="font-bold">${(estadoCaja?.caja_actual?.monto_inicial ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-green-500/10 p-3">
                <p className="text-xs text-muted-foreground">Total ingresos</p>
                <p className="font-bold text-green-600">${(estadoCaja?.total_dia_total ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 col-span-2 text-center">
                <p className="text-xs text-muted-foreground">Monto esperado en caja</p>
                <p className="text-xl font-bold text-primary">${montoEsperado.toFixed(2)}</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Monto físico contado ($)</Label>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={montoFisico} onChange={(e) => setMontoFisico(e.target.value)}
                className="text-xl font-mono h-12" autoFocus
              />
            </div>
            {montoFisico && (
              <div className={`rounded-lg p-3 text-center ${diferencia >= 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
                <p className="text-xs text-muted-foreground">Diferencia</p>
                <p className={`text-lg font-bold ${diferencia >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {diferencia >= 0 ? "+" : ""}${diferencia.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {diferencia === 0 ? "Cuadre perfecto ✓" : diferencia > 0 ? "Sobrante en caja" : "Faltante en caja"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={cerrando}>Cancelar</Button>
            <Button variant="destructive" onClick={handleCerrar} disabled={!montoFisico || cerrando}>
              {cerrando ? "Cerrando..." : "Confirmar cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Ticket de cierre ─────────────────────────────────────────────────────────

function TicketCierreDialog({
  resumen,
  onClose,
}: {
  resumen: CierreResumen
  onClose: () => void
}) {
  const handleImprimir = () => {
    const printWindow = window.open("", "", "width=72mm,height=800")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>Cierre de Caja</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Courier New', monospace; }
          body { width: 72mm; margin: 0; padding: 2mm; font-size: 11px; line-height: 1.3; }
          @media print { @page { size: 72mm auto; margin: 0; } body { width: 72mm !important; } }
          .center { text-align: center; } .bold { font-weight: bold; }
          .separator { border: none; border-top: 1px dashed #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .total { font-size: 14px; font-weight: bold; margin: 5px 0; }
          .diff-pos { color: #16a34a; } .diff-neg { color: #dc2626; }
          table { width: 100%; border-collapse: collapse; margin: 3px 0; font-size: 9px; }
          th, td { text-align: left; padding: 1px 0; }
          th:last-child, td:last-child { text-align: right; }
          th { border-bottom: 1px solid #000; }
        </style>
      </head><body>
        <div class="center bold" style="font-size:13px">${HOTEL_INFO.nombre}</div>
        <div class="center" style="font-size:9px">${HOTEL_INFO.direccion}</div>
        <div class="center" style="font-size:9px">Tel: ${HOTEL_INFO.telefono}</div>
        <div class="center" style="font-size:9px">RUC: ${HOTEL_INFO.ruc}</div>
        <div class="separator"></div>
        <div class="center bold">CIERRE DE CAJA</div>
        <div class="separator"></div>
        <div class="row"><span>Fecha:</span><span>${new Date(resumen.fechaCierre).toLocaleDateString("es-EC")}</span></div>
        <div class="row"><span>Hora:</span><span>${new Date(resumen.fechaCierre).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</span></div>
        <div class="row"><span>Operador:</span><span>${resumen.operador}</span></div>
        <div class="separator"></div>
        <div class="row"><span>Monto inicial:</span><span>$${resumen.montoInicial.toFixed(2)}</span></div>
        <div class="row"><span>Ingresos parqueo:</span><span>$${resumen.totalParqueo.toFixed(2)}</span></div>
        <div class="row"><span>Ingresos servicios:</span><span>$${resumen.totalServicios.toFixed(2)}</span></div>
        <div class="row bold"><span>Total ingresos:</span><span>$${resumen.totalIngresos.toFixed(2)}</span></div>
        <div class="separator"></div>
        <div class="row total"><span>Monto esperado:</span><span>$${resumen.montoEsperado.toFixed(2)}</span></div>
        <div class="row total"><span>Monto físico:</span><span>$${resumen.montoFisico.toFixed(2)}</span></div>
        <div class="row bold ${resumen.diferencia >= 0 ? "diff-pos" : "diff-neg"}">
          <span>Diferencia:</span>
          <span>${resumen.diferencia >= 0 ? "+" : ""}$${resumen.diferencia.toFixed(2)}</span>
        </div>
        <div class="separator"></div>
        <div style="font-size:9px;font-weight:bold;margin-bottom:2px">Movimientos del turno (${resumen.movimientos.length})</div>
        <table>
          <thead><tr><th>Hora</th><th>Tipo</th><th>Descripción</th><th>Monto</th></tr></thead>
          <tbody>
            ${resumen.movimientos.map((m) => `
              <tr>
                <td>${new Date(m.fecha).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</td>
                <td>${m.tipo === "parqueo" ? "Parqueo" : m.tipo === "efectivo_manual" ? "Manual" : m.metodo_pago === "tarjeta" ? "Tarjeta" : "Servicio"}</td>
                <td>${m.descripcion.substring(0, 18)}</td>
                <td>$${m.monto.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="separator"></div>
        <div class="center" style="font-size:9px;margin-top:4px">
          <div>Generado: ${new Date().toLocaleString("es-EC")}</div>
        </div>
      </body></html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
      setTimeout(() => { if (!printWindow.closed) printWindow.close() }, 1000)
    }, 500)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resumen de cierre</DialogTitle>
          <DialogDescription>La caja ha sido cerrada exitosamente.</DialogDescription>
        </DialogHeader>
        <div className="font-mono text-sm space-y-3 border rounded-lg p-4 bg-background max-h-[60vh] overflow-y-auto">
          <div className="text-center border-b-2 border-dashed pb-3">
            <p className="text-lg font-bold">{HOTEL_INFO.nombre}</p>
            <p className="text-xs text-muted-foreground">{HOTEL_INFO.direccion}</p>
            <p className="text-xs text-muted-foreground">CIERRE DE CAJA</p>
            <p className="text-xs text-muted-foreground">{new Date(resumen.fechaCierre).toLocaleString("es-EC")}</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Operador:</span><span className="font-medium">{resumen.operador}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monto inicial:</span><span>${resumen.montoInicial.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Parqueo:</span><span className="text-blue-600">+${resumen.totalParqueo.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Servicios (efectivo):</span><span className="text-green-600">+${resumen.totalServicios.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm font-semibold border-t border-dashed pt-1 mt-1"><span>Total ingresos:</span><span>${resumen.totalIngresos.toFixed(2)}</span></div>
          </div>
          <div className="border-t-2 border-dashed pt-2 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monto esperado:</span><span className="font-bold">${resumen.montoEsperado.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monto físico:</span><span className="font-bold">${resumen.montoFisico.toFixed(2)}</span></div>
            <div className={`flex justify-between text-base font-bold ${resumen.diferencia >= 0 ? "text-green-600" : "text-destructive"}`}>
              <span>Diferencia:</span>
              <span>{resumen.diferencia >= 0 ? "+" : ""}${resumen.diferencia.toFixed(2)}</span>
            </div>
          </div>
          {resumen.movimientos.length > 0 && (
            <div className="border-t border-dashed pt-2">
              <p className="text-xs font-bold text-muted-foreground mb-1">Movimientos ({resumen.movimientos.length})</p>
              <div className="space-y-1">
                {resumen.movimientos.map((m) => (
                  <div key={m.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      {new Date(m.fecha).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                      {" — "}{m.descripcion}
                    </span>
                    <span className="font-medium shrink-0 ml-2">${m.monto.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="bg-transparent" onClick={onClose}>Cerrar</Button>
          <Button onClick={handleImprimir} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog principal de caja ─────────────────────────────────────────────────

function CajaDialog({
  open,
  onOpenChange,
  estadoCaja,
  operador,
  onRefresh,
  onCajaCerrada,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  estadoCaja: any
  operador: string
  onRefresh: () => void
  // ✅ recibe el resumen y cierra el dialog automáticamente
  onCajaCerrada: (resumen: CierreResumen) => void
}) {
  const [movimientosData, setMovimientosData] = useState<MovimientosResponse | null>(null)
  const [cargando, setCargando] = useState(false)

  const cargarMovimientos = async () => {
    setCargando(true)
    try {
      const data = await obtenerMovimientosCaja()
      setMovimientosData(data)
    } catch {
      toast.error("Error al cargar movimientos")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (open) cargarMovimientos()
  }, [open])

  const movimientos = movimientosData?.movimientos ?? []

  const handleCerrado = (resumen: CierreResumen) => {
    // ✅ Cerrar dialog de caja primero
    onOpenChange(false)
    // ✅ Refrescar contexto (limpiará estado)
    onRefresh()
    // ✅ Montar el ticket en el siguiente frame — garantiza que
    //    CajaDialog ya esté desmontado cuando aparezca el ticket
    requestAnimationFrame(() => {
      onCajaCerrada(resumen)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Vault className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle>Estado de Caja</DialogTitle>
                <DialogDescription className="text-xs">
                  Turno de {operador} — {new Date().toLocaleDateString("es-EC")}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => { cargarMovimientos(); onRefresh() }}
              disabled={cargando}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Monto inicial</p>
            <p className="text-lg font-bold">${(estadoCaja?.caja_actual?.monto_inicial ?? 0).toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-3 text-center">
            <p className="text-xs text-muted-foreground">Parqueo</p>
            <p className="text-lg font-bold text-blue-600">${(estadoCaja?.total_dia_parqueo ?? 0).toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-green-500/10 p-3 text-center">
            <p className="text-xs text-muted-foreground">Servicios</p>
            <p className="text-lg font-bold text-green-600">${(estadoCaja?.total_dia_servicios ?? 0).toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-3 text-center">
            <p className="text-xs text-amber-700">Monto esperado</p>
            <p className="text-lg font-bold text-amber-600">${(estadoCaja?.monto_esperado ?? 0).toFixed(2)}</p>
          </div>
        </div>

        {movimientosData && (
          <div className="flex gap-2 shrink-0">
            <div className="flex-1 rounded-lg border bg-card p-2 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Efectivo (entra a caja)</p>
                <p className="text-sm font-bold text-green-600">${movimientosData.total_efectivo.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex-1 rounded-lg border bg-card p-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Tarjeta (no entra a caja)</p>
                <p className="text-sm font-bold text-muted-foreground">${movimientosData.total_tarjeta.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 rounded-lg border">
          {cargando ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando movimientos...</span>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No hay movimientos registrados hoy</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Hora</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Descripción</TableHead>
                  <TableHead className="text-xs text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-xs font-mono py-2">
                      {new Date(mov.fecha).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="py-2">{tipoBadge(mov.tipo, mov.metodo_pago)}</TableCell>
                    <TableCell className="text-xs py-2 max-w-[200px] truncate">{mov.descripcion}</TableCell>
                    <TableCell className="text-xs py-2 text-right font-medium text-green-600">
                      +${mov.monto.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 shrink-0">
          <AgregarEfectivoDialog
            operador={operador}
            onAgregado={() => { cargarMovimientos(); onRefresh() }}
          />
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>Cerrar</Button>
            <CierreCajaDialog
              estadoCaja={estadoCaja}
              operador={operador}
              movimientos={movimientos}
              onCerrado={handleCerrado}
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

export function Dashboard() {
  const { operador, logout } = useAuth()
  const { estadoCaja, refrescarEstado } = useCaja()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [cajaDialogOpen, setCajaDialogOpen] = useState(false)
  const [refrescando, setRefrescando] = useState(false)
  // ✅ Ticket vive en el root del Dashboard — nunca se desmonta por otro dialog
  const [cierreResumen, setCierreResumen] = useState<CierreResumen | null>(null)

  const handleRefrescar = async () => {
    setRefrescando(true)
    try {
      await refrescarEstado()
    } finally {
      setRefrescando(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="sticky top-0 z-50 w-full border-b bg-[#2c3e5a] shadow-lg">
        <div className="mx-auto max-w-7xl px-6 flex h-16 items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold leading-tight text-white">Sistema de Parqueadero</h1>
            <p className="text-sm text-slate-300">Hotel La Farola</p>
          </div>
          <div className="flex items-center gap-4">
            {estadoCaja && (
              <div className="hidden sm:flex items-center gap-1">
                <div
                  onClick={() => setCajaDialogOpen(true)}
                  className="flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-300">Caja</span>
                    <span className="text-sm font-bold text-green-400">
                      ${estadoCaja.monto_esperado.toFixed(2)}
                    </span>
                  </div>
                  <Wallet className="h-5 w-5 text-green-400" />
                </div>
                <button
                  onClick={handleRefrescar}
                  className="p-1.5 rounded hover:bg-white/10 transition-colors"
                  title="Refrescar totales"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-slate-300 ${refrescando ? "animate-spin" : ""}`} />
                </button>
              </div>
            )}
            <span className="text-sm text-slate-300">
              Operador: <span className="font-medium text-white">{operador}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={logout} className="text-white hover:bg-white/10 hover:text-white">
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full flex justify-center py-6">
        <div className="w-full max-w-7xl px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid bg-card shadow-sm border border-border">
              <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-[#2c3e5a] data-[state=active]:text-white">
                <LayoutDashboard className="h-4 w-4" /><span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="servicios" className="gap-2 data-[state=active]:bg-[#2c3e5a] data-[state=active]:text-white">
                <Store className="h-4 w-4" /><span className="hidden sm:inline">Servicios</span>
              </TabsTrigger>
              <TabsTrigger value="historial" className="gap-2 data-[state=active]:bg-[#2c3e5a] data-[state=active]:text-white">
                <History className="h-4 w-4" /><span className="hidden sm:inline">Historial</span>
              </TabsTrigger>
              <TabsTrigger value="reportes" className="gap-2 data-[state=active]:bg-[#2c3e5a] data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Reportes</span>
              </TabsTrigger>
              <TabsTrigger value="configuracion" className="gap-2 data-[state=active]:bg-[#2c3e5a] data-[state=active]:text-white">
                <Settings className="h-4 w-4" /><span className="hidden sm:inline">Config</span>
              </TabsTrigger>
            </TabsList>

            {activeTab === "dashboard" && estadoCaja && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Wallet className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Monto Inicial</p>
                        <p className="text-2xl font-bold text-foreground">
                          ${estadoCaja.caja_actual?.monto_inicial.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                        <Car className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Parqueo</p>
                        <p className="text-2xl font-bold text-green-600">
                          ${estadoCaja.total_dia_parqueo.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                        <ShoppingCart className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Servicios</p>
                        <p className="text-2xl font-bold text-purple-600">
                          ${estadoCaja.total_dia_servicios.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className="border-amber-200 bg-amber-50/50 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setCajaDialogOpen(true)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                        <TrendingUp className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-amber-700">Monto Esperado</p>
                        <p className="text-2xl font-bold text-amber-600">
                          ${estadoCaja.monto_esperado.toFixed(2)}
                        </p>
                        <p className="text-xs text-amber-600/70 mt-0.5">Clic para ver detalle →</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <ParkingGrid />
                <VehicleExit />
              </div>
            </TabsContent>
            <TabsContent value="servicios"><ServicesPanel /></TabsContent>
            <TabsContent value="historial"><HistoryTable /></TabsContent>
            <TabsContent value="reportes"><DailyReport /></TabsContent>
            <TabsContent value="configuracion"><ConfigPanel /></TabsContent>
          </Tabs>
        </div>
      </main>

      <CajaDialog
        open={cajaDialogOpen}
        onOpenChange={setCajaDialogOpen}
        estadoCaja={estadoCaja}
        operador={operador ?? ""}
        onRefresh={handleRefrescar}
        onCajaCerrada={setCierreResumen}
      />

      {/* ✅ Ticket montado en el root — aparece siempre después del cierre */}
      {cierreResumen && (
        <TicketCierreDialog
          resumen={cierreResumen}
          onClose={() => {
            setCierreResumen(null)
          }}
        />
      )}
    </div>
  )
}