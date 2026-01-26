# app/models/configuracion_model.py
from sqlalchemy import Column, Integer, Numeric, Time, DateTime, Text
from datetime import datetime
from app.config import Base
import json

class ConfiguracionPrecios(Base):
    """Modelo para la configuración de precios por rangos de tiempo"""
    __tablename__ = 'configuracion_precios'
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Precios por rangos específicos (EN CENTAVOS para mayor precisión)
    precio_0_5_min = Column(Numeric(10, 2), nullable=False, default=0.50)  # 0-5 minutos: 50 centavos
    precio_6_30_min = Column(Numeric(10, 2), nullable=False, default=0.75)  # 6-30 minutos: 75 centavos
    precio_31_60_min = Column(Numeric(10, 2), nullable=False, default=1.00) # 31-60 minutos: 1 dólar
    precio_hora_adicional = Column(Numeric(10, 2), nullable=False, default=1.00) # Cada hora adicional: +1 dólar
    
    # Precio nocturno (12 horas)
    precio_nocturno = Column(Numeric(10, 2), nullable=False, default=10.00)
    
    # Configuración de horario nocturno
    hora_inicio_nocturno = Column(Time, nullable=False, default=datetime.strptime("19:00", "%H:%M").time())
    hora_fin_nocturno = Column(Time, nullable=False, default=datetime.strptime("07:00", "%H:%M").time())
    
    # Configuración personalizada de rangos (opcional, en formato JSON)
    rangos_personalizados = Column(Text, nullable=True, default=None)
    
    actualizado_en = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convertir el modelo a diccionario"""
        rangos = None
        if self.rangos_personalizados:
            try:
                rangos = json.loads(self.rangos_personalizados)
            except:
                rangos = []
        
        return {
            'id': self.id,
            'precio_0_5_min': float(self.precio_0_5_min),
            'precio_6_30_min': float(self.precio_6_30_min),
            'precio_31_60_min': float(self.precio_31_60_min),
            'precio_hora_adicional': float(self.precio_hora_adicional),
            'precio_nocturno': float(self.precio_nocturno),
            'hora_inicio_nocturno': str(self.hora_inicio_nocturno),
            'hora_fin_nocturno': str(self.hora_fin_nocturno),
            'rangos_personalizados': rangos,
            'actualizado_en': self.actualizado_en.isoformat() if self.actualizado_en else None
        }