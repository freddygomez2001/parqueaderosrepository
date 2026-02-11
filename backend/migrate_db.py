# migrate_db.py
"""
Script para actualizar la base de datos - VERSIÓN CORREGIDA
Ejecutar desde la raíz del proyecto backend:
    python migrate_db.py
"""

from sqlalchemy import inspect, text
from app.config import engine, Base
from sqlalchemy.engine.reflection import Inspector
import sqlite3

# Importar TODOS los modelos
from app.modelos.configuracion_precios import ConfiguracionPrecios
from app.modelos.vehiculo_estacionado import VehiculoEstacionado
from app.modelos.historial_factura import HistorialFactura
from app.modelos.producto import Producto
from app.modelos.venta_servicio import VentaServicio, ItemVentaServicio
from app.modelos.movimiento_manual import MovimientoManualCaja  
from app.modelos.caja import Caja, EstadoCaja

def agregar_columna_sqlite(conn, tabla: str, columna: str, definicion: str):
    """Agrega una columna a una tabla SQLite de forma directa y segura"""
    try:
        # Verificar si la columna existe usando PRAGMA
        cursor = conn.connection.cursor()
        cursor.execute(f"PRAGMA table_info({tabla})")
        columnas = [col[1] for col in cursor.fetchall()]
        
        if columna not in columnas:
            print(f"  ➕ Agregando columna '{columna}' a tabla '{tabla}'...")
            cursor.execute(f"ALTER TABLE {tabla} ADD COLUMN {columna} {definicion}")
            conn.commit()
            print(f"  ✅ Columna '{columna}' agregada exitosamente")
            return True
        else:
            print(f"  ✅ Columna '{columna}' YA EXISTE en tabla '{tabla}'")
            return False
    except Exception as e:
        print(f"  ❌ Error al agregar columna '{columna}': {e}")
        return False

