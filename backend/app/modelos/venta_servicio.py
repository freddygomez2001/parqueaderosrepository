# app/modelos/venta_servicio.py
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.config import Base


class VentaServicio(Base):
    """Modelo para registrar ventas de servicios (bebidas, snacks, baño, hotel)"""
    __tablename__ = 'ventas_servicios'

    id = Column(Integer, primary_key=True, index=True)
    total = Column(Numeric(10, 2), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow, index=True)
    metodo_pago = Column(String(20), default="efectivo")  # "efectivo" | "tarjeta"
    detalles = Column(Text)  # JSON adicional si se necesita

    # Relación con items
    items = relationship(
        "ItemVentaServicio",
        back_populates="venta",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            'id': self.id,
            'total': float(self.total),
            'fecha': self.fecha.isoformat() if self.fecha else None,
            'metodo_pago': self.metodo_pago or "efectivo",
            'items': [item.to_dict() for item in self.items] if self.items else []
        }


class ItemVentaServicio(Base):
    """
    Item individual de una venta.
    - Para productos del catálogo: producto_id tiene valor.
    - Para servicios especiales (baño, hotel): producto_id es NULL,
      tipo_item indica el tipo.
    """
    __tablename__ = 'items_venta_servicio'

    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey('ventas_servicios.id'), nullable=False, index=True)

    # NULL para servicios especiales (baño, hotel)
    producto_id = Column(Integer, ForeignKey('productos.id'), nullable=True)

    # "producto" | "bano" | "hotel"
    tipo_item = Column(String(20), nullable=False, default="producto")

    nombre_producto = Column(String(150), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    # Datos extras para hotel
    habitacion = Column(String(50), nullable=True)

    # Relaciones
    venta = relationship("VentaServicio", back_populates="items")
    producto = relationship("Producto", foreign_keys=[producto_id])

    def to_dict(self):
        return {
            'id': self.id,
            'venta_id': self.venta_id,
            'producto_id': self.producto_id,
            'tipo_item': self.tipo_item,
            'nombre': self.nombre_producto,
            'cantidad': self.cantidad,
            'precio_unit': float(self.precio_unitario),
            'subtotal': float(self.subtotal),
            'habitacion': self.habitacion,
        }