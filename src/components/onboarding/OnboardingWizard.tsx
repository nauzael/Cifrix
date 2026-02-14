import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { Building2, Church, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingWizardProps {
  onComplete: (orgId: string) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    type: 'IGLESIA' as 'IGLESIA' | 'EMPRESA',
    tax_id: '',
    country: 'Colombia',
    currency: 'COP'
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    const orgId = uuidv4();
    await db.organizations.add({
      id: orgId,
      name: formData.name,
      type: formData.type,
      tax_id: formData.tax_id,
      settings: {
        country: formData.country,
        currency: formData.currency,
        onboarding_completed: true
      },
      created_at: new Date().toISOString(),
      sync_status: 'pendiente'
    });

    onComplete(orgId);
  };

  const content = (
    <div className="fixed inset-0 z-[99999] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />

      <div className="max-w-xl w-full relative z-10">
        <div className="flex gap-3 mb-12">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-700 relative overflow-hidden ${i <= step ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-slate-200 dark:bg-slate-800'
                }`}
            >
              {i === step && (
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Bienvenido a Cifrix</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Comencemos configurando tu espacio de trabajo.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => { setFormData({ ...formData, type: 'IGLESIA' }); handleNext(); }}
                  className="group p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-transparent hover:border-blue-500/50 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all text-left space-y-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 -mr-10 -mt-10 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                  <div className="size-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    <Church size={32} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Iglesia o Ministerio</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Gestión de diezmos, ofrendas y membresía dedicada.</p>
                  </div>
                </button>

                <button
                  onClick={() => { setFormData({ ...formData, type: 'EMPRESA' }); handleNext(); }}
                  className="group p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-transparent hover:border-indigo-500/50 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all text-left space-y-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 -mr-10 -mt-10 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
                  <div className="size-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    <Building2 size={32} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Empresa o Negocio</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Contabilidad estándar, facturación y gestión comercial.</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Datos Principales</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">¿Cómo se llama tu {formData.type === 'IGLESIA' ? 'ministerio' : 'empresa'}?</p>
              </div>

              <div className="space-y-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Nombre Legal u oficial</label>
                  <input
                    autoFocus
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none text-xl font-bold dark:text-white transition-all placeholder:text-slate-300"
                    placeholder="Ej. Fundación Vida Plena"
                  />
                </div>
                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">NIT / Identificación Fiscal</label>
                  <input
                    value={formData.tax_id}
                    onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                    className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none text-xl font-bold dark:text-white transition-all placeholder:text-slate-300 font-mono"
                    placeholder="900.000.000-1"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={handleBack} className="flex-1 py-5 font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl transition-all flex items-center justify-center gap-2">
                  <ArrowLeft size={20} /> Regresar
                </button>
                <button
                  disabled={!formData.name}
                  onClick={handleNext}
                  className="flex-[2] py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-2xl shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/40 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  Continuar <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Localización</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Personalicemos tu experiencia regional.</p>
              </div>

              <div className="space-y-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Región / País</label>
                  <select
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none text-xl font-bold dark:text-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="Colombia">🇨🇴 Colombia</option>
                    <option value="México">🇲🇽 México</option>
                    <option value="España">🇪🇸 España</option>
                    <option value="Estados Unidos">🇺🇸 Estados Unidos</option>
                    <option value="Otro">🌍 Otro</option>
                  </select>
                </div>
                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Moneda Principal</label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none text-xl font-bold dark:text-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="COP">Peso Colombiano (COP)</option>
                    <option value="MXN">Peso Mexicano (MXN)</option>
                    <option value="USD">Dólar Estadounidense (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={handleBack} className="flex-1 py-5 font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl transition-all flex items-center justify-center gap-2">
                  <ArrowLeft size={20} /> Regresar
                </button>
                <button
                  onClick={handleSubmit}
                  className="group relative flex-[2] py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-2xl shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all active:scale-95 overflow-hidden flex items-center justify-center gap-3"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  Finalizar Configuración <CheckCircle size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return createPortal(content, document.getElementById('modal-root') || document.body);
};
