# app/servicios/configuracion_service.py
from sqlalchemy.orm import Session
from app.modelos.configuracion_precios import ConfiguracionPrecios
from datetime import datetime, time as dt_time
import json

class ConfiguracionService:
    """Servicio para manejar la configuración de precios"""
    
    @staticmethod
    def obtener_configuracion(db: Session):
        """Obtener la configuración actual"""
        config = db.query(ConfiguracionPrecios).first()
        
        # Si no existe configuración, crear una con valores por defecto
        if not config:
            config = ConfiguracionPrecios(
                precio_0_5_min=0.50,        # 50 centavos
                precio_6_30_min=0.75,       # 75 centavos
                precio_31_60_min=1.00,      # 1 dólar
                precio_hora_adicional=1.00, # 1 dólar por hora adicional
                precio_nocturno=10.00,      # 10 dólares
                hora_inicio_nocturno=dt_time(19, 0),  # 7:00 PM
                hora_fin_nocturno=dt_time(7, 0),      # 7:00 AM
                rangos_personalizados=None
            )
            db.add(config)
            db.commit()
            db.refresh(config)
        
        return config
    
    @staticmethod
    def actualizar_configuracion(db: Session, datos: dict):
        """Actualizar la configuración"""
        config = ConfiguracionService.obtener_configuracion(db)
        
        # Campos numéricos
        if 'precio_0_5_min' in datos and datos['precio_0_5_min'] is not None:
            config.precio_0_5_min = float(datos['precio_0_5_min'])
        
        if 'precio_6_30_min' in datos and datos['precio_6_30_min'] is not None:
            config.precio_6_30_min = float(datos['precio_6_30_min'])
        
        if 'precio_31_60_min' in datos and datos['precio_31_60_min'] is not None:
            config.precio_31_60_min = float(datos['precio_31_60_min'])
        
        if 'precio_hora_adicional' in datos and datos['precio_hora_adicional'] is not None:
            config.precio_hora_adicional = float(datos['precio_hora_adicional'])
        
        if 'precio_nocturno' in datos and datos['precio_nocturno'] is not None:
            config.precio_nocturno = float(datos['precio_nocturno'])
        
        # Campos de hora
        if 'hora_inicio_nocturno' in datos and datos['hora_inicio_nocturno']:
            try:
                hora_str = datos['hora_inicio_nocturno']
                # Asegurar formato HH:MM
                if ':' in hora_str:
                    parts = hora_str.split(':')
                    hora = int(parts[0]) if parts[0] else 19
                    minuto = int(parts[1]) if len(parts) > 1 and parts[1] else 0
                    config.hora_inicio_nocturno = dt_time(hora, minuto)
            except Exception as e:
                print(f"Error procesando hora_inicio_nocturno: {e}")
                config.hora_inicio_nocturno = dt_time(19, 0)
        
        if 'hora_fin_nocturno' in datos and datos['hora_fin_nocturno']:
            try:
                hora_str = datos['hora_fin_nocturno']
                # Asegurar formato HH:MM
                if ':' in hora_str:
                    parts = hora_str.split(':')
                    hora = int(parts[0]) if parts[0] else 7
                    minuto = int(parts[1]) if len(parts) > 1 and parts[1] else 0
                    config.hora_fin_nocturno = dt_time(hora, minuto)
            except Exception as e:
                print(f"Error procesando hora_fin_nocturno: {e}")
                config.hora_fin_nocturno = dt_time(7, 0)
        
        # Rangos personalizados
        if 'rangos_personalizados' in datos:
            try:
                rangos = datos['rangos_personalizados']
                if rangos is None or rangos == "":
                    config.rangos_personalizados = None
                elif isinstance(rangos, str):
                    # Validar que sea JSON válido
                    json.loads(rangos)  # Esto lanzará error si no es JSON válido
                    config.rangos_personalizados = rangos
                else:
                    # Si ya es una estructura de datos, convertir a JSON string
                    config.rangos_personalizados = json.dumps(rangos)
            except (json.JSONDecodeError, TypeError) as e:
                print(f"Error procesando rangos personalizados: {e}")
                # Mantener los rangos existentes si hay error
                pass
        
        # Actualizar timestamp
        config.actualizado_en = datetime.utcnow()
        
        db.commit()
        db.refresh(config)
        
        return config