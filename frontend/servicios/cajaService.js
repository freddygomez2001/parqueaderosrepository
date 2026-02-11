// src/servicios/cajaService.js
import { BASE_URL } from "./api";

const CAJA_URL = `${BASE_URL}/api/caja`;

/**
 * Obtener estado actual de la caja
 */
export async function obtenerEstadoCaja() {
  try {
    const response = await fetch(`${CAJA_URL}/estado?_t=${Date.now()}`, {  // Agregar timestamp para evitar cache
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
 * Abrir caja con monto inicial
 * @param {number} montoInicial 
 * @param {string} operador 
 * @param {string} notas 
 */

// src/servicios/cajaService.js

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

// src/servicios/cajaService.js - Agregar

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