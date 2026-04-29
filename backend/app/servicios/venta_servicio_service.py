# app/servicios/venta_servicio_service.py
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from decimal import Decimal  # ← IMPORTANTE: Importar Decimal
from app.modelos.venta_servicio import VentaServicio, ItemVentaServicio
from app.servicios.producto_service import ProductoService
from typing import List, Optional

# Precio fijo del baño por persona (usar Decimal)
PRECIO_BANO = Decimal('0.25')  # ← Cambiado a Decimal


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
        total_venta = Decimal('0.00')  # ← Cambiado a Decimal

        for item_data in items_data:
            tipo_especial = item_data.get("tipo_especial")

            # ── BAÑO ──────────────────────────────────────────────
            if tipo_especial == "bano":
                personas = item_data.get("personas", 1)
                subtotal = PRECIO_BANO * Decimal(str(personas))  # ← Convertir a Decimal
                total_venta += subtotal
                items_validados.append({
                    "tipo_item": "bano",
                    "producto_id": None,
                    "nombre": f"Uso de baño ({personas} persona{'s' if personas != 1 else ''})",
                    "cantidad": personas,
                    "precio_unitario": float(PRECIO_BANO),  # Para JSON
                    "subtotal": float(subtotal),  # Para JSON
                    "habitacion": None,
                })

            # ── HOTEL ─────────────────────────────────────────────
            elif tipo_especial == "hotel":
                habitacion = item_data.get("habitacion")
                monto = Decimal(str(item_data.get("monto_hotel", 0)))  # ← Convertir a Decimal
                subtotal = monto
                total_venta += subtotal
                items_validados.append({
                    "tipo_item": "hotel",
                    "producto_id": None,
                    "nombre": f"Habitación {habitacion}",
                    "cantidad": 1,
                    "precio_unitario": float(monto),  # Para JSON
                    "subtotal": float(subtotal),  # Para JSON
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

                # Convertir Decimal de producto a Decimal
                precio_decimal = Decimal(str(producto.precio))
                subtotal = precio_decimal * Decimal(str(cantidad))
                total_venta += subtotal
                
                items_validados.append({
                    "tipo_item": "producto",
                    "producto_id": producto.id,
                    "producto_obj": producto,
                    "nombre": producto.nombre,
                    "cantidad": cantidad,
                    "precio_unitario": float(precio_decimal),  # Para JSON
                    "subtotal": float(subtotal),  # Para JSON
                    "habitacion": None,
                })

        venta = VentaServicio(
            total=float(total_venta),  # ← Guardar como float en DB
            fecha=datetime.now(),
            metodo_pago=metodo_pago,
        )
        db.add(venta)
        db.flush()

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

            if iv["tipo_item"] == "producto":
                iv["producto_obj"].stock -= iv["cantidad"]

        db.commit()
        db.refresh(venta)
        return venta

    @staticmethod
    def obtener_ventas(
        db: Session,
        fecha: Optional[str] = None,
        limite: int = 50
    ) -> List[VentaServicio]:
        query = db.query(VentaServicio).options(joinedload(VentaServicio.items))

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
        return (
            db.query(VentaServicio)
            .options(joinedload(VentaServicio.items))
            .filter(VentaServicio.id == venta_id)
            .first()
        )

    @staticmethod
    def obtener_reporte_por_rango(db: Session, fecha_inicio: date, fecha_fin: date) -> dict:
        """Obtiene reporte completo para un rango de fechas con desglose por categorías, habitaciones y productos"""
        from app.modelos.producto import Producto
        from decimal import Decimal

        inicio = datetime.combine(fecha_inicio, datetime.min.time())
        fin = datetime.combine(fecha_fin + timedelta(days=1), datetime.min.time())

        filtro_fecha = and_(VentaServicio.fecha >= inicio, VentaServicio.fecha < fin)

        ventas = (
            db.query(VentaServicio)
            .options(joinedload(VentaServicio.items))
            .filter(filtro_fecha)
            .all()
        )

        # ✅ INICIALIZAR CON DECIMAL, NO CON FLOAT
        total_ventas = Decimal('0.00')
        total_efectivo = Decimal('0.00')
        total_tarjeta = Decimal('0.00')
        total_transferencia = Decimal('0.00')
        cantidad_tickets = len(ventas)
        total_productos_vendidos = 0

        ventas_por_categoria = {
            "bebidas": Decimal('0.00'),
            "snacks": Decimal('0.00'),
            "otros": Decimal('0.00'),
            "bano": Decimal('0.00'),
            "hotel": Decimal('0.00')
        }

        ventas_por_habitacion = {}
        ventas_por_producto = {}

        for venta in ventas:
            # venta.total puede ser float o Decimal, convertir a Decimal
            total_venta_decimal = Decimal(str(venta.total))
            total_ventas += total_venta_decimal

            if venta.metodo_pago == "efectivo":
                total_efectivo += total_venta_decimal
            elif venta.metodo_pago == "tarjeta":
                total_tarjeta += total_venta_decimal
            elif venta.metodo_pago == "transferencia":
                total_transferencia += total_venta_decimal

            for item in venta.items:
                # Convertir subtotal a Decimal si es necesario
                subtotal_decimal = Decimal(str(item.subtotal))

                if item.tipo_item == "producto":
                    total_productos_vendidos += item.cantidad

                    if item.nombre_producto not in ventas_por_producto:
                        ventas_por_producto[item.nombre_producto] = {
                            "cantidad": 0,
                            "total": Decimal('0.00'),
                            "efectivo": Decimal('0.00'),
                            "tarjeta": Decimal('0.00'),
                            "transferencia": Decimal('0.00')
                        }
                    ventas_por_producto[item.nombre_producto]["cantidad"] += item.cantidad
                    ventas_por_producto[item.nombre_producto]["total"] += subtotal_decimal

                    if venta.metodo_pago == "efectivo":
                        ventas_por_producto[item.nombre_producto]["efectivo"] += subtotal_decimal
                    elif venta.metodo_pago == "tarjeta":
                        ventas_por_producto[item.nombre_producto]["tarjeta"] += subtotal_decimal
                    else:
                        ventas_por_producto[item.nombre_producto]["transferencia"] += subtotal_decimal

                    producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
                    if producto:
                        categoria = producto.categoria
                        if categoria in ventas_por_categoria:
                            ventas_por_categoria[categoria] += subtotal_decimal

                elif item.tipo_item == "bano":
                    ventas_por_categoria["bano"] += subtotal_decimal

                elif item.tipo_item == "hotel":
                    ventas_por_categoria["hotel"] += subtotal_decimal

                    habitacion = item.habitacion
                    if habitacion:
                        if habitacion not in ventas_por_habitacion:
                            ventas_por_habitacion[habitacion] = {
                                "total": Decimal('0.00'),
                                "cantidad": 0,
                                "efectivo": Decimal('0.00'),
                                "tarjeta": Decimal('0.00'),
                                "transferencia": Decimal('0.00')
                            }
                        ventas_por_habitacion[habitacion]["total"] += subtotal_decimal
                        ventas_por_habitacion[habitacion]["cantidad"] += 1

                        if venta.metodo_pago == "efectivo":
                            ventas_por_habitacion[habitacion]["efectivo"] += subtotal_decimal
                        elif venta.metodo_pago == "tarjeta":
                            ventas_por_habitacion[habitacion]["tarjeta"] += subtotal_decimal
                        else:
                            ventas_por_habitacion[habitacion]["transferencia"] += subtotal_decimal

        # ✅ Convertir Decimal a float para JSON al final
        return {
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "total_ventas": float(total_ventas),
            "total_efectivo": float(total_efectivo),
            "total_tarjeta": float(total_tarjeta),
            "total_transferencia": float(total_transferencia),
            "cantidad_tickets": cantidad_tickets,
            "total_productos_vendidos": total_productos_vendidos,
            "ventas_por_categoria": {k: float(v) for k, v in ventas_por_categoria.items()},
            "ventas_por_habitacion": {
                k: {
                    "total": float(v["total"]),
                    "cantidad": v["cantidad"],
                    "efectivo": float(v["efectivo"]),
                    "tarjeta": float(v["tarjeta"]),
                    "transferencia": float(v["transferencia"])
                }
                for k, v in ventas_por_habitacion.items()
            },
            "ventas_por_producto": {
                k: {
                    "cantidad": v["cantidad"],
                    "total": float(v["total"]),
                    "efectivo": float(v["efectivo"]),
                    "tarjeta": float(v["tarjeta"]),
                    "transferencia": float(v["transferencia"])
                }
                for k, v in ventas_por_producto.items()
            },
        }