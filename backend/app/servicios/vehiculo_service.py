from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from datetime import datetime
from app.modelos.vehiculo_estacionado import VehiculoEstacionado
from app.modelos.historial_factura import HistorialFactura
from app.servicios.configuracion_service import ConfiguracionService
from app.servicios.calculo_service import CalculoService

class VehiculoService:
    """Servicio para manejar vehículos estacionados"""
    
    @staticmethod
    def obtener_espacios(db: Session):
        """
        Obtener el estado de los 15 espacios
        
        Returns:
            Lista de diccionarios con el estado de cada espacio
        """
        vehiculos_activos = db.query(VehiculoEstacionado).filter_by(estado='activo').all()
        espacios = []
        for i in range(1, 25):
            vehiculo = next((v for v in vehiculos_activos if v.espacio_numero == i), None)
            
            espacio_debug = {
                'numero': i,
                'ocupado': vehiculo is not None,
                'placa': vehiculo.placa if vehiculo else None,
                'entrada': vehiculo.fecha_hora_entrada.isoformat() if vehiculo else None,
                'es_nocturno': vehiculo.es_nocturno if vehiculo else False
            }
            
            print(f"  Espacio {i}: ocupado={espacio_debug['ocupado']}, " +
                  f"placa={espacio_debug['placa']}, " +
                  f"es_nocturno={espacio_debug['es_nocturno']}")
            
            espacios.append(espacio_debug)
        
        return espacios
    
    @staticmethod
    def registrar_entrada(db: Session, placa: str, espacio_numero: int, es_nocturno: bool = False):
        """
        Registrar la entrada de un vehículo
        """
        placa = placa.upper().strip()
        
        if not (1 <= espacio_numero <= 24):
            raise ValueError('El número de espacio debe estar entre 1 y 24')
        
        espacio_ocupado = db.query(VehiculoEstacionado).filter_by(
            espacio_numero=espacio_numero,
            estado='activo'
        ).first()
        
        if espacio_ocupado:
            raise ValueError(f'El espacio {espacio_numero} ya está ocupado')
        
        vehiculo_activo = db.query(VehiculoEstacionado).filter_by(
            placa=placa,
            estado='activo'
        ).first()
        
        if vehiculo_activo:
            raise ValueError(f'El vehículo {placa} ya está estacionado en el espacio {vehiculo_activo.espacio_numero}')
        
        vehiculo = VehiculoEstacionado(
            placa=placa,
            espacio_numero=espacio_numero,
            fecha_hora_entrada=datetime.now(),
            estado='activo',
            es_nocturno=es_nocturno
        )
        
        db.add(vehiculo)
        db.commit()
        db.refresh(vehiculo)
        
        return vehiculo
    
    @staticmethod
    def registrar_salida(db: Session, placa: str, es_no_pagado: bool = False):
        """
        Registrar la salida de un vehículo y calcular el costo
        """
        placa = placa.upper().strip()
        
        vehiculo = db.query(VehiculoEstacionado).filter_by(
            placa=placa,
            estado='activo'
        ).first()
        
        if not vehiculo:
            raise ValueError('Vehículo no encontrado o ya salió')
        
        config = ConfiguracionService.obtener_configuracion(db)
        fecha_salida = datetime.now()
        
        if es_no_pagado:
            print(f"Vehículo {placa} marcado como NO PAGADO - Costo: 0")
            costo = 0.0
            minutos = int((fecha_salida - vehiculo.fecha_hora_entrada).total_seconds() / 60)
            detalles = "VEHÍCULO NO PAGADO - Costo no cobrado"
        else:
            calculo = CalculoService.calcular_costo(
                vehiculo.fecha_hora_entrada,
                fecha_salida,
                config,
                vehiculo.es_nocturno
            )
            costo = calculo['costo']
            minutos = calculo['minutos']
            detalles = calculo['detalles']
        
        vehiculo.fecha_hora_salida = fecha_salida
        vehiculo.costo_total = costo
        vehiculo.estado = 'finalizado'
        vehiculo.es_no_pagado = es_no_pagado
        
        factura = HistorialFactura(
            vehiculo_id=vehiculo.id,
            placa=vehiculo.placa,
            espacio_numero=vehiculo.espacio_numero,
            fecha_hora_entrada=vehiculo.fecha_hora_entrada,
            fecha_hora_salida=fecha_salida,
            tiempo_total_minutos=minutos,
            costo_total=costo,
            detalles_cobro=detalles,
            es_nocturno=vehiculo.es_nocturno,
            es_no_pagado=es_no_pagado
        )
        
        db.add(factura)
        db.commit()
        db.refresh(vehiculo)
        db.refresh(factura)
        
        return {
            'vehiculo': vehiculo,
            'factura': factura,
            'tiempo_formateado': CalculoService.formatear_tiempo(minutos)
        }
    
    @staticmethod
    def buscar_vehiculo(db: Session, placa: str):
        """
        Buscar un vehículo activo y calcular costo estimado
        """
        placa = placa.upper().strip()
        
        vehiculo = db.query(VehiculoEstacionado).filter_by(
            placa=placa,
            estado='activo'
        ).first()
        
        if not vehiculo:
            raise ValueError('Vehículo no encontrado')
        
        config = ConfiguracionService.obtener_configuracion(db)
        print(f"Configuración precio_nocturno: {config.precio_nocturno}")
        
        calculo = CalculoService.calcular_costo(
            vehiculo.fecha_hora_entrada,
            datetime.now(),
            config,
            vehiculo.es_nocturno
        )
        
        return {
            'vehiculo': vehiculo,
            'costo_estimado': calculo['costo'],
            'tiempo_estimado': CalculoService.formatear_tiempo(calculo['minutos']),
            'detalles': calculo['detalles']
        }
    
    @staticmethod
    def obtener_historial(db: Session, fecha: str = None, limite: int = 50):
        """
        Obtener el historial de facturas
        """
        query = db.query(HistorialFactura).options(
            joinedload(HistorialFactura.vehiculo)
        )
        
        if fecha:
            try:
                fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
                query = query.filter(func.date(HistorialFactura.fecha_generacion) == fecha_obj)
            except ValueError:
                raise ValueError("Formato de fecha inválido. Use YYYY-MM-DD")
        
        historial = query.order_by(HistorialFactura.fecha_generacion.desc()).limit(limite).all()
        
        if historial:
            print(f"Depuración Historial - Primer registro:")
            print(f"   Factura ID: {historial[0].id}")
            print(f"   Placa: {historial[0].placa}")
            print(f"   Vehículo cargado: {historial[0].vehiculo is not None}")
            if historial[0].vehiculo:
                print(f"   es_nocturno: {historial[0].vehiculo.es_nocturno}")
                print(f"   to_dict() incluye es_nocturno?: {'es_nocturno' in historial[0].to_dict()}")
            else:
                print(f"  ERROR: Vehículo NO cargado para factura {historial[0].id}")
        
        return historial
    
    # 🔧 ERROR ARREGLADO AQUÍ: Este método estaba indentado dentro del anterior
    @staticmethod
    def obtener_reporte_diario(db: Session, fecha: str = None):
        """
        Obtener reporte de ingresos del día EXCLUYENDO NO PAGADOS
        """
        if fecha:
            fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
        else:
            fecha_obj = datetime.now().date()
        
        # Filtrar para EXCLUIR NO PAGADOS
        resultado_pagados = db.query(
            func.count(HistorialFactura.id).label('total_vehiculos'),
            func.sum(HistorialFactura.costo_total).label('ingresos_total')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_no_pagado == False
        ).first()
        
        # Datos adicionales para estadísticas
        resultado_todos = db.query(
            func.count(HistorialFactura.id).label('total')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj
        ).first()
        
        resultado_no_pagados = db.query(
            func.count(HistorialFactura.id).label('total'),
            func.sum(HistorialFactura.costo_total).label('perdida_total')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_no_pagado == True
        ).first()
        
        # Ingresos por tipo
        resultado_nocturnos = db.query(
            func.sum(HistorialFactura.costo_total).label('ingresos')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_nocturno == True,
            HistorialFactura.es_no_pagado == False
        ).first()
        
        resultado_normales = db.query(
            func.sum(HistorialFactura.costo_total).label('ingresos')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_nocturno == False,
            HistorialFactura.es_no_pagado == False
        ).first()
        
        # Conteo por tipo
        conteo_nocturnos = db.query(
            func.count(HistorialFactura.id).label('total')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_nocturno == True,
            HistorialFactura.es_no_pagado == False
        ).first()
        
        conteo_normales = db.query(
            func.count(HistorialFactura.id).label('total')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_nocturno == False,
            HistorialFactura.es_no_pagado == False
        ).first()
        
        conteo_nocturnos_no_pagados = db.query(
            func.count(HistorialFactura.id).label('total')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_nocturno == True,
            HistorialFactura.es_no_pagado == True
        ).first()
        
        return {
            'fecha': fecha_obj.isoformat(),
            'total_vehiculos': resultado_pagados.total_vehiculos or 0,
            'ingresos_total': float(resultado_pagados.ingresos_total or 0),
            'estadisticas_avanzadas': {
                'total_todos': resultado_todos.total or 0,
                'total_no_pagados': resultado_no_pagados.total or 0,
                'perdida_total': float(resultado_no_pagados.perdida_total or 0),
                'vehiculos_nocturnos': conteo_nocturnos.total or 0,
                'vehiculos_normales': conteo_normales.total or 0,
                'vehiculos_nocturnos_no_pagados': conteo_nocturnos_no_pagados.total or 0,
                'ingresos_nocturnos': float(resultado_nocturnos.ingresos or 0),
                'ingresos_normales': float(resultado_normales.ingresos or 0)
            }
        }