import { useState, useRef } from 'react';
import { db, Account } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '../ui/Modal';
import { Upload, FileSpreadsheet, AlertCircle, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from '../../store/toastStore';

interface PUCImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSuccess: () => void;
}

export function PUCImportModal({ isOpen, onClose, organizationId, onSuccess }: PUCImportModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error('Formato inválido. Por favor suba un archivo .xlsx o .xls');
      return;
    }

    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false });

      if (!jsonData || jsonData.length === 0) {
        throw new Error('El archivo está vacío.');
      }

      // Validating columns
      const requiredColumns = ['Código', 'Nombre', 'Clase', 'Naturaleza', 'Recibe Movimientos'];
      const firstRow = jsonData[0];
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));
      
      if (missingColumns.length > 0) {
        throw new Error(`Faltan columnas obligatorias: ${missingColumns.join(', ')}`);
      }

      const validTypes = ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'EGRESO'];
      const validNatures = ['DEBITO', 'CREDITO'];

      const newAccounts = [];

      // Validating rows
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rawCode = String(row['Código']).trim();
        const rawName = String(row['Nombre']).trim();
        let rawClass = String(row['Clase'] || '').trim().toUpperCase();
        let rawNature = String(row['Naturaleza'] || '').trim().toUpperCase();
        const rawAccepts = String(row['Recibe Movimientos'] || '').trim().toUpperCase();

        if (!rawCode) continue;

        // Limpiar acentos (ej: DÉBITO -> DEBITO) y variaciones comunes (ej: plurables)
        rawClass = rawClass.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        rawNature = rawNature.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (rawClass === 'ACTIVOS') rawClass = 'ACTIVO';
        if (rawClass === 'PASIVOS') rawClass = 'PASIVO';
        if (rawClass === 'INGRESOS') rawClass = 'INGRESO';
        if (rawClass === 'EGRESOS' || rawClass === 'GASTO' || rawClass === 'GASTOS' || rawClass === 'COSTO' || rawClass === 'COSTOS') rawClass = 'EGRESO';
        if (rawClass === 'PATRIMONIOS') rawClass = 'PATRIMONIO';

        if (!validTypes.includes(rawClass)) {
          throw new Error(`Fila ${i+2} (Código ${rawCode}): Clase inválida '${rawClass}'. Debe ser ACTIVO, PASIVO, PATRIMONIO, INGRESO o EGRESO.`);
        }
        if (!validNatures.includes(rawNature)) {
          throw new Error(`Fila ${i+2} (Código ${rawCode}): Naturaleza inválida '${rawNature}'. Debe ser DEBITO o CREDITO.`);
        }
        
        const acceptsMovement = rawAccepts === 'SI' || rawAccepts === 'SÍ';

        newAccounts.push({
          code: rawCode,
          name: rawName,
          type: rawClass as Account['type'],
          nature: rawNature as Account['nature'],
          accepts_movement: acceptsMovement,
          level: rawCode.length
        });
      }

      // Filter existing
      const existingAccounts = await db.accounts.where('organization_id').equals(organizationId).toArray();
      const existingCodes = new Set(existingAccounts.map(a => a.code));

      const filteredNewAccounts = newAccounts.filter(a => !existingCodes.has(a.code));

      if (filteredNewAccounts.length === 0) {
        toast.info('Todas las cuentas del archivo ya existían en la plataforma y fueron ignoradas.');
        setIsProcessing(false);
        onClose();
        return;
      }

      // We need to resolve parent_id.
      // Parents can be in the existing accounts or in the new filtered accounts.
      const allCodesMap = new Map<string, string>(); // code -> id
      // Add existing codes
      existingAccounts.forEach(a => allCodesMap.set(a.code, a.id));

      const accountsToInsert: Account[] = [];

      for (const rawAcc of filteredNewAccounts) {
        const id = uuidv4();
        allCodesMap.set(rawAcc.code, id); // Register id for children reference
        const accToInsert = {
          id,
          organization_id: organizationId,
          code: rawAcc.code,
          name: rawAcc.name,
          type: rawAcc.type,
          nature: rawAcc.nature,
          level: rawAcc.level,
          accepts_movement: rawAcc.accepts_movement,
          parent_id: null as (string | null),
          created_at: new Date().toISOString(),
          sync_status: 'pendiente' as const
        };
        accountsToInsert.push(accToInsert);
      }

      // Calculate parent_id
      // Sort accountsToInsert by code length so parents are processed and mapped properly if we evaluate from shortest to longest?
      // Wait, all codes are already in allCodesMap (both existing and new). So calculating parent_id is independent of order.
      for (const acc of accountsToInsert) {
        // Parent logic: find the longest prefix code that exists in allCodesMap and isn't the code itself.
        let parentCode = '';
        for (let i = acc.code.length - 1; i > 0; i--) {
          const prefix = acc.code.substring(0, i);
          if (allCodesMap.has(prefix)) {
            parentCode = prefix;
            break;
          }
        }
        if (parentCode) {
          acc.parent_id = allCodesMap.get(parentCode) || null;
        }
      }

      // Insert transaction
      await db.transaction('rw', db.accounts, async () => {
        await db.accounts.bulkAdd(accountsToInsert);
      });

      toast.success(`Se importaron exitosamente ${accountsToInsert.length} cuentas nuevas.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al procesar el archivo Excel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    // Generate an empty template workbook
    const ws_data = [
      ['Código', 'Nombre', 'Clase', 'Naturaleza', 'Recibe Movimientos'],
      ['1', 'ACTIVO', 'ACTIVO', 'DEBITO', 'NO'],
      ['11', 'Disponible', 'ACTIVO', 'DEBITO', 'NO'],
      ['1105', 'Caja', 'ACTIVO', 'DEBITO', 'NO'],
      ['110505', 'Caja General', 'ACTIVO', 'DEBITO', 'SI']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "Plantilla_PUC_Cifrix.xlsx");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar PUC desde Excel"
      subtitle="Cargue su catálogo de cuentas siguiendo la estructura estricta"
      icon={FileSpreadsheet}
      maxWidth="xl"
    >
      <div className="space-y-6">
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-4">
          <div className="flex gap-4">
            <div className="size-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center shrink-0 mt-1">
              <Download className="text-blue-600 dark:text-blue-400 size-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">Plantilla requerida</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                El archivo debe tener las columnas: <span className="font-bold">Código, Nombre, Clase, Naturaleza, Recibe Movimientos</span> exactas en la fila 1.
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="mt-3 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors underline decoration-2 underline-offset-4"
              >
                Descargar plantilla de ejemplo .xlsx
              </button>
            </div>
          </div>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-[2rem] p-8 text-center transition-all ${
            dragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            disabled={isProcessing}
          />
          
          <div className="flex flex-col items-center gap-4 pointer-events-none relative z-0">
            {isProcessing ? (
              <>
                <div className="size-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center animate-pulse">
                  <Loader2 className="size-8 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
                <div>
                  <p className="text-base font-black text-slate-900 dark:text-white">Procesando catálogo...</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Validando cuentas y estructuras</p>
                </div>
              </>
            ) : (
              <>
                <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                  <Upload className="size-8 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div>
                  <p className="text-base font-black text-slate-900 dark:text-white">Arrastra el archivo Excel aquí</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">o haz clic para explorar en tu equipo</p>
                </div>
                <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Solo archivos .xlsx, .xls</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl">
          <AlertCircle className="size-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-400">
            <p className="font-bold">Política de Importación Incremental</p>
            <p className="mt-1 opacity-90 leading-relaxed">Las cuentas cuyos códigos ya existan en Cifrix serán ignoradas para prevenir el borrado o alteración de datos con movimientos asignados.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
