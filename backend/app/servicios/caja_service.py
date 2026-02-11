# app/servicios/caja_service.py

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from typing import Optional

from app.modelos.caja import Caja, EstadoCaja
from app.modelos.historial_factura import HistorialFactura
from app.modelos.venta_servicio import VentaServicio
from app.modelos.movimiento_manual import MovimientoManualCaja


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
        
        # Parqueo desde la apertura de esta caja
        total_parqueo = db.query(
            func.sum(HistorialFactura.costo_total)
        ).filter(
            and_(
                HistorialFactura.fecha_hora_salida >= fecha_apertura,
                HistorialFactura.es_no_pagado == False
            )
        ).scalar() or 0

        # Servicios efectivo desde la apertura de esta caja
        total_servicios_efectivo = db.query(
            func.sum(VentaServicio.total)
        ).filter(
            and_(
                VentaServicio.fecha >= fecha_apertura,
                VentaServicio.metodo_pago != "tarjeta"
            )
        ).scalar() or 0

        total_servicios_tarjeta = db.query(
            func.sum(VentaServicio.total)
        ).filter(
            and_(
                VentaServicio.fecha >= fecha_apertura,
                VentaServicio.metodo_pago == "tarjeta"
            )
        ).scalar() or 0

        # Manuales para esta caja específica (solo si la tabla existe)
        try:
            total_manuales = db.query(
                func.sum(MovimientoManualCaja.monto)
            ).filter(
                MovimientoManualCaja.caja_id == caja_id
            ).scalar() or 0
        except:
            # Si la tabla no existe aún, no hay manuales
            total_manuales = 0

        total_ingresos = float(total_parqueo) + float(total_servicios_efectivo) + float(total_manuales)

        return {
            "total_parqueo": float(total_parqueo),
            "total_servicios": float(total_servicios_efectivo),
            "total_servicios_tarjeta": float(total_servicios_tarjeta),
            "total_manuales": float(total_manuales),
            "total_ingresos": total_ingresos,
        }

    @staticmethod
    def abrir_caja(db: Session, monto_inicial: float, operador: str, notas: Optional[str] = None) -> Caja:
        if CajaService.verificar_caja_abierta(db):
            raise ValueError("Ya existe una caja abierta")

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
        return caja

    @staticmethod
    def cerrar_caja(db: Session, monto_final: float, operador: Optional[str] = None, notas: Optional[str] = None) -> Caja:
        caja = CajaService.verificar_caja_abierta(db)
        if not caja:
            raise ValueError("No hay una caja abierta")

        totales = CajaService.obtener_totales_desde_caja(db, caja.id, caja.fecha_apertura)
        monto_esperado = float(caja.monto_inicial) + totales["total_ingresos"]

        caja.monto_final = monto_final
        caja.fecha_cierre = datetime.now()
        caja.operador_cierre = operador or caja.operador_apertura
        caja.total_parqueo = totales["total_parqueo"]
        caja.total_servicios = totales["total_servicios"]
        caja.total_ingresos = totales["total_ingresos"]
        caja.monto_esperado = monto_esperado
        caja.diferencia = monto_final - monto_esperado
        caja.estado = EstadoCaja.CERRADA
        caja.notas_cierre = notas

        db.commit()
        db.refresh(caja)
        return caja

    # =========================
    # Totales y estado
    # =========================

    @staticmethod
    def obtener_estado_caja(db: Session) -> dict:
        caja = CajaService.verificar_caja_abierta(db)
        
        # Si no hay caja abierta, devolver estructura vacía
        if not caja:
            return {
                "caja_abierta": False,
                "caja_actual": None,
                "total_dia_parqueo": 0.0,
                "total_dia_servicios": 0.0,
                "total_dia_servicios_tarjeta": 0.0,
                "total_dia_manuales": 0.0,
                "total_dia_total": 0.0,
                "monto_esperado": 0.0,
            }
        
        # Si hay caja abierta, calcular totales DESDE ESA CAJA
        totales = CajaService.obtener_totales_desde_caja(db, caja.id, caja.fecha_apertura)
        monto_esperado = float(caja.monto_inicial) + totales["total_ingresos"]

        return {
            "caja_abierta": True,
            "caja_actual": caja.to_dict(),
            "total_dia_parqueo": totales["total_parqueo"],
            "total_dia_servicios": totales["total_servicios"],
            "total_dia_servicios_tarjeta": totales["total_servicios_tarjeta"],
            "total_dia_manuales": totales["total_manuales"],
            "total_dia_total": totales["total_ingresos"],
            "monto_esperado": monto_esperado,
        }

    # =========================
    # Movimientos manuales
    # =========================

    @staticmethod
    def agregar_efectivo(db: Session, monto: float, descripcion: str, operador: str) -> dict:
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
        return movimiento.to_dict()

    # =========================
    # Movimientos del día
    # =========================

    @staticmethod
    def obtener_movimientos_dia(db: Session) -> list:
        caja = CajaService.verificar_caja_abierta(db)
        movimientos = []
        
        # Si no hay caja abierta, devolver lista vacía
        if not caja:
            return movimientos
        
        # Solo obtener movimientos DESDE la apertura de esta caja
        fecha_apertura = caja.fecha_apertura

        # Parqueo desde la apertura
        facturas = db.query(HistorialFactura).filter(
            and_(
                HistorialFactura.fecha_hora_salida >= fecha_apertura,
                HistorialFactura.es_no_pagado == False
            )
        ).order_by(HistorialFactura.fecha_hora_salida.desc()).all()

        for f in facturas:
            movimientos.append({
                "id": f"parqueo-{f.id}",
                "tipo": "parqueo",
                "descripcion": f"Parqueo {f.placa}",
                "monto": float(f.costo_total),
                "fecha": f.fecha_hora_salida.isoformat()
            })

        # Servicios desde la apertura
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
                "fecha": v.fecha.isoformat()
            })

        # Manuales para esta caja específica
        try:
            manuales = db.query(MovimientoManualCaja).filter(
                MovimientoManualCaja.caja_id == caja.id
            ).order_by(MovimientoManualCaja.fecha.desc()).all()

            for m in manuales:
                movimientos.append(m.to_dict())
        except:
            # Si la tabla no existe, no hay manuales
            pass

        movimientos.sort(key=lambda x: x["fecha"], reverse=True)
        return movimientos