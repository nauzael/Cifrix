/**
 * Parser de archivos de exógenas (DIAN XML, CSV, XLSX)
 * Permite convertir archivos de reportes de terceros en datos estructurados
 */

import { Exogeno } from '@/lib/db';

export interface ExogenoRow {
    nit_tercero: string;
    nombre_tercero: string;
    concepto: string;
    valor: number;
    tipo_movimiento: 'INGRESO' | 'EGRESO' | 'PASIVO' | 'ACTIVO';
}

export class ExogenosParser {
    /**
     * Procesa un archivo XML de la DIAN (Formato estándar)
     */
    async parseDIANXml(content: string): Promise<ExogenoRow[]> {
        // Implementación básica de parsing XML
        // En un entorno productivo se usaría una librería como xml2js
        const rows: ExogenoRow[] = [];

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');

            // Ejemplo de estructura DIAN (simplificada)
            const records = xmlDoc.getElementsByTagName('record');
            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                rows.push({
                    nit_tercero: record.getAttribute('nit') || '',
                    nombre_tercero: record.getAttribute('nombre') || '',
                    concepto: record.getAttribute('concepto') || '',
                    valor: parseFloat(record.getAttribute('valor') || '0'),
                    tipo_movimiento: (record.getAttribute('tipo') as any) || 'INGRESO'
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
                nit_tercero: nit?.trim(),
                nombre_tercero: nombre?.trim(),
                concepto: concepto?.trim(),
                valor: parseFloat(valor?.trim() || '0'),
                tipo_movimiento: (tipo?.trim().toUpperCase() as any) || 'INGRESO'
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
