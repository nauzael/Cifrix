import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, FileSearch, Database, Save, Layout } from 'lucide-react';
import { useExogenosStore } from '@/store/exogenosStore';

export const ProcessingModal = () => {
    const { processing } = useExogenosStore();

    if (!processing.active) return null;

    const steps = [
        { icon: FileSearch, label: 'Lectura' },
        { icon: Database, label: 'Estructura' },
        { icon: Layout, label: 'Cruce' },
        { icon: Save, label: 'Guardado' },
        { icon: CheckCircle2, label: 'Finalizado' }
    ];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border overflow-hidden"
                >
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <Loader2 className="size-6 text-primary animate-spin" />
                            </div>
                            <div className="text-right">
                                <span className="text-4xl font-black text-primary">{processing.percentage}%</span>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Progreso Total</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Procesando Información</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed min-h-[40px]">
                                    {processing.message || 'Por favor, no cierre la ventana mientras se completa la validación...'}
                                </p>
                            </div>

                            {/* Progress Bar Wrapper */}
                            <div className="relative h-4 w-full bg-muted rounded-full overflow-hidden border border-border/50 shadow-inner">
                                <motion.div
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary-foreground"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${processing.percentage}%` }}
                                    transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                                />
                            </div>

                            {/* Steps Visualizer */}
                            <div className="grid grid-cols-5 gap-2 pt-4 border-t border-border/50">
                                {steps.map((step, idx) => {
                                    const Icon = step.icon;
                                    const stepNum = idx + 1;
                                    const isCompleted = processing.step > stepNum;
                                    const isActive = processing.step === stepNum;

                                    return (
                                        <div key={idx} className="flex flex-col items-center gap-2">
                                            <div className={`size-10 rounded-xl flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-500 text-white' :
                                                    isActive ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' :
                                                        'bg-muted text-muted-foreground'
                                                }`}>
                                                {isCompleted ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
                                            </div>
                                            <span className={`text-[10px] font-bold text-center leading-tight ${isActive ? 'text-primary' : 'text-muted-foreground'
                                                }`}>
                                                {step.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Bottom banner */}
                    <div className="bg-muted/50 p-4 flex items-center justify-center gap-3 border-t border-border/50">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="size-4 rounded-full border-2 border-card bg-primary/20 animate-pulse" />
                            ))}
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground italic">
                            Optimizando recursos del sistema para archivos grandes...
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
