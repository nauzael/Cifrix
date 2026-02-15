
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const XLSX = require('xlsx');

// File path
const filePath = 'e:/Apks/Programa contable/Cifrix/.documentacion/reporteExogena2024.xlsx';
const outputParams = 'e:/Apks/Programa contable/Cifrix/scripts/output_exogena.txt';

console.log(`Analyzing file: ${filePath}`);

try {
    const workbook = XLSX.readFile(filePath);
    console.log('Workbook read successfully.');

    let output = '';
    output += `Sheet Names: ${JSON.stringify(workbook.SheetNames)}\n`;

    workbook.SheetNames.forEach(sheetName => {
        output += `\n--- Sheet: ${sheetName} ---\n`;
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (data.length > 0) {
            output += `Total Rows: ${data.length}\n`;
            output += 'First 50 rows:\n';
            data.slice(0, 50).forEach((row, index) => {
                output += `Row ${index}: ${JSON.stringify(row)}\n`;
            });
        } else {
            output += 'Sheet contains no data.\n';
        }
    });

    fs.writeFileSync(outputParams, output, 'utf8');
    console.log(`Output written to ${outputParams}`);

} catch (error) {
    console.error('Error:', error);
}
