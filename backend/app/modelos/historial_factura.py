from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.config import Base

class HistorialFactura(Base):
    """Modelo para el historial de facturas"""
    __tablename__ = 'historial_facturas'
    
    id = Column(Integer, primary_key=True, index=True)
    vehiculo_id = Column(Integer, ForeignKey('vehiculos_estacionados.id'), nullable=False)
    placa = Column(String(20), nullable=False)
    espacio_numero = Column(Integer, nullable=False)
    fecha_hora_entrada = Column(DateTime, nullable=False)
    fecha_hora_salida = Column(DateTime, nullable=False)
    tiempo_total_minutos = Column(Integer, nullable=False)
    costo_total = Column(Numeric(10, 2), nullable=False)
    detalles_cobro = Column(Text)
    fecha_generacion = Column(DateTime, default=datetime.utcnow, index=True)
    es_nocturno = Column(Boolean, default=False, nullable=False)  # ✅ Agregar este campo directamente
    es_no_pagado = Column(Boolean, default=False, nullable=False)  # ✅ NUEVO campo

    # Relación con vehículo
    vehiculo = relationship("VehiculoEstacionado", back_populates="factura")

    def to_dict(self):
        """Convertir el modelo a diccionario"""
        return {
            'id': self.id,
            'vehiculo_id': self.vehiculo_id,
            'placa': self.placa,
            'espacio_numero': self.espacio_numero,
            'fecha_hora_entrada': self.fecha_hora_entrada.isoformat(),
            'fecha_hora_salida': self.fecha_hora_salida.isoformat(),
            'tiempo_total_minutos': self.tiempo_total_minutos,
            'costo_total': float(self.costo_total),
            'detalles_cobro': self.detalles_cobro,
            'fecha_generacion': self.fecha_generacion.isoformat(),
            'es_nocturno': self.es_nocturno,  # ✅ Usar campo directo en lugar de relación
            'es_no_pagado': self.es_no_pagado  # ✅ NUEVO
        }