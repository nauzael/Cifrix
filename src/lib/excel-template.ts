import { utils, write, BookType } from 'xlsx';
import { Account } from './db';

interface TemplateOptions {
  organizationName?: string;
  fiscalYear?: number;
  includeAccounts?: boolean;
  accounts?: Account[];
}

export function generateImportTemplate(options: TemplateOptions = {}): Blob {
  const {
    organizationName = 'Mi Empresa',
    fiscalYear = new Date().getFullYear(),
    includeAccounts = true,
    accounts = []
  } = options;

  const instructions = [
    ['INSTRUCCIONES PARA IMPORTAR ASIENTOS CONTABLES'],
    [''],
    ['1. Complete la hoja "Asientos" con los datos de sus transacciones.'],
    ['2. La primera fila (headers) NO debe modificarse - el sistema la usa para identificar columnas.'],
    ['3. La columna "Fecha" debe tener formato de fecha (AAAA-MM-DD) o texto como "2024-01-15".'],
    ['4. La columna "Cuenta" debe contener el código PUC de 4 dígitos (ej: 1105, 2105, 4105).'],
    ['5. Solo llene UNA columna de monto: Débitos O Créditos, nunca ambos en la misma fila.'],
    ['6. Para una transacción con múltiples cuentas, repita la fecha, referencia y descripción en cada fila.'],
    ['7. Los débitos van en la columna "Débito" y los créditos en "Crédito".'],
    [''],
    ['CÓDIGOS PUC COMUNES:'],
    ['1xxx = ACTIVO (Caja, Bancos, Clientes, Inventarios, etc.)'],
    ['2xxx = PASIVO (Proveedores, Obligaciones, Impuestos, etc.)'],
    ['3xxx = PATRIMONIO (Capital, Reservas, Utilidades)'],
    ['4xxx = INGRESOS (Ventas, Servicios, Otros ingresos)'],
    ['5xxx, 6xxx, 7xxx = GASTOS/EGRESOS (Gastos operativos, Costo de ventas, etc.)'],
    [''],
    [`Empresa: ${organizationName}`],
    [`Año Fiscal: ${fiscalYear}`],
    [`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`],
    [''],
  ];

  const headers = ['Fecha', 'Referencia', 'Descripcion', 'Cuenta', 'Débito', 'Crédito'];
  
  const exampleRows = [
    ['2024-01-15', 'FAC-001', 'Venta de mercancía', '4105', '', '5000000'],
    ['2024-01-15', 'FAC-001', 'Venta de mercancía', '1105', '5000000', ''],
    ['2024-01-15', 'FAC-001', 'Venta de mercancía - IVA', '2408', '', '900000'],
    ['2024-01-15', 'FAC-001', 'Venta de mercancía - IVA', '1105', '5900000', ''],
    [''],
    ['2024-01-20', 'EGR-001', 'Pago de arrendamiento oficina', '5105', '', '2000000'],
    ['2024-01-20', 'EGR-001', 'Pago de arrendamiento oficina', '1110', '2000000', ''],
    [''],
    ['2024-02-01', 'COM-001', 'Compra de inventario', '1435', '3000000', ''],
    ['2024-02-01', 'COM-001', 'Compra de inventario', '2205', '', '3000000'],
    [''],
  ];

  const templateData = [...instructions, headers, ...exampleRows];

  const wsTemplate = utils.aoa_to_sheet(templateData);
  
  const colWidths = [
    { wch: 15 },
    { wch: 20 },
    { wch: 45 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
  ];
  wsTemplate['!cols'] = colWidths;

  const wb = utils.book_new();
  utils.book_append_sheet(wb, wsTemplate, 'Asientos');

  if (includeAccounts && accounts.length > 0) {
    const accountHeaders = ['Código', 'Nombre', 'Tipo', 'Naturaleza', 'Acepta Mov.', 'Nivel'];
    const accountData = [
      accountHeaders,
      ...accounts.map(acc => [
        acc.code,
        acc.name,
        acc.type,
        acc.nature,
        acc.accepts_movement ? 'Sí' : 'No',
        acc.level.toString()
      ])
    ];

    const wsAccounts = utils.aoa_to_sheet(accountData);
    wsAccounts['!cols'] = [
      { wch: 10 },
      { wch: 40 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 8 }
    ];
    utils.book_append_sheet(wb, wsAccounts, 'Plan de Cuentas');
  } else {
    const defaultAccounts = [
      ['Código', 'Nombre', 'Tipo', 'Naturaleza'],
      ['1105', 'Caja', 'ACTIVO', 'DEBITO'],
      ['1110', 'Bancos', 'ACTIVO', 'DEBITO'],
      ['1305', 'Clientes', 'ACTIVO', 'DEBITO'],
      ['1435', 'Mercancías no fabricadas por la empresa', 'ACTIVO', 'DEBITO'],
      ['1510', 'Maquinaria y Equipo', 'ACTIVO', 'DEBITO'],
      ['2105', 'Proveedores', 'PASIVO', 'CREDITO'],
      ['2205', 'Cuentas por Pagar', 'PASIVO', 'CREDITO'],
      ['2365', 'Retención en la Fuente', 'PASIVO', 'CREDITO'],
      ['2408', 'Impuesto sobre las Ventas por Pagar', 'PASIVO', 'CREDITO'],
      ['2505', 'Salarios por Pagar', 'PASIVO', 'CREDITO'],
      ['3105', 'Capital Social', 'PATRIMONIO', 'CREDITO'],
      ['3110', 'Reservas', 'PATRIMONIO', 'CREDITO'],
      ['3605', 'Utilidades del Ejercicio', 'PATRIMONIO', 'CREDITO'],
      ['4105', 'Ventas', 'INGRESO', 'CREDITO'],
      ['4110', 'Devoluciones en Ventas', 'INGRESO', 'CREDITO'],
      ['4205', 'Servicios', 'INGRESO', 'CREDITO'],
      ['5105', 'Gastos de Personal', 'EGRESO', 'DEBITO'],
      ['5110', 'Salarios', 'EGRESO', 'DEBITO'],
      ['5120', 'Arriendos', 'EGRESO', 'DEBITO'],
      ['5135', 'Mantenimiento y Reparaciones', 'EGRESO', 'DEBITO'],
      ['5140', 'Gastos Legales', 'EGRESO', 'DEBITO'],
      ['5155', 'Depreciación Maquinaria', 'EGRESO', 'DEBITO'],
      ['5205', 'Gastos de Viaje', 'EGRESO', 'DEBITO'],
      ['5305', 'Gastos Financieros', 'EGRESO', 'DEBITO'],
      ['6105', 'Costo de Ventas', 'EGRESO', 'DEBITO'],
      ['7105', 'Gastos Operativos', 'EGRESO', 'DEBITO'],
    ];

    const wsAccounts = utils.aoa_to_sheet(defaultAccounts);
    wsAccounts['!cols'] = [
      { wch: 10 },
      { wch: 45 },
      { wch: 15 },
      { wch: 12 }
    ];
    utils.book_append_sheet(wb, wsAccounts, 'Plan de Cuentas');
  }

  const wbout = write(wb, { bookType: 'xlsx', type: 'array' });

  return new Blob([wbout], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

export function downloadTemplate(blob: Blob, filename: string = 'plantilla_importacion_asientos.xlsx'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function fetchAccountsAndGenerateTemplate(organizationId: string): Promise<void> {
  const { db } = await import('./db');
  
  const accounts = await db.accounts
    .where('organization_id')
    .equals(organizationId)
    .toArray();

  const blob = generateImportTemplate({
    includeAccounts: accounts.length > 0,
    accounts
  });

  const timestamp = new Date().toISOString().split('T')[0];
  downloadTemplate(blob, `plantilla_importacion_${timestamp}.xlsx`);
}
