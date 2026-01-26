# En esquemas/factura_schema.py
from pydantic import BaseModel
from typing import Optional, List

# ========== SCHEMAS DE ENTRADA/SALIDA ==========

class EntradaSchema(BaseModel):
    """Schema para registrar entrada de vehículo"""
    placa: str
    espacio_numero: int
    es_nocturno: bool = False
    
    class Config:
        from_attributes = True

class SalidaSchema(BaseModel):
    """Schema para registrar salida de vehículo"""
    placa: str
    
    class Config:
        from_attributes = True

# ========== SCHEMAS DE FACTURA ==========

class FacturaResponse(BaseModel):
    """Schema para respuesta de factura básica"""
    id: int
    vehiculo_id: int
    placa: str
    espacio_numero: int
    fecha_hora_entrada: str
    fecha_hora_salida: str
    tiempo_total_minutos: int
    costo_total: float
    detalles_cobro: Optional[str]
    fecha_generacion: str
    es_nocturno: bool

    class Config:
        from_attributes = True

class FacturaDetallada(BaseModel):
    """Schema para factura detallada (para imprimir)"""
    placa: str
    espacio: int
    entrada: str
    salida: str
    tiempo_total: str
    costo_total: float
    detalles: str
    es_nocturno: bool

    class Config:
        from_attributes = True

# ========== SCHEMAS DE REPORTES ==========

class ReporteDiario(BaseModel):
    """Schema para reporte diario básico"""
    fecha: str
    total_vehiculos: int
    ingresos_total: float

    class Config:
        from_attributes = True

class HoraPicoSchema(BaseModel):
    """Schema para horas pico"""
    hora: str
    cantidad: int

class EspacioUtilizadoSchema(BaseModel):
    """Schema para espacios utilizados"""
    espacio: int
    usos: int

class DistribucionTiempoSchema(BaseModel):
    """Schema para distribución de tiempo de estacionamiento"""
    menos_1h: int
    entre_1h_3h: int
    entre_3h_6h: int
    mas_6h: int
    nocturnos: int

# NUEVO: Schema para estadísticas de no pagados
class EstadisticasNoPagadasSchema(BaseModel):
    """Schema para estadísticas de vehículos no pagados"""
    total_no_pagados: int
    nocturnos_no_pagados: int
    diurnos_no_pagados: int
    perdida_total: float
    vehiculos_nocturnos_no_pagados: Optional[int] = 0

class ReporteDetalladoSchema(BaseModel):
    """Schema para reporte detallado con gráficos INCLUYENDO NO PAGADOS"""
    fecha: str
    vehiculos_nocturnos: int
    vehiculos_diurnos: int
    ingresos_nocturnos: float
    ingresos_diurnos: float
    horas_pico: List[HoraPicoSchema]
    espacios_mas_utilizados: List[EspacioUtilizadoSchema]
    distribucion_tiempo: DistribucionTiempoSchema
    # ✅ NUEVO: Estadísticas de no pagados
    estadisticas_no_pagadas: Optional[EstadisticasNoPagadasSchema] = None

    class Config:
        from_attributes = True

# NUEVO: Schema para reporte de no pagados específico
class ReporteNoPagadosSchema(BaseModel):
    """Schema para reporte específico de vehículos no pagados"""
    fecha: str
    total_no_pagados: int
    perdida_total: float
    detalle: dict
    vehiculos: List[dict]

    class Config:
        from_attributes = True