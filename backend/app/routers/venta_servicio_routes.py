# app/routers/venta_servicio_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, date, timedelta
from typing import List, Optional

from app.config import get_db
from app.servicios.venta_servicio_service import VentaServicioService
from app.esquemas.venta_servicio_schema import (
    VentaServicioCreate,
    VentaServicioResponse,
    ReporteVentasResponse,
)
from app.modelos.venta_servicio import VentaServicio

router = APIRouter(
    prefix="/api/ventas-servicios",
    tags=["Ventas de Servicios"],
)


@router.post("/", response_model=VentaServicioResponse, status_code=status.HTTP_201_CREATED)
async def crear_venta(datos: VentaServicioCreate, db: Session = Depends(get_db)):
    """Crear nueva venta"""
    try:
        items_data = [item.dict() for item in datos.items]
        venta = VentaServicioService.crear_venta(db, items_data, datos.metodo_pago)
        return venta.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear venta: {str(e)}",
        )


# ✅ IMPORTANTE: El endpoint /test debe ir ANTES de /reporte/diario y /{venta_id}
@router.get("/test")
async def test_endpoint():
    """Endpoint de prueba"""
    return {"message": "Servidor funcionando correctamente"}


@router.get("/reporte/diario")
async def obtener_reporte_diario(
    fecha: Optional[str] = Query(None, description="Fecha específica YYYY-MM-DD"),
    fecha_inicio: Optional[str] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: Optional[str] = Query(None, description="Fecha fin YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """
    Reporte de ventas. Puede ser:
    - Por día específico: ?fecha=2024-01-01
    - Por rango de fechas: ?fecha_inicio=2024-01-01&fecha_fin=2024-01-31
    - Día actual: sin parámetros
    """
    print(f"🔍 Reporte llamado - fecha: {fecha}, fecha_inicio: {fecha_inicio}, fecha_fin: {fecha_fin}")
    
    try:
        if fecha_inicio and fecha_fin:
            inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
            fin = datetime.strptime(fecha_fin, "%Y-%m-%d").date()
            resultado = VentaServicioService.obtener_reporte_por_rango(db, inicio, fin)
            return resultado
        elif fecha:
            fecha_obj = datetime.strptime(fecha, "%Y-%m-%d").date()
            resultado = VentaServicioService.obtener_reporte_por_rango(db, fecha_obj, fecha_obj)
            return resultado
        else:
            hoy = date.today()
            resultado = VentaServicioService.obtener_reporte_por_rango(db, hoy, hoy)
            return resultado
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Formato de fecha inválido: {str(e)}")
    except Exception as e:
        print(f"❌ Error en reporte: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener reporte: {str(e)}",
        )


@router.get("/", response_model=List[VentaServicioResponse])
async def obtener_ventas(
    fecha: Optional[str] = None,
    limite: int = 50,
    db: Session = Depends(get_db),
):
    """Obtener ventas con filtro de fecha opcional"""
    try:
        ventas = VentaServicioService.obtener_ventas(db, fecha, limite)
        return [v.to_dict() for v in ventas]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener ventas: {str(e)}",
        )


@router.get("/{venta_id}", response_model=VentaServicioResponse)
async def obtener_venta(venta_id: int, db: Session = Depends(get_db)):
    """Obtener venta por ID"""
    try:
        venta = VentaServicioService.obtener_venta_por_id(db, venta_id)
        if not venta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Venta {venta_id} no encontrada",
            )
        return venta.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener venta: {str(e)}",
        )


@router.get("/health/check")
def health_check():
    return {"success": True, "message": "Servicio de ventas funcionando correctamente"}