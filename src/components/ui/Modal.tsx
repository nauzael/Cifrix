import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-hidden">
                    {/* Backdrop with premium glassmorphism */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-all duration-300 pointer-events-auto"
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
                        className={cn(
                            "relative bg-card rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] w-full border border-border flex flex-col max-h-[95vh] overflow-hidden",
                            maxWidthClasses[maxWidth],
                            className
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Soft background glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent blur-xl" />

                        {/* Header */}
                        <div className="px-6 py-6 sm:px-10 border-b border-border flex justify-between items-center bg-muted/10 backdrop-blur-md shrink-0">
                            <div className="flex items-center gap-5">
                                {Icon && (
                                    <div className="p-3.5 bg-primary rounded-2xl shadow-xl shadow-primary/20 text-primary-foreground shrink-0">
                                        <Icon size={24} className="drop-shadow-sm" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight truncate">
                                        {title}
                                    </h3>
                                    {subtitle && (
                                        <p className="text-[11px] font-bold text-muted-foreground mt-1 flex items-center gap-2 uppercase tracking-widest leading-none">
                                            <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {showCloseButton && (
                                <button
                                    onClick={onClose}
                                    className="p-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-2xl transition-all active:scale-90 shrink-0"
                                >
                                    <X size={24} />
                                </button>
                            )}
                        </div>

                        {/* Content Body */}
                        <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.getElementById('modal-root') || document.body);
}

