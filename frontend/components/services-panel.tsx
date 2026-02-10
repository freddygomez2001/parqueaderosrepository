// src/components/services-panel.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Coffee,
  Cookie,
  Plus,
  Minus,
  Trash2,
  PackagePlus,
  DollarSign,
  Package,
  Receipt,
  Printer,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import {
  obtenerProductos,
  crearProducto,
  crearVenta,
  obtenerVentas,
  obtenerReporteDiarioVentas,
} from "@/servicios/serviciosService"

// Datos del hotel
const HOTEL_INFO = {
  nombre: "Hotel La Farola",
  direccion: "Av. Gil Ramirez Davalos y Av Heroes de Verdeloma",
  telefono: "+593 99 808 5600",
  ruc: "1234567890001",
}

// Interfaces
interface Producto {
  id: number
  nombre: string
  precio: number
  stock: number
  categoria: "bebidas" | "snacks"
  activo: boolean
  creado_en?: string
  actualizado_en?: string
}

interface ItemCarrito {
  producto: Producto
  cantidad: number
}

interface VentaRegistrada {
  id: number
  items: { nombre: string; cantidad: number; precio_unit: number; subtotal: number }[]
  total: number
  fecha: string
}

interface ReporteVentas {
  total_ventas: number
  cantidad_tickets: number
  total_productos_vendidos: number
  ventas_por_categoria: {
    bebidas: number
    snacks: number
  }
}

