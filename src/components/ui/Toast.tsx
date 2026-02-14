import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore, ToastType } from '../../store/toastStore';
import { cn } from '../../lib/utils';

const icons: Record<ToastType, React.ElementType> = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
};

const styles: Record<ToastType, string> = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10',
    error: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-rose-500/10',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 shadow-blue-500/10',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-amber-500/10',
};

const iconColors: Record<ToastType, string> = {
    success: 'text-emerald-500',
    error: 'text-rose-500',
    info: 'text-blue-500',
    warning: 'text-amber-500',
};

export function ToastContainer() {
    const { toasts, removeToast } = useToastStore();

    return (
        <div className="fixed top-6 right-6 z-[10000] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => {
                    const Icon = icons[toast.type];
                    return (
                        <motion.div
                            key={toast.id}
                            layout
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className={cn(
                                "pointer-events-auto relative overflow-hidden group",
                                "flex items-start gap-4 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300",
                                styles[toast.type]
                            )}
                        >
                            {/* Background Glow */}
                            <div className={cn(
                                "absolute inset-0 opacity-10 blur-xl transition-opacity group-hover:opacity-20",
                                styles[toast.type].split(' ')[0]
                            )} />

                            <div className={cn("p-2 rounded-xl bg-white/50 dark:bg-black/20 shrink-0 shadow-sm", iconColors[toast.type])}>
                                <Icon size={20} />
                            </div>

                            <div className="flex-1 min-w-0 py-1">
                                <p className="text-sm font-bold leading-tight tracking-tight">
                                    {toast.message}
                                </p>
                            </div>

                            <button
                                onClick={() => removeToast(toast.id)}
                                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 opacity-50 hover:opacity-100"
                            >
                                <X size={16} />
                            </button>

                            {/* Progress Bar (optional animation) */}
                            <motion.div
                                initial={{ scaleX: 1 }}
                                animate={{ scaleX: 0 }}
                                transition={{ duration: (toast.duration || 5000) / 1000, ease: 'linear' }}
                                className={cn(
                                    "absolute bottom-0 left-0 h-0.5 w-full origin-left",
                                    iconColors[toast.type].replace('text', 'bg')
                                )}
                            />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
