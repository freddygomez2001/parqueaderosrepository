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
  Pizza,
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
  Sparkles,
  Pencil,
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
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

// ─── Componente DateRangePicker personalizado ─────────────────────────────
function CustomDateRangePicker({
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

// ─── Dialog: Editar producto (para corregir errores) ──────────────────────

function EditarProductoDialog({
  producto,
  onProductoActualizado,
}: {
  producto: Producto
  onProductoActualizado: () => void
}) {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState(producto.nombre)
  const [precio, setPrecio] = useState(producto.precio.toString())
  const [stock, setStock] = useState(producto.stock.toString())
  const [categoria, setCategoria] = useState(producto.categoria)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (open) {
      setNombre(producto.nombre)
      setPrecio(producto.precio.toString())
      setStock(producto.stock.toString())
      setCategoria(producto.categoria)
    }
  }, [open, producto])

  const handleSubmit = async () => {
    if (!nombre || !precio || !stock) return
    setGuardando(true)
    const toastId = toast.loading("Actualizando producto...")
    try {
      await actualizarProducto(producto.id, {
        nombre,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        categoria,
      })
      toast.success("Producto actualizado exitosamente", {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />
      })
      setOpen(false)
      onProductoActualizado()
    } catch (error) {
      toast.error("Error al actualizar producto", {
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
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
          <DialogDescription>
            Modifica los datos del producto
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Nombre del producto</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Precio ($)</Label>
              <Input
                type="number"
                step="0.05"
                min="0"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Stock</Label>
              <Input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Categoría</Label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="bebidas">Bebidas</option>
              <option value="snacks">Snacks</option>
              <option value="otros">Otros</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
            <Label>Nombre del producto</Label>
            <Input
              placeholder={categoria === "bebidas" ? "Ej: Limonada" : categoria === "snacks" ? "Ej: Nachos" : "Ej: Cigarrillos Marlboro"}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Precio ($)</Label>
              <Input
                type="number"
                step="0.05"
                min="0"
                placeholder="0.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Stock inicial</Label>
              <Input
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

// ─── Componente de búsqueda en tiempo real ──────────────────────

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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (busqueda.trim().length >= 2) {
      const termino = busqueda.toLowerCase()
      const filtrados = productos
        .filter(p =>
          p.nombre.toLowerCase().includes(termino) && p.activo
        )
        .slice(0, 8)

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
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Buscar cualquier producto: bebidas, snacks, cigarrillos, golosinas..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 200)
          }}
          onFocus={() => {
            if (resultados.length > 0) setOpen(true)
          }}
          className="pl-9 w-full"
          autoComplete="off"
        />
      </div>
      
      {open && resultados.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
          {resultados.map((producto) => {
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
                onMouseDown={(e) => {
                  e.preventDefault()
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
          })}
        </div>
      )}
    </div>
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
                  className={`
                    flex items-center justify-between gap-4 rounded-lg border bg-card p-3 
                    transition-all hover:shadow-sm cursor-pointer
                    ${sinStock ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-muted/50'}
                  `}
                  onClick={() => {
                    if (!sinStock) {
                      onAgregarCarrito(producto)
                    }
                  }}
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
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <EditarProductoDialog
                      producto={producto}
                      onProductoActualizado={onProductoAgregado}
                    />
                    {cant > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            onQuitarCarrito(producto.id)
                          }}
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
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!sinStock) {
                          onAgregarCarrito(producto)
                        }
                      }}
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

// ─── Dialog: Baño (con selector de pago integrado) ────────────────────────

