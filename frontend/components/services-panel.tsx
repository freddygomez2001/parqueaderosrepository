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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CalendarIcon,
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
  ShowerHead,
  Users,
  BedDouble,
  CreditCard,
  Banknote,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Cigarette,
  Gift,
  Soup,
  Pizza,
  Sparkles,
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  obtenerProductos,
  crearProducto,
  crearVenta,
  obtenerVentas,
  obtenerReporteDiarioVentas,
} from "@/servicios/serviciosService"
import { useCaja } from "@/lib/caja-context"

// Datos del hotel
const HOTEL_INFO = {
  nombre: "Hotel La Farola",
  direccion: "Av. Gil Ramirez Davalos y Av Heroes de Verdeloma",
  telefono: "+593 99 808 5600",
  ruc: "1234567890001",
}

// ─── Interfaces ────────────────────────────────────────────────────────────

interface Producto {
  id: number
  nombre: string
  precio: number
  stock: number
  categoria: "bebidas" | "snacks" | "otros"
  activo: boolean
  creado_en?: string
  actualizado_en?: string
}

interface ItemCarrito {
  producto: Producto
  cantidad: number
}

interface ItemBanoLocal {
  personas: number
}

interface ItemHotelLocal {
  habitacion: string
  monto: number
}

interface VentaRegistrada {
  id: number
  items: { nombre: string; cantidad: number; precio_unit: number; subtotal: number }[]
  total: number
  fecha: string
  metodo_pago: "efectivo" | "tarjeta"
}

interface ReporteVentas {
  total_ventas: number
  total_efectivo: number
  total_tarjeta: number
  cantidad_tickets: number
  total_productos_vendidos: number
  ventas_por_categoria: {
    bebidas: number
    snacks: number
    otros: number
    bano: number
    hotel: number
  }
}

// Mapa de íconos por categoría
const CATEGORIA_ICONOS: Record<string, { icon: any; color: string }> = {
  bebidas: { icon: Coffee, color: "text-blue-600 bg-blue-500/10" },
  snacks: { icon: Cookie, color: "text-amber-600 bg-amber-500/10" },
  otros: { icon: Sparkles, color: "text-purple-600 bg-purple-500/10" },
  cigarrillos: { icon: Cigarette, color: "text-red-600 bg-red-500/10" },
  golosinas: { icon: Gift, color: "text-pink-600 bg-pink-500/10" },
  comida: { icon: Pizza, color: "text-orange-600 bg-orange-500/10" },
}

// ─── Dialog: Agregar producto nuevo ───────────────────────────────────────

