import { utils, write } from 'xlsx';
import { Exogeno } from '@/lib/db';
import { saveAs } from 'file-saver'; // Asumimos que file-saver está disponible o se usará un helper

interface XMLHeader {
    Ano: number;
    CodCpt: number;
    Formato: number;
    Version: number;
    NumEnvio: number;
    FecEnvio: string;
    FecInicial: string;
    FecFinal: string;
    ValorTotal: number;
    CantReg: number;
}

export class ExogenosExporter {
    /**
     * Genera un archivo XML en formato DIAN (MUISCA)
     */
    async exportToXML(exogenos: Exogeno[], formato: number = 1001, version: number = 10): Promise<string> {
        if (exogenos.length === 0) throw new Error("No hay datos para exportar");

        const year = exogenos[0].periodo_fiscal;
        const total = exogenos.reduce((sum, ex) => sum + ex.monto, 0);

        // Encabezado
        const header: XMLHeader = {
            Ano: year,
            CodCpt: 1, // Concepto 1: Nuevo Envío
            Formato: formato,
            Version: version,
            NumEnvio: 1, // TODO: Gestionar consecutivo de envíos
            FecEnvio: new Date().toISOString().split('.')[0], // YYYY-MM-DDTHH:mm:ss
            FecInicial: `${year}-01-01`,
            FecFinal: `${year}-12-31`,
            ValorTotal: Math.round(total),
            CantReg: exogenos.length
        };

        // Construcción del XML
        let xml = `<?xml version="1.0" encoding="ISO-8859-1"?>\n`;
        xml += `<mas>\n`;
        xml += `  <cab>\n`;
        xml += `    <Ano>${header.Ano}</Ano>\n`;
        xml += `    <CodCpt>${header.CodCpt}</CodCpt>\n`;
        xml += `    <Formato>${header.Formato}</Formato>\n`;
        xml += `    <Version>${header.Version}</Version>\n`;
        xml += `    <NumEnvio>${header.NumEnvio}</NumEnvio>\n`;
        xml += `    <FecEnvio>${header.FecEnvio}</FecEnvio>\n`;
        xml += `    <FecInicial>${header.FecInicial}</FecInicial>\n`;
        xml += `    <FecFinal>${header.FecFinal}</FecFinal>\n`;
        xml += `    <ValorTotal>${header.ValorTotal}</ValorTotal>\n`;
        xml += `    <CantReg>${header.CantReg}</CantReg>\n`;
        xml += `  </cab>\n`;

        // Detalle (Pagos, Ingresos, etc según formato)
        const tagName = formato === 1001 ? 'pagos' : (formato === 1007 ? 'ingresos' : 'det');

        for (const ex of exogenos) {
            xml += `  <${tagName}>\n`;
            // Mapeo genérico (ajustar según formato real)
            xml += `    <cpt>${ex.concepto}</cpt>\n`;
            xml += `    <nit>${ex.nit_contribuyente}</nit>\n`;

            if (ex.nombre_contribuyente) {
                // MUISCA suele separar apellidos y nombres. 
                // Aquí usamos una heurística simple o campo completo 'raz' si es juridica
                xml += `    <raz>${this.escapeXML(ex.nombre_contribuyente)}</raz>\n`;
                // TODO: Mejorar separación de nombres
            }

            // Valores (sin decimales para MUISCA generalmente, pero depende del formato)
            xml += `    <val>${Math.round(ex.monto)}</val>\n`;
            if (ex.retencion > 0) {
                xml += `    <ret>${Math.round(ex.retencion)}</ret>\n`;
            }

            xml += `  </${tagName}>\n`;
        }

        xml += `</mas>`;
        return xml;
    }

    /**
     * Genera un archivo Excel para revisión
     */
    exportToExcel(exogenos: Exogeno[], fileName: string = 'reporte_exogeno.xlsx'): void {
        const data = exogenos.map(ex => ({
            Periodo: ex.periodo_fiscal,
            Concepto: ex.concepto,
            NIT: ex.nit_contribuyente,
            Nombre: ex.nombre_contribuyente,
            Monto: ex.monto,
            Retencion: ex.retencion,
            Origen: ex.archivo_origen || 'SISTEMA',
            Estado: ex.validado ? 'Validado' : 'Pendiente'
        }));

        const ws = utils.json_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Reporte Exógeno");

        // Escribir y descargar
        const wbout = write(wb, { bookType: 'xlsx', type: 'array' });

        // Crear Blob y descargar
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        saveAs(blob, fileName);
    }

    // Helper para escapar caracteres especiales XML
    private escapeXML(str: string): string {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}

export const exogenosExporter = new ExogenosExporter();
