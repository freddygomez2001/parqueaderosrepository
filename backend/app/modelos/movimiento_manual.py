from sqlalchemy import Column, Integer, Numeric, DateTime, Text, ForeignKey
from datetime import datetime
from app.config import Base

class MovimientoManualCaja(Base):
    __tablename__ = 'movimientos_manuales_caja'

    id = Column(Integer, primary_key=True, index=True)
    caja_id = Column(Integer, ForeignKey('cajas.id'), nullable=False, index=True)
    monto = Column(Numeric(10, 2), nullable=False)
    descripcion = Column(Text, nullable=False)
    operador = Column(Text, nullable=False)
    fecha = Column(DateTime, default=datetime.now, nullable=False)

    def to_dict(self):
        return {
            'id': f"manual-{self.id}",
            'tipo': 'efectivo_manual',
            'descripcion': self.descripcion,
            'monto': float(self.monto),
            'operador': self.operador,
            'fecha': self.fecha.isoformat(),
        }