function AgregarProductoDialog({
  categoria,
  onProductoAgregado,
}: {
  categoria: "bebidas" | "snacks" | "otros"
  onProductoAgregado: () => void
}) {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState("")
  const [stock, setStock] = useState("")
  const [guardando, setGuardando] = useState(false)

  const getCategoriaNombre = () => {
    if (categoria === "bebidas") return "bebida"
    if (categoria === "snacks") return "snack"
    return "producto"
  }

  const handleSubmit = async () => {
    if (!nombre || !precio || !stock) return
    setGuardando(true)
    const toastId = toast.loading("Agregando producto...")
    try {
      await crearProducto({
        nombre,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        categoria
      })
      toast.success("Producto agregado exitosamente", {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />
      })
      setNombre(""); setPrecio(""); setStock("")
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
          Agregar {getCategoriaNombre()}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Agregar nueva {categoria === "bebidas" ? "bebida" : categoria === "snacks" ? "snack" : "producto"}
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
              placeholder={categoria === "bebidas" ? "Ej: Limonada" : categoria === "snacks" ? "Ej: Nachos" : "Ej: Cigarrillos Marlboro"}
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
          <Button
            onClick={handleSubmit}
            disabled={!nombre || !precio || !stock || guardando}
          >
            {guardando ? "Agregando..." : "Agregar producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Componente de búsqueda en tiempo real ────────────────────────────────

function BuscadorProductos({
  productos,
  onAgregarCarrito,
  carrito,
}: {
  productos: Producto[]
  onAgregarCarrito: (producto: Producto) => void
  carrito: ItemCarrito[]
}) {
  const [busqueda, setBusqueda] = useState("")
  const [resultados, setResultados] = useState<Producto[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (busqueda.trim().length >= 2) {
      const termino = busqueda.toLowerCase()
      const filtrados = productos
        // ✅ Buscar TODOS los productos (bebidas, snacks, otros)
        .filter(p =>
          p.nombre.toLowerCase().includes(termino) && p.activo
        )
        .slice(0, 8) // Limitar a 8 resultados

      setResultados(filtrados)
      setOpen(filtrados.length > 0)
    } else {
      setOpen(false)
    }
  }, [busqueda, productos])

  const getCantidadEnCarrito = (productoId: number) => {
    const item = carrito.find(c => c.producto.id === productoId)
    return item?.cantidad || 0
  }

  const getIconoYCategoria = (categoria: string) => {
    switch (categoria) {
      case "bebidas":
        return { icon: Coffee, color: "bg-blue-500/10 text-blue-600" }
      case "snacks":
        return { icon: Cookie, color: "bg-amber-500/10 text-amber-600" }
      case "otros":
        return { icon: Sparkles, color: "bg-purple-500/10 text-purple-600" }
      default:
        return { icon: Package, color: "bg-gray-500/10 text-gray-600" }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cualquier producto: bebidas, snacks, cigarrillos, golosinas..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9 w-full"
            autoComplete="off"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={5}
      >
        <div className="max-h-[300px] overflow-y-auto">
          {resultados.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No se encontraron productos
            </div>
          ) : (
            resultados.map((producto) => {
              const cantidadEnCarrito = getCantidadEnCarrito(producto.id)
              const sinStock = producto.stock - cantidadEnCarrito <= 0
              const { icon: Icon, color } = getIconoYCategoria(producto.categoria)

              return (
                <div
                  key={producto.id}
                  className={`
                    flex items-center justify-between p-3 
                    ${sinStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'} 
                    border-b last:border-0
                  `}
                  onClick={() => {
                    if (!sinStock) {
                      onAgregarCarrito(producto)
                      setBusqueda("")
                      setOpen(false)
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{producto.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        ${producto.precio.toFixed(2)} • Stock: {producto.stock - cantidadEnCarrito}
                      </p>
                    </div>
                  </div>
                  {cantidadEnCarrito > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {cantidadEnCarrito} en factura
                    </Badge>
                  )}
                  {sinStock && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      Agotado
                    </Badge>
                  )}
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Dialog: Catálogo de productos ────────────────────────────────────────

function CatalogoDialog({
  categoria,
  productos,
  carrito,
  onAgregarCarrito,
  onQuitarCarrito,
  onProductoAgregado,
}: {
  categoria: "bebidas" | "snacks" | "otros"
  productos: Producto[]
  carrito: ItemCarrito[]
  onAgregarCarrito: (producto: Producto) => void
  onQuitarCarrito: (productoId: number) => void
  onProductoAgregado: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  const productosCategoria = productos
    .filter((p) => p.categoria === categoria)
    .filter((p) =>
      busqueda.trim() === "" ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    )

  const totalItems = carrito
    .filter((c) => c.producto.categoria === categoria)
    .reduce((s, i) => s + i.cantidad, 0)

  const getCantidad = (id: number) =>
    carrito.find((c) => c.producto.id === id)?.cantidad ?? 0

  // En services-panel.tsx - Asegurar que el ícono para "otros" sea correcto

  const getCategoriaInfo = () => {
    if (categoria === "bebidas") return {
      icon: Coffee,
      color: "text-blue-600 bg-blue-500/10",
      nombre: "Bebidas",
      colorBorder: "border-blue-200 hover:border-blue-500"
    }
    if (categoria === "snacks") return {
      icon: Cookie,
      color: "text-amber-600 bg-amber-500/10",
      nombre: "Snacks",
      colorBorder: "border-amber-200 hover:border-amber-500"
    }
    return {
      icon: Sparkles,
      color: "text-purple-600 bg-purple-500/10",
      nombre: "Otros",
      colorBorder: "border-purple-200 hover:border-purple-500"
    }
  }

  const info = getCategoriaInfo()
  const Icon = info.icon

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={`group relative flex flex-col items-center gap-4 rounded-xl border-2 border-border bg-card p-8 transition-all hover:shadow-lg ${info.colorBorder}`}>
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${info.color}`}>
            <Icon className="h-10 w-10" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">{info.nombre}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {productosCategoria.length} productos disponibles
            </p>
          </div>
          {totalItems > 0 && (
            <Badge className="absolute top-3 right-3">
              {totalItems} en factura
            </Badge>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${info.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <DialogTitle>{info.nombre}</DialogTitle>
              <Badge variant="secondary">{productosCategoria.length}</Badge>
            </div>
            <AgregarProductoDialog
              categoria={categoria}
              onProductoAgregado={onProductoAgregado}
            />
          </div>
          <DialogDescription>
            Selecciona los productos que deseas agregar a la factura.
          </DialogDescription>

          {/* Buscador dentro del catálogo */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Buscar en ${info.nombre.toLowerCase()}...`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
          {productosCategoria.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No hay productos en esta categoría.</p>
              <p className="text-sm text-muted-foreground">
                Usa el botón Agregar de arriba.
              </p>
            </div>
          ) : (
            productosCategoria.map((producto) => {
              const cant = getCantidad(producto.id)
              const sinStock = producto.stock - cant <= 0
              return (
                <div
                  key={producto.id}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3 transition-all hover:shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {producto.nombre}
                      </p>
                      {sinStock && (
                        <Badge variant="destructive" className="text-xs shrink-0">
                          Agotado
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        ${producto.precio.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        Stock: {producto.stock - cant}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {cant > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-transparent"
                          onClick={() => onQuitarCarrito(producto.id)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-semibold text-sm">
                          {cant}
                        </span>
                      </>
                    )}
                    <Button
                      variant={cant > 0 ? "default" : "outline"}
                      size="icon"
                      className={`h-8 w-8 ${cant === 0 ? "bg-transparent" : ""}`}
                      onClick={() => onAgregarCarrito(producto)}
                      disabled={sinStock}
                    >
                      <Plus className="h-3 w-3" />
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

// ─── Dialog: Baño ─────────────────────────────────────────────────────────

function BanoDialog({
  banoItem,
  onSetBano
}: {
  banoItem: ItemBanoLocal | null
  onSetBano: (personas: number) => void
}) {
  const [open, setOpen] = useState(false)
  const personas = banoItem?.personas ?? 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="group relative flex flex-col items-center gap-4 rounded-xl border-2 border-border bg-card p-8 transition-all hover:border-teal-500 hover:shadow-lg">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 transition-transform group-hover:scale-110">
            <ShowerHead className="h-10 w-10" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">Baño</h3>
            <p className="mt-1 text-sm text-muted-foreground">$0.25 por persona</p>
          </div>
          {personas > 0 && (
            <Badge className="absolute top-3 right-3">
              {personas} persona{personas !== 1 ? "s" : ""}
            </Badge>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShowerHead className="h-5 w-5 text-teal-600" />
            <DialogTitle>Servicio de Baño</DialogTitle>
          </div>
          <DialogDescription>
            Cada persona paga $0.25. Selecciona cuántas personas van a usar el baño.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-6">
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full bg-transparent"
                onClick={() => onSetBano(Math.max(0, personas - 1))}
                disabled={personas <= 0}
              >
                <Minus className="h-6 w-6" />
              </Button>
              <div className="text-center">
                <div className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-muted-foreground" />
                  <span className="text-5xl font-bold text-foreground">{personas}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  persona{personas !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full bg-transparent"
                onClick={() => onSetBano(personas + 1)}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
            <div className="w-full rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">Total baño</p>
              <p className="text-3xl font-bold text-foreground">
                ${(personas * 0.25).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {personas} x $0.25
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          {personas > 0 && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => { onSetBano(0); setOpen(false) }}
            >
              Quitar
            </Button>
          )}
          <Button onClick={() => setOpen(false)} className="flex-1">
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog: Hotel ─────────────────────────────────────────────────────────

function HotelDialog({
  hotelItem,
  onSetHotel
}: {
  hotelItem: ItemHotelLocal | null
  onSetHotel: (item: ItemHotelLocal | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [habitacion, setHabitacion] = useState(hotelItem?.habitacion ?? "")
  const [monto, setMonto] = useState(hotelItem?.monto?.toString() ?? "")

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setHabitacion(hotelItem?.habitacion ?? "");
      setMonto(hotelItem?.monto?.toString() ?? "")
    }
    setOpen(isOpen)
  }

  const montoNum = parseFloat(monto) || 0

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="group relative flex flex-col items-center gap-4 rounded-xl border-2 border-border bg-card p-8 transition-all hover:border-purple-500 hover:shadow-lg">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 transition-transform group-hover:scale-110">
            <BedDouble className="h-10 w-10" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">Hotel</h3>
            <p className="mt-1 text-sm text-muted-foreground">Cobro de habitación</p>
          </div>
          {hotelItem && (
            <Badge className="absolute top-3 right-3">
              Hab. {hotelItem.habitacion}
            </Badge>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-purple-600" />
            <DialogTitle>Servicio de Hotel</DialogTitle>
          </div>
          <DialogDescription>
            Registra el cobro de una habitación. Ingresa el número y el monto a cobrar.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="grid gap-2">
            <Label>Número de habitación</Label>
            <Input
              placeholder="Ej: 101, 205, Suite A"
              value={habitacion}
              onChange={(e) => setHabitacion(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Monto a cobrar ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
          {habitacion && montoNum > 0 && (
            <div className="w-full rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">Total habitación {habitacion}</p>
              <p className="text-3xl font-bold text-foreground">
                ${montoNum.toFixed(2)}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          {hotelItem && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => { onSetHotel(null); setOpen(false) }}
            >
              Quitar
            </Button>
          )}
          <Button
            onClick={() => {
              onSetHotel({ habitacion, monto: montoNum });
              setOpen(false)
            }}
            className="flex-1"
            disabled={!habitacion || montoNum <= 0}
          >
            {hotelItem ? "Actualizar" : "Agregar a factura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Selector de método de pago ────────────────────────────────────────────

function MetodoPagoSelector({
  metodo,
  onChange
}: {
  metodo: "efectivo" | "tarjeta"
  onChange: (m: "efectivo" | "tarjeta") => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Pago:</span>
      <div className="flex rounded-lg border bg-muted/30 p-1">
        {(["efectivo", "tarjeta"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${metodo === m
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {m === "efectivo" ? <Banknote className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            {m === "efectivo" ? "Efectivo" : "Tarjeta"}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Selector de fecha ─────────────────────────────────────────────────────

function DateRangePicker({
  onDateChange
}: {
  onDateChange: (date: Date | null) => void
}) {
  const [date, setDate] = useState<Date | null>(new Date())

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: es }) : <span>Filtrar por fecha</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date || undefined}
          onSelect={(newDate) => {
            setDate(newDate || null)
            onDateChange(newDate || null)
          }}
          initialFocus
          locale={es}
        />
      </PopoverContent>
    </Popover>
  )
}

// ─── Componente Principal ──────────────────────────────────────────────────

export function ServicesPanel() {
  const { refrescarEstado } = useCaja()

  // SWR para productos
  const {
    data: productos,
    error: productosError,
    isLoading: productosLoading,
    mutate: mutateProductos
  } = useSWR(
    "productos",
    () => obtenerProductos(null, true),
    { refreshInterval: 30000 }
  )

  // SWR para ventas
  const { data: ventas, mutate: mutateVentas } = useSWR(
    "ventas",
    () => obtenerVentas(null, 100),
    { refreshInterval: 30000 }
  )

  // SWR para reporte diario
  const { data: reporte, mutate: mutateReporte } = useSWR(
    "reporte-ventas",
    () => obtenerReporteDiarioVentas(),
    { refreshInterval: 60000 }
  )
  // Estado del carrito
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [banoItem, setBanoItem] = useState<ItemBanoLocal | null>(null)
  const [hotelItem, setHotelItem] = useState<ItemHotelLocal | null>(null)
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "tarjeta">("efectivo")

  const [ventaActual, setVentaActual] = useState<VentaRegistrada | null>(null)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [procesando, setProcesando] = useState(false)

  // Estado para filtro de fecha
  const [fechaFiltro, setFechaFiltro] = useState<Date | null>(new Date())

  const facturaRef = useRef<HTMLDivElement>(null)

  // Totales
  const totalProductos = carrito.reduce(
    (sum, item) => sum + item.producto.precio * item.cantidad, 0
  )
  const totalBano = banoItem ? banoItem.personas * 0.25 : 0
  const totalHotel = hotelItem ? hotelItem.monto : 0
  const totalCarrito = totalProductos + totalBano + totalHotel
  const totalItemsCarrito =
    carrito.reduce((sum, item) => sum + item.cantidad, 0) +
    (banoItem?.personas ?? 0) +
    (hotelItem ? 1 : 0)

  const bebidasEnCarrito = carrito.filter((c) => c.producto.categoria === "bebidas")
  const snacksEnCarrito = carrito.filter((c) => c.producto.categoria === "snacks")
  const otrosEnCarrito = carrito.filter((c) => c.producto.categoria === "otros")

  // ── Carrito ───────────────────────────────────────────────────────────────

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito((prev) => {
      const existe = prev.find((c) => c.producto.id === producto.id)
      if (existe) {
        if (existe.cantidad >= producto.stock) {
          toast.warning("Stock insuficiente", {
            description: `Solo hay ${producto.stock} unidades disponibles`,
            icon: <AlertCircle className="h-4 w-4" />
          })
          return prev
        }
        return prev.map((c) =>
          c.producto.id === producto.id
            ? { ...c, cantidad: c.cantidad + 1 }
            : c
        )
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
      return prev.map((c) =>
        c.producto.id === productoId
          ? { ...c, cantidad: c.cantidad - 1 }
          : c
      )
    })
  }

  const eliminarDelCarrito = (productoId: number) => {
    setCarrito((prev) => prev.filter((c) => c.producto.id !== productoId))
  }

  const handleSetBano = (personas: number) => {
    setBanoItem(personas <= 0 ? null : { personas })
  }

  // ── Procesar venta ────────────────────────────────────────────────────────
  // En ServicesPanel - Modificar la función procesarVenta

  const procesarVenta = async () => {
    if (carrito.length === 0 && !banoItem && !hotelItem) return
    setProcesando(true)
    const toastId = toast.loading("Procesando venta...")

    try {
      // Construir array de items para la API
      const items = [
        ...carrito.map((item) => ({
          producto_id: item.producto.id,
          cantidad: item.cantidad
        })),
        ...(banoItem ? [{
          tipo_especial: "bano",
          personas: banoItem.personas
        }] : []),
        ...(hotelItem ? [{
          tipo_especial: "hotel",
          habitacion: hotelItem.habitacion,
          monto_hotel: hotelItem.monto
        }] : []),
      ]

      const ventaCreada = await crearVenta(items, metodoPago)

      toast.success("Venta registrada exitosamente", {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />,
        action: {
          label: "Imprimir",
          onClick: () => handleImprimir(ventaCreada)
        },
      })

      // Limpiar estado
      setCarrito([])
      setBanoItem(null)
      setHotelItem(null)
      setMetodoPago("efectivo")
      setVentaActual(ventaCreada)
      setTicketOpen(true)

      // ✅ REFRESCAR TODOS LOS DATOS
      mutateProductos()  // Actualiza productos (stock)
      mutateVentas()     // Actualiza ventas recientes
      mutateReporte()    // 👈 ACTUALIZA EL REPORTE DIARIO

      // También refrescar estado de caja
      await refrescarEstado()

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

  // ─── Dialog: Pago con efectivo y cálculo de vuelto ────────────────────────

  function PagoEfectivoDialog({
    total,
    onConfirmar,
    onCancelar,
    open,
    onOpenChange
  }: {
    total: number
    onConfirmar: (montoRecibido: number) => void
    onCancelar: () => void
    open: boolean
    onOpenChange: (open: boolean) => void
  }) {
    const [montoRecibido, setMontoRecibido] = useState("")
    const [error, setError] = useState("")

    const montoRecibidoNum = parseFloat(montoRecibido) || 0
    const vuelto = montoRecibidoNum - total
    const esSuficiente = montoRecibidoNum >= total

    const handleConfirmar = () => {
      if (!montoRecibido) {
        setError("Ingrese el monto recibido")
        return
      }
      if (montoRecibidoNum < total) {
        setError(`El monto es insuficiente. Faltan $${(total - montoRecibidoNum).toFixed(2)}`)
        return
      }
      onConfirmar(montoRecibidoNum)
      setMontoRecibido("")
      setError("")
      onOpenChange(false)
    }

    // Reset cuando se abre el diálogo
    useEffect(() => {
      if (open) {
        setMontoRecibido("")
        setError("")
      }
    }, [open])

    // Sugerencias rápidas
    const sugerencias = [
      total,
      Math.ceil(total),
      Math.ceil(total / 5) * 5,
      Math.ceil(total / 10) * 10,
    ].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b)

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                <Banknote className="h-4 w-4 text-green-600" />
              </div>
              <DialogTitle>Pago en efectivo</DialogTitle>
            </div>
            <DialogDescription>
              Ingresa el monto con el que paga el cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Total a cobrar */}
            <div className="rounded-lg bg-primary/10 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total a cobrar</p>
              <p className="text-3xl font-bold text-primary">${total.toFixed(2)}</p>
            </div>

            {/* Monto recibido */}
            <div className="grid gap-2">
              <Label htmlFor="monto-recibido">Monto recibido ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="monto-recibido"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={montoRecibido}
                  onChange={(e) => {
                    setMontoRecibido(e.target.value)
                    setError("")
                  }}
                  className="pl-10 text-2xl h-14 font-mono"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            {/* Botones de sugerencias */}
            <div className="flex flex-wrap gap-2">
              {sugerencias.map((sug) => (
                <Button
                  key={sug}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMontoRecibido(sug.toFixed(2))
                    setError("")
                  }}
                  className="bg-transparent"
                >
                  ${sug.toFixed(2)}
                </Button>
              ))}
            </div>

            {/* Vuelto a devolver */}
            {montoRecibido && (
              <div className={`rounded-lg p-4 text-center ${esSuficiente ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                <p className="text-xs text-muted-foreground mb-1">
                  {esSuficiente ? 'Vuelto a devolver' : 'Monto insuficiente'}
                </p>
                <p className={`text-2xl font-bold ${esSuficiente ? 'text-green-600' : 'text-destructive'}`}>
                  {esSuficiente
                    ? `$${vuelto.toFixed(2)}`
                    : `Faltan $${(total - montoRecibidoNum).toFixed(2)}`
                  }
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                onCancelar()
                onOpenChange(false)
                setMontoRecibido("")
                setError("")
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={!esSuficiente || !montoRecibido}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
  // En ServicesPanel, agregar estos estados:

  // Estado para el diálogo de pago en efectivo
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false)

  // Modificar la función procesarVenta para recibir el monto recibido:

  const procesarVentaConEfectivo = async (montoRecibido: number) => {
    setProcesando(true)
    const toastId = toast.loading("Procesando venta...")

    try {
      // Construir array de items para la API
      const items = [
        ...carrito.map((item) => ({
          producto_id: item.producto.id,
          cantidad: item.cantidad
        })),
        ...(banoItem ? [{
          tipo_especial: "bano",
          personas: banoItem.personas
        }] : []),
        ...(hotelItem ? [{
          tipo_especial: "hotel",
          habitacion: hotelItem.habitacion,
          monto_hotel: hotelItem.monto
        }] : []),
      ]

      const ventaCreada = await crearVenta(items, "efectivo")

      // Calcular vuelto
      const vuelto = montoRecibido - totalCarrito

      toast.success("Venta registrada exitosamente", {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />,
        description: vuelto > 0 ? `Vuelto: $${vuelto.toFixed(2)}` : "Pago exacto",
        action: {
          label: "Imprimir",
          onClick: () => handleImprimir(ventaCreada)
        },
      })

      // Limpiar estado
      setCarrito([])
      setBanoItem(null)
      setHotelItem(null)
      setVentaActual(ventaCreada)
      setTicketOpen(true)

      // Refrescar datos
      mutateProductos()
      mutateVentas()
      mutateReporte()
      await refrescarEstado()

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

  const procesarVentaTarjeta = async () => {
    setProcesando(true)
    const toastId = toast.loading("Procesando venta con tarjeta...")

    try {
      const items = [
        ...carrito.map((item) => ({
          producto_id: item.producto.id,
          cantidad: item.cantidad
        })),
        ...(banoItem ? [{
          tipo_especial: "bano",
          personas: banoItem.personas
        }] : []),
        ...(hotelItem ? [{
          tipo_especial: "hotel",
          habitacion: hotelItem.habitacion,
          monto_hotel: hotelItem.monto
        }] : []),
      ]

      const ventaCreada = await crearVenta(items, "tarjeta")

      toast.success("Venta registrada exitosamente", {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />,
        description: "Pago con tarjeta procesado",
        action: {
          label: "Imprimir",
          onClick: () => handleImprimir(ventaCreada)
        },
      })

      // Limpiar estado
      setCarrito([])
      setBanoItem(null)
      setHotelItem(null)
      setVentaActual(ventaCreada)
      setTicketOpen(true)

      // Refrescar datos
      mutateProductos()
      mutateVentas()
      mutateReporte()
      await refrescarEstado()

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
  // ── Imprimir ──────────────────────────────────────────────────────────────

  const handleImprimir = (venta: VentaRegistrada) => {
    const printWindow = window.open("", "", "width=72mm,height=600")
    if (!printWindow) {
      toast.error("No se pudo abrir ventana de impresión")
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>Ticket de Venta #${String(venta.id).padStart(4, "0")}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Courier New', monospace; }
          body { width: 72mm; margin: 0; padding: 2mm; font-size: 11px; line-height: 1.2; }
          @media print { @page { size: 72mm auto; margin: 0; } body { width: 72mm !important; margin: 0 !important; padding: 2mm !important; } }
          .center { text-align: center; } .bold { font-weight: bold; }
          .separator { border: none; border-top: 1px dashed #000; margin: 3px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin: 3px 0; }
          th, td { text-align: left; padding: 2px 0; font-size: 10px; }
          th:last-child, td:last-child { text-align: right; }
          th { border-bottom: 1px solid #000; }
          .total { font-size: 14px; font-weight: bold; margin: 5px 0; }
        </style>
      </head><body>
        <div class="center bold" style="font-size:13px">${HOTEL_INFO.nombre}</div>
        <div class="center" style="font-size:9px">${HOTEL_INFO.direccion}</div>
        <div class="center" style="font-size:9px">Tel: ${HOTEL_INFO.telefono}</div>
        <div class="center" style="font-size:9px">RUC: ${HOTEL_INFO.ruc}</div>
        <div class="separator"></div>
        <div class="center" style="font-size:10px">TICKET DE VENTA #${String(venta.id).padStart(4, "0")}</div>
        <div class="separator"></div>
        <div class="row"><span>Fecha:</span><span>${new Date(venta.fecha).toLocaleDateString("es-EC")}</span></div>
        <div class="row"><span>Hora:</span><span>${new Date(venta.fecha).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</span></div>
        <div class="row"><span>Pago:</span><span class="bold">${(venta.metodo_pago || "efectivo").toUpperCase()}</span></div>
        <div class="separator"></div>
        <table>
          <thead><tr>
            <th>Descripción</th>
            <th style="text-align:center">Cant</th>
            <th style="text-align:right">P.U.</th>
            <th style="text-align:right">Subt.</th>
          </tr></thead>
          <tbody>
            ${venta.items.map((item) => `
              <tr>
                <td>${item.nombre}</td>
                <td style="text-align:center">${item.cantidad}</td>
                <td style="text-align:right">$${item.precio_unit.toFixed(2)}</td>
                <td style="text-align:right">$${item.subtotal.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="separator"></div>
        <div class="row total"><span>TOTAL:</span><span>$${venta.total.toFixed(2)}</span></div>
        <div class="separator"></div>
        <div class="center" style="font-size:9px;margin-top:5px">
          <div>Gracias por su compra</div>
          <div>${new Date().toLocaleString("es-EC")}</div>
        </div>
      </body></html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
      setTimeout(() => {
        if (!printWindow.closed) printWindow.close()
      }, 1000)
    }, 500)
  }

  // ── Filtro de ventas por fecha ────────────────────────────────────────────

  const ventasFiltradas = ventas?.filter((v: VentaRegistrada) => {
    if (!fechaFiltro) return true
    const fechaVenta = new Date(v.fecha)
    return (
      fechaVenta.getDate() === fechaFiltro.getDate() &&
      fechaVenta.getMonth() === fechaFiltro.getMonth() &&
      fechaVenta.getFullYear() === fechaFiltro.getFullYear()
    )
  }) || []

  // ── Loading / Error ───────────────────────────────────────────────────────

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
          <p className="text-destructive">
            Error al cargar productos. Verifica la conexión con el servidor.
          </p>
        </CardContent>
      </Card>
    )
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Buscador rápido en la parte superior */}


      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda rápida
          </CardTitle>
          <CardDescription>
            Busca cualquier producto: bebidas, snacks, cigarrillos, golosinas y más en tiempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productos && (
            <BuscadorProductos
              productos={productos}
              onAgregarCarrito={agregarAlCarrito}
              carrito={carrito}
            />
          )}
        </CardContent>
      </Card>

      {/* Categorías */}
      <Card>
        <CardHeader>
          <CardTitle>Servicios Adicionales</CardTitle>
          <CardDescription>
            Selecciona una categoría para agregar productos a la factura.
            Puedes mezclar bebidas, snacks, otros productos, baño y hotel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
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
            <CatalogoDialog
              categoria="otros"
              productos={productos || []}
              carrito={carrito}
              onAgregarCarrito={agregarAlCarrito}
              onQuitarCarrito={quitarDelCarrito}
              onProductoAgregado={() => mutateProductos()}
            />
            <BanoDialog
              banoItem={banoItem}
              onSetBano={handleSetBano}
            />
            <HotelDialog
              hotelItem={hotelItem}
              onSetHotel={setHotelItem}
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
                  ? `${totalItemsCarrito} item${totalItemsCarrito !== 1 ? "s" : ""} en la factura`
                  : "Agrega productos desde las categorías de arriba"}
              </CardDescription>
            </div>
            {totalItemsCarrito > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setCarrito([]);
                  setBanoItem(null);
                  setHotelItem(null)
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Vaciar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {carrito.length === 0 && !banoItem && !hotelItem ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">La factura está vacía</p>
              <p className="text-sm text-muted-foreground">
                Haz clic en Bebidas, Snacks, Otros, Baño o Hotel para agregar items
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bebidas */}
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
                        <TableHead className="text-xs w-10"><span className="sr-only">Acciones</span></TableHead>
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
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm py-2 text-right">
                            ${item.producto.precio.toFixed(2)}
                          </TableCell>
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
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Snacks */}
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
                        <TableHead className="text-xs w-10"><span className="sr-only">Acciones</span></TableHead>
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
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm py-2 text-right">
                            ${item.producto.precio.toFixed(2)}
                          </TableCell>
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
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Otros productos */}
              {otrosEnCarrito.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-semibold text-foreground">Otros</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Producto</TableHead>
                        <TableHead className="text-xs text-center">Cant.</TableHead>
                        <TableHead className="text-xs text-right">P. Unit</TableHead>
                        <TableHead className="text-xs text-right">Subtotal</TableHead>
                        <TableHead className="text-xs w-10"><span className="sr-only">Acciones</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otrosEnCarrito.map((item) => (
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
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm py-2 text-right">
                            ${item.producto.precio.toFixed(2)}
                          </TableCell>
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
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Baño */}
              {banoItem && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShowerHead className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-semibold text-foreground">Baño</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Servicio</TableHead>
                        <TableHead className="text-xs text-center">Personas</TableHead>
                        <TableHead className="text-xs text-right">P. Unit</TableHead>
                        <TableHead className="text-xs text-right">Subtotal</TableHead>
                        <TableHead className="text-xs w-10"><span className="sr-only">Acciones</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-sm py-2">Uso de baño</TableCell>
                        <TableCell className="text-sm py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleSetBano(banoItem.personas - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-5 text-center font-medium">{banoItem.personas}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleSetBano(banoItem.personas + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm py-2 text-right">$0.25</TableCell>
                        <TableCell className="text-sm py-2 text-right font-medium">
                          ${totalBano.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setBanoItem(null)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Hotel */}
              {hotelItem && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BedDouble className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-semibold text-foreground">Hotel</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Servicio</TableHead>
                        <TableHead className="text-xs text-center">Hab.</TableHead>
                        <TableHead className="text-xs text-right">Monto</TableHead>
                        <TableHead className="text-xs w-10"><span className="sr-only">Acciones</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-sm py-2">Habitación</TableCell>
                        <TableCell className="text-sm py-2 text-center font-medium">
                          {hotelItem.habitacion}
                        </TableCell>
                        <TableCell className="text-sm py-2 text-right font-medium">
                          ${hotelItem.monto.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setHotelItem(null)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Total + método de pago + cobrar */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-foreground">TOTAL:</span>
                  <span className="text-2xl font-bold text-foreground">
                    ${totalCarrito.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <MetodoPagoSelector
                    metodo={metodoPago}
                    onChange={setMetodoPago}
                  />
                  {metodoPago === "tarjeta" && (
                    <Badge variant="secondary" className="text-xs">
                      No suma a caja
                    </Badge>
                  )}
                </div>

                {/* Botón de cobrar según método de pago */}
                {metodoPago === "efectivo" ? (
                  <Button
                    className="w-full gap-2 bg-green-600 hover:bg-green-700"
                    size="lg"
                    onClick={() => setPagoDialogOpen(true)}
                    disabled={procesando || totalCarrito === 0}
                  >
                    <Banknote className="h-5 w-5" />
                    {procesando ? "Procesando..." : `Cobrar $${totalCarrito.toFixed(2)}`}
                  </Button>
                ) : (
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={procesarVentaTarjeta}
                    disabled={procesando || totalCarrito === 0}
                  >
                    <CreditCard className="h-5 w-5" />
                    {procesando ? "Procesando..." : `Cobrar $${totalCarrito.toFixed(2)} (Tarjeta)`}
                  </Button>
                )}
              </div>

              {/* Diálogo de pago en efectivo */}
              <PagoEfectivoDialog
                total={totalCarrito}
                open={pagoDialogOpen}
                onOpenChange={setPagoDialogOpen}
                onConfirmar={procesarVentaConEfectivo}
                onCancelar={() => setPagoDialogOpen(false)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas hoy</p>
                <p className="text-2xl font-bold text-foreground">
                  ${(reporte?.total_ventas || 0).toFixed(2)}
                </p>
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
                <p className="text-2xl font-bold text-foreground">
                  {reporte?.cantidad_tickets || 0}
                </p>
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
                <p className="text-2xl font-bold text-foreground">
                  {productos?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ventas recientes con filtro por fecha */}
      {ventas && ventas.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base">Ventas recientes</CardTitle>
                <CardDescription>
                  {fechaFiltro
                    ? `Ventas del ${format(fechaFiltro, "PPP", { locale: es })}`
                    : "Todas las ventas"
                  }
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <DateRangePicker onDateChange={setFechaFiltro} />
                {fechaFiltro && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFechaFiltro(null)}
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {ventasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground">
                  No hay ventas {fechaFiltro ? "en esta fecha" : "registradas"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Ticket</TableHead>
                    <TableHead className="text-xs">Hora</TableHead>
                    <TableHead className="text-xs">Items</TableHead>
                    <TableHead className="text-xs text-center">Pago</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right"><span className="sr-only">Ver</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventasFiltradas.map((v: VentaRegistrada) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-sm">
                        #{String(v.id).padStart(4, "0")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(v.fecha).toLocaleTimeString("es-EC", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[200px]">
                        {v.items.map((i) => `${i.nombre} (${i.cantidad})`).join(", ")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={v.metodo_pago === "tarjeta" ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {v.metodo_pago === "tarjeta"
                            ? <span className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              Tarjeta
                            </span>
                            : <span className="flex items-center gap-1">
                              <Banknote className="h-3 w-3" />
                              Efectivo
                            </span>
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        ${v.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setVentaActual(v);
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog ticket */}
      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket de Venta</DialogTitle>
            <DialogDescription>
              {ventaActual
                ? `Venta #${String(ventaActual.id).padStart(4, "0")} registrada exitosamente`
                : ""
              }
            </DialogDescription>
          </DialogHeader>
          {ventaActual && (
            <div
              ref={facturaRef}
              className="font-mono text-sm space-y-3 border rounded-lg p-4 bg-background"
            >
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
                <div className="flex justify-between text-sm">
                  <span>Fecha:</span>
                  <span>{new Date(ventaActual.fecha).toLocaleDateString("es-EC")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Hora:</span>
                  <span>
                    {new Date(ventaActual.fecha).toLocaleTimeString("es-EC", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pago:</span>
                  <span className="font-bold">
                    {(ventaActual.metodo_pago || "efectivo").toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="border-t border-dashed my-2" />
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs py-1">Descripción</th>
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
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setTicketOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              onClick={() => ventaActual && handleImprimir(ventaActual)}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}