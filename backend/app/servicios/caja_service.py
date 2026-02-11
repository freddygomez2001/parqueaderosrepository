# app/servicios/caja_service.py

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List

from app.modelos.caja import Caja, EstadoCaja
from app.modelos.historial_factura import HistorialFactura
from app.modelos.venta_servicio import VentaServicio
from app.modelos.movimiento_manual import MovimientoManualCaja
from app.modelos.denominacion_caja import DenominacionCaja
from app.modelos.egreso_caja import EgresoCaja  # 👈 NUEVO MODELO


class CajaService:

    # =========================
    # Caja
    # =========================

    @staticmethod
    def verificar_caja_abierta(db: Session) -> Optional[Caja]:
        hoy = date.today()
        inicio_dia = datetime.combine(hoy, datetime.min.time())
        fin_dia = datetime.combine(hoy + timedelta(days=1), datetime.min.time())

        return db.query(Caja).filter(
            and_(
                Caja.estado == EstadoCaja.ABIERTA,
                Caja.fecha_apertura >= inicio_dia,
                Caja.fecha_apertura < fin_dia
            )
        ).order_by(Caja.fecha_apertura.desc()).first()

    @staticmethod
    def obtener_totales_desde_caja(db: Session, caja_id: int, fecha_apertura: datetime) -> dict:
        """Obtiene totales desde la apertura de una caja específica"""
        
        # =========================================
        # ✅ PARQUEO - SOLO EFECTIVO (SÍ suma a caja)
        # =========================================
        total_parqueo_efectivo = db.query(
            func.sum(HistorialFactura.costo_total)
        ).filter(
            and_(
                HistorialFactura.fecha_hora_salida >= fecha_apertura,
                HistorialFactura.es_no_pagado == False,
                HistorialFactura.metodo_pago == "efectivo"
            )
        ).scalar() or 0

        # =========================================
        # 📊 PARQUEO - TARJETA (NO suma a caja, solo estadísticas)
        # =========================================
        total_parqueo_tarjeta = db.query(
            func.sum(HistorialFactura.costo_total)
        ).filter(
            and_(
                HistorialFactura.fecha_hora_salida >= fecha_apertura,
                HistorialFactura.es_no_pagado == False,
                HistorialFactura.metodo_pago == "tarjeta"
            )
        ).scalar() or 0

        # =========================================
        # ✅ SERVICIOS - EFECTIVO (SÍ suma a caja)
        # =========================================
        total_servicios_efectivo = db.query(
            func.sum(VentaServicio.total)
        ).filter(
            and_(
                VentaServicio.fecha >= fecha_apertura,
                VentaServicio.metodo_pago != "tarjeta"
            )
        ).scalar() or 0

        # =========================================
        # 📊 SERVICIOS - TARJETA (NO suma a caja, solo estadísticas)
        # =========================================
        total_servicios_tarjeta = db.query(
            func.sum(VentaServicio.total)
        ).filter(
            and_(
                VentaServicio.fecha >= fecha_apertura,
                VentaServicio.metodo_pago == "tarjeta"
            )
        ).scalar() or 0

        # =========================================
        # ✅ MANUALES (SÍ suma a caja)
        # =========================================
        try:
            total_manuales = db.query(
                func.sum(MovimientoManualCaja.monto)
            ).filter(
                MovimientoManualCaja.caja_id == caja_id
            ).scalar() or 0
        except:
            total_manuales = 0

        # =========================================
        # ✅ TOTAL INGRESOS = SOLO LO QUE SUMA A CAJA
        # =========================================
        total_ingresos = float(total_parqueo_efectivo) + float(total_servicios_efectivo) + float(total_manuales)

        return {
            # 💰 INGRESOS REALES (Suman a caja)
            "total_parqueo_efectivo": float(total_parqueo_efectivo),
            "total_servicios_efectivo": float(total_servicios_efectivo),
            "total_manuales": float(total_manuales),
            "total_ingresos": total_ingresos,
            
            # 📊 ESTADÍSTICAS (No suman a caja)
            "total_parqueo_tarjeta": float(total_parqueo_tarjeta),
            "total_servicios_tarjeta": float(total_servicios_tarjeta),
            "total_parqueo_total": float(total_parqueo_efectivo + total_parqueo_tarjeta),
            "total_servicios_total": float(total_servicios_efectivo + total_servicios_tarjeta),
        }

    # =========================================
    # ✅ DENOMINACIONES (Billetes y Monedas)
    # =========================================
    
    @staticmethod
    def _convertir_a_dict(obj: Any) -> Any:
        """Convierte objetos Pydantic a diccionario recursivamente"""
        if obj is None:
            return None
        if hasattr(obj, 'dict'):
            obj = obj.dict()
        if isinstance(obj, dict):
            return {k: CajaService._convertir_a_dict(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [CajaService._convertir_a_dict(item) for item in obj]
        return obj

    @staticmethod
    def guardar_denominaciones(db: Session, caja_id: int, tipo: str, denominaciones_data: Any):
        """
        Guarda el detalle de billetes y monedas para apertura o cierre de caja
        
        Args:
            db: Sesión de base de datos
            caja_id: ID de la caja
            tipo: 'apertura' o 'cierre'
            denominaciones_data: Datos de denominaciones (Pydantic o dict)
        """
        from app.modelos.denominacion_caja import DenominacionCaja
        
        denominaciones_data = CajaService._convertir_a_dict(denominaciones_data)
        
        # Eliminar denominaciones existentes del mismo tipo para esta caja
        db.query(DenominacionCaja).filter(
            DenominacionCaja.caja_id == caja_id,
            DenominacionCaja.tipo == tipo
        ).delete()
        
        # Si no hay items o el total es 0, no guardar nada
        if not denominaciones_data or not denominaciones_data.get('items'):
            db.commit()
            print(f"⚠️ No hay items para guardar en caja {caja_id}, tipo {tipo}")
            return
        
        # Guardar nuevas denominaciones
        items_guardados = 0
        for item in denominaciones_data.get('items', []):
            if item.get('cantidad', 0) > 0:
                denominacion = DenominacionCaja(
                    caja_id=caja_id,
                    tipo=tipo,
                    denominacion=item['denominacion'],
                    cantidad=item['cantidad'],
                    subtotal=item['subtotal']
                )
                db.add(denominacion)
                items_guardados += 1
        
        db.commit()
        
        print(f"✅ Denominaciones de {tipo} guardadas para caja {caja_id}")
        print(f"   Total: ${denominaciones_data.get('total', 0):.2f}")
        print(f"   Items guardados: {items_guardados}")

    @staticmethod
    def obtener_denominaciones(db: Session, caja_id: int) -> dict:
        """
        Obtiene las denominaciones de apertura y cierre de una caja
        
        Returns:
            dict: {
                'apertura': [{'denominacion': float, 'cantidad': int, 'subtotal': float, ...}],
                'cierre': [...],
                'total_apertura': float,
                'total_cierre': float
            }
        """
        from app.modelos.denominacion_caja import DenominacionCaja
        
        denominaciones = db.query(DenominacionCaja).filter(
            DenominacionCaja.caja_id == caja_id
        ).all()
        
        resultado = {
            'apertura': [],
            'cierre': [],
            'total_apertura': 0.0,
            'total_cierre': 0.0
        }
        
        for d in denominaciones:
            item = d.to_dict()
            if d.tipo == 'apertura':
                resultado['apertura'].append(item)
                resultado['total_apertura'] += item['subtotal']
            else:
                resultado['cierre'].append(item)
                resultado['total_cierre'] += item['subtotal']
        
        return resultado

    # =========================
    # Apertura de Caja
    # =========================

    @staticmethod
    def abrir_caja(db: Session, monto_inicial: float, operador: str, notas: Optional[str] = None, denominaciones: Optional[Any] = None) -> Caja:
        """
        Abre una nueva caja
        
        Args:
            db: Sesión de base de datos
            monto_inicial: Monto inicial en efectivo
            operador: Nombre del operador
            notas: Notas opcionales
            denominaciones: Detalle de billetes y monedas (opcional)
        """
        if CajaService.verificar_caja_abierta(db):
            raise ValueError("Ya existe una caja abierta")

        denom_dict = None
        if denominaciones:
            denom_dict = CajaService._convertir_a_dict(denominaciones)
            total_denominaciones = denom_dict.get('total', 0)
            if abs(total_denominaciones - monto_inicial) > 0.01:
                raise ValueError(f"El monto inicial (${monto_inicial:.2f}) no coincide con el total de denominaciones (${total_denominaciones:.2f})")

        caja = Caja(
            monto_inicial=monto_inicial,
            fecha_apertura=datetime.now(),
            operador_apertura=operador,
            estado=EstadoCaja.ABIERTA,
            notas_apertura=notas,
            total_parqueo=0,
            total_servicios=0,
            total_ingresos=0
        )

        db.add(caja)
        db.commit()
        db.refresh(caja)
        
        if denom_dict:
            CajaService.guardar_denominaciones(db, caja.id, 'apertura', denom_dict)
            db.refresh(caja)
        
        print(f"✅ Caja abierta - ID: {caja.id}, Operador: {operador}, Monto inicial: ${monto_inicial:.2f}")
        if denom_dict:
            print(f"   Denominaciones guardadas: {len(denom_dict.get('items', []))} items")
        
        return caja

    # =========================
    # Cierre de Caja
    # =========================

    @staticmethod
    def cerrar_caja(db: Session, monto_final: float, operador: Optional[str] = None, notas: Optional[str] = None, denominaciones: Optional[Any] = None) -> Caja:
        """
        Cierra la caja actual
        
        Args:
            db: Sesión de base de datos
            monto_final: Monto físico contado en caja
            operador: Nombre del operador (opcional)
            notas: Notas opcionales
            denominaciones: Detalle de billetes y monedas contados (opcional)
        """
        caja = CajaService.verificar_caja_abierta(db)
        if not caja:
            raise ValueError("No hay una caja abierta")

        denom_dict = None
        if denominaciones:
            denom_dict = CajaService._convertir_a_dict(denominaciones)
            total_denominaciones = denom_dict.get('total', 0)
            if abs(total_denominaciones - monto_final) > 0.01:
                raise ValueError(f"El monto final (${monto_final:.2f}) no coincide con el total de denominaciones (${total_denominaciones:.2f})")

        # Obtener totales incluyendo egresos
        totales_con_egresos = CajaService.obtener_totales_con_egresos(db, caja.id, caja.fecha_apertura)
        
        # Monto esperado = inicial + saldo_neto (ingresos - egresos)
        monto_esperado = float(caja.monto_inicial) + totales_con_egresos["saldo_neto"]

        caja.monto_final = monto_final
        caja.fecha_cierre = datetime.now()
        caja.operador_cierre = operador or caja.operador_apertura
        
        # Guardar SOLO los ingresos que suman a caja (sin egresos)
        caja.total_parqueo = totales_con_egresos["total_parqueo_efectivo"]
        caja.total_servicios = totales_con_egresos["total_servicios_efectivo"]
        caja.total_ingresos = totales_con_egresos["total_ingresos"]
        
        caja.monto_esperado = monto_esperado
        caja.diferencia = monto_final - monto_esperado
        caja.estado = EstadoCaja.CERRADA
        caja.notas_cierre = notas

        db.commit()
        db.refresh(caja)
        
        if denom_dict:
            CajaService.guardar_denominaciones(db, caja.id, 'cierre', denom_dict)
            db.refresh(caja)
        
        print(f"✅ Caja cerrada - ID: {caja.id}, Operador: {caja.operador_cierre}")
        print(f"   Ingresos: ${totales_con_egresos['total_ingresos']:.2f}")
        print(f"   Egresos: -${totales_con_egresos['total_egresos']:.2f}")
        print(f"   Saldo neto: ${totales_con_egresos['saldo_neto']:.2f}")
        print(f"   Monto esperado: ${monto_esperado:.2f}, Monto físico: ${monto_final:.2f}")
        print(f"   Diferencia: ${caja.diferencia:+.2f}")
        
        return caja

    # =========================
    # Totales y estado
    # =========================

    @staticmethod
    def obtener_estado_caja(db: Session) -> dict:
        """Obtiene el estado actual de la caja incluyendo denominaciones y egresos"""
        caja = CajaService.verificar_caja_abierta(db)
        
        if not caja:
            return {
                "caja_abierta": False,
                "caja_actual": None,
                # 💰 Ingresos reales (suman a caja)
                "total_dia_parqueo": 0.0,
                "total_dia_servicios": 0.0,
                "total_dia_manuales": 0.0,
                "total_dia_total": 0.0,
                # 📊 Estadísticas (no suman a caja)
                "total_dia_parqueo_tarjeta": 0.0,
                "total_dia_servicios_tarjeta": 0.0,
                "total_dia_parqueo_total": 0.0,
                "total_dia_servicios_total": 0.0,
                # 💰 Egresos y saldo neto
                "total_dia_egresos": 0.0,
                "saldo_neto": 0.0,
                "saldo_actual": 0.0,  # ✅ NUEVO
                "monto_esperado": 0.0,
                # 💵 Denominaciones
                "denominaciones_apertura": [],
                "total_denominaciones_apertura": 0.0,
            }
        
        # Obtener totales de ingresos (parqueo efectivo + servicios efectivo + manuales)
        totales = CajaService.obtener_totales_desde_caja(db, caja.id, caja.fecha_apertura)
        
        # ✅ Obtener total de egresos
        from app.modelos.egreso_caja import EgresoCaja
        total_egresos = db.query(
            func.sum(EgresoCaja.monto)
        ).filter(
            EgresoCaja.caja_id == caja.id
        ).scalar() or 0
        
        # ✅ Calcular saldo neto (ingresos - egresos)
        saldo_neto = totales["total_ingresos"] - float(total_egresos)
        
        # ✅ Calcular saldo actual en caja (inicial + ingresos - egresos)
        saldo_actual = float(caja.monto_inicial) + saldo_neto
        
        # ✅ Monto esperado = saldo_actual (es lo mismo)
        monto_esperado = saldo_actual
        
        # Obtener denominaciones de apertura
        denominaciones = CajaService.obtener_denominaciones(db, caja.id)

        return {
            "caja_abierta": True,
            "caja_actual": caja.to_dict(),
            
            # 💰 INGRESOS REALES - ESTOS SUMAN A CAJA
            "total_dia_parqueo": totales["total_parqueo_efectivo"],
            "total_dia_servicios": totales["total_servicios_efectivo"],
            "total_dia_manuales": totales["total_manuales"],
            "total_dia_total": totales["total_ingresos"],
            
            # 📊 ESTADÍSTICAS - SOLO INFORMATIVO (NO SUMAN A CAJA)
            "total_dia_parqueo_tarjeta": totales["total_parqueo_tarjeta"],
            "total_dia_servicios_tarjeta": totales["total_servicios_tarjeta"],
            "total_dia_parqueo_total": totales["total_parqueo_total"],
            "total_dia_servicios_total": totales["total_servicios_total"],
            
            # 💰 EGRESOS Y SALDO NETO
            "total_dia_egresos": float(total_egresos),  # ✅ CAMBIADO: usar total_egresos calculado
            "saldo_neto": saldo_neto,                   # ✅ CAMBIADO: usar saldo_neto calculado
            "saldo_actual": saldo_actual,               # ✅ NUEVO: saldo real en caja
            
            "monto_esperado": monto_esperado,           # ✅ CAMBIADO: ahora es igual a saldo_actual
            
            # 💵 DENOMINACIONES DE APERTURA
            "denominaciones_apertura": denominaciones['apertura'],
            "total_denominaciones_apertura": denominaciones['total_apertura'],
        }

    @staticmethod
    def obtener_resumen_caja(db: Session) -> dict:
        """Obtiene un resumen de la caja actual para el cierre"""
        caja = CajaService.verificar_caja_abierta(db)
        if not caja:
            raise ValueError("No hay una caja abierta")
        
        totales_con_egresos = CajaService.obtener_totales_con_egresos(db, caja.id, caja.fecha_apertura)
        monto_esperado = float(caja.monto_inicial) + totales_con_egresos["saldo_neto"]
        
        return {
            "monto_inicial": float(caja.monto_inicial),
            "ingresos_parqueo": totales_con_egresos["total_parqueo_efectivo"],
            "ingresos_servicios": totales_con_egresos["total_servicios_efectivo"],
            "total_ingresos": totales_con_egresos["total_ingresos"],
            "total_egresos": totales_con_egresos["total_egresos"],
            "saldo_neto": totales_con_egresos["saldo_neto"],
            "monto_esperado": monto_esperado,
            "monto_final": float(caja.monto_final) if caja.monto_final else None,
            "diferencia": float(caja.diferencia) if caja.diferencia else None,
            "operador": caja.operador_apertura,
            "fecha_apertura": caja.fecha_apertura.isoformat(),
        }

    @staticmethod
    def obtener_historial_cajas(db: Session, limite: int = 30) -> list:
        """Obtiene el historial de cajas cerradas"""
        cajas = db.query(Caja).filter(
            Caja.estado == EstadoCaja.CERRADA
        ).order_by(
            Caja.fecha_cierre.desc()
        ).limit(limite).all()
        
        resultado = []
        for caja in cajas:
            caja_dict = caja.to_dict()
            
            # Agregar denominaciones
            denominaciones = CajaService.obtener_denominaciones(db, caja.id)
            caja_dict['denominaciones'] = denominaciones
            
            # Agregar egresos
            egresos = CajaService.obtener_egresos_caja(db, caja.id)
            caja_dict['egresos'] = egresos
            caja_dict['total_egresos'] = sum(e['monto'] for e in egresos)
            
            resultado.append(caja_dict)
        
        return resultado

    # =========================
    # Movimientos manuales
    # =========================

    @staticmethod
    def agregar_efectivo(db: Session, monto: float, descripcion: str, operador: str) -> dict:
        """Agrega efectivo manual a la caja actual"""
        caja = CajaService.verificar_caja_abierta(db)
        if not caja:
            raise ValueError("No hay una caja abierta")
        if monto <= 0:
            raise ValueError("El monto debe ser mayor a 0")

        movimiento = MovimientoManualCaja(
            caja_id=caja.id,
            monto=monto,
            descripcion=descripcion or "Efectivo agregado manualmente",
            operador=operador,
            fecha=datetime.now()
        )

        db.add(movimiento)
        db.commit()
        db.refresh(movimiento)
        
        print(f"💰 Efectivo manual agregado - Caja: {caja.id}, Monto: +${monto:.2f}, Operador: {operador}")
        
        return movimiento.to_dict()

    # =========================================
    # ✅ EGRESOS (Retiros de efectivo)
    # =========================================

    @staticmethod
    def registrar_egreso(db: Session, caja_id: int, monto: float, descripcion: str, operador: str) -> dict:
        """
        Registra un retiro/egreso de efectivo de la caja actual
        """
        from app.modelos.egreso_caja import EgresoCaja
        
        caja = db.query(Caja).filter(Caja.id == caja_id, Caja.estado == EstadoCaja.ABIERTA).first()
        if not caja:
            raise ValueError("No hay una caja abierta o la caja no existe")
        
        if monto <= 0:
            raise ValueError("El monto debe ser mayor a 0")
        
        # Verificar que haya suficiente efectivo
        totales = CajaService.obtener_totales_desde_caja(db, caja.id, caja.fecha_apertura)
        saldo_actual = float(caja.monto_inicial) + totales["total_ingresos"]
        
        # Obtener egresos ya registrados
        egresos_previos = db.query(func.sum(EgresoCaja.monto)).filter(
            EgresoCaja.caja_id == caja_id
        ).scalar() or 0
        
        saldo_disponible = saldo_actual - float(egresos_previos)
        
        if monto > saldo_disponible:
            raise ValueError(f"Saldo insuficiente. Disponible: ${saldo_disponible:.2f}")
        
        egreso = EgresoCaja(
            caja_id=caja_id,
            monto=monto,
            descripcion=descripcion,
            operador=operador,
            fecha=datetime.now()
        )
        
        db.add(egreso)
        db.commit()
        db.refresh(egreso)
        
        print(f"💰 Egreso registrado - Caja: {caja_id}, Monto: -${monto:.2f}, Motivo: {descripcion}, Operador: {operador}")
        
        return egreso.to_dict()

    @staticmethod
    def obtener_egresos_caja(db: Session, caja_id: int) -> list:
        """Obtiene todos los egresos de una caja"""
        from app.modelos.egreso_caja import EgresoCaja
        
        egresos = db.query(EgresoCaja).filter(
            EgresoCaja.caja_id == caja_id
        ).order_by(EgresoCaja.fecha.desc()).all()
        
        return [e.to_dict() for e in egresos]

    @staticmethod
    def obtener_totales_con_egresos(db: Session, caja_id: int, fecha_apertura: datetime) -> dict:
        """Obtiene totales incluyendo egresos"""
        from app.modelos.egreso_caja import EgresoCaja
        
        # Obtener totales de ingresos
        totales = CajaService.obtener_totales_desde_caja(db, caja_id, fecha_apertura)
        
        # Obtener total de egresos
        total_egresos = db.query(
            func.sum(EgresoCaja.monto)
        ).filter(
            EgresoCaja.caja_id == caja_id
        ).scalar() or 0
        
        # Saldo neto = ingresos - egresos
        saldo_neto = totales["total_ingresos"] - float(total_egresos)
        
        return {
            **totales,
            "total_egresos": float(total_egresos),
            "saldo_neto": saldo_neto,
        }

    # =========================
    # Movimientos del día
    # =========================

    @staticmethod
    def obtener_movimientos_dia(db: Session) -> dict:
        """
        Obtiene todos los movimientos de la caja actual 
        (parqueo, servicios, manuales, egresos)
        """
        caja = CajaService.verificar_caja_abierta(db)
        movimientos = []
        
        # Si no hay caja abierta, devolver lista vacía
        if not caja:
            return {
                "movimientos": [],
                "total_efectivo": 0.0,
                "total_tarjeta": 0.0,
                "total_egresos": 0.0,
                "saldo_neto": 0.0,
                "total_movimientos": 0
            }
        
        fecha_apertura = caja.fecha_apertura

        # =========================================
        # ✅ PARQUEO - TODOS (efectivo y tarjeta)
        # =========================================
        facturas = db.query(HistorialFactura).filter(
            and_(
                HistorialFactura.fecha_hora_salida >= fecha_apertura,
                HistorialFactura.es_no_pagado == False
            )
        ).order_by(HistorialFactura.fecha_hora_salida.desc()).all()

        for f in facturas:
            metodo_pago = getattr(f, 'metodo_pago', 'efectivo')
            movimientos.append({
                "id": f"parqueo-{f.id}",
                "tipo": "parqueo",
                "descripcion": f"Parqueo {f.placa}",
                "monto": float(f.costo_total),
                "metodo_pago": metodo_pago,
                "fecha": f.fecha_hora_salida.isoformat(),
                "suma_a_caja": metodo_pago == "efectivo"
            })

        # =========================================
        # ✅ SERVICIOS - TODOS (efectivo y tarjeta)
        # =========================================
        ventas = db.query(VentaServicio).filter(
            VentaServicio.fecha >= fecha_apertura
        ).order_by(VentaServicio.fecha.desc()).all()

        for v in ventas:
            nombres = ", ".join(i.nombre_producto for i in v.items) if v.items else "Servicio"
            movimientos.append({
                "id": f"servicio-{v.id}",
                "tipo": "servicio",
                "descripcion": nombres,
                "monto": float(v.total),
                "metodo_pago": v.metodo_pago or "efectivo",
                "fecha": v.fecha.isoformat(),
                "suma_a_caja": v.metodo_pago != "tarjeta"
            })

        # =========================================
        # ✅ MANUALES - TODOS (siempre suman a caja)
        # =========================================
        try:
            manuales = db.query(MovimientoManualCaja).filter(
                MovimientoManualCaja.caja_id == caja.id
            ).order_by(MovimientoManualCaja.fecha.desc()).all()

            for m in manuales:
                mov_dict = m.to_dict()
                mov_dict["suma_a_caja"] = True
                movimientos.append(mov_dict)
        except:
            pass

        # =========================================
        # ✅ EGRESOS - TODOS (siempre restan de caja)
        # =========================================
        try:
            egresos = CajaService.obtener_egresos_caja(db, caja.id)
            for e in egresos:
                e["suma_a_caja"] = False  # No suma, resta
                e["monto"] = -abs(e["monto"])  # Monto negativo
                movimientos.append(e)
        except:
            pass

        # Ordenar por fecha, más reciente primero
        movimientos.sort(key=lambda x: x["fecha"], reverse=True)
        
        # Calcular totales
        total_efectivo = sum(m["monto"] for m in movimientos 
                           if m.get("suma_a_caja") == True and m["monto"] > 0)
        total_tarjeta = sum(m["monto"] for m in movimientos 
                          if m.get("metodo_pago") == "tarjeta")
        total_egresos = abs(sum(m["monto"] for m in movimientos 
                              if m.get("tipo") == "egreso"))
        saldo_neto = total_efectivo - total_egresos

        return {
            "movimientos": movimientos,
            "total_efectivo": total_efectivo,
            "total_tarjeta": total_tarjeta,
            "total_egresos": total_egresos,
            "saldo_neto": saldo_neto,
            "total_movimientos": len(movimientos),
        }