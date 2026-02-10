# app/modelos/caja.py
from sqlalchemy import Column, Integer, Numeric, DateTime, Text, Enum as SQLEnum
from datetime import datetime
from app.config import Base
import enum

class EstadoCaja(enum.Enum):
    """Estados de la caja"""
    ABIERTA = "abierta"
    CERRADA = "cerrada"

class Caja(Base):
    """Modelo para registro de caja diaria"""
    __tablename__ = 'cajas'
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Apertura
    monto_inicial = Column(Numeric(10, 2), nullable=False, default=0)
    fecha_apertura = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    operador_apertura = Column(Text, nullable=False)  # Nombre del operador que abrió
    
    # Cierre
    monto_final = Column(Numeric(10, 2), nullable=True)
    fecha_cierre = Column(DateTime, nullable=True)
    operador_cierre = Column(Text, nullable=True)
    
    # Totales calculados al cierre
    total_parqueo = Column(Numeric(10, 2), nullable=True, default=0)
    total_servicios = Column(Numeric(10, 2), nullable=True, default=0)
    total_ingresos = Column(Numeric(10, 2), nullable=True, default=0)
    
    # Diferencia (esperado vs real)
    monto_esperado = Column(Numeric(10, 2), nullable=True)
    diferencia = Column(Numeric(10, 2), nullable=True)
    
    # Estado
    estado = Column(SQLEnum(EstadoCaja), nullable=False, default=EstadoCaja.ABIERTA, index=True)
    
    # Notas
    notas_apertura = Column(Text, nullable=True)
    notas_cierre = Column(Text, nullable=True)
    
    def to_dict(self):
        """Convertir el modelo a diccionario"""
        return {
            'id': self.id,
            'monto_inicial': float(self.monto_inicial),
            'fecha_apertura': self.fecha_apertura.isoformat() if self.fecha_apertura else None,
            'operador_apertura': self.operador_apertura,
            'monto_final': float(self.monto_final) if self.monto_final else None,
            'fecha_cierre': self.fecha_cierre.isoformat() if self.fecha_cierre else None,
            'operador_cierre': self.operador_cierre,
            'total_parqueo': float(self.total_parqueo) if self.total_parqueo else 0,
            'total_servicios': float(self.total_servicios) if self.total_servicios else 0,
            'total_ingresos': float(self.total_ingresos) if self.total_ingresos else 0,
            'monto_esperado': float(self.monto_esperado) if self.monto_esperado else None,
            'diferencia': float(self.diferencia) if self.diferencia else None,
            'estado': self.estado.value,
            'notas_apertura': self.notas_apertura,
            'notas_cierre': self.notas_cierre
        }