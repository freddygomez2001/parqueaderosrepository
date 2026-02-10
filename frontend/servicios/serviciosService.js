// src/servicios/serviciosService.js
import { BASE_URL } from "./api";

const PRODUCTOS_URL = `${BASE_URL}/api/productos`;
const VENTAS_URL = `${BASE_URL}/api/ventas-servicios`;

// ============================
// 📌 PRODUCTOS
// ============================

/**
 * Obtener todos los productos
 * @param {string|null} categoria - 'bebidas', 'snacks' o null para todos
 * @param {boolean} activosSolo - true para solo productos activos
 */
export async function obtenerProductos(categoria = null, activosSolo = true) {
  try {
    let url = `${PRODUCTOS_URL}/?activos_solo=${activosSolo}`;
    if (categoria) url += `&categoria=${categoria}`;

    const response = await fetch(url, { method: "GET" });
    if (!response.ok) throw new Error("Error al obtener productos");
    return await response.json();
  } catch (error) {
    console.error("❌ Error en obtenerProductos:", error);
    throw error;
  }
}

/**
 * Obtener producto por ID
 * @param {number} productoId
 */
export async function obtenerProductoPorId(productoId) {
  try {
    const response = await fetch(`${PRODUCTOS_URL}/${productoId}`, { method: "GET" });
    if (!response.ok) throw new Error(`Producto ${productoId} no encontrado`);
    return await response.json();
  } catch (error) {
    console.error("❌ Error en obtenerProductoPorId:", error);
    throw error;
  }
}

/**
 * Crear nuevo producto
 * @param {Object} datos - {nombre, precio, stock, categoria}
 */
export async function crearProducto(datos) {
  try {
    const response = await fetch(PRODUCTOS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: datos.nombre.trim(),
        precio: parseFloat(datos.precio),
        stock: parseInt(datos.stock),
        categoria: datos.categoria,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al crear producto");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error en crearProducto:", error);
    throw error;
  }
}

/**
 * Actualizar producto existente
 * @param {number} productoId
 * @param {Object} datos - Campos a actualizar
 */
export async function actualizarProducto(productoId, datos) {
  try {
    const datosLimpios = {};
    if (datos.nombre !== undefined && datos.nombre !== null) datosLimpios.nombre = datos.nombre.trim();
    if (datos.precio !== undefined && datos.precio !== null) datosLimpios.precio = parseFloat(datos.precio);
    if (datos.stock !== undefined && datos.stock !== null) datosLimpios.stock = parseInt(datos.stock);
    if (datos.categoria !== undefined && datos.categoria !== null) datosLimpios.categoria = datos.categoria;
    if (datos.activo !== undefined && datos.activo !== null) datosLimpios.activo = datos.activo;

    const response = await fetch(`${PRODUCTOS_URL}/${productoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datosLimpios),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al actualizar producto");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error en actualizarProducto:", error);
    throw error;
  }
}

/**
 * Eliminar (desactivar) producto
 * @param {number} productoId
 */
export async function eliminarProducto(productoId) {
  try {
    const response = await fetch(`${PRODUCTOS_URL}/${productoId}`, { method: "DELETE" });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al eliminar producto");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error en eliminarProducto:", error);
    throw error;
  }
}

// ============================
// 📌 VENTAS
// ============================

/**
 * Crear nueva venta — soporta productos del catálogo, baño y hotel.
 *
 * @param {Array} items - Mezcla de:
 *   - Producto:  { producto_id: number, cantidad: number }
 *   - Baño:      { tipo_especial: "bano", personas: number }
 *   - Hotel:     { tipo_especial: "hotel", habitacion: string, monto_hotel: number }
 * @param {"efectivo"|"tarjeta"} metodoPago
  */
export async function crearVenta(items, metodoPago = "efectivo") {
  try {
    // Normalizar items según su tipo
    const itemsNormalizados = items.map((item) => {
      if (item.tipo_especial === "bano") {
        return {
          tipo_especial: "bano",
          personas: Number(item.personas) || 1, // 🔥 FIX REAL
        };
      }

      if (item.tipo_especial === "hotel") {
        return {
          tipo_especial: "hotel",
          habitacion: item.habitacion,
          monto_hotel: parseFloat(item.monto_hotel),
          // NO enviar cantidad para servicios especiales
        };
      }
      // Producto normal - solo estos necesitan cantidad
      return {
        producto_id: item.producto_id,
        cantidad: item.cantidad,
      };
    });

    const response = await fetch(VENTAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: itemsNormalizados,
        metodo_pago: metodoPago,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Mejorar el mensaje de error para debugging
      const errorMsg = typeof errorData.detail === 'string'
        ? errorData.detail
        : JSON.stringify(errorData.detail);
      throw new Error(errorMsg || "Error al crear venta");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error en crearVenta:", error);
    throw error;
  }
}
/**
 * Obtener ventas con filtros
 * @param {string|null} fecha - Fecha en formato YYYY-MM-DD
 * @param {number} limite - Número máximo de ventas
 */
export async function obtenerVentas(fecha = null, limite = 50) {
  try {
    let url = `${VENTAS_URL}/?limite=${limite}`;
    if (fecha) url += `&fecha=${fecha}`;

    const response = await fetch(url, { method: "GET" });
    if (!response.ok) throw new Error("Error al obtener ventas");
    return await response.json();
  } catch (error) {
    console.error("❌ Error en obtenerVentas:", error);
    throw error;
  }
}

/**
 * Obtener venta por ID
 * @param {number} ventaId
 */
export async function obtenerVentaPorId(ventaId) {
  try {
    const response = await fetch(`${VENTAS_URL}/${ventaId}`, { method: "GET" });
    if (!response.ok) throw new Error(`Venta ${ventaId} no encontrada`);
    return await response.json();
  } catch (error) {
    console.error("❌ Error en obtenerVentaPorId:", error);
    throw error;
  }
}

/**
 * Obtener reporte diario de ventas
 * @param {string|null} fecha - Fecha en formato YYYY-MM-DD
 */
export async function obtenerReporteDiarioVentas(fecha = null) {
  try {
    let url = `${VENTAS_URL}/reporte/diario`;
    if (fecha) url += `?fecha=${fecha}`;

    const response = await fetch(url, { method: "GET" });
    if (!response.ok) throw new Error("Error al obtener reporte diario");
    return await response.json();
  } catch (error) {
    console.error("❌ Error en obtenerReporteDiarioVentas:", error);
    throw error;
  }
}

// ============================
// 🔧 UTILIDADES
// ============================

/**
 * Formatear fecha a YYYY-MM-DD
 * @param {Date} fecha
 */
export function formatearFecha(fecha) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formatear moneda
 * @param {number} monto
 */
export function formatearMoneda(monto) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(monto);
}