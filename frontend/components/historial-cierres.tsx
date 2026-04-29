"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Printer, Eye, Calendar, DollarSign, User, RefreshCw } from "lucide-react"
import { obtenerHistorialCajas, obtenerCajaPorId, reimprimirTicketCaja } from "@/servicios/cajaService"
import { toast } from "sonner"
import { TicketCierrePreview } from "./ticket-cierre-preview"

interface CajaHistorial {
  id: number
  monto_inicial: number
  monto_final: number
  fecha_apertura: string
  fecha_cierre: string
  operador_apertura: string
  operador_cierre: string
  total_parqueo: number
  total_servicios: number
  total_ingresos: number
  monto_esperado: number
  diferencia: number
  estado: string
}

interface HistorialCierresProps {
  refreshTrigger?: number
}

export function HistorialCierres({ refreshTrigger = 0 }: HistorialCierresProps) {
  const [historial, setHistorial] = useState<CajaHistorial[]>([])
  const [cargando, setCargando] = useState(true)
  const [cajaSeleccionada, setCajaSeleccionada] = useState<any>(null)
  const [mostrarTicket, setMostrarTicket] = useState(false)
  const [ticketData, setTicketData] = useState<any>(null)

  const cargarHistorial = async () => {
    setCargando(true)
    try {
      const data = await obtenerHistorialCajas(50)
      setHistorial(data)
    } catch (error) {
      toast.error("Error al cargar historial de cierres")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarHistorial()
  }, [refreshTrigger])

  const verDetalle = async (cajaId: number) => {
    try {
      const caja = await obtenerCajaPorId(cajaId)
      setCajaSeleccionada(caja)
    } catch (error) {
      toast.error("Error al cargar detalle de la caja")
    }
  }

  const reimprimir = async (cajaId: number) => {
    const toastId = toast.loading("Cargando datos para reimpresión...")
    try {
      const caja = await obtenerCajaPorId(cajaId)
      const resumen = await reimprimirTicketCaja(caja)
      setTicketData(resumen)
      setMostrarTicket(true)
      toast.success("Ticket listo para imprimir", { id: toastId })
    } catch (error) {
      toast.error("Error al reimprimir ticket", { id: toastId })
    }
  }

  const formatearFecha = (fecha: string) => {
    if (!fecha) return "—"
    return new Date(fecha).toLocaleString("es-EC", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 🔥 Función para determinar el color del badge según la diferencia
  const getBadgeVariant = (diferencia: number): "default" | "destructive" | "outline" | "secondary" => {
    if (diferencia === 0) return "default"
    if (diferencia > 0) return "secondary"
    return "destructive"
  }

  const getBadgeClass = (diferencia: number): string => {
    if (diferencia === 0) return "bg-green-100 text-green-700 hover:bg-green-100"
    if (diferencia > 0) return "bg-blue-100 text-blue-700 hover:bg-blue-100"
    return "bg-red-100 text-red-700 hover:bg-red-100"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Historial de Cierres de Caja</h2>
          <p className="text-sm text-muted-foreground">
            Historial de cajas cerradas y sus detalles
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={cargarHistorial}
          disabled={cargando}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${cargando ? "animate-spin" : ""}`} />
          Refrescar
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Fecha Apertura</TableHead>
              <TableHead>Fecha Cierre</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Monto Inicial</TableHead>
              <TableHead>Monto Final</TableHead>
              <TableHead>Diferencia</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Cargando historial...
                  </span>
                </TableCell>
              </TableRow>
            ) : historial.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No hay cajas cerradas registradas
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              historial.map((caja) => (
                <TableRow key={caja.id}>
                  <TableCell className="font-mono text-xs">#{caja.id}</TableCell>
                  <TableCell className="text-sm">
                    {formatearFecha(caja.fecha_apertura)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatearFecha(caja.fecha_cierre)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {caja.operador_apertura}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    ${caja.monto_inicial?.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    ${caja.monto_final?.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {/* 🔥 LÍNEA CORREGIDA - Usa variant válida + clase CSS personalizada */}
                    <Badge 
                      variant={getBadgeVariant(caja.diferencia || 0)}
                      className={getBadgeClass(caja.diferencia || 0)}
                    >
                      {caja.diferencia > 0 ? "+" : ""}
                      ${caja.diferencia?.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => verDetalle(caja.id)}
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reimprimir(caja.id)}
                        title="Reimprimir ticket"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de detalle de caja */}
      <Dialog open={!!cajaSeleccionada} onOpenChange={() => setCajaSeleccionada(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Detalle de Caja #{cajaSeleccionada?.id}
            </DialogTitle>
          </DialogHeader>
          
          {cajaSeleccionada && (
            <div className="space-y-4">
              {/* Información general */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Fecha apertura</p>
                  <p className="text-sm font-medium">
                    {formatearFecha(cajaSeleccionada.fecha_apertura)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha cierre</p>
                  <p className="text-sm font-medium">
                    {formatearFecha(cajaSeleccionada.fecha_cierre)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Operador apertura</p>
                  <p className="text-sm font-medium">{cajaSeleccionada.operador_apertura}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Operador cierre</p>
                  <p className="text-sm font-medium">{cajaSeleccionada.operador_cierre || "—"}</p>
                </div>
              </div>

              {/* Totales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-xs text-blue-600">Monto inicial</p>
                  <p className="text-lg font-bold text-blue-700">
                    ${parseFloat(cajaSeleccionada.monto_inicial || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-green-600">Ingresos</p>
                  <p className="text-lg font-bold text-green-700">
                    ${parseFloat(cajaSeleccionada.total_ingresos || 0).toFixed(2)}
                  </p>
                </div>
                {cajaSeleccionada.total_egresos > 0 && (
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <p className="text-xs text-red-600">Egresos</p>
                    <p className="text-lg font-bold text-red-700">
                      -${parseFloat(cajaSeleccionada.total_egresos || 0).toFixed(2)}
                    </p>
                  </div>
                )}
                <div className="p-3 bg-amber-50 rounded-lg text-center">
                  <p className="text-xs text-amber-600">Diferencia</p>
                  <p className={`text-lg font-bold ${parseFloat(cajaSeleccionada.diferencia || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {parseFloat(cajaSeleccionada.diferencia || 0) >= 0 ? "+" : ""}
                    ${parseFloat(cajaSeleccionada.diferencia || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Movimientos (últimos 20) */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Movimientos</h3>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Hora</TableHead>
                        <TableHead className="text-xs">Descripción</TableHead>
                        <TableHead className="text-xs text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cajaSeleccionada.movimientos?.slice(0, 20).map((mov: any) => (
                        <TableRow key={mov.id}>
                          <TableCell className="text-xs font-mono">
                            {new Date(mov.fecha).toLocaleTimeString("es-EC", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="text-xs">
                            {mov.descripcion}
                            {mov.metodo_pago === "tarjeta" && (
                              <Badge variant="outline" className="ml-2 text-[9px]">Tarjeta</Badge>
                            )}
                            {mov.metodo_pago === "transferencia" && (
                              <Badge variant="outline" className="ml-2 text-[9px]">Transferencia</Badge>
                            )}
                          </TableCell>
                          <TableCell className={`text-xs text-right font-mono ${mov.monto < 0 ? "text-red-600" : "text-green-600"}`}>
                            {mov.monto >= 0 ? "+" : ""}${Math.abs(mov.monto).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Botón de reimpresión */}
              <div className="flex justify-end pt-2">
                <Button onClick={() => reimprimir(cajaSeleccionada.id)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Reimprimir ticket
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ticket de reimpresión */}
      {mostrarTicket && ticketData && (
        <TicketCierrePreview
          resumen={ticketData}
          onClose={() => setMostrarTicket(false)}
        />
      )}
    </div>
  )
}