import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db, Organization } from '../../lib/db';
import { 
  Save, 
  Loader2, 
  FileBadge, 
  Key, 
  Hash, 
  Calendar,
  Server,
  FileKey,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

const dianSchema = z.object({
  environment: z.enum(['habilitacion', 'produccion']),
  softwareId: z.string().min(1, 'El ID de Software es requerido'),
  pin: z.string().min(1, 'El PIN es requerido'),
  technicalKey: z.string().optional(),
  testSetId: z.string().optional(),
  certificate: z.string().optional(), // Base64 content
  certificatePassword: z.string().optional(),
  resolutionNumber: z.string().min(1, 'El número de resolución es requerido'),
  resolutionPrefix: z.string().optional(),
  resolutionDate: z.string().min(1, 'La fecha de resolución es requerida'),
  resolutionFrom: z.number().min(1),
  resolutionTo: z.number().min(1),
}).superRefine((data, ctx) => {
  if (data.environment === 'habilitacion' && !data.testSetId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El Test Set ID es obligatorio en Habilitación",
      path: ["testSetId"]
    });
  }
  if (data.environment === 'produccion' && !data.technicalKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La Clave Técnica es obligatoria en Producción",
      path: ["technicalKey"]
    });
  }
});

type DianForm = z.infer<typeof dianSchema>;

interface DianSettingsProps {
  organization: Organization;
}

