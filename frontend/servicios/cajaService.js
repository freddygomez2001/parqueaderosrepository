// src/servicios/cajaService.js
import { BASE_URL } from "./api";

const CAJA_URL = `${BASE_URL}/api/caja`;

/**
 * Obtener estado actual de la caja
 */
export async function obtenerEstadoCaja() {
  try {
    const response = await fetch(`${CAJA_URL}/estado`, {
      method: "GET",
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
export async function abrirCaja(montoInicial, operador, notas = null) {
  try {
    const response = await fetch(`${CAJA_URL}/abrir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        monto_inicial: montoInicial,
        operador: operador,
        notas: notas,
      }),
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
 * Cerrar caja actual
 * @param {number} montoFinal 
 * @param {string} operador 
 * @param {string} notas 
 */
export async function cerrarCaja(montoFinal, operador = null, notas = null) {
  try {
    const response = await fetch(`${CAJA_URL}/cerrar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        monto_final: montoFinal,
        operador: operador,
        notas: notas,
      }),
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
 * Obtener resumen de caja actual
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