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
    retencion: number;
    periodo_fiscal: number;
    tipo_exogeno: '0210' | '0220' | '0230' | '0240' | '0250' | '0260';
}

export class ExogenosParser {
    /**
     * Procesa un archivo XML de la DIAN (Formato estándar)
     */
    async parseDIANXml(content: string): Promise<ExogenoRow[]> {
        const rows: ExogenoRow[] = [];
        const currentYear = new Date().getFullYear();

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');

            // 1. Intentar encontrar etiquetas de datos
            // El formato real de la DIAN usa etiquetas como <pagos> para el formato 1001
            let records = Array.from(xmlDoc.getElementsByTagName('record'));

            if (records.length === 0) {
                // Si no hay <record>, buscar etiquetas comunes de MUISCA
                const muiscaTags = ['pagos', 'ret', 'mo_ret', 'iva_ret'];
                for (const tagName of muiscaTags) {
                    const found = Array.from(xmlDoc.getElementsByTagName(tagName));
                    if (found.length > 0) {
                        records = found;
                        break;
                    }
                }
            }

            // Si aún no hay registros, buscar cualquier elemento que tenga atributos clave (fallback agresivo)
            if (records.length === 0) {
                const allElements = xmlDoc.querySelectorAll('*');
                for (const el of Array.from(allElements)) {
                    if (el.hasAttribute('nid') && (el.hasAttribute('pago') || el.hasAttribute('valor'))) {
                        records.push(el as Element);
                    }
                }
            }

            // Obtener año fiscal del encabezado si existe (<Ano>)
            const yearHeader = xmlDoc.getElementsByTagName('Ano')[0]?.textContent;
            const defaultYear = yearHeader ? parseInt(yearHeader) : currentYear - 1;

            for (const record of records) {
                // NIT: 'nit' o 'nid' (MUISCA)
                const nit = record.getAttribute('nit') || record.getAttribute('nid') || '';

                // Nombre: 'nombre' o 'raz' (Razón Social) o nombres divididos
                let nombre = record.getAttribute('nombre') || record.getAttribute('raz') || '';
                if (!nombre) {
                    const apl1 = record.getAttribute('apl1') || '';
                    const apl2 = record.getAttribute('apl2') || '';
                    const nom1 = record.getAttribute('nom1') || '';
                    const nom2 = record.getAttribute('nom2') || '';
                    nombre = [nom1, nom2, apl1, apl2].filter(Boolean).join(' ').trim();
                }

                // Concepto: 'concepto' o 'cpt'
                const concepto = record.getAttribute('concepto') || record.getAttribute('cpt') || '';

                // Montos
                const monto = parseFloat(record.getAttribute('valor') || record.getAttribute('pago') || '0');
                const retencion = parseFloat(record.getAttribute('retencion') || record.getAttribute('retp') || '0');

                // Periodo
                const periodo = parseInt(record.getAttribute('periodo') || defaultYear.toString());

                if (nit) {
                    rows.push({
                        nit_contribuyente: nit,
                        nombre_contribuyente: nombre || 'Desconocido',
                        concepto: concepto,
                        monto: monto,
                        retencion: retencion,
                        periodo_fiscal: periodo,
                        tipo_exogeno: '0210'
                    });
                }
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
        const currentYear = new Date().getFullYear();

        // Asumimos primera línea es header: NIT,NOMBRE,CONCEPTO,VALOR,RETENCION,PERIODO
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const [nit, nombre, concepto, valor, retencion, periodo] = line.split(',');
            rows.push({
                nit_contribuyente: nit?.trim(),
                nombre_contribuyente: nombre?.trim(),
                concepto: concepto?.trim(),
                monto: parseFloat(valor?.trim() || '0'),
                retencion: parseFloat(retencion?.trim() || '0'),
                periodo_fiscal: parseInt(periodo?.trim() || (currentYear - 1).toString()),
                tipo_exogeno: '0210'
            });
        }

        return rows;
    }

    /**
     * Helper para identificar el tipo de archivo y procesarlo
     */
    async parseFile(file: File): Promise<ExogenoRow[]> {
        const buffer = await file.arrayBuffer();

        // Decodificar temporalmente como UTF-8 para buscar la declaración de encoding
        const tempContent = new TextDecoder('utf-8').decode(buffer);
        let content = tempContent;

        // Si el archivo indica ISO-8859-1 (común en la DIAN), re-decodificar correctamente
        if (tempContent.includes('encoding="ISO-8859-1"') ||
            tempContent.includes('encoding="iso-8859-1"') ||
            tempContent.includes('encoding="ISO8859-1"')) {
            content = new TextDecoder('iso-8859-1').decode(buffer);
        }

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
