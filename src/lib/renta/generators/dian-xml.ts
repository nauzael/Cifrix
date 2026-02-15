/**
 * Generador de Formatos XML para DIAN
 * Crea archivos XML compatibles con los formatos oficiales de la DIAN
 */

import { db, DeclaracionRenta, IngresoRenta, DeduccionRenta } from '../../db';
import { rentaCalculator } from '../calculator';

/**
 * Generador de XML para declaraciones de renta
 */
export class DIANXMLGenerator {
    /**
     * Genera XML en formato DIAN para declaración de renta
     */
    async generarXML(declaracionId: string): Promise<string> {
        // Cargar datos
        const declaracion = await db.declaraciones_renta.get(declaracionId);
        if (!declaracion) {
            throw new Error('Declaración no encontrada');
        }

        const ingresos = await db.ingresos_renta
            .where({ declaracion_id: declaracionId })
            .toArray();

        const deducciones = await db.deducciones_renta
            .where({ declaracion_id: declaracionId })
            .toArray();

        // Calcular impuestos
        const resultado = rentaCalculator.calcularImpuesto(declaracion);

        // Construir XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<DeclaracionRenta xmlns="http://www.dian.gov.co/schemas/renta" version="1.0">\n';

        // Información general
        xml += this.generarSeccionGeneral(declaracion);

        // Datos del declarante
        xml += this.generarSeccionDeclarante(declaracion);

        // Ingresos
        xml += this.generarSeccionIngresos(ingresos, declaracion.total_ingresos);

        // Costos y gastos
        xml += this.generarSeccionCostosGastos(declaracion);

        // Deducciones
        xml += this.generarSeccionDeducciones(deducciones, declaracion.total_deducciones);

        // Liquidación del impuesto
        xml += this.generarSeccionLiquidacion(declaracion, resultado);

        xml += '</DeclaracionRenta>';

        return xml;
    }

    /**
     * Genera sección de información general
     */
    private generarSeccionGeneral(declaracion: DeclaracionRenta): string {
        let xml = '  <InformacionGeneral>\n';
        xml += `    <PeriodoFiscal>${declaracion.periodo_fiscal}</PeriodoFiscal>\n`;
        xml += `    <TipoDeclaracion>${this.mapearTipoDeclaracion(declaracion.estado)}</TipoDeclaracion>\n`;
        xml += `    <FechaPresentacion>${declaracion.fecha_presentacion || ''}</FechaPresentacion>\n`;
        xml += `    <NumeroFormulario>110</NumeroFormulario>\n`;
        xml += '  </InformacionGeneral>\n';
        return xml;
    }

    /**
     * Genera sección del declarante
     */
    private generarSeccionDeclarante(declaracion: DeclaracionRenta): string {
        let xml = '  <Declarante>\n';
        xml += `    <Identificacion>\n`;
        xml += `      <TipoDocumento>${this.detectarTipoDocumento(declaracion.contribuyente_id)}</TipoDocumento>\n`;
        xml += `      <NumeroDocumento>${this.limpiarNIT(declaracion.contribuyente_id)}</NumeroDocumento>\n`;
        xml += `    </Identificacion>\n`;
        xml += `    <RazonSocial>${this.escaparXML(declaracion.contribuyente_nombre)}</RazonSocial>\n`;
        xml += '  </Declarante>\n';
        return xml;
    }

    /**
     * Genera sección de ingresos
     */
    private generarSeccionIngresos(ingresos: IngresoRenta[], total: number): string {
        let xml = '  <Ingresos>\n';

        // Agrupar por tipo
        const ingresosPorTipo = this.agruparPorTipo(ingresos);

        for (const [tipo, items] of Object.entries(ingresosPorTipo)) {
            const totalTipo = items.reduce((sum, ing) => sum + ing.monto, 0);
            xml += `    <${tipo}>\n`;
            xml += `      <Valor>${this.formatearNumero(totalTipo)}</Valor>\n`;

            // Detalle de cada ingreso
            items.forEach((ing, index) => {
                xml += `      <Detalle${index + 1}>\n`;
                xml += `        <Concepto>${this.escaparXML(ing.concepto)}</Concepto>\n`;
                xml += `        <Monto>${this.formatearNumero(ing.monto)}</Monto>\n`;
                if (ing.retencion_aplicada > 0) {
                    xml += `        <Retencion>${this.formatearNumero(ing.retencion_aplicada)}</Retencion>\n`;
                }
                xml += `      </Detalle${index + 1}>\n`;
            });

            xml += `    </${tipo}>\n`;
        }

        xml += `    <TotalIngresos>${this.formatearNumero(total)}</TotalIngresos>\n`;
        xml += '  </Ingresos>\n';
        return xml;
    }

