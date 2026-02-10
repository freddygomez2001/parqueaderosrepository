# app/routers/venta_servicio_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import get_db
from app.servicios.venta_servicio_service import VentaServicioService
from app.esquemas.venta_servicio_schema import (
    VentaServicioCreate,
    VentaServicioResponse,
    ReporteVentasResponse
)
from typing import List, Optional

router = APIRouter(
    prefix="/api/ventas-servicios",
    tags=["Ventas de Servicios"]
)

@router.post("/", response_model=VentaServicioResponse, status_code=status.HTTP_201_CREATED)
async def crear_venta(datos: VentaServicioCreate, db: Session = Depends(get_db)):
    """Crear nueva venta de servicios"""
    try:
        items_data = [item.dict() for item in datos.items]
        venta = VentaServicioService.crear_venta(db, items_data)
        
        return venta.to_dict()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear venta: {str(e)}"
        )

@router.get("/", response_model=List[VentaServicioResponse])
async def obtener_ventas(
    fecha: Optional[str] = None,
    limite: int = 50,
    db: Session = Depends(get_db)
):
    """Obtener ventas de servicios"""
    try:
        ventas = VentaServicioService.obtener_ventas(db, fecha, limite)
        return [v.to_dict() for v in ventas]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener ventas: {str(e)}"
        )

@router.get("/{venta_id}", response_model=VentaServicioResponse)
async def obtener_venta(venta_id: int, db: Session = Depends(get_db)):
    """Obtener venta por ID"""
    try:
        venta = VentaServicioService.obtener_venta_por_id(db, venta_id)
        
        if not venta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Venta {venta_id} no encontrada"
            )
        
        return venta.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener venta: {str(e)}"
        )

@router.get("/reporte/diario", response_model=ReporteVentasResponse)
async def obtener_reporte_diario(fecha: Optional[str] = None, db: Session = Depends(get_db)):
    """Obtener reporte de ventas del día"""
    try:
        reporte = VentaServicioService.obtener_reporte_diario(db, fecha)
        return reporte
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener reporte: {str(e)}"
        )

@router.get("/health")
def health_check():
    """Verificar que el servicio de ventas está funcionando"""
    return {
        "success": True,
        "message": "Servicio de ventas funcionando correctamente"
    }