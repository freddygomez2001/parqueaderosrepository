# app/modelos/egreso_caja.py
from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey, Text, String
from sqlalchemy.orm import relationship
from datetime import datetime
from app.config import Base

class EgresoCaja(Base):
    """Modelo para retiros/egresos de efectivo de la caja"""
    __tablename__ = 'egresos_caja'
    
    id = Column(Integer, primary_key=True, index=True)
    caja_id = Column(Integer, ForeignKey('cajas.id'), nullable=False, index=True)
    monto = Column(Numeric(10, 2), nullable=False)
    descripcion = Column(Text, nullable=False)
    operador = Column(String(100), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relación con caja
    caja = relationship("Caja", back_populates="egresos")
    
    def to_dict(self):
        return {
            'id': f"egreso-{self.id}",
            'tipo': 'egreso',
            'descripcion': self.descripcion,
            'monto': float(self.monto),
            'operador': self.operador,
            'fecha': self.fecha.isoformat(),
            'caja_id': self.caja_id
        }