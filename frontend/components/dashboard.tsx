// src/components/dashboard.tsx
"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCaja } from "@/lib/caja-context"
import { ParkingGrid } from "@/components/parking-grid"
import { VehicleExit } from "@/components/vehicle-exit"
import { HistoryTable } from "@/components/history-table"
import { DailyReport } from "@/components/daily-report"
import { ConfigPanel } from "@/components/config-panel"
import { ServicesPanel } from "@/components/services-panel"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
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
} from "lucide-react"
import Image from "next/image"

export function Dashboard() {
  const { operador, logout } = useAuth()
  const { estadoCaja } = useCaja()
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-[#2c3e5a] shadow-lg">
        <div className="mx-auto max-w-7xl px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 flex-shrink-0 bg-[#1a2942] rounded-lg p-1">
              <Image
                src="/366633678_856347905969985_4140026748032552886_n.jpg"
                alt="La Farola Hotel"
                fill
                className="object-contain rounded-lg"
                priority
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold leading-tight text-white">Sistema de Parqueadero</h1>
              <p className="text-sm text-slate-300">Hotel La Farola</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Indicador de Caja */}
            {estadoCaja && (
              <div className="hidden sm:flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-300">Caja</span>
                  <span className="text-sm font-bold text-green-400">
                    ${estadoCaja.monto_esperado.toFixed(2)}
                  </span>
                </div>
                <Wallet className="h-5 w-5 text-green-400" />
              </div>
            )}

            <span className="text-sm text-slate-300">
              Operador: <span className="font-medium text-white">{operador}</span>
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex justify-center py-6">
        <div className="w-full max-w-7xl px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Tabs */}
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid bg-white shadow-sm border border-slate-200">
              <TabsTrigger
                value="dashboard"
                className="gap-2 data-[state=active]:bg-[#2c3e5a] data-[state=active]:text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>

              <TabsTrigger
                value="servicios"
                className="gap-2 data-[state=active]:bg-[#2c3e5a] data-[state=active]:text-white"
              >
                <Store className="h-4 w-4" />
                <span className="hidden sm:inline">Servicios</span>
              </TabsTrigger>

              <TabsTrigger
                value="historial"
                className="gap-2 data-[state=active]:bg-[#2c3e5a] data-[state=active]:text-white"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Historial</span>
              </TabsTrigger>

              <TabsTrigger
                value="reportes"
                className="gap-2 data-[state=active]:bg-[#2c3e5a] data-[state=active]:text-white"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Reportes</span>
              </TabsTrigger>

              <TabsTrigger
                value="configuracion"
                className="gap-2 data-[state=active]:bg-[#2c3e5a] data-[state=active]:text-white"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
            </TabsList>

            {/* Resumen de Caja (visible en dashboard) */}
            {activeTab === "dashboard" && estadoCaja && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ingresos del Día</p>
                        <p className="text-2xl font-bold text-green-600">
                          ${estadoCaja.total_dia_total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                        <ShoppingCart className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Monto Esperado</p>
                        <p className="text-2xl font-bold text-amber-600">
                          ${estadoCaja.monto_esperado.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Contenido */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <ParkingGrid />
                <VehicleExit />
              </div>
            </TabsContent>

            <TabsContent value="servicios">
              <ServicesPanel />
            </TabsContent>

            <TabsContent value="historial">
              <HistoryTable />
            </TabsContent>

            <TabsContent value="reportes">
              <DailyReport />
            </TabsContent>

            <TabsContent value="configuracion">
              <ConfigPanel />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}