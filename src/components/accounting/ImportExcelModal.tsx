'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../ui/Modal';
import { toast } from '../../store/toastStore';
import { syncToSupabase } from '../../lib/sync';
import { read, utils } from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { 
  Upload, 
  FileSpreadsheet, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  Trash2,
  Download,
  ChevronDown,
  ChevronRight,
  Edit3,
  Save,
  Loader2
} from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { logActivity } from '../../lib/audit';
import { generateImportTemplate, downloadTemplate, fetchAccountsAndGenerateTemplate } from '../../lib/excel-template';

interface RawRow {
  _rowIndex: number;
  _raw: Record<string, any>;
  _validated: boolean;
  _issues: ValidationIssue[];
  date?: string;
  reference?: string;
  description?: string;
  accountCode?: string;
  debit?: number;
  credit?: number;
}

interface ValidationIssue {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestedFix?: string;
}

interface ColumnMapping {
  date: string | null;
  reference: string | null;
  description: string | null;
  accountCode: string | null;
  debit: string | null;
  credit: string | null;
}

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSuccess?: () => void;
}

const ACCOUNT_COLUMNS = ['cuenta', 'codigo', 'code', 'account', 'account_code', 'codigo_cuenta', 'cta'];
const DATE_COLUMNS = ['fecha', 'date', 'fec', 'fecha_documento'];
const DESCRIPTION_COLUMNS = ['descripcion', 'description', 'detalle', 'concepto', 'glosa', 'memo'];
const DEBIT_COLUMNS = ['debito', 'debit', 'débito', 'dr', 'debe'];
const CREDIT_COLUMNS = ['credito', 'credit', 'crédito', 'cr', 'haber'];
const REFERENCE_COLUMNS = ['referencia', 'reference', 'ref', 'no_factura', 'numero', 'number'];

