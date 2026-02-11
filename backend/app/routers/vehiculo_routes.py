from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.config import get_db
from app.servicios.vehiculo_service import VehiculoService
from app.modelos.historial_factura import HistorialFactura  
from app.esquemas.vehiculo_schema import (
    VehiculoEntrada, 
    VehiculoSalida, 
    VehiculoResponse,
    VehiculoConEstimacion,
    EspacioResponse
)
from app.esquemas.factura_schema import FacturaDetallada


router = APIRouter(
    prefix="/api/vehiculos",
    tags=["Vehículos"]
)

@router.get("/espacios", response_model=List[EspacioResponse])
def obtener_espacios(db: Session = Depends(get_db)):
    """
    Obtener el estado de los 15 espacios de estacionamiento
    
    Retorna una lista con el estado de cada espacio (ocupado/libre)
    """
    try:
        espacios = VehiculoService.obtener_espacios(db)
        return espacios
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/entrada", response_model=VehiculoResponse, status_code=201)
def registrar_entrada(datos: VehiculoEntrada, db: Session = Depends(get_db)):
    """
    Registrar la entrada de un vehículo
    
    Args:
        datos: Placa, número de espacio y si es nocturno
    
    Returns:
        Información del vehículo registrado
    """
    try:
        vehiculo = VehiculoService.registrar_entrada(
            db, 
            datos.placa, 
            datos.espacio_numero,
            datos.es_nocturno  # NUEVO
        )
        return vehiculo.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/salida")
def registrar_salida(datos: VehiculoSalida, db: Session = Depends(get_db)):
    """
    Registrar la salida de un vehículo y generar factura
    """
    try:
        resultado = VehiculoService.registrar_salida(
            db, 
            datos.placa,
            datos.es_no_pagado,
            datos.metodo_pago  # 👈 PASAR EL MÉTODO DE PAGO
        )
        vehiculo = resultado['vehiculo']
        factura = resultado['factura']
        
        return {
            "success": True,
            "message": "Salida registrada exitosamente",
            "factura": {
                "placa": vehiculo.placa,
                "espacio": vehiculo.espacio_numero,
                "entrada": vehiculo.fecha_hora_entrada.isoformat(),
                "salida": vehiculo.fecha_hora_salida.isoformat(),
                "tiempo_total": resultado['tiempo_formateado'],
                "costo_total": float(vehiculo.costo_total),
                "detalles": factura.detalles_cobro,
                "es_nocturno": vehiculo.es_nocturno,
                "es_no_pagado": vehiculo.es_no_pagado,
                "metodo_pago": datos.metodo_pago,  # 👈 AGREGAR AL RESPONSE
                "tarifa_aplicada": "NOCTURNA" if vehiculo.es_nocturno else "NORMAL"
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/buscar/{placa}")
def buscar_vehiculo(placa: str, db: Session = Depends(get_db)):
    """
    Buscar un vehículo activo y mostrar costo estimado
    """
    try:
        resultado = VehiculoService.buscar_vehiculo(db, placa)
        
        # Obtener datos completos del vehículo
        vehiculo = resultado['vehiculo']
        vehiculo_dict = vehiculo.to_dict()  # Esto incluye es_nocturno
        
        # Crear respuesta con el formato correcto
        respuesta = {
            "success": True,
            "data": {
                **vehiculo_dict,
                "costo_estimado": resultado['costo_estimado'],
                "tiempo_estimado": resultado['tiempo_estimado'],
                "detalles": resultado['detalles']
            }
        }
        
        print(f"Respuesta del endpoint /buscar/{placa}:")
        print(f"   ¿Incluye es_nocturno?: {'es_nocturno' in respuesta['data']}")
        print(f"   Valor es_nocturno: {respuesta['data'].get('es_nocturno')}")
        
        return respuesta
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/historial")
def obtener_historial(fecha: str = None, limite: int = 50, db: Session = Depends(get_db)):
    """
    Obtener el historial de facturas
    
    Args:
        fecha: Fecha en formato YYYY-MM-DD (opcional)
        limite: Número máximo de registros a retornar (default: 50)
    
    Returns:
        Lista de facturas del historial
    """
    try:
        historial = VehiculoService.obtener_historial(db, fecha, limite)
        return {
            "success": True,
            "data": [factura.to_dict() for factura in historial]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
def health_check():
    """Verificar que el servicio de vehículos está funcionando"""
    return {
        "success": True,
        "message": "Servicio de vehículos funcionando correctamente"
    }

# En app/routers/vehiculo_routes.py agregar:

@router.get("/deudores")
def obtener_deudores(db: Session = Depends(get_db)):
    """
    Obtener lista de placas con deudas pendientes
    """
    try:
        # Buscar en el historial las placas con deudas NO PAGADAS
        deudores = db.query(HistorialFactura).filter_by(
            es_no_pagado=True
        ).all()
        
        # Extraer placas únicas
        placas_deudoras = {}
        for factura in deudores:
            if factura.placa not in placas_deudoras:
                placas_deudoras[factura.placa] = {
                    'placa': factura.placa,
                    'deudas': 0,
                    'total_deuda': 0,
                    'ultima_salida': None
                }
            placas_deudoras[factura.placa]['deudas'] += 1
            placas_deudoras[factura.placa]['total_deuda'] += float(factura.costo_total)
            if not placas_deudoras[factura.placa]['ultima_salida'] or \
               factura.fecha_hora_salida > placas_deudoras[factura.placa]['ultima_salida']:
                placas_deudoras[factura.placa]['ultima_salida'] = factura.fecha_hora_salida
        
        return {
            "success": True,
            "data": list(placas_deudoras.values())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # En app/routers/vehiculo_routes.py agregar:

@router.post("/pagar-deuda/{placa}")
def pagar_deuda(placa: str, db: Session = Depends(get_db)):
    """
    Marcar todas las deudas de una placa como pagadas
    """
    try:
        placa = placa.upper().strip()
        
        # Buscar todas las facturas no pagadas de esta placa
        deudas = db.query(HistorialFactura).filter_by(
            placa=placa,
            es_no_pagado=True
        ).all()
        
        if not deudas:
            return {
                "success": True,
                "message": f"La placa {placa} no tiene deudas pendientes"
            }
        
        # Marcar todas como pagadas
        for deuda in deudas:
            deuda.es_no_pagado = False
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Se han marcado {len(deudas)} deudas como pagadas para la placa {placa}",
            "total_pagado": sum(float(d.costo_total) for d in deudas)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    