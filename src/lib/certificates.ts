import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatDate } from './utils';
import { Member, Contribution, Organization } from './db';

export function generateDonationCertificate(
  organization: Organization,
  member: Member,
  contributions: Contribution[],
  year: number
) {
  const doc = new jsPDF('p', 'pt', 'letter');
  const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0);

  // Header
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text(organization.name, 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`NIT: ${organization.tax_id}`, 105, 27, { align: 'center' });
  doc.text(`${organization.settings?.address || ''} | ${organization.settings?.phone || ''}`, 105, 32, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(20, 40, 190, 40);

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO DE DONACIONES', 105, 55, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`AÑO GRAVABLE ${year}`, 105, 62, { align: 'center' });

  // Body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const bodyText = `La organización ${organization.name} certifica que el señor(a) ${member.full_name}, identificado(a) con documento No. ${member.document_id || 'N/A'}, realizó donaciones durante el año ${year} por un valor total de:`;

  const splitText = doc.splitTextToSize(bodyText, 170);
  doc.text(splitText, 20, 80);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`$ ${formatCurrency(totalAmount)}`, 105, 105, { align: 'center' });

  // Table of details
  const tableData = contributions.map(c => [
    formatDate(c.date),
    c.category,
    c.method,
    `$ ${formatCurrency(c.amount)}`
  ]);

  (doc as any).autoTable({
    startY: 115,
    head: [['Fecha', 'Categoría', 'Método', 'Monto']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillStyle: [59, 130, 246] }
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.cursor.y + 30;
  doc.line(20, finalY, 80, finalY);
  doc.text('Firma Autorizada', 20, finalY + 5);

  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`Generado el ${formatDate(new Date().toISOString())} por Cifrix`, 105, 260, { align: 'center' });

  doc.save(`Certificado_${member.full_name.replace(/\s+/g, '_')}_${year}.pdf`);
}
