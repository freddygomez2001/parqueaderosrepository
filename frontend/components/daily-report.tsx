"use client"

import { useState, useMemo, useEffect } from "react"
import useSWR from "swr"
import { obtenerReporteDiario, obtenerReporteDetallado } from "@/servicios/reporteService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart3, 
  Calendar, 
  DollarSign, 
  Car, 
  TrendingUp,
  PieChart,
  BarChart,
  Clock,
  Moon,
  Sun,
  AlertTriangle,
  ShieldOff,
  TrendingDown
} from "lucide-react"

// Tipos para los reportes
interface ReporteDiario {
  fecha: string
  total_vehiculos: number
  ingresos_total: number
}

interface EstadisticasNoPagadas {
  total_no_pagados: number
  nocturnos_no_pagados: number
  diurnos_no_pagados: number
  perdida_total: number
  vehiculos_nocturnos_no_pagados: number
}

interface ReporteDetallado {
  fecha: string
  vehiculos_nocturnos: number
  vehiculos_diurnos: number
  ingresos_nocturnos: number
  ingresos_diurnos: number
  horas_pico: Array<{ hora: string, cantidad: number }>
  espacios_mas_utilizados: Array<{ espacio: number, usos: number }>
  distribucion_tiempo: {
    menos_1h: number
    entre_1h_3h: number
    entre_3h_6h: number
    mas_6h: number
    nocturnos: number
  }
  // ✅ NUEVO: Estadísticas de no pagados
  estadisticas_no_pagadas?: EstadisticasNoPagadas
}

