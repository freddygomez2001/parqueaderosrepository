# app/routers/caja_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import get_db
import traceback 
from app.servicios.caja_service import CajaService
from app.esquemas.caja_schema import (
    CajaAperturaRequest,
    CajaCierreRequest,
    CajaResponse,
    CajaEstadoResponse,
    ResumenCajaResponse,
    MovimientosCajaResponse,
    AgregarEfectivoRequest,
    EgresoRequest
)
from typing import List

router = APIRouter(prefix="/api/caja", tags=["Caja"])

@router.get("/estado", response_model=CajaEstadoResponse)
async def obtener_estado_caja(db: Session = Depends(get_db)):
    try:
        estado = CajaService.obtener_estado_caja(db)
        print(f"📊 Estado de caja enviado: saldo_neto={estado.get('saldo_neto', 0)}, total_dia_egresos={estado.get('total_dia_egresos', 0)}")
        return estado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estado de caja: {str(e)}")

@router.post("/abrir", response_model=CajaResponse, status_code=status.HTTP_201_CREATED)
async def abrir_caja(datos: CajaAperturaRequest, db: Session = Depends(get_db)):
    try:
        # ✅ PASAR DENOMINACIONES AL SERVICIO
        caja = CajaService.abrir_caja(
            db, 
            monto_inicial=datos.monto_inicial, 
            operador=datos.operador, 
            notas=datos.notas,
            denominaciones=datos.denominaciones  # 👈 NUEVO
        )
        return caja.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al abrir caja: {str(e)}")

@router.post("/cerrar", response_model=CajaResponse)
async def cerrar_caja(datos: CajaCierreRequest, db: Session = Depends(get_db)):
    try:
        # ✅ PASAR DENOMINACIONES AL SERVICIO
        caja = CajaService.cerrar_caja(
            db, 
            monto_final=datos.monto_final, 
            operador=datos.operador, 
            notas=datos.notas,
            denominaciones=datos.denominaciones  # 👈 NUEVO
        )
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

# app/routers/caja_routes.py

@router.get("/movimientos", response_model=MovimientosCajaResponse)
async def obtener_movimientos(db: Session = Depends(get_db)):
    resultado = CajaService.obtener_movimientos_dia(db)
    
    # ✅ CORREGIDO: resultado es un diccionario, no una lista
    movimientos = resultado.get("movimientos", [])
    
    # ✅ Calcular totales usando los campos del diccionario
    total_efectivo = resultado.get("total_efectivo", 0)
    total_tarjeta = resultado.get("total_tarjeta", 0)
    total_egresos = resultado.get("total_egresos", 0)
    saldo_neto = resultado.get("saldo_neto", 0)

    return {
        "movimientos": movimientos,
        "total_efectivo": total_efectivo,
        "total_tarjeta": total_tarjeta,
        "total_egresos": total_egresos,
        "saldo_neto": saldo_neto,
        "total_movimientos": len(movimientos),
    }

@router.post("/agregar-efectivo")
async def agregar_efectivo(datos: AgregarEfectivoRequest, db: Session = Depends(get_db)):
    try:
        return CajaService.agregar_efectivo(db, datos.monto, datos.descripcion, datos.operador or "operador")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
# app/routers/caja_routes.py - Agregar endpoint

@router.post("/egreso")
async def registrar_egreso(datos: EgresoRequest, db: Session = Depends(get_db)):
    """Registra un retiro/egreso de efectivo de la caja actual"""
    try:
        # Verificar caja abierta
        caja = CajaService.verificar_caja_abierta(db)
        if not caja:
            raise HTTPException(status_code=400, detail="No hay una caja abierta")
        
        egreso = CajaService.registrar_egreso(
            db, 
            caja.id, 
            datos.monto, 
            datos.descripcion, 
            datos.operador
        )
        return egreso
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al registrar egreso: {str(e)}")
    
# app/routers/caja_routes.py - AGREGAR ESTE ENDPOINT TEMPORAL

@router.get("/debug/estado-completo")
async def debug_estado_caja(db: Session = Depends(get_db)):
    """Endpoint de depuración para ver el estado completo de la caja"""
    try:
        caja = CajaService.verificar_caja_abierta(db)
        
        if not caja:
            return {
                "caja_abierta": False,
                "mensaje": "No hay caja abierta",
                "totales": None
            }
        
        # Obtener totales con egresos
        totales_con_egresos = CajaService.obtener_totales_con_egresos(db, caja.id, caja.fecha_apertura)
        
        # Obtener denominaciones
        denominaciones = CajaService.obtener_denominaciones(db, caja.id)
        
        # Obtener movimientos
        movimientos = CajaService.obtener_movimientos_dia(db)
        
        return {
            "caja_abierta": True,
            "caja_id": caja.id,
            "monto_inicial": float(caja.monto_inicial),
            "fecha_apertura": caja.fecha_apertura.isoformat(),
            "operador": caja.operador_apertura,
            "totales": totales_con_egresos,
            "denominaciones": denominaciones,
            "movimientos_resumen": {
                "cantidad": movimientos.get("total_movimientos", 0),
                "total_efectivo": movimientos.get("total_efectivo", 0),
                "total_tarjeta": movimientos.get("total_tarjeta", 0),
                "total_egresos": movimientos.get("total_egresos", 0),
                "saldo_neto": movimientos.get("saldo_neto", 0)
            }
        }
    except Exception as e:
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@router.get("/health")
def health_check():
    return {"success": True, "message": "Servicio de caja funcionando correctamente"}