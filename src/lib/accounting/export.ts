import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FinancialReportData } from './reports';
import { FinancialNote } from '../db';

export class FinancialExportService {
    async generatePDF(
        reportData: FinancialReportData[],
        notes: FinancialNote[],
        options: {
            title: string;
            organizationName: string;
            period: string;
            normativo?: string;
            signatures?: { name: string; role: string }[];
        }
    ) {
        const doc = new jsPDF();
        let yPos = 20;

        // 1. Portada
        doc.setFontSize(22);
        doc.text(options.organizationName, 105, yPos, { align: 'center' });
        yPos += 15;
        doc.setFontSize(18);
        doc.text(options.title, 105, yPos, { align: 'center' });
        yPos += 10;
        doc.setFontSize(12);
        doc.text(options.period, 105, yPos, { align: 'center' });
        yPos += 10;
        if (options.normativo) {
            doc.text(`Bajo Normatividad: ${options.normativo}`, 105, yPos, { align: 'center' });
            yPos += 10;
        }

        doc.setFontSize(10);
        doc.text('Generado por Cifrix - Software Contable Inteligente', 105, 280, { align: 'center' });

        // 2. Páginas de Reportes
        for (const report of reportData) {
            doc.addPage();
            yPos = 20;
            doc.setFontSize(16);
            doc.text(report.organizationName, 20, yPos);
            yPos += 8;
            doc.setFontSize(14);
            doc.text(report.sections[0]?.title || 'REPORTE FINANCIERO', 20, yPos);
            yPos += 6;
            doc.setFontSize(10);
            doc.text(report.period, 20, yPos);
            yPos += 10;

            for (const section of report.sections) {
                doc.setFontSize(12);
                doc.setTextColor(0, 51, 102);
                doc.text(section.title, 20, yPos);
                yPos += 5;

                const tableData: any[] = [];
                for (const group of section.groups) {
                    tableData.push([{ content: group.name, colSpan: 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
                    group.accounts.forEach(acc => {
                        tableData.push([
                            `${acc.code} ${acc.name}`,
                            { content: acc.balance.toLocaleString('es-CO', { minimumFractionDigits: 2 }), styles: { halign: 'right' } }
                        ]);
                    });
                    tableData.push([
                        { content: `Total ${group.name}`, styles: { fontStyle: 'bold' } },
                        { content: group.total.toLocaleString('es-CO', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } }
                    ]);
                }

                autoTable(doc, {
                    startY: yPos,
                    head: [['Descripción', 'Saldo']],
                    body: tableData,
                    theme: 'striped',
                    styles: { fontSize: 8 },
                    margin: { left: 20, right: 20 },
                    didDrawPage: (data) => {
                        yPos = data.cursor?.y || yPos;
                    }
                });

                yPos = (doc as any).lastAutoTable.finalY + 10;

                // Nueva página si es necesario
                if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                }
            }
        }

        // 3. Notas
        if (notes.length > 0) {
            doc.addPage();
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('NOTAS A LOS ESTADOS FINANCIEROS', 20, 20);
            yPos = 35;

            notes.sort((a, b) => a.order - b.order).forEach((note, index) => {
                doc.setFontSize(12);
                doc.setFont('', 'bold');
                doc.text(`${note.title}`, 20, yPos);
                yPos += 7;
                doc.setFontSize(10);
                doc.setFont('', 'normal');
                const splitContent = doc.splitTextToSize(note.content, 170);
                doc.text(splitContent, 20, yPos);
                yPos += (splitContent.length * 5) + 10;

                if (yPos > 260) {
                    doc.addPage();
                    yPos = 20;
                }
            });
        }

        // 4. Firmas
        doc.addPage();
        yPos = 50;
        doc.setFontSize(12);
        doc.text('CERTIFICACIÓN Y FIRMAS', 105, 30, { align: 'center' });

        const sigs = options.signatures || [
            { name: '__________________________', role: 'Representante Legal' },
            { name: '__________________________', role: 'Contador Público' },
            { name: '__________________________', role: 'Revisor Fiscal' }
        ];

        let xPos = 40;
        sigs.forEach((sig, i) => {
            doc.text(sig.name, xPos, yPos);
            doc.text(sig.role, xPos, yPos + 10);
            xPos += 60;
            if (xPos > 160) {
                xPos = 40;
                yPos += 40;
            }
        });

        doc.save(`${options.title.replace(/ /g, '_')}_${options.period.replace(/ /g, '_')}.pdf`);
    }
}

export const financialExportService = new FinancialExportService();
