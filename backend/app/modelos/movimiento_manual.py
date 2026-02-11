# app/modelos/movimiento_manual.py
from sqlalchemy import Column, Integer, Numeric, DateTime, Text, ForeignKey
from datetime import datetime
from app.config import Base

class MovimientoManualCaja(Base):
    __tablename__ = 'movimientos_manuales_caja'
    
    id = Column(Integer, primary_key=True, index=True)
    caja_id = Column(Integer, ForeignKey('cajas.id'), nullable=False, index=True)
    monto = Column(Numeric(10, 2), nullable=False)
    descripcion = Column(Text, nullable=True)
    operador = Column(Text, nullable=False)
    fecha = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            "id": f"manual-{self.id}",
            "tipo": "efectivo_manual",
            "descripcion": self.descripcion or "Efectivo manual",
            "monto": float(self.monto),
            "fecha": self.fecha.isoformat(),
            "operador": self.operador
        }