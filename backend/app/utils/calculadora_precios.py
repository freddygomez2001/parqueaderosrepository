from datetime import datetime
import math


class CalculadoraPrecios:
    """Utilidad para calcular precios del parqueadero con rangos específicos"""

    @staticmethod
    def calcular_costo(fecha_entrada, fecha_salida, config, es_nocturno=False):
        """
        Calcular el costo total del estacionamiento usando rangos específicos

        LÓGICA:
        1. Si es nocturno → tarifa fija
        2. Si no → rangos definidos hasta 60 min, luego bloques de 30 min
        """

        print("\n" + "=" * 60)
        print("DEBUG CalculadoraPrecios.calcular_costo")
        print(f"es_nocturno: {es_nocturno}")

        # TARIFA NOCTURNA
        if es_nocturno:
            print("APLICANDO TARIFA NOCTURNA FIJA")
            minutos = CalculadoraPrecios._calcular_minutos(fecha_entrada, fecha_salida)
            costo = round(float(config.precio_nocturno), 2)

            return {
                "costo": costo,
                "minutos": minutos,
                "detalles": f"TARIFA NOCTURNA FIJA: ${config.precio_nocturno}",
                "tipo": "nocturno",
            }

        # TARIFA NORMAL
        minutos_totales = CalculadoraPrecios._calcular_minutos(fecha_entrada, fecha_salida)
        print(f"Minutos totales: {minutos_totales}")

        if minutos_totales <= 0:
            minutos_totales = 1

        costo_total = 0.0
        detalles = []

        # 🔹 RANGOS PERSONALIZADOS
        if hasattr(config, "rangos_personalizados") and config.rangos_personalizados:
            try:
                rangos = config.rangos_personalizados
                if isinstance(rangos, str):
                    import json
                    rangos = json.loads(rangos)

                for rango in rangos:
                    if rango["min_minutos"] <= minutos_totales <= rango["max_minutos"]:
                        costo_total = float(rango["precio"])
                        desc = rango.get(
                            "descripcion",
                            f'{rango["min_minutos"]}-{rango["max_minutos"]} min',
                        )
                        detalles.append(f"Rango personalizado: {desc}")
                        print(f"Rango personalizado aplicado: {desc}")
                        break
            except Exception as e:
                print(f"Error en rangos personalizados: {e}")

        # 🔹 RANGOS FIJOS
        if costo_total == 0:
            # Rango 0-5 minutos
            if minutos_totales <= 5:
                costo_total = float(config.precio_0_5_min)
                detalles.append(f"0-5 minutos: ${config.precio_0_5_min}")
                print(f"Aplicado: 0-5 min = ${costo_total}")

            # Rango 6-30 minutos
            elif minutos_totales <= 30:
                costo_total = float(config.precio_6_30_min)
                detalles.append(f"6-30 minutos: ${config.precio_6_30_min}")
                print(f"Aplicado: 6-30 min = ${costo_total}")

            # Rango 31-60 minutos (primera hora completa)
            elif minutos_totales <= 60:
                costo_total = float(config.precio_31_60_min)
                detalles.append(f"31-60 minutos: ${config.precio_31_60_min}")
                print(f"Aplicado: 31-60 min = ${costo_total}")

            # ✅ MÁS DE 60 MINUTOS: Bloques de 30 minutos
            else:
                # Primera hora (siempre cobra el precio_31_60_min)
                costo_total = float(config.precio_31_60_min)
                minutos_restantes = minutos_totales - 60

                # Calcular bloques de 30 minutos (redondear hacia arriba)
                bloques_30min = math.ceil(minutos_restantes / 30.0)
                
                # Cada bloque de 30 min cuesta la mitad del precio_hora_adicional
                precio_por_bloque = float(config.precio_hora_adicional) / 2.0
                costo_adicional = bloques_30min * precio_por_bloque
                
                costo_total += costo_adicional

                # Detalles claros
                detalles.append(f"Primera hora: ${config.precio_31_60_min}")
                detalles.append(f"{minutos_restantes} min adicionales ({bloques_30min} bloques de 30min × ${precio_por_bloque:.2f}): ${costo_adicional:.2f}")

                print(f"Primera hora: ${config.precio_31_60_min}")
                print(f"{minutos_restantes} min restantes = {bloques_30min} bloques × ${precio_por_bloque:.2f} = ${costo_adicional:.2f}")

        print(f"Costo total: ${costo_total:.2f}")
        print("=" * 60 + "\n")

        return {
            "costo": round(costo_total, 2),
            "minutos": minutos_totales,
            "detalles": " | ".join(detalles),
            "tipo": "normal",
        }

    @staticmethod
    def _calcular_minutos(fecha_entrada, fecha_salida):
        """Calcular minutos entre dos fechas (maneja zonas horarias correctamente)"""
        try:
            # Convertir strings ISO
            if isinstance(fecha_entrada, str):
                fecha_entrada = datetime.fromisoformat(
                    fecha_entrada.replace("Z", "+00:00")
                )
            if isinstance(fecha_salida, str):
                fecha_salida = datetime.fromisoformat(
                    fecha_salida.replace("Z", "+00:00")
                )

            # Normalizar tzinfo
            if fecha_entrada.tzinfo and not fecha_salida.tzinfo:
                fecha_salida = fecha_salida.replace(tzinfo=fecha_entrada.tzinfo)
            elif fecha_salida.tzinfo and not fecha_entrada.tzinfo:
                fecha_entrada = fecha_entrada.replace(tzinfo=fecha_salida.tzinfo)

            delta = fecha_salida - fecha_entrada
            segundos = delta.total_seconds()

            if segundos <= 0:
                return 1

            return max(math.ceil(segundos / 60), 1)

        except Exception as e:
            print(f"❌ Error calculando minutos: {e}")
            return 1

    @staticmethod
    def formatear_tiempo(minutos):
        """Formatear tiempo en formato legible"""
        if minutos <= 0:
            return "0m"

        horas = minutos // 60
        mins = minutos % 60

        if horas > 0 and mins > 0:
            return f"{horas}h {mins}m"
        elif horas > 0:
            return f"{horas}h"
        else:
            return f"{mins}m"