"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  obtenerEspacios,
  registrarEntradaConValidacionDeuda,
  verificarDeudaPlaca,
  pagarDeuda
} from "@/servicios/vehiculoService"
import { obtenerConfiguracion } from "@/servicios/configuracionService"
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
import {
  Car,
  Clock,
  Moon,
  Sun,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Printer,
  Ban,
  ShieldAlert,
  DollarSign,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ✅ Interfaces
interface Espacio {
  numero: number
  ocupado: boolean
  placa: string | null
  entrada: string | null
  es_nocturno?: boolean
}

interface Configuracion {
  id: number
  precio_media_hora: number
  precio_hora_adicional: number
  precio_nocturno: number
  hora_inicio_nocturno: string
  hora_fin_nocturno: string
  actualizado_en: string | null
}

interface DeudaInfo {
  tieneDeuda: boolean
  totalDeuda: number
  cantidadDeudas: number
  ultimaSalida: string | null
  error?: string
}

export function ParkingGrid() {
  const {
    data: espacios,
    error,
    isLoading,
    mutate,
  } = useSWR<Espacio[]>("espacios", obtenerEspacios, {
    refreshInterval: 5000,
    onError: (err) => {
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor. Verifica que el backend esté corriendo.",
        icon: <XCircle className="h-4 w-4" />,
      })
    }
  })

  // Obtener configuración
  const { data: config } = useSWR<Configuracion>("configuracion", obtenerConfiguracion)

  const [selectedEspacio, setSelectedEspacio] = useState<number | null>(null)
  const [placa, setPlaca] = useState("")
  const [esNocturno, setEsNocturno] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [mostrarAdvertenciaNocturna, setMostrarAdvertenciaNocturno] = useState(false)

  // ✅ Estados para deudas
  const [deudaInfo, setDeudaInfo] = useState<DeudaInfo | null>(null)
  const [verificandoDeuda, setVerificandoDeuda] = useState(false)

  // Estados para confirmaciones
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmacionPendiente, setConfirmacionPendiente] = useState<{
    accion: () => void
    cancelar: () => void
  } | null>(null)

  // ✅ Nuevos estados para cobro de deudas
  const [deudaDialogOpen, setDeudaDialogOpen] = useState(false)
  const [cobroDialogOpen, setCobroDialogOpen] = useState(false)
  const [montoCobrado, setMontoCobrado] = useState("")
  const [metodoPago, setMetodoPago] = useState("efectivo")
  const [cobrando, setCobrando] = useState(false)

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
      setSubmitError("Formato de placa inválido. Use: AAA-123 o AAA-1234")
    } else {
      setSubmitError("")
    }

    if (formatoValido) {
      verificarDeudaEnTiempoReal(formateado)
    } else {
      setDeudaInfo(null)
    }
  }

  // ✅ Función para verificar deuda en tiempo real
  const verificarDeudaEnTiempoReal = async (placaVerificar: string) => {
    if (!placaVerificar || placaVerificar.length < 7) return

    setVerificandoDeuda(true)
    try {
      const infoDeuda = await verificarDeudaPlaca(placaVerificar)
      setDeudaInfo(infoDeuda)

      if (infoDeuda.tieneDeuda) {
        console.log(`Placa ${placaVerificar} tiene deuda: $${infoDeuda.totalDeuda}`)
      }
    } catch (error) {
      console.error("Error verificando deuda:", error)
    } finally {
      setVerificandoDeuda(false)
    }
  }

  // ✅ Función para validar el formato de placa
  const validarFormatoPlaca = (placa: string): boolean => {
    if (!placa.trim()) return false
    const patron = /^[A-Z]{3}-\d{3,4}$/
    return patron.test(placa)
  }

  // ✅ Función para formatear placa al perder el foco
  const handlePlacaBlur = () => {
    if (placa.trim()) {
      const formateado = formatearPlaca(placa)
      setPlaca(formateado)

      if (!validarFormatoPlaca(formateado)) {
        setSubmitError("Formato de placa inválido. Use: AAA-123 o AAA-1234")
      }
    }
  }

  // Función para verificar si estamos en horario nocturno
  const estaEnHorarioNocturno = (): boolean => {
    if (!config) return false

    const ahora = new Date()
    const horaActual = ahora.getHours()
    const minutoActual = ahora.getMinutes()
    const horaActualEnMinutos = horaActual * 60 + minutoActual

    const [horaInicioStr, minutoInicioStr] = config.hora_inicio_nocturno.split(':')
    const [horaFinStr, minutoFinStr] = config.hora_fin_nocturno.split(':')

    const horaInicio = parseInt(horaInicioStr)
    const minutoInicio = parseInt(minutoInicioStr)
    const horaFin = parseInt(horaFinStr)
    const minutoFin = parseInt(minutoFinStr)

    const inicioEnMinutos = horaInicio * 60 + minutoInicio
    const finEnMinutos = horaFin * 60 + minutoFin

    if (inicioEnMinutos < finEnMinutos) {
      return horaActualEnMinutos >= inicioEnMinutos && horaActualEnMinutos < finEnMinutos
    } else {
      return horaActualEnMinutos >= inicioEnMinutos || horaActualEnMinutos < finEnMinutos
    }
  }

  const handleEspacioClick = (espacio: Espacio) => {
    if (!espacio.ocupado) {
      setSelectedEspacio(espacio.numero)
      setPlaca("")
      setDeudaInfo(null)

      const enHorarioNocturno = estaEnHorarioNocturno()
      setEsNocturno(enHorarioNocturno)
      setMostrarAdvertenciaNocturno(false)
      setSubmitError("")
      setDialogOpen(true)
    } else if (espacio.ocupado && espacio.placa) {
      const placaParaCopiar = espacio.placa

      navigator.clipboard.writeText(placaParaCopiar)
        .then(() => {
          toast.success("Placa copiada al portapapeles", {
            description: `Placa ${placaParaCopiar} cargada en salida`,
            icon: <Info className="h-4 w-4" />,
            duration: 3000,
          })

          const eventoPlacaCopiada = new CustomEvent('placaCopiadaParaSalida', {
            detail: {
              placa: placaParaCopiar,
              timestamp: Date.now()
            }
          })
          window.dispatchEvent(eventoPlacaCopiada)
        })
        .catch(err => {
          console.error('Error al copiar al portapapeles:', err)
          toast.error("Error al copiar placa", {
            description: "Intente manualmente",
            icon: <XCircle className="h-4 w-4" />,
          })
        })
    } else if (espacio.ocupado) {
      toast.warning("Espacio ocupado sin placa", {
        description: "El espacio está ocupado pero no tiene placa registrada.",
        icon: <AlertTriangle className="h-4 w-4" />,
      })
    }
  }

  // Función para mostrar confirmación
  const mostrarConfirmacion = (mensaje: string, onConfirm: () => void, onCancel?: () => void): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmacionPendiente({
        accion: () => {
          setConfirmDialogOpen(false)
          onConfirm()
          resolve(true)
        },
        cancelar: () => {
          setConfirmDialogOpen(false)
          onCancel?.()
          resolve(false)
        }
      })
      setConfirmDialogOpen(true)
    })
  }

  const handleRegistrarEntrada = async () => {
    if (!selectedEspacio || !placa.trim()) return

    if (!validarFormatoPlaca(placa)) {
      setSubmitError("Formato de placa inválido. Use: AAA-123 o AAA-1234")
      toast.error("Error en formato de placa", {
        description: "La placa debe tener el formato: 3 letras, guión, 3 o 4 números (ej: ABC-1234)",
        icon: <XCircle className="h-4 w-4" />,
      })
      return
    }

    // ✅ CAMBIO AQUÍ: Si hay deuda, abrir diálogo de deuda inmediatamente
    if (deudaInfo?.tieneDeuda) {
      setDeudaDialogOpen(true)
      return // Salir de la función aquí
    }

    const enHorarioNocturno = estaEnHorarioNocturno()

    // El resto del código sigue igual...
    if (esNocturno && !enHorarioNocturno) {
      const mensajeConfirmacion = `ATENCIÓN - EXCEPCIÓN DE TARIFA\n\n` +
        `Está marcando un vehículo como NOCTURNO fuera del horario establecido.\n\n` +
        `• Horario nocturno: ${config?.hora_inicio_nocturno} - ${config?.hora_fin_nocturno}\n` +
        `• Hora actual: ${new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}\n` +
        `• Tarifa nocturna: $${config?.precio_nocturno || '10.00'}\n\n` +
        `¿Desea aplicar tarifa nocturna como EXCEPCIÓN?\n\n` +
        `Solo use esta opción para clientes especiales que permanecerán toda la noche.`

      try {
        const confirmado = await mostrarConfirmacion(
          mensajeConfirmacion,
          () => {
            continuarRegistro()
          },
          () => {
            toast.info("Excepción cancelada", {
              description: "Se usará tarifa normal por horas.",
              icon: <Info className="h-4 w-4" />,
              duration: 3000,
            })
            setEsNocturno(false)
            setMostrarAdvertenciaNocturno(false)
          }
        )

        if (!confirmado) {
          return
        }

      } catch (error) {
        console.error("Error en confirmación:", error)
        return
      }
    } else {
      continuarRegistro()
    }
  }
  // ✅ Función para manejar vehículo con deuda
  const manejarVehiculoConDeuda = async () => {
    setDeudaDialogOpen(false)
    continuarRegistroConExcepcion()
  }

  // ✅ Función para registrar con excepción de deuda
  const continuarRegistroConExcepcion = async () => {
    setSubmitting(true)
    setSubmitError("")

    const toastId = toast.loading("Registrando entrada con excepción...", {
      description: `Vehículo con deuda: ${placa.toUpperCase()}`,
    })

    try {
      const resultado = await registrarEntradaConValidacionDeuda(placa.trim(), selectedEspacio, esNocturno)

      if (resultado.ok) {
        toast.success("Entrada registrada CON EXCEPCIÓN", {
          id: toastId,
          description: `Vehículo ${resultado.data.placa} registrado a pesar de tener deuda pendiente`,
          icon: <ShieldAlert className="h-4 w-4 text-amber-600" />,
          action: {
            label: "Imprimir Ticket",
            onClick: () => {
              imprimirTicketEntrada(resultado.data, esNocturno)
            },
          },
        })

        imprimirTicketEntradaConDeuda(resultado.data, esNocturno, deudaInfo!)

        await mutate()
        setDialogOpen(false)
        setPlaca("")
        setEsNocturno(false)
        setDeudaInfo(null)
        setSelectedEspacio(null)
      } else {
        toast.error("Error al registrar entrada", {
          id: toastId,
          description: resultado.message,
          icon: <XCircle className="h-4 w-4" />,
        })
        setSubmitError(resultado.message || "Error al registrar entrada")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al registrar entrada"
      toast.error("Error inesperado", {
        id: toastId,
        description: errorMessage,
        icon: <XCircle className="h-4 w-4" />,
      })
      setSubmitError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  // ✅ NUEVO: Función para procesar cobro de deuda
  const procesarCobroDeuda = async () => {
    if (!placa || !montoCobrado || !deudaInfo) return

    setCobrando(true)

    const toastId = toast.loading("Procesando cobro de deuda...", {
      description: `Placa: ${placa.toUpperCase()}`,
    })

    try {
      // 1. Marcar deuda como pagada
      const resultado = await pagarDeuda(placa)

      if (resultado.success) {
        // 2. Mostrar ticket de cobro
        imprimirTicketCobro(
          placa,
          parseFloat(montoCobrado),
          deudaInfo.totalDeuda,
          metodoPago
        )

        toast.success("✅ Deuda cobrada exitosamente", {
          id: toastId,
          description: `Placa ${placa.toUpperCase()} - $${deudaInfo.totalDeuda.toFixed(2)}`,
          icon: <CheckCircle className="h-4 w-4" />,
          action: {
            label: "Ver Detalles",
            onClick: () => {
              // Opcional: abrir historial
            },
          },
        })

        // 3. Actualizar estados
        setDeudaInfo(null)
        setCobroDialogOpen(false)
        setMontoCobrado("")
        setMetodoPago("efectivo")

        // 4. Actualizar verificación de deuda
        await verificarDeudaEnTiempoReal(placa)

        // 5. Si el usuario estaba intentando registrar entrada, mostrar mensaje
        if (selectedEspacio) {
          setTimeout(() => {
            toast.info("Ahora puede registrar la entrada", {
              description: "La deuda ha sido pagada, puede proceder con el registro.",
              icon: <CheckCircle className="h-4 w-4" />,
            })
          }, 1000)
        }
      } else {
        toast.error("Error al cobrar deuda", {
          id: toastId,
          description: resultado.message || "Error desconocido",
          icon: <XCircle className="h-4 w-4" />,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al procesar cobro"

      toast.error("Error inesperado", {
        id: toastId,
        description: errorMessage,
        icon: <XCircle className="h-4 w-4" />,
      })
    } finally {
      setCobrando(false)
    }
  }

  const continuarRegistro = async () => {
    setSubmitting(true)
    setSubmitError("")

    const toastId = toast.loading("Registrando entrada...", {
      description: `Vehículo: ${placa.toUpperCase()}`,
    })

    try {
      const resultado = await registrarEntradaConValidacionDeuda(placa.trim(), selectedEspacio, esNocturno)

      if (resultado.ok) {
        toast.success("Entrada registrada exitosamente", {
          id: toastId,
          description: `Vehículo ${resultado.data.placa} en espacio ${selectedEspacio}`,
          icon: <CheckCircle className="h-4 w-4" />,
          action: {
            label: "Imprimir Ticket",
            onClick: () => {
              imprimirTicketEntrada(resultado.data, esNocturno)
              toast.info("Imprimiendo ticket...", {
                description: "Se abrirá la ventana de impresión",
                icon: <Printer className="h-4 w-4" />,
              })
            },
          },
        })

        imprimirTicketEntrada(resultado.data, esNocturno)

        await mutate()
        setDialogOpen(false)
        setPlaca("")
        setEsNocturno(false)
        setDeudaInfo(null)
        setSelectedEspacio(null)
      } else {
        if (resultado.tieneDeuda) {
          toast.error(" VEHÍCULO CON DEUDA", {
            id: toastId,
            description: resultado.message,
            icon: <Ban className="h-4 w-4" />,
            duration: 8000,
            action: {
              label: "Ver Detalles",
              onClick: () => {
                setDeudaInfo(resultado.deudaInfo)
                setDeudaDialogOpen(true)
              }
            }
          });
          setDeudaInfo(resultado.deudaInfo)
        } else {
          toast.error("Error al registrar entrada", {
            id: toastId,
            description: resultado.message,
            icon: <XCircle className="h-4 w-4" />,
          })
        }
        setSubmitError(resultado.message || "Error al registrar entrada")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al registrar entrada"

      toast.error("Error inesperado", {
        id: toastId,
        description: errorMessage,
        icon: <XCircle className="h-4 w-4" />,
      })
      setSubmitError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const imprimirTicketEntrada = (vehiculo: any, esNocturno: boolean) => {
    const fechaEntrada = new Date(vehiculo.fecha_hora_entrada)
    const fecha = fechaEntrada.toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    const hora = fechaEntrada.toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })

    const printWindow = window.open("", "_blank", "width=72mm,height=600")
    if (!printWindow) {
      toast.error("No se pudo abrir ventana de impresión")
      return
    }

    printWindow.document.write(`
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket de Entrada</title>
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
          padding: 1mm;
          font-size: 10px;
          line-height: 1.1;
        }
        
        @media print {
          @page {
            size: 72mm auto;
            margin: 0;
          }
          
          body {
            width: 72mm !important;
            margin: 0 !important;
            padding: 1mm !important;
          }
        }
        
        .ticket {
          width: 100%;
          text-align: left;
        }
        
        .center {
          text-align: center;
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
        
        .large {
          font-size: 13px;
        }
        
        .separator {
          border: none;
          border-top: 1px dashed #000;
          margin: 2px 0;
        }
        
        .espacio {
          font-size: 16px;
          font-weight: bold;
          margin: 3px 0;
          text-align: center;
        }
        
        .placa {
          font-size: 12px;
          font-weight: bold;
          margin: 2px 0;
          text-align: center;
        }
        
        .tarifa {
          font-size: 10px;
          font-weight: bold;
          margin: 3px 0;
          text-align: center;
          text-transform: uppercase;
        }
        
        .info-basica {
          margin: 5px 0;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 1px 0;
        }
        
        .warning {
          font-size: 8px;
          margin: 4px 0;
          text-align: center;
          line-height: 1.2;
        }
        
        .footer {
          font-size: 7px;
          margin-top: 5px;
          padding-top: 3px;
          border-top: 1px dashed #000;
          text-align: center;
          line-height: 1.1;
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="center">
          <div class="bold large">HOTEL LA FAROLA</div>
          <div class="bold medium">TICKET DE ENTRADA</div>
          <div class="small">Parqueadero</div>
        </div>
        
        <div class="separator"></div>
        
        <div class="espacio">ESPACIO #${vehiculo.espacio_numero}</div>
        
        <div class="placa">${vehiculo.placa}</div>
        
        <div class="separator"></div>
        
        <div class="info-basica">
          <div class="info-row">
            <span class="bold">Fecha entrada:</span>
            <span>${fecha}</span>
          </div>
          <div class="info-row">
            <span class="bold">Hora entrada:</span>
            <span>${hora}</span>
          </div>
          <div class="info-row">
            <span class="bold">Tarifa:</span>
            <span>${esNocturno ? 'NOCTURNA' : 'NORMAL'}</span>
          </div>
        </div>
        
        <div class="separator"></div>
        
        <div class="warning">
          <div class="bold">CONSERVE ESTE TICKET</div>
          <div>Presentar para retirar su vehículo</div>
          <div class="bold">Multa por pérdida: $10.00</div>
        </div>
        
        <div class="footer">
          <div><span class="bold">Generado:</span> ${new Date().toLocaleTimeString("es-EC", { hour: '2-digit', minute: '2-digit' })}</div>
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

  // ✅ Función para imprimir ticket con advertencia de deuda
  const imprimirTicketEntradaConDeuda = (vehiculo: any, esNocturno: boolean, deudaInfo: DeudaInfo) => {
    const fechaEntrada = new Date()
    const fecha = fechaEntrada.toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    const hora = fechaEntrada.toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })

    const printWindow = window.open("", "_blank", "width=72mm,height=600")
    if (!printWindow) {
      toast.error("No se pudo abrir ventana de impresión")
      return
    }

    printWindow.document.write(`
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket de Entrada CON DEUDA</title>
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
          padding: 1mm;
          font-size: 10px;
          line-height: 1.1;
        }
        
        @media print {
          @page {
            size: 72mm auto;
            margin: 0;
          }
          
          body {
            width: 72mm !important;
            margin: 0 !important;
            padding: 1mm !important;
          }
        }
        
        .ticket {
          width: 100%;
          text-align: left;
        }
        
        .center {
          text-align: center;
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
        
        .large {
          font-size: 13px;
        }
        
        .separator {
          border: none;
          border-top: 1px dashed #000;
          margin: 2px 0;
        }
        
        .espacio {
          font-size: 16px;
          font-weight: bold;
          margin: 3px 0;
          text-align: center;
        }
        
        .placa {
          font-size: 12px;
          font-weight: bold;
          margin: 2px 0;
          text-align: center;
        }
        
        .deuda-alert {
          background-color: #fee;
          border: 1px solid #f00;
          border-radius: 2px;
          padding: 2px;
          margin: 3px 0;
          text-align: center;
        }
        
        .deuda-alert .title {
          font-size: 9px;
          font-weight: bold;
          color: #f00;
        }
        
        .deuda-alert .amount {
          font-size: 10px;
          font-weight: bold;
          color: #900;
        }
        
        .info-basica {
          margin: 5px 0;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 1px 0;
        }
        
        .warning {
          font-size: 8px;
          margin: 4px 0;
          text-align: center;
          line-height: 1.2;
        }
        
        .footer {
          font-size: 7px;
          margin-top: 5px;
          padding-top: 3px;
          border-top: 1px dashed #000;
          text-align: center;
          line-height: 1.1;
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="center">
          <div class="bold large">HOTEL LA FAROLA</div>
          <div class="bold medium">TICKET DE ENTRADA</div>
          <div class="small">Parqueadero</div>
        </div>
        
        <div class="separator"></div>
        
        <div class="deuda-alert">
          <div class="title">VEHÍCULO CON DEUDA PENDIENTE</div>
          <div class="amount">DEUDA: $${deudaInfo.totalDeuda.toFixed(2)}</div>
        </div>
        
        <div class="separator"></div>
        
        <div class="espacio">ESPACIO #${selectedEspacio}</div>
        
        <div class="placa">${vehiculo.placa || placa.toUpperCase()}</div>
        
        <div class="separator"></div>
        
        <div class="info-basica">
          <div class="info-row">
            <span class="bold">Fecha entrada:</span>
            <span>${fecha}</span>
          </div>
          <div class="info-row">
            <span class="bold">Hora entrada:</span>
            <span>${hora}</span>
          </div>
          <div class="info-row">
            <span class="bold">Tarifa:</span>
            <span>${esNocturno ? 'NOCTURNA' : 'NORMAL'}</span>
          </div>
          <div class="info-row">
            <span class="bold">Estado:</span>
            <span>CON DEUDA - REGISTRO EXCEPCIONAL</span>
          </div>
        </div>
        
        <div class="separator"></div>
        
        <div class="warning">
          <div class="bold"> VEHÍCULO CON DEUDA</div>
          <div>No se permitirá nueva entrada sin pago previo</div>
          <div class="bold">Contacte con administración</div>
        </div>
        
        <div class="footer">
          <div><span class="bold">Generado:</span> ${new Date().toLocaleTimeString("es-EC", { hour: '2-digit', minute: '2-digit' })}</div>
          <div>TICKET EXCEPCIONAL - CON DEUDA</div>
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

  // ✅ NUEVO: Función para imprimir ticket de cobro
  const imprimirTicketCobro = (
    placa: string,
    montoCobrado: number,
    totalDeuda: number,
    metodoPago: string
  ) => {
    const printWindow = window.open("", "_blank", "width=72mm,height=600")
    if (!printWindow) {
      toast.error("No se pudo abrir ventana de impresión")
      return
    }

    const cambio = montoCobrado > totalDeuda ? montoCobrado - totalDeuda : 0
    const fecha = new Date().toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    const hora = new Date().toLocaleTimeString("es-EC", {
      hour: '2-digit',
      minute: '2-digit'
    })

    printWindow.document.write(`
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Ticket de Cobro de Deuda</title>
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
        padding: 1mm;
        font-size: 10px;
        line-height: 1.1;
      }
      
      @media print {
        @page {
          size: 72mm auto;
          margin: 0;
        }
        
        body {
          width: 72mm !important;
          margin: 0 !important;
          padding: 1mm !important;
        }
      }
      
      .ticket {
        width: 100%;
        text-align: left;
      }
      
      .center {
        text-align: center;
      }
      
      .bold {
        font-weight: bold;
      }
      
      .separator {
        border: none;
        border-top: 1px dashed #000;
        margin: 2px 0;
      }
      
      .header {
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 2px;
      }
      
      .subtitle {
        font-size: 11px;
        margin-bottom: 3px;
      }
      
      .deuda-info {
        background-color: #e8f5e8;
        border: 1px solid #4caf50;
        border-radius: 2px;
        padding: 3px;
        margin: 3px 0;
      }
      
      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 1px 0;
      }
      
      .total-cobro {
        font-size: 12px;
        font-weight: bold;
        margin: 3px 0;
        padding: 2px 0;
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
      }
      
      .footer {
        font-size: 8px;
        margin-top: 5px;
        padding-top: 3px;
        border-top: 1px dashed #000;
        text-align: center;
        line-height: 1.1;
      }
    </style>
  </head>
  <body>
    <div class="ticket">
      <div class="center">
        <div class="header">HOTEL LA FAROLA</div>
        <div class="subtitle">COMPROBANTE DE COBRO</div>
        <div class="subtitle">DEUDA PAGADA</div>
      </div>
      
      <div class="separator"></div>
      
      <div class="center">
        <div class="bold" style="font-size: 14px;">${placa.toUpperCase()}</div>
      </div>
      
      <div class="separator"></div>
      
      <div class="deuda-info">
        <div class="info-row">
          <span>Estado anterior:</span>
          <span class="bold">CON DEUDA</span>
        </div>
        <div class="info-row">
          <span>Estado actual:</span>
          <span class="bold" style="color: #4caf50;">DEUDA PAGADA</span>
        </div>
      </div>
      
      <div class="separator"></div>
      
      <div class="info-row">
        <span>Fecha cobro:</span>
        <span>${fecha}</span>
      </div>
      <div class="info-row">
        <span>Hora cobro:</span>
        <span>${hora}</span>
      </div>
      <div class="info-row">
        <span>Método pago:</span>
        <span class="bold">${metodoPago.toUpperCase()}</span>
      </div>
      
      <div class="separator"></div>
      
      <div class="info-row">
        <span>Total deuda:</span>
        <span class="bold">$${totalDeuda.toFixed(2)}</span>
      </div>
      <div class="info-row">
        <span>Monto cobrado:</span>
        <span class="bold">$${montoCobrado.toFixed(2)}</span>
      </div>
      
      ${cambio > 0 ? `
        <div class="info-row">
          <span>Cambio:</span>
          <span class="bold">$${cambio.toFixed(2)}</span>
        </div>
      ` : ''}
      
      <div class="separator"></div>
      
      <div class="total-cobro center">
        ✅ DEUDA CANCELADA ✅
      </div>
      
      <div class="footer">
        <div>Gracias por su pago</div>
        <div>Ahora puede registrar nueva entrada</div>
        <div>${new Date().toLocaleTimeString("es-EC", { hour: '2-digit', minute: '2-digit' })}</div>
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

  const formatEntrada = (entrada: string) => {
    const date = new Date(entrada)
    return date.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })
  }

  // Determinar si estamos en horario nocturno
  const enHorarioNocturno = estaEnHorarioNocturno()

  // ✅ Sincronizar mostrarAdvertenciaNocturna con esNocturno
  useEffect(() => {
    if (esNocturno && !enHorarioNocturno) {
      setMostrarAdvertenciaNocturno(true)
    } else {
      setMostrarAdvertenciaNocturno(false)
    }
  }, [esNocturno, enHorarioNocturno])

  // Mostrar toast de horario cuando cambia
  useEffect(() => {
    if (config) {
      const ahora = new Date()
      const horaActual = ahora.getHours()
      const minutoActual = ahora.getMinutes()
      const horaFormateada = ahora.toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit'
      })

      if (enHorarioNocturno) {
        toast.info("🌙 Horario Nocturno Activo", {
          description: `Hora actual: ${horaFormateada} - Tarifa nocturna: $${config.precio_nocturno}`,
          duration: 5000,
          icon: <Moon className="h-4 w-4" />,
        })
      }
    }
  }, [enHorarioNocturno, config])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Espacios de Estacionamiento</CardTitle>
          <CardDescription>Cargando espacios...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Espacios de Estacionamiento</CardTitle>
          <CardDescription className="text-destructive">
            Error al conectar con el servidor. Verifica que el backend esté corriendo en http://127.0.0.1:8000
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const espaciosOcupados = espacios?.filter((e) => e.ocupado).length || 0
  const espaciosLibres = 24 - espaciosOcupados
  const vehiculosNocturnos = espacios?.filter(e => e.ocupado && e.es_nocturno).length || 0
  const vehiculosNormales = espacios?.filter(e => e.ocupado && !e.es_nocturno).length || 0

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Espacios de Estacionamiento</CardTitle>
              <CardDescription>Click en un espacio libre para registrar entrada</CardDescription>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Libres: {espaciosLibres}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <span>Ocupados: {espaciosOcupados}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span>Nocturnos: {vehiculosNocturnos}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span>Normales: {vehiculosNormales}</span>
              </div>
              {config && (
                <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${enHorarioNocturno ? 'bg-amber-500/20 text-amber-700' : 'bg-blue-500/20 text-blue-700'}`}>
                  <div className={`h-2 w-2 rounded-full ${enHorarioNocturno ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`} />
                  <span className="flex items-center gap-1">
                    {enHorarioNocturno ? (
                      <>
                        <Moon className="h-3 w-3" />
                        <span>Nocturno</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-3 w-3" />
                        <span>Normal</span>
                      </>
                    )}
                    <span className="text-xs opacity-75">
                      ({config.hora_inicio_nocturno}-{config.hora_fin_nocturno})
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {espacios?.map((espacio) => (
              <button
                key={espacio.numero}
                onClick={() => handleEspacioClick(espacio)}
                className={cn(
                  "relative h-24 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1",
                  espacio.ocupado
                    ? espacio.es_nocturno
                      ? "bg-amber-500/10 border-amber-500/50 cursor-pointer hover:bg-amber-500/20 hover:border-amber-500"
                      : "bg-rose-500/10 border-rose-500/50 cursor-pointer hover:bg-rose-500/20 hover:border-rose-500"
                    : "bg-emerald-500/10 border-emerald-500/50 hover:bg-emerald-500/20 hover:border-emerald-500 cursor-pointer",
                )}
              >
                <span className={cn(
                  "text-2xl font-bold",
                  espacio.ocupado
                    ? espacio.es_nocturno
                      ? "text-amber-600"
                      : "text-rose-600"
                    : "text-emerald-600"
                )}>
                  {espacio.numero}
                </span>
                {espacio.ocupado ? (
                  <>
                    <div className="flex items-center gap-1">
                      <Car className={cn(
                        "h-4 w-4",
                        espacio.es_nocturno ? "text-amber-500" : "text-rose-500"
                      )} />
                      {espacio.es_nocturno && (
                        <div className="flex items-center gap-0.5">
                          <Moon className="h-3 w-3 text-amber-500" />
                          <span className="text-[8px] font-medium text-amber-600">NOCT</span>
                        </div>
                      )}
                      {!espacio.es_nocturno && espacio.ocupado && (
                        <div className="flex items-center gap-0.5">
                          <Sun className="h-3 w-3 text-blue-500" />
                          <span className="text-[8px] font-medium text-blue-600">NORM</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-mono">
                      {espacio.placa}
                    </span>
                    {espacio.entrada && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatEntrada(espacio.entrada)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-emerald-600">Disponible</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Espacio Libre</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span>Vehículo Nocturno</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <span>Vehículo Normal</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo principal para registrar entrada */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Entrada - Espacio {selectedEspacio}</DialogTitle>
            <DialogDescription>Ingrese la placa del vehículo para registrar la entrada</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="placa">Placa del Vehículo</Label>
              <div className="relative">
                <Input
                  id="placa"
                  placeholder="ABC-1234"
                  value={placa}
                  onChange={handlePlacaChange}
                  onBlur={handlePlacaBlur}
                  className="font-mono text-lg uppercase pr-10"
                  maxLength={8}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && placa.trim() && !submitting) {
                      handleRegistrarEntrada()
                    }
                  }}
                />
                {verificandoDeuda && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span>Formato: 3 letras, guión, 3 o 4 números (ej: ABC-1234)</span>
              </div>
            </div>

            {deudaInfo?.tieneDeuda && (
              <div className="rounded-lg border border-red-500 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <Ban className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="text-red-700 text-sm">
                    <strong className="block mb-1">🚫 VEHÍCULO CON DEUDA PENDIENTE</strong>
                    <p>Esta placa tiene {deudaInfo.cantidadDeudas} deuda(s) pendiente(s).</p>
                    <p className="mt-1 font-bold">Total adeudado: ${deudaInfo.totalDeuda.toFixed(2)}</p>
                    <p className="mt-1 text-xs">No se permitirá el registro hasta que se pague la deuda.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${esNocturno ? 'bg-amber-500/20' : 'bg-gray-200'}`}>
                  {esNocturno ? (
                    <Moon className="h-5 w-5 text-amber-600" />
                  ) : (
                    <Sun className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                <div>
                  <Label htmlFor="nocturno" className="font-medium">
                    {enHorarioNocturno ? "Tarifa Nocturna" : "Marcar como Nocturno (Excepción)"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {esNocturno
                      ? `Precio fijo: $${config?.precio_nocturno || '10.00'}`
                      : "Tarifa normal por horas progresiva"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Horario nocturno configurado: {config?.hora_inicio_nocturno} - {config?.hora_fin_nocturno}
                  </p>
                </div>
              </div>
              <Switch
                id="nocturno"
                checked={esNocturno}
                onCheckedChange={(checked) => {
                  setEsNocturno(checked)
                }}
                className="data-[state=checked]:bg-amber-600"
                disabled={deudaInfo?.tieneDeuda}
              />
            </div>

            {mostrarAdvertenciaNocturna && (
              <div className="rounded-lg border border-amber-500 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-amber-700 text-sm">
                    <strong className="block mb-1">Excepción de tarifa</strong>
                    <p>Está marcando tarifa nocturna fuera del horario establecido.</p>
                    <p className="mt-1">Solo use esta opción para clientes especiales que permanecerán toda la noche.</p>
                  </div>
                </div>
              </div>
            )}

            {enHorarioNocturno && !esNocturno && (
              <div className="rounded-lg border border-blue-500 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-blue-700 text-sm">
                    <strong className="block mb-1">ℹ️ Tarifa Normal Seleccionada</strong>
                    <p>En horario nocturno pero ha seleccionado tarifa normal por horas.</p>
                    <p className="mt-1">El cliente pagará por tiempo transcurrido.</p>
                  </div>
                </div>
              </div>
            )}

            <div className={`p-3 border rounded-lg ${enHorarioNocturno ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Info className={`h-4 w-4 ${enHorarioNocturno ? 'text-amber-600' : 'text-blue-600'}`} />
                <span className={`text-sm font-medium ${enHorarioNocturno ? 'text-amber-700' : 'text-blue-700'}`}>
                  {enHorarioNocturno ? '🌙 Horario Nocturno Activo' : '☀️ Horario Normal'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Hora actual: {new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}<br />
                Configuración: {config?.hora_inicio_nocturno} - {config?.hora_fin_nocturno}
              </p>
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleRegistrarEntrada}
              disabled={!placa.trim() || submitting || !validarFormatoPlaca(placa)} // ⬅️ QUITÉ `|| deudaInfo?.tieneDeuda`
              className={`${esNocturno ? "bg-amber-600 hover:bg-amber-700" : ""} ${deudaInfo?.tieneDeuda ? "bg-red-600 hover:bg-red-700 text-white" : ""}`} // ⬅️ AÑADÍ CLASE PARA DEUDAS
            >
              {submitting
                ? "Registrando..."
                : deudaInfo?.tieneDeuda
                  ? "🚫 VEHÍCULO CON DEUDA"
                  : esNocturno
                    ? `Registrar ${!enHorarioNocturno ? '(Excepción) ' : ''}(Nocturno - $${config?.precio_nocturno || '10.00'})`
                    : "Registrar Entrada"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ DIÁLOGO DE DEUDA PENDIENTE - BOTONES ARREGLADOS */}
      <Dialog open={deudaDialogOpen} onOpenChange={setDeudaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Ban className="h-5 w-5" />
              VEHÍCULO CON DEUDA PENDIENTE
            </DialogTitle>
            <DialogDescription className="text-red-600">
              La placa <span className="font-bold">{placa.toUpperCase()}</span> tiene deudas pendientes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Deudas pendientes:</span>
                  <span className="font-bold text-red-700">{deudaInfo?.cantidadDeudas || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total adeudado:</span>
                  <span className="font-bold text-red-700 text-lg">${deudaInfo?.totalDeuda?.toFixed(2) || '0.00'}</span>
                </div>
                {deudaInfo?.ultimaSalida && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Última salida:</span>
                    <span className="text-sm">
                      {new Date(deudaInfo.ultimaSalida).toLocaleDateString('es-EC')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">¿Qué desea hacer?</p>
              <ul className="space-y-2 text-xs text-gray-500">
                <li className="flex items-start gap-2">
                  <Ban className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Rechazar entrada:</strong> El vehículo no podrá ingresar hasta pagar la deuda.</span>
                </li>
                <li className="flex items-start gap-2">
                  <DollarSign className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Cobrar deuda:</strong> Registrar pago y permitir entrada.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* ✅ BOTONES ARREGLADOS - DENTRO DEL DIALOGFOOTER */}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeudaDialogOpen(false)
                toast.info("Entrada rechazada", {
                  description: `Vehículo ${placa.toUpperCase()} no puede ingresar por deuda pendiente.`,
                  icon: <Ban className="h-4 w-4" />,
                })
              }}
              className="w-full sm:flex-1"
            >
              <Ban className="h-4 w-4 mr-2" />
              Rechazar Entrada
            </Button>

            <Button
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:flex-1"
              onClick={() => {
                setDeudaDialogOpen(false)
                setTimeout(() => {
                  setCobroDialogOpen(true)
                }, 300)
              }}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Cobrar Deuda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ DIÁLOGO PARA COBRO DE DEUDA - COMPACTO Y ARREGLADO */}
      <Dialog open={cobroDialogOpen} onOpenChange={setCobroDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2 text-green-700">
              <DollarSign className="h-5 w-5" />
              COBRAR DEUDA
            </DialogTitle>
            <DialogDescription className="text-green-600">
              Placa: <span className="font-bold">{placa.toUpperCase()}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Resumen compacto */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Total a cobrar</div>
                <div className="text-3xl font-bold text-green-700">
                  ${deudaInfo?.totalDeuda?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {deudaInfo?.cantidadDeudas || 0} deuda(s) pendiente(s)
                </div>
              </div>
            </div>

            {/* Mensaje de confirmación */}
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-700">
                ¿Confirmar cobro en efectivo?
              </p>
            </div>
          </div>

          {/* ✅ BOTONES ARREGLADOS - DENTRO DEL DIALOGFOOTER */}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setCobroDialogOpen(false)}
              disabled={cobrando}
              className="w-full sm:flex-1"
            >
              Cancelar
            </Button>

            <Button
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:flex-1"
              onClick={async () => {
                if (!placa || !deudaInfo) return

                setCobrando(true)
                const toastId = toast.loading("Cobrando deuda...")

                try {
                  const resultado = await pagarDeuda(placa)

                  if (resultado.success) {
                    toast.success("✅ Deuda cobrada exitosamente", {
                      id: toastId,
                      description: `${placa.toUpperCase()} - $${deudaInfo.totalDeuda.toFixed(2)} pagado`,
                    })
                    setDeudaInfo(null)
                    setCobroDialogOpen(false)
                    await verificarDeudaEnTiempoReal(placa)
                  } else {
                    toast.error("❌ Error al cobrar", {
                      id: toastId,
                      description: resultado.message || "Error desconocido",
                    })
                  }
                } catch (error) {
                  toast.error("❌ Error", {
                    id: toastId,
                    description: "No se pudo procesar el cobro",
                  })
                } finally {
                  setCobrando(false)
                }
              }}
              disabled={cobrando}
            >
              {cobrando ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cobrando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Cobrar ${deudaInfo?.totalDeuda?.toFixed(2) || '0.00'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Diálogo de confirmación para excepción nocturna */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              ATENCIÓN - EXCEPCIÓN DE TARIFA
            </DialogTitle>
            <DialogDescription className="text-amber-600">
              Está marcando un vehículo como NOCTURNO fuera del horario establecido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <div className="space-y-1 text-sm">
                <p><strong>• Horario nocturno:</strong> {config?.hora_inicio_nocturno} - {config?.hora_fin_nocturno}</p>
                <p><strong>• Hora actual:</strong> {new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</p>
                <p><strong>• Tarifa nocturna:</strong> ${config?.precio_nocturno || '10.00'}</p>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p className="font-medium">¿Desea aplicar tarifa nocturna como EXCEPCIÓN?</p>
              <p className="text-xs text-gray-500 mt-1">
                Solo use esta opción para clientes especiales que permanecerán toda la noche.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (confirmacionPendiente?.cancelar) {
                  confirmacionPendiente.cancelar()
                } else {
                  setConfirmDialogOpen(false)
                }
              }}
            >
              Cancelar (Usar Tarifa Normal)
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                if (confirmacionPendiente?.accion) {
                  confirmacionPendiente.accion()
                } else {
                  setConfirmDialogOpen(false)
                }
              }}
            >
              Aceptar Excepción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}