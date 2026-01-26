from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from sqlalchemy import and_, or_
from app.config import get_db
from app.esquemas.factura_schema import ReporteDiario, ReporteDetalladoSchema,ReporteNoPagadosSchema

router = APIRouter(
    prefix="/api/reportes",
    tags=["Reportes"]
)

@router.get("/diario", response_model=ReporteDiario)
def obtener_reporte_diario(fecha: str = None, db: Session = Depends(get_db)):
    """
    Obtener reporte de ingresos diarios EXCLUYENDO NO PAGADOS
    - Total vehículos: Los que ENTRARON ese día (excluyendo no pagados)
    - Ingresos: Los que SALIERON ese día y PAGARON
    """
    try:
        if fecha is None:
            fecha_actual = date.today()
        else:
            fecha_actual = datetime.strptime(fecha, "%Y-%m-%d").date()
        
        inicio_dia = datetime.combine(fecha_actual, datetime.min.time())
        fin_dia = datetime.combine(fecha_actual + timedelta(days=1), datetime.min.time())
        
        from app.modelos.vehiculo_estacionado import VehiculoEstacionado
        
        # Total vehículos: Los que ENTRARON este día (excluyendo no pagados)
        vehiculos_entraron = db.query(VehiculoEstacionado).filter(
            VehiculoEstacionado.fecha_hora_entrada >= inicio_dia,
            VehiculoEstacionado.fecha_hora_entrada < fin_dia
        ).all()
        
        # Filtrar para excluir los que NO pagaron (si ya salieron)
        vehiculos_entraron_filtrados = []
        for v in vehiculos_entraron:
            # Si ya salió, verificar si pagó
            if v.estado == "finalizado" and v.fecha_hora_salida:
                if v.es_no_pagado:
                    continue  # Excluir no pagados
            vehiculos_entraron_filtrados.append(v)
        
        # Ingresos: Solo de los que SALIERON este día y PAGARON
        vehiculos_salieron_pagados = db.query(VehiculoEstacionado).filter(
            VehiculoEstacionado.estado == "finalizado",
            VehiculoEstacionado.fecha_hora_salida.isnot(None),
            VehiculoEstacionado.fecha_hora_salida >= inicio_dia,
            VehiculoEstacionado.fecha_hora_salida < fin_dia,
            VehiculoEstacionado.es_no_pagado == False  # ✅ Solo los que pagaron
        ).all()
        
        ingresos_total = sum(v.costo_total or 0 for v in vehiculos_salieron_pagados)
        
        return ReporteDiario(
            fecha=fecha_actual.strftime("%Y-%m-%d"),
            total_vehiculos=len(vehiculos_entraron_filtrados),
            ingresos_total=float(ingresos_total)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/detallado", response_model=ReporteDetalladoSchema)
def obtener_reporte_detallado(fecha: str = None, db: Session = Depends(get_db)):
    """
    Reporte detallado para gráficos con DATOS REALES
    - Estadísticas de vehículos: Los que ENTRARON ese día (excluyendo no pagados)
    - Ingresos: Los que SALIERON ese día y PAGARON
    """
    try:
        if fecha is None:
            fecha_actual = date.today()
        else:
            fecha_actual = datetime.strptime(fecha, "%Y-%m-%d").date()
        
        inicio_dia = datetime.combine(fecha_actual, datetime.min.time())
        fin_dia = datetime.combine(fecha_actual + timedelta(days=1), datetime.min.time())
        
        from app.modelos.historial_factura import HistorialFactura
        
        # Vehículos que ENTRARON este día
        facturas_dia = db.query(HistorialFactura).filter(
            HistorialFactura.fecha_hora_entrada >= inicio_dia,
            HistorialFactura.fecha_hora_entrada < fin_dia
        ).all()
        
        # Filtrar excluyendo no pagados (para estadísticas principales)
        facturas_pagadas = [f for f in facturas_dia if not f.es_no_pagado]
        facturas_no_pagadas = [f for f in facturas_dia if f.es_no_pagado]
        
        # Vehículos que SALIERON este día y PAGARON (para ingresos)
        facturas_salieron_pagadas = db.query(HistorialFactura).filter(
            HistorialFactura.fecha_hora_salida >= inicio_dia,
            HistorialFactura.fecha_hora_salida < fin_dia,
            HistorialFactura.es_no_pagado == False
        ).all()
        
        # ===== CALCULAR ESTADÍSTICAS PRINCIPALES =====
        
        # 1. Nocturnos vs Diurnos (de los que ENTRARON y PAGARON)
        nocturnos = sum(1 for f in facturas_pagadas if f.es_nocturno)
        diurnos = len(facturas_pagadas) - nocturnos
        
        # Ingresos (de los que SALIERON y PAGARON)
        ingresos_nocturnos = sum(
            f.costo_total or 0 
            for f in facturas_salieron_pagadas 
            if f.es_nocturno
        )
        ingresos_diurnos = sum(
            f.costo_total or 0 
            for f in facturas_salieron_pagadas 
            if not f.es_nocturno
        )
        
        # ===== ESTADÍSTICAS DE NO PAGADOS =====
        nocturnos_no_pagados = sum(1 for f in facturas_no_pagadas if f.es_nocturno)
        diurnos_no_pagados = len(facturas_no_pagadas) - nocturnos_no_pagados
        perdida_no_pagados = sum(f.costo_total or 0 for f in facturas_no_pagadas)
        
        estadisticas_no_pagadas = {
            "total_no_pagados": len(facturas_no_pagadas),
            "nocturnos_no_pagados": nocturnos_no_pagados,
            "diurnos_no_pagados": diurnos_no_pagados,
            "perdida_total": float(perdida_no_pagados),
            "vehiculos_nocturnos_no_pagados": nocturnos_no_pagados  # Por si el frontend lo necesita
        }
        
        # 2. Horas pico (por hora de ENTRADA, solo pagados)
        horas_pico_dict = {}
        for f in facturas_pagadas:
            hora = f.fecha_hora_entrada.strftime("%H:00")
            horas_pico_dict[hora] = horas_pico_dict.get(hora, 0) + 1
        
        horas_pico = [
            {"hora": hora, "cantidad": cantidad}
            for hora, cantidad in sorted(horas_pico_dict.items())
        ]
        
        # 3. Espacios más utilizados (de los que ENTRARON y PAGARON)
        espacios_dict = {}
        for f in facturas_pagadas:
            espacios_dict[f.espacio_numero] = espacios_dict.get(f.espacio_numero, 0) + 1
        
        espacios_mas_utilizados = [
            {"espacio": espacio, "usos": usos}
            for espacio, usos in sorted(espacios_dict.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        # 4. Distribución de tiempo (solo de los que SALIERON y PAGARON)
        distribucion = {
            "menos_1h": 0,
            "entre_1h_3h": 0,
            "entre_3h_6h": 0,
            "mas_6h": 0,
            "nocturnos": 0
        }
        
        for f in facturas_salieron_pagadas:
            if f.es_nocturno:
                distribucion["nocturnos"] += 1
                continue
                
            minutos = f.tiempo_total_minutos
            
            if minutos < 60:
                distribucion["menos_1h"] += 1
            elif minutos < 180:
                distribucion["entre_1h_3h"] += 1
            elif minutos < 360:
                distribucion["entre_3h_6h"] += 1
            else:
                distribucion["mas_6h"] += 1
        
        return ReporteDetalladoSchema(
            fecha=fecha_actual.strftime("%Y-%m-%d"),
            vehiculos_nocturnos=nocturnos,
            vehiculos_diurnos=diurnos,
            ingresos_nocturnos=float(ingresos_nocturnos),
            ingresos_diurnos=float(ingresos_diurnos),
            horas_pico=horas_pico,
            espacios_mas_utilizados=espacios_mas_utilizados,
            distribucion_tiempo=distribucion,
            estadisticas_no_pagadas=estadisticas_no_pagadas
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/no-pagados", response_model=ReporteNoPagadosSchema)
def obtener_estadisticas_no_pagados(fecha: str = None, db: Session = Depends(get_db)):
    """Obtener estadísticas específicas de vehículos no pagados"""
    try:
        if fecha is None:
            fecha_actual = date.today()
        else:
            fecha_actual = datetime.strptime(fecha, "%Y-%m-%d").date()
        
        inicio_dia = datetime.combine(fecha_actual, datetime.min.time())
        fin_dia = datetime.combine(fecha_actual + timedelta(days=1), datetime.min.time())
        
        from app.modelos.historial_factura import HistorialFactura
        
        # Vehículos no pagados del día
        no_pagados = db.query(HistorialFactura).filter(
            HistorialFactura.es_no_pagado == True,
            HistorialFactura.fecha_generacion >= inicio_dia,
            HistorialFactura.fecha_generacion < fin_dia
        ).all()
        
        total_no_pagados = len(no_pagados)
        
        # Calcular pérdida por tipo
        perdida_nocturnos = sum(f.costo_total or 0 for f in no_pagados if f.es_nocturno)
        perdida_normales = sum(f.costo_total or 0 for f in no_pagados if not f.es_nocturno)
        
        return ReporteNoPagadosSchema(
            fecha=fecha_actual.strftime("%Y-%m-%d"),
            total_no_pagados=total_no_pagados,
            perdida_total=float(perdida_nocturnos + perdida_normales),
            detalle={
                "nocturnos": {
                    "cantidad": sum(1 for f in no_pagados if f.es_nocturno),
                    "perdida": float(perdida_nocturnos)
                },
                "normales": {
                    "cantidad": sum(1 for f in no_pagados if not f.es_nocturno),
                    "perdida": float(perdida_normales)
                }
            },
            vehiculos=[
                {
                    "placa": f.placa,
                    "espacio": f.espacio_numero,
                    "entrada": f.fecha_hora_entrada.isoformat() if f.fecha_hora_entrada else None,
                    "salida": f.fecha_hora_salida.isoformat() if f.fecha_hora_salida else None,
                    "costo_no_cobrado": float(f.costo_total or 0),
                    "es_nocturno": f.es_nocturno,
                    "tiempo_minutos": f.tiempo_total_minutos
                }
                for f in no_pagados
            ]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
def health_check():
    return {
        "success": True,
        "message": "📊 Servicio de reportes funcionando correctamente"
    }