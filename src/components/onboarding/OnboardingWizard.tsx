import React, { useState } from 'react';
import { db } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { Save, Building2, Church, Globe, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'
              }`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Bienvenido a Cifrix</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg">Primero, dinos qué tipo de organización vas a gestionar.</p>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={() => { setFormData({...formData, type: 'IGLESIA'}); handleNext(); }}
                  className={`p-8 rounded-2xl border-2 transition-all text-left space-y-4 ${
                    formData.type === 'IGLESIA' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                  }`}
                >
                  <div className="size-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                    <Church size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Iglesia / Ministerio</h3>
                    <p className="text-sm text-slate-500">Módulo de diezmos y miembros incluido.</p>
                  </div>
                </button>

                <button 
                  onClick={() => { setFormData({...formData, type: 'EMPRESA'}); handleNext(); }}
                  className={`p-8 rounded-2xl border-2 transition-all text-left space-y-4 ${
                    formData.type === 'EMPRESA' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                  }`}
                >
                  <div className="size-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Empresa / Negocio</h3>
                    <p className="text-sm text-slate-500">Contabilidad comercial estándar.</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Datos Generales</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg">Configura los detalles básicos de tu organización.</p>
              
              <div className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre de la Organización</label>
                  <input 
                    autoFocus
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none text-lg"
                    placeholder="Ej. Iglesia Central"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">NIT / ID Fiscal</label>
                  <input 
                    value={formData.tax_id}
                    onChange={e => setFormData({...formData, tax_id: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none text-lg"
                    placeholder="900.000.000-1"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button onClick={handleBack} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-all flex items-center justify-center gap-2">
                  <ArrowLeft size={20} /> Atrás
                </button>
                <button 
                  disabled={!formData.name}
                  onClick={handleNext} 
                  className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Siguiente <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Localización</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg">Para ajustar formatos de moneda y fecha.</p>
              
              <div className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">País</label>
                  <select 
                    value={formData.country}
                    onChange={e => setFormData({...formData, country: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none text-lg"
                  >
                    <option value="Colombia">Colombia</option>
                    <option value="México">México</option>
                    <option value="España">España</option>
                    <option value="Estados Unidos">Estados Unidos</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Moneda</label>
                  <select 
                    value={formData.currency}
                    onChange={e => setFormData({...formData, currency: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none text-lg"
                  >
                    <option value="COP">COP ($)</option>
                    <option value="MXN">MXN ($)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button onClick={handleBack} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-all flex items-center justify-center gap-2">
                  <ArrowLeft size={20} /> Atrás
                </button>
                <button 
                  onClick={handleSubmit} 
                  className="flex-[2] py-4 bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-600/20 hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                >
                  Completar Registro <CheckCircle size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