export function DianSettings({ organization }: DianSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [certFileName, setCertFileName] = useState<string>('');
  const [showCertGuide, setShowCertGuide] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<DianForm>({
    resolver: zodResolver(dianSchema),
    defaultValues: {
      environment: organization.settings?.dian?.environment || 'habilitacion',
      softwareId: organization.settings?.dian?.softwareId || '',
      pin: organization.settings?.dian?.pin || '',
      technicalKey: organization.settings?.dian?.technicalKey || '',
      testSetId: organization.settings?.dian?.testSetId || '',
      certificate: organization.settings?.dian?.certificate || '',
      certificatePassword: organization.settings?.dian?.certificatePassword || '',
      resolutionNumber: organization.settings?.dian?.resolutionNumber || '',
      resolutionPrefix: organization.settings?.dian?.resolutionPrefix || '',
      resolutionDate: organization.settings?.dian?.resolutionDate || new Date().toISOString().split('T')[0],
      resolutionFrom: organization.settings?.dian?.resolutionFrom || 1,
      resolutionTo: organization.settings?.dian?.resolutionTo || 1000,
    }
  });

  // Watch for certificate changes to show file name (if we stored it separately, but here we just store base64)
  // We'll handle file input manually
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        // Remove data URL prefix if present (e.g. data:application/x-pkcs12;base64,)
        const content = base64.split(',')[1] || base64;
        setValue('certificate', content);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: DianForm) => {
    setIsSaving(true);
    try {
      await db.organizations.update(organization.id, {
        settings: {
          ...organization.settings,
          dian: data
        },
        sync_status: 'pendiente'
      });
      alert('Configuración DIAN guardada correctamente');
    } catch (error) {
      console.error('Error saving DIAN settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const environment = watch('environment');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileBadge className="text-blue-600" />
            Facturación Electrónica DIAN
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Configura las credenciales y resoluciones para emitir facturas electrónicas.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
        {/* Environment Selection */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Server size={20} className="text-blue-500" />
            Ambiente
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className={`
              flex items-center p-3 sm:p-4 border rounded-xl cursor-pointer transition-all
              ${environment === 'habilitacion' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-900' 
                : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'}
            `}>
              <input type="radio" value="habilitacion" {...register('environment')} className="sr-only" />
              <div className="ml-3">
                <span className="block font-bold text-slate-900 dark:text-white text-sm sm:text-base">Habilitación (Pruebas)</span>
                <span className="block text-xs sm:text-sm text-slate-500">Para realizar pruebas y set de pruebas.</span>
              </div>
            </label>

            <label className={`
              flex items-center p-3 sm:p-4 border rounded-xl cursor-pointer transition-all
              ${environment === 'produccion' 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-200 dark:ring-green-900' 
                : 'border-slate-200 dark:border-slate-800 hover:border-green-300'}
            `}>
              <input type="radio" value="produccion" {...register('environment')} className="sr-only" />
              <div className="ml-3">
                <span className="block font-bold text-slate-900 dark:text-white text-sm sm:text-base">Producción</span>
                <span className="block text-xs sm:text-sm text-slate-500">Para emitir facturas reales con validez legal.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Credentials */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Key size={20} className="text-yellow-500" />
            Credenciales Técnicas
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Software ID
              </label>
              <input
                {...register('softwareId')}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white font-bold"
                placeholder="Identificador del software"
              />
              {errors.softwareId && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.softwareId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                PIN
              </label>
              <input
                {...register('pin')}
                type="password"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white font-bold"
                placeholder="PIN del software"
              />
              {errors.pin && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.pin.message}</p>}
            </div>

            {environment === 'habilitacion' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Test Set ID (Solo Pruebas)
                </label>
                <input
                  {...register('testSetId')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white font-bold"
                  placeholder="ID del Set de Pruebas de Habilitación"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Clave Técnica (Technical Key)
              </label>
              <input
                {...register('technicalKey')}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white font-mono font-bold"
                placeholder="Clave técnica de rango de numeración"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 font-medium">Obtenida al asociar los rangos de numeración en el portal de la DIAN.</p>
            </div>
          </div>
        </div>

        {/* Digital Certificate */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileKey size={20} className="text-purple-500" />
              Certificado Digital (.p12 / .pfx)
            </h3>
            <button
              type="button"
              onClick={() => setShowCertGuide(!showCertGuide)}
              className="flex items-center justify-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-full transition-colors"
            >
              <HelpCircle size={14} />
              ¿Cómo obtenerlo?
            </button>
          </div>

          {showCertGuide && (
            <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm">
              <h4 className="font-bold text-slate-900 dark:text-white mb-3">Paso a paso para adquirir el Certificado Digital:</h4>
              <ol className="list-decimal pl-4 space-y-2 text-slate-600 dark:text-slate-300">
                <li>
                  <strong>Contactar a una entidad certificadora (ECD):</strong> Debes comprarlo a una empresa autorizada por la ONAC. Las más comunes en Colombia son:
                  <ul className="list-disc pl-4 mt-1 text-xs space-y-1">
                    <li><a href="https://www.gse.com.co" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">GSE (Gestión de Seguridad Electrónica) <ExternalLink size={10} /></a></li>
                    <li><a href="https://web.certicamara.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Certicámara <ExternalLink size={10} /></a></li>
                    <li><a href="https://andesscd.com.co" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Andes SCD <ExternalLink size={10} /></a></li>
                  </ul>
                </li>
                <li>
                  <strong>Enviar documentación:</strong> Te solicitarán RUT actualizado, Cámara de Comercio (vigencia inferior a 30 días) y cédula del representante legal.
                </li>
                <li>
                  <strong>Validación de identidad:</strong> Realizarán un proceso de validación (virtual o presencial) para confirmar que eres quien dices ser.
                </li>
                <li>
                  <strong>Emisión y Descarga:</strong> Una vez aprobado (tarda entre 24 a 72 horas), te enviarán un enlace para descargar el certificado.
                  <p className="mt-1 text-amber-600 dark:text-amber-500 font-bold text-xs">¡Importante! Al descargarlo, asegúrate de exportarlo incluyendo la clave privada en formato .p12 o .pfx.</p>
                </li>
              </ol>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Archivo de Certificado
              </label>
              <input
                type="file"
                accept=".p12,.pfx"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-xs file:font-black
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              {certFileName && <p className="text-[10px] text-green-600 mt-1.5 font-bold uppercase">Seleccionado: {certFileName}</p>}
              {organization.settings?.dian?.certificate && !certFileName && (
                <p className="text-[10px] text-green-600 mt-1.5 font-bold uppercase">Certificado ya cargado en sistema</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Contraseña del Certificado
              </label>
              <input
                {...register('certificatePassword')}
                type="password"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white font-bold"
                placeholder="Contraseña del archivo .p12"
              />
            </div>
          </div>
        </div>

        {/* Resolution */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Hash size={20} className="text-orange-500" />
            Resolución de Facturación
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Número de Resolución
              </label>
              <input
                {...register('resolutionNumber')}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white font-bold"
                placeholder="Ej. 18760000001"
              />
              {errors.resolutionNumber && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.resolutionNumber.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Prefijo
              </label>
              <input
                {...register('resolutionPrefix')}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white font-bold"
                placeholder="Ej. SETT"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Fecha de Resolución
              </label>
              <input
                {...register('resolutionDate')}
                type="date"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Desde
                </label>
                <input
                  {...register('resolutionFrom', { valueAsNumber: true })}
                  type="number"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Hasta
                </label>
                <input
                  {...register('resolutionTo', { valueAsNumber: true })}
                  type="number"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Guardar Configuración
          </button>
        </div>
      </form>
    </div>
  );
}
