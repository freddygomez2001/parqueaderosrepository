// Datos de demostración para probar el sistema sin backend
import type { Espacio, VehiculoBusqueda, Factura, HistorialFactura, Configuracion } from "./api"

// Configuración por defecto (igual que tu backend)
export const DEMO_CONFIG: Configuracion = {
  id: 1,
  precio_media_hora: 0.5,
  precio_hora_adicional: 1.0,
  precio_nocturno: 10.0,
  hora_inicio_nocturno: "19:00",
  hora_fin_nocturno: "07:00",
  actualizado_en: new Date().toISOString(),
}

// Estado inicial de los espacios con algunos ocupados
const now = new Date()
const hace2Horas = new Date(now.getTime() - 2 * 60 * 60 * 1000)
const hace45Min = new Date(now.getTime() - 45 * 60 * 1000)
const hace5Horas = new Date(now.getTime() - 5 * 60 * 60 * 1000)
const haceNoche = new Date(now.getTime() - 14 * 60 * 60 * 1000) // Desde ayer en la noche

export const demoEspacios: Espacio[] = [
  { numero: 1, ocupado: true, placa: "ABC-1234", entrada: hace2Horas.toISOString() },
  { numero: 2, ocupado: false, placa: null, entrada: null },
  { numero: 3, ocupado: true, placa: "XYZ-5678", entrada: hace45Min.toISOString() },
  { numero: 4, ocupado: false, placa: null, entrada: null },
  { numero: 5, ocupado: true, placa: "DEF-9012", entrada: hace5Horas.toISOString() },
  { numero: 6, ocupado: false, placa: null, entrada: null },
  { numero: 7, ocupado: true, placa: "GHI-3456", entrada: haceNoche.toISOString() },
  { numero: 8, ocupado: false, placa: null, entrada: null },
  { numero: 9, ocupado: false, placa: null, entrada: null },
  { numero: 10, ocupado: false, placa: null, entrada: null },
  { numero: 11, ocupado: false, placa: null, entrada: null },
  { numero: 12, ocupado: false, placa: null, entrada: null },
  { numero: 13, ocupado: false, placa: null, entrada: null },
  { numero: 14, ocupado: false, placa: null, entrada: null },
  { numero: 15, ocupado: false, placa: null, entrada: null },
]

// Historial de facturas de ejemplo
export const demoHistorial: HistorialFactura[] = [
  {
    id: 1,
    vehiculo_id: 101,
    placa: "JKL-7890",
    espacio_numero: 2,
    fecha_hora_entrada: new Date(now.getTime() - 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000).toISOString(),
    fecha_hora_salida: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    tiempo_total_minutos: 180,
    costo_total: 3.5,
    detalles_cobro: "Primera media hora: $0.50 | 3 hora(s) adicional(es): $3.00",
    fecha_generacion: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    vehiculo_id: 102,
    placa: "MNO-1234",
    espacio_numero: 5,
    fecha_hora_entrada: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
    fecha_hora_salida: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
    tiempo_total_minutos: 720,
    costo_total: 10.0,
    detalles_cobro: "Tarifa nocturna: $10.00",
    fecha_generacion: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    vehiculo_id: 103,
    placa: "PQR-5678",
    espacio_numero: 8,
    fecha_hora_entrada: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    fecha_hora_salida: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    tiempo_total_minutos: 60,
    costo_total: 1.5,
    detalles_cobro: "Primera media hora: $0.50 | 1 hora(s) adicional(es): $1.00",
    fecha_generacion: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
  },
]

let nextId = 4
let nextVehiculoId = 104

// Calculadora de precios (igual que tu backend)
function esPeriodoNocturno(momento: Date, config: Configuracion): boolean {
  const hora = momento.getHours()
  const minutos = momento.getMinutes()
  const horaActual = hora + minutos / 60

  const [inicioH, inicioM] = config.hora_inicio_nocturno.split(":").map(Number)
  const [finH, finM] = config.hora_fin_nocturno.split(":").map(Number)
  const inicioNocturno = inicioH + inicioM / 60
  const finNocturno = finH + finM / 60

  // El período nocturno cruza medianoche (19:00 a 07:00)
  if (inicioNocturno > finNocturno) {
    return horaActual >= inicioNocturno || horaActual < finNocturno
  }
  return horaActual >= inicioNocturno && horaActual < finNocturno
}

