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

export interface BalanceRow {
    cuenta: string;
    nit_tercero: string;
    nombre_tercero: string;
    debito: number;
    credito: number;
    saldo: number;
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
                const cleanedName = nombre.replace(/['"]/g, '').trim();
                rows.push({
                    nit_contribuyente: nit.replace(/['"]/g, '').trim(),
                    nombre_contribuyente: cleanedName || 'Desconocido',
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
    /**
     * Busca los encabezados y mapea las columnas automáticamente
     */
    private findMapping(data: any[][]): { mapping: ColumnMapping, startRow: number } {
        const keywords = {
            nit: ['nit', 'identifica', 'cedula', 'documento', 'nid', 'id'],
            nombre: ['nombre', 'razon', 'tercero', 'contribuyente', 'beneficiario', 'cliente', 'proveedor'],
            concepto: ['concepto', 'cpt', 'rubro'],
            monto: ['monto', 'valor', 'pago', 'debito', 'credito', 'saldo', 'total', 'final', 'actual', 'nuevo'],
            retencion: ['retencion', 'rete', 'iva', 'fuente']
        };

        let startRow = 0;
        let mapping: ColumnMapping = { nit: -1, nombre: -1, concepto: -1, monto: -1, retencion: -1 };

        // Buscar la fila que tenga más coincidencias con palabras clave (primeras 20 filas)
        for (let i = 0; i < Math.min(20, data.length); i++) {
            const row = data[i].map(c => String(c || '').toLowerCase());

            const currentMap: any = {};
            let matchCount = 0;

            Object.entries(keywords).forEach(([key, kws]) => {
                const idx = row.findIndex(cell => kws.some(kw => cell.includes(kw)));
                if (idx !== -1) {
                    currentMap[key] = idx;
                    matchCount++;
                }
            });

            if (matchCount >= 2) { // Si encontramos al menos 2 columnas clave, esta es la fila de encabezados
                mapping = currentMap as ColumnMapping;
                startRow = i + 1;
                break;
            }
        }

        // Si no se encontró mapeo dinámico, usar fallback agresivo (inspeccionar contenido)
        if (mapping.nit === -1) {
            // Buscar una columna que parezca tener NITs (números largos)
            const firstDataRow = data.find(r => r.some(c => /^\d{7,11}$/.test(String(c || '').replace(/[\.\-]/g, ''))));
            if (firstDataRow) {
                mapping.nit = firstDataRow.findIndex(c => /^\d{7,11}$/.test(String(c || '').replace(/[\.\-]/g, '')));
                // Asumir que el nombre suele estar al lado del NIT
                if (mapping.nit !== -1 && firstDataRow[mapping.nit + 1]) mapping.nombre = mapping.nit + 1;
                startRow = 0; // Empezar desde el principio si no hay headers
            }
        }

        return { mapping, startRow };
    }

    /**
     * Procesa archivo Excel (.xlsx, .xls)
     */
    async parseXLSX(buffer: ArrayBuffer, mapping?: ColumnMapping, fileName?: string, onProgress?: (msg: string, pct: number) => void): Promise<ExogenoRow[]> {
        const wb = read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const data = utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        const rows: ExogenoRow[] = [];
        const currentYear = new Date().getFullYear();

        const { mapping: autoMap, startRow } = mapping ? { mapping, startRow: 1 } : this.findMapping(data);
        const map = autoMap;

        for (let i = startRow; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const getValue = (idx: string | number | undefined): any => {
                if (idx === undefined || idx === -1) return '';
                if (typeof idx === 'number') return row[idx];
                return '';
            };

            const nit = String(getValue(map.nit) || '').trim().replace(/[^0-9-]/g, '');
            if (!nit || nit.length < 3) continue;

            const nombre = String(getValue(map.nombre) || '').trim();
            const concepto = String(getValue(map.concepto) || '').trim();

            const rawMonto = String(getValue(map.monto) || '0').replace(/[^0-9.-]/g, '');
            const monto = parseFloat(rawMonto);

            const rawRet = String(getValue(map.retencion) || '0').replace(/[^0-9.-]/g, '');
            const retencion = parseFloat(rawRet);

            rows.push({
                nit_contribuyente: nit,
                nombre_contribuyente: nombre && nombre !== 'undefined' ? nombre : 'Desconocido',
                concepto: concepto || 'GENERAL',
                monto: isNaN(monto) ? 0 : monto,
                retencion: isNaN(retencion) ? 0 : retencion,
                periodo_fiscal: currentYear - 1,
                tipo_exogeno: '0210',
                linea_origen: i + 1,
                archivo_origen: fileName
            });

            // Cada 200 filas, liberar el hilo principal por un instante
            if (i % 200 === 0) {
                if (onProgress) onProgress(`Extrayendo datos de fila ${i}...`, 10 + Math.floor((i / data.length) * 20));
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        return rows;
    }

    /**
     * Detecta tipo y procesa
     */
    async parseFile(file: File, mapping?: ColumnMapping, onProgress?: (msg: string, pct: number) => void): Promise<ExogenoRow[]> {
        const buffer = await file.arrayBuffer();
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'xlsx' || extension === 'xls') {
            return this.parseXLSX(buffer, mapping, file.name, onProgress);
        }

        const decoder = new TextDecoder('utf-8');
        let content = decoder.decode(buffer);

        if (extension === 'xml') {
            return this.parseDIANXml(content, file.name);
        }

        if (extension === 'csv' || extension === 'txt') {
            return this.parseCSV(content, mapping, file.name);
        }

        throw new Error(`Extensión .${extension} no soportada.`);
    }

    /**
     * Parsea un archivo de Balance de Prueba (Dinámico)
     */
    async parseBalance(file: File, onProgress?: (msg: string, pct: number) => void): Promise<BalanceRow[]> {
        const buffer = await file.arrayBuffer();
        const extension = file.name.split('.').pop()?.toLowerCase();

        let data: any[][] = [];

        if (extension === 'xlsx' || extension === 'xls') {
            const wb = read(buffer, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            data = utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        } else if (extension === 'csv') {
            const decoder = new TextDecoder('utf-8');
            const content = decoder.decode(buffer);
            data = content.split('\n').map(line => line.split(','));
        } else {
            throw new Error('Solo se soportan archivos Excel o CSV.');
        }

        const { mapping, startRow } = this.findMapping(data);
        const rows: BalanceRow[] = [];

        // Definir columnas clave para balance (sobre el mapeo general)
        const colMap = {
            cuenta: data[0].findIndex((h: any) => String(h || '').toLowerCase().includes('cuenta') || String(h || '').toLowerCase().includes('codigo')),
            nit: mapping.nit as number,
            nombre: mapping.nombre as number,
            debito: data[0].findIndex((h: any) => String(h || '').toLowerCase().includes('debito')),
            credito: data[0].findIndex((h: any) => String(h || '').toLowerCase().includes('credito')),
            saldo: mapping.monto as number // Usar la columna detectada como "monto/valor" como saldo final
        };

        for (let i = startRow; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 2) continue;

            const getValue = (idx: number) => {
                if (idx === -1 || idx === undefined) return '';
                const val = row[idx];
                return val !== undefined ? String(val).trim() : '';
            };

            const getNumber = (idx: number) => {
                const val = getValue(idx).replace(/[^0-9.-]/g, '');
                return parseFloat(val) || 0;
            };

            const nit = getValue(colMap.nit).replace(/[^0-9-]/g, '');
            if (!nit || nit.length < 3) continue;

            rows.push({
                cuenta: getValue(colMap.cuenta),
                nit_tercero: nit,
                nombre_tercero: getValue(colMap.nombre),
                debito: getNumber(colMap.debito),
                credito: getNumber(colMap.credito),
                saldo: getNumber(colMap.saldo)
            });

            // Liberar el hilo principal periódicamente
            if (i % 200 === 0) {
                if (onProgress) onProgress(`Analizando balance: fila ${i}...`, Math.floor((i / data.length) * 90));
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        return rows;
    }
}

export const exogenosParser = new ExogenosParser();
