# app/servicios/caja_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from app.modelos.caja import Caja, EstadoCaja
from app.modelos.historial_factura import HistorialFactura
from app.modelos.venta_servicio import VentaServicio
from typing import Optional

class CajaService:
    """Servicio para manejar operaciones de caja"""
    
    @staticmethod
    def verificar_caja_abierta(db: Session) -> Optional[Caja]:
        """Verificar si hay una caja abierta hoy"""
        hoy = date.today()
        inicio_dia = datetime.combine(hoy, datetime.min.time())
        fin_dia = datetime.combine(hoy + timedelta(days=1), datetime.min.time())
        
        caja_abierta = db.query(Caja).filter(
            and_(
                Caja.estado == EstadoCaja.ABIERTA,
                Caja.fecha_apertura >= inicio_dia,
                Caja.fecha_apertura < fin_dia
            )
        ).first()
        
        return caja_abierta
    
    @staticmethod
    def abrir_caja(db: Session, monto_inicial: float, operador: str, notas: Optional[str] = None) -> Caja:
        """Abrir una nueva caja"""
        # Verificar que no haya una caja abierta
        caja_existente = CajaService.verificar_caja_abierta(db)
        
        if caja_existente:
            raise ValueError("Ya existe una caja abierta. Debe cerrarla antes de abrir una nueva.")
        
        # Crear nueva caja
        nueva_caja = Caja(
            monto_inicial=monto_inicial,
            fecha_apertura=datetime.now(),
            operador_apertura=operador,
            estado=EstadoCaja.ABIERTA,
            notas_apertura=notas,
            total_parqueo=0,
            total_servicios=0,
            total_ingresos=0
        )
        
        db.add(nueva_caja)
        db.commit()
        db.refresh(nueva_caja)
        
        return nueva_caja
    
    @staticmethod
    def obtener_totales_dia(db: Session) -> dict:
        """Obtener totales del día actual"""
        hoy = date.today()
        inicio_dia = datetime.combine(hoy, datetime.min.time())
        fin_dia = datetime.combine(hoy + timedelta(days=1), datetime.min.time())
        
        # Total parqueo (solo pagados)
        total_parqueo = db.query(
            func.sum(HistorialFactura.costo_total)
        ).filter(
            and_(
                HistorialFactura.fecha_hora_salida >= inicio_dia,
                HistorialFactura.fecha_hora_salida < fin_dia,
                HistorialFactura.es_no_pagado == False
            )
        ).scalar() or 0
        
        # Total servicios
        total_servicios = db.query(
            func.sum(VentaServicio.total)
        ).filter(
            and_(
                VentaServicio.fecha >= inicio_dia,
                VentaServicio.fecha < fin_dia
            )
        ).scalar() or 0
        
        return {
            'total_parqueo': float(total_parqueo),
            'total_servicios': float(total_servicios),
            'total_ingresos': float(total_parqueo + total_servicios)
        }
    
    @staticmethod
    def obtener_estado_caja(db: Session) -> dict:
        """Obtener estado actual de la caja"""
        caja_actual = CajaService.verificar_caja_abierta(db)
        totales = CajaService.obtener_totales_dia(db)
        
        monto_esperado = 0
        if caja_actual:
            monto_esperado = float(caja_actual.monto_inicial) + totales['total_ingresos']
        
        return {
            'caja_abierta': caja_actual is not None,
            'caja_actual': caja_actual.to_dict() if caja_actual else None,
            'total_dia_parqueo': totales['total_parqueo'],
            'total_dia_servicios': totales['total_servicios'],
            'total_dia_total': totales['total_ingresos'],
            'monto_esperado': monto_esperado
        }
    
    @staticmethod
    def cerrar_caja(db: Session, monto_final: float, operador: Optional[str] = None, notas: Optional[str] = None) -> Caja:
        """Cerrar la caja actual"""
        caja_actual = CajaService.verificar_caja_abierta(db)
        
        if not caja_actual:
            raise ValueError("No hay una caja abierta para cerrar")
        
        # Obtener totales del día
        totales = CajaService.obtener_totales_dia(db)
        
        # Calcular monto esperado y diferencia
        monto_esperado = float(caja_actual.monto_inicial) + totales['total_ingresos']
        diferencia = monto_final - monto_esperado
        
        # Actualizar caja
        caja_actual.monto_final = monto_final
        caja_actual.fecha_cierre = datetime.now()
        caja_actual.operador_cierre = operador or caja_actual.operador_apertura
        caja_actual.total_parqueo = totales['total_parqueo']
        caja_actual.total_servicios = totales['total_servicios']
        caja_actual.total_ingresos = totales['total_ingresos']
        caja_actual.monto_esperado = monto_esperado
        caja_actual.diferencia = diferencia
        caja_actual.estado = EstadoCaja.CERRADA
        caja_actual.notas_cierre = notas
        
        db.commit()
        db.refresh(caja_actual)
        
        return caja_actual
    
    @staticmethod
    def obtener_resumen_caja(db: Session) -> dict:
        """Obtener resumen de la caja actual"""
        caja_actual = CajaService.verificar_caja_abierta(db)
        
        if not caja_actual:
            raise ValueError("No hay una caja abierta")
        
        totales = CajaService.obtener_totales_dia(db)
        monto_esperado = float(caja_actual.monto_inicial) + totales['total_ingresos']
        
        return {
            'monto_inicial': float(caja_actual.monto_inicial),
            'ingresos_parqueo': totales['total_parqueo'],
            'ingresos_servicios': totales['total_servicios'],
            'total_ingresos': totales['total_ingresos'],
            'monto_esperado': monto_esperado,
            'diferencia': None,
            'monto_final': None
        }
    
    @staticmethod
    def obtener_historial_cajas(db: Session, limite: int = 30) -> list:
        """Obtener historial de cajas cerradas"""
        cajas = db.query(Caja).filter(
            Caja.estado == EstadoCaja.CERRADA
        ).order_by(Caja.fecha_cierre.desc()).limit(limite).all()
        
        return [caja.to_dict() for caja in cajas]