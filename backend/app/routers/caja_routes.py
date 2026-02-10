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
    ResumenCajaResponse,
    MovimientosCajaResponse,
    AgregarEfectivoRequest,
)
from typing import List

router = APIRouter(prefix="/api/caja", tags=["Caja"])

@router.get("/estado", response_model=CajaEstadoResponse)
async def obtener_estado_caja(db: Session = Depends(get_db)):
    try:
        return CajaService.obtener_estado_caja(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estado de caja: {str(e)}")

@router.post("/abrir", response_model=CajaResponse, status_code=status.HTTP_201_CREATED)
async def abrir_caja(datos: CajaAperturaRequest, db: Session = Depends(get_db)):
    try:
        caja = CajaService.abrir_caja(db, monto_inicial=datos.monto_inicial, operador=datos.operador, notas=datos.notas)
        return caja.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al abrir caja: {str(e)}")

@router.post("/cerrar", response_model=CajaResponse)
async def cerrar_caja(datos: CajaCierreRequest, db: Session = Depends(get_db)):
    try:
        caja = CajaService.cerrar_caja(db, monto_final=datos.monto_final, operador=datos.operador, notas=datos.notas)
        return caja.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al cerrar caja: {str(e)}")

@router.get("/resumen", response_model=ResumenCajaResponse)
async def obtener_resumen_caja(db: Session = Depends(get_db)):
    try:
        return CajaService.obtener_resumen_caja(db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener resumen: {str(e)}")

@router.get("/historial", response_model=List[CajaResponse])
async def obtener_historial_cajas(limite: int = 30, db: Session = Depends(get_db)):
    try:
        return CajaService.obtener_historial_cajas(db, limite)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener historial: {str(e)}")

@router.get("/movimientos", response_model=MovimientosCajaResponse)
async def obtener_movimientos(db: Session = Depends(get_db)):
    movimientos = CajaService.obtener_movimientos_dia(db)

    # ✅ manuales NO tienen metodo_pago, por eso la condición != "tarjeta" los incluye correctamente
    total_efectivo = sum(m["monto"] for m in movimientos if m.get("metodo_pago") != "tarjeta")
    total_tarjeta  = sum(m["monto"] for m in movimientos if m.get("metodo_pago") == "tarjeta")

    return {
        "movimientos": movimientos,
        "total_efectivo": total_efectivo,
        "total_tarjeta": total_tarjeta,
        "total_movimientos": len(movimientos),
    }

@router.post("/agregar-efectivo")
async def agregar_efectivo(datos: AgregarEfectivoRequest, db: Session = Depends(get_db)):
    try:
        return CajaService.agregar_efectivo(db, datos.monto, datos.descripcion, datos.operador or "operador")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/health")
def health_check():
    return {"success": True, "message": "Servicio de caja funcionando correctamente"}