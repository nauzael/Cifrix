/**
 * Generador de Reportes PDF para Declaraciones de Renta
 * Crea documentos profesionales con el detalle completo de la declaración
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { db, DeclaracionRenta, IngresoRenta, DeduccionRenta } from '../../db';
import { rentaCalculator, ResultadoCalculo } from '../calculator';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
        lastAutoTable: {
            finalY: number;
        };
    }
}

export interface OpcionesPDF {
    incluirDetalle: boolean;
    incluirCalculos: boolean;
    incluirGraficos: boolean;
    logoEmpresa?: string; // Base64 o URL
}

/**
 * Generador de PDFs para declaraciones de renta
 */
export class RentaPDFGenerator {
    private readonly MARGIN = 20;
    private readonly PAGE_WIDTH = 210; // A4 width in mm
    private readonly PAGE_HEIGHT = 297; // A4 height in mm

    /**
     * Genera un PDF completo de la declaración
     */
    async generarReporte(
        declaracionId: string,
        opciones: OpcionesPDF = { incluirDetalle: true, incluirCalculos: true, incluirGraficos: false }
    ): Promise<Blob> {
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

        // Crear documento
        const doc = new jsPDF();
        let currentY = this.MARGIN;

        // 1. Encabezado
        currentY = this.agregarEncabezado(doc, declaracion, currentY);

        // 2. Datos del contribuyente
        currentY = this.agregarDatosContribuyente(doc, declaracion, currentY);

        // 3. Resumen de la declaración
        currentY = this.agregarResumen(doc, declaracion, resultado, currentY);

        // 4. Detalle de ingresos (si se solicita)
        if (opciones.incluirDetalle && ingresos.length > 0) {
            currentY = this.agregarDetalleIngresos(doc, ingresos, currentY);
        }

        // 5. Detalle de deducciones (si se solicita)
        if (opciones.incluirDetalle && deducciones.length > 0) {
            currentY = this.agregarDetalleDeducciones(doc, deducciones, currentY);
        }

        // 6. Detalle de cálculos (si se solicita)
        if (opciones.incluirCalculos) {
            currentY = this.agregarDetalleCalculos(doc, resultado, currentY);
        }

        // 7. Pie de página
        this.agregarPiePagina(doc);

        return doc.output('blob');
    }

    /**
     * Agrega el encabezado del documento
     */
    private agregarEncabezado(doc: jsPDF, declaracion: DeclaracionRenta, y: number): number {
        // Título principal
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('DECLARACIÓN DE RENTA', this.PAGE_WIDTH / 2, y, { align: 'center' });
        y += 10;

        // Subtítulo
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(`Período Fiscal ${declaracion.periodo_fiscal}`, this.PAGE_WIDTH / 2, y, { align: 'center' });
        y += 5;

        // Estado
        doc.setFontSize(10);
        const colorEstado = this.getColorEstado(declaracion.estado);
        doc.setTextColor(colorEstado.r, colorEstado.g, colorEstado.b);
        doc.text(`Estado: ${declaracion.estado}`, this.PAGE_WIDTH / 2, y, { align: 'center' });
        doc.setTextColor(0, 0, 0); // Reset color
        y += 15;

        return y;
    }

