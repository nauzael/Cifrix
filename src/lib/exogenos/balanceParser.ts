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

        // Mapear columnas con lógica estricta
        const headerRow = data[headerRowIndex].map(cell => String(cell).toLowerCase().trim());

        const findColIndex = (positiveKeywords: string[], negativeKeywords: string[] = [], excludeIndex: number = -1) => {
            return headerRow.findIndex((h, index) => {
                if (index === excludeIndex) return false;
                // Debe contener al menos una keyword positiva
                const hasPositive = positiveKeywords.some(k => h.includes(k));
                // No debe contener ninguna keyword negativa
                const hasNegative = negativeKeywords.some(k => h.includes(k));
                return hasPositive && !hasNegative;
            });
        };

        const colMap = {
            cuenta: -1,
            nit: -1,
            nombre: -1,
            debito: -1,
            credito: -1,
            saldo: -1
        };

        // 1. Identificar NIT (Prioridad Máxima)
        colMap.nit = findColIndex(['nit', 'identifica', 'cedula', 'rut'], []);

        // 2. Identificar Nombre del Tercero 
        // Evitamos "Nombre Cuenta" o "Descripcion Cuenta" explícitamente
        // Buscamos "Razón Social", "Nombre Tercero", "Apellidos", "Beneficiario"
        colMap.nombre = findColIndex(
            ['razon', 'nombre tercero', 'apellidos', 'beneficiario', 'tercero'],
            ['cuenta', 'rubro', 'codigo', 'movimiento'],
            colMap.nit
        );

        // Fallback para nombre: si no encuentra específico, busca "Nombre" genérico pero asegura que no tenga "Cuenta"
        if (colMap.nombre === -1) {
            colMap.nombre = findColIndex(['nombre', 'detalle'], ['cuenta', 'saldo', 'debito', 'credito'], colMap.nit);
        }

        // 3. Identificar Cuenta
        colMap.cuenta = findColIndex(['cuenta', 'codigo', 'puc'], ['nombre', 'descripcion'], -1);

        // 4. Identificar Valores
        colMap.debito = findColIndex(['debito', 'débito', 'cargo'], [], -1);
        colMap.credito = findColIndex(['credito', 'crédito', 'abono'], [], -1);
        colMap.saldo = findColIndex(['saldo', 'final', 'total', 'neto'], [], -1);

        if (colMap.cuenta === -1 && colMap.nit === -1) {
            throw new Error("No se encontraron columnas para Cuenta ni NIT. Verifique los encabezados del archivo.");
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
