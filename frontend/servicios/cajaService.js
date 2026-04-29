// src/servicios/cajaService.js
import { BASE_URL } from "./api";

const CAJA_URL = `${BASE_URL}/api/caja`;

/**
 * Obtener estado actual de la caja
 */
export async function obtenerEstadoCaja() {
  try {
    const response = await fetch(`${CAJA_URL}/estado?_t=${Date.now()}`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error("Error al obtener estado de caja");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error en obtenerEstadoCaja:", error);
    throw error;
  }
}

/**
 * Abrir caja con monto inicial y denominaciones
 * @param {number} montoInicial 
 * @param {string} operador 
 * @param {string} notas 
 * @param {object} denominaciones - { items: [{denominacion, cantidad, subtotal}], total }
 */
export async function abrirCaja(montoInicial, operador, notas = null, denominaciones = null) {
  try {
    const body = {
      monto_inicial: montoInicial,
      operador: operador,
      notas: notas,
    };
    
    if (denominaciones) {
      body.denominaciones = denominaciones;
    }

    const response = await fetch(`${CAJA_URL}/abrir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al abrir caja");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error en abrirCaja:", error);
    throw error;
  }
}

/**
 * Cerrar caja actual con denominaciones
 * @param {number} montoFinal 
 * @param {string} operador 
 * @param {string} notas 
 * @param {object} denominaciones - { items: [{denominacion, cantidad, subtotal}], total }
 */
export async function cerrarCaja(montoFinal, operador = null, notas = null, denominaciones = null) {
  try {
    const body = {
      monto_final: montoFinal,
      operador: operador,
      notas: notas,
    };
    
    if (denominaciones) {
      body.denominaciones = denominaciones;
    }

    const response = await fetch(`${CAJA_URL}/cerrar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al cerrar caja");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error en cerrarCaja:", error);
    throw error;
  }
}

/**
 * Obtener resumen de la caja actual
 */
export async function obtenerResumenCaja() {
  try {
    const response = await fetch(`${CAJA_URL}/resumen`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al obtener resumen");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error en obtenerResumenCaja:", error);
    throw error;
  }
}

/**
 * Obtener historial de cajas cerradas
 * @param {number} limite 
 */
export async function obtenerHistorialCajas(limite = 30) {
  try {
    const response = await fetch(`${CAJA_URL}/historial?limite=${limite}`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error("Error al obtener historial de cajas");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error en obtenerHistorialCajas:", error);
    throw error;
  }
}

/**
 * Obtener movimientos de la caja actual
 */
export async function obtenerMovimientosCaja() {
  try {
    const response = await fetch(`${CAJA_URL}/movimientos`);
    if (!response.ok) throw new Error("Error al obtener movimientos");
    return await response.json();
  } catch (error) {
    console.error("❌ Error en obtenerMovimientosCaja:", error);
    throw error;
  }
}

/**
 * Agregar efectivo manual a la caja actual
 * @param {number} monto 
 * @param {string} descripcion 
 * @param {string} operador 
 */
export async function agregarEfectivoCaja(monto, descripcion, operador) {
  try {
    const response = await fetch(`${CAJA_URL}/agregar-efectivo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto, descripcion, operador }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Error al agregar efectivo");
    }
    return await response.json();
  } catch (error) {
    console.error("❌ Error en agregarEfectivoCaja:", error);
    throw error;
  }
}

/**
 * Registrar egreso/retiro de efectivo
 * @param {number} monto 
 * @param {string} descripcion 
 * @param {string} operador 
 */
export async function registrarEgresoCaja(monto, descripcion, operador) {
  try {
    const response = await fetch(`${CAJA_URL}/egreso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        monto, 
        descripcion, 
        operador 
      }),
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Error al registrar egreso");
    }
    
    return await response.json();
  } catch (error) {
    console.error("❌ Error en registrarEgresoCaja:", error);
    throw error;
  }
}

/**
 * Obtener una caja específica por ID (para ver detalles de cajas cerradas)
 * @param {number} cajaId 
 */