function BanoDialog({
  banoItem,
  onSetBano,
  onCobrar,
}: {
  banoItem: ItemBanoLocal | null
  onSetBano: (personas: number) => void
  onCobrar: (personas: number, metodoPago: "efectivo" | "tarjeta") => void
}) {
  const [open, setOpen] = useState(false)
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "tarjeta">("efectivo")
  const personas = banoItem?.personas ?? 0
  const total = personas * 0.25

  const handleCobrar = () => {
    if (personas > 0) {
      onCobrar(personas, metodoPago)
      setOpen(false)
    }
  }

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
        <div className="py-4">
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
                ${total.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {personas} x $0.25
              </p>
            </div>

            <div className="w-full space-y-3">
              <Label className="text-sm font-medium">Método de pago</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={metodoPago === "efectivo" ? "default" : "outline"}
                  className={`h-12 text-base gap-2 ${metodoPago === "efectivo" ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={() => setMetodoPago("efectivo")}
                >
                  <Banknote className="h-5 w-5" />
                  Efectivo
                </Button>
                <Button
                  variant={metodoPago === "tarjeta" ? "default" : "outline"}
                  className={`h-12 text-base gap-2 ${metodoPago === "tarjeta" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  onClick={() => setMetodoPago("tarjeta")}
                >
                  <CreditCard className="h-5 w-5" />
                  Tarjeta
                </Button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          {personas > 0 && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive flex-1"
              onClick={() => { onSetBano(0); setOpen(false) }}
            >
              Quitar
            </Button>
          )}
          <Button
            onClick={handleCobrar}
            className="flex-1 gap-2"
            disabled={personas === 0}
            size="lg"
          >
            {metodoPago === "efectivo" ? <Banknote className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            Cobrar ${total.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog: Hotel (con selector de pago integrado) ───────────────────────
// ─── Dialog: Hotel (con selector de pago integrado) ───────────────────────

function HotelDialog({
  hotelItem,
  onSetHotel,
  onCobrar,
}: {
  hotelItem: ItemHotelLocal | null
  onSetHotel: (item: ItemHotelLocal | null) => void
  onCobrar: (habitacion: string, monto: number, metodoPago: "efectivo" | "tarjeta") => void
}) {
  const [open, setOpen] = useState(false)
  const [habitacion, setHabitacion] = useState(hotelItem?.habitacion ?? "")
  const [monto, setMonto] = useState(hotelItem?.monto?.toString() ?? "")
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "tarjeta">("efectivo")

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setHabitacion(hotelItem?.habitacion ?? "");
      setMonto(hotelItem?.monto?.toString() ?? "")
    }
    setOpen(isOpen)
  }

  const montoNum = parseFloat(monto) || 0

  const handleHabitacionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Solo permitir números del 1 al 7
    if (value === "") {
      setHabitacion("")
    } else {
      const num = parseInt(value)
      if (!isNaN(num) && num >= 1 && num <= 7) {
        setHabitacion(num.toString())
      }
    }
  }

  const handleCobrar = () => {
    if (habitacion && montoNum > 0) {
      onCobrar(habitacion, montoNum, metodoPago)
      setOpen(false)
    }
  }

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
            Registra el cobro de una habitación. Selecciona el número de habitación (1-7) y el monto a cobrar.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="grid gap-2">
            <Label>Número de habitación (1-7)</Label>
            <Input
              type="number"
              min="1"
              max="7"
              placeholder="Ej: 1, 2, 3, 4, 5, 6, 7"
              value={habitacion}
              onChange={handleHabitacionChange}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {habitacion && (parseInt(habitacion) < 1 || parseInt(habitacion) > 7) && (
              <p className="text-xs text-destructive">La habitación debe ser del 1 al 7</p>
            )}
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
            <>
              <div className="w-full rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Total habitación {habitacion}</p>
                <p className="text-3xl font-bold text-foreground">
                  ${montoNum.toFixed(2)}
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Método de pago</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={metodoPago === "efectivo" ? "default" : "outline"}
                    className={`h-12 text-base gap-2 ${metodoPago === "efectivo" ? "bg-green-600 hover:bg-green-700" : ""}`}
                    onClick={() => setMetodoPago("efectivo")}
                  >
                    <Banknote className="h-5 w-5" />
                    Efectivo
                  </Button>
                  <Button
                    variant={metodoPago === "tarjeta" ? "default" : "outline"}
                    className={`h-12 text-base gap-2 ${metodoPago === "tarjeta" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                    onClick={() => setMetodoPago("tarjeta")}
                  >
                    <CreditCard className="h-5 w-5" />
                    Tarjeta
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="flex gap-2">
          {hotelItem && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive flex-1"
              onClick={() => { onSetHotel(null); setOpen(false) }}
            >
              Quitar
            </Button>
          )}
          <Button
            onClick={handleCobrar}
            className="flex-1 gap-2"
            disabled={!habitacion || montoNum <= 0 || parseInt(habitacion) < 1 || parseInt(habitacion) > 7}
            size="lg"
          >
            {metodoPago === "efectivo" ? <Banknote className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            Cobrar ${montoNum.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Selector de método de pago MEJORADO ───────────────────────────────────

function MetodoPagoSelectorMejorado({
  metodo,
  onChange
}: {
  metodo: "efectivo" | "tarjeta"
  onChange: (m: "efectivo" | "tarjeta") => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-medium">Método de pago</Label>
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant={metodo === "efectivo" ? "default" : "outline"}
          className={`h-14 text-lg gap-3 w-full ${metodo === "efectivo" ? "bg-green-600 hover:bg-green-700" : "border-2"}`}
          onClick={() => onChange("efectivo")}
          size="lg"
        >
          <Banknote className="h-6 w-6" />
          <span className="font-semibold">Efectivo</span>
        </Button>
        <Button
          variant={metodo === "tarjeta" ? "default" : "outline"}
          className={`h-14 text-lg gap-3 w-full ${metodo === "tarjeta" ? "bg-blue-600 hover:bg-blue-700" : "border-2"}`}
          onClick={() => onChange("tarjeta")}
          size="lg"
        >
          <CreditCard className="h-6 w-6" />
          <span className="font-semibold">Tarjeta</span>
        </Button>
      </div>
      {metodo === "tarjeta" && (
        <Badge variant="secondary" className="mt-2 text-sm py-1 px-3">
          No suma a caja
        </Badge>
      )}
    </div>
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
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "tarjeta">("efectivo")

  // Estados para servicios especiales
  const [banoItem, setBanoItem] = useState<ItemBanoLocal | null>(null)
  const [hotelItem, setHotelItem] = useState<ItemHotelLocal | null>(null)

  const [ventaActual, setVentaActual] = useState<VentaRegistrada | null>(null)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [procesando, setProcesando] = useState(false)

  // Estado para filtro de fecha
  const [fechaFiltro, setFechaFiltro] = useState<Date | null>(new Date())

  const facturaRef = useRef<HTMLDivElement>(null)

  // Totales del carrito
  const totalCarrito = carrito.reduce(
    (sum, item) => sum + item.producto.precio * item.cantidad, 0
  )
  const totalItemsCarrito = carrito.reduce((sum, item) => sum + item.cantidad, 0)

  const bebidasEnCarrito = carrito.filter((c) => c.producto.categoria === "bebidas")
  const snacksEnCarrito = carrito.filter((c) => c.producto.categoria === "snacks")
  const otrosEnCarrito = carrito.filter((c) => c.producto.categoria === "otros")

  // ── Funciones del carrito ──────────────────────────────────────────────

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

  // ── Funciones para servicios especiales ─────────────────────────────────

  const handleCobrarBano = async (personas: number, metodoPago: "efectivo" | "tarjeta") => {
    if (personas === 0) return

    setProcesando(true)
    const toastId = toast.loading("Procesando cobro de baño...")

    try {
      const items = [{
        tipo_especial: "bano",
        personas: personas
      }]

      const ventaCreada = await crearVenta(items, metodoPago)

      toast.success("Cobro de baño registrado", {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />,
        description: `Total: $${(personas * 0.25).toFixed(2)}`,
        action: {
          label: "Imprimir",
          onClick: () => handleImprimir(ventaCreada)
        },
      })

      setBanoItem(null)
      setVentaActual(ventaCreada)
      setTicketOpen(true)

      mutateReporte()
      await refrescarEstado()

    } catch (error) {
      toast.error("Error al procesar cobro", {
        id: toastId,
        description: error instanceof Error ? error.message : "Error desconocido",
        icon: <XCircle className="h-4 w-4" />,
      })
    } finally {
      setProcesando(false)
    }
  }

  const handleCobrarHotel = async (habitacion: string, monto: number, metodoPago: "efectivo" | "tarjeta") => {
    setProcesando(true)
    const toastId = toast.loading("Procesando cobro de hotel...")

    try {
      const items = [{
        tipo_especial: "hotel",
        habitacion: habitacion,
        monto_hotel: monto
      }]

      const ventaCreada = await crearVenta(items, metodoPago)

      toast.success("Cobro de hotel registrado", {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />,
        description: `Habitación ${habitacion}: $${monto.toFixed(2)}`,
        action: {
          label: "Imprimir",
          onClick: () => handleImprimir(ventaCreada)
        },
      })

      setHotelItem(null)
      setVentaActual(ventaCreada)
      setTicketOpen(true)

      mutateReporte()
      await refrescarEstado()

    } catch (error) {
      toast.error("Error al procesar cobro", {
        id: toastId,
        description: error instanceof Error ? error.message : "Error desconocido",
        icon: <XCircle className="h-4 w-4" />,
      })
    } finally {
      setProcesando(false)
    }
  }

  // ── Procesar venta de productos ─────────────────────────────────────────

  const procesarVentaEfectivo = async () => {
    if (carrito.length === 0) return

    setProcesando(true)
    const toastId = toast.loading("Procesando venta...")

    try {
      const items = carrito.map((item) => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad
      }))

      const ventaCreada = await crearVenta(items, "efectivo")

      toast.success("Venta registrada exitosamente", {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />,
        description: "Pago en efectivo procesado",
        action: {
          label: "Imprimir",
          onClick: () => handleImprimir(ventaCreada)
        },
      })

      setCarrito([])
      setVentaActual(ventaCreada)
      setTicketOpen(true)

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
    if (carrito.length === 0) return

    setProcesando(true)
    const toastId = toast.loading("Procesando venta con tarjeta...")

    try {
      const items = carrito.map((item) => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad
      }))

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

      setCarrito([])
      setVentaActual(ventaCreada)
      setTicketOpen(true)

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

  // ── Imprimir ────────────────────────────────────────────────────────────

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

  // ── Filtro de ventas por fecha ──────────────────────────────────────────

  const ventasFiltradas = ventas?.filter((v: VentaRegistrada) => {
    if (!fechaFiltro) return true
    const fechaVenta = new Date(v.fecha)
    return (
      fechaVenta.getDate() === fechaFiltro.getDate() &&
      fechaVenta.getMonth() === fechaFiltro.getMonth() &&
      fechaVenta.getFullYear() === fechaFiltro.getFullYear()
    )
  }) || []

  // ── Loading / Error ─────────────────────────────────────────────────────

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

  // ── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Layout de 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Búsqueda y servicios en un solo cuadro */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Búsqueda y Servicios
              </CardTitle>
              <CardDescription>
                Busca productos rápidamente o selecciona servicios adicionales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Buscador integrado */}
              {productos && (
                <BuscadorProductos
                  productos={productos}
                  onAgregarCarrito={agregarAlCarrito}
                  carrito={carrito}
                />
              )}

              {/* Grid de servicios adicionales - AHORA CON 5 COLUMNAS */}
              <div className="grid grid-cols-5 gap-3">
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
                  onSetBano={(personas) => setBanoItem(personas <= 0 ? null : { personas })}
                  onCobrar={handleCobrarBano}
                />
                <HotelDialog
                  hotelItem={hotelItem}
                  onSetHotel={setHotelItem}
                  onCobrar={handleCobrarHotel}
                />
              </div>
            </CardContent>
          </Card>

          {/* Resumen del día */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Ventas hoy</p>
                <p className="text-xl font-bold">${(reporte?.total_ventas || 0).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Tickets</p>
                <p className="text-xl font-bold">{reporte?.cantidad_tickets || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Productos</p>
                <p className="text-xl font-bold">{productos?.length || 0}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Columna derecha: Factura - SIN SCROLL PARA 3+ PRODUCTOS */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <CardTitle>Factura de Venta</CardTitle>
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
              <CardDescription>
                {totalItemsCarrito > 0
                  ? `${totalItemsCarrito} producto${totalItemsCarrito !== 1 ? "s" : ""} en la factura`
                  : "Agrega productos desde la izquierda"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">La factura está vacía</p>
                  <p className="text-sm text-muted-foreground">
                    Haz clic en Bebidas, Snacks u Otros para agregar productos
                  </p>
                </div>
              ) : (
                // ELIMINADO EL max-h-[500px] overflow-y-auto para que NO haya scroll
                <div className="space-y-4">
                  {/* Bebidas */}
                  {bebidasEnCarrito.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 sticky top-0 bg-card py-1">
                        <Coffee className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Bebidas</span>
                      </div>
                      {bebidasEnCarrito.map((item) => (
                        <div key={item.producto.id} className="flex items-center justify-between py-1 border-b border-dashed">
                          <div className="flex-1">
                            <p className="text-sm">{item.producto.nombre}</p>
                            <p className="text-xs text-muted-foreground">${item.producto.precio.toFixed(2)} c/u</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => quitarDelCarrito(item.producto.id)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-medium text-sm">{item.cantidad}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => agregarAlCarrito(item.producto)}
                              disabled={item.cantidad >= item.producto.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <span className="w-16 text-right font-medium text-sm">
                              ${(item.producto.precio * item.cantidad).toFixed(2)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => eliminarDelCarrito(item.producto.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Snacks */}
                  {snacksEnCarrito.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 sticky top-0 bg-card py-1">
                        <Cookie className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Snacks</span>
                      </div>
                      {snacksEnCarrito.map((item) => (
                        <div key={item.producto.id} className="flex items-center justify-between py-1 border-b border-dashed">
                          <div className="flex-1">
                            <p className="text-sm">{item.producto.nombre}</p>
                            <p className="text-xs text-muted-foreground">${item.producto.precio.toFixed(2)} c/u</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => quitarDelCarrito(item.producto.id)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-medium text-sm">{item.cantidad}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => agregarAlCarrito(item.producto)}
                              disabled={item.cantidad >= item.producto.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <span className="w-16 text-right font-medium text-sm">
                              ${(item.producto.precio * item.cantidad).toFixed(2)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => eliminarDelCarrito(item.producto.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Otros */}
                  {otrosEnCarrito.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 sticky top-0 bg-card py-1">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Otros</span>
                      </div>
                      {otrosEnCarrito.map((item) => (
                        <div key={item.producto.id} className="flex items-center justify-between py-1 border-b border-dashed">
                          <div className="flex-1">
                            <p className="text-sm">{item.producto.nombre}</p>
                            <p className="text-xs text-muted-foreground">${item.producto.precio.toFixed(2)} c/u</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => quitarDelCarrito(item.producto.id)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-medium text-sm">{item.cantidad}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => agregarAlCarrito(item.producto)}
                              disabled={item.cantidad >= item.producto.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <span className="w-16 text-right font-medium text-sm">
                              ${(item.producto.precio * item.cantidad).toFixed(2)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => eliminarDelCarrito(item.producto.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total y método de pago */}
                  <div className="border-t-2 pt-4 mt-2 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold">TOTAL:</span>
                      <span className="text-2xl font-bold text-primary">
                        ${totalCarrito.toFixed(2)}
                      </span>
                    </div>

                    <MetodoPagoSelectorMejorado
                      metodo={metodoPago}
                      onChange={setMetodoPago}
                    />

                    {/* Botones de cobro */}
                    {metodoPago === "efectivo" ? (
                      <Button
                        className="w-full gap-2 h-14 text-lg bg-green-600 hover:bg-green-700"
                        onClick={procesarVentaEfectivo}
                        disabled={procesando || totalCarrito === 0}
                      >
                        <Banknote className="h-6 w-6" />
                        Cobrar ${totalCarrito.toFixed(2)} (Efectivo)
                      </Button>
                    ) : (
                      <Button
                        className="w-full gap-2 h-14 text-lg bg-blue-600 hover:bg-blue-700"
                        onClick={procesarVentaTarjeta}
                        disabled={procesando || totalCarrito === 0}
                      >
                        <CreditCard className="h-6 w-6" />
                        Cobrar ${totalCarrito.toFixed(2)} (Tarjeta)
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ventas recientes */}
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
                <CustomDateRangePicker onDateChange={setFechaFiltro} />
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