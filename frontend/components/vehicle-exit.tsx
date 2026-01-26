"use client"

import { useState, useRef, useEffect } from "react"
import { buscarVehiculo, registrarSalida } from "@/servicios/vehiculoService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Clock, DollarSign, Car, Printer, Moon, Sun, Info, CheckCircle, Ban } from "lucide-react"
import { useSWRConfig } from "swr"
import { toast } from "sonner"

// Tipos
interface VehiculoBusqueda {
  id: number
  placa: string
  espacio_numero: number
  fecha_hora_entrada: string
  fecha_hora_salida: string | null
  costo_total: number | null
  estado: string
  es_nocturno: boolean
  creado_en: string
  costo_estimado: number
  tiempo_estimado: string
  detalles: string
}

interface Factura {
  placa: string
  espacio: number
  entrada: string
  salida: string
  tiempo_total: string
  costo_total: number
  detalles: string
  es_nocturno: boolean
  es_no_pagado?: boolean // ✅ NUEVO: Campo para saber si es no pagado
  tarifa_aplicada?: string
}

// Datos del hotel para la factura
const HOTEL_INFO = {
  nombre: "Hotel La Farola",
  direccion: "Av. Gil Ramirez Davalos y Av Heroes de Verdeloma",
  telefono: "+593 99 808 5600",
}