export function calcularCosto(fechaEntrada: Date, fechaSalida: Date, config: Configuracion) {
  const diffMs = fechaSalida.getTime() - fechaEntrada.getTime()
  const minutosTotales = Math.floor(diffMs / (1000 * 60))

  if (minutosTotales <= 0) {
    return { costo: 0, minutos: 0, detalles: "Error en el cálculo de tiempo" }
  }

  let costoTotal = 0
  const detalles: string[] = []

  // Verificar si incluye período nocturno completo (12 horas)
  const horasEstacionado = minutosTotales / 60
  const entradaNocturna = esPeriodoNocturno(fechaEntrada, config)
  const salidaNocturna = esPeriodoNocturno(fechaSalida, config)

  // Si estuvo más de 10 horas y cruzó la noche, aplicar tarifa nocturna
  if (horasEstacionado >= 10 && (entradaNocturna || salidaNocturna)) {
    costoTotal = config.precio_nocturno
    detalles.push(`Tarifa nocturna: $${config.precio_nocturno.toFixed(2)}`)

    // Si hay horas adicionales después del período nocturno
    const horasExtras = Math.max(0, horasEstacionado - 12)
    if (horasExtras > 0) {
      const costoExtras = Math.ceil(horasExtras) * config.precio_hora_adicional
      costoTotal += costoExtras
      detalles.push(`${Math.ceil(horasExtras)} hora(s) adicional(es): $${costoExtras.toFixed(2)}`)
    }
  } else {
    // Tarifa diurna normal
    if (minutosTotales <= 30) {
      costoTotal = config.precio_media_hora
      detalles.push(`Primera media hora: $${config.precio_media_hora.toFixed(2)}`)
    } else {
      // Primera media hora
      costoTotal = config.precio_media_hora
      detalles.push(`Primera media hora: $${config.precio_media_hora.toFixed(2)}`)

      // Horas adicionales
      const minutosRestantes = minutosTotales - 30
      const horasAdicionales = Math.ceil(minutosRestantes / 60)
      const costoHoras = horasAdicionales * config.precio_hora_adicional
      costoTotal += costoHoras
      detalles.push(`${horasAdicionales} hora(s) adicional(es): $${costoHoras.toFixed(2)}`)
    }
  }

  return {
    costo: Math.round(costoTotal * 100) / 100,
    minutos: minutosTotales,
    detalles: detalles.join(" | "),
  }
}

export function formatearTiempo(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60
  return `${horas}h ${mins}m`
}

// Funciones simuladas de la API
export function demoObtenerEspacios(): Espacio[] {
  return [...demoEspacios]
}

export function demoRegistrarEntrada(placa: string, espacioNumero: number) {
  const espacio = demoEspacios.find((e) => e.numero === espacioNumero)
  if (!espacio) throw new Error("Espacio no encontrado")
  if (espacio.ocupado) throw new Error(`El espacio ${espacioNumero} ya está ocupado`)

  const yaEstacionado = demoEspacios.find((e) => e.placa === placa.toUpperCase())
  if (yaEstacionado) throw new Error(`El vehículo ${placa} ya está estacionado en el espacio ${yaEstacionado.numero}`)

  espacio.ocupado = true
  espacio.placa = placa.toUpperCase()
  espacio.entrada = new Date().toISOString()

  return {
    id: nextVehiculoId++,
    placa: placa.toUpperCase(),
    espacio_numero: espacioNumero,
    fecha_hora_entrada: espacio.entrada,
    fecha_hora_salida: null,
    costo_total: null,
    estado: "activo",
    creado_en: new Date().toISOString(),
  }
}

export function demoBuscarVehiculo(placa: string): VehiculoBusqueda {
  const espacio = demoEspacios.find((e) => e.placa === placa.toUpperCase())
  if (!espacio || !espacio.entrada) throw new Error("Vehículo no encontrado")

  const calculo = calcularCosto(new Date(espacio.entrada), new Date(), DEMO_CONFIG)

  return {
    id: nextVehiculoId,
    placa: espacio.placa!,
    espacio_numero: espacio.numero,
    fecha_hora_entrada: espacio.entrada,
    costo_estimado: calculo.costo,
    tiempo_estimado: formatearTiempo(calculo.minutos),
    detalles: calculo.detalles,
  }
}

export function demoRegistrarSalida(placa: string): { success: boolean; factura: Factura } {
  const espacio = demoEspacios.find((e) => e.placa === placa.toUpperCase())
  if (!espacio || !espacio.entrada) throw new Error("Vehículo no encontrado")

  const fechaEntrada = new Date(espacio.entrada)
  const fechaSalida = new Date()
  const calculo = calcularCosto(fechaEntrada, fechaSalida, DEMO_CONFIG)

  const factura: Factura = {
    placa: espacio.placa!,
    espacio: espacio.numero,
    entrada: espacio.entrada,
    salida: fechaSalida.toISOString(),
    tiempo_total: formatearTiempo(calculo.minutos),
    costo_total: calculo.costo,
    detalles: calculo.detalles,
  }

  // Agregar al historial
  demoHistorial.unshift({
    id: nextId++,
    vehiculo_id: nextVehiculoId++,
    placa: espacio.placa!,
    espacio_numero: espacio.numero,
    fecha_hora_entrada: espacio.entrada,
    fecha_hora_salida: fechaSalida.toISOString(),
    tiempo_total_minutos: calculo.minutos,
    costo_total: calculo.costo,
    detalles_cobro: calculo.detalles,
    fecha_generacion: fechaSalida.toISOString(),
  })

  // Liberar espacio
  espacio.ocupado = false
  espacio.placa = null
  espacio.entrada = null

  return { success: true, factura }
}

export function demoObtenerHistorial(fecha?: string) {
  if (fecha) {
    const fechaBuscada = new Date(fecha).toDateString()
    return demoHistorial.filter((f) => new Date(f.fecha_generacion).toDateString() === fechaBuscada)
  }
  return [...demoHistorial]
}

export function demoObtenerReporteDiario(fecha?: string) {
  const fechaReporte = fecha ? new Date(fecha) : new Date()
  const fechaStr = fechaReporte.toDateString()

  const facturasDelDia = demoHistorial.filter((f) => new Date(f.fecha_generacion).toDateString() === fechaStr)

  const totalVehiculos = facturasDelDia.length
  const totalIngresos = facturasDelDia.reduce((sum, f) => sum + f.costo_total, 0)

  return {
    fecha: fechaReporte.toISOString().split("T")[0],
    total_vehiculos: totalVehiculos,
    total_ingresos: totalIngresos,
  }
}
