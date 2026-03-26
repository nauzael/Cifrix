const xlsx = require('xlsx');
const path = require('path');

const files = [
    'e:\\Apks\\Programa contable\\Cifrix\\.documentacion\\Exogenos\\BALANCE COMPROBACION CON TERCEROS.XLSX',
    'e:\\Apks\\Programa contable\\Cifrix\\.documentacion\\Exogenos\\FORMATO 1003 2025.XLSX'
];

files.forEach(file => {
    try {
        console.log(`\n--- Inspecting: ${path.basename(file)} ---`);
        const workbook = xlsx.readFile(file);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        console.log(`Sheet Name: ${sheetName}`);
        console.log('First 5 rows:');
        data.slice(0, 10).forEach((row, i) => {
            console.log(`Row ${i}:`, JSON.stringify(row));
        });
    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
    }
});