// Dialog para agregar producto nuevo
function AgregarProductoDialog({
  categoria,
  onProductoAgregado,
}: {
  categoria: "bebidas" | "snacks"
  onProductoAgregado: () => void
}) {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState("")
  const [stock, setStock] = useState("")
  const [guardando, setGuardando] = useState(false)

  const handleSubmit = async () => {
    if (!nombre || !precio || !stock) return

    setGuardando(true)
    const toastId = toast.loading("Agregando producto...")

    try {
      await crearProducto({
        nombre,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        categoria,
      })

      toast.success("Producto agregado exitosamente", {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />,
      })

      setNombre("")
      setPrecio("")
      setStock("")
      setOpen(false)
      onProductoAgregado()
    } catch (error) {
      toast.error("Error al agregar producto", {
        id: toastId,
        description: error instanceof Error ? error.message : "Error desconocido",
        icon: <XCircle className="h-4 w-4" />,
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <PackagePlus className="h-4 w-4" />
          Agregar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Agregar {categoria === "bebidas" ? "nueva bebida" : "nuevo snack"}
          </DialogTitle>
          <DialogDescription>
            Completa los datos del producto para agregarlo al inventario.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={`nombre-${categoria}`}>Nombre del producto</Label>
            <Input
              id={`nombre-${categoria}`}
              placeholder={categoria === "bebidas" ? "Ej: Limonada" : "Ej: Nachos"}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`precio-${categoria}`}>Precio ($)</Label>
              <Input
                id={`precio-${categoria}`}
                type="number"
                step="0.05"
                min="0"
                placeholder="0.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`stock-${categoria}`}>Stock inicial</Label>
              <Input
                id={`stock-${categoria}`}
                type="number"
                min="1"
                placeholder="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!nombre || !precio || !stock || guardando}>
            {guardando ? "Agregando..." : "Agregar producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Dialog de catálogo de productos
function CatalogoDialog({
  categoria,
  productos,
  carrito,
  onAgregarCarrito,
  onQuitarCarrito,
  onProductoAgregado,
}: {
  categoria: "bebidas" | "snacks"
  productos: Producto[]
  carrito: ItemCarrito[]
  onAgregarCarrito: (producto: Producto) => void
  onQuitarCarrito: (productoId: number) => void
  onProductoAgregado: () => void
}) {
  const [open, setOpen] = useState(false)
  const productosCategoria = productos.filter((p) => p.categoria === categoria)
  const itemsEnCategoria = carrito.filter((c) => c.producto.categoria === categoria)
  const totalItems = itemsEnCategoria.reduce((s, i) => s + i.cantidad, 0)

  const getCantidad = (id: number) => {
    const item = carrito.find((c) => c.producto.id === id)
    return item ? item.cantidad : 0
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="group relative flex flex-col items-center gap-4 rounded-xl border-2 border-border bg-card p-8 transition-all hover:border-primary hover:shadow-lg">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${
              categoria === "bebidas" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"
            }`}
          >
            {categoria === "bebidas" ? <Coffee className="h-10 w-10" /> : <Cookie className="h-10 w-10" />}
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">
              {categoria === "bebidas" ? "Bebidas" : "Snacks"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{productosCategoria.length} productos disponibles</p>
          </div>
          {totalItems > 0 && <Badge className="absolute top-3 right-3">{totalItems} en factura</Badge>}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {categoria === "bebidas" ? (
                <Coffee className="h-5 w-5 text-blue-600" />
              ) : (
                <Cookie className="h-5 w-5 text-amber-600" />
              )}
              <DialogTitle>{categoria === "bebidas" ? "Bebidas" : "Snacks"}</DialogTitle>
              <Badge variant="secondary">{productosCategoria.length}</Badge>
            </div>
            <AgregarProductoDialog categoria={categoria} onProductoAgregado={onProductoAgregado} />
          </div>
          <DialogDescription>Selecciona los productos que deseas agregar a la factura.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
          {productosCategoria.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No hay productos en esta categoría.</p>
              <p className="text-sm text-muted-foreground">Usa el botón Agregar de arriba.</p>
            </div>
          ) : (
            productosCategoria.map((producto) => {
              const cantEnCarrito = getCantidad(producto.id)
              const sinStock = producto.stock - cantEnCarrito <= 0

              return (
                <div
                  key={producto.id}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3 transition-all hover:shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{producto.nombre}</p>
                      {sinStock && (
                        <Badge variant="destructive" className="text-xs shrink-0">
                          Agotado
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">${producto.precio.toFixed(2)}</span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        Stock: {producto.stock - cantEnCarrito}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cantEnCarrito > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-transparent"
                          onClick={() => onQuitarCarrito(producto.id)}
                        >
                          <Minus className="h-3 w-3" />
                          <span className="sr-only">Quitar uno</span>
                        </Button>
                        <span className="w-6 text-center font-semibold text-sm">{cantEnCarrito}</span>
                      </>
                    )}
                    <Button
                      variant={cantEnCarrito > 0 ? "default" : "outline"}
                      size="icon"
                      className={`h-8 w-8 ${cantEnCarrito === 0 ? "bg-transparent" : ""}`}
                      onClick={() => onAgregarCarrito(producto)}
                      disabled={sinStock}
                    >
                      <Plus className="h-3 w-3" />
                      <span className="sr-only">Agregar uno</span>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)} className="w-full">
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Componente Principal
export function ServicesPanel() {
  // SWR para productos
  const {
    data: productos,
    error: productosError,
    isLoading: productosLoading,
    mutate: mutateProductos,
  } = useSWR<Producto[]>("productos", () => obtenerProductos(null, true), {
    refreshInterval: 30000,
  })

  // SWR para ventas
  const {
    data: ventas,
    error: ventasError,
    isLoading: ventasLoading,
    mutate: mutateVentas,
  } = useSWR<VentaRegistrada[]>("ventas", () => obtenerVentas(null, 50), {
    refreshInterval: 30000,
  })

  // SWR para reporte diario
  const { data: reporte } = useSWR<ReporteVentas>("reporte-ventas", () => obtenerReporteDiarioVentas(), {
    refreshInterval: 60000,
  })

  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [ventaActual, setVentaActual] = useState<VentaRegistrada | null>(null)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const facturaRef = useRef<HTMLDivElement>(null)

  const totalCarrito = carrito.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0)
  const totalItemsCarrito = carrito.reduce((sum, item) => sum + item.cantidad, 0)

  const bebidasEnCarrito = carrito.filter((c) => c.producto.categoria === "bebidas")
  const snacksEnCarrito = carrito.filter((c) => c.producto.categoria === "snacks")

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito((prev) => {
      const existe = prev.find((c) => c.producto.id === producto.id)
      if (existe) {
        if (existe.cantidad >= producto.stock) {
          toast.warning("Stock insuficiente", {
            description: `Solo hay ${producto.stock} unidades disponibles`,
            icon: <AlertCircle className="h-4 w-4" />,
          })
          return prev
        }
        return prev.map((c) => (c.producto.id === producto.id ? { ...c, cantidad: c.cantidad + 1 } : c))
      }
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  const quitarDelCarrito = (productoId: number) => {
    setCarrito((prev) => {
      const existe = prev.find((c) => c.producto.id === productoId)
      if (!existe) return prev
      if (existe.cantidad <= 1) {
        return prev.filter((c) => c.producto.id !== productoId)
      }
      return prev.map((c) => (c.producto.id === productoId ? { ...c, cantidad: c.cantidad - 1 } : c))
    })
  }

  const eliminarDelCarrito = (productoId: number) => {
    setCarrito((prev) => prev.filter((c) => c.producto.id !== productoId))
  }

  const procesarVenta = async () => {
    if (carrito.length === 0) return

    setProcesando(true)
    const toastId = toast.loading("Procesando venta...")

    try {
      const items = carrito.map((item) => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
      }))

      const ventaCreada = await crearVenta(items)

      toast.success("Venta registrada exitosamente", {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />,
        action: {
          label: "Imprimir",
          onClick: () => handleImprimir(),
        },
      })

      setCarrito([])
      setVentaActual(ventaCreada)
      setTicketOpen(true)

      // Actualizar datos
      mutateProductos()
      mutateVentas()
    } catch (error) {
      toast.error("Error al procesar venta", {
        id: toastId,
        description: error instanceof Error ? error.message : "Error desconocido",
        icon: <XCircle className="h-4 w-4" />,
      })
    } finally {
      setProcesando(false)
    }
  }

  const handleImprimir = () => {
    if (facturaRef.current && ventaActual) {
      const printWindow = window.open("", "", "width=72mm,height=600")
      if (!printWindow) {
        toast.error("No se pudo abrir ventana de impresión")
        return
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Ticket de Venta #${String(ventaActual.id).padStart(4, "0")}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Courier New', monospace; }
              body { width: 72mm; margin: 0; padding: 2mm; font-size: 11px; line-height: 1.2; }
              @media print {
                @page { size: 72mm auto; margin: 0; }
                body { width: 72mm !important; margin: 0 !important; padding: 2mm !important; }
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .separator { border: none; border-top: 1px dashed #000; margin: 3px 0; }
              .row { display: flex; justify-content: space-between; margin: 2px 0; }
              table { width: 100%; border-collapse: collapse; margin: 3px 0; }
              th, td { text-align: left; padding: 2px 0; font-size: 10px; }
              th:last-child, td:last-child { text-align: right; }
              th { border-bottom: 1px solid #000; }
              .total { font-size: 14px; font-weight: bold; margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="center bold" style="font-size: 13px;">${HOTEL_INFO.nombre}</div>
            <div class="center" style="font-size: 9px;">${HOTEL_INFO.direccion}</div>
            <div class="center" style="font-size: 9px;">Tel: ${HOTEL_INFO.telefono}</div>
            <div class="center" style="font-size: 9px;">RUC: ${HOTEL_INFO.ruc}</div>
            
            <div class="separator"></div>
            
            <div class="center" style="font-size: 10px;">TICKET DE VENTA #${String(ventaActual.id).padStart(4, "0")}</div>
            
            <div class="separator"></div>
            
            <div class="row">
              <span>Fecha:</span>
              <span>${new Date(ventaActual.fecha).toLocaleDateString("es-EC")}</span>
            </div>
            <div class="row">
              <span>Hora:</span>
              <span>${new Date(ventaActual.fecha).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            
            <div class="separator"></div>
            
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style="text-align: center;">Cant</th>
                  <th style="text-align: right;">P.U.</th>
                  <th style="text-align: right;">Subt.</th>
                </tr>
              </thead>
              <tbody>
                ${ventaActual.items
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.nombre}</td>
                    <td style="text-align: center;">${item.cantidad}</td>
                    <td style="text-align: right;">$${item.precio_unit.toFixed(2)}</td>
                    <td style="text-align: right;">$${item.subtotal.toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
            
            <div class="separator"></div>
            
            <div class="row total">
              <span>TOTAL:</span>
              <span>$${ventaActual.total.toFixed(2)}</span>
            </div>
            
            <div class="separator"></div>
            
            <div class="center" style="font-size: 9px; margin-top: 5px;">
              <div>Gracias por su compra</div>
              <div>${new Date().toLocaleString("es-EC")}</div>
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
  }

  if (productosLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Cargando productos...</p>
        </CardContent>
      </Card>
    )
  }

  if (productosError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Error al cargar productos. Verifica la conexión con el servidor.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selector de categorías */}
      <Card>
        <CardHeader>
          <CardTitle>Servicios Adicionales</CardTitle>
          <CardDescription>
            Selecciona una categoría para agregar productos a la factura. Puedes mezclar bebidas y snacks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CatalogoDialog
              categoria="bebidas"
              productos={productos || []}
              carrito={carrito}
              onAgregarCarrito={agregarAlCarrito}
              onQuitarCarrito={quitarDelCarrito}
              onProductoAgregado={() => mutateProductos()}
            />
            <CatalogoDialog
              categoria="snacks"
              productos={productos || []}
              carrito={carrito}
              onAgregarCarrito={agregarAlCarrito}
              onQuitarCarrito={quitarDelCarrito}
              onProductoAgregado={() => mutateProductos()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Factura en vivo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Factura de Venta
              </CardTitle>
              <CardDescription>
                {totalItemsCarrito > 0
                  ? `${totalItemsCarrito} producto${totalItemsCarrito !== 1 ? "s" : ""} en la factura`
                  : "Agrega productos desde las categorías de arriba"}
              </CardDescription>
            </div>
            {totalItemsCarrito > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setCarrito([])}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Vaciar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">La factura está vacía</p>
              <p className="text-sm text-muted-foreground">Haz clic en Bebidas o Snacks para agregar productos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sección Bebidas */}
              {bebidasEnCarrito.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Coffee className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-foreground">Bebidas</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Producto</TableHead>
                        <TableHead className="text-xs text-center">Cant.</TableHead>
                        <TableHead className="text-xs text-right">P. Unit</TableHead>
                        <TableHead className="text-xs text-right">Subtotal</TableHead>
                        <TableHead className="text-xs w-10">
                          <span className="sr-only">Acciones</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bebidasEnCarrito.map((item) => (
                        <TableRow key={item.producto.id}>
                          <TableCell className="text-sm py-2">{item.producto.nombre}</TableCell>
                          <TableCell className="text-sm py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => quitarDelCarrito(item.producto.id)}
                              >
                                <Minus className="h-3 w-3" />
                                <span className="sr-only">Quitar</span>
                              </Button>
                              <span className="w-5 text-center font-medium">{item.cantidad}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => agregarAlCarrito(item.producto)}
                                disabled={item.cantidad >= item.producto.stock}
                              >
                                <Plus className="h-3 w-3" />
                                <span className="sr-only">Agregar</span>
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm py-2 text-right">${item.producto.precio.toFixed(2)}</TableCell>
                          <TableCell className="text-sm py-2 text-right font-medium">
                            ${(item.producto.precio * item.cantidad).toFixed(2)}
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => eliminarDelCarrito(item.producto.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Sección Snacks */}
              {snacksEnCarrito.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Cookie className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-semibold text-foreground">Snacks</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Producto</TableHead>
                        <TableHead className="text-xs text-center">Cant.</TableHead>
                        <TableHead className="text-xs text-right">P. Unit</TableHead>
                        <TableHead className="text-xs text-right">Subtotal</TableHead>
                        <TableHead className="text-xs w-10">
                          <span className="sr-only">Acciones</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snacksEnCarrito.map((item) => (
                        <TableRow key={item.producto.id}>
                          <TableCell className="text-sm py-2">{item.producto.nombre}</TableCell>
                          <TableCell className="text-sm py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => quitarDelCarrito(item.producto.id)}
                              >
                                <Minus className="h-3 w-3" />
                                <span className="sr-only">Quitar</span>
                              </Button>
                              <span className="w-5 text-center font-medium">{item.cantidad}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => agregarAlCarrito(item.producto)}
                                disabled={item.cantidad >= item.producto.stock}
                              >
                                <Plus className="h-3 w-3" />
                                <span className="sr-only">Agregar</span>
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm py-2 text-right">${item.producto.precio.toFixed(2)}</TableCell>
                          <TableCell className="text-sm py-2 text-right font-medium">
                            ${(item.producto.precio * item.cantidad).toFixed(2)}
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => eliminarDelCarrito(item.producto.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Total y botón cobrar */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-foreground">TOTAL:</span>
                  <span className="text-2xl font-bold text-foreground">${totalCarrito.toFixed(2)}</span>
                </div>
                <Button className="w-full gap-2" size="lg" onClick={procesarVenta} disabled={procesando}>
                  <DollarSign className="h-5 w-5" />
                  {procesando ? "Procesando..." : `Cobrar $${totalCarrito.toFixed(2)}`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen de ventas del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas hoy</p>
                <p className="text-2xl font-bold text-foreground">${(reporte?.total_ventas || 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tickets emitidos</p>
                <p className="text-2xl font-bold text-foreground">{reporte?.cantidad_tickets || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Productos</p>
                <p className="text-2xl font-bold text-foreground">{productos?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ventas recientes */}
      {ventas && ventas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Ticket</TableHead>
                  <TableHead className="text-xs">Hora</TableHead>
                  <TableHead className="text-xs">Productos</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs text-right">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.slice(0, 5).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">#{String(v.id).padStart(4, "0")}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(v.fecha).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="text-sm">{v.items.map((i) => `${i.nombre} (${i.cantidad})`).join(", ")}</TableCell>
                    <TableCell className="text-sm text-right font-medium">${v.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setVentaActual(v)
                          setTicketOpen(true)
                        }}
                      >
                        <Receipt className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog del ticket imprimible */}
      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket de Venta</DialogTitle>
            <DialogDescription>
              {ventaActual ? `Venta #${String(ventaActual.id).padStart(4, "0")} registrada exitosamente` : ""}
            </DialogDescription>
          </DialogHeader>

          {ventaActual && (
            <div ref={facturaRef} className="font-mono text-sm space-y-3 border rounded-lg p-4 bg-background">
              <div className="text-center border-b-2 border-dashed pb-3">
                <p className="text-lg font-bold">{HOTEL_INFO.nombre}</p>
                <p className="text-xs text-muted-foreground">{HOTEL_INFO.direccion}</p>
                <p className="text-xs text-muted-foreground">Tel: {HOTEL_INFO.telefono}</p>
                <p className="text-xs text-muted-foreground">RUC: {HOTEL_INFO.ruc}</p>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                TICKET DE VENTA #{String(ventaActual.id).padStart(4, "0")}
              </div>

              <div className="border-t border-dashed my-2" />

              <div className="space-y-1">
                <div className="row flex justify-between text-sm">
                  <span>Fecha:</span>
                  <span>{new Date(ventaActual.fecha).toLocaleDateString("es-EC")}</span>
                </div>
                <div className="row flex justify-between text-sm">
                  <span>Hora:</span>
                  <span>
                    {new Date(ventaActual.fecha).toLocaleTimeString("es-EC", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed my-2" />

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs py-1">Producto</th>
                    <th className="text-center text-xs py-1">Cant</th>
                    <th className="text-right text-xs py-1">P.U.</th>
                    <th className="text-right text-xs py-1">Subt.</th>
                  </tr>
                </thead>
                <tbody>
                  {ventaActual.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-1">{item.nombre}</td>
                      <td className="py-1 text-center">{item.cantidad}</td>
                      <td className="py-1 text-right">${item.precio_unit.toFixed(2)}</td>
                      <td className="py-1 text-right">${item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t-2 border-dashed my-2" />

              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL:</span>
                <span>${ventaActual.total.toFixed(2)}</span>
              </div>

              <div className="text-center text-xs text-muted-foreground mt-4 border-t border-dashed pt-3">
                <p>Gracias por su compra</p>
                <p>{new Date().toLocaleString("es-EC")}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="bg-transparent" onClick={() => setTicketOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={handleImprimir} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}