import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    className?: string;
    showCloseButton?: boolean;
}

const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-[95vw]',
};

export function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    icon: Icon,
    children,
    maxWidth = 'md',
    className,
    showCloseButton = true,
}: ModalProps) {
    // Prevent scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
                    {/* Backdrop with premium glassmorphism */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md transition-all duration-300"
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
                        className={cn(
                            "relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] w-full border border-slate-200/50 dark:border-slate-800/50 flex flex-col max-h-full overflow-hidden",
                            maxWidthClasses[maxWidth],
                            className
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Soft background glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent blur-xl" />

                        {/* Header */}
                        <div className="px-6 py-6 sm:px-8 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 backdrop-blur-sm shrink-0">
                            <div className="flex items-center gap-5">
                                {Icon && (
                                    <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white shrink-0">
                                        <Icon size={22} className="drop-shadow-sm" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                                        {title}
                                    </h3>
                                    {subtitle && (
                                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5 leading-none">
                                            <span className="size-1 rounded-full bg-blue-500/50" />
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {showCloseButton && (
                                <button
                                    onClick={onClose}
                                    className="p-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-90 shrink-0"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {/* Content Body */}
                        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
