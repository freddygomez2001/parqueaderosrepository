# migrate_db.py
"""
Script para actualizar la base de datos sin perder datos existentes.
Ejecutar desde la raíz del proyecto backend:
    python migrate_db.py
"""

from sqlalchemy import inspect
from app.config import engine, Base

# IMPORTANTE:
# Importar TODOS los modelos para que SQLAlchemy los registre
from app.modelos.configuracion_precios import ConfiguracionPrecios
from app.modelos.vehiculo_estacionado import VehiculoEstacionado
from app.modelos.historial_factura import HistorialFactura
from app.modelos.producto import Producto
from app.modelos.venta_servicio import VentaServicio, ItemVentaServicio
from app.modelos.movimiento_manual import MovimientoManualCaja  
from app.modelos.caja import Caja, EstadoCaja
from app.modelos.denominacion_caja import DenominacionCaja
from app.modelos.egreso_caja import EgresoCaja

def migrar_base_datos():
    """Migrar base de datos sin perder datos existentes"""
    print("🔄 Iniciando migración de base de datos...")

    try:
        inspector = inspect(engine)
        tablas_existentes = inspector.get_table_names()

        print(
            f"📋 Tablas existentes: "
            f"{', '.join(tablas_existentes) if tablas_existentes else 'Ninguna'}"
        )

        # Crea SOLO las tablas que no existen
        Base.metadata.create_all(bind=engine)

        tablas_actuales = inspect(engine).get_table_names()
        tablas_agregadas = set(tablas_actuales) - set(tablas_existentes)

        if tablas_agregadas:
            print(f"✅ Tablas nuevas creadas: {', '.join(tablas_agregadas)}")
        else:
            print("ℹ️  No se crearon tablas nuevas (todas ya existían)")

        print("✅ Migración completada exitosamente")
        return True

    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("MIGRACIÓN DE BASE DE DATOS - Sistema de Parqueadero")
    print("=" * 60)
    print()

    exito = migrar_base_datos()

    print()
    print("=" * 60)
    if exito:
        print("✅ MIGRACIÓN COMPLETADA")
        print("Puedes iniciar el servidor con: uvicorn app.main:app --reload")
    else:
        print("❌ MIGRACIÓN FALLIDA")
        print("Revisa los errores anteriores")
    print("=" * 60)
