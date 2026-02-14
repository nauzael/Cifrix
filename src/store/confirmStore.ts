import { create } from 'zustand';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    inputType?: 'text' | 'email' | 'password';
    inputPlaceholder?: string;
    defaultValue?: string;
    onConfirm: (value?: string) => void;
    onCancel?: () => void;
}

interface ConfirmStore {
    isOpen: boolean;
    options: ConfirmOptions | null;
    confirm: (options: ConfirmOptions) => void;
    close: () => void;
}

export const useConfirmStore = create<ConfirmStore>((set) => ({
    isOpen: false,
    options: null,
    confirm: (options) => set({ isOpen: true, options }),
    close: () => set({ isOpen: false, options: null }),
}));

export const confirm = (options: ConfirmOptions) => useConfirmStore.getState().confirm(options);
