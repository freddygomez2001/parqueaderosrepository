from sqlalchemy import Column, Integer, String, Numeric, DateTime, Enum, CheckConstraint, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.config import Base

class VehiculoEstacionado(Base):
    """Modelo para vehículos estacionados"""
    __tablename__ = 'vehiculos_estacionados'
    
    id = Column(Integer, primary_key=True, index=True)
    placa = Column(String(20), nullable=False, index=True)
    espacio_numero = Column(Integer, nullable=False, index=True)
    fecha_hora_entrada = Column(DateTime, nullable=False, default=datetime.now)
    fecha_hora_salida = Column(DateTime, nullable=True)
    costo_total = Column(Numeric(10, 2), nullable=True)
    estado = Column(Enum('activo', 'finalizado', name='estado_vehiculo'), default='activo', index=True)
    es_nocturno = Column(Boolean, default=False, nullable=False, index=True)
    es_no_pagado = Column(Boolean, default=False, nullable=False, index=True) # ✅ NUEVO
    creado_en = Column(DateTime, default=datetime.now)

    # Relación con facturas
    factura = relationship("HistorialFactura", back_populates="vehiculo", uselist=False)

    __table_args__ = (
        CheckConstraint('espacio_numero >= 1 AND espacio_numero <= 24', name='check_espacio_valido'),
    )

    def to_dict(self):
        """Convertir el modelo a diccionario"""
        return {
            'id': self.id,
            'placa': self.placa,
            'espacio_numero': self.espacio_numero,
            'fecha_hora_entrada': self.fecha_hora_entrada.isoformat() if self.fecha_hora_entrada else None,
            'fecha_hora_salida': self.fecha_hora_salida.isoformat() if self.fecha_hora_salida else None,
            'costo_total': float(self.costo_total) if self.costo_total else None,
            'estado': self.estado,
            'es_nocturno': self.es_nocturno,
            'es_no_pagado': self.es_no_pagado, # ✅ NUEVO
            'creado_en': self.creado_en.isoformat() if self.creado_en else None
        }