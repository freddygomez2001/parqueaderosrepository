// src/components/config/ConfigPanel.tsx
import { useState, useEffect } from "react"
import useSWR from "swr"
import { obtenerConfiguracion, actualizarConfiguracion } from "@/servicios/configuracionService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Save, Clock, DollarSign, AlertCircle, Lock, Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
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

interface Configuracion {
  id: number
  precio_0_5_min: number
  precio_6_30_min: number
  precio_31_60_min: number
  precio_hora_adicional: number
  precio_nocturno: number
  hora_inicio_nocturno: string
  hora_fin_nocturno: string
  rangos_personalizados: Array<{
    min_minutos: number
    max_minutos: number
    precio: number
    descripcion?: string
  }> | null
  actualizado_en: string | null
}

// ✅ CONTRASEÑA DE ACCESO
const PASSWORD_ADMIN = "admin2024"

export function ConfigPanel() {
  const { data: config, error, isLoading, mutate } = useSWR<Configuracion>("configuracion", obtenerConfiguracion)
  
  // Estados de autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  
  // Estados de edición
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>("")
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [formData, setFormData] = useState<Partial<Configuracion>>({})
  
  // Estados para rangos personalizados
  const [rangosPersonalizados, setRangosPersonalizados] = useState<Array<{
    min_minutos: number
    max_minutos: number
    precio: number
    descripcion?: string
  }>>([])
  const [nuevoRango, setNuevoRango] = useState({
    min_minutos: 0,
    max_minutos: 0,
    precio: 0,
    descripcion: ""
  })

  // ✅ Inicializar configuración
  useEffect(() => {
    const authSession = sessionStorage.getItem('config_authenticated')
    if (authSession === 'true') {
      setIsAuthenticated(true)
    } else {
      setShowPasswordDialog(true)
    }
  }, [])

  // ✅ Cargar rangos personalizados cuando hay config
  useEffect(() => {
    if (config?.rangos_personalizados) {
      setRangosPersonalizados(config.rangos_personalizados)
    }
  }, [config])

  // ✅ Manejar verificación de contraseña
  const handlePasswordSubmit = () => {
    if (passwordInput === PASSWORD_ADMIN) {
      setIsAuthenticated(true)
      setShowPasswordDialog(false)
      setPasswordError("")
      setPasswordInput("")
      setAttemptCount(0)
      sessionStorage.setItem('config_authenticated', 'true')
    } else {
      const newAttemptCount = attemptCount + 1
      setAttemptCount(newAttemptCount)
      setPasswordError(`Contraseña incorrecta. Intentos: ${newAttemptCount}/3`)
      
      if (newAttemptCount >= 3) {
        setPasswordError("Demasiados intentos fallidos. Recarga la página para intentar de nuevo.")
        setPasswordInput("")
        setTimeout(() => {
          setShowPasswordDialog(false)
        }, 3000)
      } else {
        setPasswordInput("")
      }
    }
  }

  const handleEdit = () => {
    if (config) {
      setFormData({
        precio_0_5_min: config.precio_0_5_min,
        precio_6_30_min: config.precio_6_30_min,
        precio_31_60_min: config.precio_31_60_min,
        precio_hora_adicional: config.precio_hora_adicional,
        precio_nocturno: config.precio_nocturno,
        hora_inicio_nocturno: config.hora_inicio_nocturno,
        hora_fin_nocturno: config.hora_fin_nocturno,
      })
      if (config.rangos_personalizados) {
        setRangosPersonalizados(config.rangos_personalizados)
      }
    }
    setEditMode(true)
    setSaveError("")
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError("")
    setSaveSuccess(false)

    try {
      // Preparar datos con rangos personalizados
      const datosCompletos = {
        ...formData,
        rangos_personalizados: rangosPersonalizados.length > 0 
          ? JSON.stringify(rangosPersonalizados)
          : null
      }

      const resultado = await actualizarConfiguracion(datosCompletos)

      if (resultado.ok) {
        await mutate()
        setEditMode(false)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        setSaveError(resultado.message || "Error desconocido")
      }
    } catch (err) {
      if (err instanceof Error) {
        setSaveError(err.message)
      } else {
        setSaveError("Error inesperado al guardar")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setFormData({})
    setRangosPersonalizados(config?.rangos_personalizados || [])
    setSaveError("")
    setSaveSuccess(false)
  }

  // ✅ Funciones para rangos personalizados
  const agregarRango = () => {
    if (nuevoRango.min_minutos >= 0 && nuevoRango.max_minutos > nuevoRango.min_minutos && nuevoRango.precio >= 0) {
      const rango = {
        min_minutos: nuevoRango.min_minutos,
        max_minutos: nuevoRango.max_minutos,
        precio: nuevoRango.precio,
        descripcion: nuevoRango.descripcion || undefined
      }
      setRangosPersonalizados([...rangosPersonalizados, rango])
      setNuevoRango({ min_minutos: 0, max_minutos: 0, precio: 0, descripcion: "" })
    }
  }

  const eliminarRango = (index: number) => {
    const nuevosRangos = [...rangosPersonalizados]
    nuevosRangos.splice(index, 1)
    setRangosPersonalizados(nuevosRangos)
  }

  // ✅ Función para cerrar sesión
  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('config_authenticated')
    setShowPasswordDialog(true)
  }

  // Renderizar tarifas como tabla
  const renderTarifas = () => {
    const tarifas = [
      { rango: "0-5 minutos", precio: config?.precio_0_5_min },
      { rango: "6-30 minutos", precio: config?.precio_6_30_min },
      { rango: "31-60 minutos", precio: config?.precio_31_60_min },
      { rango: "Hora adicional", precio: config?.precio_hora_adicional },
      { rango: "Tarifa nocturna (12h)", precio: config?.precio_nocturno },
    ]

    return (
      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Tarifas por Tiempo
        </h4>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rango de Tiempo</TableHead>
                <TableHead className="text-right">Precio ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tarifas.map((tarifa, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{tarifa.rango}</TableCell>
                  <TableCell className="text-right">
                    ${tarifa.precio?.toFixed(2) || "0.00"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Tarifas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando configuración...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Tarifas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error al cargar configuración.</p>
        </CardContent>
      </Card>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              Acceso Restringido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <p className="text-muted-foreground mb-4">
                Esta sección requiere autenticación de administrador
              </p>
              <Button onClick={() => setShowPasswordDialog(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Ingresar Contraseña
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Diálogo de contraseña (igual que antes) */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                Acceso a Configuración
              </DialogTitle>
              <DialogDescription>
                Ingrese la contraseña de administrador para configurar tarifas
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña de Administrador</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingrese la contraseña"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && passwordInput.trim() && attemptCount < 3) {
                        handlePasswordSubmit()
                      }
                    }}
                    className="pl-10 pr-10"
                    disabled={attemptCount >= 3}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors"
                    disabled={attemptCount >= 3}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {passwordError && (
                <Alert variant={attemptCount >= 3 ? "destructive" : "default"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPasswordDialog(false)
                  setPasswordInput("")
                  setPasswordError("")
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handlePasswordSubmit}
                disabled={!passwordInput.trim() || attemptCount >= 3}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Verificar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración de Tarifas
            </CardTitle>
            <CardDescription>Configure los precios por rangos de tiempo específicos</CardDescription>
          </div>
          <div className="flex gap-2">
            {!editMode && (
              <Button variant="outline" onClick={handleEdit}>
                Editar
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            >
              <Lock className="h-4 w-4 mr-1" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveSuccess && (
          <Alert className="bg-emerald-500/10 border-emerald-500/50">
            <AlertCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-600">
              Configuración actualizada exitosamente
            </AlertDescription>
          </Alert>
        )}

        {saveError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}

        {editMode ? (
          <div className="space-y-6">
            {/* Precios por rangos fijos */}
            <div className="space-y-4">
              <h4 className="font-medium">Tarifas por Rango de Tiempo</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="precio_0_5_min">0-5 minutos ($)</Label>
                  <Input
                    id="precio_0_5_min"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio_0_5_min || ""}
                    onChange={(e) => setFormData({ ...formData, precio_0_5_min: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Ejemplo: 0.50</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio_6_30_min">6-30 minutos ($)</Label>
                  <Input
                    id="precio_6_30_min"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio_6_30_min || ""}
                    onChange={(e) => setFormData({ ...formData, precio_6_30_min: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Ejemplo: 0.75</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio_31_60_min">31-60 minutos ($)</Label>
                  <Input
                    id="precio_31_60_min"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio_31_60_min || ""}
                    onChange={(e) => setFormData({ ...formData, precio_31_60_min: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Ejemplo: 1.00</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio_hora_adicional">Hora adicional ($)</Label>
                  <Input
                    id="precio_hora_adicional"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio_hora_adicional || ""}
                    onChange={(e) => setFormData({ ...formData, precio_hora_adicional: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Por cada hora extra</p>
                </div>
              </div>
            </div>

            {/* Precio nocturno */}
            <div className="space-y-4">
              <h4 className="font-medium">Tarifa Nocturna</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="precio_nocturno">Precio nocturno 12h ($)</Label>
                  <Input
                    id="precio_nocturno"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio_nocturno || ""}
                    onChange={(e) => setFormData({ ...formData, precio_nocturno: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Tarifa fija por 12 horas nocturnas</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora_inicio_nocturno">Inicio nocturno</Label>
                  <Input
                    id="hora_inicio_nocturno"
                    type="time"
                    value={formData.hora_inicio_nocturno || ""}
                    onChange={(e) => setFormData({ ...formData, hora_inicio_nocturno: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Ejemplo: 19:00</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora_fin_nocturno">Fin nocturno</Label>
                  <Input
                    id="hora_fin_nocturno"
                    type="time"
                    value={formData.hora_fin_nocturno || ""}
                    onChange={(e) => setFormData({ ...formData, hora_fin_nocturno: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Ejemplo: 07:00</p>
                </div>
              </div>
            </div>

            {/* Rangos personalizados */}
            <div className="space-y-4">
              <h4 className="font-medium">Rangos Personalizados</h4>
              <div className="border rounded-lg p-4">
                <div className="grid gap-4 md:grid-cols-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_minutos">Min (minutos)</Label>
                    <Input
                      id="min_minutos"
                      type="number"
                      min="0"
                      value={nuevoRango.min_minutos}
                      onChange={(e) => setNuevoRango({...nuevoRango, min_minutos: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_minutos">Max (minutos)</Label>
                    <Input
                      id="max_minutos"
                      type="number"
                      min="0"
                      value={nuevoRango.max_minutos}
                      onChange={(e) => setNuevoRango({...nuevoRango, max_minutos: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="precio_rango">Precio ($)</Label>
                    <Input
                      id="precio_rango"
                      type="number"
                      step="0.01"
                      min="0"
                      value={nuevoRango.precio}
                      onChange={(e) => setNuevoRango({...nuevoRango, precio: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <Button onClick={agregarRango} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                </div>
                
                {rangosPersonalizados.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rango (minutos)</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right">Precio</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rangosPersonalizados.map((rango, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {rango.min_minutos}-{rango.max_minutos} min
                            </TableCell>
                            <TableCell>
                              {rango.descripcion || "Sin descripción"}
                            </TableCell>
                            <TableCell className="text-right">
                              ${rango.precio.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eliminarRango(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No hay rangos personalizados configurados
                  </p>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        ) : config ? (
          <div className="grid gap-6">
            {renderTarifas()}
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horario Nocturno
                </h4>
                <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-md">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inicio:</span>
                    <span className="font-medium">{config.hora_inicio_nocturno}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fin:</span>
                    <span className="font-medium">{config.hora_fin_nocturno}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">
                    Tarifa nocturna: <span className="font-bold">${config.precio_nocturno.toFixed(2)}</span> por 12 horas
                  </p>
                </div>
              </div>
              
              {config.rangos_personalizados && config.rangos_personalizados.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Rangos Personalizados</h4>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rango</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right">Precio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.rangos_personalizados.map((rango, index) => (
                          <TableRow key={index}>
                            <TableCell>{rango.min_minutos}-{rango.max_minutos} min</TableCell>
                            <TableCell>{rango.descripcion || "-"}</TableCell>
                            <TableCell className="text-right">
                              ${rango.precio.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
            
            {config.actualizado_en && (
              <div className="text-xs text-muted-foreground pt-4 border-t">
                Última actualización: {new Date(config.actualizado_en).toLocaleString("es-EC")}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}