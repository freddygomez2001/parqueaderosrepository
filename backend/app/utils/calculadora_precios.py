# app/utils/calculadora_precios.py
from datetime import datetime
import math

class CalculadoraPrecios:
    """Utilidad para calcular precios del parqueadero con rangos específicos"""
    
    @staticmethod
    def calcular_costo(fecha_entrada, fecha_salida, config, es_nocturno=False):
        """
        Calcular el costo total del estacionamiento usando rangos específicos
        
        LOGICA:
        1. Si es_nocturno=True: aplicar precio_nocturno (tarifa fija)
        2. Si no: usar rangos específicos o progresivo
        """
        print("\n" + "="*60)
        print("DEBUG CalculadoraPrecios.calcular_costo")
        print(f"es_nocturno: {es_nocturno}")
        print(f"Config recibida:", config)
        
        # TARIFA NOCTURNA
        if es_nocturno:
            print("APLICANDO TARIFA NOCTURNA FIJA")
            costo = round(float(config.precio_nocturno), 2)
            minutos = CalculadoraPrecios._calcular_minutos(fecha_entrada, fecha_salida)
            
            return {
                'costo': costo,
                'minutos': minutos,
                'detalles': f'TARIFA NOCTURNA FIJA: ${config.precio_nocturno}',
                'tipo': 'nocturno'
            }
        
        # TARIFA NORMAL - CALCULAR MINUTOS
        minutos_totales = CalculadoraPrecios._calcular_minutos(fecha_entrada, fecha_salida)
        print(f"Minutos totales: {minutos_totales}")
        
        if minutos_totales <= 0:
            print("Tiempo mínimo (1 minuto)")
            minutos_totales = 1
        
        # APLICAR RANGOS ESPECIFICOS
        costo_total = 0
        detalles = []
        
        # PRIMERO: Verificar rangos personalizados si existen
        if hasattr(config, 'rangos_personalizados') and config.rangos_personalizados:
            try:
                rangos = config.rangos_personalizados
                if isinstance(rangos, str):
                    import json
                    rangos = json.loads(rangos)
                
                for rango in rangos:
                    if minutos_totales >= rango['min_minutos'] and minutos_totales <= rango['max_minutos']:
                        costo_total = float(rango['precio'])
                        desc = rango.get('descripcion', f"{rango['min_minutos']}-{rango['max_minutos']} min")
                        detalles.append(f"Rango personalizado: {desc}")
                        print(f"Encontrado rango personalizado: {desc}")
                        break
            except Exception as e:
                print(f"Error procesando rangos personalizados: {e}")
        
        # SEGUNDO: Si no hay rango personalizado, usar rangos fijos
        if costo_total == 0:
            # Rango 0-5 minutos
            if minutos_totales <= 5:
                costo_total = float(config.precio_0_5_min)
                detalles.append(f"0-5 minutos: ${config.precio_0_5_min}")
                print(f"Aplicado rango 0-5 min: ${costo_total}")
            
            # Rango 6-30 minutos
            elif minutos_totales <= 30:
                costo_total = float(config.precio_6_30_min)
                detalles.append(f"6-30 minutos: ${config.precio_6_30_min}")
                print(f"Aplicado rango 6-30 min: ${costo_total}")
            
            # Rango 31-60 minutos (1 hora)
            elif minutos_totales <= 60:
                costo_total = float(config.precio_31_60_min)
                detalles.append(f"31-60 minutos: ${config.precio_31_60_min}")
                print(f"Aplicado rango 31-60 min: ${costo_total}")
            
            # Más de 1 hora: cálculo progresivo
            else:
                horas = minutos_totales / 60.0
                # Primera hora fija
                costo_total = float(config.precio_31_60_min)
                horas_restantes = horas - 1
                
                if horas_restantes > 0:
                    # Cada hora adicional
                    horas_adicionales = math.ceil(horas_restantes)
                    costo_adicional = horas_adicionales * float(config.precio_hora_adicional)
                    costo_total += costo_adicional
                    
                    detalles.append(f"Primera hora: ${config.precio_31_60_min}")
                    detalles.append(f"{horas_adicionales} horas adicionales: ${costo_adicional:.2f}")
                    print(f"Cálculo progresivo: {horas_adicionales} horas adicionales")
                else:
                    detalles.append(f"{minutos_totales} minutos: ${costo_total}")
                    print(f"Cálculo directo para {minutos_totales} min")
        
        print(f"Costo total: ${costo_total:.2f}")
        print("="*60 + "\n")
        
        return {
            'costo': round(costo_total, 2),
            'minutos': minutos_totales,
            'detalles': ' | '.join(detalles),
            'tipo': 'normal'
        }
    
    @staticmethod
    def _calcular_minutos(fecha_entrada, fecha_salida):
        """Calcular minutos entre dos fechas"""
        try:
            entrada = fecha_entrada
            salida = fecha_salida
            
            if isinstance(entrada, str):
                entrada = datetime.fromisoformat(entrada.replace('Z', '+00:00'))
            if isinstance(salida, str):
                salida = datetime.fromisoformat(salida.replace('Z', '+00:00'))
            
            delta = salida - entrada
            segundos_totales = delta.total_seconds()
            minutos_totales = int(segundos_totales / 60)
            
            # Asegurar al menos 1 minuto
            if segundos_totales > 0 and minutos_totales == 0:
                return 1
            return minutos_totales
            
        except Exception as e:
            print(f"Error calculando minutos: {e}")
            return 1
    
    @staticmethod
    def formatear_tiempo(minutos):
        """Formatear tiempo en formato legible"""
        if minutos <= 0:
            return "0m"
        
        horas = minutos // 60
        mins = minutos % 60
        
        if horas > 0 and mins > 0:
            return f'{horas}h {mins}m'
        elif horas > 0:
            return f'{horas}h'
        else:
            return f'{mins}m'