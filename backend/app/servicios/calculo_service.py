from app.utils.calculadora_precios import CalculadoraPrecios

class CalculoService:
    """Servicio que utiliza la calculadora de precios"""
    
    @staticmethod
    def calcular_costo(fecha_entrada, fecha_salida, config, es_nocturno=False):
        """Calcular el costo del estacionamiento"""
        print("\n" + "="*60)
        print(" DEBUG CalculoService.calcular_costo")
        print(f"Recibido es_nocturno: {es_nocturno} (tipo: {type(es_nocturno)})")
        
        resultado = CalculadoraPrecios.calcular_costo(fecha_entrada, fecha_salida, config, es_nocturno)
        
        print(f"Resultado del cálculo:")
        print(f"  Costo: {resultado['costo']}")
        print(f"  Minutos: {resultado['minutos']}")
        print(f"  Detalles: {resultado['detalles']}")
        print("="*60 + "\n")
        
        return resultado
    
    @staticmethod
    def formatear_tiempo(minutos):
        """Formatear tiempo en formato legible"""
        print(f"CalculoService.formatear_tiempo: {minutos} minutos")
        resultado = CalculadoraPrecios.formatear_tiempo(minutos)
        print(f"  Resultado: {resultado}")
        return resultado