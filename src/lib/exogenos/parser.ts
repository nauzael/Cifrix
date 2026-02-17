/**
 * Parser de archivos de exógenas (DIAN XML, CSV, XLSX)
 * Permite convertir archivos de reportes de terceros en datos estructurados
 */

import { read, utils } from 'xlsx';

export interface ExogenoRow {
    nit_contribuyente: string;
    nombre_contribuyente: string;
    concepto: string;
    monto: number;
    retencion: number;
    periodo_fiscal: number;
    tipo_exogeno: '0210' | '0220' | '0230' | '0240' | '0250' | '0260';
    // Metadata adicional para trazabilidad
    linea_origen?: number;
    archivo_origen?: string;
    errores?: string[];
}

export interface ColumnMapping {
    nit: string | number;         // Nombre de columna o índice (0, 1, 'A', 'B')
    nombre?: string | number;
    concepto: string | number;
    monto: string | number;
    retencion?: string | number;
    periodo?: string | number;
}

export class ExogenosParser {
    /**
     * Procesa un archivo XML de la DIAN (Formato estándar)
     */
    async parseDIANXml(content: string, fileName?: string): Promise<ExogenoRow[]> {
        const rows: ExogenoRow[] = [];
        const currentYear = new Date().getFullYear();

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');

            // 1. Identificar formato del encabezado
            const formato = xmlDoc.getElementsByTagName('Formato')[0]?.textContent || '1001';
            const yearHeader = xmlDoc.getElementsByTagName('Ano')[0]?.textContent;
            const defaultYear = yearHeader ? parseInt(yearHeader) : currentYear - 1;

            console.log(`[Parser] Procesando formato ${formato} año ${defaultYear}`);

            // 2. Intentar encontrar registros (MUISCA usa etiquetas específicas por formato)
            const muiscaTags = ['pagos', 'ingresos', 'ret', 'mo_ret', 'iva_ret', 'record', 'sal'];
            let records: Element[] = [];

            for (const tagName of muiscaTags) {
                const found = Array.from(xmlDoc.getElementsByTagName(tagName));
                if (found.length > 0) {
                    console.log(`[Parser] Encontrados ${found.length} registros con etiqueta <${tagName}>`);
                    records = found;
                    break;
                }
            }

            // Fallback: buscar por atributo 'nid'
            if (records.length === 0) {
                records = Array.from(xmlDoc.querySelectorAll('*')).filter(el => el.hasAttribute('nid')) as Element[];
            }

            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                // NIT: 'nit' o 'nid' (MUISCA)
                const nit = record.getAttribute('nit') || record.getAttribute('nid') || '';
                if (!nit) continue;

                // Nombre
                let nombre = record.getAttribute('raz') || record.getAttribute('nombre') || '';
                if (!nombre) {
                    const apl1 = record.getAttribute('apl1') || '';
                    const apl2 = record.getAttribute('apl2') || '';
                    const nom1 = record.getAttribute('nom1') || '';
                    const nom2 = record.getAttribute('nom2') || '';
                    nombre = [nom1, nom2, apl1, apl2].filter(Boolean).join(' ').trim();
                }

                // Concepto
                const concepto = record.getAttribute('cpt') || record.getAttribute('concepto') || '';

                // Montos
                const monto = parseFloat(record.getAttribute('pago') || record.getAttribute('valor') || '0');
                const retencion = parseFloat(record.getAttribute('retp') || record.getAttribute('retencion') || '0');

                rows.push({
                    nit_contribuyente: nit,
                    nombre_contribuyente: nombre || 'Desconocido',
                    concepto: concepto,
                    monto: monto,
                    retencion: retencion,
                    periodo_fiscal: defaultYear,
                    tipo_exogeno: '0210', // TODO: Inferir del formato XML
                    linea_origen: i + 1,
                    archivo_origen: fileName
                });
            }