export async function obtenerCajaPorId(cajaId) {
  try {
    const response = await fetch(`${CAJA_URL}/${cajaId}`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Error al obtener caja");
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error en obtenerCajaPorId (${cajaId}):`, error);
    throw error;
  }
}

/**
 * Reimprimir ticket de una caja cerrada
 * @param {object} caja - Datos de la caja (obtenidos de obtenerCajaPorId)
 */
export async function reimprimirTicketCaja(caja) {
  try {
    // Construir el resumen similar al del cierre
    const totalEfectivo = caja.movimientos
      ?.filter(m => m.suma_a_caja === true && m.monto > 0)
      .reduce((sum, m) => sum + m.monto, 0) || 0;
    
    const totalTarjeta = caja.movimientos
      ?.filter(m => m.metodo_pago === "tarjeta")
      .reduce((sum, m) => sum + m.monto, 0) || 0;
    
    const totalTransferencia = caja.movimientos
      ?.filter(m => m.metodo_pago === "transferencia")
      .reduce((sum, m) => sum + m.monto, 0) || 0;
    
    const totalEgresos = caja.total_egresos || 0;
    
    const desglose = {
      parqueo: { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 },
      servicios: { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 },
      hotel: { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 },
      bano: { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 },
      manuales: 0
    };
    
    caja.movimientos?.forEach(m => {
      if (m.tipo === "parqueo") {
        if (m.metodo_pago === "efectivo") desglose.parqueo.efectivo += m.monto;
        else if (m.metodo_pago === "tarjeta") desglose.parqueo.tarjeta += m.monto;
        else if (m.metodo_pago === "transferencia") desglose.parqueo.transferencia += m.monto;
        desglose.parqueo.total += m.monto;
      }
      else if (m.tipo === "servicio") {
        if (m.descripcion?.includes("Habitación") || m.descripcion?.includes("hotel")) {
          if (m.metodo_pago === "efectivo") desglose.hotel.efectivo += m.monto;
          else if (m.metodo_pago === "tarjeta") desglose.hotel.tarjeta += m.monto;
          else if (m.metodo_pago === "transferencia") desglose.hotel.transferencia += m.monto;
          desglose.hotel.total += m.monto;
        }
        else if (m.descripcion?.includes("Baño") || m.descripcion?.includes("bano")) {
          if (m.metodo_pago === "efectivo") desglose.bano.efectivo += m.monto;
          else if (m.metodo_pago === "tarjeta") desglose.bano.tarjeta += m.monto;
          else if (m.metodo_pago === "transferencia") desglose.bano.transferencia += m.monto;
          desglose.bano.total += m.monto;
        }
        else {
          if (m.metodo_pago === "efectivo") desglose.servicios.efectivo += m.monto;
          else if (m.metodo_pago === "tarjeta") desglose.servicios.tarjeta += m.monto;
          else if (m.metodo_pago === "transferencia") desglose.servicios.transferencia += m.monto;
          desglose.servicios.total += m.monto;
        }
      }
      else if (m.tipo === "efectivo_manual") {
        desglose.manuales += m.monto;
      }
    });
    
    const resumen = {
      montoInicial: parseFloat(caja.monto_inicial) || 0,
      totalParqueo: parseFloat(caja.total_parqueo) || 0,
      totalServicios: parseFloat(caja.total_servicios) || 0,
      totalIngresos: parseFloat(caja.total_ingresos) || 0,
      totalEgresos: totalEgresos,
      saldoNeto: (parseFloat(caja.total_ingresos) || 0) - totalEgresos,
      montoEsperado: parseFloat(caja.monto_esperado) || 0,
      montoFisico: parseFloat(caja.monto_final) || 0,
      diferencia: parseFloat(caja.diferencia) || 0,
      operador: caja.operador_apertura || "",
      fechaCierre: caja.fecha_cierre || new Date().toISOString(),
      movimientos: caja.movimientos || [],
      denominaciones: caja.denominaciones?.cierre ? { 
        items: caja.denominaciones.cierre,
        total: caja.denominaciones.total_cierre || 0
      } : null,
      desglose: desglose
    };
    
    return resumen;
  } catch (error) {
    console.error("❌ Error en reimprimirTicketCaja:", error);
    throw error;
  }
}