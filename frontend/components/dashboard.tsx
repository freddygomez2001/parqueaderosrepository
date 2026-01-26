"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { ParkingGrid } from "@/components/parking-grid"
import { VehicleExit } from "@/components/vehicle-exit"
import { HistoryTable } from "@/components/history-table"
import { DailyReport } from "@/components/daily-report"
import { ConfigPanel } from "@/components/config-panel"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, LayoutDashboard, History, BarChart3, Settings } from "lucide-react"
import Image from "next/image"

export function Dashboard() {
  const { operador, logout } = useAuth()
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
              <p className="text-sm text-slate-300">Hotel</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">
              Operador:{" "}
              <span className="font-medium text-white">
                {operador}
              </span>
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
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid bg-white shadow-sm border border-slate-200">
              <TabsTrigger 
                value="dashboard" 
                className="gap-2 data-[state=active]:bg-[#2c3e5a] data-[state=active]:text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
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

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <ParkingGrid />
                <VehicleExit />
              </div>
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