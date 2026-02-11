# app/modelos/producto.py
from sqlalchemy import Column, Integer, String, Numeric, Enum as SQLEnum, DateTime
from datetime import datetime
from app.config import Base
import enum

class CategoriaProducto(enum.Enum):
    """Enum para categorías de productos"""
    BEBIDAS = "bebidas"
    SNACKS = "snacks"
    OTROS = "otros"  # 👈 NUEVA CATEGORÍA

class Producto(Base):
    """Modelo para productos del hotel (bebidas, snacks y otros)"""
    __tablename__ = 'productos'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    precio = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    categoria = Column(SQLEnum(CategoriaProducto), nullable=False, index=True)
    activo = Column(Integer, default=1)  # 1 = activo, 0 = inactivo
    creado_en = Column(DateTime, default=datetime.utcnow)
    actualizado_en = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convertir el modelo a diccionario"""
        return {
            'id': self.id,
            'nombre': self.nombre,
            'precio': float(self.precio),
            'stock': self.stock,
            'categoria': self.categoria.value,
            'activo': bool(self.activo),
            'creado_en': self.creado_en.isoformat() if self.creado_en else None,
            'actualizado_en': self.actualizado_en.isoformat() if self.actualizado_en else None
        }