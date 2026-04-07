const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'reports.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The specific correct implementation of getRUESData I want to keep
const correctRUES = `    /**
     * Genera los datos resumidos para la renovación de Cámara de Comercio (RUES)
     */
    async getRUESData(organizationId: string, year: number): Promise<any> {
        const org = await db.organizations.get(organizationId);
        if (!org) throw new Error('Organización no encontrada');

        const startDate = \`\${year}-01-01\`;
        const endDate = \`\${year}-12-31\`;

        // Obtener todas las cuentas con saldo
        const accounts = await db.accounts
            .where('organization_id').equals(organizationId)
            .toArray();

        const transactions = await db.transactions
            .where('organization_id').equals(organizationId)
            .and(t => t.date <= endDate)
            .toArray();

        const txIds = transactions.map(t => t.id);
        const entries = await db.journal_entries
            .where('transaction_id').anyOf(txIds)
            .toArray();

        const balances = accounts.map(acc => {
            const accEntries = entries.filter(e => e.account_id === acc.id);
            // Filtro para P&L (solo movimientos del año actual)
            const yearEntries = accEntries.filter(e => {
                const tx = transactions.find(t => t.id === e.transaction_id);
                return tx && tx.date >= startDate && tx.date <= endDate;
            });

            const isPnL = ['4', '5', '6', '7'].includes(acc.code[0]);
            const balance = this.calculateNetBalance(isPnL ? yearEntries : accEntries, acc.nature);
            return { code: acc.code, balance };
        }).filter(b => Math.abs(b.balance) > 0.01);

        const getGroupBalance = (prefixes: string[]) => 
            balances.filter(b => prefixes.some(p => b.code.startsWith(p)))
                    .reduce((sum, b) => sum + b.balance, 0);

        // Clasificación RUES
        const activoCorriente = getGroupBalance(['11', '12', '13', '14', '19']);
        const activoNoCorriente = getGroupBalance(['15', '16', '17', '18']);
        const pasivoCorriente = getGroupBalance(['21', '22', '23', '24', '25', '26', '27']);
        const pasivoNoCorriente = getGroupBalance(['29']);
        const patrimonioNeto = getGroupBalance(['3']);

        const ingresosOrdinarios = getGroupBalance(['41']);
        const otrosIngresos = getGroupBalance(['42']);
        const costoVentas = getGroupBalance(['6']);
        const gastosAdmin = getGroupBalance(['51']);
        const gastosVenta = getGroupBalance(['52']);
        const gastosFinancieros = getGroupBalance(['5305']);
        const otrosGastos = getGroupBalance(['53', '54', '59']) - gastosFinancieros;

        const utilidadOperacional = ingresosOrdinarios - (gastosAdmin + gastosVenta + costoVentas);
        const utilidadNeta = (ingresosOrdinarios + otrosIngresos) - (gastosAdmin + gastosVenta + costoVentas + otrosGastos + gastosFinancieros);

        return {
            year,
            organizationName: org.name,
            taxId: org.tax_id,
            data: {
                activoCorriente,
                activoNoCorriente,
                activoTotal: activoCorriente + activoNoCorriente,
                pasivoCorriente,
                pasivoNoCorriente,
                pasivoTotal: pasivoCorriente + pasivoNoCorriente,
                patrimonioNeto: patrimonioNeto + utilidadNeta, // Ajustado con resultado ej.
                pasivoPatrimonio: (pasivoCorriente + pasivoNoCorriente) + (patrimonioNeto + utilidadNeta),
                ingresosOrdinarios,
                otrosIngresos,
                ingresosTotales: ingresosOrdinarios + otrosIngresos,
                costoVentas,
                gastosAdmin,
                gastosVenta,
                otrosGastos,
                gastosFinancieros,
                utilidadOperacional,
                utilidadNeta
            }
        };
    }
`;

// Regex for the RUES blocks - handling variable indentation and slight variations
const ruesRegex = /\/\*\*[\s\S]*?Genera los datos resumidos para la renovación de Cámara de Comercio \(RUES\)[\s\S]*?async getRUESData\([\s\S]*?data: \{[\s\S]*?utilidadNeta\s*\}\s*\};\s*\}\s*\}/g;

// Also look for blocks that end prematurely with } } } if they were inserted in a way that didn't include the final return braces
const ruesRegexShort = /\/\*\*[\s\S]*?Genera los datos resumidos para la renovación de Cámara de Comercio \(RUES\)[\s\S]*?async getRUESData\([\s\S]*?\n\s*\}\s*\}/g;

content = content.replace(ruesRegex, '');
content = content.replace(ruesRegexShort, '');

// Fix getBalanceSheet corruption specifically
content = content.replace(/total: incomeExpenseBalance\s*\/\*\*[\s\S]*?summary: \{/g, 
'total: incomeExpenseBalance }\n                    ],\n                    total: totalEquity\n                }\n            ],\n            summary: {');

// Fix getIncomeStatement corruption
content = content.replace(/total: totalExpenses\s*\/\*\*[\s\S]*?\*\//g, 'total: totalExpenses }\n            ],\n            summary: {\n                netResult\n            }\n        };\n    }\n');

// Clear leftover artifacts of nested class openers or openers that should be closed
content = content.replace(/^\n\}\s*\n\}/gm, '}\n');

// Clean up FinancialReportData interface and other interfaces from the top
content = content.replace(/summary\?: any;\s*\/\*\*[\s\S]*?\*\//g, 'summary?: any;\n}\n');

// Finally, add the correctRUES at the end of FinancialReportsService class
content = content.replace(/\n\}\s*\nexport const financialReportsService = new FinancialReportsService\(\);/, '\n' + correctRUES + '\n}\n\nexport const financialReportsService = new FinancialReportsService();');

fs.writeFileSync(filePath, content);
console.log('Cleanup complete');

