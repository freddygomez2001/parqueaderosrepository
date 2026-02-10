# app/servicios/venta_servicio_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from app.modelos.venta_servicio import VentaServicio, ItemVentaServicio
from app.servicios.producto_service import ProductoService
from typing import List, Optional

class VentaServicioService:
    """Servicio para manejar ventas de servicios"""
    
    @staticmethod
    def crear_venta(db: Session, items_data: List[dict]) -> VentaServicio:
        """Crear nueva venta de servicios"""
        # Validar y obtener productos
        items_validados = []
        total_venta = 0
        
        for item_data in items_data:
            producto = ProductoService.obtener_por_id(db, item_data['producto_id'])
            
            if not producto:
                raise ValueError(f"Producto con ID {item_data['producto_id']} no encontrado")
            
            if not producto.activo:
                raise ValueError(f"Producto {producto.nombre} no está disponible")
            
            cantidad = item_data['cantidad']
            
            if producto.stock < cantidad:
                raise ValueError(f"Stock insuficiente para {producto.nombre}. Disponible: {producto.stock}")
            
            subtotal = float(producto.precio) * cantidad
            total_venta += subtotal
            
            items_validados.append({
                'producto': producto,
                'cantidad': cantidad,
                'subtotal': subtotal
            })
        
        # Crear venta
        venta = VentaServicio(
            total=total_venta,
            fecha=datetime.now()
        )
        
        db.add(venta)
        db.flush()  # Para obtener el ID de la venta
        
        # Crear items y descontar stock
        for item_validado in items_validados:
            producto = item_validado['producto']
            cantidad = item_validado['cantidad']
            
            item = ItemVentaServicio(
                venta_id=venta.id,
                producto_id=producto.id,
                nombre_producto=producto.nombre,
                cantidad=cantidad,
                precio_unitario=producto.precio,
                subtotal=item_validado['subtotal']
            )
            
            db.add(item)
            
            # Descontar stock
            producto.stock -= cantidad
        
        db.commit()
        db.refresh(venta)
        
        return venta
    
    @staticmethod
    def obtener_ventas(db: Session, fecha: Optional[str] = None, limite: int = 50) -> List[VentaServicio]:
        """Obtener ventas con filtros opcionales"""
        query = db.query(VentaServicio)
        
        if fecha:
            try:
                fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
                inicio_dia = datetime.combine(fecha_obj, datetime.min.time())
                fin_dia = datetime.combine(fecha_obj + timedelta(days=1), datetime.min.time())
                query = query.filter(
                    and_(
                        VentaServicio.fecha >= inicio_dia,
                        VentaServicio.fecha < fin_dia
                    )
                )
            except ValueError:
                pass
        
        return query.order_by(VentaServicio.fecha.desc()).limit(limite).all()
    
    @staticmethod
    def obtener_venta_por_id(db: Session, venta_id: int) -> Optional[VentaServicio]:
        """Obtener venta por ID"""
        return db.query(VentaServicio).filter(VentaServicio.id == venta_id).first()
    
    @staticmethod
    def obtener_reporte_diario(db: Session, fecha: Optional[str] = None) -> dict:
        """Obtener reporte de ventas del día"""
        if fecha:
            fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
        else:
            fecha_obj = date.today()
        
        inicio_dia = datetime.combine(fecha_obj, datetime.min.time())
        fin_dia = datetime.combine(fecha_obj + timedelta(days=1), datetime.min.time())
        
        # Total de ventas
        resultado = db.query(
            func.count(VentaServicio.id).label('total_tickets'),
            func.sum(VentaServicio.total).label('total_ventas')
        ).filter(
            and_(
                VentaServicio.fecha >= inicio_dia,
                VentaServicio.fecha < fin_dia
            )
        ).first()
        
        total_tickets = resultado.total_tickets or 0
        total_ventas = float(resultado.total_ventas or 0)
        
        # Total de productos vendidos
        total_productos = db.query(
            func.sum(ItemVentaServicio.cantidad)
        ).join(VentaServicio).filter(
            and_(
                VentaServicio.fecha >= inicio_dia,
                VentaServicio.fecha < fin_dia
            )
        ).scalar() or 0
        
        # Ventas por categoría
        from app.modelos.producto import Producto
        
        ventas_bebidas = db.query(
            func.sum(ItemVentaServicio.subtotal)
        ).join(Producto, ItemVentaServicio.producto_id == Producto.id).join(
            VentaServicio
        ).filter(
            and_(
                VentaServicio.fecha >= inicio_dia,
                VentaServicio.fecha < fin_dia,
                Producto.categoria == 'bebidas'
            )
        ).scalar() or 0
        
        ventas_snacks = db.query(
            func.sum(ItemVentaServicio.subtotal)
        ).join(Producto, ItemVentaServicio.producto_id == Producto.id).join(
            VentaServicio
        ).filter(
            and_(
                VentaServicio.fecha >= inicio_dia,
                VentaServicio.fecha < fin_dia,
                Producto.categoria == 'snacks'
            )
        ).scalar() or 0
        
        return {
            'fecha': fecha_obj.isoformat(),
            'total_ventas': total_ventas,
            'cantidad_tickets': total_tickets,
            'total_productos_vendidos': int(total_productos),
            'ventas_por_categoria': {
                'bebidas': float(ventas_bebidas),
                'snacks': float(ventas_snacks)
            }
        }