export function VehicleExit() {
  const { mutate } = useSWRConfig()
  const [placa, setPlaca] = useState("")
  const [vehiculo, setVehiculo] = useState<VehiculoBusqueda | null>(null)
  const [factura, setFactura] = useState<Factura | null>(null)
  const [searching, setSearching] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [indicadorVisible, setIndicadorVisible] = useState(false)
  const [noPagado, setNoPagado] = useState(false)
  const [mostrarConfirmacionNoPagado, setMostrarConfirmacionNoPagado] = useState(false)
  const facturaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ✅ Escuchar evento cuando se copia una placa en la entrada
  useEffect(() => {
    const handlePlacaCopiada = (event: Event) => {
      const customEvent = event as CustomEvent
      const { placa: placaCopiada } = customEvent.detail

      setPlaca(placaCopiada)
      setError("")
      setIndicadorVisible(true)
      setNoPagado(false)

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }, 50)

      if (validarFormatoPlaca(placaCopiada)) {
        setTimeout(() => {
          handleBuscarAutomaticamente(placaCopiada)
        }, 300)
      }

      setTimeout(() => {
        setIndicadorVisible(false)
      }, 3000)
    }

    window.addEventListener('placaCopiadaParaSalida', handlePlacaCopiada as EventListener)

    return () => {
      window.removeEventListener('placaCopiadaParaSalida', handlePlacaCopiada as EventListener)
    }
  }, [])

  // ✅ Función para formatear la placa automáticamente
  const formatearPlaca = (valor: string): string => {
    let limpio = valor.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase()

    if (limpio.includes("-")) {
      const partes = limpio.split("-")
      let letras = partes[0].replace(/[^A-Z]/g, "").slice(0, 3)
      let numeros = partes[1].replace(/[^0-9]/g, "").slice(0, 4)

      if (numeros.length === 0) {
        return letras
      }

      return `${letras}-${numeros}`
    } else {
      let letras = limpio.replace(/[^A-Z]/g, "").slice(0, 3)
      let numeros = limpio.replace(/[^0-9]/g, "").slice(0, 4)

      if (letras.length === 3 && numeros.length > 0) {
        return `${letras}-${numeros}`
      }

      if (letras.length > 0 && limpio.length > letras.length) {
        const caracteresRestantes = limpio.slice(letras.length)
        const numerosEnResto = caracteresRestantes.replace(/[^0-9]/g, "")
        if (numerosEnResto.length > 0) {
          return `${letras}-${numerosEnResto.slice(0, 4)}`
        }
      }

      return letras + (numeros.length > 0 ? "-" + numeros : "")
    }
  }

  // ✅ Función para manejar el cambio en el input de placa
  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    const formateado = formatearPlaca(valor)
    setPlaca(formateado)

    const formatoValido = validarFormatoPlaca(formateado)
    if (valor && !formatoValido) {
      setError("Formato de placa inválido. Use: AAA-123 o AAA-1234")
    } else {
      setError("")
    }
  }

  // ✅ Función para validar el formato de placa
  const validarFormatoPlaca = (placa: string): boolean => {
    if (!placa.trim()) return false
    const patron = /^[A-Z]{3}-\d{3,4}$/
    return patron.test(placa)
  }

  // ✅ Función para formatear placa al perder el foco (blur)
  const handlePlacaBlur = () => {
    if (placa.trim()) {
      const formateado = formatearPlaca(placa)
      setPlaca(formateado)

      if (!validarFormatoPlaca(formateado)) {
        setError("Formato de placa inválido. Use: AAA-123 o AAA-1234")
      } else {
        setError("")
      }
    }
  }

  // ✅ Función para buscar automáticamente
  const handleBuscarAutomaticamente = async (placaParaBuscar: string) => {
    if (!placaParaBuscar.trim()) return

    setSearching(true)
    setError("")
    setVehiculo(null)
    setNoPagado(false)

    try {
      const result = await buscarVehiculo(placaParaBuscar.trim())

      if (result && result.success && result.data) {
        setVehiculo(result.data)
      } else if (result && result.data) {
        setVehiculo(result.data)
      } else {
        setError("Vehículo no encontrado o ya salió del parqueadero")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar vehículo")
    } finally {
      setSearching(false)
    }
  }

  const handleBuscar = async () => {
    if (!placa.trim()) return

    if (!validarFormatoPlaca(placa)) {
      setError("Formato de placa inválido. Use: AAA-123 o AAA-1234")
      return
    }

    setSearching(true)
    setError("")
    setVehiculo(null)
    setNoPagado(false)

    try {
      const result = await buscarVehiculo(placa.trim())

      if (result && result.success && result.data) {
        setVehiculo(result.data)
      } else if (result && result.data) {
        setVehiculo(result.data)
      } else {
        setError("Vehículo no encontrado o ya salió del parqueadero")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar vehículo")
    } finally {
      setSearching(false)
    }
  }

  // ✅ Función para registrar salida con opción de no pagado
  const handleRegistrarSalida = async (marcarComoNoPagado: boolean = false) => {
    if (!vehiculo) return

    // Si se va a marcar como no pagado, mostrar confirmación
    if (marcarComoNoPagado) {
      setMostrarConfirmacionNoPagado(true)
      return
    }

    await procesarSalida(false)
  }

  // ✅ Función para procesar la salida (normal o no pagado)
  const procesarSalida = async (esNoPagado: boolean) => {
    if (!vehiculo) return

    setProcessing(true)
    setError("")

    try {
      const result = await registrarSalida(vehiculo.placa, esNoPagado)

      if (result.ok && result.data) {
        setFactura(result.data.factura)
        setDialogOpen(true)
        setVehiculo(null)
        setPlaca("")
        setNoPagado(esNoPagado) // ✅ Guardar el estado de no pagado
        mutate("espacios")
        
        if (esNoPagado) {
          toast.warning("Salida registrada como NO PAGADO", {
            description: "Este registro no se sumará a los ingresos del reporte diario",
            duration: 5000,
          })
        } else {
          toast.success("Salida registrada exitosamente")
        }
      } else {
        setError(result.message || "Error al registrar salida")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar salida")
    } finally {
      setProcessing(false)
      setMostrarConfirmacionNoPagado(false)
    }
  }

  const handleImprimir = () => {
    if (!factura) return

    const entrada = new Date(factura.entrada)
    const salida = new Date(factura.salida)

    const fEntrada = entrada.toLocaleDateString("es-EC")
    const hEntrada = entrada.toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })

    const fSalida = salida.toLocaleDateString("es-EC")
    const hSalida = salida.toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })

    const printWindow = window.open("", "_blank", "width=72mm,height=600")
    if (!printWindow) {
      console.error("No se pudo abrir ventana de impresión")
      return
    }

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket de Salida</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Courier New', monospace;
          }
          
          body {
            width: 72mm;
            margin: 0;
            padding: 2mm;
            font-size: 11px;
            line-height: 1.2;
          }
          
          @media print {
            @page {
              size: 72mm auto;
              margin: 0;
            }
            
            body {
              width: 72mm !important;
              margin: 0 !important;
              padding: 2mm !important;
            }
          }
          
          .ticket {
            width: 100%;
            text-align: left;
          }
          
          .center {
            text-align: center;
          }
          
          .separator {
            border: none;
            border-top: 1px dashed #000;
            margin: 3px 0;
          }
          
          .placa {
            font-size: 18px;
            font-weight: bold;
            margin: 4px 0;
            text-align: center;
          }
          
          .espacio {
            font-size: 14px;
            font-weight: bold;
            margin: 3px 0;
            text-align: center;
          }
          
          .tarifa {
            font-size: 12px;
            font-weight: bold;
            margin: 4px 0;
            text-align: center;
          }
          
          .info-table {
            width: 100%;
            margin: 5px 0;
          }
          
          .info-table td {
            padding: 1px 0;
            vertical-align: top;
          }
          
          .total {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin: 8px 0;
          }
          
          .no-pagado {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin: 8px 0;
            color: #ef4444;
            border: 2px dashed #ef4444;
            padding: 4px;
          }
          
          .tipo-tarifa {
            font-size: 12px;
            text-align: center;
            margin: 4px 0;
            padding: 2px;
            border-radius: 3px;
          }
          
          .nocturno {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #f59e0b;
          }
          
          .normal {
            background-color: #dbeafe;
            color: #1e40af;
            border: 1px solid #3b82f6;
          }
          
          .footer {
            font-size: 9px;
            margin-top: 6px;
            padding-top: 4px;
            border-top: 1px dashed #000;
            text-align: center;
            line-height: 1.3;
          }
          
          .bold {
            font-weight: bold;
          }
          
          .small {
            font-size: 9px;
          }
          
          .medium {
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <!-- HEADER -->
          <div class="center">
            <div class="bold medium">TICKET DE SALIDA</div>
            <div>Sistema de Parqueadero</div>
          </div>
          
          <div class="separator"></div>
          
          <!-- TIPO DE TARIFA -->
          <div class="tipo-tarifa ${factura.es_nocturno ? 'nocturno' : 'normal'}">
            ${factura.es_nocturno ? 'TARIFA NOCTURNA' : 'TARIFA NORMAL'}
          </div>
          
          <!-- PLACA Y ESPACIO -->
          <div class="placa">${factura.placa}</div>
          <div class="espacio">ESPACIO #${factura.espacio}</div>
          
          <div class="separator"></div>
          
          <!-- INFORMACIÓN -->
          <table class="info-table">
            <tr>
              <td class="bold">Fecha entrada:</td>
              <td>${fEntrada}</td>
            </tr>
            <tr>
              <td class="bold">Hora entrada:</td>
              <td>${hEntrada}</td>
            </tr>
            <tr>
              <td class="bold">Fecha salida:</td>
              <td>${fSalida}</td>
            </tr>
            <tr>
              <td class="bold">Hora salida:</td>
              <td>${hSalida}</td>
            </tr>
            <tr>
              <td class="bold">Tiempo total:</td>
              <td>${factura.tiempo_total}</td>
            </tr>
            <tr>
              <td class="bold">Tarifa:</td>
              <td>${factura.es_nocturno ? 'NOCTURNA' : 'NORMAL'}</td>
            </tr>
          </table>
          
          <div class="separator"></div>
          
          <!-- DETALLES -->
          <div class="small">
            ${factura.detalles.replace(/\n/g, '<br>')}
          </div>
          
          <div class="separator"></div>
          
          <!-- TOTAL -->
          <div class="total">
            ${noPagado ? 'COSTO NO COBRADO' : `TOTAL: $${factura.costo_total.toFixed(2)}`}
          </div>
          
          ${noPagado ? `
            <div class="no-pagado">
              ⚠️ REGISTRADO COMO NO PAGADO
            </div>
          ` : ''}
          
          <div class="separator"></div>
          
          <!-- FOOTER -->
          <div class="footer">
            <div><span class="bold">Generado:</span> ${new Date().toLocaleString("es-EC")}</div>
            <div class="bold">Hotel La Farola - Parqueadero</div>
            <div>Gracias por su visita</div>
          </div>
        </div>
      </body>
    </html>
  `)

    printWindow.document.close()

    setTimeout(() => {
      printWindow.print()
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close()
        }
      }, 1000)
    }, 500)
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    return {
      fecha: date.toLocaleDateString("es-EC"),
      hora: date.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Salida de Vehículo
          </CardTitle>
          <CardDescription>
            Busque un vehículo por su placa para registrar la salida y generar factura
            {indicadorVisible && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 animate-pulse">
                <CheckCircle className="h-3 w-3" />
                Placa cargada automáticamente
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="buscar-placa" className="sr-only">
                  Placa
                </Label>
                <Input
                  ref={inputRef}
                  id="buscar-placa"
                  placeholder="Click en un espacio ocupado para cargar automáticamente"
                  value={placa}
                  onChange={handlePlacaChange}
                  onBlur={handlePlacaBlur}
                  className="font-mono text-lg uppercase"
                  maxLength={8}
                  onKeyDown={(e) => e.key === "Enter" && !searching && handleBuscar()}
                />
              </div>
              <Button
                onClick={handleBuscar}
                disabled={!placa.trim() || searching || !validarFormatoPlaca(placa)}
              >
                <Search className="h-4 w-4 mr-2" />
                {searching ? "Buscando..." : "Buscar"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              <span>Formato: 3 letras, guión, 3 o 4 números (ej: ABC-1234)</span>
            </div>
            {indicadorVisible && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 animate-pulse">
                <CheckCircle className="h-3 w-3" />
                <span>Placa cargada automáticamente. Puede editar o presionar Enter para buscar.</span>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {vehiculo && (
            <div className="rounded-lg border bg-card p-4 space-y-4">
              {/* ✅ MODIFICADO: Badge para cualquier tipo de tarifa */}
              <div className="flex justify-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${vehiculo.es_nocturno ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-blue-500/20 border border-blue-500/50'}`}>
                  {vehiculo.es_nocturno ? (
                    <Moon className="h-3 w-3 text-amber-600" />
                  ) : (
                    <Sun className="h-3 w-3 text-blue-600" />
                  )}
                  <span className={`text-xs font-medium ${vehiculo.es_nocturno ? 'text-amber-700' : 'text-blue-700'}`}>
                    {vehiculo.es_nocturno ? 'VEHÍCULO NOCTURNO' : 'VEHÍCULO NORMAL'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Placa</p>
                  <p className="text-xl font-mono font-bold">{vehiculo.placa}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Espacio</p>
                  <p className="text-xl font-bold">{vehiculo.espacio_numero}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tiempo estacionado</p>
                    <p className="font-medium">{vehiculo.tiempo_estimado}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Costo estimado</p>
                    <p className={`font-bold text-lg ${vehiculo.es_nocturno ? 'text-amber-600' : 'text-blue-600'}`}>
                      ${vehiculo.costo_estimado.toFixed(2)}
                      <span className={`text-xs font-normal ml-1 ${vehiculo.es_nocturno ? 'text-amber-500' : 'text-blue-500'}`}>
                        ({vehiculo.es_nocturno ? 'Nocturno' : 'Normal'})
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className={`text-sm ${vehiculo.es_nocturno ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50'} rounded p-2`}>
                {vehiculo.detalles}
                {vehiculo.es_nocturno && (
                  <div className="mt-1 font-medium">
                    Tarifa nocturna fija aplicada
                  </div>
                )}
              </div>

              {/* ✅ MODIFICADO: Checkbox para marcar como no pagado - DISPONIBLE PARA TODAS LAS TARIFAS */}
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-rose-50 border-rose-200">
                <input
                  type="checkbox"
                  id="no-pagado"
                  checked={noPagado}
                  onChange={(e) => setNoPagado(e.target.checked)}
                  className="h-4 w-4 text-rose-600 border-rose-300 rounded focus:ring-rose-500"
                />
                <Label htmlFor="no-pagado" className="text-sm font-medium text-rose-700">
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4" />
                    <span>Marcar como NO PAGADO</span>
                  </div>
                  <p className="text-xs text-rose-600 font-normal mt-1">
                    El vehículo se fue sin pagar. Este registro no se sumará a los ingresos del reporte.
                  </p>
                </Label>
              </div>

              {/* ✅ MODIFICADO: Botones para salida - DISPONIBLE PARA TODAS LAS TARIFAS */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleRegistrarSalida(false)}
                  className={`w-full ${vehiculo.es_nocturno ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  size="lg"
                  disabled={processing}
                  variant="default"
                >
                  {processing
                    ? "Procesando..."
                    : vehiculo.es_nocturno
                      ? `Registrar Salida (Nocturno - $${vehiculo.costo_estimado.toFixed(2)})`
                      : `Registrar Salida (Normal - $${vehiculo.costo_estimado.toFixed(2)})`
                  }
                </Button>
                
                <Button
                  onClick={() => handleRegistrarSalida(true)}
                  className="w-full bg-rose-600 hover:bg-rose-700"
                  size="lg"
                  disabled={processing}
                  variant="default"
                >
                  {processing
                    ? "Procesando..."
                    : "Registrar como NO PAGADO"
                  }
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ Diálogo de confirmación para no pagado - DISPONIBLE PARA TODAS LAS TARIFAS */}
      <Dialog open={mostrarConfirmacionNoPagado} onOpenChange={setMostrarConfirmacionNoPagado}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Ban className="h-5 w-5" />
              Confirmar Salida No Pagada
            </DialogTitle>
            <DialogDescription className="text-rose-600">
              Está a punto de registrar una salida como NO PAGADA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
              <div className="space-y-2 text-sm">
                <p><strong>⚠️ ATENCIÓN:</strong> Esta acción registrará la salida del vehículo pero NO se sumará a los ingresos del reporte diario.</p>
                <p><strong>• Placa:</strong> {vehiculo?.placa}</p>
                <p><strong>• Espacio:</strong> {vehiculo?.espacio_numero}</p>
                <p><strong>• Tarifa:</strong> {vehiculo?.es_nocturno ? 'Nocturna' : 'Normal'} - ${vehiculo?.costo_estimado.toFixed(2)}</p>
                <p><strong>• Tiempo:</strong> {vehiculo?.tiempo_estimado}</p>
                <p className="mt-2 font-bold text-rose-700">Este registro quedará marcado como "NO PAGADO" en el sistema.</p>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p className="font-medium">¿Está seguro que desea continuar?</p>
              <p className="text-xs text-gray-500 mt-1">
                Solo use esta opción para vehículos que se han ido sin pagar.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setMostrarConfirmacionNoPagado(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => procesarSalida(true)}
              disabled={processing}
            >
              {processing ? "Procesando..." : "Confirmar NO PAGADO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Salida Registrada</DialogTitle>
            <DialogDescription>
              {noPagado 
                ? "El vehículo ha sido registrado como NO PAGADO" 
                : "El vehículo ha salido exitosamente"
              }
            </DialogDescription>
          </DialogHeader>

          {factura && (
            <div ref={facturaRef} className="font-mono text-sm space-y-3 border rounded-lg p-4 bg-background">
              {/* ✅ Indicador de no pagado */}
              {noPagado && (
                <div className="text-center mb-2">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-rose-500/20 border border-rose-500/50">
                    <Ban className="h-4 w-4 text-rose-600" />
                    <span className="text-xs font-medium text-rose-700">
                      VEHÍCULO NO PAGADO - NO SE SUMARÁ A INGRESOS
                    </span>
                  </div>
                </div>
              )}

              {/* ✅ Badge para tipo de tarifa */}
              <div className="text-center mb-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${factura.es_nocturno ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-blue-500/20 border border-blue-500/50'}`}>
                  <span className={`text-xs font-medium ${factura.es_nocturno ? 'text-amber-700' : 'text-blue-700'}`}>
                    {factura.es_nocturno ? 'TARIFA NOCTURNA APLICADA' : 'TARIFA NORMAL APLICADA'}
                  </span>
                </div>
              </div>

              <div className="header text-center border-b-2 border-dashed pb-3">
                <p className="hotel-name text-lg font-bold">{HOTEL_INFO.nombre}</p>
                <p className="info text-xs text-muted-foreground">{HOTEL_INFO.direccion}</p>
                <p className="info text-xs text-muted-foreground">Tel: {HOTEL_INFO.telefono}</p>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                {noPagado ? "COMPROBANTE DE SALIDA NO PAGADA" : "COMPROBANTE DE PARQUEO"}
              </div>

              <div className="divider border-t border-dashed my-2" />

              <div className="space-y-1">
                <div className="row flex justify-between">
                  <span>Placa:</span>
                  <span className="font-bold">{factura.placa}</span>
                </div>
                <div className="row flex justify-between">
                  <span>Espacio:</span>
                  <span>{factura.espacio}</span>
                </div>
              </div>

              <div className="divider border-t border-dashed my-2" />

              <div className="space-y-1">
                <div className="row flex justify-between">
                  <span>Entrada:</span>
                  <span>
                    {formatDateTime(factura.entrada).fecha} {formatDateTime(factura.entrada).hora}
                  </span>
                </div>
                <div className="row flex justify-between">
                  <span>Salida:</span>
                  <span>
                    {formatDateTime(factura.salida).fecha} {formatDateTime(factura.salida).hora}
                  </span>
                </div>
                <div className="row flex justify-between">
                  <span>Tiempo:</span>
                  <span>{factura.tiempo_total}</span>
                </div>
                <div className="row flex justify-between">
                  <span>Tarifa:</span>
                  <span className={`font-medium ${factura.es_nocturno ? 'text-amber-600' : 'text-blue-600'}`}>
                    {factura.es_nocturno ? 'NOCTURNA' : 'NORMAL'}
                  </span>
                </div>
              </div>

              <div className="divider border-t border-dashed my-2" />

              <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                {factura.detalles}
              </div>

              <div className="divider border-t-2 border-dashed my-2" />

              <div className="row flex justify-between total text-lg">
                <span>{noPagado ? "COSTO ESTIMADO:" : "TOTAL:"}</span>
                <span className={`font-bold ${noPagado ? "text-rose-600" : ""}`}>
                  {noPagado ? "NO COBRADO" : `$${factura.costo_total.toFixed(2)}`}
                </span>
              </div>

              <div className="footer text-center text-xs text-muted-foreground mt-4">
                <p>¡Gracias por su visita!</p>
                <p>{new Date().toLocaleString("es-EC")}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={handleImprimir}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Comprobante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}