from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# --------------------------------------------------
# 📌 DETECCIÓN DE RUTA: Electron vs Desarrollo
# --------------------------------------------------
SQLITE_DB_PATH = os.getenv('SQLITE_DB_PATH')

if SQLITE_DB_PATH:
    # 🔥 Ruta desde Electron (userData)
    DB_PATH = SQLITE_DB_PATH
    print(f" [ELECTRON MODE] Base de datos SQLite en: {DB_PATH}")
else:
    # 🔧 Ruta para desarrollo local (carpeta /data)
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE_DIR, "data")
    os.makedirs(DATA_DIR, exist_ok=True)
    DB_PATH = os.path.join(DATA_DIR, "parqueaderos.db")
    print(f" [DEV MODE] Base de datos SQLite en: {DB_PATH}")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# --------------------------------------------------
# 📌 Crear engine (check_same_thread es OBLIGATORIO)a
# --------------------------------------------------
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# --------------------------------------------------
# 📌 Activar WAL y claves foráneas (PRODUCCIÓN)
# --------------------------------------------------
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()

# --------------------------------------------------
# 📌 Sesión y Base
# --------------------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# --------------------------------------------------
# 📌 Dependency para FastAPI
# --------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()