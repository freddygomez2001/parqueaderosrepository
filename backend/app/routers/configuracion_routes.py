# app/routes/configuracion_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import get_db
from app.servicios.configuracion_service import ConfiguracionService
from app.esquemas.configuracion_schema import ConfiguracionResponse, ConfiguracionUpdate
from app.utils.validators import validar_formato_hora

router = APIRouter(
    prefix="/api/configuracion",
    tags=["Configuración"]
)

@router.get("/", response_model=ConfiguracionResponse)
async def obtener_configuracion(db: Session = Depends(get_db)):
    """Obtener la configuración actual de precios"""
    try:
        config = ConfiguracionService.obtener_configuracion(db)
        return config.to_dict()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener configuración: {str(e)}"
        )

@router.put("/", response_model=ConfiguracionResponse)
async def actualizar_configuracion(datos: ConfiguracionUpdate, db: Session = Depends(get_db)):
    """Actualizar la configuración de precios"""
    try:
        print(f"Datos recibidos para actualizar: {datos}")
        
        # Validar horas si se están actualizando
        if datos.hora_inicio_nocturno is not None:
            if not validar_formato_hora(datos.hora_inicio_nocturno):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Formato de hora_inicio_nocturno inválido. Use HH:MM"
                )
        
        if datos.hora_fin_nocturno is not None:
            if not validar_formato_hora(datos.hora_fin_nocturno):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Formato de hora_fin_nocturno inválido. Use HH:MM"
                )
        
        # Validar precios
        campos_numericos = [
            ('precio_0_5_min', datos.precio_0_5_min),
            ('precio_6_30_min', datos.precio_6_30_min),
            ('precio_31_60_min', datos.precio_31_60_min),
            ('precio_hora_adicional', datos.precio_hora_adicional),
            ('precio_nocturno', datos.precio_nocturno),
        ]
        
        for campo, valor in campos_numericos:
            if valor is not None and valor < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{campo} no puede ser negativo"
                )
        
        # Validar rangos personalizados si se proporcionan
        if datos.rangos_personalizados is not None and datos.rangos_personalizados != "":
            try:
                import json
                rangos = datos.rangos_personalizados
                if isinstance(rangos, str):
                    rangos_dict = json.loads(rangos)
                else:
                    rangos_dict = rangos
                
                # Validar estructura de rangos
                if not isinstance(rangos_dict, list):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="rangos_personalizados debe ser una lista de rangos"
                    )
                
                for i, rango in enumerate(rangos_dict):
                    if not all(k in rango for k in ['min_minutos', 'max_minutos', 'precio']):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Rango {i+1} debe tener min_minutos, max_minutos y precio"
                        )
                    
                    if rango['min_minutos'] < 0 or rango['max_minutos'] < 0:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Rango {i+1}: minutos no pueden ser negativos"
                        )
                    
                    if rango['min_minutos'] >= rango['max_minutos']:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Rango {i+1}: min_minutos debe ser menor que max_minutos"
                        )
                    
                    if rango['precio'] < 0:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Rango {i+1}: precio no puede ser negativo"
                        )
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="rangos_personalizados debe ser un JSON válido"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error validando rangos personalizados: {str(e)}"
                )
        
        # Convertir el modelo Pydantic a dict excluyendo valores None
        datos_dict = datos.dict(exclude_none=True)
        print(f"Datos para actualizar: {datos_dict}")
        
        config = ConfiguracionService.actualizar_configuracion(db, datos_dict)
        print(f"Configuración actualizada: {config.to_dict()}")
        
        return config.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en actualizar_configuracion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar configuración: {str(e)}"
        )

# Endpoint adicional para obtener solo las tarifas
@router.get("/tarifas")
async def obtener_tarifas(db: Session = Depends(get_db)):
    """Obtener solo las tarifas en formato simplificado"""
    try:
        config = ConfiguracionService.obtener_configuracion(db)
        
        # Preparar respuesta simplificada
        tarifas = {
            "rangos_fijos": {
                "0_5_min": float(config.precio_0_5_min),
                "6_30_min": float(config.precio_6_30_min),
                "31_60_min": float(config.precio_31_60_min),
                "hora_adicional": float(config.precio_hora_adicional),
                "nocturno_12h": float(config.precio_nocturno)
            },
            "horario_nocturno": {
                "inicio": str(config.hora_inicio_nocturno),
                "fin": str(config.hora_fin_nocturno)
            }
        }
        
        # Agregar rangos personalizados si existen
        if config.rangos_personalizados:
            try:
                import json
                rangos = json.loads(config.rangos_personalizados)
                tarifas["rangos_personalizados"] = rangos
            except:
                tarifas["rangos_personalizados"] = []
        
        return tarifas
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener tarifas: {str(e)}"
        )