import { read, utils } from 'xlsx';
import { ExogenaBalance, ExogenaBalanceLine } from '@/lib/db';

export class BalanceParser {
    /**
     * Parsea un archivo de Balance de Comprobación (Excel)
     * Detecta automáticamente las columnas basándose en palabras clave
     */
    async parseBalance(file: File): Promise<{ header: Partial<ExogenaBalance>, lines: Partial<ExogenaBalanceLine>[] }> {
        const buffer = await file.arrayBuffer();
        const wb = read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];

        // Convertir a array de arrays para facilitar la búsqueda de encabezados
        const data = utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (data.length === 0) throw new Error("El archivo está vacío");

        // 1. Encontrar la fila de encabezados
        let headerRowIndex = -1;
        const keywords = ['cuenta', 'codigo', 'nit', 'tercero', 'debito', 'credito', 'saldo'];

        for (let i = 0; i < Math.min(20, data.length); i++) {
            const rowStr = data[i].join(' ').toLowerCase();
            let matches = 0;
            keywords.forEach(kw => {
                if (rowStr.includes(kw)) matches++;
            });

            if (matches >= 3) { // Si contiene al menos 3 palabras clave, es el header
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error("No se pudo detectar la fila de encabezados. Asegúrese de que el archivo tenga columnas como 'Cuenta', 'NIT', 'Débito', 'Crédito'.");
        }

        // 2. Mapear columnas
        const headerRow = data[headerRowIndex].map(cell => String(cell).toLowerCase().trim());
        const colMap = {
            cuenta: headerRow.findIndex(h => h.includes('cuenta') || h.includes('codigo')),
            nit: headerRow.findIndex(h => h.includes('nit') || h.includes('identifica') || h.includes('cedula')),
            nombre: headerRow.findIndex(h => h.includes('nombre') || h.includes('tercero') || h.includes('razon')),
            debito: headerRow.findIndex(h => h.includes('debito') || h.includes('débito')),
            credito: headerRow.findIndex(h => h.includes('credito') || h.includes('crédito')),
            saldo: headerRow.findIndex(h => h.includes('saldo') || h.includes('final'))
        };

        if (colMap.cuenta === -1 && colMap.nit === -1) {
            throw new Error("No se encontraron columnas para Cuenta ni NIT.");
        }

        const lines: Partial<ExogenaBalanceLine>[] = [];
        let totalDebitos = 0;
        let totalCreditos = 0;
        let terceroCount = 0;
        const uniqueNits = new Set<string>();

        // 3. Procesar filas
        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i];
            // Si la fila está vacía o es un total general, saltar (heurística simple)
            if (!row || row.length === 0) continue;

            const cuenta = String(row[colMap.cuenta] || '').trim();
            const nit = String(row[colMap.nit] || '').trim();
            const nombre = String(row[colMap.nombre] || '').trim();

            // Limpiar valores numéricos
            const cleanNumber = (val: any) => parseFloat(String(val || 0).replace(/[^0-9.-]/g, ''));

            const debito = colMap.debito !== -1 ? cleanNumber(row[colMap.debito]) : 0;
            const credito = colMap.credito !== -1 ? cleanNumber(row[colMap.credito]) : 0;
            const saldo = colMap.saldo !== -1 ? cleanNumber(row[colMap.saldo]) : (debito - credito);

            // Validar si es una línea útil (tiene cuenta o nit y movimiento)
            if ((!cuenta && !nit) || (debito === 0 && credito === 0 && saldo === 0)) continue;

            lines.push({
                cuenta,
                nit_tercero: nit,
                nombre_tercero: nombre,
                debito,
                credito,
                saldo
            });

            totalDebitos += debito;
            totalCreditos += credito;
            if (nit) uniqueNits.add(nit);
        }

        return {
            header: {
                nombre_archivo: file.name,
                tercero_count: uniqueNits.size,
                total_debitos: totalDebitos,
                total_creditos: totalCreditos,
                anio_gravable: new Date().getFullYear() - 1 // Default
            },
            lines
        };
    }
}

export const balanceParser = new BalanceParser();
