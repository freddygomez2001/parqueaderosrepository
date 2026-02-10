# app/routers/producto_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import get_db
from app.servicios.producto_service import ProductoService
from app.esquemas.producto_schema import (
    ProductoCreate,
    ProductoUpdate,
    ProductoResponse
)
from typing import List, Optional

router = APIRouter(
    prefix="/api/productos",
    tags=["Productos"]
)

@router.get("/", response_model=List[ProductoResponse])
async def obtener_productos(
    categoria: Optional[str] = None,
    activos_solo: bool = True,
    db: Session = Depends(get_db)
):
    """Obtener todos los productos"""
    try:
        productos = ProductoService.obtener_todos(db, categoria, activos_solo)
        return [p.to_dict() for p in productos]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener productos: {str(e)}"
        )

@router.get("/{producto_id}", response_model=ProductoResponse)
async def obtener_producto(producto_id: int, db: Session = Depends(get_db)):
    """Obtener producto por ID"""
    try:
        producto = ProductoService.obtener_por_id(db, producto_id)
        
        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto {producto_id} no encontrado"
            )
        
        return producto.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener producto: {str(e)}"
        )

@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def crear_producto(datos: ProductoCreate, db: Session = Depends(get_db)):
    """Crear nuevo producto"""
    try:
        producto = ProductoService.crear_producto(db, datos.dict())
        return producto.to_dict()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear producto: {str(e)}"
        )

@router.put("/{producto_id}", response_model=ProductoResponse)
async def actualizar_producto(
    producto_id: int,
    datos: ProductoUpdate,
    db: Session = Depends(get_db)
):
    """Actualizar producto existente"""
    try:
        datos_dict = datos.dict(exclude_none=True)
        producto = ProductoService.actualizar_producto(db, producto_id, datos_dict)
        
        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto {producto_id} no encontrado"
            )
        
        return producto.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar producto: {str(e)}"
        )

@router.delete("/{producto_id}")
async def eliminar_producto(producto_id: int, db: Session = Depends(get_db)):
    """Eliminar (desactivar) producto"""
    try:
        resultado = ProductoService.eliminar_producto(db, producto_id)
        
        if not resultado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto {producto_id} no encontrado"
            )
        
        return {"success": True, "message": "Producto eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar producto: {str(e)}"
        )

@router.get("/health")
def health_check():
    """Verificar que el servicio de productos está funcionando"""
    return {
        "success": True,
        "message": "Servicio de productos funcionando correctamente"
    }