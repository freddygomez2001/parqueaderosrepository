"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, X } from "lucide-react"

const HOTEL_INFO = {
  nombre: "Hotel La Farola",
  direccion: "Av. Gil Ramirez Davalos y Av Heroes de Verdeloma",
  telefono: "+593 99 808 5600",
  ruc: "1234567890001",
}

interface TicketCierrePreviewProps {
  resumen: any
  onClose: () => void
}

export function TicketCierrePreview({ resumen, onClose }: TicketCierrePreviewProps) {
  const d = resumen.desglose || {
    parqueo: { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 },
    servicios: { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 },
    hotel: { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 },
    bano: { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 },
    manuales: 0
  }

  const totalTarjeta = 
    (d.parqueo.tarjeta || 0) + 
    (d.servicios.tarjeta || 0) + 
    (d.hotel.tarjeta || 0) + 
    (d.bano.tarjeta || 0)

  const totalTransferencia = 
    (d.parqueo.transferencia || 0) + 
    (d.servicios.transferencia || 0) + 
    (d.hotel.transferencia || 0) + 
    (d.bano.transferencia || 0)

  const handleImprimir = () => {
    const printWindow = window.open("", "", "width=72mm,height=800")
    if (!printWindow) return

    const denominaciones = resumen.denominaciones?.items || []
    const billetes = denominaciones.filter((d: any) => d.denominacion >= 1)
    const monedas = denominaciones.filter((d: any) => d.denominacion < 1)
    const totalBilletes = billetes.reduce((sum: number, d: any) => sum + d.subtotal, 0)
    const totalMonedas = monedas.reduce((sum: number, d: any) => sum + d.subtotal, 0)

    const fechaCierre = resumen.fechaCierre || new Date().toISOString()
    const esCierreActual = !resumen.fechaCierre || new Date(resumen.fechaCierre).toDateString() === new Date().toDateString()
    const titulo = esCierreActual ? "CIERRE DE CAJA" : "REIMPRESIÓN - CIERRE DE CAJA"

    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>${esCierreActual ? "Cierre de Caja" : "Reimpresión - Cierre de Caja"}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Courier New', monospace; color: #000000; font-weight: bold; }
          body { width: 72mm; margin: 0; padding: 2mm; font-size: 11px; line-height: 1.3; background: white; }
          @media print { @page { size: 72mm auto; margin: 0; } body { width: 72mm !important; } }
          .center { text-align: center; }
          .separator { border: none; border-top: 1px solid #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .total { font-size: 14px; margin: 5px 0; }
          .denom-table { width: 100%; border-collapse: collapse; margin: 3px 0; font-size: 9px; }
          .denom-table td { padding: 1px 0; font-weight: bold; }
          .denom-table td:last-child { text-align: right; }
          .section-title { font-size: 10px; margin-top: 5px; margin-bottom: 2px; }
          .sub-row { margin-left: 8px; font-size: 9px; }
          table { width: 100%; border-collapse: collapse; font-size: 8px; }
          th, td { font-weight: bold; text-align: left; }
          th:last-child, td:last-child { text-align: right; }
          .reimpresion { font-size: 8px; color: #666; text-align: center; margin-top: 5px; border-top: 1px dashed #000; padding-top: 3px; }
        </style>
      </head><body>
        <div class="center" style="font-size:13px">${HOTEL_INFO.nombre}</div>
        <div class="center" style="font-size:9px">${HOTEL_INFO.direccion}</div>
        <div class="center" style="font-size:9px">Tel: ${HOTEL_INFO.telefono}</div>
        <div class="center" style="font-size:9px">RUC: ${HOTEL_INFO.ruc}</div>
        <div class="separator"></div>
        <div class="center">${titulo}</div>
        <div class="separator"></div>
        
        <div class="row"><span>Fecha:</span><span>${new Date(fechaCierre).toLocaleDateString("es-EC")}</span></div>
        <div class="row"><span>Hora:</span><span>${new Date(fechaCierre).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</span></div>
        <div class="row"><span>Operador:</span><span>${resumen.operador}</span></div>
        <div class="separator"></div>
        
        <div class="section-title">DESGLOSE DE INGRESOS</div>
        
        <div class="row"><span>PARQUEO:</span><span>$${d.parqueo.total.toFixed(2)}</span></div>
        <div class="row sub-row"><span>  - Efectivo:</span><span>+$${d.parqueo.efectivo.toFixed(2)}</span></div>
        <div class="row sub-row"><span>  - Tarjeta:</span><span>$${d.parqueo.tarjeta.toFixed(2)}</span></div>
        <div class="row sub-row"><span>  - Transferencia:</span><span>$${d.parqueo.transferencia.toFixed(2)}</span></div>
        
        <div class="row"><span>SERVICIOS:</span><span>$${d.servicios.total.toFixed(2)}</span></div>
        <div class="row sub-row"><span>  - Efectivo:</span><span>+$${d.servicios.efectivo.toFixed(2)}</span></div>
        <div class="row sub-row"><span>  - Tarjeta:</span><span>$${d.servicios.tarjeta.toFixed(2)}</span></div>
        <div class="row sub-row"><span>  - Transferencia:</span><span>$${d.servicios.transferencia.toFixed(2)}</span></div>
        
        ${d.hotel.total > 0 ? `
          <div class="row"><span>HOTEL:</span><span>$${d.hotel.total.toFixed(2)}</span></div>
          <div class="row sub-row"><span>  - Efectivo:</span><span>+$${d.hotel.efectivo.toFixed(2)}</span></div>
          <div class="row sub-row"><span>  - Tarjeta:</span><span>$${d.hotel.tarjeta.toFixed(2)}</span></div>
          <div class="row sub-row"><span>  - Transferencia:</span><span>$${d.hotel.transferencia.toFixed(2)}</span></div>
        ` : ''}
        
        ${d.bano.total > 0 ? `
          <div class="row"><span>BAÑO:</span><span>$${d.bano.total.toFixed(2)}</span></div>
          <div class="row sub-row"><span>  - Efectivo:</span><span>+$${d.bano.efectivo.toFixed(2)}</span></div>
          <div class="row sub-row"><span>  - Tarjeta:</span><span>$${d.bano.tarjeta.toFixed(2)}</span></div>
          <div class="row sub-row"><span>  - Transferencia:</span><span>$${d.bano.transferencia.toFixed(2)}</span></div>
        ` : ''}
        
        ${d.manuales > 0 ? `<div class="row"><span>MANUALES:</span><span>+$${d.manuales.toFixed(2)}</span></div>` : ''}
        ${resumen.totalEgresos ? `<div class="row"><span>EGRESOS (RETIROS):</span><span>-$${resumen.totalEgresos.toFixed(2)}</span></div>` : ''}
        
        <div class="separator"></div>
        
        <div class="row"><span>Monto inicial:</span><span>$${resumen.montoInicial.toFixed(2)}</span></div>
        <div class="row"><span>Total ingresos efectivo:</span><span>+$${resumen.totalIngresos.toFixed(2)}</span></div>
        
        ${resumen.totalEgresos > 0 ? `
          <div class="row"><span>Total egresos:</span><span>-$${resumen.totalEgresos.toFixed(2)}</span></div>
        ` : ''}
        
        <div class="row"><span>SALDO NETO:</span><span>$${(resumen.saldoNeto || resumen.totalIngresos).toFixed(2)}</span></div>
        <div class="separator"></div>
        
        ${denominaciones.length > 0 ? `
          <div class="section-title">DESGLOSE DE EFECTIVO FISICO</div>
          ${billetes.length > 0 ? `
            <div class="section-title">BILLETES</div>
            <table class="denom-table">
              ${billetes.map((d: any) => `<tr><td>$${d.denominacion.toFixed(2)}</td><td>x ${d.cantidad}</td><td>$${d.subtotal.toFixed(2)}</td></tr>`).join('')}
              <tr style="border-top: 1px solid #000;"><td colspan="2">Total billetes:</td><td>$${totalBilletes.toFixed(2)}</td></tr>
            </table>
          ` : ''}
          ${monedas.length > 0 ? `
            <div class="section-title">MONEDAS</div>
            <table class="denom-table">
              ${monedas.map((d: any) => `<tr><td>$${d.denominacion.toFixed(2)}</td><td>x ${d.cantidad}</td><td>$${d.subtotal.toFixed(2)}</td></tr>`).join('')}
              <tr style="border-top: 1px solid #000;"><td colspan="2">Total monedas:</td><td>$${totalMonedas.toFixed(2)}</td></tr>
            </table>
          ` : ''}
          <div class="separator"></div>
        ` : ''}
        
        <div class="row total"><span>MONTO ESPERADO:</span><span>$${resumen.montoEsperado.toFixed(2)}</span></div>
        <div class="row total"><span>MONTO FISICO:</span><span>$${resumen.montoFisico.toFixed(2)}</span></div>
        <div class="row total"><span>TOTAL TARJETA:</span><span>$${totalTarjeta.toFixed(2)}</span></div>
        <div class="row total"><span>TOTAL TRANSFERENCIA:</span><span>$${totalTransferencia.toFixed(2)}</span></div>
        <div class="row"><span>DIFERENCIA:</span><span>${resumen.diferencia >= 0 ? '+' : ''}$${resumen.diferencia.toFixed(2)}</span></div>
        <div class="separator"></div>
        
        <div style="font-size:9px;margin-bottom:2px">MOVIMIENTOS (ultimos 10 de ${resumen.movimientos?.length || 0})</div>
        <table>
          <thead><tr style="border-bottom: 1px solid #000;"><th>Hora</th><th>Tipo</th><th>Descripcion</th><th>Monto</th></tr></thead>
          <tbody>
            ${(resumen.movimientos || []).slice(0, 10).map((m: any) => {
              let tipoTexto = ""
              if (m.tipo === "egreso") tipoTexto = "Retiro"
              else if (m.tipo === "parqueo") tipoTexto = m.metodo_pago === "tarjeta" ? "Pq(T)" : m.metodo_pago === "transferencia" ? "Pq(Tr)" : "Pq"
              else if (m.tipo === "efectivo_manual") tipoTexto = "Manual"
              else if (m.tipo === "servicio") tipoTexto = m.metodo_pago === "tarjeta" ? "Sv(T)" : m.metodo_pago === "transferencia" ? "Sv(Tr)" : "Sv"
              
              const montoDisplay = m.tipo === "egreso" ? `-$${Math.abs(m.monto).toFixed(2)}` : `$${m.monto.toFixed(2)}`
              return `<tr><td>${new Date(m.fecha).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</td><td>${tipoTexto}</td><td>${m.descripcion.substring(0, 12)}</td><td>${montoDisplay}</td></tr>`
            }).join("")}
          </tbody>
        </table>
        
        <div class="separator"></div>
        <div class="center" style="font-size:9px;margin-top:4px">
          <div>Generado: ${new Date().toLocaleString("es-EC")}</div>
          <div>Gracias por su trabajo</div>
        </div>
        ${!esCierreActual ? '<div class="reimpresion">DOCUMENTO REIMPRESO</div>' : ''}
      </body></html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
      setTimeout(() => { if (!printWindow.closed) printWindow.close() }, 1000)
    }, 500)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vista previa del ticket</DialogTitle>
        </DialogHeader>
        <div className="font-mono text-sm space-y-3 border rounded-lg p-4 bg-background max-h-[60vh] overflow-y-auto" style={{ color: 'black', fontWeight: 'bold' }}>
          <div className="text-center border-b-2 border-dashed pb-3">
            <p className="text-lg text-black" style={{fontWeight: 'bold'}}>{HOTEL_INFO.nombre}</p>
            <p className="text-xs text-black" style={{fontWeight: 'bold'}}>{HOTEL_INFO.direccion}</p>
            <p className="text-xs text-black" style={{fontWeight: 'bold'}}>
              {resumen.fechaCierre && new Date(resumen.fechaCierre).toDateString() !== new Date().toDateString() 
                ? "REIMPRESIÓN - CIERRE DE CAJA" 
                : "CIERRE DE CAJA"}
            </p>
            <p className="text-xs text-black" style={{fontWeight: 'bold'}}>{new Date(resumen.fechaCierre || new Date()).toLocaleString("es-EC")}</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm"><span className="text-black" style={{fontWeight: 'bold'}}>Operador:</span><span className="text-black" style={{fontWeight: 'bold'}}>{resumen.operador}</span></div>
            <div className="flex justify-between text-sm"><span className="text-black" style={{fontWeight: 'bold'}}>Monto inicial:</span><span className="text-black" style={{fontWeight: 'bold'}}>${resumen.montoInicial.toFixed(2)}</span></div>
          </div>
          <div className="border-t border-dashed my-2"></div>
          <div className="space-y-2">
            <p className="text-xs text-black" style={{fontWeight: 'bold'}}>DESGLOSE DE INGRESOS</p>
            {(resumen.desglose?.parqueo.total || 0) > 0 && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-sm"><span className="text-black" style={{fontWeight: 'bold'}}>PARQUEO:</span><span className="text-black" style={{fontWeight: 'bold'}}>${(resumen.desglose?.parqueo.total || 0).toFixed(2)}</span></div>
                {(resumen.desglose?.parqueo.efectivo || 0) > 0 && <div className="flex justify-between text-xs pl-2"><span className="text-black" style={{fontWeight: 'bold'}}>  - Efectivo:</span><span className="text-black" style={{fontWeight: 'bold'}}>+${(resumen.desglose?.parqueo.efectivo || 0).toFixed(2)}</span></div>}
                {(resumen.desglose?.parqueo.tarjeta || 0) > 0 && <div className="flex justify-between text-xs pl-2"><span className="text-black" style={{fontWeight: 'bold'}}>  - Tarjeta:</span><span className="text-black" style={{fontWeight: 'bold'}}>${(resumen.desglose?.parqueo.tarjeta || 0).toFixed(2)}</span></div>}
                {(resumen.desglose?.parqueo.transferencia || 0) > 0 && <div className="flex justify-between text-xs pl-2"><span className="text-black" style={{fontWeight: 'bold'}}>  - Transferencia:</span><span className="text-black" style={{fontWeight: 'bold'}}>${(resumen.desglose?.parqueo.transferencia || 0).toFixed(2)}</span></div>}
              </div>
            )}
            {(resumen.desglose?.servicios.total || 0) > 0 && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-sm"><span className="text-black" style={{fontWeight: 'bold'}}>SERVICIOS:</span><span className="text-black" style={{fontWeight: 'bold'}}>${(resumen.desglose?.servicios.total || 0).toFixed(2)}</span></div>
                {(resumen.desglose?.servicios.efectivo || 0) > 0 && <div className="flex justify-between text-xs pl-2"><span className="text-black" style={{fontWeight: 'bold'}}>  - Efectivo:</span><span className="text-black" style={{fontWeight: 'bold'}}>+${(resumen.desglose?.servicios.efectivo || 0).toFixed(2)}</span></div>}
                {(resumen.desglose?.servicios.tarjeta || 0) > 0 && <div className="flex justify-between text-xs pl-2"><span className="text-black" style={{fontWeight: 'bold'}}>  - Tarjeta:</span><span className="text-black" style={{fontWeight: 'bold'}}>${(resumen.desglose?.servicios.tarjeta || 0).toFixed(2)}</span></div>}
                {(resumen.desglose?.servicios.transferencia || 0) > 0 && <div className="flex justify-between text-xs pl-2"><span className="text-black" style={{fontWeight: 'bold'}}>  - Transferencia:</span><span className="text-black" style={{fontWeight: 'bold'}}>${(resumen.desglose?.servicios.transferencia || 0).toFixed(2)}</span></div>}
              </div>
            )}
          </div>
          <div className="border-t border-dashed my-2"></div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm"><span className="text-black" style={{fontWeight: 'bold'}}>Total ingresos efectivo:</span><span className="text-black" style={{fontWeight: 'bold'}}>+$${resumen.totalIngresos.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-black" style={{fontWeight: 'bold'}}>SALDO NETO:</span><span className="text-black" style={{fontWeight: 'bold'}}>$${(resumen.saldoNeto || resumen.totalIngresos).toFixed(2)}</span></div>
          </div>
          <div className="border-t-2 border-dashed my-2"></div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm"><span className="text-black" style={{fontWeight: 'bold'}}>Monto esperado:</span><span className="text-black" style={{fontWeight: 'bold'}}>$${resumen.montoEsperado.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-black" style={{fontWeight: 'bold'}}>Monto fisico:</span><span className="text-black" style={{fontWeight: 'bold'}}>$${resumen.montoFisico.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-black" style={{fontWeight: 'bold'}}>Total tarjeta:</span><span className="text-black" style={{fontWeight: 'bold'}}>$${totalTarjeta.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-black" style={{fontWeight: 'bold'}}>Total transferencia:</span><span className="text-black" style={{fontWeight: 'bold'}}>$${totalTransferencia.toFixed(2)}</span></div>
            <div className="flex justify-between text-base"><span className="text-black" style={{fontWeight: 'bold'}}>Diferencia:</span><span className="text-black" style={{fontWeight: 'bold'}}>{resumen.diferencia >= 0 ? '+' : ''}{resumen.diferencia.toFixed(2)}</span></div>
          </div>
          {resumen.fechaCierre && new Date(resumen.fechaCierre).toDateString() !== new Date().toDateString() && (
            <div className="text-center text-xs text-muted-foreground border-t border-dashed pt-2 mt-2">
              DOCUMENTO REIMPRESO
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
          <Button onClick={handleImprimir} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}