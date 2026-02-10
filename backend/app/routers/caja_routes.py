# app/routers/caja_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import get_db
from app.servicios.caja_service import CajaService
from app.esquemas.caja_schema import (
    CajaAperturaRequest,
    CajaCierreRequest,
    CajaResponse,
    CajaEstadoResponse,
    ResumenCajaResponse
)
from typing import List

router = APIRouter(
    prefix="/api/caja",
    tags=["Caja"]
)

@router.get("/estado", response_model=CajaEstadoResponse)
async def obtener_estado_caja(db: Session = Depends(get_db)):
    """Obtener estado actual de la caja"""
    try:
        estado = CajaService.obtener_estado_caja(db)
        return estado
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estado de caja: {str(e)}"
        )

@router.post("/abrir", response_model=CajaResponse, status_code=status.HTTP_201_CREATED)
async def abrir_caja(datos: CajaAperturaRequest, db: Session = Depends(get_db)):
    """Abrir una nueva caja"""
    try:
        caja = CajaService.abrir_caja(
            db,
            monto_inicial=datos.monto_inicial,
            operador=datos.operador,
            notas=datos.notas
        )
        return caja.to_dict()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al abrir caja: {str(e)}"
        )

@router.post("/cerrar", response_model=CajaResponse)
async def cerrar_caja(datos: CajaCierreRequest, db: Session = Depends(get_db)):
    """Cerrar la caja actual"""
    try:
        caja = CajaService.cerrar_caja(
            db,
            monto_final=datos.monto_final,
            operador=datos.operador,
            notas=datos.notas
        )
        return caja.to_dict()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cerrar caja: {str(e)}"
        )

@router.get("/resumen", response_model=ResumenCajaResponse)
async def obtener_resumen_caja(db: Session = Depends(get_db)):
    """Obtener resumen de la caja actual"""
    try:
        resumen = CajaService.obtener_resumen_caja(db)
        return resumen
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener resumen: {str(e)}"
        )

@router.get("/historial", response_model=List[CajaResponse])
async def obtener_historial_cajas(limite: int = 30, db: Session = Depends(get_db)):
    """Obtener historial de cajas cerradas"""
    try:
        historial = CajaService.obtener_historial_cajas(db, limite)
        return historial
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener historial: {str(e)}"
        )

@router.get("/health")
def health_check():
    """Verificar que el servicio de caja está funcionando"""
    return {
        "success": True,
        "message": "Servicio de caja funcionando correctamente"
    }