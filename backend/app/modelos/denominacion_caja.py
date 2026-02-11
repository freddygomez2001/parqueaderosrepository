# app/modelos/denominacion_caja.py
from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from datetime import datetime
from app.config import Base

class DenominacionCaja(Base):
    """Modelo para detalle de billetes y monedas en apertura/cierre de caja"""
    __tablename__ = 'denominaciones_caja'
    
    id = Column(Integer, primary_key=True, index=True)
    caja_id = Column(Integer, ForeignKey('cajas.id'), nullable=False, index=True)
    tipo = Column(String(20), nullable=False)  # 'apertura' o 'cierre'
    denominacion = Column(Numeric(10, 2), nullable=False)  # 100, 50, 20, 10, 5, 1, 0.50, 0.25, 0.10, 0.05, 0.01
    cantidad = Column(Integer, nullable=False, default=0)
    subtotal = Column(Numeric(10, 2), nullable=False, default=0)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    
    # Relación con caja
    caja = relationship("Caja", back_populates="denominaciones")
    
    def to_dict(self):
        """Convertir el modelo a diccionario"""
        return {
            'id': self.id,
            'caja_id': self.caja_id,
            'tipo': self.tipo,
            'denominacion': float(self.denominacion),
            'cantidad': self.cantidad,
            'subtotal': float(self.subtotal),
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None
        }