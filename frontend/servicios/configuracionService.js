// src/servicios/configuracionService.js
import { BASE_URL } from "./api";

const CONFIGURACION_URL = `${BASE_URL}/api/configuracion`;

export async function obtenerConfiguracion() {
  try {
    const response = await fetch(`${CONFIGURACION_URL}/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error en obtenerConfiguracion:", error);
    throw error;
  }
}

export async function actualizarConfiguracion(datos) {
  try {
    // Preparar datos
    const datosPreparados = {};
    
    // Campos numéricos
    const camposNumericos = [
      'precio_0_5_min',
      'precio_6_30_min', 
      'precio_31_60_min',
      'precio_hora_adicional',
      'precio_nocturno'
    ];
    
    // Procesar campos numéricos
    camposNumericos.forEach(campo => {
      if (datos[campo] !== undefined && datos[campo] !== null) {
        let valorNum;
        if (typeof datos[campo] === 'string') {
          valorNum = parseFloat(datos[campo].replace(',', '.'));
        } else {
          valorNum = datos[campo];
        }
        
        if (!isNaN(valorNum) && valorNum >= 0) {
          datosPreparados[campo] = valorNum;
        }
      }
    });
    
    // Campos de hora
    const camposHora = ['hora_inicio_nocturno', 'hora_fin_nocturno'];
    camposHora.forEach(campo => {
      if (datos[campo] !== undefined && datos[campo] !== null) {
        let valor = datos[campo];
        if (typeof valor === 'string') {
          // Limpiar y formatear hora
          valor = valor.trim().replace(/\s+/g, '');
          if (valor.includes(':')) {
            const partes = valor.split(':');
            if (partes.length >= 2) {
              valor = `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`;
              datosPreparados[campo] = valor;
            }
          }
        }
      }
    });
    
    // Rangos personalizados
    if (datos.rangos_personalizados !== undefined) {
      try {
        if (typeof datos.rangos_personalizados === 'string') {
          // Ya viene como JSON string
          datosPreparados.rangos_personalizados = datos.rangos_personalizados;
        } else if (Array.isArray(datos.rangos_personalizados)) {
          // Convertir array a JSON string
          datosPreparados.rangos_personalizados = JSON.stringify(datos.rangos_personalizados);
        }
      } catch (error) {
        console.error("Error procesando rangos personalizados:", error);
      }
    }
    
    console.log("📤 Datos a enviar:", datosPreparados);
    
    // Enviar petición
    const response = await fetch(`${CONFIGURACION_URL}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datosPreparados),
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: responseData.detail || "Error al actualizar configuración",
        errors: responseData.detail || null
      };
    }
    
    return {
      ok: true,
      data: responseData,
    };
    
  } catch (error) {
    console.error("Error crítico:", error);
    return {
      ok: false,
      message: error.message || "Error de conexión",
      error: error
    };
  }
}