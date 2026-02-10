# app/servicios/venta_servicio_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from app.modelos.venta_servicio import VentaServicio, ItemVentaServicio
from app.servicios.producto_service import ProductoService
from typing import List, Optional

# Precio fijo del baño por persona
PRECIO_BANO = 0.25


class VentaServicioService:
    """Servicio para manejar ventas de servicios (bebidas, snacks, baño, hotel)"""

    @staticmethod
    def crear_venta(db: Session, items_data: List[dict], metodo_pago: str = "efectivo") -> VentaServicio:
        """
        Crear nueva venta. Soporta tres tipos de items:
        - Producto del catálogo: { producto_id, cantidad }
        - Baño: { tipo_especial: "bano", personas }
        - Hotel: { tipo_especial: "hotel", habitacion, monto_hotel }
        """
        items_validados = []
        total_venta = 0.0

        for item_data in items_data:
            tipo_especial = item_data.get("tipo_especial")

            # ── BAÑO ──────────────────────────────────────────────
            if tipo_especial == "bano":
                personas = item_data.get("personas", 1)
                subtotal = PRECIO_BANO * personas
                total_venta += subtotal
                items_validados.append({
                    "tipo_item": "bano",
                    "producto_id": None,
                    "nombre": f"Uso de baño ({personas} persona{'s' if personas != 1 else ''})",
                    "cantidad": personas,
                    "precio_unitario": PRECIO_BANO,
                    "subtotal": subtotal,
                    "habitacion": None,
                })

            # ── HOTEL ─────────────────────────────────────────────
            elif tipo_especial == "hotel":
                habitacion = item_data.get("habitacion")
                monto = float(item_data.get("monto_hotel", 0))
                subtotal = monto
                total_venta += subtotal
                items_validados.append({
                    "tipo_item": "hotel",
                    "producto_id": None,
                    "nombre": f"Habitación {habitacion}",
                    "cantidad": 1,
                    "precio_unitario": monto,
                    "subtotal": subtotal,
                    "habitacion": habitacion,
                })

            # ── PRODUCTO DEL CATÁLOGO ─────────────────────────────
            else:
                producto_id = item_data.get("producto_id")
                cantidad = item_data.get("cantidad", 1)

                producto = ProductoService.obtener_por_id(db, producto_id)
                if not producto:
                    raise ValueError(f"Producto con ID {producto_id} no encontrado")
                if not producto.activo:
                    raise ValueError(f"Producto '{producto.nombre}' no está disponible")
                if producto.stock < cantidad:
                    raise ValueError(
                        f"Stock insuficiente para '{producto.nombre}'. "
                        f"Disponible: {producto.stock}, solicitado: {cantidad}"
                    )

                subtotal = float(producto.precio) * cantidad
                total_venta += subtotal
                items_validados.append({
                    "tipo_item": "producto",
                    "producto_id": producto.id,
                    "producto_obj": producto,  # para descontar stock después
                    "nombre": producto.nombre,
                    "cantidad": cantidad,
                    "precio_unitario": float(producto.precio),
                    "subtotal": subtotal,
                    "habitacion": None,
                })

        # ── Crear venta ───────────────────────────────────────────
        venta = VentaServicio(
            total=total_venta,
            fecha=datetime.now(),
            metodo_pago=metodo_pago,
        )
        db.add(venta)
        db.flush()  # obtener ID

        # ── Crear items y descontar stock ─────────────────────────
        for iv in items_validados:
            item = ItemVentaServicio(
                venta_id=venta.id,
                producto_id=iv["producto_id"],
                tipo_item=iv["tipo_item"],
                nombre_producto=iv["nombre"],
                cantidad=iv["cantidad"],
                precio_unitario=iv["precio_unitario"],
                subtotal=iv["subtotal"],
                habitacion=iv["habitacion"],
            )
            db.add(item)

            # Solo descontar stock a productos del catálogo
            if iv["tipo_item"] == "producto":
                iv["producto_obj"].stock -= iv["cantidad"]

        db.commit()
        db.refresh(venta)
        return venta

    # ── Consultas ─────────────────────────────────────────────────────

    @staticmethod
    def obtener_ventas(
        db: Session,
        fecha: Optional[str] = None,
        limite: int = 50
    ) -> List[VentaServicio]:
        query = db.query(VentaServicio)

        if fecha:
            try:
                fecha_obj = datetime.strptime(fecha, "%Y-%m-%d").date()
                inicio = datetime.combine(fecha_obj, datetime.min.time())
                fin = datetime.combine(fecha_obj + timedelta(days=1), datetime.min.time())
                query = query.filter(
                    and_(VentaServicio.fecha >= inicio, VentaServicio.fecha < fin)
                )
            except ValueError:
                pass

        return query.order_by(VentaServicio.fecha.desc()).limit(limite).all()

    @staticmethod
    def obtener_venta_por_id(db: Session, venta_id: int) -> Optional[VentaServicio]:
        return db.query(VentaServicio).filter(VentaServicio.id == venta_id).first()

    @staticmethod
    def obtener_reporte_diario(db: Session, fecha: Optional[str] = None) -> dict:
        """Reporte del día con desglose por método de pago y categoría"""
        if fecha:
            fecha_obj = datetime.strptime(fecha, "%Y-%m-%d").date()
        else:
            fecha_obj = date.today()

        inicio = datetime.combine(fecha_obj, datetime.min.time())
        fin = datetime.combine(fecha_obj + timedelta(days=1), datetime.min.time())

        filtro_dia = and_(VentaServicio.fecha >= inicio, VentaServicio.fecha < fin)

        # Totales generales
        res = db.query(
            func.count(VentaServicio.id).label("total_tickets"),
            func.sum(VentaServicio.total).label("total_ventas"),
        ).filter(filtro_dia).first()

        total_tickets = res.total_tickets or 0
        total_ventas = float(res.total_ventas or 0)

        # Por método de pago
        res_efectivo = db.query(
            func.sum(VentaServicio.total)
        ).filter(filtro_dia, VentaServicio.metodo_pago == "efectivo").scalar() or 0

        res_tarjeta = db.query(
            func.sum(VentaServicio.total)
        ).filter(filtro_dia, VentaServicio.metodo_pago == "tarjeta").scalar() or 0

        # Total productos vendidos (solo items de catálogo)
        total_productos = (
            db.query(func.sum(ItemVentaServicio.cantidad))
            .join(VentaServicio)
            .filter(filtro_dia, ItemVentaServicio.tipo_item == "producto")
            .scalar() or 0
        )

        # Ventas por categoría (bebidas, snacks, baño, hotel)
        from app.modelos.producto import Producto

        ventas_bebidas = (
            db.query(func.sum(ItemVentaServicio.subtotal))
            .join(Producto, ItemVentaServicio.producto_id == Producto.id)
            .join(VentaServicio)
            .filter(filtro_dia, Producto.categoria == "bebidas")
            .scalar() or 0
        )

        ventas_snacks = (
            db.query(func.sum(ItemVentaServicio.subtotal))
            .join(Producto, ItemVentaServicio.producto_id == Producto.id)
            .join(VentaServicio)
            .filter(filtro_dia, Producto.categoria == "snacks")
            .scalar() or 0
        )

        ventas_bano = (
            db.query(func.sum(ItemVentaServicio.subtotal))
            .join(VentaServicio)
            .filter(filtro_dia, ItemVentaServicio.tipo_item == "bano")
            .scalar() or 0
        )

        ventas_hotel = (
            db.query(func.sum(ItemVentaServicio.subtotal))
            .join(VentaServicio)
            .filter(filtro_dia, ItemVentaServicio.tipo_item == "hotel")
            .scalar() or 0
        )

        return {
            "fecha": fecha_obj.isoformat(),
            "total_ventas": total_ventas,
            "total_efectivo": float(res_efectivo),
            "total_tarjeta": float(res_tarjeta),
            "cantidad_tickets": total_tickets,
            "total_productos_vendidos": int(total_productos),
            "ventas_por_categoria": {
                "bebidas": float(ventas_bebidas),
                "snacks": float(ventas_snacks),
                "bano": float(ventas_bano),
                "hotel": float(ventas_hotel),
            },
        }