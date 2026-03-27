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
            logo_url?: string;
            signatures?: { 
              name: string; 
              role: string; 
              id_number?: string; 
              tp_number?: string;
              signature_base64?: string;
            }[];
        }
    ) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginHeader = 20;

        // 1. Portada
        if (options.logo_url) {
            try {
                doc.addImage(options.logo_url, 'PNG', (pageWidth / 2) - 40, 40, 80, 80);
            } catch (e) {}
        }
        
        let yPos = 140;

        doc.setFontSize(22); // Mas presencia al nombre
        doc.setTextColor(30, 41, 59);
        doc.text(options.organizationName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
        
        doc.setFontSize(16); // Un poco mas pequeño
        doc.text(options.title, pageWidth / 2, yPos, { align: 'center' });
        yPos += 12;
        
        doc.setFontSize(11); // Un poco mas pequeño
        doc.setTextColor(71, 85, 105);
        doc.text(options.period, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
        
        if (options.normativo) {
            doc.setFontSize(10);
            doc.text(`Marco Normativo: ${options.normativo}`, pageWidth / 2, yPos, { align: 'center' });
        }

        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text('Generado automáticamente por Cifrix Contable', pageWidth / 2, pageHeight - 30, { align: 'center' });

        // 2. Páginas de Reportes
        for (const report of reportData) {
            doc.addPage();
            yPos = 20;

            if (options.logo_url) {
                try {
                    doc.addImage(options.logo_url, 'PNG', marginHeader, yPos, 40, 40);
                } catch (e) {}
            }

            const textX = options.logo_url ? marginHeader + 50 : marginHeader;

            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text(report.organizationName.toUpperCase(), textX, yPos + 15);
            
            doc.setFontSize(12);
            doc.text(report.sections[0]?.title || 'REPORTE FINANCIERO', textX, yPos + 25);
            
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.text(report.period, textX, yPos + 35);
            yPos += 55;

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
                    styles: { fontSize: 8 }, // 8pt para uniformidad
                    margin: { left: 20, right: 20 },
                    didDrawPage: (data) => {
                        yPos = data.cursor?.y || yPos;
                    }
                });

                yPos = (doc as any).lastAutoTable.finalY + 10;

                if (yPos > 260) {
                    doc.addPage();
                    yPos = 20;
                }
            }
        }

        // 3. Notas
        if (notes.length > 0) {
            doc.addPage();
            doc.setFontSize(16);
            doc.setTextColor(30, 41, 59);
            doc.text('NOTAS A LOS ESTADOS FINANCIEROS', 20, 20);
            yPos = 35;

            notes.sort((a, b) => a.order - b.order).forEach((note) => {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`${note.title}`, 20, yPos);
                yPos += 7;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
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
        yPos = 60;
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('CERTIFICACIÓN Y FIRMAS', 105, 30, { align: 'center' });

        const sigs = options.signatures || [];
        const sigWidth = 70;
        const spacing = 20;
        let xPos = 20;

        sigs.forEach((sig) => {
            if (xPos + sigWidth > pageWidth - 20) {
                xPos = 20;
                yPos += 80;
            }

            // Imagen de firma
            if (sig.signature_base64) {
              try {
                doc.addImage(sig.signature_base64, 'PNG', xPos + 5, yPos - 45, 60, 30);
              } catch (e) {}
            }

            // Línea
            doc.setDrawColor(200);
            doc.line(xPos, yPos - 10, xPos + sigWidth, yPos - 10);

            // Texto
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(sig.name.toUpperCase(), xPos, yPos);
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(sig.role, xPos, yPos + 5);
            
            if (sig.id_number) doc.text(`Doc: ${sig.id_number}`, xPos, yPos + 10);
            if (sig.tp_number) doc.text(`T.P: ${sig.tp_number}`, xPos, yPos + 10);

            xPos += sigWidth + spacing;
        });

        doc.save(`${options.title.replace(/ /g, '_')}_${options.period.replace(/ /g, '_')}.pdf`);
    }
}

export const financialExportService = new FinancialExportService();
