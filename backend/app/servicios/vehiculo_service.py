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
        Obtener el estado de los 24 espacios
        
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
        
        # ✅ Verificar si la placa tiene deudas pendientes
        deudas_pendientes = db.query(HistorialFactura).filter_by(
            placa=placa,
            es_no_pagado=True
        ).first()
        
        if deudas_pendientes:
            raise ValueError(f'El vehículo {placa} tiene deudas pendientes. Debe pagar primero.')
        
        # Validar número de espacio
        if not (1 <= espacio_numero <= 24):
            raise ValueError('El número de espacio debe estar entre 1 y 24')
        
        # Verificar si el espacio está ocupado
        espacio_ocupado = db.query(VehiculoEstacionado).filter_by(
            espacio_numero=espacio_numero,
            estado='activo'
        ).first()
        
        if espacio_ocupado:
            raise ValueError(f'El espacio {espacio_numero} ya está ocupado')
        
        # Verificar si el vehículo ya está estacionado
        vehiculo_activo = db.query(VehiculoEstacionado).filter_by(
            placa=placa,
            estado='activo'
        ).first()
        
        if vehiculo_activo:
            raise ValueError(f'El vehículo {placa} ya está estacionado en el espacio {vehiculo_activo.espacio_numero}')
        
        # Crear nuevo vehículo
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
    def registrar_salida(db: Session, placa: str, es_no_pagado: bool = False, metodo_pago: str = "efectivo"):
        """
        Registrar la salida de un vehículo y calcular el costo
        
        Args:
            db: Sesión de base de datos
            placa: Placa del vehículo
            es_no_pagado: Indica si el vehículo se va sin pagar
            metodo_pago: 'efectivo' o 'tarjeta' (solo aplica si es_no_pagado=False)
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
        
        # SIEMPRE calcular el costo real
        calculo = CalculoService.calcular_costo(
            vehiculo.fecha_hora_entrada,
            fecha_salida,
            config,
            vehiculo.es_nocturno
        )
        
        costo_calculado = calculo['costo']
        minutos = calculo['minutos']
        detalles_base = calculo['detalles']
        
        # Formatear detalles según si es pagado o no
        if es_no_pagado:
            print(f"🔴 Vehículo {placa} marcado como NO PAGADO - Costo calculado: ${costo_calculado:.2f}")
            detalles = f"NO PAGADO - {detalles_base} - Valor no cobrado: ${costo_calculado:.2f}"
            estado_cobro = "NO COBRADO"
        else:
            detalles = detalles_base
            estado_cobro = f"COBRADO ({metodo_pago.upper()})"
        
        # Actualizar vehículo
        vehiculo.fecha_hora_salida = fecha_salida
        vehiculo.costo_total = costo_calculado
        vehiculo.estado = 'finalizado'
        vehiculo.es_no_pagado = es_no_pagado
        
        # Crear factura con el método de pago
        factura = HistorialFactura(
            vehiculo_id=vehiculo.id,
            placa=vehiculo.placa,
            espacio_numero=vehiculo.espacio_numero,
            fecha_hora_entrada=vehiculo.fecha_hora_entrada,
            fecha_hora_salida=fecha_salida,
            tiempo_total_minutos=minutos,
            costo_total=costo_calculado,
            detalles_cobro=detalles,
            es_nocturno=vehiculo.es_nocturno,
            es_no_pagado=es_no_pagado,
            metodo_pago=metodo_pago  # 👈 GUARDAR EL MÉTODO DE PAGO
        )
        
        db.add(factura)
        db.commit()
        db.refresh(vehiculo)
        db.refresh(factura)
        
        print(f"✅ Salida registrada - Placa: {placa}, Espacio: {vehiculo.espacio_numero}, "
              f"Método: {metodo_pago}, Costo: ${costo_calculado:.2f}, Estado: {estado_cobro}")
        
        return {
            'vehiculo': vehiculo,
            'factura': factura,
            'tiempo_formateado': CalculoService.formatear_tiempo(minutos),
            'costo_calculado': costo_calculado,
            'es_no_pagado': es_no_pagado,
            'metodo_pago': metodo_pago
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
            print(f"📊 Depuración Historial - Primer registro:")
            print(f"   Factura ID: {historial[0].id}")
            print(f"   Placa: {historial[0].placa}")
            print(f"   Costo: ${historial[0].costo_total}")
            print(f"   Método Pago: {historial[0].metodo_pago}")
            print(f"   No Pagado: {historial[0].es_no_pagado}")
            print(f"   Nocturno: {historial[0].es_nocturno}")
        
        return historial
    
    @staticmethod
    def obtener_reporte_diario(db: Session, fecha: str = None):
        """
        Obtener reporte de ingresos del día
        
        ✅ CORRECCIÓN: 
        - Los NO PAGADOS muestran su valor real en 'total_no_cobrado'
        - Los ingresos reales solo incluyen vehículos PAGADOS
        - Se diferencia entre efectivo y tarjeta
        """
        if fecha:
            fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
        else:
            fecha_obj = datetime.now().date()
        
        print(f"📅 Generando reporte para: {fecha_obj}")
        
        # 1️⃣ INGRESOS REALES (solo pagados)
        resultado_pagados = db.query(
            func.count(HistorialFactura.id).label('total_vehiculos'),
            func.sum(HistorialFactura.costo_total).label('ingresos_total')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_no_pagado == False
        ).first()
        
        # 2️⃣ INGRESOS POR MÉTODO DE PAGO (solo pagados)
        ingresos_efectivo = db.query(
            func.sum(HistorialFactura.costo_total).label('total')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_no_pagado == False,
            HistorialFactura.metodo_pago == "efectivo"
        ).first()
        
        ingresos_tarjeta = db.query(
            func.sum(HistorialFactura.costo_total).label('total')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_no_pagado == False,
            HistorialFactura.metodo_pago == "tarjeta"
        ).first()
        
        # 3️⃣ DEUDAS NO COBRADAS (con valor real)
        resultado_no_pagados = db.query(
            func.count(HistorialFactura.id).label('total'),
            func.sum(HistorialFactura.costo_total).label('total_no_cobrado')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_no_pagado == True
        ).first()
        
        # 4️⃣ TOTAL GENERAL
        resultado_todos = db.query(
            func.count(HistorialFactura.id).label('total'),
            func.sum(HistorialFactura.costo_total).label('valor_total_real')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj
        ).first()
        
        # 5️⃣ INGRESOS POR TIPO (solo pagados)
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
        
        # 6️⃣ CONTEO POR TIPO (pagados)
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
        
        # 7️⃣ CONTEO NO PAGADOS POR TIPO
        conteo_nocturnos_no_pagados = db.query(
            func.count(HistorialFactura.id).label('total')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_nocturno == True,
            HistorialFactura.es_no_pagado == True
        ).first()
        
        conteo_normales_no_pagados = db.query(
            func.count(HistorialFactura.id).label('total')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_nocturno == False,
            HistorialFactura.es_no_pagado == True
        ).first()
        
        # 8️⃣ VALOR NO COBRADO POR TIPO
        valor_no_cobrado_nocturnos = db.query(
            func.sum(HistorialFactura.costo_total).label('valor')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_nocturno == True,
            HistorialFactura.es_no_pagado == True
        ).first()
        
        valor_no_cobrado_normales = db.query(
            func.sum(HistorialFactura.costo_total).label('valor')
        ).filter(
            func.date(HistorialFactura.fecha_generacion) == fecha_obj,
            HistorialFactura.es_nocturno == False,
            HistorialFactura.es_no_pagado == True
        ).first()
        
        # 9️⃣ CALCULAR PORCENTAJES
        ingresos_totales = float(resultado_pagados.ingresos_total or 0)
        ingresos_efectivo_total = float(ingresos_efectivo.total or 0)
        ingresos_tarjeta_total = float(ingresos_tarjeta.total or 0)
        no_cobrado_total = float(resultado_no_pagados.total_no_cobrado or 0)
        valor_total_real = float(resultado_todos.valor_total_real or 0)
        
        porcentaje_perdida = 0
        if valor_total_real > 0:
            porcentaje_perdida = (no_cobrado_total / valor_total_real) * 100
        
        return {
            'fecha': fecha_obj.isoformat(),
            'total_vehiculos': resultado_pagados.total_vehiculos or 0,
            'ingresos_total': ingresos_totales,
            'ingresos_efectivo': ingresos_efectivo_total,
            'ingresos_tarjeta': ingresos_tarjeta_total,
            'estadisticas_avanzadas': {
                # Totales
                'total_todos': resultado_todos.total or 0,
                'total_no_pagados': resultado_no_pagados.total or 0,
                'valor_total_real': valor_total_real,
                
                # Valores no cobrados
                'total_no_cobrado': no_cobrado_total,
                'valor_no_cobrado_nocturnos': float(valor_no_cobrado_nocturnos.valor or 0),
                'valor_no_cobrado_normales': float(valor_no_cobrado_normales.valor or 0),
                
                # Conteos
                'vehiculos_nocturnos': conteo_nocturnos.total or 0,
                'vehiculos_normales': conteo_normales.total or 0,
                'vehiculos_nocturnos_no_pagados': conteo_nocturnos_no_pagados.total or 0,
                'vehiculos_normales_no_pagados': conteo_normales_no_pagados.total or 0,
                
                # Ingresos (solo cobrados)
                'ingresos_nocturnos': float(resultado_nocturnos.ingresos or 0),
                'ingresos_normales': float(resultado_normales.ingresos or 0),
                
                # Análisis financiero
                'porcentaje_perdida': round(porcentaje_perdida, 2),
                'eficiencia_cobro': round((ingresos_totales / valor_total_real * 100) if valor_total_real > 0 else 100, 2)
            }
        }
    
    @staticmethod
    def obtener_resumen_no_pagados(db: Session):
        """
        Obtener resumen detallado de vehículos no pagados
        """
        # Obtener todas las facturas no pagadas
        no_pagados = db.query(HistorialFactura).filter(
            HistorialFactura.es_no_pagado == True
        ).order_by(HistorialFactura.fecha_generacion.desc()).all()
        
        # Agrupar por placa
        placas_no_pagadas = {}
        for factura in no_pagados:
            placa = factura.placa
            if placa not in placas_no_pagadas:
                placas_no_pagadas[placa] = {
                    'placa': placa,
                    'cantidad_deudas': 0,
                    'total_deuda': 0.0,
                    'ultima_salida': None,
                    'detalles': []
                }
            
            placas_no_pagadas[placa]['cantidad_deudas'] += 1
            placas_no_pagadas[placa]['total_deuda'] += float(factura.costo_total)
            
            if not placas_no_pagadas[placa]['ultima_salida'] or \
               factura.fecha_hora_salida > placas_no_pagadas[placa]['ultima_salida']:
                placas_no_pagadas[placa]['ultima_salida'] = factura.fecha_hora_salida
            
            placas_no_pagadas[placa]['detalles'].append({
                'fecha': factura.fecha_hora_salida.date().isoformat() if factura.fecha_hora_salida else None,
                'costo': float(factura.costo_total),
                'espacio': factura.espacio_numero,
                'metodo_pago': factura.metodo_pago,
                'detalles': factura.detalles_cobro
            })
        
        # Calcular totales
        total_vehiculos_deudores = len(placas_no_pagadas)
        total_deudas = sum(info['cantidad_deudas'] for info in placas_no_pagadas.values())
        total_valor_no_cobrado = sum(info['total_deuda'] for info in placas_no_pagadas.values())
        
        return {
            'total_vehiculos_deudores': total_vehiculos_deudores,
            'total_deudas': total_deudas,
            'total_valor_no_cobrado': total_valor_no_cobrado,
            'placas_deudoras': list(placas_no_pagadas.values())
        }