# app/modelos/venta_servicio.py
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.config import Base

class VentaServicio(Base):
    """Modelo para registrar ventas de servicios (bebidas y snacks)"""
    __tablename__ = 'ventas_servicios'
    
    id = Column(Integer, primary_key=True, index=True)
    total = Column(Numeric(10, 2), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow, index=True)
    detalles = Column(Text)  # JSON con los items vendidos
    
    # Relación con items
    items = relationship("ItemVentaServicio", back_populates="venta", cascade="all, delete-orphan")

    def to_dict(self):
        """Convertir el modelo a diccionario"""
        return {
            'id': self.id,
            'total': float(self.total),
            'fecha': self.fecha.isoformat() if self.fecha else None,
            'items': [item.to_dict() for item in self.items] if self.items else []
        }

class ItemVentaServicio(Base):
    """Modelo para items individuales de una venta"""
    __tablename__ = 'items_venta_servicio'
    
    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey('ventas_servicios.id'), nullable=False, index=True)
    producto_id = Column(Integer, ForeignKey('productos.id'), nullable=False)
    nombre_producto = Column(String(100), nullable=False)  # Guardamos el nombre por si se elimina el producto
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    
    # Relaciones
    venta = relationship("VentaServicio", back_populates="items")
    producto = relationship("Producto")

    def to_dict(self):
        """Convertir el modelo a diccionario"""
        return {
            'id': self.id,
            'venta_id': self.venta_id,
            'producto_id': self.producto_id,
            'nombre': self.nombre_producto,
            'cantidad': self.cantidad,
            'precio_unit': float(self.precio_unitario),
            'subtotal': float(self.subtotal)
        }