export function ImportExcelModal({ isOpen, onClose, organizationId, onSuccess }: ImportExcelModalProps) {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<RawRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: null,
    reference: null,
    description: null,
    accountCode: null,
    debit: null,
    credit: null
  });
  const [editableData, setEditableData] = useState<RawRow[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [showMapping, setShowMapping] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [cellValue, setCellValue] = useState('');

  const accounts = useLiveQuery(
    () => db.accounts.where('organization_id').equals(organizationId).toArray(),
    [organizationId]
  );

  const accountsByCode = useMemo(() => {
    const map = new Map<string, typeof accounts[0]>();
    accounts?.forEach(acc => map.set(acc.code, acc));
    return map;
  }, [accounts]);

  const resetState = useCallback(() => {
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setMapping({
      date: null,
      reference: null,
      description: null,
      accountCode: null,
      debit: null,
      credit: null
    });
    setEditableData([]);
    setIssues([]);
    setIsImporting(false);
    setShowMapping(false);
    setEditingCell(null);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const detectColumns = (headerRow: string[]) => {
    const normalized = headerRow.map(h => h.toLowerCase().trim().replace(/[._]/g, ''));
    
    const newMapping: ColumnMapping = {
      date: null,
      reference: null,
      description: null,
      accountCode: null,
      debit: null,
      credit: null
    };

    normalized.forEach((col, idx) => {
      if (DATE_COLUMNS.some(d => col.includes(d))) newMapping.date = headerRow[idx];
      else if (REFERENCE_COLUMNS.some(r => col.includes(r))) newMapping.reference = headerRow[idx];
      else if (DESCRIPTION_COLUMNS.some(d => col.includes(d))) newMapping.description = headerRow[idx];
      else if (ACCOUNT_COLUMNS.some(a => col.includes(a))) newMapping.accountCode = headerRow[idx];
      else if (DEBIT_COLUMNS.some(d => col.includes(d))) newMapping.debit = headerRow[idx];
      else if (CREDIT_COLUMNS.some(c => col.includes(c))) newMapping.credit = headerRow[idx];
    });

    setMapping(newMapping);
    
    const hasAllRequired = newMapping.date && newMapping.accountCode && (newMapping.debit || newMapping.credit);
    setShowMapping(!hasAllRequired);
  };

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Por favor seleccione un archivo Excel (.xlsx, .xls) o CSV');
      return;
    }

    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = read(buffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length === 0) {
        toast.error('El archivo está vacío');
        return;
      }

      const headerRow = Object.keys(jsonData[0] as Record<string, any>);
      setHeaders(headerRow);
      detectColumns(headerRow);

      const rows: RawRow[] = jsonData.map((row: any, idx: number) => ({
        _rowIndex: idx + 1,
        _raw: row,
        _validated: false,
        _issues: []
      }));

      setRawData(rows);
      setEditableData(rows);
      
      validateData(rows);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Error al leer el archivo');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const validateData = useCallback((data: RawRow[]) => {
    const newIssues: ValidationIssue[] = [];
    const validatedData = data.map(row => {
      const rowIssues: ValidationIssue[] = [];
      
      const dateValue = mapping.date ? String(row._raw[mapping.date] || '').trim() : '';
      const refValue = mapping.reference ? String(row._raw[mapping.reference] || '').trim() : '';
      const descValue = mapping.description ? String(row._raw[mapping.description] || '').trim() : '';
      const accountValue = mapping.accountCode ? String(row._raw[mapping.accountCode] || '').trim() : '';
      const debitValue = mapping.debit ? parseNumeric(row._raw[mapping.debit]) : 0;
      const creditValue = mapping.credit ? parseNumeric(row._raw[mapping.credit]) : 0;

      if (!dateValue) {
        rowIssues.push({ row: row._rowIndex, field: 'date', message: 'Fecha vacía', severity: 'error' });
      } else if (!isValidDate(dateValue)) {
        rowIssues.push({ row: row._rowIndex, field: 'date', message: `Fecha inválida: "${dateValue}"`, severity: 'error' });
      }

      if (!descValue) {
        rowIssues.push({ row: row._rowIndex, field: 'description', message: 'Descripción vacía', severity: 'error' });
      }

      if (!accountValue) {
        rowIssues.push({ row: row._rowIndex, field: 'accountCode', message: 'Código de cuenta vacío', severity: 'error' });
      } else if (!accountsByCode.has(accountValue)) {
        rowIssues.push({ row: row._rowIndex, field: 'accountCode', message: `Cuenta "${accountValue}" no existe en el PUC`, severity: 'error' });
      } else {
        const acc = accountsByCode.get(accountValue)!;
        if (!acc.accepts_movement) {
          rowIssues.push({ row: row._rowIndex, field: 'accountCode', message: `Cuenta "${accountValue}" (${acc.name}) no acepta movimientos`, severity: 'warning' });
        }
      }

      if (debitValue === 0 && creditValue === 0) {
        rowIssues.push({ row: row._rowIndex, field: 'amount', message: 'Débito y Crédito son 0', severity: 'error' });
      } else if (debitValue > 0 && creditValue > 0) {
        rowIssues.push({ row: row._rowIndex, field: 'amount', message: 'No puede tener Débito y Crédito simultáneamente', severity: 'error' });
      }

      const totalDebit = debitValue + creditValue;
      if (Math.abs(totalDebit) < 0.01 && (debitValue > 0 || creditValue > 0)) {
        rowIssues.push({ row: row._rowIndex, field: 'amount', message: 'Monto inválido', severity: 'error' });
      }

      newIssues.push(...rowIssues);
      
      return {
        ...row,
        _validated: rowIssues.filter(i => i.severity === 'error').length === 0,
        _issues: rowIssues,
        date: normalizeDate(dateValue),
        reference: refValue,
        description: descValue,
        accountCode: accountValue,
        debit: debitValue,
        credit: creditValue
      };
    });

    setEditableData(validatedData);
    setIssues(newIssues);
  }, [mapping, accountsByCode]);

  const parseNumeric = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[$\s,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  const updateCell = (rowIndex: number, field: string, value: string) => {
    setEditableData(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      
      switch (field) {
        case 'date':
          row.date = normalizeDate(value);
          break;
        case 'reference':
          row.reference = value;
          break;
        case 'description':
          row.description = value;
          break;
        case 'accountCode':
          row.accountCode = value;
          break;
        case 'debit':
          row.debit = parseNumeric(value);
          row.credit = 0;
          break;
        case 'credit':
          row.credit = parseNumeric(value);
          row.debit = 0;
          break;
      }

      row._issues = [];
      if (!row.date) row._issues.push({ row: row._rowIndex, field: 'date', message: 'Fecha vacía', severity: 'error' });
      if (!row.description) row._issues.push({ row: row._rowIndex, field: 'description', message: 'Descripción vacía', severity: 'error' });
      if (!row.accountCode) {
        row._issues.push({ row: row._rowIndex, field: 'accountCode', message: 'Código de cuenta vacío', severity: 'error' });
      } else if (!accountsByCode.has(row.accountCode)) {
        row._issues.push({ row: row._rowIndex, field: 'accountCode', message: `Cuenta "${row.accountCode}" no existe`, severity: 'error' });
      }
      if (row.debit === 0 && row.credit === 0) {
        row._issues.push({ row: row._rowIndex, field: 'amount', message: 'Débito y Crédito son 0', severity: 'error' });
      }
      
      row._validated = row._issues.filter(i => i.severity === 'error').length === 0;
      
      updated[rowIndex] = row;
      return updated;
    });

    setEditingCell(null);
    setCellValue('');
  };

  const fixIssue = (issue: ValidationIssue, fix: string) => {
    const rowIndex = editableData.findIndex(r => r._rowIndex === issue.row);
    if (rowIndex === -1) return;
    updateCell(rowIndex, issue.field, fix);
  };

  const startEditing = (rowIndex: number, field: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, field });
    setCellValue(String(currentValue ?? ''));
  };

  const handleMappingChange = (field: keyof ColumnMapping, header: string | null) => {
    const newMapping = { ...mapping, [field]: header };
    setMapping(newMapping);
    
    setTimeout(() => {
      validateData(editableData.map(r => ({
        ...r,
        date: newMapping.date ? normalizeDate(String(r._raw[newMapping.date!] || '')) : r.date,
        reference: newMapping.reference ? String(r._raw[newMapping.reference!] || '').trim() : r.reference,
        description: newMapping.description ? String(r._raw[newMapping.description!] || '').trim() : r.description,
        accountCode: newMapping.accountCode ? String(r._raw[newMapping.accountCode!] || '').trim() : r.accountCode,
        debit: newMapping.debit ? parseNumeric(r._raw[newMapping.debit!]) : r.debit,
        credit: newMapping.credit ? parseNumeric(r._raw[newMapping.credit!]) : r.credit,
      })));
    }, 0);
  };

  const handleImport = async () => {
    const validRows = editableData.filter(r => r._validated);
    const invalidRows = editableData.filter(r => !r._validated);
    
    if (validRows.length === 0) {
      toast.error('No hay filas válidas para importar');
      return;
    }

    if (invalidRows.length > 0) {
      toast.warning(`${invalidRows.length} filas tienen errores y serán ignoradas`);
    }

    setIsImporting(true);

    try {
      const groupedByTransaction = groupByTransaction(validRows);
      
      await db.transaction('rw', [db.transactions, db.journal_entries, db.audit_logs], async () => {
        for (const group of groupedByTransaction) {
          const transactionId = uuidv4();
          const totalAmount = group.rows.reduce((sum, r) => sum + (r.debit > 0 ? r.debit : r.credit), 0);

          await db.transactions.add({
            id: transactionId,
            organization_id: organizationId,
            date: group.date,
            description: group.description,
            reference_no: group.reference || null,
            project_id: null,
            type: 'transferencia' as const,
            category_id: null,
            method: 'EFECTIVO' as const,
            created_by: user?.id || 'import',
            created_at: new Date().toISOString(),
            sync_status: 'pendiente'
          });

          const entries = group.rows.map(r => ({
            id: uuidv4(),
            transaction_id: transactionId,
            account_id: accountsByCode.get(r.accountCode!)?.id || '',
            debit: r.debit || 0,
            credit: r.credit || 0,
            sync_status: 'pendiente' as const
          }));

          await db.journal_entries.bulkAdd(entries);
        }

        await logActivity({
          organization_id: organizationId,
          user_id: user?.id || 'import',
          action: 'CREATE' as any,
          entity_type: 'TRANSACTION' as any,
          entity_id: 'batch_import',
          new_data: { 
            totalTransactions: groupedByTransaction.length, 
            totalRows: validRows.length,
            fileName: file?.name 
          }
        });
      });

      toast.success(`Se importaron ${groupedByTransaction.length} asientos correctamente`);
      
      if (organizationId) {
        syncToSupabase(organizationId).catch(console.error);
      }

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Error al importar los datos');
    } finally {
      setIsImporting(false);
    }
  };

  const groupByTransaction = (rows: RawRow[]) => {
    const groups: { date: string; description: string; reference: string; rows: RawRow[] }[] = [];
    
    rows.forEach(row => {
      const key = `${row.date}|${row.description}|${row.reference}`;
      const existing = groups.find(g => 
        g.date === row.date && g.description === row.description && g.reference === row.reference
      );
      
      if (existing) {
        existing.rows.push(row);
      } else {
        groups.push({ date: row.date!, description: row.description!, reference: row.reference || '', rows: [row] });
      }
    });

    return groups;
  };

  const totals = useMemo(() => {
    return editableData.reduce((acc, row) => ({
      debit: acc.debit + (row.debit || 0),
      credit: acc.credit + (row.credit || 0)
    }), { debit: 0, credit: 0 });
  }, [editableData]);

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const validCount = editableData.filter(r => r._validated).length;

  const renderEditableCell = (row: RawRow, field: string, value: any, rowIndex: number) => {
    const cellIssues = row._issues.filter(i => i.field === field);
    const hasError = cellIssues.some(i => i.severity === 'error');
    const hasWarning = cellIssues.some(i => i.severity === 'warning');
    
    const isEditing = editingCell?.row === rowIndex && editingCell?.field === field;
    const displayValue = field === 'debit' || field === 'credit' 
      ? (value > 0 ? formatCurrency(value) : '')
      : value;

    return (
      <td 
        className={cn(
          "px-3 py-2.5 text-xs border-b border-slate-100 dark:border-slate-800 relative",
          hasError && "bg-red-50 dark:bg-red-900/10",
          hasWarning && !hasError && "bg-amber-50 dark:bg-amber-900/10"
        )}
        onDoubleClick={() => startEditing(rowIndex, field, value)}
      >
        {isEditing ? (
          <input
            type="text"
            value={cellValue}
            onChange={(e) => setCellValue(e.target.value)}
            onBlur={() => updateCell(rowIndex, field, cellValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') updateCell(rowIndex, field, cellValue);
              if (e.key === 'Escape') {
                setEditingCell(null);
                setCellValue('');
              }
            }}
            className="w-full h-full px-2 py-1 text-xs border border-blue-500 rounded outline-none bg-white dark:bg-slate-900"
            autoFocus
          />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              "truncate",
              hasError && "text-red-600 dark:text-red-400",
              hasWarning && !hasError && "text-amber-600 dark:text-amber-400",
              !hasError && !hasWarning && "text-slate-700 dark:text-slate-300"
            )}>
              {displayValue || <span className="text-slate-300 italic">vacío</span>}
            </span>
            {(hasError || hasWarning) && (
              <div className="group relative shrink-0">
                {hasError ? (
                  <AlertCircle size={12} className="text-red-500" />
                ) : (
                  <AlertTriangle size={12} className="text-amber-500" />
                )}
                <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10 w-48 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg text-[10px]">
                  {cellIssues.map((issue, i) => (
                    <div key={i} className="mb-1 last:mb-0">
                      <p className={cn(
                        "font-bold",
                        issue.severity === 'error' && "text-red-600",
                        issue.severity === 'warning' && "text-amber-600"
                      )}>
                        {issue.message}
                      </p>
                      {issue.suggestedFix && (
                        <button
                          onClick={() => fixIssue(issue, issue.suggestedFix!)}
                          className="text-blue-600 hover:underline mt-0.5"
                        >
                          Fix: {issue.suggestedFix}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </td>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar Asientos desde Excel"
      subtitle="Cargue y valide datos contables antes de importar"
      icon={FileSpreadsheet}
      maxWidth="full"
      className="max-w-[95vw] h-[90vh]"
    >
      <div className="flex flex-col h-full">
        {!file ? (
          <div className="space-y-6">
            <div 
              className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
                Arrastre su archivo Excel aquí
              </h3>
              <p className="text-sm text-slate-500 mb-4">o haga clic para seleccionar</p>
              <p className="text-xs text-slate-400">Formatos soportados: .xlsx, .xls, .csv</p>
              <input 
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>
            
            <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ¿No tiene un archivo?
                  </p>
                  <p className="text-xs text-slate-500">
                    Descargue nuestra plantilla prediseñada con las columnas correctas
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const blob = generateImportTemplate({});
                      downloadTemplate(blob, 'plantilla_importacion_asientos.xlsx');
                    }}
                    className="px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 flex items-center gap-2"
                  >
                    <Download size={14} />
                    Plantilla Básica
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchAccountsAndGenerateTemplate(organizationId);
                    }}
                    className="px-4 py-2 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center gap-2"
                  >
                    <Download size={14} />
                    Con Cuentas PUC
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {showMapping && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-blue-900 dark:text-blue-100">Asignación de Columnas</h4>
                  <button 
                    onClick={() => setShowMapping(false)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Ocultar
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {(['date', 'reference', 'description', 'accountCode', 'debit', 'credit'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        {field === 'accountCode' ? 'Cuenta' : field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>
                      <select
                        value={mapping[field] || ''}
                        onChange={(e) => handleMappingChange(field, e.target.value || null)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                      >
                        <option value="">-- Ignorar --</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={20} className="text-green-600" />
                <div>
                  <p className="font-bold text-sm">{file.name}</p>
                  <p className="text-xs text-slate-500">{editableData.length} filas detectadas</p>
                </div>
                {!showMapping && (
                  <button 
                    onClick={() => setShowMapping(true)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ChevronDown size={12} /> Cambiar columnas
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => validateData(editableData)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Revalidar
                </button>
                <button 
                  onClick={resetState}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
                >
                  <Trash2 size={14} /> Limpiar
                </button>
              </div>
            </div>

            <div className="flex gap-4 flex-1 min-h-0">
              <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 w-12">#</th>
                      <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">Fecha</th>
                      <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">Referencia</th>
                      <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">Descripción</th>
                      <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">Cuenta</th>
                      <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-right">Débito</th>
                      <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-right">Crédito</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {editableData.map((row, idx) => (
                      <tr 
                        key={row._rowIndex} 
                        className={cn(
                          "hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors",
                          row._validated && "bg-green-50/30 dark:bg-green-900/10",
                          !row._validated && "bg-red-50/30 dark:bg-red-900/10"
                        )}
                      >
                        <td className="px-3 py-2.5 text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                          {row._rowIndex}
                          {row._validated ? (
                            <CheckCircle2 size={12} className="inline ml-1 text-green-500" />
                          ) : (
                            <AlertCircle size={12} className="inline ml-1 text-red-500" />
                          )}
                        </td>
                        {renderEditableCell(row, 'date', row.date, idx)}
                        {renderEditableCell(row, 'reference', row.reference, idx)}
                        {renderEditableCell(row, 'description', row.description, idx)}
                        {renderEditableCell(row, 'accountCode', row.accountCode, idx)}
                        {renderEditableCell(row, 'debit', row.debit, idx)}
                        {renderEditableCell(row, 'credit', row.credit, idx)}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-black text-xs">
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-slate-600 dark:text-slate-400">TOTALES</td>
                      <td className="px-3 py-3 text-right text-blue-600 font-mono">{formatCurrency(totals.debit)}</td>
                      <td className="px-3 py-3 text-right text-red-600 font-mono">{formatCurrency(totals.credit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="w-80 shrink-0 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-500" />
                    Validación
                  </h4>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <p className="text-lg font-black text-green-600">{validCount}</p>
                      <p className="text-[10px] text-green-600 uppercase">Válidas</p>
                    </div>
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <p className="text-lg font-black text-red-600">{errorCount}</p>
                      <p className="text-[10px] text-red-600 uppercase">Errores</p>
                    </div>
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-lg font-black text-amber-600">{warningCount}</p>
                      <p className="text-[10px] text-amber-600 uppercase">Avisos</p>
                    </div>
                  </div>

                  {issues.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
                      <p className="text-sm font-bold text-slate-600">¡Sin problemas!</p>
                      <p className="text-xs text-slate-500">Todos los datos son válidos</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase">Problemas encontrados</p>
                      {issues.slice(0, 50).map((issue, idx) => (
                        <div 
                          key={idx}
                          className={cn(
                            "p-2 rounded-lg border text-xs",
                            issue.severity === 'error' && "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800",
                            issue.severity === 'warning' && "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={cn(
                                "font-bold",
                                issue.severity === 'error' && "text-red-700 dark:text-red-300",
                                issue.severity === 'warning' && "text-amber-700 dark:text-amber-300"
                              )}>
                                Fila {issue.row}
                              </p>
                              <p className="text-slate-600 dark:text-slate-400 mt-0.5">{issue.message}</p>
                            </div>
                            {issue.suggestedFix && (
                              <button
                                onClick={() => fixIssue(issue, issue.suggestedFix!)}
                                className="shrink-0 px-2 py-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"
                              >
                                Fix
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {issues.length > 50 && (
                        <p className="text-xs text-slate-500 text-center">
                          +{issues.length - 50} problemas más
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold",
                  Math.abs(totals.debit - totals.credit) < 0.01 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                )}>
                  {Math.abs(totals.debit - totals.credit) < 0.01 ? (
                    <>Balanceado</>
                  ) : (
                    <>Sin balancear (diff: {formatCurrency(Math.abs(totals.debit - totals.credit))})</>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-3 text-slate-600 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Descartar
                </button>
                <button
                  onClick={handleImport}
                  disabled={validCount === 0 || isImporting}
                  className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Importar {validCount} asientos
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