def migrar_base_datos():
    """Migrar base de datos sin perder datos existentes"""
    print("🔄 Iniciando migración de base de datos...")
    print("=" * 60)

    try:
        inspector = inspect(engine)
        tablas_existentes = inspector.get_table_names()
        print(f"📋 Tablas existentes: {', '.join(tablas_existentes) if tablas_existentes else 'Ninguna'}")
        print()

        # =========================================
        # 1️⃣ CREAR TABLAS NUEVAS
        # =========================================
        print("📦 Creando tablas nuevas que no existan...")
        Base.metadata.create_all(bind=engine)
        print("  ✅ Proceso de tablas completado")
        print()

        # =========================================
        # 2️⃣ AGREGAR COLUMNAS NUEVAS USANDO SQLITE DIRECTO
        # =========================================
        print("🔧 Agregando columnas nuevas a tablas existentes...")
        print()
        
        with engine.connect() as conn:
            
            # --- Tabla: historial_facturas (LA MÁS IMPORTANTE) ---
            if 'historial_facturas' in tablas_existentes:
                print("📌 Tabla: historial_facturas")
                
                # ✅ AGREGAR metodo_pago - ESTA ES LA COLUMNA QUE FALTA
                agregar_columna_sqlite(
                    conn,
                    'historial_facturas',
                    'metodo_pago',
                    "VARCHAR(20) DEFAULT 'efectivo'"
                )
                
                # Verificar que se agregó correctamente
                cursor = conn.connection.cursor()
                cursor.execute("PRAGMA table_info(historial_facturas)")
                columnas_final = [col[1] for col in cursor.fetchall()]
                
                if 'metodo_pago' in columnas_final:
                    print("  ✅ VERIFICADO: Columna 'metodo_pago' existe en historial_facturas")
                else:
                    print("  ❌ ERROR CRÍTICO: No se pudo agregar 'metodo_pago'")
                    print("  ⚠️  Intentando método alternativo...")
                    
                    # Método alternativo: recrear la tabla
                    try:
                        print("  🔄 Recreando tabla historial_facturas con todas las columnas...")
                        
                        # Obtener datos existentes
                        cursor.execute("SELECT * FROM historial_facturas")
                        datos = cursor.fetchall()
                        columnas_viejas = [desc[0] for desc in cursor.description]
                        
                        # Crear tabla temporal con la nueva columna
                        cursor.execute("""
                            CREATE TABLE historial_facturas_nueva (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                vehiculo_id INTEGER NOT NULL,
                                placa VARCHAR(20) NOT NULL,
                                espacio_numero INTEGER NOT NULL,
                                fecha_hora_entrada DATETIME NOT NULL,
                                fecha_hora_salida DATETIME NOT NULL,
                                tiempo_total_minutos INTEGER NOT NULL,
                                costo_total NUMERIC(10,2) NOT NULL,
                                detalles_cobro TEXT,
                                fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                                es_nocturno BOOLEAN DEFAULT 0,
                                es_no_pagado BOOLEAN DEFAULT 0,
                                metodo_pago VARCHAR(20) DEFAULT 'efectivo'
                            )
                        """)
                        
                        # Migrar datos
                        placeholders = ','.join(['?'] * len(columnas_viejas))
                        for fila in datos:
                            cursor.execute(f"INSERT INTO historial_facturas_nueva SELECT {placeholders}, 'efectivo' FROM (SELECT ?)" + ",?" * (len(columnas_viejas)-1), fila)
                        
                        # Reemplazar tabla
                        cursor.execute("DROP TABLE historial_facturas")
                        cursor.execute("ALTER TABLE historial_facturas_nueva RENAME TO historial_facturas")
                        conn.commit()
                        
                        print("  ✅ Tabla historial_facturas RECREADA exitosamente con columna metodo_pago")
                    except Exception as e2:
                        print(f"  ❌ Error en método alternativo: {e2}")
                print()
            
            # --- Tabla: vehiculos_estacionados ---
            if 'vehiculos_estacionados' in tablas_existentes:
                print("📌 Tabla: vehiculos_estacionados")
                agregar_columna_sqlite(
                    conn,
                    'vehiculos_estacionados',
                    'es_no_pagado',
                    "BOOLEAN DEFAULT 0"
                )
                print()
            
            # --- Tabla: movimientos_manuales_caja ---
            if 'movimientos_manuales_caja' in tablas_existentes:
                print("📌 Tabla: movimientos_manuales_caja")
                agregar_columna_sqlite(
                    conn,
                    'movimientos_manuales_caja',
                    'caja_id',
                    "INTEGER"
                )
                print()

        print("✅ Migración de columnas completada")
        print()

        # =========================================
        # 3️⃣ VERIFICACIÓN FINAL OBLIGATORIA
        # =========================================
        print("🔍 VERIFICACIÓN FINAL OBLIGATORIA:")
        print("-" * 60)
        
        with engine.connect() as conn:
            cursor = conn.connection.cursor()
            
            # Verificar historial_facturas
            cursor.execute("PRAGMA table_info(historial_facturas)")
            columnas_historial = [col[1] for col in cursor.fetchall()]
            print(f"📊 Columnas en historial_facturas: {', '.join(columnas_historial)}")
            
            if 'metodo_pago' in columnas_historial:
                print("  ✅ [OK] metodo_pago: presente")
                
                # Mostrar algunos registros como ejemplo
                cursor.execute("SELECT id, placa, metodo_pago FROM historial_facturas LIMIT 3")
                registros = cursor.fetchall()
                if registros:
                    print("  📝 Ejemplo de registros:")
                    for reg in registros:
                        print(f"     ID: {reg[0]}, Placa: {reg[1]}, metodo_pago: {reg[2]}")
            else:
                print("  ❌ [CRÍTICO] metodo_pago: AÚN NO EXISTE")
                print("  ⚠️  Debes ejecutar manualmente:")
                print('  sqlite3 data/parqueaderos.db "ALTER TABLE historial_facturas ADD COLUMN metodo_pago VARCHAR(20) DEFAULT \'efectivo\';"')
        
        print()
        print("=" * 60)
        print("✅ MIGRACIÓN COMPLETADA")
        return True

    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("MIGRACIÓN DE BASE DE DATOS - Sistema de Parqueadero")
    print("VERSIÓN CORREGIDA - SOLUCIÓN DEFINITIVA")
    print("=" * 60)
    print()

    exito = migrar_base_datos()

    print()
    if exito:
        print("✅ MIGRACIÓN COMPLETADA EXITOSAMENTE")
        print("Puedes iniciar el servidor con: uvicorn app.main:app --reload")
    else:
        print("❌ MIGRACIÓN FALLIDA")
        print("Revisa los errores anteriores")
    print("=" * 60)