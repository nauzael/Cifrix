/**
 * Parser de archivos de exógenas (DIAN XML, CSV, XLSX)
 * Permite convertir archivos de reportes de terceros en datos estructurados
 */

import { Exogeno } from '@/lib/db';

export interface ExogenoRow {
    nit_contribuyente: string;
    nombre_contribuyente: string;
    concepto: string;
    monto: number;
    tipo_exogeno: '0210' | '0220' | '0230' | '0240' | '0250' | '0260';
}

export class ExogenosParser {
    /**
     * Procesa un archivo XML de la DIAN (Formato estándar)
     */
    async parseDIANXml(content: string): Promise<ExogenoRow[]> {
        // Implementación básica de parsing XML
        const rows: ExogenoRow[] = [];

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');

            const records = xmlDoc.getElementsByTagName('record');
            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                rows.push({
                    nit_contribuyente: record.getAttribute('nit') || '',
                    nombre_contribuyente: record.getAttribute('nombre') || '',
                    concepto: record.getAttribute('concepto') || '',
                    monto: parseFloat(record.getAttribute('valor') || '0'),
                    tipo_exogeno: '0210' // Default type for now, real parser would map this
                });
            }
        } catch (error) {
            console.error('Error parsing DIAN XML:', error);
            throw new Error('Formato XML de la DIAN inválido o no soportado');
        }

        return rows;
    }

    /**
     * Procesa un archivo CSV
     */
    async parseCSV(content: string): Promise<ExogenoRow[]> {
        const rows: ExogenoRow[] = [];
        const lines = content.split('\n');

        // Asumimos primera línea es header: NIT,NOMBRE,CONCEPTO,VALOR,TIPO
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const [nit, nombre, concepto, valor, tipo] = line.split(',');
            rows.push({
                nit_contribuyente: nit?.trim(),
                nombre_contribuyente: nombre?.trim(),
                concepto: concepto?.trim(),
                monto: parseFloat(valor?.trim() || '0'),
                tipo_exogeno: '0210' // Default type
            });
        }

        return rows;
    }

    /**
     * Helper para identificar el tipo de archivo y procesarlo
     */
    async parseFile(file: File): Promise<ExogenoRow[]> {
        const content = await file.text();
        const extension = file.name.split('.').pop()?.toLowerCase();

        switch (extension) {
            case 'xml':
                return this.parseDIANXml(content);
            case 'csv':
                return this.parseCSV(content);
            default:
                throw new Error(`Extensión .${extension} no soportada. Use XML o CSV.`);
        }
    }
}

export const exogenosParser = new ExogenosParser();
