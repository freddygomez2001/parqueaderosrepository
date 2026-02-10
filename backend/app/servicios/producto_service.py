# app/servicios/producto_service.py
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.modelos.producto import Producto, CategoriaProducto
from typing import List, Optional

class ProductoService:
    """Servicio para manejar productos"""
    
    @staticmethod
    def obtener_todos(db: Session, categoria: Optional[str] = None, activos_solo: bool = True) -> List[Producto]:
        """Obtener todos los productos"""
        query = db.query(Producto)
        
        if activos_solo:
            query = query.filter(Producto.activo == 1)
        
        if categoria:
            try:
                cat_enum = CategoriaProducto(categoria)
                query = query.filter(Producto.categoria == cat_enum)
            except ValueError:
                pass
        
        return query.order_by(Producto.nombre).all()
    
    @staticmethod
    def obtener_por_id(db: Session, producto_id: int) -> Optional[Producto]:
        """Obtener producto por ID"""
        return db.query(Producto).filter(Producto.id == producto_id).first()
    
    @staticmethod
    def crear_producto(db: Session, datos: dict) -> Producto:
        """Crear nuevo producto"""
        categoria_enum = CategoriaProducto(datos['categoria'])
        
        producto = Producto(
            nombre=datos['nombre'],
            precio=datos['precio'],
            stock=datos['stock'],
            categoria=categoria_enum,
            activo=1
        )
        
        db.add(producto)
        db.commit()
        db.refresh(producto)
        
        return producto
    
    @staticmethod
    def actualizar_producto(db: Session, producto_id: int, datos: dict) -> Optional[Producto]:
        """Actualizar producto existente"""
        producto = ProductoService.obtener_por_id(db, producto_id)
        
        if not producto:
            return None
        
        if 'nombre' in datos and datos['nombre']:
            producto.nombre = datos['nombre']
        
        if 'precio' in datos and datos['precio'] is not None:
            producto.precio = datos['precio']
        
        if 'stock' in datos and datos['stock'] is not None:
            producto.stock = datos['stock']
        
        if 'categoria' in datos and datos['categoria']:
            producto.categoria = CategoriaProducto(datos['categoria'])
        
        if 'activo' in datos and datos['activo'] is not None:
            producto.activo = 1 if datos['activo'] else 0
        
        db.commit()
        db.refresh(producto)
        
        return producto
    
    @staticmethod
    def actualizar_stock(db: Session, producto_id: int, cantidad: int) -> Optional[Producto]:
        """Actualizar stock de un producto (descontar)"""
        producto = ProductoService.obtener_por_id(db, producto_id)
        
        if not producto:
            return None
        
        if producto.stock < cantidad:
            raise ValueError(f"Stock insuficiente para {producto.nombre}. Disponible: {producto.stock}")
        
        producto.stock -= cantidad
        db.commit()
        db.refresh(producto)
        
        return producto
    
    @staticmethod
    def eliminar_producto(db: Session, producto_id: int) -> bool:
        """Eliminar (desactivar) producto"""
        producto = ProductoService.obtener_por_id(db, producto_id)
        
        if not producto:
            return False
        
        producto.activo = 0
        db.commit()
        
        return True