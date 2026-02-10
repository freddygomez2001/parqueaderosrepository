from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
import sys

from app.config import Base, engine, SessionLocal

# ----------------------------------------------------------------------
# 🔹 IMPORTAR MODELOS (ANTES DE CREATE_ALL)
# ----------------------------------------------------------------------
from app.modelos import configuracion_precios
from app.modelos import vehiculo_estacionado
from app.modelos import historial_factura
from app.modelos import producto  
from app.modelos import venta_servicio  


# ----------------------------------------------------------------------
# 🔹 CONFIGURAR ENCODING PARA WINDOWS
# ----------------------------------------------------------------------
# Esto soluciona el problema de Unicode en Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# ----------------------------------------------------------------------
# 🔹 INSTANCIA FASTAPI
# ----------------------------------------------------------------------
app = FastAPI(
    title="Sistema de Parqueadero",
    version="1.0",
    description="API REST del sistema de parqueadero para hotel."
)

# ----------------------------------------------------------------------
# 🔹 CORS
# ----------------------------------------------------------------------
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------
# 🔹 STARTUP: CREAR TABLAS + CONFIGURAR SQLITE
# ----------------------------------------------------------------------
@app.on_event("startup")
def startup_db():
    # Usar texto simple en lugar de emojis para Windows
    print("[DB] Inicializando base de datos...")

    # Crear tablas si no existen
    Base.metadata.create_all(bind=engine)

    # Activar WAL UNA SOLA VEZ
    try:
        with engine.connect() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL;"))
            conn.execute(text("PRAGMA synchronous=NORMAL;"))
            conn.execute(text("PRAGMA foreign_keys=ON;"))
        print("[DB] SQLite configurado en modo WAL")
    except Exception as e:
        print(f"[DB] WARNING: No se pudo activar WAL: {e}")

# ----------------------------------------------------------------------
# 🔹 IMPORTAR ROUTERS
# ----------------------------------------------------------------------
from app.routers import (
    configuracion_routes,
    vehiculo_routes,
    reporte_routes,
    producto_routes,
    venta_servicio_routes, 
)

app.include_router(configuracion_routes.router)
app.include_router(vehiculo_routes.router)
app.include_router(reporte_routes.router)
app.include_router(producto_routes.router)  
app.include_router(venta_servicio_routes.router)  


# ----------------------------------------------------------------------
# 🔹 ENDPOINT RAÍZ (HEALTHCHECK)
# ----------------------------------------------------------------------
@app.get("/")
def root():
    """
    Verifica el estado del backend y la conexión a la base de datos.
    """
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {
            "message": "Sistema de Parqueadero funcionando correctamente",
            "db_status": "Conexión a la base de datos exitosa"
        }
    except SQLAlchemyError as e:
        return {
            "message": "Sistema de Parqueadero funcionando",
            "db_status": f"Error en la base de datos: {str(e)}"
        }

# ----------------------------------------------------------------------
# 🔹 EJECUCIÓN DIRECTA (SOLO PARA DESARROLLO MANUAL)
# ----------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )