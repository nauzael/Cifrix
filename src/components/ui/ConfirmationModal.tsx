import React, { useState } from 'react';
import { Modal } from './Modal';
import { AlertCircle, HelpCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value?: string) => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    inputType?: 'text' | 'email' | 'password';
    inputPlaceholder?: string;
    defaultValue?: string;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'info',
    inputType,
    inputPlaceholder,
    defaultValue = ''
}: ConfirmationModalProps) {
    const [inputValue, setInputValue] = useState(defaultValue);

    const icons = {
        danger: AlertCircle,
        warning: AlertTriangle,
        info: HelpCircle,
    };

    const buttonColors = {
        danger: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25',
        warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25',
        info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25',
    };

    const Icon = icons[type];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            icon={Icon}
            maxWidth="sm"
        >
            <div className="space-y-6">
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    {message}
                </p>

                {inputType && (
                    <div className="space-y-2">
                        <input
                            type={inputType}
                            placeholder={inputPlaceholder}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400"
                            autoFocus
                        />
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm(inputType ? inputValue : undefined);
                            onClose();
                        }}
                        className={cn(
                            "flex-1 px-6 py-3 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95",
                            buttonColors[type]
                        )}
                        disabled={inputType && !inputValue}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