export function DailyReport() {
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0])
  const [searchFecha, setSearchFecha] = useState<string | null>(null)

  // Cargar datos al montar el componente
  useEffect(() => {
    setSearchFecha(fecha)
  }, [])

  // Obtener reporte diario básico
  const {
    data: reporte,
    error,
    isLoading,
  } = useSWR<ReporteDiario>(
    searchFecha ? ["reporte-diario", searchFecha] : null,
    async () => {
      // @ts-ignore - JS function with loose types
      return await obtenerReporteDiario(searchFecha)
    },
    { refreshInterval: 60000 } // Actualizar cada minuto
  )

  // Obtener reporte detallado
  const {
    data: reporteDetallado,
    isLoading: isLoadingDetallado,
  } = useSWR<ReporteDetallado>(
    searchFecha ? ["reporte-detallado", searchFecha] : null,
    async () => {
      // @ts-ignore - JS function with loose types
      return await obtenerReporteDetallado(searchFecha)
    },
    { refreshInterval: 60000 }
  )

  // Calcular totales incluyendo no pagados
  const totalesConNoPagados = useMemo(() => {
    if (!reporte || !reporteDetallado) return null
    
    const noPagados = reporteDetallado.estadisticas_no_pagadas || {
      total_no_pagados: 0,
      nocturnos_no_pagados: 0,
      diurnos_no_pagados: 0,
      perdida_total: 0,
      vehiculos_nocturnos_no_pagados: 0
    }
    
    // Vehículos totales (incluyendo no pagados)
    const vehiculosTotales = reporte.total_vehiculos + noPagados.total_no_pagados
    
    // Ingresos potenciales (incluyendo no pagados)
    const ingresosPotenciales = reporte.ingresos_total + noPagados.perdida_total
    
    return {
      vehiculosTotales,
      ingresosPotenciales,
      ...noPagados
    }
  }, [reporte, reporteDetallado])

  // Datos para gráficos
  const chartData = useMemo(() => {
    if (!reporte || !reporteDetallado) return null

    const noPagados = reporteDetallado.estadisticas_no_pagadas || {
      total_no_pagados: 0,
      nocturnos_no_pagados: 0,
      diurnos_no_pagados: 0,
      perdida_total: 0
    }

    return {
      // Gráfico de pastel - Distribución de vehículos
      distribucionVehiculos: [
        { name: 'Nocturnos', value: reporteDetallado.vehiculos_nocturnos, color: '#f59e0b' },
        { name: 'Diurnos', value: reporteDetallado.vehiculos_diurnos, color: '#3b82f6' }
      ],

      // Gráfico de pastel - Distribución de ingresos
      distribucionIngresos: [
        { name: 'Nocturnos', value: reporteDetallado.ingresos_nocturnos, color: '#d97706' },
        { name: 'Diurnos', value: reporteDetallado.ingresos_diurnos, color: '#1d4ed8' }
      ],

      // ✅ NUEVO: Gráfico de pastel - Vehículos pagados vs no pagados
      distribucionPago: [
        { name: 'Pagados', value: reporte.total_vehiculos, color: '#10b981' },
        { name: 'No Pagados', value: noPagados.total_no_pagados, color: '#ef4444' }
      ],

      // ✅ NUEVO: Gráfico de pastel - Distribución de no pagados
      distribucionNoPagados: [
        { name: 'Nocturnos No Pagados', value: noPagados.nocturnos_no_pagados, color: '#f59e0b' },
        { name: 'Diurnos No Pagados', value: noPagados.diurnos_no_pagados, color: '#3b82f6' }
      ],

      // Gráfico de barras - Horas pico
      horasPico: reporteDetallado.horas_pico || [],

      // Gráfico de barras - Espacios más utilizados
      espaciosUtilizados: reporteDetallado.espacios_mas_utilizados || [],

      // Gráfico de pastel - Distribución de tiempo
      distribucionTiempo: [
        { name: '< 1h', value: reporteDetallado.distribucion_tiempo.menos_1h, color: '#10b981' },
        { name: '1-3h', value: reporteDetallado.distribucion_tiempo.entre_1h_3h, color: '#3b82f6' },
        { name: '3-6h', value: reporteDetallado.distribucion_tiempo.entre_3h_6h, color: '#8b5cf6' },
        { name: '> 6h', value: reporteDetallado.distribucion_tiempo.mas_6h, color: '#ef4444' },
        { name: 'Nocturnos', value: reporteDetallado.distribucion_tiempo.nocturnos, color: '#f59e0b' }
      ],

      // ✅ NUEVO: Datos de pérdidas
      datosPerdida: {
        perdida_total: noPagados.perdida_total,
        vehiculos_no_pagados: noPagados.total_no_pagados,
        porcentaje_perdida: reporte.ingresos_total > 0 
          ? (noPagados.perdida_total / (reporte.ingresos_total + noPagados.perdida_total)) * 100 
          : 0
      }
    }
  }, [reporte, reporteDetallado])

  const handleBuscar = () => {
    setSearchFecha(fecha)
  }

  const handleHoy = () => {
    const hoy = new Date().toISOString().split("T")[0]
    setFecha(hoy)
    setSearchFecha(hoy)
  }

  // Función para renderizar gráfico de pastel mejorado
  const renderPieChart = (data: Array<{ name: string, value: number, color: string }>, title: string) => {
    if (!data || data.length === 0) {
      return <div className="text-center text-muted-foreground py-8">No hay datos disponibles</div>
    }
    
    const total = data.reduce((sum, item) => sum + item.value, 0)
    if (total === 0) {
      return <div className="text-center text-muted-foreground py-8">No hay datos para este período</div>
    }
    
    let accumulatedAngle = -90

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-center text-lg">{title}</h4>
        <div className="flex flex-col items-center">
          <div className="relative" style={{ width: '220px', height: '220px' }}>
            <svg width="220" height="220" viewBox="0 0 100 100">
              {data.map((item, index) => {
                if (item.value === 0) return null
                
                const percentage = (item.value / total) * 100
                const angle = (percentage / 100) * 360
                const largeArcFlag = angle > 180 ? 1 : 0
                
                const x1 = 50 + 45 * Math.cos((accumulatedAngle * Math.PI) / 180)
                const y1 = 50 + 45 * Math.sin((accumulatedAngle * Math.PI) / 180)
                
                const x2 = 50 + 45 * Math.cos(((accumulatedAngle + angle) * Math.PI) / 180)
                const y2 = 50 + 45 * Math.sin(((accumulatedAngle + angle) * Math.PI) / 180)
                
                const path = `
                  M 50 50
                  L ${x1} ${y1}
                  A 45 45 0 ${largeArcFlag} 1 ${x2} ${y2}
                  Z
                `
                
                accumulatedAngle += angle
                
                return (
                  <path
                    key={index}
                    d={path}
                    fill={item.color}
                    stroke="white"
                    strokeWidth="1"
                    className="transition-opacity hover:opacity-80 cursor-pointer"
                  />
                )
              })}
              <circle cx="50" cy="50" r="20" fill="white" />
              <text x="50" y="53" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">
                {total}
              </text>
            </svg>
          </div>
          
          <div className="mt-4 space-y-2 w-full max-w-xs">
            {data.map((item, index) => (
              item.value > 0 && (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-sm flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {item.value} ({((item.value / total) * 100).toFixed(1)}%)
                  </span>
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Función para renderizar gráfico de barras mejorado
  const renderBarChart = (data: Array<{ [key: string]: any }>, title: string, xKey: string, yKey: string) => {
    if (!data || data.length === 0) {
      return <div className="text-center text-muted-foreground py-8">No hay datos disponibles</div>
    }
    
    const maxValue = Math.max(...data.map(item => item[yKey]), 1)
    const chartHeight = 280
    
    return (
      <div className="space-y-6">
        <h4 className="font-semibold text-center text-lg">{title}</h4>
        <div className="relative px-6 py-4">
          {/* Líneas de referencia */}
          <div className="absolute left-6 right-6 top-4 flex flex-col justify-between pointer-events-none" style={{ height: `${chartHeight}px` }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {Math.round(maxValue * (1 - i * 0.25))}
                </span>
                <div className="flex-1 border-t border-muted-foreground/20" />
              </div>
            ))}
          </div>
          
          {/* Barras */}
          <div className="relative flex items-end justify-around gap-1 pl-10" style={{ height: `${chartHeight}px` }}>
            {data.map((item, index) => {
              const percentage = maxValue > 0 ? (item[yKey] / maxValue) : 0
              const barHeightPx = percentage * chartHeight
              
              return (
                <div key={index} className="flex flex-col justify-end items-center flex-1 max-w-20 h-full">
                  <span className="text-sm font-bold text-foreground mb-2">{item[yKey]}</span>
                  <div
                    className="w-full bg-gradient-to-t from-primary to-primary/80 rounded-t-lg transition-all hover:from-primary/90 hover:to-primary/70 cursor-pointer shadow-sm"
                    style={{ 
                      height: `${barHeightPx}px`,
                      minHeight: item[yKey] > 0 ? '12px' : '0'
                    }}
                  />
                  <span className="text-xs text-muted-foreground font-medium whitespace-nowrap mt-2">
                    {item[xKey]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Reporte Diario Detallado
        </CardTitle>
        <CardDescription>Estadísticas detalladas y gráficos del día (excluye vehículos no pagados)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            />
          </div>
          <Button onClick={handleBuscar}>Ver Reporte</Button>
          <Button onClick={handleHoy} variant="outline">
            Hoy
          </Button>
        </div>

        {isLoading || isLoadingDetallado ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-muted-foreground">Cargando reporte...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Error al cargar reporte. Verifica la conexión con el servidor.
          </div>
        ) : reporte && reporteDetallado ? (
          <div className="space-y-6">
            {/* Tarjetas de resumen */}
            <div className="grid gap-4 md:grid-cols-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ingresos Cobrados</p>
                      <p className="text-2xl font-bold">${reporte.ingresos_total.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-full">
                      <Car className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vehículos Pagados</p>
                      <p className="text-2xl font-bold">{reporte.total_vehiculos}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-full">
                      <Moon className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nocturnos Pagados</p>
                      <p className="text-2xl font-bold">{reporteDetallado.vehiculos_nocturnos}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-full">
                      <Sun className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Diurnos Pagados</p>
                      <p className="text-2xl font-bold">{reporteDetallado.vehiculos_diurnos}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ✅ NUEVA: Tarjeta de vehículos no pagados */}
              <Card className={reporteDetallado.estadisticas_no_pagadas?.total_no_pagados ? "border-red-200" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      reporteDetallado.estadisticas_no_pagadas?.total_no_pagados 
                        ? "bg-red-500/10" 
                        : "bg-gray-500/10"
                    }`}>
                      <ShieldOff className={`h-6 w-6 ${
                        reporteDetallado.estadisticas_no_pagadas?.total_no_pagados 
                          ? "text-red-500" 
                          : "text-gray-500"
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vehículos No Pagados</p>
                      <p className={`text-2xl font-bold ${
                        reporteDetallado.estadisticas_no_pagadas?.total_no_pagados 
                          ? "text-red-600" 
                          : "text-gray-600"
                      }`}>
                        {reporteDetallado.estadisticas_no_pagadas?.total_no_pagados || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ✅ NUEVA: Tarjeta de pérdidas */}
              <Card className={reporteDetallado.estadisticas_no_pagadas?.perdida_total ? "border-red-200" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      reporteDetallado.estadisticas_no_pagadas?.perdida_total 
                        ? "bg-red-500/10" 
                        : "bg-gray-500/10"
                    }`}>
                      <TrendingDown className={`h-6 w-6 ${
                        reporteDetallado.estadisticas_no_pagadas?.perdida_total 
                          ? "text-red-500" 
                          : "text-gray-500"
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pérdida por No Pagados</p>
                      <p className={`text-2xl font-bold ${
                        reporteDetallado.estadisticas_no_pagadas?.perdida_total 
                          ? "text-red-600" 
                          : "text-gray-600"
                      }`}>
                        ${(reporteDetallado.estadisticas_no_pagadas?.perdida_total || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pestañas de gráficos */}
            <Tabs defaultValue="distribucion" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="distribucion" className="flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Distribución
                </TabsTrigger>
                <TabsTrigger value="pago" className="flex items-center gap-2">
                  <ShieldOff className="h-4 w-4" />
                  Pago/No Pago
                </TabsTrigger>
                <TabsTrigger value="horas" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horas Pico
                </TabsTrigger>
                <TabsTrigger value="espacios" className="flex items-center gap-2">
                  <BarChart className="h-4 w-4" />
                  Espacios
                </TabsTrigger>
                <TabsTrigger value="tiempo" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tiempo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="distribucion" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Distribución de Vehículos (Pagados)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {chartData && renderPieChart(chartData.distribucionVehiculos, "Vehículos Pagados por Tipo")}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Distribución de Ingresos (Pagados)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {chartData && renderPieChart(chartData.distribucionIngresos, "Ingresos por Tipo")}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="pago" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Vehículos: Pagados vs No Pagados</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Totales: {totalesConNoPagados?.vehiculosTotales || reporte.total_vehiculos} vehículos
                      </p>
                    </CardHeader>
                    <CardContent>
                      {chartData && renderPieChart(chartData.distribucionPago, "Estado de Pago")}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Distribución de Vehículos No Pagados</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Total: {reporteDetallado.estadisticas_no_pagadas?.total_no_pagados || 0} vehículos
                      </p>
                    </CardHeader>
                    <CardContent>
                      {chartData && chartData.distribucionNoPagados && chartData.distribucionNoPagados.some(item => item.value > 0) ? (
                        renderPieChart(chartData.distribucionNoPagados, "Tipos de Vehículos No Pagados")
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No hay vehículos no pagados
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="horas">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Horas Pico de Entrada (Pagados)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chartData && renderBarChart(chartData.horasPico, "Vehículos por Hora", "hora", "cantidad")}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="espacios">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Espacios Más Utilizados (Pagados)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chartData && renderBarChart(chartData.espaciosUtilizados, "Usos por Espacio", "espacio", "usos")}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tiempo">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distribución de Tiempo de Estacionamiento (Pagados)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chartData && renderPieChart(chartData.distribucionTiempo, "Tiempo de Estancia")}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Estadísticas adicionales */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumen Financiero</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Ingresos Nocturnos:</span>
                    <span className="font-bold text-amber-600">
                      ${reporteDetallado.ingresos_nocturnos.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ingresos Diurnos:</span>
                    <span className="font-bold text-blue-600">
                      ${reporteDetallado.ingresos_diurnos.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Pérdida por No Pagados:</span>
                    <span className="font-bold text-red-600">
                      ${(reporteDetallado.estadisticas_no_pagadas?.perdida_total || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Ingresos Netos:</span>
                    <span className="font-bold">
                      ${reporte.ingresos_total.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ingresos Potenciales:</span>
                    <span className="font-bold text-green-600">
                      ${(reporte.ingresos_total + (reporteDetallado.estadisticas_no_pagadas?.perdida_total || 0)).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Eficiencia por Tipo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Promedio Nocturno:</span>
                    <span className="font-bold text-amber-600">
                      $
                      {reporteDetallado.vehiculos_nocturnos > 0
                        ? (reporteDetallado.ingresos_nocturnos / reporteDetallado.vehiculos_nocturnos).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Promedio Diurno:</span>
                    <span className="font-bold text-blue-600">
                      $
                      {reporteDetallado.vehiculos_diurnos > 0
                        ? (reporteDetallado.ingresos_diurnos / reporteDetallado.vehiculos_diurnos).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Porcentaje Nocturnos:</span>
                    <span className="font-bold">
                      {reporte.total_vehiculos > 0
                        ? ((reporteDetallado.vehiculos_nocturnos / reporte.total_vehiculos) * 100).toFixed(1)
                        : "0.0"}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Porcentaje No Pagados:</span>
                    <span className="font-bold text-red-600">
                      {reporteDetallado.estadisticas_no_pagadas?.total_no_pagados 
                        ? (((reporteDetallado.estadisticas_no_pagadas.total_no_pagados) / 
                            (reporte.total_vehiculos + reporteDetallado.estadisticas_no_pagadas.total_no_pagados)) * 100).toFixed(1)
                        : "0.0"}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Selecciona una fecha para ver el reporte
          </div>
        )}
      </CardContent>
    </Card>
  )
}