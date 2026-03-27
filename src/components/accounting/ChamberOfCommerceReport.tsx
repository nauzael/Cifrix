import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { financialReportsService } from '../../lib/accounting/reports';
import { 
  Building2, 
  Copy, 
  Check, 
  Download, 
  Calculator, 
  ArrowRightLeft, 
  TrendingUp, 
  Wallet,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface ChamberOfCommerceReportProps {
  organizationId: string;
}

export function ChamberOfCommerceReport({ organizationId }: ChamberOfCommerceReportProps) {
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const organization = useLiveQuery(() => db.organizations.get(organizationId), [organizationId]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const result = await financialReportsService.getRUESData(organizationId, year);
        setData(result.data);
      } catch (error) {
        console.error('Error al generar reporte RUES:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [organizationId, year]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    if (!data) return;
    const allText = Object.entries(data)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    navigator.clipboard.writeText(allText);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Calculando rubros para Cámara de Comercio...</p>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-slate-500">No se pudieron generar los datos.</div>;

  const sections = [
    {
      title: 'Estado de Situación Financiera',
      icon: <Wallet className="w-5 h-5 text-emerald-600" />,
      items: [
        { label: 'Activo Corriente', value: data.activoCorriente, key: 'activoCorriente' },
        { label: 'Activo No Corriente', value: data.activoNoCorriente, key: 'activoNoCorriente' },
        { label: 'Activo Total', value: data.activoTotal, key: 'activoTotal', highlight: true },
        { label: 'Pasivo Corriente', value: data.pasivoCorriente, key: 'pasivoCorriente' },
        { label: 'Pasivo No Corriente', value: data.pasivoNoCorriente, key: 'pasivoNoCorriente' },
        { label: 'Pasivo Total', value: data.pasivoTotal, key: 'pasivoTotal' },
        { label: 'Patrimonio Neto', value: data.patrimonioNeto, key: 'patrimonioNeto', highlight: true },
        { label: 'Pasivo + Patrimonio', value: data.pasivoPatrimonio, key: 'pasivoPatrimonio' },
      ]
    },
    {
      title: 'Estado de Resultados',
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
      items: [
        { label: 'Ingresos Actividad Ordinaria', value: data.ingresosOrdinarios, key: 'ingresosOrdinarios' },
        { label: 'Otros Ingresos', value: data.otrosIngresos, key: 'otrosIngresos' },
        { label: 'Ingresos Totales', value: data.ingresosTotales, key: 'ingresosTotales', highlight: true },
        { label: 'Costo de Ventas', value: data.costoVentas, key: 'costoVentas' },
        { label: 'Gastos de Administración', value: data.gastosAdmin, key: 'gastosAdmin' },
        { label: 'Gastos de Ventas', value: data.gastosVenta, key: 'gastosVenta' },
        { label: 'Otros Gastos', value: data.otrosGastos, key: 'otrosGastos' },
        { label: 'Gastos Financieros', value: data.gastosFinancieros, key: 'gastosFinancieros' },
        { label: 'Utilidad Operacional', value: data.utilidadOperacional, key: 'utilidadOperacional', highlight: true },
        { label: 'Utilidad/Pérdida Neta', value: data.utilidadNeta, key: 'utilidadNeta', highlight: true },
      ]
    }
  ];

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Reporte para Renovación RUES</h2>
            <p className="text-slate-500">Valores consolidados para el formulario de Cámara de Comercio</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select 
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 p-0 pr-8"
            >
              {[0, 1, 2, 3].map(i => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          </div>
          
          <button 
            onClick={handleCopyAll}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm active:scale-95"
          >
            {copiedField === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedField === 'all' ? 'Copiado' : 'Copiar Todo'}
          </button>
        </div>
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Importante: Valores calculados al 31 de diciembre de {year}</p>
          <p className="opacity-90">Estos valores son una guía basada en tus movimientos contables. Asegúrate de que todas tus transacciones del año {year} estén registradas para una exactitud del 100%.</p>
        </div>
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              {section.icon}
              <h3 className="font-bold text-slate-800">{section.title}</h3>
            </div>
            
            <div className="p-2 divide-y divide-slate-50 flex-1">
              {section.items.map((item, itemIdx) => (
                <div 
                  key={itemIdx} 
                  className={`group flex items-center justify-between p-3 hover:bg-slate-50 transition-colors rounded-xl mx-1 ${
                    item.highlight ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className={`text-sm ${item.highlight ? 'font-semibold text-indigo-900' : 'text-slate-600'}`}>
                      {item.label}
                    </p>
                    <p className={`text-lg font-mono ${item.highlight ? 'font-bold text-indigo-700' : 'font-medium text-slate-900'}`}>
                      {formatCurrency(item.value)}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleCopy(Math.round(item.value).toString(), item.key)}
                    className={`p-2 rounded-lg border transition-all duration-200 opacity-0 group-hover:opacity-100 ${
                      copiedField === item.key
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 opacity-100 scale-105'
                        : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm'
                    }`}
                    title="Copiar valor redondeado"
                  >
                    {copiedField === item.key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Instructions */}
      <div className="bg-slate-900 p-8 rounded-3xl text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <Calculator className="w-32 h-32" />
        </div>
        
        <div className="relative z-10 space-y-4 max-w-2xl">
          <h4 className="text-xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-400" />
            ¿Cómo usar este reporte?
          </h4>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ring-1 ring-indigo-500/30">1</div>
              <p>Selecciona el año anterior al actual (el que vas a renovar).</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ring-1 ring-indigo-500/30">2</div>
              <p>Haz clic en el botón de copiar junto a cada valor para obtener el monto redondeado, listo para pegar en el portal de la Cámara de Comercio.</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ring-1 ring-indigo-500/30">3</div>
              <p>Verifica que el <span className="text-white font-semibold italic">Activo Total</span> sea igual a la suma de <span className="text-white font-semibold italic">Pasivo Total + Patrimonio Neto</span> para asegurar que tu contabilidad esté cuadrada.</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
