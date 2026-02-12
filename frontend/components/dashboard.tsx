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
  DollarSign,
  Calculator,
  Minus,  // ✅ IMPORTAR Minus para egresos
} from "lucide-react"
import {
  obtenerMovimientosCaja,
  agregarEfectivoCaja,
  cerrarCaja,
  registrarEgresoCaja,  // ✅ NUEVO: Importar servicio de egresos
} from "@/servicios/cajaService"
import { DenominacionesCaja } from "@/components/denominaciones-caja"
import { RetirarEfectivoDialog } from "@/components/retirar-efectivo-dialog"  // ✅ NUEVO: Importar componente de egresos
import { toast } from "sonner"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MovimientoCaja {
  id: string
  tipo: "parqueo" | "servicio" | "efectivo_manual" | "egreso"  // ✅ AGREGAR 'egreso'
  descripcion: string
  monto: number
  metodo_pago?: string
  fecha: string
}

// En dashboard.tsx - Actualizar la interfaz MovimientosResponse

interface MovimientosResponse {
  movimientos: MovimientoCaja[]
  total_efectivo: number
  total_tarjeta: number
  total_egresos: number      // ✅ AGREGAR
  saldo_neto: number         // ✅ AGREGAR
  total_movimientos: number
}

interface CierreResumen {
  montoInicial: number
  totalParqueo: number
  totalServicios: number
  totalIngresos: number
  totalEgresos?: number
  saldoNeto?: number
  montoEsperado: number
  montoFisico: number
  diferencia: number
  operador: string
  fechaCierre: string
  movimientos: MovimientoCaja[]
  denominaciones?: {
    items: Array<{
      denominacion: number
      cantidad: number
      subtotal: number
    }>
    total: number
  }
  // ✅ NUEVOS CAMPOS PARA DESGLOSE
  desglose?: {
    parqueo: { efectivo: number; tarjeta: number; total: number }
    servicios: { efectivo: number; tarjeta: number; total: number }
    hotel: { efectivo: number; tarjeta: number; total: number }
    bano: { efectivo: number; tarjeta: number; total: number }
    manuales: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HOTEL_INFO = {
  nombre: "Hotel La Farola",
  direccion: "Av. Gil Ramirez Davalos y Av Heroes de Verdeloma",
  telefono: "+593 99 808 5600",
  ruc: "1234567890001",
}

function tipoBadge(tipo: string, metodoPago?: string) {
  // ✅ EGRESO / RETIRO DE EFECTIVO
  if (tipo === "egreso") {
    return (
      <Badge variant="destructive" className="text-xs">
        <Minus className="h-3 w-3 mr-1" />
        Retiro
      </Badge>
    )
  }

  // ✅ PARQUEO CON TARJETA
  if (tipo === "parqueo" && metodoPago === "tarjeta") {
    return (
      <Badge variant="secondary" className="text-xs">
        <CreditCard className="h-3 w-3 mr-1" />
        Parqueo (Tarjeta)
      </Badge>
    )
  }

  // ✅ PARQUEO CON EFECTIVO (o sin especificar)
  if (tipo === "parqueo") {
    return (
      <Badge variant="default" className="text-xs bg-blue-600 hover:bg-blue-600">
        <Car className="h-3 w-3 mr-1" />
        Parqueo
      </Badge>
    )
  }

  // ✅ EFECTIVO MANUAL
  if (tipo === "efectivo_manual") {
    return (
      <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-500">
        <Plus className="h-3 w-3 mr-1" />
        Manual
      </Badge>
    )
  }

  // ✅ SERVICIO CON TARJETA
  if (metodoPago === "tarjeta") {
    return (
      <Badge variant="secondary" className="text-xs">
        <CreditCard className="h-3 w-3 mr-1" />
        Servicio (Tarjeta)
      </Badge>
    )
  }

  // ✅ SERVICIO CON EFECTIVO (por defecto)
  return (
    <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600">
      <Banknote className="h-3 w-3 mr-1" />
      Servicio
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
  const [modoCierre, setModoCierre] = useState<"directo" | "denominaciones">("directo")
  const [montoFisico, setMontoFisico] = useState("")
  const [denominacionesData, setDenominacionesData] = useState<any>(null)
  const [cerrando, setCerrando] = useState(false)

  const montoEsperado = estadoCaja?.monto_esperado ?? 0
  const montoFisicoNum = modoCierre === "directo"
    ? (parseFloat(montoFisico) || 0)
    : (denominacionesData?.total || 0)
  const diferencia = montoFisicoNum - montoEsperado

  const handleCerrar = async () => {
    if (modoCierre === "directo" && !montoFisico) return
    if (modoCierre === "denominaciones" && !denominacionesData?.total) return

    setCerrando(true)
    const toastId = toast.loading("Cerrando caja...")

    try {
      await cerrarCaja(
        montoFisicoNum,
        operador,
        undefined,
        modoCierre === "denominaciones" ? denominacionesData : undefined
      )

      // ✅ CALCULAR DESGLOSE COMPLETO
      const desglose = {
        parqueo: { efectivo: 0, tarjeta: 0, total: 0 },
        servicios: { efectivo: 0, tarjeta: 0, total: 0 },
        hotel: { efectivo: 0, tarjeta: 0, total: 0 },
        bano: { efectivo: 0, tarjeta: 0, total: 0 },
        manuales: 0
      }

      movimientos.forEach(m => {
        if (m.tipo === "parqueo") {
          if (m.metodo_pago === "efectivo") desglose.parqueo.efectivo += m.monto
          else if (m.metodo_pago === "tarjeta") desglose.parqueo.tarjeta += m.monto
          desglose.parqueo.total += m.monto
        }
        else if (m.tipo === "servicio") {
          // Servicios puede ser de productos, hotel o baño
          if (m.descripcion.includes("Habitación") || m.descripcion.includes("hotel")) {
            if (m.metodo_pago === "efectivo") desglose.hotel.efectivo += m.monto
            else if (m.metodo_pago === "tarjeta") desglose.hotel.tarjeta += m.monto
            desglose.hotel.total += m.monto
          }
          else if (m.descripcion.includes("Baño") || m.descripcion.includes("bano")) {
            if (m.metodo_pago === "efectivo") desglose.bano.efectivo += m.monto
            else if (m.metodo_pago === "tarjeta") desglose.bano.tarjeta += m.monto
            desglose.bano.total += m.monto
          }
          else {
            if (m.metodo_pago === "efectivo") desglose.servicios.efectivo += m.monto
            else if (m.metodo_pago === "tarjeta") desglose.servicios.tarjeta += m.monto
            desglose.servicios.total += m.monto
          }
        }
        else if (m.tipo === "efectivo_manual") {
          desglose.manuales += m.monto
        }
      })

      const resumen: CierreResumen = {
        montoInicial: estadoCaja?.caja_actual?.monto_inicial ?? 0,
        totalParqueo: estadoCaja?.total_dia_parqueo ?? 0,
        totalServicios: estadoCaja?.total_dia_servicios ?? 0,
        totalIngresos: estadoCaja?.total_dia_total ?? 0,
        totalEgresos: estadoCaja?.total_dia_egresos ?? 0,
        saldoNeto: estadoCaja?.saldo_neto ?? estadoCaja?.total_dia_total ?? 0,
        montoEsperado,
        montoFisico: montoFisicoNum,
        diferencia,
        operador,
        fechaCierre: new Date().toISOString(),
        movimientos: [...movimientos],
        denominaciones: modoCierre === "denominaciones" ? denominacionesData : undefined,
        desglose // ✅ AGREGAR DESGLOSE
      }

      toast.success("Caja cerrada exitosamente", {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />,
      })

      setMontoFisico("")
      setOpen(false)
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
                <Vault className="h-3.5 w-3.5 text-destructive" />
              </div>
              <DialogTitle className="text-base">Cerrar caja</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Ingresa el monto físico contado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Resumen de caja con egresos */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-[10px] text-muted-foreground">Monto inicial</p>
                <p className="text-sm font-bold">${(estadoCaja?.caja_actual?.monto_inicial ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-green-500/10 p-2">
                <p className="text-[10px] text-muted-foreground">Ingresos</p>
                <p className="text-sm font-bold text-green-600">${(estadoCaja?.total_dia_total ?? 0).toFixed(2)}</p>
              </div>
              {estadoCaja?.total_dia_egresos > 0 && (
                <div className="rounded-lg bg-red-500/10 p-2">
                  <p className="text-[10px] text-muted-foreground">Egresos</p>
                  <p className="text-sm font-bold text-red-600">-${estadoCaja.total_dia_egresos.toFixed(2)}</p>
                </div>
              )}
              <div className={`rounded-lg ${estadoCaja?.total_dia_egresos > 0 ? 'bg-primary/10' : 'bg-primary/10 col-span-2'} p-2 text-center`}>
                <p className="text-[10px] text-muted-foreground">Saldo neto</p>
                <p className="text-lg font-bold text-primary">
                  ${(estadoCaja?.saldo_neto ?? estadoCaja?.monto_esperado ?? 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Tabs de cierre */}
            <Tabs
              value={modoCierre}
              onValueChange={(v) => setModoCierre(v as "directo" | "denominaciones")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="directo" className="gap-1 text-xs py-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  Directo
                </TabsTrigger>
                <TabsTrigger value="denominaciones" className="gap-1 text-xs py-1">
                  <Calculator className="h-3.5 w-3.5" />
                  Denominaciones
                </TabsTrigger>
              </TabsList>

              <TabsContent value="directo" className="mt-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Monto físico contado ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={montoFisico}
                      onChange={(e) => setMontoFisico(e.target.value)}
                      className="pl-8 text-xl h-11 font-mono"
                      autoFocus
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="denominaciones" className="mt-2">
                <DenominacionesCaja
                  totalEsperado={estadoCaja?.saldo_neto ?? estadoCaja?.monto_esperado ?? 0}
                  onDenominacionesChange={setDenominacionesData}
                  disabled={cerrando}
                  compact={true}
                />
              </TabsContent>
            </Tabs>

            {/* Diferencia */}
            {montoFisicoNum > 0 && (
              <div className={`rounded-lg p-2 text-center ${diferencia >= 0 ? "bg-green-500/10" : "bg-destructive/10"
                }`}>
                <p className="text-[10px] text-muted-foreground">Diferencia</p>
                <p className={`text-base font-bold ${diferencia >= 0 ? "text-green-600" : "text-destructive"
                  }`}>
                  {diferencia >= 0 ? "+" : ""}${diferencia.toFixed(2)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {diferencia === 0
                    ? "✓ Arqueo perfecto"
                    : diferencia > 0
                      ? "Sobrante"
                      : "Faltante"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={cerrando}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCerrar}
              disabled={
                cerrando ||
                (modoCierre === "directo" ? !montoFisico : !denominacionesData?.total)
              }
            >
              {cerrando ? "Cerrando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Ticket de cierre ─────────────────────────────────────────────────────────

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

    const d = resumen.desglose || {
      parqueo: { efectivo: 0, tarjeta: 0, total: 0 },
      servicios: { efectivo: 0, tarjeta: 0, total: 0 },
      hotel: { efectivo: 0, tarjeta: 0, total: 0 },
      bano: { efectivo: 0, tarjeta: 0, total: 0 },
      manuales: 0
    }

    const denominaciones = resumen.denominaciones?.items || []
    const billetes = denominaciones.filter(d => d.denominacion >= 1)
    const monedas = denominaciones.filter(d => d.denominacion < 1)
    const totalBilletes = billetes.reduce((sum, d) => sum + d.subtotal, 0)
    const totalMonedas = monedas.reduce((sum, d) => sum + d.subtotal, 0)

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
          .denom-table { width: 100%; border-collapse: collapse; margin: 3px 0; font-size: 9px; }
          .denom-table td { padding: 1px 0; }
          .denom-table td:last-child { text-align: right; }
          .section-title { font-size: 10px; font-weight: bold; margin-top: 5px; margin-bottom: 2px; }
          .efectivo { color: #000; }
          .tarjeta { color: #6b7280; }
          .sub-row { margin-left: 8px; font-size: 9px; }
        </style>
      </head><body>
        <!-- HEADER -->
        <div class="center bold" style="font-size:13px">${HOTEL_INFO.nombre}</div>
        <div class="center" style="font-size:9px">${HOTEL_INFO.direccion}</div>
        <div class="center" style="font-size:9px">Tel: ${HOTEL_INFO.telefono}</div>
        <div class="center" style="font-size:9px">RUC: ${HOTEL_INFO.ruc}</div>
        <div class="separator"></div>
        <div class="center bold">CIERRE DE CAJA</div>
        <div class="separator"></div>
        
        <!-- INFORMACIÓN GENERAL -->
        <div class="row"><span>Fecha:</span><span>${new Date(resumen.fechaCierre).toLocaleDateString("es-EC")}</span></div>
        <div class="row"><span>Hora:</span><span>${new Date(resumen.fechaCierre).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</span></div>
        <div class="row"><span>Operador:</span><span>${resumen.operador}</span></div>
        <div class="separator"></div>
        
        <!-- ========== DESGLOSE COMPLETO ========== -->
        <div class="section-title"> DESGLOSE DE INGRESOS</div>
        
        <!-- PARQUEO -->
        <div class="row bold"><span>PARQUEO:</span><span>$${d.parqueo.total.toFixed(2)}</span></div>
        <div class="row sub-row efectivo"><span>  • Efectivo:</span><span>+$${d.parqueo.efectivo.toFixed(2)}</span></div>
        <div class="row sub-row tarjeta"><span>  • Tarjeta:</span><span>$${d.parqueo.tarjeta.toFixed(2)}</span></div>
        
        <!-- SERVICIOS (Productos) -->
        <div class="row bold"><span>SERVICIOS:</span><span>$${d.servicios.total.toFixed(2)}</span></div>
        <div class="row sub-row efectivo"><span>  • Efectivo:</span><span>+$${d.servicios.efectivo.toFixed(2)}</span></div>
        <div class="row sub-row tarjeta"><span>  • Tarjeta:</span><span>$${d.servicios.tarjeta.toFixed(2)}</span></div>
        
        <!-- HOTEL -->
        ${d.hotel.total > 0 ? `
          <div class="row bold"><span>HOTEL:</span><span>$${d.hotel.total.toFixed(2)}</span></div>
          <div class="row sub-row efectivo"><span>  • Efectivo:</span><span>+$${d.hotel.efectivo.toFixed(2)}</span></div>
          <div class="row sub-row tarjeta"><span>  • Tarjeta:</span><span>$${d.hotel.tarjeta.toFixed(2)}</span></div>
        ` : ''}
        
        <!-- BAÑO -->
        ${d.bano.total > 0 ? `
          <div class="row bold"><span>BAÑO:</span><span>$${d.bano.total.toFixed(2)}</span></div>
          <div class="row sub-row efectivo"><span>  • Efectivo:</span><span>+$${d.bano.efectivo.toFixed(2)}</span></div>
          <div class="row sub-row tarjeta"><span>  • Tarjeta:</span><span>$${d.bano.tarjeta.toFixed(2)}</span></div>
        ` : ''}
        
        <!-- MANUALES -->
        ${d.manuales > 0 ? `
          <div class="row bold"><span>MANUALES:</span><span>+$${d.manuales.toFixed(2)}</span></div>
        ` : ''}
        
        <!-- EGRESOS -->
        ${resumen.totalEgresos ? `
          <div class="row bold" style="color: #dc2626;"><span>EGRESOS (RETIROS):</span><span>-$${resumen.totalEgresos.toFixed(2)}</span></div>
        ` : ''}
        
        <div class="separator"></div>
        
        <!-- RESUMEN DE CAJA -->
        <div class="row"><span>Monto inicial:</span><span>$${resumen.montoInicial.toFixed(2)}</span></div>
        <div class="row"><span>Total ingresos efectivo:</span><span>+$${resumen.totalIngresos.toFixed(2)}</span></div>
        <div class="row bold"><span>SALDO NETO:</span><span>$${resumen.saldoNeto?.toFixed(2) || resumen.totalIngresos.toFixed(2)}</span></div>
        <div class="separator"></div>
        
        <!-- DESGLOSE DE DENOMINACIONES -->
        ${denominaciones.length > 0 ? `
          <div class="section-title"> DESGLOSE DE EFECTIVO FÍSICO</div>
          ${billetes.length > 0 ? `
            <div class="section-title"> BILLETES</div>
            <table class="denom-table">
              ${billetes.map(d => `
                <tr>
                  <td>$${d.denominacion.toFixed(2)}</td>
                  <td>x ${d.cantidad}</td>
                  <td>$${d.subtotal.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr style="border-top: 1px dashed #000;">
                <td colspan="2" class="bold">Total billetes:</td>
                <td class="bold">$${totalBilletes.toFixed(2)}</td>
              </tr>
            </table>
          ` : ''}
          ${monedas.length > 0 ? `
            <div class="section-title"> MONEDAS</div>
            <table class="denom-table">
              ${monedas.map(d => `
                <tr>
                  <td>$${d.denominacion.toFixed(2)}</td>
                  <td>x ${d.cantidad}</td>
                  <td>$${d.subtotal.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr style="border-top: 1px dashed #000;">
                <td colspan="2" class="bold">Total monedas:</td>
                <td class="bold">$${totalMonedas.toFixed(2)}</td>
              </tr>
            </table>
          ` : ''}
          <div class="separator"></div>
        ` : ''}
        
        <!-- TOTALES FINALES -->
        <div class="row total"><span>MONTO ESPERADO:</span><span>$${resumen.montoEsperado.toFixed(2)}</span></div>
        <div class="row total"><span>MONTO FÍSICO:</span><span>$${resumen.montoFisico.toFixed(2)}</span></div>
        <div class="row bold ${resumen.diferencia >= 0 ? 'diff-pos' : 'diff-neg'}">
          <span>DIFERENCIA:</span>
          <span>${resumen.diferencia >= 0 ? '+' : ''}$${resumen.diferencia.toFixed(2)}</span>
        </div>
        <div class="separator"></div>
        
        <!-- MOVIMIENTOS (solo últimos 10) -->
        <div style="font-size:9px;font-weight:bold;margin-bottom:2px">📋 MOVIMIENTOS (últimos 10 de ${resumen.movimientos.length})</div>
        <table style="width:100%; border-collapse: collapse; font-size: 8px;">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align:left;">Hora</th>
              <th style="text-align:left;">Tipo</th>
              <th style="text-align:left;">Descripción</th>
              <th style="text-align:right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${resumen.movimientos.slice(0, 10).map(m => {
              let tipoTexto = ""
              if (m.tipo === "egreso") tipoTexto = "Retiro"
              else if (m.tipo === "parqueo") tipoTexto = m.metodo_pago === "tarjeta" ? "Pq(T)" : "Pq"
              else if (m.tipo === "efectivo_manual") tipoTexto = "Manual"
              else if (m.tipo === "servicio") tipoTexto = m.metodo_pago === "tarjeta" ? "Sv(T)" : "Sv"
              
              const montoDisplay = m.tipo === "egreso" 
                ? `-$${Math.abs(m.monto).toFixed(2)}` 
                : `$${m.monto.toFixed(2)}`
              
              return `
                <tr>
                  <td>${new Date(m.fecha).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td>${tipoTexto}</td>
                  <td>${m.descripcion.substring(0, 12)}</td>
                  <td style="text-align:right;">${montoDisplay}</td>
                </tr>
              `
            }).join("")}
          </tbody>
        </table>
        
        <div class="separator"></div>
        <div class="center" style="font-size:9px;margin-top:4px">
          <div>Generado: ${new Date().toLocaleString("es-EC")}</div>
          <div class="bold">¡Gracias por su trabajo!</div>
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

        {/* Vista previa del ticket */}
        <div className="font-mono text-sm space-y-3 border rounded-lg p-4 bg-background max-h-[60vh] overflow-y-auto">
          {/* HEADER */}
          <div className="text-center border-b-2 border-dashed pb-3">
            <p className="text-lg font-bold">{HOTEL_INFO.nombre}</p>
            <p className="text-xs text-muted-foreground">{HOTEL_INFO.direccion}</p>
            <p className="text-xs text-muted-foreground">CIERRE DE CAJA</p>
            <p className="text-xs text-muted-foreground">{new Date(resumen.fechaCierre).toLocaleString("es-EC")}</p>
          </div>

          {/* INFORMACIÓN GENERAL */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Operador:</span>
              <span className="font-medium">{resumen.operador}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monto inicial:</span>
              <span>${resumen.montoInicial.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-dashed my-2"></div>

          {/* ========== DESGLOSE DE INGRESOS ========== */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground"> DESGLOSE DE INGRESOS</p>
            
            {/* PARQUEO */}
            {(resumen.desglose?.parqueo.total || 0) > 0 && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-sm font-semibold">
                  <span>PARQUEO:</span>
                  <span>${(resumen.desglose?.parqueo.total || 0).toFixed(2)}</span>
                </div>
                {(resumen.desglose?.parqueo.efectivo || 0) > 0 && (
                  <div className="flex justify-between text-xs pl-2 text-muted-foreground">
                    <span>  • Efectivo:</span>
                    <span className="text-green-600">+${(resumen.desglose?.parqueo.efectivo || 0).toFixed(2)}</span>
                  </div>
                )}
                {(resumen.desglose?.parqueo.tarjeta || 0) > 0 && (
                  <div className="flex justify-between text-xs pl-2 text-muted-foreground">
                    <span>  • Tarjeta:</span>
                    <span className="text-gray-500">${(resumen.desglose?.parqueo.tarjeta || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* SERVICIOS */}
            {(resumen.desglose?.servicios.total || 0) > 0 && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-sm font-semibold">
                  <span>SERVICIOS:</span>
                  <span>${(resumen.desglose?.servicios.total || 0).toFixed(2)}</span>
                </div>
                {(resumen.desglose?.servicios.efectivo || 0) > 0 && (
                  <div className="flex justify-between text-xs pl-2 text-muted-foreground">
                    <span>  • Efectivo:</span>
                    <span className="text-green-600">+${(resumen.desglose?.servicios.efectivo || 0).toFixed(2)}</span>
                  </div>
                )}
                {(resumen.desglose?.servicios.tarjeta || 0) > 0 && (
                  <div className="flex justify-between text-xs pl-2 text-muted-foreground">
                    <span>  • Tarjeta:</span>
                    <span className="text-gray-500">${(resumen.desglose?.servicios.tarjeta || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* HOTEL */}
            {(resumen.desglose?.hotel.total || 0) > 0 && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-sm font-semibold">
                  <span>HOTEL:</span>
                  <span>${(resumen.desglose?.hotel.total || 0).toFixed(2)}</span>
                </div>
                {(resumen.desglose?.hotel.efectivo || 0) > 0 && (
                  <div className="flex justify-between text-xs pl-2 text-muted-foreground">
                    <span>  • Efectivo:</span>
                    <span className="text-green-600">+${(resumen.desglose?.hotel.efectivo || 0).toFixed(2)}</span>
                  </div>
                )}
                {(resumen.desglose?.hotel.tarjeta || 0) > 0 && (
                  <div className="flex justify-between text-xs pl-2 text-muted-foreground">
                    <span>  • Tarjeta:</span>
                    <span className="text-gray-500">${(resumen.desglose?.hotel.tarjeta || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* BAÑO */}
            {(resumen.desglose?.bano.total || 0) > 0 && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-sm font-semibold">
                  <span>BAÑO:</span>
                  <span>${(resumen.desglose?.bano.total || 0).toFixed(2)}</span>
                </div>
                {(resumen.desglose?.bano.efectivo || 0) > 0 && (
                  <div className="flex justify-between text-xs pl-2 text-muted-foreground">
                    <span>  • Efectivo:</span>
                    <span className="text-green-600">+${(resumen.desglose?.bano.efectivo || 0).toFixed(2)}</span>
                  </div>
                )}
                {(resumen.desglose?.bano.tarjeta || 0) > 0 && (
                  <div className="flex justify-between text-xs pl-2 text-muted-foreground">
                    <span>  • Tarjeta:</span>
                    <span className="text-gray-500">${(resumen.desglose?.bano.tarjeta || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* MANUALES */}
            {(resumen.desglose?.manuales || 0) > 0 && (
              <div className="flex justify-between text-sm font-semibold">
                <span>MANUALES:</span>
                <span className="text-amber-600">+${(resumen.desglose?.manuales || 0).toFixed(2)}</span>
              </div>
            )}

            {/* EGRESOS */}
            {(resumen.totalEgresos || 0) > 0 && (
              <div className="flex justify-between text-sm font-semibold">
                <span>EGRESOS (RETIROS):</span>
                <span className="text-red-600">-${(resumen.totalEgresos || 0).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed my-2"></div>

          {/* RESUMEN DE CAJA */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total ingresos efectivo:</span>
              <span className="text-green-600">+${resumen.totalIngresos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>SALDO NETO:</span>
              <span className="text-primary">${(resumen.saldoNeto || resumen.totalIngresos).toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-dashed my-2"></div>

          {/* DESGLOSE DE DENOMINACIONES */}
          {resumen.denominaciones && resumen.denominaciones.items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground"> DESGLOSE DE EFECTIVO FÍSICO</p>
              
              {/* Billetes */}
              {resumen.denominaciones.items.filter(d => d.denominacion >= 1).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-blue-600"> Billetes:</p>
                  {resumen.denominaciones.items
                    .filter(d => d.denominacion >= 1)
                    .sort((a, b) => b.denominacion - a.denominacion)
                    .map((d, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">${d.denominacion.toFixed(2)} x {d.cantidad}</span>
                        <span className="font-medium">${d.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  <div className="flex justify-between text-xs font-semibold border-t border-dashed pt-1 mt-1">
                    <span>Total billetes:</span>
                    <span className="text-blue-600">
                      ${resumen.denominaciones.items
                        .filter(d => d.denominacion >= 1)
                        .reduce((sum, d) => sum + d.subtotal, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Monedas */}
              {resumen.denominaciones.items.filter(d => d.denominacion < 1).length > 0 && (
                <div className="space-y-1 mt-2">
                  <p className="text-xs font-medium text-amber-600"> Monedas:</p>
                  {resumen.denominaciones.items
                    .filter(d => d.denominacion < 1)
                    .sort((a, b) => b.denominacion - a.denominacion)
                    .map((d, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">${d.denominacion.toFixed(2)} x {d.cantidad}</span>
                        <span className="font-medium">${d.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  <div className="flex justify-between text-xs font-semibold border-t border-dashed pt-1 mt-1">
                    <span>Total monedas:</span>
                    <span className="text-amber-600">
                      ${resumen.denominaciones.items
                        .filter(d => d.denominacion < 1)
                        .reduce((sum, d) => sum + d.subtotal, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t-2 border-dashed my-2"></div>

          {/* TOTALES FINALES */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monto esperado:</span>
              <span className="font-bold">${resumen.montoEsperado.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monto físico:</span>
              <span className="font-bold">${resumen.montoFisico.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between text-base font-bold ${resumen.diferencia >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              <span>Diferencia:</span>
              <span>{resumen.diferencia >= 0 ? '+' : ''}{resumen.diferencia.toFixed(2)}</span>
            </div>
          </div>

          {/* MOVIMIENTOS RECIENTES */}
          {resumen.movimientos.length > 0 && (
            <div className="border-t border-dashed pt-2">
              <p className="text-xs font-bold text-muted-foreground mb-2">
                📋 Movimientos ({resumen.movimientos.length})
              </p>
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                {resumen.movimientos.slice(0, 8).map((m) => {
                  let colorClass = ""
                  let tipoDisplay = ""
                  let montoDisplay = m.monto
                  let signo = "+"

                  if (m.tipo === "egreso") {
                    colorClass = "text-red-600"
                    tipoDisplay = "Retiro"
                    montoDisplay = Math.abs(m.monto)
                    signo = "-"
                  } else if (m.tipo === "parqueo") {
                    if (m.metodo_pago === "tarjeta") {
                      colorClass = "text-gray-500"
                      tipoDisplay = "Pq(T)"
                    } else {
                      colorClass = "text-blue-600"
                      tipoDisplay = "Parqueo"
                    }
                  } else if (m.tipo === "efectivo_manual") {
                    colorClass = "text-amber-600"
                    tipoDisplay = "Manual"
                  } else if (m.tipo === "servicio") {
                    if (m.metodo_pago === "tarjeta") {
                      colorClass = "text-gray-500"
                      tipoDisplay = "Sv(T)"
                    } else {
                      colorClass = "text-green-600"
                      tipoDisplay = "Servicio"
                    }
                  }

                  return (
                    <div key={m.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground w-12">
                        {new Date(m.fecha).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className={`${colorClass} w-14`}>{tipoDisplay}</span>
                      <span className="text-muted-foreground truncate max-w-[100px]">
                        {m.descripcion.substring(0, 12)}
                      </span>
                      <span className={`font-medium ${colorClass}`}>
                        {signo}${montoDisplay.toFixed(2)}
                      </span>
                    </div>
                  )
                })}
                {resumen.movimientos.length > 8 && (
                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                    ... y {resumen.movimientos.length - 8} movimientos más
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="bg-transparent" onClick={onClose}>
            Cerrar
          </Button>
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


  const saldoDisponible = estadoCaja?.saldo_actual ??
    ((estadoCaja?.caja_actual?.monto_inicial ?? 0) +
      (estadoCaja?.total_dia_total ?? 0) -
      (estadoCaja?.total_dia_egresos ?? 0))

  const handleCerrado = (resumen: CierreResumen) => {
    onOpenChange(false)
    onCajaCerrada(resumen)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Vault className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle>Arqueo de Caja</DialogTitle>
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
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border bg-card p-2 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-600 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Ingresos efectivo</p>
                  <p className="text-sm font-bold text-green-600">+${movimientosData.total_efectivo.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex-1 rounded-lg border bg-card p-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Tarjeta (no entra)</p>
                  <p className="text-sm font-bold text-muted-foreground">${movimientosData.total_tarjeta.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* EGRESOS Y SALDO NETO */}
            {movimientosData.total_egresos > 0 && (
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border bg-card p-2 flex items-center gap-2">
                  <Minus className="h-4 w-4 text-red-600 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Egresos (retiros)</p>
                    <p className="text-sm font-bold text-red-600">-${movimientosData.total_egresos.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex-1 rounded-lg border bg-card p-2 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo neto</p>
                    <p className="text-sm font-bold text-primary">
                      ${(movimientosData.saldo_neto || estadoCaja?.saldo_neto || estadoCaja?.monto_esperado || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
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
                {movimientos.map((mov) => {
                  const esEgreso = mov.tipo === "egreso"
                  return (
                    <TableRow key={mov.id}>
                      <TableCell className="text-xs font-mono py-2">
                        {new Date(mov.fecha).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="py-2">{tipoBadge(mov.tipo, mov.metodo_pago)}</TableCell>
                      <TableCell className="text-xs py-2 max-w-[200px] truncate">{mov.descripcion}</TableCell>
                      <TableCell className={`text-xs py-2 text-right font-medium ${esEgreso ? 'text-red-600' : 'text-green-600'}`}>
                        {esEgreso ? '-' : '+'}${Math.abs(mov.monto).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 shrink-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <AgregarEfectivoDialog
              operador={operador}
              onAgregado={() => { cargarMovimientos(); onRefresh() }}
            />
            {/* ✅ NUEVO: Botón de Retirar efectivo */}
            <RetirarEfectivoDialog
              operador={operador}
              onEgresoRegistrado={() => { cargarMovimientos(); onRefresh() }}
              saldoDisponible={saldoDisponible}
            />
          </div>
          <div className="flex gap-2 sm:ml-auto">

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
  const [cierreResumen, setCierreResumen] = useState<CierreResumen | null>(null)

  const handleRefrescar = async () => {
    setRefrescando(true)
    try {
      await refrescarEstado()
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      toast.error("Error al refrescar estado")
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
                      ${(estadoCaja.saldo_actual ?? estadoCaja.caja_actual?.monto_inicial ?? 0).toFixed(2)}
                      {/* 👈 AHORA MUESTRA $180.00 */}
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
                <Card className="border-amber-200 bg-amber-50/50 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setCajaDialogOpen(true)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                        <TrendingUp className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-amber-700">Saldo en caja</p>
                        <p className="text-2xl font-bold text-amber-600">
                          ${(estadoCaja.saldo_actual ?? estadoCaja.caja_actual?.monto_inicial ?? 0).toFixed(2)}
                          {/* 👈 AHORA MUESTRA $180.00 */}
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

      {cierreResumen && (
        <TicketCierreDialog
          resumen={cierreResumen}
          onClose={() => {
            setCierreResumen(null)
            handleRefrescar()
          }}
        />
      )}
    </div>
  )
}