    /**
     * Agrega datos del contribuyente
     */
    private agregarDatosContribuyente(doc: jsPDF, declaracion: DeclaracionRenta, y: number): number {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Datos del Contribuyente', this.MARGIN, y);
        y += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const datos = [
            ['NIT/Cédula:', declaracion.contribuyente_id],
            ['Nombre:', declaracion.contribuyente_nombre],
            ['Fecha de creación:', new Date(declaracion.fecha_creacion).toLocaleDateString('es-CO')],
        ];

        if (declaracion.fecha_presentacion) {
            datos.push(['Fecha de presentación:', new Date(declaracion.fecha_presentacion).toLocaleDateString('es-CO')]);
        }

        datos.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, this.MARGIN, y);
            doc.setFont('helvetica', 'normal');
            doc.text(value, this.MARGIN + 50, y);
            y += 6;
        });

        y += 5;
        return y;
    }

    /**
     * Agrega resumen de la declaración
     */
    private agregarResumen(doc: jsPDF, declaracion: DeclaracionRenta, resultado: ResultadoCalculo, y: number): number {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen de la Declaración', this.MARGIN, y);
        y += 10;

        const tableData = [
            ['Concepto', 'Valor'],
            ['Total Ingresos', this.formatMoney(declaracion.total_ingresos)],
            ['Total Costos', this.formatMoney(declaracion.total_costos)],
            ['Total Gastos', this.formatMoney(declaracion.total_gastos)],
            ['Total Deducciones', this.formatMoney(declaracion.total_deducciones)],
            ['Renta Líquida', this.formatMoney(resultado.detalleCalculo.rentaLiquida)],
            ['Mínimo No Gravable (95 UVT)', this.formatMoney(resultado.detalleCalculo.minimoNoGravable)],
            ['Base Gravable', this.formatMoney(declaracion.base_gravable)],
            ['Base Gravable (UVT)', resultado.baseGravableUVT.toFixed(2) + ' UVT'],
            ['Impuesto Calculado', this.formatMoney(declaracion.impuesto_calculado)],
            ['Créditos Tributarios', this.formatMoney(declaracion.creditos_tributarios)],
            ['Impuesto Neto a Pagar', this.formatMoney(declaracion.impuesto_neto)],
        ];

        doc.autoTable({
            startY: y,
            head: [tableData[0]],
            body: tableData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' }
            },
            didParseCell: (data: any) => {
                // Resaltar impuesto neto
                if (data.row.index === tableData.length - 2 && data.column.index === 1) {
                    data.cell.styles.fillColor = [46, 204, 113];
                    data.cell.styles.textColor = 255;
                    data.cell.styles.fontSize = 11;
                }
            }
        });

        return doc.lastAutoTable.finalY + 10;
    }

    /**
     * Agrega detalle de ingresos
     */
    private agregarDetalleIngresos(doc: jsPDF, ingresos: IngresoRenta[], y: number): number {
        // Verificar si necesitamos nueva página
        if (y > this.PAGE_HEIGHT - 60) {
            doc.addPage();
            y = this.MARGIN;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalle de Ingresos', this.MARGIN, y);
        y += 10;

        const tableData = ingresos.map(ing => [
            ing.tipo_ingreso,
            ing.concepto,
            ing.mes ? `Mes ${ing.mes}` : 'Anual',
            this.formatMoney(ing.monto),
            this.formatMoney(ing.retencion_aplicada)
        ]);

        doc.autoTable({
            startY: y,
            head: [['Tipo', 'Concepto', 'Período', 'Monto', 'Retención']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [52, 152, 219], textColor: 255 },
            styles: { fontSize: 8 },
            columnStyles: {
                3: { halign: 'right' },
                4: { halign: 'right' }
            }
        });

        return doc.lastAutoTable.finalY + 10;
    }

    /**
     * Agrega detalle de deducciones
     */
    private agregarDetalleDeducciones(doc: jsPDF, deducciones: DeduccionRenta[], y: number): number {
        // Verificar si necesitamos nueva página
        if (y > this.PAGE_HEIGHT - 60) {
            doc.addPage();
            y = this.MARGIN;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalle de Deducciones', this.MARGIN, y);
        y += 10;

        const tableData = deducciones.map(ded => [
            ded.tipo_deduccion,
            ded.concepto,
            this.formatMoney(ded.monto),
            this.formatMoney(ded.monto_deducido || ded.monto),
            ded.documento_soporte || 'N/A'
        ]);

        doc.autoTable({
            startY: y,
            head: [['Tipo', 'Concepto', 'Solicitado', 'Deducido', 'Soporte']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [155, 89, 182], textColor: 255 },
            styles: { fontSize: 8 },
            columnStyles: {
                2: { halign: 'right' },
                3: { halign: 'right' }
            }
        });

        return doc.lastAutoTable.finalY + 10;
    }

    /**
     * Agrega detalle de cálculos por tramos
     */
    private agregarDetalleCalculos(doc: jsPDF, resultado: ResultadoCalculo, y: number): number {
        // Verificar si necesitamos nueva página
        if (y > this.PAGE_HEIGHT - 60) {
            doc.addPage();
            y = this.MARGIN;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalle de Cálculo por Tramos', this.MARGIN, y);
        y += 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tramo aplicado: ${resultado.detalleCalculo.tramoAplicado}`, this.MARGIN, y);
        y += 5;
        doc.text(`Tarifa efectiva: ${resultado.detalleCalculo.tarifaEfectiva.toFixed(2)}%`, this.MARGIN, y);
        y += 10;

        const tableData = resultado.detalleCalculo.calculoPorTramos.map(tramo => [
            tramo.tramo,
            this.formatMoney(tramo.baseTramo),
            `${tramo.tarifa.toFixed(0)}%`,
            this.formatMoney(tramo.impuestoTramo)
        ]);

        doc.autoTable({
            startY: y,
            head: [['Tramo (UVT)', 'Base en Tramo', 'Tarifa', 'Impuesto']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [230, 126, 34], textColor: 255 },
            styles: { fontSize: 8 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'center' },
                3: { halign: 'right' }
            }
        });

        return doc.lastAutoTable.finalY + 10;
    }

    /**
     * Agrega pie de página
     */
    private agregarPiePagina(doc: jsPDF): void {
        const pageCount = doc.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            // Línea separadora
            doc.setDrawColor(200, 200, 200);
            doc.line(this.MARGIN, this.PAGE_HEIGHT - 15, this.PAGE_WIDTH - this.MARGIN, this.PAGE_HEIGHT - 15);

            // Texto del pie
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(128, 128, 128);

            const fechaGeneracion = new Date().toLocaleString('es-CO');
            doc.text(`Generado por Cifrix - ${fechaGeneracion}`, this.MARGIN, this.PAGE_HEIGHT - 10);
            doc.text(`Página ${i} de ${pageCount}`, this.PAGE_WIDTH - this.MARGIN, this.PAGE_HEIGHT - 10, { align: 'right' });

            doc.setTextColor(0, 0, 0); // Reset color
        }
    }

    /**
     * Obtiene color según estado
     */
    private getColorEstado(estado: string): { r: number; g: number; b: number } {
        switch (estado) {
            case 'BORRADOR':
                return { r: 241, g: 196, b: 15 }; // Amarillo
            case 'PRESENTADA':
                return { r: 46, g: 204, b: 113 }; // Verde
            case 'CORREGIDA':
                return { r: 52, g: 152, b: 219 }; // Azul
            case 'ANULADA':
                return { r: 231, g: 76, b: 60 }; // Rojo
            default:
                return { r: 149, g: 165, b: 166 }; // Gris
        }
    }

    /**
     * Formatea un valor monetario
     */
    private formatMoney(value: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    }
}

/**
 * Instancia singleton del generador
 */
export const rentaPDFGenerator = new RentaPDFGenerator();
