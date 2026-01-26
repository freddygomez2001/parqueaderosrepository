import { BASE_URL } from "./api";

const VEHICULO_URL = `${BASE_URL}/api/vehiculos`;

// ============================
// 📌 Obtener estado de los 15 espacios
// ============================
export async function obtenerEspacios() {
  try {
    const response = await fetch(`${VEHICULO_URL}/espacios`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Error al obtener los espacios");
    }

    return await response.json();
  } catch (error) {
    console.error("Error en obtenerEspacios:", error);
    throw error;
  }
}

// ============================
// 📌 Registrar entrada de un vehículo
// ============================
export async function registrarEntrada(placa, espacioNumero, esNocturno = false) {
  const response = await fetch(`${VEHICULO_URL}/entrada`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      placa: placa.toUpperCase().trim(),
      espacio_numero: espacioNumero,
      es_nocturno: esNocturno,
    }),
  });

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch {}

    return {
      ok: false,
      message: errorData.detail || "Error al registrar la entrada",
    };
  }

  const data = await response.json();

  return {
    ok: true,
    data,
  };
}

// ============================
// 📌 Registrar salida de un vehículo
// ============================
export async function registrarSalida(placa, esNoPagado = false) {
  const response = await fetch(`${VEHICULO_URL}/salida`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      placa: placa.toUpperCase().trim(),
      es_no_pagado: esNoPagado,
    }),
  });

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch {}

    return {
      ok: false,
      message: errorData.detail || "Error al registrar la salida",
    };
  }

  const data = await response.json();

  return {
    ok: true,
    data,
  };
}

// ============================
// 📌 Buscar vehículo por placa
// ============================
export async function buscarVehiculo(placa) {
  try {
    const placaFormatted = placa.toUpperCase().trim();
    const url = `${VEHICULO_URL}/buscar/${placaFormatted}`;
    
    console.log("Buscando vehículo:", url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log("Respuesta status:", response.status);

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch {}

      throw new Error(errorData.detail || "Vehículo no encontrado");
    }

    const data = await response.json();
    console.log("Datos recibidos:", data);
    
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("⏱Timeout: El servidor no respondió a tiempo");
      throw new Error("El servidor no responde. Verifica que el backend esté corriendo.");
    }
    console.error("Error en buscarVehiculo:", error);
    throw error;
  }
}

// ============================
// 📌 Obtener historial de facturas
// ============================
export async function obtenerHistorial(fecha = null, limite = 50) {
  try {
    let url = `${VEHICULO_URL}/historial?limite=${limite}`;
    
    if (fecha) {
      url += `&fecha=${fecha}`;
    }

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Error al obtener el historial");
    }

    return await response.json();
  } catch (error) {
    console.error("Error en obtenerHistorial:", error);
    throw error;
  }
}

// ============================
// 📌 Obtener lista de deudores
// ============================
export async function obtenerDeudores() {
  try {
    const response = await fetch(`${VEHICULO_URL}/deudores`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Error al obtener la lista de deudores");
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error en obtenerDeudores:", error);
    throw error;
  }
}

// ============================
// 📌 Verificar si una placa tiene deudas pendientes
// ============================
export async function verificarDeudaPlaca(placa) {
  try {
    const placaFormatted = placa.toUpperCase().trim();
    
    // Primero obtener todos los deudores
    const deudores = await obtenerDeudores();
    
    // Buscar si la placa está en la lista de deudores
    const placaDeudora = deudores.find(deudor => 
      deudor.placa === placaFormatted && deudor.total_deuda > 0
    );
    
    return placaDeudora ? {
      tieneDeuda: true,
      totalDeuda: placaDeudora.total_deuda,
      cantidadDeudas: placaDeudora.deudas,
      ultimaSalida: placaDeudora.ultima_salida
    } : {
      tieneDeuda: false,
      totalDeuda: 0,
      cantidadDeudas: 0,
      ultimaSalida: null
    };
    
  } catch (error) {
    console.error("Error en verificarDeudaPlaca:", error);
    // Si hay error en la conexión, permitir el registro
    return {
      tieneDeuda: false,
      totalDeuda: 0,
      cantidadDeudas: 0,
      ultimaSalida: null,
      error: error.message
    };
  }
}

// ============================
// 📌 Marcar deuda como pagada
// ============================
export async function pagarDeuda(placa) {
  try {
    const response = await fetch(`${VEHICULO_URL}/pagar-deuda/${placa.toUpperCase().trim()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch {}

      throw new Error(errorData.detail || "Error al marcar la deuda como pagada");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error en pagarDeuda:", error);
    throw error;
  }
}

// ============================
// 📌 Health check del servicio
// ============================
export async function healthCheck() {
  try {
    const response = await fetch(`${VEHICULO_URL}/health`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Servicio no disponible");
    }

    return await response.json();
  } catch (error) {
    console.error("Error en healthCheck:", error);
    throw error;
  }
}

// ============================
// 📌 Obtener reporte diario
// ============================
export async function obtenerReporteDiario(fecha = null) {
  try {
    const url = fecha 
      ? `${BASE_URL}/api/reportes/diario?fecha=${fecha}`
      : `${BASE_URL}/api/reportes/diario`;
    
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
// 📌 Verificar deuda antes de registrar entrada
// ============================
export async function registrarEntradaConValidacionDeuda(placa, espacioNumero, esNocturno = false) {
  try {
    // Verificar si la placa tiene deudas pendientes
    const deudaInfo = await verificarDeudaPlaca(placa);
    
    if (deudaInfo.tieneDeuda) {
      return {
        ok: false,
        message: `El vehículo ${placa.toUpperCase()} tiene ${deudaInfo.cantidadDeudas} deuda(s) pendiente(s) por un total de $${deudaInfo.totalDeuda.toFixed(2)}. Debe pagar primero.`,
        tieneDeuda: true,
        deudaInfo: deudaInfo,
        data: null // ✅ Añadir data como null
      };
    }
    
    // Si no tiene deuda, proceder con el registro normal
    const resultado = await registrarEntrada(placa, espacioNumero, esNocturno);
    
    // ✅ Asegurar que el resultado tenga el formato correcto
    return {
      ...resultado,
      tieneDeuda: false,
      deudaInfo: null
    };
    
  } catch (error) {
    console.error("Error en registrarEntradaConValidacionDeuda:", error);
    
    // Si hay error en la verificación, intentar registro normal
    try {
      const resultado = await registrarEntrada(placa, espacioNumero, esNocturno);
      return {
        ...resultado,
        tieneDeuda: false,
        deudaInfo: null
      };
    } catch (innerError) {
      return {
        ok: false,
        message: "Error al registrar entrada: " + (innerError.message || "Error desconocido"),
        tieneDeuda: false,
        deudaInfo: null,
        data: null
      };
    }
  }
}