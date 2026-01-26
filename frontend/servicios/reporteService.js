// src/servicios/reporteService.js
import { BASE_URL } from "./api";

const REPORTE_URL = `${BASE_URL}/api/reportes`;

// ============================
// 📌 Obtener reporte diario
// ============================
export async function obtenerReporteDiario(fecha = null) {
  try {
    let url = `${REPORTE_URL}/diario`;

    if (fecha) {
      url += `?fecha=${fecha}`;
    }

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Error al obtener el reporte diario");
    }

    return await response.json();
  } catch (error) {
    console.error("Error en obtenerReporteDiario:", error);
    throw error;
  }
}

// ============================
// 📌 Obtener reporte de hoy
// ============================
export async function obtenerReporteHoy() {
  try {
    const hoy = formatearFecha(new Date());
    return await obtenerReporteDiario(hoy);
  } catch (error) {
    console.error("❌ Error en obtenerReporteHoy:", error);
    throw error;
  }
}

// ============================
// 📌 Obtener reporte de ayer
// ============================
export async function obtenerReporteAyer() {
  try {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const fechaAyer = formatearFecha(ayer);
    return await obtenerReporteDiario(fechaAyer);
  } catch (error) {
    console.error("❌ Error en obtenerReporteAyer:", error);
    throw error;
  }
}

// ============================
// 📌 Obtener reporte de rango de fechas
// ============================
export async function obtenerReporteRango(fechaInicio, fechaFin) {
  try {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const reportes = [];

    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      const fecha = formatearFecha(d);
      try {
        const reporte = await obtenerReporteDiario(fecha);
        reportes.push(reporte);
      } catch (error) {
        console.error(`❌ Error obteniendo reporte de ${fecha}:`, error);
      }
    }

    return reportes;
  } catch (error) {
    console.error("❌ Error en obtenerReporteRango:", error);
    throw error;
  }
}

// ============================
// 📌 Health check del servicio
// ============================
export async function healthCheck() {
  try {
    const response = await fetch(`${REPORTE_URL}/health`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Servicio no disponible");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error en healthCheck:", error);
    throw error;
  }
}

// ============================
// 🔧 Helper: Formatear fecha a YYYY-MM-DD
// ============================
export function formatearFecha(fecha) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ============================
// 🔧 Helper: Formatear moneda
// ============================
export function formatearMoneda(monto) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(monto);
}

// ============================
// 🔧 Helper: Calcular totales de múltiples reportes
// ============================
export function calcularTotales(reportes) {
  const totalVehiculos = reportes.reduce(
    (sum, r) => sum + (r.total_vehiculos || 0),
    0
  );
  const totalIngresos = reportes.reduce(
    (sum, r) => sum + (r.ingresos_total || 0),
    0
  );

  return {
    total_vehiculos: totalVehiculos,
    ingresos_total: totalIngresos,
  };
}
export async function obtenerReporteDetallado(fecha = null) {
  try {
    let url = `${REPORTE_URL}/detallado`;

    if (fecha) {
      url += `?fecha=${fecha}`;
    }

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Error al obtener el reporte detallado");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error en obtenerReporteDetallado:", error);
    throw error;
  }
}