            return rows;
        } catch (error) {
            console.error('Error parsing DIAN XML:', error);
            throw new Error('Formato XML de la DIAN inválido o no soportado');
        }
    }

    /**
     * Procesa un archivo CSV con mapeo opcional
     */
    async parseCSV(content: string, mapping?: ColumnMapping, fileName?: string): Promise<ExogenoRow[]> {
        const rows: ExogenoRow[] = [];
        const lines = content.split('\n');
        const currentYear = new Date().getFullYear();

        // Si no hay mapeo, usamos por defecto: 0=NIT, 1=NOMBRE, 2=CONCEPTO, 3=VALOR
        const map = mapping || { nit: 0, nombre: 1, concepto: 2, monto: 3, retencion: 4 };

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(','); // TODO: Mejorar split para respetar comillas

            const getValue = (key: string | number | undefined) => {
                if (key === undefined) return '';
                if (typeof key === 'number') return cols[key] || '';
                // Si es string, no podemos buscar por nombre en CSV simple sin header mapping complejo
                return '';
            };

            const nit = getValue(map.nit);
            const nombre = getValue(map.nombre);
            const concepto = getValue(map.concepto);
            const monto = parseFloat(getValue(map.monto) || '0');
            const retencion = parseFloat(getValue(map.retencion) || '0');

            if (nit) {
                rows.push({
                    nit_contribuyente: nit.replace(/['"]/g, '').trim(),
                    nombre_contribuyente: nombre.replace(/['"]/g, '').trim(),
                    concepto: concepto.replace(/['"]/g, '').trim(),
                    monto: isNaN(monto) ? 0 : monto,
                    retencion: isNaN(retencion) ? 0 : retencion,
                    periodo_fiscal: currentYear - 1,
                    tipo_exogeno: '0210',
                    linea_origen: i + 1,
                    archivo_origen: fileName
                });
            }
        }

        return rows;
    }

    /**
     * Procesa archivo Excel (.xlsx, .xls)
     */
    async parseXLSX(buffer: ArrayBuffer, mapping?: ColumnMapping, fileName?: string): Promise<ExogenoRow[]> {
        const wb = read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const data = utils.sheet_to_json(sheet, { header: 1 }) as any[][]; // Array de arrays

        const rows: ExogenoRow[] = [];
        const currentYear = new Date().getFullYear();

        // Mapeo por defecto si no se provee (A=0, B=1, etc)
        const map = mapping || { nit: 0, nombre: 1, concepto: 2, monto: 3, retencion: 4 };

        // Empezamos en fila 1 (asumiendo fila 0 es header)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];

            const getValue = (idx: string | number | undefined): any => {
                if (idx === undefined) return '';
                if (typeof idx === 'number') return row[idx];
                // Si pasamos letras 'A', 'B', convertir a índice
                if (typeof idx === 'string' && /^[A-Z]+$/.test(idx)) {
                    // Simple conversión para A-Z (0-25)
                    let colIndex = 0;
                    for (let j = 0; j < idx.length; j++) {
                        colIndex = colIndex * 26 + idx.charCodeAt(j) - 64;
                    }
                    return row[colIndex - 1]; // 0-based
                }
                return '';
            };

            const nit = String(getValue(map.nit) || '').trim();
            // Validar que tenga contenido mínimo
            if (!nit) continue;

            const nombre = String(getValue(map.nombre) || '').trim();
            const concepto = String(getValue(map.concepto) || '').trim();
            const monto = parseFloat(String(getValue(map.monto) || '0').replace(/[^0-9.-]/g, ''));
            const retencion = parseFloat(String(getValue(map.retencion) || '0').replace(/[^0-9.-]/g, ''));

            rows.push({
                nit_contribuyente: nit,
                nombre_contribuyente: nombre,
                concepto: concepto,
                monto: isNaN(monto) ? 0 : monto,
                retencion: isNaN(retencion) ? 0 : retencion,
                periodo_fiscal: currentYear - 1,
                tipo_exogeno: '0210',
                linea_origen: i + 1,
                archivo_origen: fileName
            });
        }

        return rows;
    }

    /**
     * Detecta tipo y procesa
     */
    async parseFile(file: File, mapping?: ColumnMapping): Promise<ExogenoRow[]> {
        const buffer = await file.arrayBuffer();
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'xlsx' || extension === 'xls') {
            return this.parseXLSX(buffer, mapping, file.name);
        }

        const decoder = new TextDecoder('utf-8'); // TODO: Detectar encoding
        let content = decoder.decode(buffer);

        if (extension === 'xml') {
            return this.parseDIANXml(content, file.name);
        }

        if (extension === 'csv' || extension === 'txt') {
            return this.parseCSV(content, mapping, file.name);
        }

        throw new Error(`Extensión .${extension} no soportada.`);
    }
}

export const exogenosParser = new ExogenosParser();