    /**
     * Genera sección de costos y gastos
     */
    private generarSeccionCostosGastos(declaracion: DeclaracionRenta): string {
        let xml = '  <CostosGastos>\n';
        xml += `    <TotalCostos>${this.formatearNumero(declaracion.total_costos)}</TotalCostos>\n`;
        xml += `    <TotalGastos>${this.formatearNumero(declaracion.total_gastos)}</TotalGastos>\n`;
        xml += '  </CostosGastos>\n';
        return xml;
    }

    /**
     * Genera sección de deducciones
     */
    private generarSeccionDeducciones(deducciones: DeduccionRenta[], total: number): string {
        let xml = '  <Deducciones>\n';

        deducciones.forEach((ded, index) => {
            xml += `    <Deduccion${index + 1}>\n`;
            xml += `      <Tipo>${ded.tipo_deduccion}</Tipo>\n`;
            xml += `      <Concepto>${this.escaparXML(ded.concepto)}</Concepto>\n`;
            xml += `      <MontoSolicitado>${this.formatearNumero(ded.monto)}</MontoSolicitado>\n`;
            xml += `      <MontoDeducido>${this.formatearNumero(ded.monto_deducido || ded.monto)}</MontoDeducido>\n`;
            if (ded.documento_soporte) {
                xml += `      <DocumentoSoporte>${this.escaparXML(ded.documento_soporte)}</DocumentoSoporte>\n`;
            }
            xml += `    </Deduccion${index + 1}>\n`;
        });

        xml += `    <TotalDeducciones>${this.formatearNumero(total)}</TotalDeducciones>\n`;
        xml += '  </Deducciones>\n';
        return xml;
    }

    /**
     * Genera sección de liquidación del impuesto
     */
    private generarSeccionLiquidacion(declaracion: DeclaracionRenta, resultado: any): string {
        let xml = '  <LiquidacionImpuesto>\n';
        xml += `    <RentaLiquida>${this.formatearNumero(resultado.detalleCalculo.rentaLiquida)}</RentaLiquida>\n`;
        xml += `    <MinimoNoGravable>${this.formatearNumero(resultado.detalleCalculo.minimoNoGravable)}</MinimoNoGravable>\n`;
        xml += `    <BaseGravable>${this.formatearNumero(declaracion.base_gravable)}</BaseGravable>\n`;
        xml += `    <BaseGravableUVT>${resultado.baseGravableUVT.toFixed(2)}</BaseGravableUVT>\n`;
        xml += `    <ImpuestoCalculado>${this.formatearNumero(declaracion.impuesto_calculado)}</ImpuestoCalculado>\n`;
        xml += `    <CreditosTributarios>${this.formatearNumero(declaracion.creditos_tributarios)}</CreditosTributarios>\n`;
        xml += `    <ImpuestoNeto>${this.formatearNumero(declaracion.impuesto_neto)}</ImpuestoNeto>\n`;
        xml += `    <TarifaEfectiva>${resultado.detalleCalculo.tarifaEfectiva.toFixed(2)}</TarifaEfectiva>\n`;
        xml += '  </LiquidacionImpuesto>\n';
        return xml;
    }

    /**
     * Agrupa ingresos por tipo
     */
    private agruparPorTipo(ingresos: IngresoRenta[]): Record<string, IngresoRenta[]> {
        return ingresos.reduce((acc, ing) => {
            const tipo = ing.tipo_ingreso;
            if (!acc[tipo]) {
                acc[tipo] = [];
            }
            acc[tipo].push(ing);
            return acc;
        }, {} as Record<string, IngresoRenta[]>);
    }

    /**
     * Mapea el estado de la declaración al tipo DIAN
     */
    private mapearTipoDeclaracion(estado: string): string {
        switch (estado) {
            case 'PRESENTADA':
                return 'ORIGINAL';
            case 'CORREGIDA':
                return 'CORRECCION';
            default:
                return 'BORRADOR';
        }
    }

    /**
     * Detecta el tipo de documento
     */
    private detectarTipoDocumento(nit: string): string {
        const nitLimpio = this.limpiarNIT(nit);
        return nitLimpio.length === 9 || nitLimpio.length === 10 ? 'NIT' : 'CC';
    }

    /**
     * Limpia el NIT/Cédula
     */
    private limpiarNIT(nit: string): string {
        return nit.replace(/[.\-\s]/g, '');
    }

    /**
     * Escapa caracteres especiales para XML
     */
    private escaparXML(texto: string): string {
        return texto
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Formatea números para XML (sin separadores de miles, 2 decimales)
     */
    private formatearNumero(valor: number): string {
        return valor.toFixed(2);
    }
}

/**
 * Instancia singleton del generador
 */
export const dianXMLGenerator = new DIANXMLGenerator();
